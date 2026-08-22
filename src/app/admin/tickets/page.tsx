"use client";

import { AdminShell } from "@/components/AdminShell";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import type { Ticket, TicketMessage, TicketStatus, TicketCategory } from "@/lib/types";
import { useEffect, useState } from "react";
import { sanitizeTicketMessage, sanitizeTicketSubject } from "@/lib/sanitize";

type TicketWithUser = Ticket & {
  userEmail?: string;
};

type SortField = "createdAt" | "updatedAt" | "status" | "category";
type SortOrder = "asc" | "desc";

/**
 * AdminTicketsPage Component
 * 
 * Admin page for managing support tickets with loading states and error handling.
 * 
 * **Validates Requirements:**
 * - 10.1: Display loading spinner when tickets are being fetched
 * - 10.2: Disable filter controls while loading
 * - 10.3: Hide spinner and show ticket list when loading completes
 * - 10.4: Show error message with retry button on failure
 */
export default function AdminTicketsPage() {
  const [allTickets, setAllTickets] = useState<TicketWithUser[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketWithUser[]>([]);
  const [active, setActive] = useState<TicketWithUser | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [newStatus, setNewStatus] = useState<TicketStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Requirement 15.3, 15.4: Filtering and sorting state
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "all">("all");
  const [filterCategory, setFilterCategory] = useState<TicketCategory | "all">("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  // Requirement 15.3, 15.4: Apply filters and sorting to ticket list
  useEffect(() => {
    let result = [...allTickets];
    
    // Apply status filter
    if (filterStatus !== "all") {
      result = result.filter((t) => t.status === filterStatus);
    }
    
    // Apply category filter
    if (filterCategory !== "all") {
      result = result.filter((t) => t.category === filterCategory);
    }
    
    // Apply search query (search in subject, publicId, user email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(query) ||
          t.publicId.toLowerCase().includes(query) ||
          (t.userEmail && t.userEmail.toLowerCase().includes(query)) ||
          (t.orderId && t.orderId.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let compareA: string | number = a[sortField];
      let compareB: string | number = b[sortField];
      
      // Handle date fields
      if (sortField === "createdAt" || sortField === "updatedAt") {
        compareA = new Date(compareA).getTime();
        compareB = new Date(compareB).getTime();
      }
      
      if (compareA < compareB) return sortOrder === "asc" ? -1 : 1;
      if (compareA > compareB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    
    setFilteredTickets(result);
  }, [allTickets, filterStatus, filterCategory, sortField, sortOrder, searchQuery]);

  async function load() {
    try {
      setIsLoading(true);
      setError(null);
      // Requirement 8.3: Admin endpoint to fetch all tickets
      const res = await fetch("/api/admin/tickets", { cache: "no-store" });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Failed to load tickets");
      }
      
      const list = (json.tickets ?? []) as TicketWithUser[];
      setAllTickets(list);
      
      // Keep active ticket selected if it still exists, otherwise select first filtered
      if (active) {
        const stillExists = list.find((t) => t.id === active.id);
        if (stillExists) {
          setActive(stillExists);
          await loadMessages(stillExists.publicId);
        } else {
          const firstFiltered = filteredTickets[0] ?? null;
          setActive(firstFiltered);
          if (firstFiltered) {
            await loadMessages(firstFiltered.publicId);
          }
        }
      } else if (filteredTickets[0]) {
        setActive(filteredTickets[0]);
        await loadMessages(filteredTickets[0].publicId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
      setAllTickets([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMessages(ticketPublicId: string) {
    try {
      const res = await fetch(`/api/tickets/${ticketPublicId}`, { cache: "no-store" });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Failed to load messages");
      }
      
      setMessages(json.messages || []);
    } catch (e) {
      console.error("Failed to load messages:", e);
      setMessages([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function selectTicket(ticket: TicketWithUser) {
    setActive(ticket);
    setError(null);
    setReply("");
    setNewStatus("");
    await loadMessages(ticket.publicId);
  }

  // Requirement 15.4: Toggle sort order for a field
  function toggleSort(field: SortField) {
    if (sortField === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new field with default descending order
      setSortField(field);
      setSortOrder("desc");
    }
  }

  // Helper to format dates
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  async function send() {
    if (!active) return;
    
    // Requirement 5.5: Prevent replies to closed tickets
    if (active.status === "closed" && !reply.trim()) {
      setError("Cannot reply to closed ticket. This ticket is already closed.");
      return;
    }
    
    // Validate reply body
    if (!reply.trim()) {
      setError("Reply message cannot be empty");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const requestBody: { body: string; newStatus?: TicketStatus } = {
        body: reply.trim(),
      };
      
      // Include status update if specified
      if (newStatus) {
        requestBody.newStatus = newStatus;
      }
      
      const res = await fetch(`/api/tickets/${active.publicId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        // Requirement 5.5: Show clear error message for closed tickets
        if (json.error?.includes("Cannot reply to closed ticket")) {
          setError("Cannot reply to closed ticket. This ticket is already closed and cannot accept new messages.");
        } else {
          setError(json.error || "Failed to send reply");
        }
        return;
      }
      
      // Clear form and reload
      setReply("");
      setNewStatus("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      setLoading(false);
    }
  }

  // Available status options for the dropdown
  const statusOptions: { value: TicketStatus; label: string; description: string }[] = [
    { value: "open", label: "Open", description: "Ticket is new and awaiting response" },
    { value: "in_progress", label: "In Progress", description: "Actively working on this ticket" },
    { value: "waiting_customer", label: "Waiting on Customer", description: "Awaiting customer response" },
    { value: "resolved", label: "Resolved", description: "Issue has been resolved" },
    { value: "closed", label: "Closed", description: "Ticket is closed and archived" },
  ];

  return (
    <AdminShell title="Support tickets">
      {/* Error State - Show error message with retry button (Requirement 10.4) */}
      {error && (
        <div className="mb-4 rounded-lg bg-[#f07167]/10 border border-[#f07167]/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#f07167]">Failed to load tickets</p>
              <p className="mt-1 text-sm text-[#f07167]">{error}</p>
            </div>
            <button
              onClick={() => load()}
              className="btn btn-ghost text-xs px-3 py-1"
              title="Retry loading tickets"
              disabled={isLoading}
            >
              {isLoading ? "Retrying..." : "Retry"}
            </button>
          </div>
        </div>
      )}
      
      {/* Loading State (Requirements 10.1, 10.3) */}
      {isLoading && <LoadingSpinner message="Loading tickets..." />}
      
      {/* Empty State */}
      {!isLoading && !error && !allTickets.length && (
        <EmptyState
          type="tickets"
          title="No Tickets Yet"
          description="New support tickets from /support will appear here. Check back once users submit their first tickets."
        />
      )}
      
      {/* Requirement 15.3, 15.4: Filters and Search - Disabled while loading (Requirement 10.2) */}
      {!isLoading && allTickets.length > 0 && (
        <div className="glass mb-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div>
              <label className="mb-1 block text-xs text-[#9aa3b5]">Search</label>
              <input
                type="text"
                className="field w-full text-sm"
                placeholder="ID, subject, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="mb-1 block text-xs text-[#9aa3b5]">Status</label>
              <select
                className="field w-full text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TicketStatus | "all")}
                disabled={isLoading}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_customer">Waiting Customer</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            
            {/* Category Filter */}
            <div>
              <label className="mb-1 block text-xs text-[#9aa3b5]">Category</label>
              <select
                className="field w-full text-sm"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as TicketCategory | "all")}
                disabled={isLoading}
              >
                <option value="all">All Categories</option>
                <option value="order">Order</option>
                <option value="payment">Payment</option>
                <option value="refill">Refill</option>
                <option value="account">Account</option>
                <option value="api">API</option>
                <option value="service">Service</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            {/* Sort */}
            <div>
              <label className="mb-1 block text-xs text-[#9aa3b5]">Sort By</label>
              <select
                className="field w-full text-sm"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                disabled={isLoading}
              >
                <option value="createdAt">Created Date</option>
                <option value="updatedAt">Updated Date</option>
                <option value="status">Status</option>
                <option value="category">Category</option>
              </select>
            </div>
          </div>
          
          {/* Results summary */}
          <div className="mt-3 flex items-center justify-between text-xs text-[#9aa3b5]">
            <span>
              Showing {filteredTickets.length} of {allTickets.length} tickets
            </span>
            <button
              className="btn-ghost text-xs"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              disabled={isLoading}
            >
              {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
            </button>
          </div>
        </div>
      )}
      
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        {/* Ticket List - Requirement 8.3, 15.3, 15.4 */}
        <div className="space-y-3">
          {filteredTickets.length === 0 && allTickets.length > 0 && (
            <p className="muted text-sm">No tickets match your filters.</p>
          )}
          {filteredTickets.map((t) => (
            <article
              key={t.id}
              className={`glass cursor-pointer p-4 transition-all hover:border-white/20 ${
                active?.id === t.id ? "border-white/30 bg-white/5" : ""
              }`}
              onClick={() => selectTicket(t)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-[#9aa3b5]">{t.publicId}</p>
                    {/* Requirement 8.3: Display user information */}
                    {t.userEmail && (
                      <span className="text-xs text-[#9aa3b5]">· {t.userEmail}</span>
                    )}
                    {!t.userId && (
                      <span className="rounded-full bg-[#9aa3b5]/20 px-2 py-0.5 text-xs text-[#9aa3b5]">
                        Guest
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-medium">{sanitizeTicketSubject(t.subject)}</p>
                  <div className="muted mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="capitalize">{t.category}</span>
                    {t.orderId && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{t.orderId}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{formatDate(t.createdAt)}</span>
                  </div>
                </div>
                <div className={`rounded-full px-2 py-1 text-xs font-medium ${
                  t.status === "open" ? "bg-[#f5b942]/20 text-[#f5b942]" :
                  t.status === "in_progress" ? "bg-[#6ea8ff]/20 text-[#6ea8ff]" :
                  t.status === "waiting_customer" ? "bg-[#f5b942]/20 text-[#f5b942]" :
                  t.status === "resolved" ? "bg-[#51cf66]/20 text-[#51cf66]" :
                  "bg-[#9aa3b5]/20 text-[#9aa3b5]"
                }`}>
                  {t.status === "waiting_customer" ? "Waiting" : t.status.replace("_", " ")}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Reply Panel */}
        <aside className="glass h-fit p-5 text-sm sticky top-4">
          {active ? (
            <>
              <div className="mb-4 border-b border-white/10 pb-4">
                <p className="font-semibold text-base">Ticket Details</p>
                <p className="text-xs text-[#9aa3b5] mt-1">{active.publicId}</p>
                <p className="mt-2">{sanitizeTicketSubject(active.subject)}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="text-[#9aa3b5]">Category:</span>
                  <span className="capitalize">{active.category}</span>
                </div>
                {active.orderId && (
                  <div className="mt-1 flex gap-2 text-xs">
                    <span className="text-[#9aa3b5]">Order:</span>
                    <span className="font-mono">{active.orderId}</span>
                  </div>
                )}
              </div>

              {/* Messages Thread */}
              <div className="mb-4 max-h-64 overflow-y-auto space-y-3">
                <p className="font-semibold text-xs text-[#9aa3b5] uppercase tracking-wide">Conversation</p>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.authorRole === "agent"
                        ? "rounded-xl border border-[#6ea8ff]/30 bg-[#6ea8ff]/5 p-3"
                        : "rounded-xl bg-white/5 p-3"
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium capitalize text-[#9aa3b5]">
                        {m.authorRole}
                      </span>
                      <span className="text-xs text-[#9aa3b5]">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{sanitizeTicketMessage(m.body)}</p>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-xs text-[#9aa3b5]">No messages yet</p>
                )}
              </div>

              {/* Requirement 6.3: Prevent replies to closed tickets */}
              {active.status === "closed" && (
                <div className="mb-4 rounded-lg bg-[#9aa3b5]/10 border border-[#9aa3b5]/20 p-3 text-xs text-[#9aa3b5]">
                  ⓘ This ticket is closed and cannot receive new replies.
                </div>
              )}

              {/* Reply Form - Requirements 5.5, 6.2, 6.3, 6.4 */}
              <div className={active.status === "closed" ? "opacity-50 pointer-events-none" : ""}>
                {error && (
                  <div className="mb-4 rounded-lg bg-[#f07167]/10 border border-[#f07167]/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-[#f07167]">{error}</p>
                      <button
                        onClick={() => setError(null)}
                        className="text-[#f07167] hover:text-[#f07167]/80"
                        title="Dismiss error"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
                
                <label className="block font-semibold mb-2">Admin Reply</label>
                <textarea
                  className="field min-h-24 w-full"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={active.status === "closed" ? "Ticket is closed" : "Type your reply..."}
                  disabled={active.status === "closed"}
                />

                {/* Requirement 6.2: Admin-specific status update dropdown */}
                <div className="mt-3">
                  <label className="block text-xs text-[#9aa3b5] mb-1">Update Status (optional)</label>
                  <select
                    className="field w-full text-sm"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TicketStatus | "")}
                    disabled={active.status === "closed"}
                  >
                    <option value="">Keep current status</option>
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} title={opt.description}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {newStatus && (
                    <p className="mt-1 text-xs text-[#9aa3b5]">
                      {statusOptions.find(o => o.value === newStatus)?.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary flex-1"
                    onClick={send}
                    disabled={loading || active.status === "closed"}
                  >
                    {loading ? "Sending..." : "Send Reply"}
                  </button>
                  
                  {/* Requirement 6.2, 6.3: Quick action to close ticket */}
                  {active.status !== "closed" && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setNewStatus("closed");
                        if (!reply.trim()) {
                          setReply("Ticket closed by admin.");
                        }
                      }}
                      disabled={loading}
                      title="Close this ticket"
                    >
                      Close Ticket
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="muted">Select a ticket to view details and reply.</p>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
