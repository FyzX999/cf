import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createServiceSupabase } from "./supabase";
import type {
  AuditEntry,
  GiftCard,
  PaymentRecord,
  PromoCode,
  ServiceOverride,
  SiteSettings,
  StoredTicket,
  StoredWallet,
} from "./types";
import type { FlashSale } from './flash-sales';
import type { Subscription } from './subscriptions';

export type AdminStore = {
  settings: SiteSettings;
  services: Record<string, ServiceOverride>;
  tickets: StoredTicket[];
  audit: AuditEntry[];
  promoCodes: PromoCode[];
  giftCards: GiftCard[];
  wallets: Record<string, StoredWallet>;
  payments: PaymentRecord[];
  flashSales?: FlashSale[];
  subscriptions?: Subscription[];
};

const STORE_PATH = path.join(process.cwd(), "data", "admin-store.json");
const IS_VERCEL = process.env.VERCEL === '1';

export const defaultSettings = (): SiteSettings => {
  const percent = Number(process.env.MARKUP_PERCENT ?? 80);
  const multiplier = 1 + (Number.isFinite(percent) ? percent : 80) / 100;
  return {
    siteName: process.env.SITE_NAME || "cheapfollower.shop",
    tagline: process.env.SITE_TAGLINE || "Social Growth. Without the Complicated Price Tag.",
    supportEmail: process.env.SUPPORT_EMAIL || "support@cheapfollower.shop",
    announcement: process.env.ANNOUNCEMENT || "",
    guestCheckout: process.env.GUEST_CHECKOUT !== 'false',
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
    defaultMarkupMultiplier: Number(multiplier.toFixed(4)),
    resellerDiscountPercent: Number(process.env.RESELLER_DISCOUNT || 20),
    minOrderAmount: Number(process.env.MIN_ORDER_AMOUNT || 0),
    currency: process.env.CURRENCY || "USD",
    deliveryMultipliers: { 
      standard: Number(process.env.DELIVERY_STANDARD || 1), 
      fast: Number(process.env.DELIVERY_FAST || 1.35), 
      drip: Number(process.env.DELIVERY_DRIP || 1.15)
    },
    autoSyncProviderCost: process.env.AUTO_SYNC_COST === 'true',
    baseOrderCount: Number(process.env.BASE_ORDER_COUNT || 0),
  };
};

function emptyStore(): AdminStore {
  return {
    settings: defaultSettings(),
    services: {},
    tickets: [],
    audit: [],
    promoCodes: [
      {
        code: "WELCOME10",
        type: "percent",
        value: 10,
        active: true,
        maxUses: 1000,
        uses: 0,
        minOrder: 0,
      },
    ],
    giftCards: [],
    wallets: {},
    payments: [],
    flashSales: [],
    subscriptions: [],
  };
}

let cache: { at: number; data: AdminStore } | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function mergeStore(raw: Partial<AdminStore> | null | undefined): AdminStore {
  const base = emptyStore();
  if (!raw) return base;
  const promoCodes = raw.promoCodes?.length ? raw.promoCodes : base.promoCodes;
  return {
    settings: { ...base.settings, ...raw.settings, deliveryMultipliers: { ...base.settings.deliveryMultipliers, ...raw.settings?.deliveryMultipliers } },
    services: raw.services ?? {},
    tickets: raw.tickets ?? [],
    audit: raw.audit ?? [],
    promoCodes,
    giftCards: raw.giftCards ?? [],
    wallets: raw.wallets ?? {},
    payments: raw.payments ?? [],
    flashSales: raw.flashSales ?? [],
    subscriptions: raw.subscriptions ?? [],
  };
}

async function readFromSupabase(): Promise<AdminStore | null> {
  try {
    const db = createServiceSupabase();
    if (!db) return null;
    
    const { data } = await db
      .from('admin_settings')
      .select('*')
      .single();
    
    if (data?.store_data) {
      return mergeStore(JSON.parse(data.store_data));
    }
  } catch (error) {
    console.log('Supabase read not available, using defaults');
  }
  return null;
}

