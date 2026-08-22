import nodemailer from 'nodemailer';
import { sanitizeEmailHeader, sanitizeEmail } from './sanitize';

/**
 * Email Service for sending notifications
 * 
 * Requirements coverage:
 * - Requirement 7.1: Send email when ticket is created
 * - Requirement 7.2: Send email when agent replies to ticket
 * - Requirement 7.3: Send email when customer replies to ticket
 * - Requirement 7.4: Include ticket Public_ID and subject in notifications
 */

// Create reusable SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email
 * 
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param html - HTML content of the email
 * @returns Promise that resolves when email is sent
 * 
 * @throws Error if email sending fails
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    // Sanitize email headers to prevent injection attacks
    const sanitizedTo = sanitizeEmail(to);
    const sanitizedSubject = sanitizeEmailHeader(subject);
    
    if (!sanitizedTo) {
      throw new Error('Invalid recipient email address');
    }
    
    await transporter.sendMail({
      from: process.env.SUPPORT_EMAIL || 'support@cheapfollower.shop',
      to: sanitizedTo,
      subject: sanitizedSubject,
      html,
    });
  } catch (error) {
    // Log error but don't throw - per Requirement 7.5: email failures shouldn't block operations
    console.error('Email sending failed:', error);
    throw error;
  }
}

/**
 * Send notification when a new ticket is created
 * 
 * @param ticketPublicId - Public ID of the ticket (e.g., "TKT001234")
 * @param category - Ticket category
 * @param subject - Ticket subject
 * 
 * Validates Requirement 7.1: Send email to support team when ticket is created
 * Validates Requirement 7.4: Include ticket Public_ID and subject in notification
 */
export async function notifyNewTicket(
  ticketPublicId: string,
  category: string,
  subject: string
): Promise<void> {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@cheapfollower.shop';
  
  // Sanitize user-provided content to prevent XSS in email HTML
  const sanitizedPublicId = sanitizeEmailHeader(ticketPublicId);
  const sanitizedCategory = sanitizeEmailHeader(category);
  const sanitizedSubject = sanitizeEmailHeader(subject);
  
  const html = `
    <h2>New Support Ticket Created</h2>
    <p><strong>Ticket ID:</strong> ${sanitizedPublicId}</p>
    <p><strong>Category:</strong> ${sanitizedCategory}</p>
    <p><strong>Subject:</strong> ${sanitizedSubject}</p>
    <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/tickets">View Ticket</a></p>
  `;
  
  try {
    await sendEmail(supportEmail, `New Ticket: ${sanitizedPublicId} - ${sanitizedSubject}`, html);
  } catch (error) {
    console.error('Failed to send new ticket notification:', error);
    // Don't throw - per design, email failures should not block ticket operations
  }
}

/**
 * Send notification when an agent replies to a ticket
 * 
 * @param recipientEmail - Customer's email address
 * @param ticketPublicId - Public ID of the ticket
 * @param subject - Ticket subject
 * 
 * Validates Requirement 7.2: Send email to customer when agent replies
 * Validates Requirement 7.4: Include ticket Public_ID and subject in notification
 */
export async function notifyTicketReply(
  recipientEmail: string,
  ticketPublicId: string,
  subject: string
): Promise<void> {
  // Sanitize user-provided content to prevent XSS in email HTML
  const sanitizedPublicId = sanitizeEmailHeader(ticketPublicId);
  const sanitizedSubject = sanitizeEmailHeader(subject);
  
  const html = `
    <h2>New Reply to Your Support Ticket</h2>
    <p><strong>Ticket ID:</strong> ${sanitizedPublicId}</p>
    <p><strong>Subject:</strong> ${sanitizedSubject}</p>
    <p>A support agent has replied to your ticket. Please log in to view the response.</p>
    <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/tickets">View Your Tickets</a></p>
  `;
  
  try {
    await sendEmail(recipientEmail, `Reply to Ticket ${sanitizedPublicId}`, html);
  } catch (error) {
    console.error('Failed to send ticket reply notification:', error);
    // Don't throw - per design, email failures should not block ticket operations
  }
}

/**
 * Send notification when a customer replies to a ticket
 * 
 * @param ticketPublicId - Public ID of the ticket
 * @param subject - Ticket subject
 * 
 * Validates Requirement 7.3: Send email to support team when customer replies
 * Validates Requirement 7.4: Include ticket Public_ID and subject in notification
 */
export async function notifyTicketUpdate(
  ticketPublicId: string,
  subject: string
): Promise<void> {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@cheapfollower.shop';
  
  // Sanitize user-provided content to prevent XSS in email HTML
  const sanitizedPublicId = sanitizeEmailHeader(ticketPublicId);
  const sanitizedSubject = sanitizeEmailHeader(subject);
  
  const html = `
    <h2>Customer Reply to Ticket</h2>
    <p><strong>Ticket ID:</strong> ${sanitizedPublicId}</p>
    <p><strong>Subject:</strong> ${sanitizedSubject}</p>
    <p>A customer has replied to their ticket.</p>
    <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/tickets">View Ticket</a></p>
  `;
  
  try {
    await sendEmail(supportEmail, `Customer Reply: ${sanitizedPublicId} - ${sanitizedSubject}`, html);
  } catch (error) {
    console.error('Failed to send ticket update notification:', error);
    // Don't throw - per design, email failures should not block ticket operations
  }
}
