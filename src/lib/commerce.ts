import { generatePublicId, generateTxnId } from "./format";
import { readStore, writeStore } from "./admin-store";
import { createServiceSupabase } from "./supabase";
import type { GiftCard, PromoCode, WalletTxn } from "./types";

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
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

export async function creditWallet(userId: string, amount: number, method: string, note?: string) {
  if (amount <= 0) throw new Error("Credit amount must be positive");
  const db = createServiceSupabase();
  if (db) {
    const current = await getWallet(userId);
    const next = Number((current.balance + amount).toFixed(2));
    await db.from("profiles").upsert({ id: userId, balance: next }, { onConflict: "id" });
    await writeStore((store) => {
      const wallet = store.wallets[userId] ?? { balance: 0, apiKey: null, transactions: [] };
      return {
        ...store,
        wallets: { ...store.wallets, [userId]: { ...wallet, balance: next } },
      };
    });
    await recordTxn(userId, { type: "deposit", method, amount, note });
    return next;
  }
  let next = 0;
  await writeStore((store) => {
    const wallet = store.wallets[userId] ?? { balance: 0, apiKey: null, transactions: [] };
    next = Number((wallet.balance + amount).toFixed(2));
    return {
      ...store,
      wallets: { ...store.wallets, [userId]: { ...wallet, balance: next } },
    };
  });
  await recordTxn(userId, { type: "deposit", method, amount, note });
  return next;
}

export async function debitWallet(userId: string, amount: number, method: string, note?: string) {
  if (amount < 0) throw new Error("Debit amount is invalid");
  const current = await getWallet(userId);
  if (current.balance + 1e-9 < amount) {
    throw new Error("Insufficient wallet balance. Add funds or redeem a gift card first.");
  }
  const next = Number((current.balance - amount).toFixed(2));
  const db = createServiceSupabase();
  if (db) {
    await db.from("profiles").upsert({ id: userId, balance: next }, { onConflict: "id" });
  }
  await writeStore((store) => {
    const wallet = store.wallets[userId] ?? { balance: 0, apiKey: current.apiKey, transactions: [] };
    return {
      ...store,
      wallets: { ...store.wallets, [userId]: { ...wallet, balance: next, apiKey: wallet.apiKey ?? current.apiKey } },
    };
  });
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
    await creditWallet(userId, take, "Gift card", needle);
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

export { memoryBalance, normalizeCode };
