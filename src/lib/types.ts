export type OrderStatus =
  | "pending"
  | "processing"
  | "in_progress"
  | "delivering"
  | "completed"
  | "partial"
  | "canceled"
  | "refunded"
  | "refilling";

export type DeliverySpeed = "standard" | "fast" | "drip";

export type QualityTier = "Standard" | "Premium" | "HQ";

export type UserRole = "customer" | "reseller" | "admin";

export type TicketCategory =
  | "order"
  | "payment"
  | "refill"
  | "account"
  | "api"
  | "service"
  | "other";

export type PlatformSlug =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "x"
  | "telegram"
  | "spotify"
  | "discord";

export type Service = {
  id: string;
  platform: PlatformSlug;
  slug: string;
  name: string;
  category: string;
  quality: QualityTier;
  delivery: "Instant" | "Fast" | "Gradual";
  refill: boolean;
  refillDays: number;
  min: number;
  max: number;
  passwordRequired: boolean;
  ratePerThousand: number;
  costPerThousand: number;
  markupMultiplier: number;
  priceMode: "multiplier" | "fixed";
  visible: boolean;
  active: boolean;
  manual: boolean;
  providerServiceId: number | null;
  providerName?: string | null;
  startTime: string;
  popularity: number;
  description: string;
};

export type PriceMode = "multiplier" | "fixed";

export type ServiceOverride = Partial<{
  name: string;
  description: string;
  quality: QualityTier;
  delivery: "Instant" | "Fast" | "Gradual";
  refill: boolean;
  refillDays: number;
  min: number;
  max: number;
  passwordRequired: boolean;
  visible: boolean;
  active: boolean;
  manual: boolean;
  providerServiceId: number | null;
  markupMultiplier: number;
  priceMode: PriceMode;
  ratePerThousand: number;
  costPerThousand: number;
  startTime: string;
}>;

export type SiteSettings = {
  siteName: string;
  tagline: string;
  supportEmail: string;
  announcement: string;
  guestCheckout: boolean;
  maintenanceMode: boolean;
  defaultMarkupMultiplier: number;
  resellerDiscountPercent: number;
  minOrderAmount: number;
  currency: string;
  deliveryMultipliers: {
    standard: number;
    fast: number;
    drip: number;
  };
  autoSyncProviderCost: boolean;
};

export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";

export type Ticket = {
  id: string;
  publicId: string;
  userId: string | null;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  authorRole: "customer" | "agent" | "system";
  body: string;
  createdAt: string;
  attachments?: string[];
};

export type CreateTicketInput = {
  userId?: string;
  guestEmail?: string;
  category: TicketCategory;
  subject: string;
  body: string;
  orderId?: string;
};

export type TicketReplyInput = {
  ticketId: string;
  body: string;
  authorRole: "customer" | "agent";
  newStatus?: TicketStatus;
};

export type StoredTicket = {
  id: string;
  category: string;
  subject: string;
  status: "open" | "waiting" | "closed";
  orderId: string;
  messages: { role: "customer" | "agent"; body: string; at: string }[];
  createdAt: string;
  updatedAt: string;
};

export type AuditEntry = {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
};

export type Platform = {
  slug: PlatformSlug;
  name: string;
  accent: string;
  tagline: string;
};

export type PromoCode = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
  maxUses: number;
  uses: number;
  minOrder: number;
};

export type GiftCard = {
  code: string;
  amount: number;
  remaining: number;
  active: boolean;
  createdAt: string;
  redeemedBy?: string;
  redeemedAt?: string;
};

export type WalletTxn = {
  id: string;
  userId: string;
  type: "deposit" | "order" | "giftcard" | "promo" | "refund";
  method: string;
  amount: number;
  note?: string;
  createdAt: string;
};

export type StoredWallet = {
  balance: number;
  apiKey: string | null;
  transactions: WalletTxn[];
};

export type PaymentProvider = "paypal" | "nowpayments";

export type PaymentKind = "order" | "wallet";

export type PaymentStatus = "pending" | "completed" | "failed" | "expired";

export type PaymentRecord = {
  id: string;
  provider: PaymentProvider;
  kind: PaymentKind;
  status: PaymentStatus;
  amount: number;
  publicId?: string;
  userId?: string;
  gatewayId: string;
  invoiceUrl?: string;
  createdAt: string;
  completedAt?: string;
};

export type PublicOrder = {
  publicId: string;
  serviceName: string;
  platform: PlatformSlug;
  quantity: number;
  delivered: number;
  status: OrderStatus;
  link: string;
  total: number;
  startedAt: string;
  updatedAt: string;
  estimatedCompletion: string;
  delivery: DeliverySpeed;
  paid: boolean;
  promoCode?: string;
};

// Refund System Types
export type RefundCalculation = {
  orderId: string;
  originalTotal: number;
  quantityOrdered: number;
  quantityDelivered: number;
  refundAmount: number;
  refundReason: "canceled" | "partial";
};

export type RefundResult = {
  success: boolean;
  refundAmount: number;
  newWalletBalance: number;
  transactionId: string;
  error?: string;
};

export type RefundRequest = {
  orderId: string;
  userId: string;
  reason: "canceled" | "partial";
  adminNote?: string;
};

// Transaction Parsing Types
export type OrderIdParseResult = {
  prefix: string;
  number: number;
  fullId: string;
};

// Affiliate System Types
export type AffiliateStatus = "active" | "suspended" | "banned";

export type AffiliateCommissionTier = "bronze" | "silver" | "gold" | "platinum";

export type Affiliate = {
  userId: string;
  referralCode: string;
  status: AffiliateStatus;
  commissionRate: number; // Percentage (e.g., 10 = 10%)
  tier: AffiliateCommissionTier;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  totalReferrals: number;
  activeReferrals: number;
  createdAt: string;
  lastPayoutAt?: string;
};

export type AffiliateReferral = {
  id: string;
  affiliateUserId: string;
  referredUserId: string;
  referralCode: string;
  status: "active" | "inactive";
  totalSpent: number;
  commissionEarned: number;
  createdAt: string;
  firstOrderAt?: string;
};

export type AffiliateCommission = {
  id: string;
  affiliateUserId: string;
  referralUserId: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  createdAt: string;
  paidAt?: string;
};

export type AffiliatePayout = {
  id: string;
  affiliateUserId: string;
  amount: number;
  method: "wallet" | "paypal" | "crypto";
  status: "requested" | "processing" | "completed" | "failed";
  paymentDetails?: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  notes?: string;
};

export type AffiliateStats = {
  totalClicks: number;
  totalSignups: number;
  conversionRate: number;
  totalCommissions: number;
  pendingCommissions: number;
  lifetimeEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  topReferrals: Array<{
    userId: string;
    email: string;
    totalSpent: number;
    commissionEarned: number;
  }>;
};

export type AffiliateSettings = {
  enabled: boolean;
  defaultCommissionRate: number;
  minPayoutAmount: number;
  payoutMethods: Array<"wallet" | "paypal" | "crypto">;
  cookieDuration: number; // days
  commissionTiers: {
    bronze: { minReferrals: number; rate: number };
    silver: { minReferrals: number; rate: number };
    gold: { minReferrals: number; rate: number };
    platinum: { minReferrals: number; rate: number };
  };
};
