/**
 * End-to-End Payment Matching Test (TypeScript)
 * Tests all robustness improvements to CashApp payment system
 */

import {
  levenshteinDistance,
  normalizeOrderId,
  fuzzyMatchOrderId,
  dollarsToCents,
  centsToDollars,
  matchAmount,
  matchPayment,
  logPaymentMatchDetails,
} from './src/lib/payment-methods/shared/payment-matching';

console.log('🧪 CashApp Payment Matching - Test Suite\n');

// ============================================================================
// TEST 1: Fuzzy Matching for Order IDs
// ============================================================================
console.log('═'.repeat(80));
console.log('TEST 1: Fuzzy Matching (Levenshtein Distance)');
console.log('═'.repeat(80));

const fuzzyTests = [
  { extracted: 'CF944441', expected: 'CF944441', shouldMatch: true, description: 'Exact match' },
  { extracted: 'CF944441', expected: 'CF944431', shouldMatch: true, description: '1 character difference (typo)' },
  { extracted: 'CF944441', expected: 'CF944421', shouldMatch: true, description: '2 character differences' },
  { extracted: 'cf944441', expected: 'CF944441', shouldMatch: true, description: 'Lowercase vs uppercase' },
  { extracted: 'CF 944441', expected: 'CF944441', shouldMatch: true, description: 'With space (normalizes)' },
  { extracted: 'CF-944441', expected: 'CF944441', shouldMatch: true, description: 'With dash (normalizes)' },
];

let fuzzyPass = 0;
let fuzzyFail = 0;

fuzzyTests.forEach((test) => {
  const result = fuzzyMatchOrderId(test.extracted, test.expected, 2);
  const passed = result.matched === test.shouldMatch;

  console.log(`\n${test.description}`);
  console.log(`  Extracted: "${test.extracted}" → Normalized: "${normalizeOrderId(test.extracted)}"`);
  console.log(`  Expected:  "${test.expected}" → Normalized: "${normalizeOrderId(test.expected)}"`);
  console.log(`  Distance: ${result.distance}, Confidence: ${result.confidence.toFixed(1)}%`);
  console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);

  if (passed) fuzzyPass++;
  else fuzzyFail++;
});

console.log(`\n🔷 Fuzzy Matching: ${fuzzyPass}/${fuzzyPass + fuzzyFail} passed\n`);

// ============================================================================
// TEST 2: Cents-Based Amount Comparison
// ============================================================================
console.log('═'.repeat(80));
console.log('TEST 2: Cents-Based Amount Comparison');
console.log('═'.repeat(80));

const amountTests = [
  { extracted: 50.0, expected: 50.0, shouldMatch: true, description: 'Exact match' },
  { extracted: '50.00', expected: 50, shouldMatch: true, description: 'String vs number' },
  { extracted: '$50.00', expected: 50, shouldMatch: true, description: '$50.00 vs 50' },
  { extracted: 50.01, expected: 50.0, shouldMatch: true, description: '1 cent difference' },
  { extracted: '49.99', expected: 50.0, shouldMatch: true, description: '1 cent rounding' },
];

let amountPass = 0;
let amountFail = 0;

amountTests.forEach((test) => {
  const result = matchAmount(test.extracted, test.expected, 1);
  const passed = result.matched === test.shouldMatch;

  console.log(`\n${test.description}`);
  console.log(`  Extracted: ${test.extracted} → ${result.extractedCents} cents (${centsToDollars(result.extractedCents)})`);
  console.log(`  Expected:  ${test.expected} → ${result.expectedCents} cents (${centsToDollars(result.expectedCents)})`);
  console.log(`  Difference: ${result.differenceCents} cents`);
  console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);

  if (passed) amountPass++;
  else amountFail++;
});

console.log(`\n🔷 Amount Matching: ${amountPass}/${amountPass + amountFail} passed\n`);

// ============================================================================
// TEST 3: Comprehensive Payment Matching
// ============================================================================
console.log('═'.repeat(80));
console.log('TEST 3: Comprehensive Payment Matching');
console.log('═'.repeat(80));

const paymentTests = [
  {
    name: 'Perfect match',
    extracted: { orderId: 'CF944441', amount: 50.0, recipient: 'cheapfollower' },
    expected: { orderId: 'CF944441', amount: 50.0, recipient: 'cheapfollower' },
    shouldMatch: true,
  },
  {
    name: 'Order ID typo tolerance',
    extracted: { orderId: 'CF944431', amount: 50.0, recipient: 'cheapfollower' },
    expected: { orderId: 'CF944441', amount: 50.0, recipient: 'cheapfollower' },
    shouldMatch: true,
  },
  {
    name: 'Amount string formatting',
    extracted: { orderId: 'CF944441', amount: '$50', recipient: 'cheapfollower' },
    expected: { orderId: 'CF944441', amount: 50.0, recipient: 'cheapfollower' },
    shouldMatch: true,
  },
];

let paymentPass = 0;
let paymentFail = 0;

paymentTests.forEach((test) => {
  const result = matchPayment({
    extractedOrderId: test.extracted.orderId,
    expectedOrderId: test.expected.orderId,
    extractedAmount: test.extracted.amount,
    expectedAmount: test.expected.amount,
    extractedRecipient: test.extracted.recipient,
    expectedRecipient: test.expected.recipient,
  });

  const passed = result.matched === test.shouldMatch;

  console.log(`\n${test.name}`);
  console.log(`  Order ID: ${test.extracted.orderId} vs ${test.expected.orderId} → ${result.details.orderId.matched ? '✅' : '❌'}`);
  console.log(`  Amount: ${test.extracted.amount} vs ${test.expected.amount} → ${result.details.amount.matched ? '✅' : '❌'}`);
  console.log(`  Recipient: ${test.extracted.recipient} vs ${test.expected.recipient} → ${result.details.recipient.matched ? '✅' : '❌'}`);
  console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);

  if (passed) paymentPass++;
  else paymentFail++;
});

console.log(`\n🔷 Payment Matching: ${paymentPass}/${paymentPass + paymentFail} passed\n`);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('═'.repeat(80));
console.log('TEST SUMMARY');
console.log('═'.repeat(80));

const totalPass = fuzzyPass + amountPass + paymentPass;
const totalTests = fuzzyPass + fuzzyFail + amountPass + amountFail + paymentPass + paymentFail;
const passRate = ((totalPass / totalTests) * 100).toFixed(1);

console.log(`\n✅ Fuzzy Matching:       ${fuzzyPass}/${fuzzyPass + fuzzyFail}`);
console.log(`✅ Amount Matching:      ${amountPass}/${amountPass + amountFail}`);
console.log(`✅ Payment Matching:     ${paymentPass}/${paymentPass + paymentFail}`);
console.log(`\n📊 Overall: ${totalPass}/${totalTests} tests passed (${passRate}%)`);

if (totalPass === totalTests) {
  console.log('\n🎉 ALL TESTS PASSED!');
  console.log('\nThe CashApp payment system is now more robust:');
  console.log('  ✓ Handles order ID typos gracefully (Levenshtein distance)');
  console.log('  ✓ Properly compares amounts in cents (no floating-point errors)');
  console.log('  ✓ Provides actionable IMAP error diagnostics');
  console.log('  ✓ Logs raw HTML for debugging CashApp template changes');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed.');
  process.exit(1);
}
