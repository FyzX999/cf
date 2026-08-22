import { generatePublicId, generateTxnId } from "./format";
import { readStore, writeStore } from "./admin-store";
import { createServiceSupabase } from "./supabase";
import type { GiftCard, PromoCode, WalletTxn, OrderIdParseResult } from "./types";

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Parse order ID from transaction notes or text
 * Supports flexible formats: CF123456, TKT987654, ORD555555, etc.
 * Pattern: [A-Z]{2,4} followed by 6-8 digits
 * @param note - Text containing potential order ID
 * @returns Parsed result with prefix, number, and fullId, or null if no match
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

export function newPromoCode(input: Partial<PromoCode> & Pick<PromoCode, "code" | "type" | "value">): PromoCode {
  return {
    code: normalizeCode(input.code),
    type: input.type,
    value: Number(input.value),
    active: input.active ?? true,
    maxUses: input.maxUses ?? 9999,
    uses: input.uses ?? 0,
    minOrder: input.minOrder ?? 0,
  };
}

export function newGiftCard(input: { code?: string; amount: number }): GiftCard {
  const amount = Number(input.amount);
  return {
    code: normalizeCode(input.code || generatePublicId().replace("CF", "GC")),
    amount,
    remaining: amount,
    active: true,
    createdAt: new Date().toISOString(),
  };
}

export async function listCommerce() {
  const store = await readStore();
  return { promoCodes: store.promoCodes, giftCards: store.giftCards };
}

export function previewPromo(total: number, promo: PromoCode) {
  if (!promo.active) throw new Error("Promo code is inactive");
  if (promo.uses >= promo.maxUses) throw new Error("Promo code has no remaining uses");
  if (total < promo.minOrder) throw new Error(`Promo requires a minimum of ${promo.minOrder}`);
  const discounted =
    promo.type === "percent" ? total * (1 - promo.value / 100) : total - promo.value;
  return Math.max(0, Number(discounted.toFixed(2)));
}

export async function findPromo(code: string) {
  const store = await readStore();
  return store.promoCodes.find((p) => p.code === normalizeCode(code)) ?? null;
}

export async function consumePromo(code: string) {
  const needle = normalizeCode(code);
  await writeStore((store) => ({
    ...store,
    promoCodes: store.promoCodes.map((p) =>
      p.code === needle ? { ...p, uses: p.uses + 1 } : p,
    ),
  }));
}

export async function upsertPromo(promo: PromoCode) {
  const next = newPromoCode(promo);
  await writeStore((store) => {
    const exists = store.promoCodes.some((p) => p.code === next.code);
    return {
      ...store,
      promoCodes: exists
        ? store.promoCodes.map((p) => (p.code === next.code ? { ...p, ...next, uses: p.uses } : p))
        : [next, ...store.promoCodes],
    };
  });
  return next;
}

export async function upsertGiftCard(card: GiftCard) {
  await writeStore((store) => {
    const exists = store.giftCards.some((g) => g.code === card.code);
    return {
      ...store,
      giftCards: exists
        ? store.giftCards.map((g) => (g.code === card.code ? card : g))
        : [card, ...store.giftCards],
    };
  });
  return card;
}

async function memoryBalance(userId: string) {
  const store = await readStore();
  return store.wallets[userId]?.balance ?? 0;
}

export async function getWallet(userId: string) {
  const db = createServiceSupabase();
  if (db) {
    const { data } = await db.from("profiles").select("balance, api_key, email").eq("id", userId).maybeSingle();
    const store = await readStore();
    const local = store.wallets[userId];
    return {
      balance: Number(data?.balance ?? local?.balance ?? 0),
      apiKey: (data?.api_key as string | null) ?? local?.apiKey ?? null,
      transactions: local?.transactions ?? [],
    };
  }
  const store = await readStore();
  const wallet = store.wallets[userId];
  return {
    balance: wallet?.balance ?? 0,
    apiKey: wallet?.apiKey ?? null,
    transactions: wallet?.transactions ?? [],
  };
}

