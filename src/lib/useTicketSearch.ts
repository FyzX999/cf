/**
 * Ticket Search Hook
 * 
 * Provides debounced search functionality for filtering tickets by subject and publicId.
 * Supports case-insensitive partial matching with configurable debounce delay.
 * 
 * **Validates Requirements:**
 * - 14.1: Include search input field above ticket list
 * - 14.2: Filter tickets by subject and public ID
 * - 14.3: Search is case-insensitive and supports partial matches
 * - 14.4: Show "No results found" message when search returns empty
 * - 14.5: Preserve other filters when searching
 */

import { useState, useEffect, useMemo } from "react";
import type { Ticket } from "@/lib/types";

export interface TicketSearchState {
  /** Current search query */
  query: string;
  /** Debounced search query (delayed by 300ms) */
  debouncedQuery: string;
  /** Whether debounce is in progress */
  isDebouncing: boolean;
  /** Filtered tickets based on debounced query */
  filteredTickets: Ticket[];
  /** Whether search returned no results */
  hasNoResults: boolean;
}

/**
 * Filter tickets by search query
 * 
 * Performs case-insensitive partial matching on:
 * - Ticket subject
 * - Ticket publicId (with or without # prefix)
 * 
 * **Requirement 14.2, 14.3**
 * 
 * @param tickets - Array of tickets to filter
 * @param query - Search query string
 * @returns Filtered array of tickets matching the query
 */
export function filterTicketsByQuery(tickets: Ticket[], query: string): Ticket[] {
  if (!query.trim()) {
    return tickets;
  }

  const normalizedQuery = query.trim().toLowerCase();
  
  return tickets.filter((ticket) => {
    // Search in subject (case-insensitive)
    const subjectMatch = ticket.subject.toLowerCase().includes(normalizedQuery);
    
    // Search in publicId (case-insensitive, with or without # prefix)
    const publicIdMatch = ticket.publicId.toLowerCase().includes(normalizedQuery);
    const publicIdWithHashMatch = `#${ticket.publicId}`.toLowerCase().includes(normalizedQuery);
    
    return subjectMatch || publicIdMatch || publicIdWithHashMatch;
  });
}

/**
 * Hook for managing ticket search with debouncing
 * 
 * Provides a 300ms debounce delay to avoid excessive filtering while typing.
 * Returns both the immediate query (for input field) and debounced query (for filtering).
 * 
 * **Usage Example:**
 * ```tsx
 * const { query, debouncedQuery, isDebouncing, filteredTickets, hasNoResults } = 
 *   useTicketSearch(tickets);
 * 
 * <input 
 *   value={query} 
 *   onChange={(e) => setSearchQuery(e.target.value)}
 *   placeholder="Search tickets..."
 * />
 * 
 * {hasNoResults && <p>No results found</p>}
 * ```
 * 
 * @param tickets - Array of tickets to search through
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns Search state with query, filtered tickets, and helper flags
 */
export function useTicketSearch(
  tickets: Ticket[],
  debounceMs: number = 300
): TicketSearchState & { setSearchQuery: (query: string) => void } {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Debounce the search query (Requirement 14.1 - 300ms delay)
  useEffect(() => {
    // If query is empty, update immediately without debounce
    if (!query.trim()) {
      setDebouncedQuery("");
      setIsDebouncing(false);
      return;
    }

    // Set debouncing flag
    setIsDebouncing(true);

    // Debounce timer
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsDebouncing(false);
    }, debounceMs);

    // Cleanup timer on query change or unmount
    return () => {
      clearTimeout(timer);
    };
  }, [query, debounceMs]);

  // Filter tickets based on debounced query (Requirements 14.2, 14.3)
  const filteredTickets = useMemo(() => {
    return filterTicketsByQuery(tickets, debouncedQuery);
  }, [tickets, debouncedQuery]);

  // Check if search returned no results (Requirement 14.4)
  const hasNoResults = useMemo(() => {
    return debouncedQuery.trim() !== "" && filteredTickets.length === 0;
  }, [debouncedQuery, filteredTickets]);

  return {
    query,
    debouncedQuery,
    isDebouncing,
    filteredTickets,
    hasNoResults,
    setSearchQuery: setQuery,
  };
}

/**
 * Helper to highlight search matches in text
 * 
 * This can be used to visually highlight matching parts of ticket subjects
 * or publicIds in the UI.
 * 
 * @param text - Text to search within
 * @param query - Search query to highlight
 * @returns Object with parts array for rendering highlighted text
 */
export function highlightSearchMatch(
  text: string,
  query: string
): { parts: Array<{ text: string; isMatch: boolean }> } {
  if (!query.trim()) {
    return { parts: [{ text, isMatch: false }] };
  }

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedText = text.toLowerCase();
  const index = normalizedText.indexOf(normalizedQuery);

  if (index === -1) {
    return { parts: [{ text, isMatch: false }] };
  }

  const parts = [
    { text: text.slice(0, index), isMatch: false },
    { text: text.slice(index, index + query.length), isMatch: true },
    { text: text.slice(index + query.length), isMatch: false },
  ].filter((part) => part.text.length > 0);

  return { parts };
}