async function writeToSupabase(store: AdminStore): Promise<void> {
  try {
    const db = createServiceSupabase();
    if (!db) return;
    
    await db
      .from('admin_settings')
      .upsert({
        id: 1,
        store_data: JSON.stringify(store),
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Supabase write failed:', error);
  }
}

export async function readStore(): Promise<AdminStore> {
  if (cache && Date.now() - cache.at < 1500) return cache.data;
  
  // On Vercel, try Supabase first
  if (IS_VERCEL) {
    const supabaseData = await readFromSupabase();
    if (supabaseData) {
      cache = { at: Date.now(), data: supabaseData };
      return supabaseData;
    }
    // Fallback to defaults on Vercel
    const data = emptyStore();
    cache = { at: Date.now(), data };
    return data;
  }
  
  // Local development: use file system
  try {
    const text = await readFile(STORE_PATH, "utf8");
    const data = mergeStore(JSON.parse(text) as Partial<AdminStore>);
    cache = { at: Date.now(), data };
    return data;
  } catch {
    const data = emptyStore();
    cache = { at: Date.now(), data };
    return data;
  }
}

async function persist(next: AdminStore) {
  if (IS_VERCEL) {
    // On Vercel, save to Supabase
    await writeToSupabase(next);
  } else {
    // Local: save to file
    await mkdir(path.dirname(STORE_PATH), { recursive: true });
    await writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
  }
  cache = { at: Date.now(), data: next };
}

export async function writeStore(mutator: (current: AdminStore) => AdminStore) {
  const run = writeQueue.then(async () => {
    cache = null;
    const current = await readStore();
    await persist(mutator(current));
  });
  writeQueue = run.catch(() => undefined);
  await run;
  return readStore();
}

export async function updateSettings(patch: Partial<SiteSettings>) {
  return writeStore((store) => ({
    ...store,
    settings: {
      ...store.settings,
      ...patch,
      deliveryMultipliers: {
        ...store.settings.deliveryMultipliers,
        ...patch.deliveryMultipliers,
      },
    },
  }));
}

export async function updateServiceOverrides(updates: Record<string, ServiceOverride>) {
  return writeStore((store) => {
    const services = { ...store.services };
    for (const [id, patch] of Object.entries(updates)) {
      services[id] = { ...services[id], ...patch };
    }
    return { ...store, services };
  });
}

export async function appendAudit(action: string, target: string, actor = "admin") {
  const entry: AuditEntry = {
    id: `${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    time: new Date().toISOString(),
    actor,
    action,
    target,
  };
  await writeStore((store) => ({
    ...store,
    audit: [entry, ...store.audit].slice(0, 200),
  }));
  return entry;
}

export async function addTicket(input: { category: string; subject: string; body: string; orderId?: string }) {
  const now = new Date().toISOString();
  const ticket: StoredTicket = {
    id: String(70000 + Math.floor(Math.random() * 9999)),
    category: input.category,
    subject: input.subject,
    status: "open",
    orderId: input.orderId?.trim() ?? "",
    messages: [{ role: "customer", body: input.body, at: now }],
    createdAt: now,
    updatedAt: now,
  };
  await writeStore((store) => ({ ...store, tickets: [ticket, ...store.tickets] }));
  return ticket;
}

export async function replyTicket(id: string, body: string, status?: StoredTicket["status"]) {
  let found: StoredTicket | undefined;
  await writeStore((store) => ({
    ...store,
    tickets: store.tickets.map((ticket) => {
      if (ticket.id !== id) return ticket;
      found = {
        ...ticket,
        status: status ?? ticket.status,
        updatedAt: new Date().toISOString(),
        messages: [...ticket.messages, { role: "agent" as const, body, at: new Date().toISOString() }],
      };
      return found;
    }),
  }));
  if (!found) throw new Error("Ticket not found");
  return found;
}