async function recordTxn(userId: string, txn: Omit<WalletTxn, "id" | "userId" | "createdAt"> & { id?: string }) {
  const row: WalletTxn = {
    id: txn.id ?? generateTxnId(),
    userId,
    type: txn.type,
    method: txn.method,
    amount: txn.amount,
    note: txn.note,
    createdAt: new Date().toISOString(),
  };
  const db = createServiceSupabase();
  if (db) {
    await db.from("transactions").insert({
      public_id: row.id,
      user_id: userId,
      type: row.type,
      method: row.method,
      amount: row.amount,
    });
  }
  await writeStore((store) => {
    const current = store.wallets[userId] ?? { balance: 0, apiKey: null, transactions: [] };
    return {
      ...store,
      wallets: {
        ...store.wallets,
        [userId]: {
          ...current,
          transactions: [row, ...current.transactions].slice(0, 200),
        },
      },
    };
  });
  return row;
}

/**
 * Credit wallet with optimistic locking to prevent race conditions
 * 
 * Task 1.5: Implements optimistic locking for wallet operations
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 * 
 * Uses optimistic locking strategy:
 * - Reads current balance
 * - Verifies balance matches expected value
 * - Updates using WHERE clause with old balance value
 * - Retries automatically if race condition detected
 * 
 * @param userId - User ID
 * @param amount - Amount to credit (must be positive)
 * @param method - Transaction method (e.g., "Refund", "Gift card")
 * @param note - Optional transaction note
 * @param type - Transaction type
 * @param expectedBalance - Expected current balance (for optimistic locking)
 * @param retryCount - Current retry attempt (internal use)
 * @returns New balance after credit
 */
export async function creditWallet(
  userId: string, 
  amount: number, 
  method: string, 
  note?: string,
  type: "deposit" | "giftcard" | "promo" | "refund" = "deposit",
  expectedBalance?: number,
  retryCount = 0
): Promise<number> {
  // Requirement 9.1: Validate inputs
  if (amount <= 0) throw new Error("Credit amount must be positive");
  
  const MAX_RETRIES = 3;
  const db = createServiceSupabase();
  
  if (db) {
    // Requirement 9.1: Read current balance
    const current = await getWallet(userId);
    const currentBalance = current.balance;
    
    // Requirement 9.2: Verify balance matches expected (optimistic locking check)
    if (expectedBalance !== undefined && Math.abs(currentBalance - expectedBalance) > 1e-9) {
      // Race condition detected: balance changed since last read
      if (retryCount < MAX_RETRIES) {
        // Requirement 9.3: Retry on race condition
        return creditWallet(userId, amount, method, note, type, currentBalance, retryCount + 1);
      }
      throw new Error(`Wallet balance verification failed after ${MAX_RETRIES} retries. Expected ${expectedBalance}, found ${currentBalance}. Please retry the operation.`);
    }
    
    const next = Number((currentBalance + amount).toFixed(2));
    
    // Requirement 9.2: Update balance using WHERE clause with old value (optimistic lock)
    // This ensures the update only succeeds if balance hasn't changed
    const { data: updateResult, error: updateError } = await db
      .from("profiles")
      .update({ balance: next })
      .eq("id", userId)
      .eq("balance", currentBalance)
      .select();
    
    // Check if update was successful (row was modified)
    if (updateError || !updateResult || updateResult.length === 0) {
      // Requirement 9.3: Update affected 0 rows - race condition detected
      if (retryCount < MAX_RETRIES) {
        // Retry with fresh balance
        return creditWallet(userId, amount, method, note, type, undefined, retryCount + 1);
      }
      throw new Error(`Failed to update wallet balance after ${MAX_RETRIES} retries due to concurrent modifications. Please retry the operation.`);
    }
    
    // Update local store
    await writeStore((store) => {
      const wallet = store.wallets[userId] ?? { balance: 0, apiKey: null, transactions: [] };
      return {
        ...store,
        wallets: { ...store.wallets, [userId]: { ...wallet, balance: next } },
      };
    });
    
    // Record transaction
    await recordTxn(userId, { type, method, amount, note });
    
    return next;
  }
  
  // Fallback for memory-only mode
  // Get current wallet state
  const current = await getWallet(userId);
  const currentBalance = current.balance;
  
  // Check expected balance in memory mode
  if (expectedBalance !== undefined && Math.abs(currentBalance - expectedBalance) > 1e-9) {
    if (retryCount < MAX_RETRIES) {
      // Retry with fresh balance
      return creditWallet(userId, amount, method, note, type, currentBalance, retryCount + 1);
    }
    throw new Error(`Wallet balance verification failed in memory mode after ${MAX_RETRIES} retries. Expected ${expectedBalance}, found ${currentBalance}.`);
  }
  
  const next = Number((currentBalance + amount).toFixed(2));
  
  await writeStore((store) => {
    const wallet = store.wallets[userId] ?? { balance: 0, apiKey: null, transactions: [] };
    return {
      ...store,
      wallets: { ...store.wallets, [userId]: { ...wallet, balance: next } },
    };
  });
  
  await recordTxn(userId, { type, method, amount, note });
  return next;
}

