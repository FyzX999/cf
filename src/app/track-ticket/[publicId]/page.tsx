"use client";

import type { Ticket, TicketMessage, TicketStatus } from "@/lib/types";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export default function TrackTicketPage() {
  const params = useParams();
  const publicId = (params.publicId as string)?.toUpperCase();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reply form state
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState(false);

  // Load ticket and messages
  useEffect(() => {
    async function loadTicket() {
      if (!publicId) {
        setError("No ticket ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`/api/tickets/public/${publicId}`, { cache: "no-store" });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load ticket");
        }

        setTicket(json.ticket);
        setMessages(json.messages || []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load ticket");
      } finally {
        setLoading(false);
      }
    }

    loadTicket();
  }, [publicId]);

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
      setReplySuccess(false);

      const res = await fetch(`/api/tickets/public/${publicId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to submit reply");
      }

      // Update ticket and messages
      setTicket(json.ticket);
      setMessages(json.messages || []);
      setReplyBody("");
      setReplySuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setReplySuccess(false), 3000);
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
      customer: "You",
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
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="glass p-8 text-center">
          <p className="text-[#9aa3b5]">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="glass border-l-4 border-[#f07167] p-6">
          <h1 className="text-xl font-semibold text-[#f07167]">Ticket Not Found</h1>
          <p className="mt-2 text-sm text-[#9aa3b5]">{error || "The ticket you're looking for doesn't exist."}</p>
          <div className="mt-6">
            <Link href="/support" className="text-[#6ea8ff] hover:underline">
              ← Back to support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link href="/support" className="text-sm text-[#6ea8ff] hover:underline">
          ← Back to support
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Track Your Ticket</h1>
        <p className="mt-2 text-[#9aa3b5]">
          Use this page to view updates and reply to your support ticket.
        </p>
      </div>

      {/* Ticket Information Card */}
      <div className="glass mb-6 p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{sanitizeTicketSubject(ticket.subject)}</h2>
            <p className="mt-1 font-mono text-sm text-[#9aa3b5]">Ticket ID: {ticket.publicId}</p>
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
                href={`/track/${ticket.orderId}`}
                className="font-mono text-[#6ea8ff] hover:underline"
              >
                {ticket.orderId}
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
          
          {replySuccess && (
            <div className="mb-4 rounded-lg border border-[#3ddc97] bg-[#3ddc97]/10 p-3 text-sm text-[#3ddc97]">
              Your reply has been sent successfully!
            </div>
          )}

          <form onSubmit={handleReply}>
            {replyError && (
              <div className="mb-4 rounded-lg border border-[#f07167] bg-[#f07167]/10 p-3 text-sm text-[#f07167]">
                {replyError}
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

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Reply"}
            </button>
          </form>

          <div className="mt-4 rounded-lg border border-[#6ea8ff]/20 bg-[#6ea8ff]/5 p-3 text-xs text-[#9aa3b5]">
            <p className="font-semibold text-[#6ea8ff]">💡 Tip</p>
            <p className="mt-1">
              Save this page's URL to track your ticket anytime. You'll receive email notifications when our support team replies.
            </p>
          </div>
        </div>
      ) : (
        <div className="glass border-l-4 border-[#9aa3b5] p-6">
          <p className="text-sm text-[#9aa3b5]">
            This ticket is closed and cannot receive new replies. If you need further assistance, please create a new ticket.
          </p>
          <Link
            href="/support"
            className="mt-4 inline-block text-[#6ea8ff] hover:underline"
          >
            Create a new ticket →
          </Link>
        </div>
      )}
    </div>
  );
}
