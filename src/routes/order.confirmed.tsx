import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { getOrderToken, supabaseWithOwnerToken } from "@/lib/order-token";
import { decodeNotes } from "@/lib/options";

export const Route = createFileRoute("/order/confirmed")({
  validateSearch: z.object({ id: z.string() }),
  head: () => ({ meta: [{ title: "Order confirmed" }] }),
  component: ConfirmedPage,
});

type Order = { customer_name: string; drink: string; size: string; notes: string | null; status: string; queue_number: number | null };

function ConfirmedPage() {
  const { id } = Route.useSearch();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = getOrderToken(id);

    if (!token) {
      // No saved ownership token in this browser — can't read the order.
      setLoading(false);
      return;
    }

    const client = supabaseWithOwnerToken(token);

    const fetchOrder = async () => {
      const { data } = await client
        .from("orders")
        .select("customer_name,drink,size,notes,status,queue_number")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (data) setOrder(data as Order);
      setLoading(false);
    };

    fetchOrder();

    // Realtime: receipt # appears the instant the DB trigger writes it.
    // The token-bearing client also satisfies the RLS policy on subscriptions.
    const channel = client
      .channel(`order-confirmed-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new) setOrder(payload.new as Order);
        }
      )
      .subscribe();

    // Auto-poll every 3s for status changes (realtime is the primary channel,
    // polling is the safety net). Stops once the order reaches a terminal state.
    const TERMINAL = new Set(["done", "cancelled"]);
    const interval = setInterval(async () => {
      if (cancelled) return clearInterval(interval);
      const { data } = await client
        .from("orders")
        .select("customer_name,drink,size,notes,status,queue_number")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setOrder(data as Order);
        if (TERMINAL.has(data.status)) clearInterval(interval);
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      client.removeChannel(channel);
    };
  }, [id]);

  const hasNumber = order?.queue_number != null;

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h1 className="text-4xl font-semibold">Order sent</h1>
      <p className="mt-2 text-muted-foreground">Show this number at the counter when you collect.</p>

      {loading && !order ? (
        <div className="mt-8 h-40 animate-pulse rounded-3xl bg-muted" />
      ) : order ? (
        <>
          <div className="mt-8 rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-card to-secondary/30 p-10 shadow-lg">
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Receipt #
            </div>
            <div
              key={order.queue_number ?? "pending"}
              className={`mt-3 font-display font-semibold tabular-nums ${
                hasNumber
                  ? "animate-in fade-in zoom-in-50 duration-500 text-8xl text-primary"
                  : "text-5xl text-muted-foreground/50"
              }`}
            >
              {hasNumber ? `#${order.queue_number}` : "…"}
            </div>
            {!hasNumber && (
              <p className="mt-3 text-xs text-muted-foreground">Assigning your receipt number…</p>
            )}
            <div
              key={`status-${order.status}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-sm font-medium animate-in fade-in slide-in-from-bottom-1 duration-300"
            >
              <span className={`h-2 w-2 rounded-full ${statusDot(order.status)} ${order.status === "ready" ? "animate-pulse" : ""}`} />
              <span className="capitalize">{statusLabel(order.status)}</span>
            </div>
          </div>
          {(() => {
            const { selections, freeText } = decodeNotes(order.notes);
            const isTemp = order.size === "Iced" || order.size === "Hot";
            return (
              <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-left">
                <Row label="Name" value={order.customer_name} />
                <Row label="Drink" value={order.drink} />
                {isTemp ? (
                  <Row
                    label="Temperature"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden>{order.size === "Iced" ? "🧊" : "☕"}</span>
                        {order.size}
                      </span>
                    }
                  />
                ) : (
                  <Row label="Size" value={order.size} />
                )}
                {selections.map((s) => (
                  <Row key={s.groupName} label={s.groupName} value={s.labels.join(", ")} />
                ))}
                {freeText && <Row label="Notes" value={freeText} />}
                <Row label="Status" value={<span className="capitalize">{order.status}</span>} />
                <p className="mt-4 text-xs text-muted-foreground">Order #{id.slice(0, 8)}</p>
              </div>
            );
          })()}
        </>
      ) : (
        <p className="mt-8 text-muted-foreground">Order not found.</p>
      )}


      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/status" search={{ q: id.slice(0, 8) }} className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
          Track order
        </Link>
        <Link to="/" className="rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:bg-secondary">
          Back to menu
        </Link>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function statusDot(status: string) {
  switch (status) {
    case "pending": return "bg-muted-foreground";
    case "preparing": return "bg-amber-500";
    case "ready": return "bg-emerald-500";
    case "done": return "bg-primary";
    case "cancelled": return "bg-destructive";
    default: return "bg-muted-foreground";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "pending": return "Waiting in queue";
    case "preparing": return "Being prepared";
    case "ready": return "Ready for collection";
    case "done": return "Collected";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}
