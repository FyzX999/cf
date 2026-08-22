/**
 * Unit tests for ticket validation logic
 * 
 * Tests Requirements 2.1, 2.2, 2.3, 2.4, 2.5:
 * - Distinct error messages for subject and body validation
 * - Non-repetitive error messages
 * - Clear field identification in errors
 */

import { describe, it, expect } from "vitest";
import { validateTicketInput } from "./tickets";
import type { CreateTicketInput } from "./types";

describe("validateTicketInput", () => {
  // Requirement 2.1, 2.2: Single error for missing subject
  it("should return single 'Subject is required' error when subject is empty", () => {
    const input: CreateTicketInput = {
      userId: "user-123",
      category: "order",
      subject: "",
      body: "Valid body content",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors).toContain("Subject is required");
  });

  it("should return single 'Subject is required' error when subject is whitespace only", () => {
    const input: CreateTicketInput = {
      userId: "user-123",
      category: "order",
      subject: "   ",
      body: "Valid body content",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors).toContain("Subject is required");
  });

  // Requirement 2.1, 2.3: Single error for missing body
  it("should return single 'Message body is required' error when body is empty", () => {
    const input: CreateTicketInput = {
      userId: "user-123",
      category: "order",
      subject: "Valid subject",
      body: "",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors).toContain("Message body is required");
  });

  it("should return single 'Message body is required' error when body is whitespace only", () => {
    const input: CreateTicketInput = {
      userId: "user-123",
      category: "order",
      subject: "Valid subject",
      body: "   ",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors).toContain("Message body is required");
  });

  // Requirement 2.4, 2.5: Two distinct errors when both subject and body are empty
  it("should return two distinct errors when both subject and body are empty", () => {
    const input: CreateTicketInput = {
      userId: "user-123",
      category: "order",
      subject: "",
      body: "",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain("Subject is required");
    expect(result.errors).toContain("Message body is required");
    // Ensure errors are distinct
    expect(result.errors[0]).not.toBe(result.errors[1]);
  });

  // Requirement 2.5: Specific error for body exceeding max length
  it("should return specific error when body exceeds 5000 characters", () => {
    const longBody = "a".repeat(5001);
    const input: CreateTicketInput = {
      userId: "user-123",
      category: "order",
      subject: "Valid subject",
      body: longBody,
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors).toContain("Message body cannot exceed 5000 characters");
  });

  // Test category validation
  it("should return error when category is missing", () => {
    const input: CreateTicketInput = {
      userId: "user-123",
      category: "" as any,
      subject: "Valid subject",
      body: "Valid body",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Category"))).toBe(true);
  });

  it("should return error when category is invalid", () => {
    const input: CreateTicketInput = {
      userId: "user-123",
      category: "invalid-category" as any,
      subject: "Valid subject",
      body: "Valid body",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Invalid category"))).toBe(true);
  });

  // Test authentication validation
  it("should return error when neither userId nor guestEmail is provided", () => {
    const input: CreateTicketInput = {
      category: "order",
      subject: "Valid subject",
      body: "Valid body",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("userId or guestEmail"))).toBe(true);
  });

  // Test valid inputs
  it("should return valid for authenticated user with all required fields", () => {
    const input: CreateTicketInput = {
      userId: "user-123",
      category: "order",
      subject: "Valid subject",
      body: "Valid body content",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return valid for guest user with email and all required fields", () => {
    const input: CreateTicketInput = {
      guestEmail: "guest@example.com",
      category: "payment",
      subject: "Valid subject",
      body: "Valid body content",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return valid for ticket with optional orderId", () => {
    const input: CreateTicketInput = {
      userId: "user-123",
      category: "order",
      subject: "Valid subject",
      body: "Valid body content",
      orderId: "CF123456",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Test multiple validation errors combined
  it("should return all applicable errors when multiple fields are invalid", () => {
    const input: CreateTicketInput = {
      category: "invalid" as any,
      subject: "",
      body: "",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
    expect(result.errors).toContain("Subject is required");
    expect(result.errors).toContain("Message body is required");
    expect(result.errors.some(e => e.includes("Invalid category"))).toBe(true);
    expect(result.errors.some(e => e.includes("userId or guestEmail"))).toBe(true);
  });

  // Test that errors are distinct (no duplicates)
  it("should not return duplicate error messages", () => {
    const input: CreateTicketInput = {
      category: "order",
      subject: "",
      body: "",
      userId: "user-123",
    };

    const result = validateTicketInput(input);

    const uniqueErrors = new Set(result.errors);
    expect(uniqueErrors.size).toBe(result.errors.length);
  });

  // Requirement 3.3, 3.4: Email format validation for guest users
  it("should return error when guestEmail has invalid format", () => {
    const input: CreateTicketInput = {
      guestEmail: "invalid-email",
      category: "order",
      subject: "Valid subject",
      body: "Valid body",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("valid email address"))).toBe(true);
  });

  it("should return error when guestEmail is missing @ symbol", () => {
    const input: CreateTicketInput = {
      guestEmail: "invalidemail.com",
      category: "order",
      subject: "Valid subject",
      body: "Valid body",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("valid email address"))).toBe(true);
  });

  it("should return error when guestEmail is missing domain", () => {
    const input: CreateTicketInput = {
      guestEmail: "test@",
      category: "order",
      subject: "Valid subject",
      body: "Valid body",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("valid email address"))).toBe(true);
  });

  it("should accept valid email formats for guestEmail", () => {
    const validEmails = [
      "test@example.com",
      "user.name@example.com",
      "user+tag@example.co.uk",
      "test123@test-domain.com",
    ];

    validEmails.forEach(email => {
      const input: CreateTicketInput = {
        guestEmail: email,
        category: "order",
        subject: "Valid subject",
        body: "Valid body",
      };

      const result = validateTicketInput(input);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  it("should trim whitespace from guestEmail before validation", () => {
    const input: CreateTicketInput = {
      guestEmail: "  test@example.com  ",
      category: "order",
      subject: "Valid subject",
      body: "Valid body",
    };

    const result = validateTicketInput(input);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
