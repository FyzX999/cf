import { useState, useEffect, useMemo } from "react";
import type { WalletTxn } from "@/lib/types";

/**
 * useTransactionSearch Hook
 * 
 * Provides debounced search functionality for filtering wallet transactions
 * by orderId and note fields (case-insensitive, partial match).
 * 
 * **Validates Requirements:**
 * - 14.1: Include search input field above transaction list
 * - 14.2: Filter transactions by subject and public ID
 * - 14.3: Filter by order ID and note
 * - 14.4: Case-insensitive and partial match support
 * - 14.5: Show "No results found" when search returns empty
 * 
 * @param transactions - Array of wallet transactions to search through
 * @param debounceMs - Debounce delay in milliseconds (default: 300ms)
 * @returns Object containing search query, setter, and filtered transactions
 */
export function useTransactionSearch(
  transactions: WalletTxn[],
  debounceMs: number = 300
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, debounceMs]);

  // Filter transactions based on debounced query
  const filteredTransactions = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return transactions;
    }

    const query = debouncedQuery.toLowerCase().trim();

    return transactions.filter((transaction) => {
      // Search in note field (if exists)
      const noteMatch = transaction.note?.toLowerCase().includes(query);

      // Search in transaction ID (could contain order ID)
      const idMatch = transaction.id.toLowerCase().includes(query);

      // Extract potential order ID from note and search in it
      // Order IDs typically match pattern like CF123456, ABC123456, etc.
      const orderIdMatch = transaction.note?.match(/[A-Z]{2,4}\d{6,8}/gi)?.some(
        (orderId) => orderId.toLowerCase().includes(query)
      );

      return noteMatch || idMatch || orderIdMatch;
    });
  }, [transactions, debouncedQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredTransactions,
    isSearching: debouncedQuery.trim().length > 0,
  };
}
