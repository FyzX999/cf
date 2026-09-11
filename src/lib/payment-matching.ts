/**
 * Payment Matching Utilities
 * Robust matching logic for CashApp payments with fuzzy matching and cent-based amounts
 */

/**
 * Levenshtein distance - measures difference between two strings
 * Used for fuzzy matching of order IDs (e.g., "CF944441" vs "CF944441" = 0, vs "CF944431" = 1)
 * Returns: 0 = exact match, 1-2 = likely typo, 3+ = different
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Normalize order ID for comparison
 * - Uppercase
 * - Remove whitespace
 * - Remove special characters except letters and numbers
 */
export function normalizeOrderId(id: string): string {
  return id
    .toUpperCase()
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/[^A-Z0-9]/g, ''); // Keep only alphanumerics
}

/**
 * Fuzzy match order IDs with configurable tolerance
 * Returns: { matched: boolean, distance: number, confidence: number }
 */
export function fuzzyMatchOrderId(
  extractedId: string,
  expectedId: string,
  maxDistance: number = 2
): { matched: boolean; distance: number; confidence: number } {
  const normalized1 = normalizeOrderId(extractedId);
  const normalized2 = normalizeOrderId(expectedId);

  // If normalized strings are different lengths by more than 1, fail
  if (Math.abs(normalized1.length - normalized2.length) > 1) {
    return {
      matched: false,
      distance: 999,
      confidence: 0,
    };
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLen = Math.max(normalized1.length, normalized2.length);
  const confidence = ((maxLen - distance) / maxLen) * 100; // 0-100%

  return {
    matched: distance <= maxDistance,
    distance,
    confidence,
  };
}

/**
 * Convert dollar amount to cents (integer)
 * Examples: "50.00" → 5000, "$50" → 5000, "50" → 5000
 * Never uses floating-point for financial calculations
 */
export function dollarsToCents(amount: number | string): number {
  let numAmount = typeof amount === 'string' 
    ? parseFloat(amount.replace(/[$,]/g, '').trim())
    : amount;

  if (!Number.isFinite(numAmount)) {
    throw new Error(`Invalid amount: ${amount}`);
  }

  // Convert to cents, round to nearest cent
  const cents = Math.round(numAmount * 100);

  if (cents < 0 || cents > 999_999_999) {
    throw new Error(`Amount out of valid range: ${amount}`);
  }

  return cents;
}

/**
 * Convert cents to dollar string for display
 * Examples: 5000 → "$50.00", 1 → "$0.01"
 */
export function centsToDollars(cents: number): string {
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
}

/**
 * Match payment amount with tolerance
 * Returns: { matched: boolean, expectedCents: number, extractedCents: number, differenceCents: number }
 */
export function matchAmount(
  extractedAmount: number | string,
  expectedAmount: number | string,
  toleranceCents: number = 1 // Allow 1 cent difference (rounding)
): {
  matched: boolean;
  expectedCents: number;
  extractedCents: number;
  differenceCents: number;
} {
  let extractedCents: number;
  let expectedCents: number;

  try {
    extractedCents = dollarsToCents(extractedAmount);
    expectedCents = dollarsToCents(expectedAmount);
  } catch (error) {
    console.error('[Payment Matching] Amount conversion error:', error);
    return {
      matched: false,
      expectedCents: 0,
      extractedCents: 0,
      differenceCents: 999_999_999,
    };
  }

  const differenceCents = Math.abs(extractedCents - expectedCents);

  return {
    matched: differenceCents <= toleranceCents,
    expectedCents,
    extractedCents,
    differenceCents,
  };
}

/**
 * Comprehensive payment matching with detailed logging
 * Returns: { matched: boolean, details: { ... } }
 */
export function matchPayment(options: {
  extractedOrderId: string;
  expectedOrderId: string;
  extractedAmount: number | string;
  expectedAmount: number | string;
  extractedRecipient: string;
  expectedRecipient: string;
  orderIdMaxDistance?: number; // Levenshtein distance tolerance
  amountToleranceCents?: number;
}): {
  matched: boolean;
  details: {
    orderId: {
      matched: boolean;
      distance: number;
      confidence: number;
      extracted: string;
      expected: string;
    };
    amount: {
      matched: boolean;
      expectedCents: number;
      extractedCents: number;
      differenceCents: number;
      extracted: string;
      expected: string;
    };
    recipient: {
      matched: boolean;
      extracted: string;
      expected: string;
    };
    overallMatch: boolean;
  };
} {
  const orderIdMatch = fuzzyMatchOrderId(
    options.extractedOrderId,
    options.expectedOrderId,
    options.orderIdMaxDistance ?? 2
  );

  const amountMatch = matchAmount(
    options.extractedAmount,
    options.expectedAmount,
    options.amountToleranceCents ?? 1
  );

  const recipientMatch = 
    options.extractedRecipient.toLowerCase() === 
    options.expectedRecipient.toLowerCase();

  const overallMatch = orderIdMatch.matched && amountMatch.matched && recipientMatch;

  return {
    matched: overallMatch,
    details: {
      orderId: {
        matched: orderIdMatch.matched,
        distance: orderIdMatch.distance,
        confidence: orderIdMatch.confidence,
        extracted: options.extractedOrderId,
        expected: options.expectedOrderId,
      },
      amount: {
        matched: amountMatch.matched,
        expectedCents: amountMatch.expectedCents,
        extractedCents: amountMatch.extractedCents,
        differenceCents: amountMatch.differenceCents,
        extracted: centsToDollars(amountMatch.extractedCents),
        expected: centsToDollars(amountMatch.expectedCents),
      },
      recipient: {
        matched: recipientMatch,
        extracted: options.extractedRecipient,
        expected: options.expectedRecipient,
      },
      overallMatch,
    },
  };
}

/**
 * Log payment matching details for debugging
 */
export function logPaymentMatchDetails(
  result: ReturnType<typeof matchPayment>,
  context: string = '[Payment Matching]'
): void {
  const { details } = result;

  console.log(`${context} Payment Match Details:`);
  console.log(`  Order ID: ${details.orderId.extracted} vs ${details.orderId.expected}`);
  console.log(`    Matched: ${details.orderId.matched}, Distance: ${details.orderId.distance}, Confidence: ${details.orderId.confidence.toFixed(1)}%`);
  console.log(`  Amount: ${details.amount.extracted} vs ${details.amount.expected}`);
  console.log(`    Matched: ${details.amount.matched}, Difference: ${details.amount.differenceCents} cents`);
  console.log(`  Recipient: ${details.recipient.extracted} vs ${details.recipient.expected}`);
  console.log(`    Matched: ${details.recipient.matched}`);
  console.log(`  Overall: ${details.overallMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
}
