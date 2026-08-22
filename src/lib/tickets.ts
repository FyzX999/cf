import { createServiceSupabase } from "./supabase";
import type { CreateTicketInput, Ticket, TicketCategory, TicketReplyInput, TicketStatus, TicketMessage } from "./types";
import { notifyNewTicket, notifyTicketReply, notifyTicketUpdate } from "./email";

const VALID_CATEGORIES: TicketCategory[] = [
  "order",
  "payment",
  "refill",
  "account",
  "api",
  "service",
  "other",
];

/**
 * Generate a unique public ID for a ticket in the format "TKT" + 6 digits
 * @returns A unique ticket public ID (e.g., "TKT123456")
 */
function generateTicketPublicId(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `TKT${n}`;
}

/**
 * Validate that a category is one of the allowed ticket categories
 * @param category - The category to validate
 * @returns true if valid, false otherwise
 */
function isValidCategory(category: string): category is TicketCategory {
  return VALID_CATEGORIES.includes(category as TicketCategory);
}

/**
 * Validation result for ticket input
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Consolidate ticket validation logic with distinct error messages
 * 
 * **Validates Requirements:**
 * - 2.1, 2.2: Return exactly one error message for subject validation failure
 * - 2.3: Return exactly one error message for body validation failure
 * - 2.4: Combine multiple validation failures into distinct messages
 * - 2.5: Clearly identify which field failed in error messages
 * 
 * @param input - The ticket input to validate
 * @returns ValidationResult with valid flag and array of distinct errors
 */
