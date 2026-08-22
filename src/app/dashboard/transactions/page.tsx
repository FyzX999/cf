"use client";

import { DashboardShell } from "@/components/DashboardShell";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { money } from "@/lib/format";
import { parseOrderId } from "@/lib/commerce";
import type { WalletTxn } from "@/lib/types";
import { useEffect, useState } from "react";

const TRANSACTION_TYPES = ["all", "deposit", "order", "giftcard", "promo", "refund"] as const;
type TransactionTypeFilter = typeof TRANSACTION_TYPES[number];

/**
 * TransactionsPage Component
 * 
 * Displays wallet transaction history with loading states and error handling.
 * 
 * **Validates Requirements:**
 * - 10.1: Display loading spinner when transactions are being fetched
 * - 10.2: Disable filter controls while loading
 * - 10.3: Hide spinner and show transaction list when loading completes
 * - 10.4: Show error message with retry button on failure
 */
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");

  async function load() {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/wallet", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load transactions");
      }
      const json = await res.json();
      setTransactions(json.transactions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredTransactions = typeFilter === "all" 
    ? transactions 
    : transactions.filter(t => t.type === typeFilter);

  const getTypeBadgeColor = (type: WalletTxn["type"]) => {
    switch (type) {
      case "refund":
        return "bg-[#3ddc97]/10 text-[#3ddc97] border-[#3ddc97]/20";
      case "deposit":
        return "bg-[#6ea8ff]/10 text-[#6ea8ff] border-[#6ea8ff]/20";
      case "order":
        return "bg-[#ff6b6b]/10 text-[#ff6b6b] border-[#ff6b6b]/20";
      case "giftcard":
        return "bg-[#ffd93d]/10 text-[#ffd93d] border-[#ffd93d]/20";
      case "promo":
        return "bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/20";
      default:
        return "bg-white/5 text-[#9aa3b5] border-white/8";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Extract order ID from refund transaction notes for better display
  const extractOrderId = (note: string | undefined): string | null => {
    if (!note) return null;
    const result = parseOrderId(note);
    return result ? result.fullId : null;
  };

  // Format note for display - show order ID prominently for refunds
  const formatNote = (transaction: WalletTxn): React.ReactNode => {
    if (transaction.type === "refund") {
      const orderId = extractOrderId(transaction.note);
      if (orderId) {
        return (
          <span>
            Refund for order{" "}
            <a
              href={`/dashboard/orders?id=${orderId}`}
              className="font-mono text-[#6ea8ff] hover:underline"
            >
              {orderId}
            </a>
          </span>
        );
      }
    }
    return transaction.note || "—";
  };

  return (
    <DashboardShell title="Transactions">
      {/* Filter Buttons - Disabled while loading (Requirement 10.2) */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TRANSACTION_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            disabled={isLoading}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              typeFilter === type
                ? "bg-[#6ea8ff] text-white"
                : "bg-white/5 text-[#9aa3b5] hover:bg-white/10"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Error State - Show error message with retry button (Requirement 10.4) */}
      {error && (
        <div className="glass mb-4 border-l-4 border-[#f07167] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#f07167]">Failed to load transactions</p>
              <p className="text-sm text-[#f07167] mt-1">{error}</p>
            </div>
            <button
              onClick={() => load()}
              className="btn btn-ghost text-xs px-3 py-1"
              disabled={isLoading}
            >
              {isLoading ? "Retrying..." : "Retry"}
            </button>
          </div>
        </div>
      )}

      {/* Loading State (Requirements 10.1, 10.3) */}
      {isLoading && <LoadingSpinner message="Loading transactions..." />}

      {/* Transaction List */}
      {!isLoading && !error && (
        filteredTransactions.length === 0 ? (
          <EmptyState
            type="transactions"
            title={typeFilter === "all" ? "No Transactions Yet" : `No ${typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)} Transactions`}
            description={
              typeFilter === "all"
                ? "Your transaction history will appear here once you make deposits or purchases."
                : `No ${typeFilter} transactions found. Try selecting a different filter.`
            }
          />
        ) : (
        <div className="glass overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[#9aa3b5]">
              <tr>
                {["Type", "Method", "Amount", "Note", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="border-t border-white/8">
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-md border px-2 py-1 text-xs font-medium ${getTypeBadgeColor(t.type)}`}>
                      {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[#9aa3b5]">{t.method}</td>
                  <td className="px-4 py-3 font-semibold">
                    <span className={t.type === "order" ? "text-[#ff6b6b]" : "text-[#3ddc97]"}>
                      {t.type === "order" ? "-" : "+"}{money(Math.abs(t.amount))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#9aa3b5]">{formatNote(t)}</td>
                  <td className="px-4 py-3 text-[#9aa3b5]">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      )}
    </DashboardShell>
  );
}
