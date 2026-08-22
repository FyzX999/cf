"use client";

import { DashboardShell } from "@/components/DashboardShell";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import type { Ticket, TicketCategory, TicketStatus } from "@/lib/types";
import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "@/lib/format";
import { sanitizeTicketSubject } from "@/lib/sanitize";

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "order", label: "Order" },
  { value: "payment", label: "Payment" },
  { value: "refill", label: "Refill" },
  { value: "account", label: "Account" },
  { value: "api", label: "API" },
  { value: "service", label: "Service" },
  { value: "other", label: "Other" },
];

const STATUSES: { value: TicketStatus; label: string; color: string }[] = [
  { value: "open", label: "Open", color: "bg-[#f5b942]" },
  { value: "in_progress", label: "In Progress", color: "bg-[#6ea8ff]" },
  { value: "waiting_customer", label: "Waiting", color: "bg-[#8b7dff]" },
  { value: "resolved", label: "Resolved", color: "bg-[#3ddc97]" },
  { value: "closed", label: "Closed", color: "bg-[#9aa3b5]" },
];

/**
 * TicketsPage Component
 * 
 * Displays list of support tickets with loading states and error handling.
 * 
 * **Validates Requirements:**
 * - 10.1: Display loading spinner when tickets are being fetched
 * - 10.2: Disable filter controls while loading
 * - 10.3: Hide spinner and show ticket list when loading completes
 * - 10.4: Show error message with retry button on failure
 */
export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/tickets", { cache: "no-store" });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Failed to load tickets");
      }
      
      setTickets(json.tickets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  }

  // Filter tickets based on selected filters
  const filteredTickets = tickets.filter((ticket) => {
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesCategory && matchesStatus;
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status badge styling
  const getStatusBadge = (status: TicketStatus) => {
    const statusInfo = STATUSES.find((s) => s.value === status);
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium">
        <span className={clsx("h-1.5 w-1.5 rounded-full", statusInfo?.color || "bg-[#9aa3b5]")} />
        {statusInfo?.label || status}
      </span>
    );
  };

  return (
    <DashboardShell title="Support Tickets">
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/tickets/new" className="btn btn-primary">
          Create Ticket
        </Link>
      </div>

      {/* Filters - Disabled while loading (Requirement 10.2) */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#9aa3b5]">Category:</label>
          <select
            className="field min-w-[150px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | "all")}
            disabled={isLoading}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-[#9aa3b5]">Status:</label>
          <select
            className="field min-w-[150px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "all")}
            disabled={isLoading}
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((stat) => (
              <option key={stat.value} value={stat.value}>
                {stat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error State - Show error message with retry button (Requirement 10.4) */}
      {error && (
        <div className="glass mb-4 border-l-4 border-[#f07167] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#f07167]">Failed to load tickets</p>
              <p className="text-sm text-[#f07167] mt-1">{error}</p>
            </div>
            <button
              onClick={() => loadTickets()}
              className="btn btn-ghost text-xs px-3 py-1"
              disabled={isLoading}
            >
              {isLoading ? "Retrying..." : "Retry"}
            </button>
          </div>
        </div>
      )}

      {/* Loading State (Requirements 10.1, 10.3) */}
      {isLoading && <LoadingSpinner message="Loading tickets..." />}

      {/* Tickets List */}
      {!isLoading && !error && (
        <>
          {tickets.length === 0 ? (
            <EmptyState
              type="tickets"
              title="No Tickets Yet"
              description="Create your first support ticket to get started. Our team is here to help with any questions or issues you may have."
              actionLabel="Create Ticket"
              onAction={() => window.location.href = '/tickets/new'}
            />
          ) : filteredTickets.length === 0 ? (
            <EmptyState
              type="tickets"
              title="No Matching Tickets"
              description="No tickets match the selected filters. Try adjusting your category or status filters to see more results."
            />
          ) : (
            <div className="glass overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[#9aa3b5]">
                  <tr>
                    <th className="px-4 py-3">Ticket ID</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-t border-white/8">
                      <td className="px-4 py-3">
                        <span className="font-mono text-[#6ea8ff]">#{ticket.publicId}</span>
                      </td>
                      <td className="px-4 py-3">{sanitizeTicketSubject(ticket.subject)}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-[#9aa3b5]">{ticket.category}</span>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(ticket.status)}</td>
                      <td className="px-4 py-3 text-[#9aa3b5]">{formatDate(ticket.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/tickets/${ticket.publicId}`}
                          className="text-[#6ea8ff] hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Results Count */}
      {!isLoading && !error && filteredTickets.length > 0 && (
        <div className="mt-4 text-sm text-[#9aa3b5]">
          Showing {filteredTickets.length} of {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
        </div>
      )}
    </DashboardShell>
  );
}
