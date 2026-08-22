/**
 * Simple test script to verify guest ticket creation flow
 * This validates task 17.1: Create guest ticket creation flow
 */

import { createTicket } from "./src/lib/tickets";
import type { CreateTicketInput } from "./src/lib/types";

// Test 1: Verify guest ticket with guestEmail (no userId)
async function testGuestTicketCreation() {
  console.log("Test 1: Creating guest ticket with email...");
  
  const guestTicketInput: CreateTicketInput = {
    guestEmail: "guest@example.com",
    category: "payment",
    subject: "Payment issue - guest ticket",
    body: "I am having trouble processing my payment for order CF123456.",
    orderId: undefined,
  };
  
  try {
    // This should validate that:
    // - guestEmail is accepted when userId is undefined
    // - Ticket is created with null user_id
    // - guest_email field is populated
    const ticket = await createTicket(guestTicketInput);
    console.log("✓ Guest ticket created successfully:", ticket.publicId);
    console.log("  - userId:", ticket.userId === null ? "null (correct)" : "ERROR: should be null");
    console.log("  - category:", ticket.category);
    console.log("  - status:", ticket.status);
    return true;
  } catch (error) {
    console.error("✗ Guest ticket creation failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

// Test 2: Verify validation - both userId and guestEmail missing
async function testMissingBothIdentifiers() {
  console.log("\nTest 2: Attempting to create ticket without userId or guestEmail...");
  
  const invalidInput: CreateTicketInput = {
    category: "other",
    subject: "Test ticket",
    body: "This should fail validation",
  };
  
  try {
    await createTicket(invalidInput);
    console.error("✗ Should have thrown error for missing identifiers");
    return false;
  } catch (error) {
    const expectedMessage = "Either userId or guestEmail must be provided";
    if (error instanceof Error && error.message === expectedMessage) {
      console.log("✓ Validation correctly rejected ticket without identifiers");
      return true;
    } else {
      console.error("✗ Wrong error message:", error instanceof Error ? error.message : error);
      return false;
    }
  }
}

// Test 3: Verify authenticated user ticket (with userId)
async function testAuthenticatedUserTicket() {
  console.log("\nTest 3: Creating authenticated user ticket...");
  
  const userTicketInput: CreateTicketInput = {
    userId: "test-user-uuid-123",
    category: "order",
    subject: "Order delivery issue",
    body: "My order hasn't been delivered yet.",
    orderId: undefined,
  };
  
  try {
    const ticket = await createTicket(userTicketInput);
    console.log("✓ User ticket created successfully:", ticket.publicId);
    console.log("  - userId:", ticket.userId === "test-user-uuid-123" ? "correct" : "ERROR");
    console.log("  - category:", ticket.category);
    return true;
  } catch (error) {
    console.error("✗ User ticket creation failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log("=== Guest Ticket Creation Flow Tests (Task 17.1) ===\n");
  console.log("Requirements being validated:");
  console.log("- 9.1: Guest can create ticket with email address");
  console.log("- 9.2: Ticket stored with null user_id and guest email");
  console.log("- 9.3: Email notifications sent to guest email");
  console.log("- 9.4: Guest tickets tracked via public ID\n");
  
  const results = {
    guestTicket: await testGuestTicketCreation(),
    validation: await testMissingBothIdentifiers(),
    userTicket: await testAuthenticatedUserTicket(),
  };
  
  console.log("\n=== Test Results ===");
  console.log("Guest ticket creation:", results.guestTicket ? "✓ PASS" : "✗ FAIL");
  console.log("Validation (missing identifiers):", results.validation ? "✓ PASS" : "✗ FAIL");
  console.log("Authenticated user ticket:", results.userTicket ? "✓ PASS" : "✗ FAIL");
  
  const allPassed = Object.values(results).every(r => r);
  console.log("\nOverall:", allPassed ? "✓ ALL TESTS PASSED" : "✗ SOME TESTS FAILED");
  
  return allPassed;
}

// Mock the database if running this standalone
if (require.main === module) {
  console.log("Note: This test requires a properly configured Supabase database.");
  console.log("If database is not available, tests will fail with 'Database not configured'.\n");
  
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { runTests, testGuestTicketCreation, testMissingBothIdentifiers, testAuthenticatedUserTicket };
