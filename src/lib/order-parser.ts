/**
 * Order ID parsing utilities
 * 
 * Extracted from commerce.ts to avoid fs/promises imports in client bundles
 */

import type { OrderIdParseResult } from "./types";

/**
 * Parse order ID from a string (e.g., transaction note)
 * 
 * Task 3.1: Flexible order ID parser
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * Supports various order ID formats:
 * - CF123456 (standard format)
 * - TKT987654 (ticket format)
 * - ORD555555 (order format)
 * - Any 2-4 letter prefix + 6-8 digits
 * 
 * Features:
 * - Case-insensitive matching
 * - Extracts from sentences: "Refund for order CF123456"
 * - Returns null instead of throwing errors
 * 
 * @param note - String to parse (e.g., "Order CF123456 received")
 * @returns Parsed order ID or null if no match found
 */
export function parseOrderId(note: string): OrderIdParseResult | null {
  if (!note) return null;
  
  // Pattern: 2-4 uppercase letters followed by 6-8 digits
  // Case-insensitive matching with word boundaries
  const pattern = /\b([A-Z]{2,4})(\d{6,8})\b/i;
  const match = note.match(pattern);
  
  if (!match) return null;
  
  return {
    prefix: match[1].toUpperCase(),
    number: parseInt(match[2], 10),
    fullId: match[1].toUpperCase() + match[2],
  };
}
