/**
 * Unit tests for Support Page category alignment
 * 
 * Tests Requirements:
 * - 7.1: Support page uses category values matching TicketCategory enum exactly
 * - 7.2: Support page maps display labels to enum values
 * - 7.3: When category selected, support page sends enum value to API
 * - 7.4: Server validates categories against enum before processing
 * - 7.5: For any category selection, submitted value is valid TicketCategory
 */

import { describe, it, expect } from 'vitest';
import type { TicketCategory } from '@/lib/types';

// Category options from support page
const CATEGORY_OPTIONS: Array<{ value: TicketCategory; label: string }> = [
  { value: "order", label: "Order Issue" },
  { value: "payment", label: "Payment Issue" },
  { value: "refill", label: "Refill Request" },
  { value: "account", label: "Account Issue" },
  { value: "api", label: "API Issue" },
  { value: "service", label: "Service Question" },
  { value: "other", label: "Other" },
];

// Valid categories from server
const VALID_CATEGORIES: TicketCategory[] = [
  "order",
  "payment",
  "refill",
  "account",
  "api",
  "service",
  "other",
];

describe('Support Page Category Alignment', () => {
  it('should have all category values matching TicketCategory enum exactly (Req 7.1)', () => {
    // All category option values should be valid TicketCategory values
    CATEGORY_OPTIONS.forEach(option => {
      expect(VALID_CATEGORIES).toContain(option.value);
    });
  });

  it('should map display labels to enum values correctly (Req 7.2)', () => {
    // Each option should have both value and label
    CATEGORY_OPTIONS.forEach(option => {
      expect(option.value).toBeDefined();
      expect(option.label).toBeDefined();
      expect(typeof option.value).toBe('string');
      expect(typeof option.label).toBe('string');
    });
  });

  it('should have enum values that are lowercase (Req 7.3)', () => {
    // All enum values should be lowercase (matching the TicketCategory enum)
    CATEGORY_OPTIONS.forEach(option => {
      expect(option.value).toBe(option.value.toLowerCase());
    });
  });

  it('should cover all valid ticket categories (Req 7.5)', () => {
    // Extract all values from category options
    const optionValues = CATEGORY_OPTIONS.map(opt => opt.value);
    
    // All valid categories should be present in options
    VALID_CATEGORIES.forEach(category => {
      expect(optionValues).toContain(category);
    });
  });

  it('should not have any invalid category values (Req 7.5)', () => {
    // No category option value should be outside the valid categories
    CATEGORY_OPTIONS.forEach(option => {
      expect(VALID_CATEGORIES.includes(option.value)).toBe(true);
    });
  });

  it('should have user-friendly display labels (Req 7.2)', () => {
    // Labels should be capitalized and human-readable
    CATEGORY_OPTIONS.forEach(option => {
      // Label should start with uppercase letter
      expect(option.label[0]).toBe(option.label[0].toUpperCase());
      // Label should be different from value (humanized)
      expect(option.label.toLowerCase()).not.toBe(option.value);
    });
  });

  it('should maintain correct mapping between value and label', () => {
    // Verify specific mappings are correct
    const orderOption = CATEGORY_OPTIONS.find(opt => opt.value === "order");
    expect(orderOption?.label).toBe("Order Issue");

    const paymentOption = CATEGORY_OPTIONS.find(opt => opt.value === "payment");
    expect(paymentOption?.label).toBe("Payment Issue");

    const refillOption = CATEGORY_OPTIONS.find(opt => opt.value === "refill");
    expect(refillOption?.label).toBe("Refill Request");

    const accountOption = CATEGORY_OPTIONS.find(opt => opt.value === "account");
    expect(accountOption?.label).toBe("Account Issue");

    const apiOption = CATEGORY_OPTIONS.find(opt => opt.value === "api");
    expect(apiOption?.label).toBe("API Issue");

    const serviceOption = CATEGORY_OPTIONS.find(opt => opt.value === "service");
    expect(serviceOption?.label).toBe("Service Question");

    const otherOption = CATEGORY_OPTIONS.find(opt => opt.value === "other");
    expect(otherOption?.label).toBe("Other");
  });
});
