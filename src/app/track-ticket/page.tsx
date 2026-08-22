"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TrackTicketLandingPage() {
  const router = useRouter();
  const [ticketId, setTicketId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = ticketId.trim().toUpperCase();
    if (id) {
      router.push(`/track-ticket/${id}`);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Track Your Ticket</h1>
        <p className="muted mt-3 text-base">
          Enter your ticket ID to view updates and reply to your support ticket.
        </p>
      </div>

      <div className="glass mt-8 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ticketId" className="mb-2 block text-sm text-[#9aa3b5]">
              Ticket ID
            </label>
            <input
              type="text"
              id="ticketId"
              className="field w-full"
              placeholder="e.g., TKT123456"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              required
              pattern="TKT\d{6}"
              title="Ticket ID should be in format TKT123456"
            />
            <p className="mt-2 text-xs text-[#9aa3b5]">
              Your ticket ID was sent to your email when you created the ticket.
            </p>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={!ticketId.trim()}>
            Track Ticket
          </button>
        </form>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-[#9aa3b5]">
          Don't have a ticket yet?{" "}
          <a href="/support" className="text-[#6ea8ff] hover:underline">
            Create a support ticket
          </a>
        </p>
      </div>
    </div>
  );
}
