"use client";

import { DashboardShell } from "@/components/DashboardShell";
import { useAuth } from "@/components/AuthProvider";
import { useState, useEffect } from "react";
import type { TicketCategory, PublicOrder } from "@/lib/types";
import Link from "next/link";

/**
 * Ticket Creation Form Component
 * 
 * Allows users to create support tickets with the following features:
 * - Category selector for different ticket types
 * - Subject input field (required)
 * - Message body textarea (required)
 * - Optional order ID input for order-related tickets
 * - Client-side validation for non-empty fields
 * - Success message display with ticket public ID
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.7, 15.1, 15.2
 */
export default function NewTicketPage() {
  const { user } = useAuth();
  
  // Form state
  const [category, setCategory] = useState<TicketCategory>("other");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [orderId, setOrderId] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  
  // Available ticket categories (Requirement 15.1, 15.2)
  const categories: { value: TicketCategory; label: string; description: string }[] = [
    { value: "order", label: "Order Issue", description: "Problems with delivery, quantity, or quality" },
    { value: "payment", label: "Payment", description: "Payment processing, failed transactions" },
    { value: "refill", label: "Refill Request", description: "Request refill for services with guarantee" },
    { value: "account", label: "Account", description: "Login, profile, or account settings" },
    { value: "api", label: "API", description: "API key, documentation, or integration issues" },
    { value: "service", label: "Service Request", description: "New service requests or feedback" },
    { value: "other", label: "Other", description: "General questions or other inquiries" },
  ];
  
  // Client-side validation (Requirement 4.1, 4.2, 4.3)
  const validateForm = (): string | null => {
    if (!subject.trim()) {
      return "Subject is required";
    }
    
    if (!body.trim()) {
      return "Message body is required";
    }
    
    if (!user && !guestEmail.trim()) {
      return "Email address is required for guest tickets";
    }
    
    if (!user && guestEmail.trim() && !isValidEmail(guestEmail)) {
      return "Please enter a valid email address";
    }
    
    return null;
  };
  
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  // Handle form submission (Requirement 4.7)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous messages
    setError(null);
    setSuccess(null);
    setCreatedTicketId(null);
    
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    
    try {
      // Submit to POST /api/tickets
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          body: body.trim(),
          orderId: orderId.trim() || undefined,
          guestEmail: !user ? guestEmail.trim() : undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create ticket");
      }
      
      // Display success message with ticket public ID (Requirement 4.4)
      setSuccess(`Ticket created successfully! Your ticket ID is: ${data.ticket.publicId}`);
      setCreatedTicketId(data.ticket.publicId);
      
      // Clear form
      setCategory("other");
      setSubject("");
      setBody("");
      setOrderId("");
      setGuestEmail("");
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <DashboardShell title="Create Support Ticket">
      <div className="max-w-2xl">
        {/* Success Message */}
        {success && (
          <div className="glass mb-6 p-4 border-green-500/20 bg-green-500/10">
            <p className="text-sm text-green-400 font-semibold">✓ {success}</p>
            {createdTicketId && user && (
              <p className="text-sm text-green-400/80 mt-2">
                View your ticket in{" "}
                <Link href="/tickets" className="underline hover:text-green-300">
                  My Tickets
                </Link>
              </p>
            )}
            {createdTicketId && !user && (
              <p className="text-sm text-green-400/80 mt-2">
                Save your ticket ID ({createdTicketId}) to track your request.
              </p>
            )}
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="glass mb-6 p-4 border-red-500/20 bg-red-500/10">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-red-400">✗ {error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
                title="Dismiss error"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* Information */}
        <div className="glass mb-6 p-4">
          <p className="text-sm text-[#9aa3b5]">
            Our support team typically responds within 24 hours. For urgent issues, 
            please include as much detail as possible.
          </p>
        </div>
        
        {/* Ticket Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest Email (only show if not authenticated) */}
          {!user && (
            <div className="glass p-6">
              <label htmlFor="guestEmail" className="block text-sm font-medium mb-2">
                Your Email Address <span className="text-red-400">*</span>
              </label>
              <input
                id="guestEmail"
                type="email"
                className="field"
                placeholder="email@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required={!user}
              />
              <p className="text-xs text-[#9aa3b5] mt-2">
                We'll use this email to send updates about your ticket.
              </p>
            </div>
          )}
          
          {/* Category Selector (Requirement 15.1, 15.2) */}
          <div className="glass p-6">
            <label htmlFor="category" className="block text-sm font-medium mb-2">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              id="category"
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              required
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#9aa3b5] mt-2">
              {categories.find((cat) => cat.value === category)?.description}
            </p>
          </div>
          
          {/* Order ID (Optional) (Requirement 4.7) */}
          <div className="glass p-6">
            <label htmlFor="orderId" className="block text-sm font-medium mb-2">
              Order ID (Optional)
            </label>
            <input
              id="orderId"
              type="text"
              className="field"
              placeholder="CF123456"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
            <p className="text-xs text-[#9aa3b5] mt-2">
              If your ticket is related to a specific order, enter the order ID here.
            </p>
          </div>
          
          {/* Subject Input (Requirement 4.1) */}
          <div className="glass p-6">
            <label htmlFor="subject" className="block text-sm font-medium mb-2">
              Subject <span className="text-red-400">*</span>
            </label>
            <input
              id="subject"
              type="text"
              className="field"
              placeholder="Brief description of your issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={200}
            />
            <p className="text-xs text-[#9aa3b5] mt-2">
              {subject.length}/200 characters
            </p>
          </div>
          
          {/* Body Textarea (Requirement 4.2) */}
          <div className="glass p-6">
            <label htmlFor="body" className="block text-sm font-medium mb-2">
              Message <span className="text-red-400">*</span>
            </label>
            <textarea
              id="body"
              className="field min-h-[200px]"
              placeholder="Please provide detailed information about your issue..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              maxLength={5000}
            />
            <p className="text-xs text-[#9aa3b5] mt-2">
              {body.length}/5,000 characters
            </p>
          </div>
          
          {/* Submit Button */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></span>
                  Creating...
                </>
              ) : (
                "Create Ticket"
              )}
            </button>
            
            {user && (
              <Link href="/tickets" className="btn btn-ghost">
                View My Tickets
              </Link>
            )}
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
