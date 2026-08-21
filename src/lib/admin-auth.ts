const COOKIE = "cf_admin";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function adminCookieName() {
  return COOKIE;
}

export function adminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || "FyzX",
    password: process.env.ADMIN_PASSWORD || "Momin@7764",
  };
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "cheapfollower-admin-session";
}

async function hmacHex(message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function verifyAdminCredentials(username: string, password: string) {
  const expected = adminCredentials();
  return safeEqual(username.trim(), expected.username) && safeEqual(password, expected.password);
}

export async function signAdminSession() {
  const exp = Date.now() + WEEK_MS;
  const payload = `ok.${exp}`;
  return `${payload}.${await hmacHex(payload)}`;
}

export async function isValidAdminSession(token: string | undefined | null) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [ok, expRaw, sig] = parts;
  if (ok !== "ok") return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const payload = `${ok}.${expRaw}`;
  const expected = await hmacHex(payload);
  return safeEqual(sig, expected);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(WEEK_MS / 1000),
  };
}