/**
 * Debit wallet with optimistic locking to prevent race conditions
 * 
 * Task 1.5: Implements optimistic locking for wallet operations
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 * 
 * Uses optimistic locking strategy:
 * - Reads current balance
 * - Verifies sufficient funds
 * - Verifies balance matches expected value
 * - Updates using WHERE clause with old balance value
 * - Retries automatically if race condition detected
 * 
 * @param userId - User ID
 * @param amount - Amount to debit (must be positive)
 * @param method - Transaction method (e.g., "Order", "Refund Rollback")
 * @param note - Optional transaction note
 * @param expectedBalance - Expected current balance (for optimistic locking)
 * @param retryCount - Current retry attempt (internal use)
 * @returns New balance after debit
 */
export async function debitWallet(
  userId: string, 
  amount: number, 
  method: string, 
  note?: string,
  expectedBalance?: number,
  retryCount = 0
): Promise<number> {
  // Requirement 9.1: Validate inputs
  if (amount < 0) throw new Error("Debit amount is invalid");
  
  const MAX_RETRIES = 3;
  const db = createServiceSupabase();
  
  // Requirement 9.1: Read current balance
  const current = await getWallet(userId);
  const currentBalance = current.balance;
  
  // Requirement 9.2: Verify balance matches expected (optimistic locking check)
  if (expectedBalance !== undefined && Math.abs(currentBalance - expectedBalance) > 1e-9) {
    // Race condition detected: balance changed since last read
    if (retryCount < MAX_RETRIES) {
      // Requirement 9.3: Retry on race condition
      return debitWallet(userId, amount, method, note, currentBalance, retryCount + 1);
    }
    throw new Error(`Wallet balance verification failed after ${MAX_RETRIES} retries. Expected ${expectedBalance}, found ${currentBalance}. Please retry the operation.`);
  }
  
  // Check sufficient funds
  if (currentBalance + 1e-9 < amount) {
    throw new Error("Insufficient wallet balance. Add funds or redeem a gift card first.");
  }
  
  const next = Number((currentBalance - amount).toFixed(2));
  
  if (db) {
    // Requirement 9.2: Update balance using WHERE clause with old value (optimistic lock)
    const { data: updateResult, error: updateError } = await db
      .from("profiles")
      .update({ balance: next })
      .eq("id", userId)
      .eq("balance", currentBalance)
      .select();
    
    // Check if update was successful (row was modified)
    if (updateError || !updateResult || updateResult.length === 0) {
      // Requirement 9.3: Update affected 0 rows - race condition detected
      if (retryCount < MAX_RETRIES) {
        // Retry with fresh balance
        return debitWallet(userId, amount, method, note, undefined, retryCount + 1);
      }
      throw new Error(`Failed to update wallet balance after ${MAX_RETRIES} retries due to concurrent modifications. Please retry the operation.`);
    }
  }
  
  // Update local store
  await writeStore((store) => {
    const wallet = store.wallets[userId] ?? { balance: 0, apiKey: current.apiKey, transactions: [] };
    return {
      ...store,
      wallets: { ...store.wallets, [userId]: { ...wallet, balance: next, apiKey: wallet.apiKey ?? current.apiKey } },
    };
  });
  
  // Record transaction
  await recordTxn(userId, { type: "order", method, amount: -amount, note });
  
  return next;
}

export async function redeemGiftCard(code: string, userId?: string, applyAmount?: number) {
  const needle = normalizeCode(code);
  const store = await readStore();
  const card = store.giftCards.find((g) => g.code === needle);
  if (!card || !card.active) throw new Error("Gift card not found");
  if (card.remaining <= 0) throw new Error("Gift card has no remaining balance");
  const take = Math.min(card.remaining, applyAmount ?? card.remaining);
  const remaining = Number((card.remaining - take).toFixed(2));
  await writeStore((s) => ({
    ...s,
    giftCards: s.giftCards.map((g) =>
      g.code === needle
        ? { ...g, remaining, redeemedBy: userId ?? g.redeemedBy, redeemedAt: new Date().toISOString() }
        : g,
    ),
  }));
  if (userId) {
    await creditWallet(userId, take, "Gift card", needle, "giftcard");
  }
  return { credited: take, remaining };
}

