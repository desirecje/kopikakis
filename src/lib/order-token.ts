// Owner-token helpers for anonymous order ownership.
// Each browser stores a UUID per order so RLS can verify the customer
// actually placed the order before letting them view or cancel it.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const STORAGE_KEY = "rc4_order_tokens_v1";

type TokenMap = Record<string, string>; // orderId -> ownerToken

function readMap(): TokenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: TokenMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

export function rememberOrderToken(orderId: string, token: string) {
  const map = readMap();
  map[orderId] = token;
  writeMap(map);
}

export function getOrderToken(orderId: string): string | null {
  return readMap()[orderId] ?? null;
}

export function listMyOrderIds(): string[] {
  return Object.keys(readMap());
}

export function newOwnerToken(): string {
  // crypto.randomUUID is available in modern browsers and Node 18+
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (very old browsers)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Build a Supabase client that sends the x-owner-token header so RLS
// policies on `orders` can verify ownership.
export function supabaseWithOwnerToken(token: string) {
  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL || (typeof process !== "undefined" ? process.env.SUPABASE_URL : undefined);
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (typeof process !== "undefined" ? process.env.SUPABASE_PUBLISHABLE_KEY : undefined);

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-owner-token": token } },
  });
}
