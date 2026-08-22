/**
 * Affiliate System Library
 * 
 * Handles referral tracking, commission calculations, and payout management
 */

import { readStore, writeStore } from "./admin-store";
import type {
  Affiliate,
  AffiliateCommission,
  AffiliateCommissionTier,
  AffiliatePayout,
  AffiliateReferral,
  AffiliateStats,
} from "./types";

/**
 * Generate a unique referral code for a user
 */
export function generateReferralCode(userId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  const userPart = userId.substring(0, 4);
  return `${userPart}${timestamp}${random}`.toUpperCase();
}

/**
 * Create a new affiliate account for a user
 */
export async function createAffiliate(userId: string): Promise<Affiliate> {
  const store = await readStore();
  
  // Check if affiliate already exists
  if (store.affiliates[userId]) {
    return store.affiliates[userId];
  }

  const affiliate: Affiliate = {
    userId,
    referralCode: generateReferralCode(userId),
    status: "active",
    commissionRate: store.affiliateSettings.defaultCommissionRate,
    tier: "bronze",
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    totalReferrals: 0,
    activeReferrals: 0,
    createdAt: new Date().toISOString(),
  };

  await writeStore((s) => ({
    ...s,
    affiliates: { ...s.affiliates, [userId]: affiliate },
  }));

  return affiliate;
}

/**
 * Get affiliate by user ID
 */
export async function getAffiliate(userId: string): Promise<Affiliate | null> {
  const store = await readStore();
  return store.affiliates[userId] ?? null;
}

/**
 * Get affiliate by referral code
 */
export async function getAffiliateByCode(code: string): Promise<Affiliate | null> {
  const store = await readStore();
  return Object.values(store.affiliates).find((a) => a.referralCode === code) ?? null;
}

/**
 * Track a new referral signup
 */
export async function trackReferral(
  referralCode: string,
  referredUserId: string
): Promise<AffiliateReferral | null> {
  const store = await readStore();
  
  // Find affiliate by referral code
  const affiliate = Object.values(store.affiliates).find((a) => a.referralCode === referralCode);
  if (!affiliate) {
    return null;
  }

  // Check if referral already exists
  const existingReferral = store.affiliateReferrals.find((r) => r.referredUserId === referredUserId);
  if (existingReferral) {
    return existingReferral;
  }

  const referral: AffiliateReferral = {
    id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    affiliateUserId: affiliate.userId,
    referredUserId,
    referralCode,
    status: "active",
    totalSpent: 0,
    commissionEarned: 0,
    createdAt: new Date().toISOString(),
  };

  await writeStore((s) => ({
    ...s,
    affiliateReferrals: [...s.affiliateReferrals, referral],
    affiliates: {
      ...s.affiliates,
      [affiliate.userId]: {
        ...affiliate,
        totalReferrals: affiliate.totalReferrals + 1,
        activeReferrals: affiliate.activeReferrals + 1,
      },
    },
  }));

  return referral;
}

/**
 * Calculate commission for an order
 */
export async function calculateCommission(
  referredUserId: string,
  orderId: string,
  orderAmount: number
): Promise<AffiliateCommission | null> {
  const store = await readStore();
  
  // Find referral
  const referral = store.affiliateReferrals.find((r) => r.referredUserId === referredUserId);
  if (!referral || referral.status !== "active") {
    return null;
  }

  // Get affiliate
  const affiliate = store.affiliates[referral.affiliateUserId];
  if (!affiliate || affiliate.status !== "active") {
    return null;
  }

  // Calculate commission
  const commissionAmount = (orderAmount * affiliate.commissionRate) / 100;

  const commission: AffiliateCommission = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    affiliateUserId: affiliate.userId,
    referralUserId: referredUserId,
    orderId,
    orderAmount,
    commissionRate: affiliate.commissionRate,
    commissionAmount,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await writeStore((s) => ({
    ...s,
    affiliateCommissions: [...s.affiliateCommissions, commission],
    affiliates: {
      ...s.affiliates,
      [affiliate.userId]: {
        ...affiliate,
        pendingEarnings: affiliate.pendingEarnings + commissionAmount,
        totalEarnings: affiliate.totalEarnings + commissionAmount,
      },
    },
    affiliateReferrals: s.affiliateReferrals.map((r) =>
      r.referredUserId === referredUserId
        ? {
            ...r,
            totalSpent: r.totalSpent + orderAmount,
            commissionEarned: r.commissionEarned + commissionAmount,
            firstOrderAt: r.firstOrderAt || new Date().toISOString(),
          }
        : r
    ),
  }));

  return commission;
}