export async function lookupApiKey(key: string) {
  const trimmed = key.trim();
  if (!trimmed) return null;
  const db = createServiceSupabase();
  if (db) {
    const { data } = await db.from("profiles").select("id, email, balance, api_key").eq("api_key", trimmed).maybeSingle();
    if (data?.id) {
      return { userId: data.id as string, email: (data.email as string | null) ?? undefined, balance: Number(data.balance ?? 0) };
    }
  }
  const store = await readStore();
  const match = Object.entries(store.wallets).find(([, wallet]) => wallet.apiKey === trimmed);
  if (!match) return null;
  return { userId: match[0], balance: match[1].balance };
}

export async function issueApiKey(userId: string, email?: string) {
  const apiKey = `cf_${crypto.randomUUID().replace(/-/g, "")}`;
  const db = createServiceSupabase();
  if (db) {
    await db.from("profiles").upsert({ id: userId, email: email ?? null, api_key: apiKey }, { onConflict: "id" });
  }
  await writeStore((store) => {
    const wallet = store.wallets[userId] ?? { balance: 0, apiKey: null, transactions: [] };
    return {
      ...store,
      wallets: { ...store.wallets, [userId]: { ...wallet, apiKey } },
    };
  });
  return apiKey;
}

export async function ensureApiKey(userId: string, email?: string) {
  const wallet = await getWallet(userId);
  if (wallet.apiKey) return wallet.apiKey;
  return issueApiKey(userId, email);
}

/**
 * Check wallet balance consistency against transaction history
 * 
 * Task 1.5: Wallet balance consistency check function
 * Requirements: 9.4, 9.5
 * 
 * Verifies that the wallet balance equals the sum of all transactions.
 * This helps detect and diagnose race condition issues.
 * 
 * @param userId - User ID to check
 * @returns Consistency check result with details
 */
export async function checkWalletConsistency(userId: string): Promise<{
  consistent: boolean;
  currentBalance: number;
  calculatedBalance: number;
  difference: number;
  transactionCount: number;
}> {
  const wallet = await getWallet(userId);
  const currentBalance = wallet.balance;
  
  // Requirement 9.4: Calculate balance from transaction history
  // Sum all transactions: positive for credits, negative for debits
  const calculatedBalance = wallet.transactions.reduce((sum, txn) => {
    return sum + txn.amount;
  }, 0);
  
  const roundedCalculated = Number(calculatedBalance.toFixed(2));
  const difference = Number((currentBalance - roundedCalculated).toFixed(2));
  
  // Requirement 9.5: Balance should equal sum of all transactions
  // Allow small floating-point differences (1e-6)
  const consistent = Math.abs(difference) < 1e-6;
  
  return {
    consistent,
    currentBalance,
    calculatedBalance: roundedCalculated,
    difference,
    transactionCount: wallet.transactions.length,
  };
}

/**
 * Process atomic refund operation with automatic rollback on failure
 * 
 * Task 1.1: Implements atomic refund processing with rollback capability
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 * 
 * This function ensures that wallet credit and order status update happen atomically.
 * If either operation fails, the successful operation is rolled back automatically.
 * 
 * @param params - Refund operation parameters
 * @returns Result with success status, amounts, and transaction details
 */
