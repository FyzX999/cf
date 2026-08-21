import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "./admin-auth";

export async function isAdminRequest() {
  const jar = await cookies();
  return isValidAdminSession(jar.get(adminCookieName())?.value);
}

export async function requireAdminApi() {
  if (await isAdminRequest()) return null;
  return NextResponse.json({ error: "Admin login required" }, { status: 401 });
}
