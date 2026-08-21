import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
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
import { createServiceSupabase } from "./supabase";

export type AdminStore = {
  settings: SiteSettings;
  services: Record<string, ServiceOverride>;
  tickets: StoredTicket[];
  audit: AuditEntry[];
  promoCodes: PromoCode[];
  giftCards: GiftCard[];
  wallets: Record<string, StoredWallet>;
  payments: PaymentRecord[];
};

const STORE_PATH = path.join(process.cwd(), "data", "admin-store.json");
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;

export const defaultSettings = (): SiteSettings => {
  const percent = Number(process.env.MARKUP_PERCENT ?? 80);
  const multiplier = 1 + (Number.isFinite(percent) ? percent : 80) / 100;
  return {
    siteName: "cheapfollower.shop",
    tagline: "Social Growth. Without the Complicated Price Tag.",
    supportEmail: "support@cheapfollower.shop",
    announcement: "",
    guestCheckout: true,
    maintenanceMode: false,
    defaultMarkupMultiplier: Number(multiplier.toFixed(4)),
    resellerDiscountPercent: 20,
    minOrderAmount: 0,
    currency: "USD",
    deliveryMultipliers: { standard: 1, fast: 1.35, drip: 1.15 },
    autoSyncProviderCost: false,
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
  };
}

export async function readStore(): Promise<AdminStore> {
  if (cache && Date.now() - cache.at < 1500) return cache.data;
  
  // On Vercel, use Supabase to store admin data
  if (isVercel) {
    try {
      const supabase = createServiceSupabase();
      if (supabase) {
        const { data } = await supabase
          .from('admin_store')
          .select('data')
          .eq('id', 'main')
          .single();
        
        if (data?.data) {
          const storeData = mergeStore(data.data as Partial<AdminStore>);
          cache = { at: Date.now(), data: storeData };
          return storeData;
        }
      }
    } catch (error) {
      console.warn('Failed to read from Supabase, using defaults:', error);
    }
    // Return defaults if Supabase not configured or query fails
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
  // On Vercel, save to Supabase
  if (isVercel) {
    try {
      const supabase = createServiceSupabase();
      if (supabase) {
        await supabase
          .from('admin_store')
          .upsert({ 
            id: 'main', 
            data: next,
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Failed to persist to Supabase:', error);
    }
    cache = { at: Date.now(), data: next };
    return;
  }
  
  // Local development: use file system
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
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