/**
 * Approve a commission (move from pending to approved)
 */
export async function approveCommission(commissionId: string): Promise<boolean> {
  const store = await readStore();
  
  const commission = store.affiliateCommissions.find((c) => c.id === commissionId);
  if (!commission || commission.status !== "pending") {
    return false;
  }

  await writeStore((s) => ({
    ...s,
    affiliateCommissions: s.affiliateCommissions.map((c) =>
      c.id === commissionId ? { ...c, status: "approved" as const } : c
    ),
  }));
  
  return true;
}

/**
 * Get affiliate statistics
 */
export async function getAffiliateStats(userId: string): Promise<AffiliateStats | null> {
  const store = await readStore();
  
  const affiliate = store.affiliates[userId];
  if (!affiliate) {
    return null;
  }

  const referrals = store.affiliateReferrals.filter((r) => r.affiliateUserId === userId);
  const commissions = store.affiliateCommissions.filter((c) => c.affiliateUserId === userId);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const lastMonthEnd = thisMonthStart;

  const thisMonthEarnings = commissions
    .filter((c) => new Date(c.createdAt).getTime() >= thisMonthStart)
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  const lastMonthEarnings = commissions
    .filter((c) => {
      const time = new Date(c.createdAt).getTime();
      return time >= lastMonthStart && time < lastMonthEnd;
    })
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  const topReferrals = referrals
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map((r) => ({
      userId: r.referredUserId,
      email: `user-${r.referredUserId}`, // TODO: Get actual email from user system
      totalSpent: r.totalSpent,
      commissionEarned: r.commissionEarned,
    }));

  return {
    totalClicks: 0, // TODO: Implement click tracking
    totalSignups: referrals.length,
    conversionRate: 0, // TODO: Calculate from clicks
    totalCommissions: commissions.length,
    pendingCommissions: commissions.filter((c) => c.status === "pending").length,
    lifetimeEarnings: affiliate.totalEarnings,
    thisMonthEarnings,
    lastMonthEarnings,
    topReferrals,
  };
}

/**
 * Request a payout
 */
export async function requestPayout(
  userId: string,
  amount: number,
  method: "wallet" | "paypal" | "crypto",
  paymentDetails?: string
): Promise<AffiliatePayout | { error: string }> {
  const store = await readStore();
  
  const affiliate = store.affiliates[userId];
  if (!affiliate) {
    return { error: "Affiliate not found" };
  }

  if (affiliate.status !== "active") {
    return { error: "Affiliate account is not active" };
  }

  // Check minimum payout amount
  if (amount < store.affiliateSettings.minPayoutAmount) {
    return { error: `Minimum payout amount is $${store.affiliateSettings.minPayoutAmount}` };
  }

  // Check available balance (approved but not paid commissions)
  const approvedCommissions = store.affiliateCommissions.filter(
    (c) => c.affiliateUserId === userId && c.status === "approved"
  );
  const availableBalance = approvedCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);

  if (amount > availableBalance) {
    return { error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}` };
  }

  const payout: AffiliatePayout = {
    id: `payout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    affiliateUserId: userId,
    amount,
    method,
    status: "requested",
    paymentDetails,
    requestedAt: new Date().toISOString(),
  };

  await writeStore((s) => ({
    ...s,
    affiliatePayouts: [...s.affiliatePayouts, payout],
    affiliates: {
      ...s.affiliates,
      [userId]: {
        ...affiliate,
        pendingEarnings: affiliate.pendingEarnings - amount,
      },
    },
  }));

  return payout;
}

/**
 * Process a payout (admin function)
 */
