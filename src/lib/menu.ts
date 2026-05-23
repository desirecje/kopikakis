import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  sort_order: number;
};

export async function fetchMenuItems() {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id,name,description,price,available,sort_order")
    .eq("available", true)
    .order("sort_order", { ascending: true });

  if (error) return [];
  return ((data ?? []) as MenuItem[]).map((d) => ({ ...d, price: Number(d.price) }));
}

/**
 * Public hook: returns AVAILABLE menu items only, sorted by sort_order.
 * Hidden items are filtered server-side by RLS for non-admins.
 *
 * Includes auto-retry with exponential backoff so transient 503s
 * (e.g. PGRST002 schema cache warmup) don't leave the UI empty.
 */
export function useMenuItems(initialItems: MenuItem[] = []) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [loading, setLoading] = useState(initialItems.length === 0);

  useEffect(() => {
    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const load = async (attempt = 0) => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id,name,description,price,available,sort_order")
        .eq("available", true)
        .order("sort_order", { ascending: true });

      if (!mounted) return;

      if (error) {
        // Retry transient failures (schema cache warmup, brief outages)
        // up to ~30s total: 0.5s, 1s, 2s, 4s, 8s, 15s
        if (attempt < 6) {
          const delay = Math.min(15000, 500 * 2 ** attempt);
          retryTimer = setTimeout(() => load(attempt + 1), delay);
        } else {
          setLoading(false);
        }
        return;
      }

      setItems(((data ?? []) as MenuItem[]).map((d) => ({ ...d, price: Number(d.price) })));
      setLoading(false);
    };

    load();

    // Refetch when tab becomes visible again (mobile users returning to the page)
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Live-update when admins add, edit, hide, or remove items
    const channel = supabase
      .channel("menu-items-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => load())
      .subscribe();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, []);

  return { items, loading };
}