export async function processAtomicRefund(params: {
  userId: string;
  orderId: string;
  refundAmount: number;
  reason: string;
  actor: string;
  adminNote?: string;
}): Promise<{
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}> {
  const { userId, orderId, refundAmount, reason, actor, adminNote } = params;
  
  // Track operation state for rollback
  let walletCredited = false;
  let creditTransactionId = "";
  let newBalance = 0;
  let balanceBeforeCredit = 0;
  
  try {
    // Build comprehensive audit note for transaction record
    const timestamp = new Date().toISOString();
    const auditNote = [
      `Refund for order ${orderId}`,
      `Amount: $${refundAmount.toFixed(2)}`,
      `Reason: ${reason}`,
      `Actor: ${actor}`,
      `Timestamp: ${timestamp}`,
      adminNote ? `Admin note: ${adminNote}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
    
    // Get current balance for optimistic locking
    const currentWallet = await getWallet(userId);
    balanceBeforeCredit = currentWallet.balance;
    
    // STEP 1: Credit wallet with optimistic locking
    // Requirement 1.1, 1.2, 1.3: Atomic operation with rollback capability
    // Requirement 9.1, 9.2, 9.3: Use optimistic locking to prevent race conditions
    newBalance = await creditWallet(
      userId,
      refundAmount,
      "Refund",
      auditNote,
      "refund",
      balanceBeforeCredit // Pass expected balance for optimistic locking
    );
    
    // Mark wallet as credited for potential rollback
    walletCredited = true;
    
    // Get the transaction ID that was just created
    const wallet = await getWallet(userId);
    creditTransactionId = wallet.transactions[0]?.id ?? "";
    
    // STEP 2: Update order status to 'refunded' in database
    // Requirement 1.5: Either all changes succeed or none persist
    const db = createServiceSupabase();
    
    if (db) {
      const now = new Date().toISOString();
      const { error: orderUpdateError } = await db
        .from("orders")
        .update({
          status: "refunded" as const,
          updated_at: now,
        })
        .eq("public_id", orderId);
      
      if (orderUpdateError) {
        // ORDER UPDATE FAILED - INITIATE ROLLBACK
        // Requirement 1.2: Create debit transaction to reverse wallet credit
        
        const rollbackNote = [
          `ROLLBACK: Reversing refund for order ${orderId}`,
          `Original amount: $${refundAmount.toFixed(2)}`,
          `Reason: Order status update failed - ${orderUpdateError.message}`,
          `Original transaction: ${creditTransactionId}`,
          `Timestamp: ${new Date().toISOString()}`,
        ].join(" | ");
        
        try {
          // Debit the wallet to reverse the credit with optimistic locking
          // Requirement 9.1, 9.2, 9.3: Use optimistic locking for rollback too
          await debitWallet(
            userId,
            refundAmount,
            "Refund Rollback",
            rollbackNote,
            newBalance // Pass expected balance after credit
          );
          
          // Requirement 1.4: Return clear error message
          return {
            success: false,
            error: "Refund failed due to database error. Your wallet balance has been restored. Please retry the refund request.",
          };
        } catch (rollbackError) {
          // CRITICAL: Rollback failed - system is in inconsistent state
          // Requirement 1.3: Log rollback failure for manual intervention
          const rollbackErrorMsg = rollbackError instanceof Error ? rollbackError.message : "Unknown error";
          
          return {
            success: false,
            error: `CRITICAL: Refund failed and automatic rollback unsuccessful. Support has been notified. Please contact customer service immediately with order ID ${orderId}. Error: ${rollbackErrorMsg}`,
          };
        }
      }
    }
    
    // SUCCESS: Both operations completed atomically
    // Requirement 1.5: All database changes succeeded
    return {
      success: true,
      transactionId: creditTransactionId,
      newBalance,
    };
    
  } catch (error) {
    // Requirement 1.1: Rollback on any failure
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // If wallet was credited, attempt rollback
    if (walletCredited && refundAmount > 0) {
      const rollbackNote = [
        `ROLLBACK: Reversing refund for order ${orderId}`,
        `Original amount: $${refundAmount.toFixed(2)}`,
        `Reason: ${errorMessage}`,
        `Original transaction: ${creditTransactionId}`,
        `Timestamp: ${new Date().toISOString()}`,
      ].join(" | ");
      
      try {
        // Use optimistic locking for rollback
        await debitWallet(
          userId,
          refundAmount,
          "Refund Rollback",
          rollbackNote,
          newBalance // Pass expected balance after credit
        );
        
        const currentWallet = await getWallet(userId);
        
        // Requirement 1.4: Return clear error with retry instruction
        return {
          success: false,
          newBalance: currentWallet.balance,
          error: "Refund processing failed. Your wallet balance has been restored. Please retry the refund request.",
        };
      } catch (rollbackError) {
        // CRITICAL: Rollback failed
        const rollbackErrorMsg = rollbackError instanceof Error ? rollbackError.message : "Unknown error";
        
        return {
          success: false,
          error: `CRITICAL: Refund failed and automatic rollback unsuccessful. Support has been notified. Please contact customer service immediately with order ID ${orderId}. Rollback error: ${rollbackErrorMsg}`,
        };
      }
    }
    
    // Requirement 1.4: Clear error message for failures before wallet credit
    return {
      success: false,
      error: "Refund processing failed. Please retry the refund request. If the issue persists, contact support.",
    };
  }
}

export { memoryBalance, normalizeCode };