export async function processPayout(payoutId: string, success: boolean, notes?: string): Promise<boolean> {
  const store = await readStore();
  
  const payout = store.affiliatePayouts.find((p) => p.id === payoutId);
  if (!payout) {
    return false;
  }

  if (success) {
    payout.status = "completed";
    payout.completedAt = new Date().toISOString();
    
    // Update affiliate paid earnings
    const affiliate = store.affiliates[payout.affiliateUserId];
    if (affiliate) {
      affiliate.paidEarnings += payout.amount;
      affiliate.lastPayoutAt = new Date().toISOString();
    }

    // Mark commissions as paid
    const commissionsToMark = store.affiliateCommissions.filter(
      (c) => c.affiliateUserId === payout.affiliateUserId && c.status === "approved"
    );
    
    let remaining = payout.amount;
    for (const commission of commissionsToMark) {
      if (remaining <= 0) break;
      if (commission.commissionAmount <= remaining) {
        commission.status = "paid";
        commission.paidAt = new Date().toISOString();
        remaining -= commission.commissionAmount;
      }
    }
  } else {
    payout.status = "failed";
    
    // Refund pending earnings
    const affiliate = store.affiliates[payout.affiliateUserId];
    if (affiliate) {
      affiliate.pendingEarnings += payout.amount;
    }
  }

  if (notes) {
    payout.notes = notes;
  }
  payout.processedAt = new Date().toISOString();

  await writeStore((s) => {
    const affiliate = s.affiliates[payout.affiliateUserId];
    if (!affiliate) return s;
    
    if (success) {
      // Calculate which commissions to mark as paid
      let remaining = payout.amount;
      const updatedCommissions = s.affiliateCommissions.map((c) => {
        if (remaining <= 0) return c;
        if (c.affiliateUserId === payout.affiliateUserId && c.status === "approved" && c.commissionAmount <= remaining) {
          remaining -= c.commissionAmount;
          return { ...c, status: "paid" as const, paidAt: new Date().toISOString() };
        }
        return c;
      });
      
      return {
        ...s,
        affiliatePayouts: s.affiliatePayouts.map((p) =>
          p.id === payoutId ? { ...payout, status: "completed" as const, completedAt: new Date().toISOString(), processedAt: payout.processedAt } : p
        ),
        affiliateCommissions: updatedCommissions,
        affiliates: {
          ...s.affiliates,
          [payout.affiliateUserId]: {
            ...affiliate,
            paidEarnings: affiliate.paidEarnings + payout.amount,
            lastPayoutAt: new Date().toISOString(),
          },
        },
      };
    } else {
      return {
        ...s,
        affiliatePayouts: s.affiliatePayouts.map((p) =>
          p.id === payoutId ? { ...payout, status: "failed" as const, processedAt: payout.processedAt } : p
        ),
        affiliates: {
          ...s.affiliates,
          [payout.affiliateUserId]: {
            ...affiliate,
            pendingEarnings: affiliate.pendingEarnings + payout.amount,
          },
        },
      };
    }
  });
  
  return true;
}

/**
 * Update affiliate tier based on referral count
 */
export async function updateAffiliateTier(userId: string): Promise<AffiliateCommissionTier> {
  const store = await readStore();
  
  const affiliate = store.affiliates[userId];
  if (!affiliate) {
    throw new Error("Affiliate not found");
  }

  const { commissionTiers } = store.affiliateSettings;
  let newTier: AffiliateCommissionTier = "bronze";
  let newRate = commissionTiers.bronze.rate;

  if (affiliate.totalReferrals >= commissionTiers.platinum.minReferrals) {
    newTier = "platinum";
    newRate = commissionTiers.platinum.rate;
  } else if (affiliate.totalReferrals >= commissionTiers.gold.minReferrals) {
    newTier = "gold";
    newRate = commissionTiers.gold.rate;
  } else if (affiliate.totalReferrals >= commissionTiers.silver.minReferrals) {
    newTier = "silver";
    newRate = commissionTiers.silver.rate;
  }

  if (newTier !== affiliate.tier) {
    await writeStore((s) => ({
      ...s,
      affiliates: {
        ...s.affiliates,
        [userId]: {
          ...affiliate,
          tier: newTier,
          commissionRate: newRate,
        },
      },
    }));
  }

  return newTier;
}
