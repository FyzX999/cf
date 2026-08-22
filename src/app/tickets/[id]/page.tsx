"use client";

import { DashboardShell } from "@/components/DashboardShell";
import type { Ticket, TicketMessage, TicketStatus } from "@/lib/types";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "@/lib/format";
import { sanitizeTicketMessage, sanitizeTicketSubject } from "@/lib/sanitize";

const STATUSES: { value: TicketStatus; label: string; color: string }[] = [
  { value: "open", label: "Open", color: "bg-[#f5b942]" },
  { value: "in_progress", label: "In Progress", color: "bg-[#6ea8ff]" },
  { value: "waiting_customer", label: "Waiting", color: "bg-[#8b7dff]" },
  { value: "resolved", label: "Resolved", color: "bg-[#3ddc97]" },
  { value: "closed", label: "Closed", color: "bg-[#9aa3b5]" },
];

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketPublicId = params.id as string; // This is actually publicId from the URL

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Reply form state
  const [replyBody, setReplyBody] = useState("");
  const [newStatus, setNewStatus] = useState<TicketStatus | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Load ticket and messages
  useEffect(() => {
    loadTicket();
  }, [ticketPublicId]);

  async function loadTicket() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/tickets/${ticketPublicId}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load ticket");
      }

      setTicket(json.ticket);
      setMessages(json.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/admin/settings");
        setIsAdmin(res.ok);
      } catch {
        setIsAdmin(false);
      }
    }

    checkAdmin();
  }, []);

  // Handle reply submission
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyBody.trim()) {
      setReplyError("Reply message cannot be empty");
      return;
    }

    if (ticket?.status === "closed") {
      setReplyError("Cannot reply to a closed ticket");
      return;
    }

    try {
      setSubmitting(true);
      setReplyError(null);

      const payload: {
        body: string;
        newStatus?: TicketStatus;
      } = {
        body: replyBody,
      };

      // Include status update if changed (admin only)
      if (newStatus && newStatus !== ticket?.status) {
        payload.newStatus = newStatus;
      }

      const res = await fetch(`/api/tickets/${ticketPublicId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to submit reply");
      }

      // Update ticket and messages
      setTicket(json.ticket);
      setMessages(json.messages || []);
      setReplyBody("");
      setNewStatus("");
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : "Failed to submit reply");
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  // Get author role badge styling
  const getAuthorBadge = (role: "customer" | "agent" | "system") => {
    const colors = {
      customer: "bg-[#6ea8ff] text-white",
      agent: "bg-[#3ddc97] text-white",
      system: "bg-[#9aa3b5] text-white",
    };

    const labels = {
      customer: "Customer",
      agent: "Support Agent",
      system: "System",
    };

    return (
      <span className={clsx("inline-block rounded-full px-2 py-0.5 text-xs font-medium", colors[role])}>
        {labels[role]}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardShell title="Ticket Details">
        <div className="glass p-8 text-center">
          <p className="text-[#9aa3b5]">Loading ticket...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !ticket) {
    return (
      <DashboardShell title="Ticket Details">
        <div className="glass border-l-4 border-[#f07167] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#f07167] mb-1">
                {error?.includes("not found") ? "Ticket Not Found" : "Error Loading Ticket"}
              </p>
              <p className="text-sm text-[#9aa3b5]">
                {error || "The requested ticket could not be found. It may have been deleted or the ID is incorrect."}
              </p>
            </div>
            {error && !error.includes("not found") && (
              <button
                onClick={() => loadTicket()}
                className="btn btn-ghost text-xs px-3 py-1"
                disabled={loading}
              >
                {loading ? "Retrying..." : "Retry"}
              </button>
            )}
          </div>
          <Link href="/tickets" className="mt-4 inline-block text-[#6ea8ff] hover:underline">
            ← Back to tickets
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={`Ticket #${ticket.publicId}`}>
      {/* Back link */}
      <div className="mb-6">
        <Link href="/tickets" className="text-sm text-[#6ea8ff] hover:underline">
          ← Back to tickets
        </Link>
      </div>

      {/* Ticket Information Card */}
      <div className="glass mb-6 p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{sanitizeTicketSubject(ticket.subject)}</h2>
            <p className="mt-1 text-sm text-[#9aa3b5]">Ticket ID: #{ticket.publicId}</p>
          </div>
          {getStatusBadge(ticket.status)}
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <span className="text-[#9aa3b5]">Category:</span>{" "}
            <span className="capitalize">{ticket.category}</span>
          </div>
          <div>
            <span className="text-[#9aa3b5]">Created:</span> {formatDate(ticket.createdAt)}
          </div>
          <div>
            <span className="text-[#9aa3b5]">Last Updated:</span> {formatDate(ticket.updatedAt)}
          </div>
          {ticket.orderId && (
            <div>
              <span className="text-[#9aa3b5]">Related Order:</span>{" "}
              <Link
                href={`/dashboard/orders?id=${ticket.orderId}`}
                className="font-mono text-[#6ea8ff] hover:underline"
              >
                #{ticket.orderId}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="mb-6">
        <h3 className="mb-4 text-lg font-semibold">Conversation</h3>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="glass p-6 text-center text-[#9aa3b5]">No messages yet.</div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                "glass p-4",
                message.authorRole === "agent" && "border-l-4 border-[#3ddc97]",
                message.authorRole === "customer" && "border-l-4 border-[#6ea8ff]"
              )}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                {getAuthorBadge(message.authorRole)}
                <span className="text-xs text-[#9aa3b5]">{formatDate(message.createdAt)}</span>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{sanitizeTicketMessage(message.body)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reply Form */}
      {ticket.status !== "closed" ? (
        <div className="glass p-6">
          <h3 className="mb-4 text-lg font-semibold">Add Reply</h3>
          <form onSubmit={handleReply}>
            {replyError && (
              <div className="mb-4 rounded-lg border border-[#f07167] bg-[#f07167]/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-[#f07167]">{replyError}</p>
                  <button
                    type="button"
                    onClick={() => setReplyError(null)}
                    className="text-[#f07167] hover:text-[#f07167]/80"
                    title="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="replyBody" className="mb-2 block text-sm text-[#9aa3b5]">
                Your Message
              </label>
              <textarea
                id="replyBody"
                className="field min-h-[120px] w-full resize-y"
                placeholder="Type your reply here..."
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            {/* Admin-only status update */}
            {isAdmin && (
              <div className="mb-4">
                <label htmlFor="newStatus" className="mb-2 block text-sm text-[#9aa3b5]">
                  Update Status (Optional)
                </label>
                <select
                  id="newStatus"
                  className="field w-full md:w-auto"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as TicketStatus | "")}
                  disabled={submitting}
                >
                  <option value="">Keep current status</option>
                  {STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></span>
                  Submitting...
                </>
              ) : (
                "Submit Reply"
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="glass border-l-4 border-[#9aa3b5] p-6">
          <p className="text-sm text-[#9aa3b5]">
            This ticket is closed and cannot receive new replies.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
