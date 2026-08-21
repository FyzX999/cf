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