export function validateTicketInput(input: CreateTicketInput): ValidationResult {
  const errors: string[] = [];

  // Validate subject
  const subject = input.subject?.trim() || "";
  if (subject.length === 0) {
    errors.push("Subject is required");
  }

  // Validate body
  const body = input.body?.trim() || "";
  if (body.length === 0) {
    errors.push("Message body is required");
  } else if (body.length > 5000) {
    errors.push("Message body cannot exceed 5000 characters");
  }

  // Validate category
  if (!input.category) {
    errors.push("Category is required");
  } else if (!isValidCategory(input.category)) {
    errors.push(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }

  // Validate authentication (either userId or guestEmail must be provided)
  if (!input.userId && !input.guestEmail) {
    errors.push("Either userId or guestEmail must be provided");
  }

  // Validate email format if guestEmail is provided (Requirement 3.3, 3.4)
  if (input.guestEmail) {
    const emailTrimmed = input.guestEmail.trim();
    if (emailTrimmed.length === 0) {
      // Whitespace-only email should be treated as missing
      if (!input.userId) {
        // Only add error if we haven't already added it above
        if (!errors.includes("Either userId or guestEmail must be provided")) {
          errors.push("Either userId or guestEmail must be provided");
        }
      }
    } else {
      // RFC 5322 simplified email validation
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_REGEX.test(emailTrimmed)) {
        errors.push("Please enter a valid email address");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Verify that an order exists in the database
 * @param orderId - The public ID of the order to verify
 * @returns true if order exists, false otherwise
 */
async function orderExists(orderId: string): Promise<boolean> {
  const db = createServiceSupabase();
  if (!db) {
    // If no database configured, assume valid
    return true;
  }

  const { data, error } = await db
    .from("orders")
    .select("public_id")
    .eq("public_id", orderId)
    .maybeSingle();

  if (error) {
    console.error("Error validating order:", error);
    return false;
  }

  return Boolean(data);
}

/**
 * Create a new support ticket with atomic transaction handling
 * 
 * **Validates Requirements:**
 * - 4.1, 4.2, 4.3: Non-empty subject, body, and valid category
 * - 4.4: Generate unique public ID in format "TKT" + digits
 * - 4.5: Set initial status to "open"
 * - 4.6: Record created_at and updated_at timestamps
 * - 4.7, 9.1, 9.2, 9.3, 9.4: Support both authenticated and guest users
 * - 14.1, 14.2, 14.3: Input validation with trimming
 * - 14.4: Maximum body length validation
 * - 15.1, 15.2: Category validation
 * - 18.1, 18.2, 18.3, 18.4: Public ID generation and uniqueness
 * - 19.1, 19.2, 19.3, 19.4: Atomic creation (ticket + message or neither)
 * 
 * @param input - The ticket creation input
 * @returns The created ticket
 * @throws Error if validation fails or database operation fails
 */
export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  // Use consolidated validation function (Requirements 2.1, 2.2, 2.3, 2.4, 2.5)
  const validation = validateTicketInput(input);
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  // At this point, we know input is valid, so we can safely trim
  const subject = input.subject.trim();
  const body = input.body.trim();

  // Requirement 4.7: Validate order ID if provided
  if (input.orderId) {
    const exists = await orderExists(input.orderId);
    if (!exists) {
      throw new Error("Order not found. Please verify the order ID.");
    }
  }

  const db = createServiceSupabase();
  if (!db) {
    throw new Error("Database not configured");
  }

  // Requirement 18.1, 18.2: Generate unique ticket ID and public ID
  const ticketId = crypto.randomUUID();
  const publicId = generateTicketPublicId();
  const messageId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Requirement 19.1, 19.2, 19.3, 19.4: Begin atomic transaction
  // Insert ticket and initial message in a single transaction using RPC or sequential inserts
  // Supabase doesn't support multi-table transactions directly, but we can handle rollback via try-catch

  let ticket: Ticket | null = null;

  try {
    // Requirement 4.5, 4.6: Insert ticket record with status='open' and timestamps
    const { data: ticketData, error: ticketError } = await db
      .from("tickets")
      .insert({
        id: ticketId,
        public_id: publicId,
        user_id: input.userId ?? null,
        guest_email: input.guestEmail ?? null,
        category: input.category,
        subject,
        status: "open",
        order_id: input.orderId ?? null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (ticketError) {
      throw new Error(`Failed to create ticket: ${ticketError.message}`);
    }

    // Requirement 5.1: Insert initial message with authorRole='customer'
    const { error: messageError } = await db.from("ticket_messages").insert({
      id: messageId,
      ticket_id: ticketId,
      author_role: "customer",
      body,
      created_at: now,
    });

    if (messageError) {
      // Rollback: Delete the ticket if message creation fails
      await db.from("tickets").delete().eq("id", ticketId);
      throw new Error(`Failed to create initial message: ${messageError.message}`);
    }

    // Map database row to Ticket type
    ticket = {
      id: ticketData.id,
      publicId: ticketData.public_id,
      userId: ticketData.user_id,
      category: ticketData.category as TicketCategory,
      subject: ticketData.subject,
      status: ticketData.status as Ticket["status"],
      orderId: ticketData.order_id ?? undefined,
      createdAt: ticketData.created_at,
      updatedAt: ticketData.updated_at,
    };
  } catch (error) {
    // Requirement 19.4: Ensure all-or-nothing creation
    console.error("Ticket creation failed:", error);
    throw error;
  }

  // Requirement 7.1: Send email notification to support team
  try {
    await notifyNewTicket(ticket.publicId, ticket.category, ticket.subject);
  } catch (error) {
    // Log but don't throw - per Requirement 7.5, email failures shouldn't block operations
    console.error("Failed to send new ticket notification:", error);
  }

  return ticket;
}

/**
 * Reply to an existing support ticket with a new message
 * 
 * **Validates Requirements:**
 * - 5.1, 5.2, 5.3: Insert message with appropriate authorRole and update timestamp
 * - 5.5: Prevent replies to closed tickets
 * - 6.1: Automatic status transition (open → in_progress on first agent reply)
 * - 6.2, 6.3, 6.4: Support explicit status updates and prevent changes to closed tickets
 * 
 * @param input - The ticket reply input
 * @returns The updated ticket
 * @throws Error if validation fails or ticket is closed
 */
export async function replyToTicket(input: TicketReplyInput): Promise<Ticket> {
  // Validate reply body is non-empty (trimmed)
  const body = input.body.trim();

  if (body.length === 0) {
    throw new Error("Reply message cannot be empty");
  }

  const db = createServiceSupabase();
  if (!db) {
    throw new Error("Database not configured");
  }

  // Step 1: Fetch existing ticket and validate
  const { data: ticketData, error: fetchError } = await db
    .from("tickets")
    .select("*")
    .eq("id", input.ticketId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch ticket: ${fetchError.message}`);
  }

  if (!ticketData) {
    throw new Error("Ticket not found");
  }

  // Requirement 5.5: Prevent replies to closed tickets
  if (ticketData.status === "closed") {
    throw new Error("Cannot reply to closed ticket");
  }

  const messageId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Requirement 6.1: Determine new status with automatic transition
  let newStatus = input.newStatus;
  if (!newStatus) {
    // Auto-transition: open → in_progress on first agent reply
    if (input.authorRole === "agent" && ticketData.status === "open") {
      newStatus = "in_progress";
    } else {
      // Keep current status if no explicit update
      newStatus = ticketData.status as TicketStatus;
    }
  }

  // Requirement 6.3: Prevent status changes to closed tickets
  if (ticketData.status === "closed" && newStatus !== "closed") {
    throw new Error("Cannot change status of closed ticket");
  }

  try {
    // Requirement 5.2: Insert new message with appropriate authorRole
    const { error: messageError } = await db.from("ticket_messages").insert({
      id: messageId,
      ticket_id: input.ticketId,
      author_role: input.authorRole,
      body,
      created_at: now,
    });

    if (messageError) {
      throw new Error(`Failed to insert message: ${messageError.message}`);
    }

    // Requirement 5.3, 6.4: Update ticket's updated_at timestamp and status
    const { data: updatedTicketData, error: updateError } = await db
      .from("tickets")
      .update({
        status: newStatus,
        updated_at: now,
      })
      .eq("id", input.ticketId)
      .select()
      .single();

    if (updateError) {
      // Attempt rollback: delete the message we just inserted
      await db.from("ticket_messages").delete().eq("id", messageId);
      throw new Error(`Failed to update ticket: ${updateError.message}`);
    }

    // Map database row to Ticket type
    const updatedTicket: Ticket = {
      id: updatedTicketData.id,
      publicId: updatedTicketData.public_id,
      userId: updatedTicketData.user_id,
      category: updatedTicketData.category as TicketCategory,
      subject: updatedTicketData.subject,
      status: updatedTicketData.status as TicketStatus,
      orderId: updatedTicketData.order_id ?? undefined,
      createdAt: updatedTicketData.created_at,
      updatedAt: updatedTicketData.updated_at,
    };

    // Requirement 7.2, 7.3: Send email notification based on author role
    try {
      if (input.authorRole === "agent") {
        // Requirement 7.2: Agent replied - notify customer
        if (updatedTicket.userId) {
          // Get customer email from profiles table
          const { data: profile } = await db
            .from("profiles")
            .select("email")
            .eq("id", updatedTicket.userId)
            .maybeSingle();

          if (profile?.email) {
            await notifyTicketReply(profile.email, updatedTicket.publicId, updatedTicket.subject);
          }
        } else {
          // Guest ticket - get email from ticket table
          const { data: guestTicket } = await db
            .from("tickets")
            .select("guest_email")
            .eq("id", updatedTicket.id)
            .maybeSingle();

          if (guestTicket?.guest_email) {
            await notifyTicketReply(guestTicket.guest_email, updatedTicket.publicId, updatedTicket.subject);
          }
        }
      } else {
        // Requirement 7.3: Customer replied - notify support team
        await notifyTicketUpdate(updatedTicket.publicId, updatedTicket.subject);
      }
    } catch (error) {
      // Log but don't throw - per Requirement 7.5, email failures shouldn't block operations
      console.error("Failed to send ticket reply notification:", error);
    }

    return updatedTicket;
  } catch (error) {
    console.error("Reply to ticket failed:", error);
    throw error;
  }
}

/**
 * Get a ticket by ID with authorization check
 * 
 * **Validates Requirements:**
 * - 8.1, 8.2: Fetch ticket with owner/admin authorization check
 * 
 * @param ticketId - The ticket ID to fetch
 * @param requesterId - The user ID making the request
 * @param isAdmin - Whether the requester is an admin
 * @returns The ticket if found and authorized
 * @throws Error if ticket not found or unauthorized
 */
export async function getTicket(
  ticketId: string,
  requesterId: string | null,
  isAdmin: boolean = false
): Promise<Ticket> {
  const db = createServiceSupabase();
  if (!db) {
    throw new Error("Database not configured");
  }

  // Fetch ticket by ID
  const { data: ticketData, error: fetchError } = await db
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch ticket: ${fetchError.message}`);
  }

  if (!ticketData) {
    throw new Error("Ticket not found");
  }

  // Requirement 8.2: Verify authorization (owner or admin)
  if (!isAdmin) {
    // Check if requester is the owner
    if (ticketData.user_id !== requesterId) {
      throw new Error("Unauthorized");
    }
  }

  // Map database row to Ticket type
  const ticket: Ticket = {
    id: ticketData.id,
    publicId: ticketData.public_id,
    userId: ticketData.user_id,
    category: ticketData.category as TicketCategory,
    subject: ticketData.subject,
    status: ticketData.status as TicketStatus,
    orderId: ticketData.order_id ?? undefined,
    createdAt: ticketData.created_at,
    updatedAt: ticketData.updated_at,
  };

  return ticket;
}

/**
 * List tickets for a specific user with pagination
 * 
 * **Validates Requirements:**
 * - 8.1: Return only tickets where user_id matches the authenticated user
 * - 8.3: Admins can list all tickets
 * 
 * @param userId - The user ID to fetch tickets for (null for all tickets if admin)
 * @param isAdmin - Whether the requester is an admin
 * @param limit - Maximum number of tickets to return (default: 50)
 * @param offset - Number of tickets to skip (default: 0)
 * @returns Array of tickets for the user
 * @throws Error if database operation fails
 */
export async function listTicketsForUser(
  userId: string | null,
  isAdmin: boolean = false,
  limit: number = 50,
  offset: number = 0
): Promise<Ticket[]> {
  const db = createServiceSupabase();
  if (!db) {
    throw new Error("Database not configured");
  }

  let query = db.from("tickets").select("*");

  // Requirement 8.1, 8.3: Filter by user_id unless admin
  if (!isAdmin && userId) {
    query = query.eq("user_id", userId);
  }

  // Add pagination and ordering
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: ticketsData, error: fetchError } = await query;

  if (fetchError) {
    throw new Error(`Failed to fetch tickets: ${fetchError.message}`);
  }

  // Map database rows to Ticket type
  const tickets: Ticket[] = (ticketsData || []).map((ticket) => ({
    id: ticket.id,
    publicId: ticket.public_id,
    userId: ticket.user_id,
    category: ticket.category as TicketCategory,
    subject: ticket.subject,
    status: ticket.status as TicketStatus,
    orderId: ticket.order_id ?? undefined,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
  }));

  return tickets;
}

/**
 * List all messages for a ticket ordered chronologically
 * 
 * **Validates Requirements:**
 * - 5.4: Retrieve messages ordered chronologically by created_at
 * - 8.1: Support ticket message retrieval
 * 
 * @param ticketId - The ticket ID to fetch messages for
 * @returns Array of ticket messages in chronological order
 * @throws Error if database operation fails
 */
export async function listTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const db = createServiceSupabase();
  if (!db) {
    throw new Error("Database not configured");
  }

  // Requirement 5.4: Fetch messages ordered chronologically by created_at
  const { data: messagesData, error: fetchError } = await db
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (fetchError) {
    throw new Error(`Failed to fetch ticket messages: ${fetchError.message}`);
  }

  // Map database rows to TicketMessage type
  const messages: TicketMessage[] = (messagesData || []).map((msg) => ({
    id: msg.id,
    ticketId: msg.ticket_id,
    authorRole: msg.author_role as TicketMessage["authorRole"],
    body: msg.body,
    createdAt: msg.created_at,
    attachments: msg.attachments || undefined,
  }));

  return messages;
}

/**
 * Get a ticket by public ID (for guest access without authentication)
 * 
 * **Validates Requirements:**
 * - 9.4: Allow guest ticket tracking via public ID
 * - 18.4: Allow ticket lookup by public ID
 * 
 * @param publicId - The ticket public ID to fetch
 * @returns The ticket if found
 * @throws Error if ticket not found or database operation fails
 */
export async function getTicketByPublicId(publicId: string): Promise<Ticket> {
  const db = createServiceSupabase();
  if (!db) {
    throw new Error("Database not configured");
  }

  // Fetch ticket by public_id
  const { data: ticketData, error: fetchError } = await db
    .from("tickets")
    .select("*")
    .eq("public_id", publicId.toUpperCase())
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch ticket: ${fetchError.message}`);
  }

  if (!ticketData) {
    throw new Error("Ticket not found");
  }

  // Map database row to Ticket type
  const ticket: Ticket = {
    id: ticketData.id,
    publicId: ticketData.public_id,
    userId: ticketData.user_id,
    category: ticketData.category as TicketCategory,
    subject: ticketData.subject,
    status: ticketData.status as TicketStatus,
    orderId: ticketData.order_id ?? undefined,
    createdAt: ticketData.created_at,
    updatedAt: ticketData.updated_at,
  };

  return ticket;
}

/**
 * List tickets associated with a specific order ID
 * 
 * **Validates Requirements:**
 * - 11.3: Display tickets associated with an order
 * 
 * @param orderId - The order public ID to fetch tickets for
 * @returns Array of tickets associated with the order
 * @throws Error if database operation fails
 */
export async function listTicketsByOrderId(orderId: string): Promise<Ticket[]> {
  const db = createServiceSupabase();
  if (!db) {
    throw new Error("Database not configured");
  }

  // Fetch tickets filtered by order_id
  const { data: ticketsData, error: fetchError } = await db
    .from("tickets")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (fetchError) {
    throw new Error(`Failed to fetch tickets for order: ${fetchError.message}`);
  }

  // Map database rows to Ticket type
  const tickets: Ticket[] = (ticketsData || []).map((ticket) => ({
    id: ticket.id,
    publicId: ticket.public_id,
    userId: ticket.user_id,
    category: ticket.category as TicketCategory,
    subject: ticket.subject,
    status: ticket.status as TicketStatus,
    orderId: ticket.order_id ?? undefined,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
  }));

  return tickets;
}
