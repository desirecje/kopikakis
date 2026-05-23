import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { Coffee, Ban, AlertCircle, Inbox } from "lucide-react";
import { toast } from "sonner";
import { getOrderToken, listMyOrderIds, supabaseWithOwnerToken } from "@/lib/order-token";
import { decodeNotes } from "@/lib/options";

// Legacy ?q= param kept so old links don't 404; ignored.
const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/status")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "My Orders — RC4 Coffee Academy" },
      { name: "description", content: "View the status of orders you've placed from this device." },
    ],
  }),
  component: StatusPage,
});

type Order = {
  id: string;
  customer_name: string;
  drink: string;
  size: string;
  notes: string | null;
  status: string;
  created_at: string;
  cancellation_requested: boolean;
  cancellation_requested_at: string | null;
  cancelled_at: string | null;
};

const STATUS_STEPS = ["pending", "preparing", "ready", "done"] as const;

function StatusPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const ids = listMyOrderIds();
    if (ids.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const fetched = await Promise.all(
      ids.map(async (id) => {
        const token = getOrderToken(id);
        if (!token) return null;
        const client = supabaseWithOwnerToken(token);
        const { data } = await client
          .from("orders")
          .select(
            "id,customer_name,drink,size,notes,status,created_at,cancellation_requested,cancellation_requested_at,cancelled_at"
          )
          .eq("id", id)
          .maybeSingle();
        return (data as Order) ?? null;
      })
    );

    const valid = fetched.filter((o): o is Order => o !== null);
    valid.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setOrders(valid);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, [loadAll]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-semibold">My orders</h1>
      <p className="mt-2 text-muted-foreground">
        Orders you've placed from this device. They auto-refresh every few seconds.
      </p>

      <div className="mt-8">
        {loading && <div className="h-32 animate-pulse rounded-2xl bg-muted" />}

        {!loading && orders && orders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No orders yet on this device.</p>
            <Link
              to="/order"
              search={{ drink: undefined }}
              className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Place an order
            </Link>
          </div>
        )}

        {!loading && orders && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} onChanged={loadAll} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function OrderCard({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const cancelled = order.status === "cancelled";
  const stepIndex = cancelled ? -1 : STATUS_STEPS.indexOf(order.status as (typeof STATUS_STEPS)[number]);
  const canRequestCancel =
    !cancelled && !order.cancellation_requested && (order.status === "pending" || order.status === "preparing");
  const [submitting, setSubmitting] = useState(false);

  const requestCancel = async () => {
    if (!confirm("Request cancellation for this order? A barista will confirm shortly.")) return;
    const token = getOrderToken(order.id);
    if (!token) {
      toast.error("This order's ownership token is missing on this device.");
      return;
    }
    setSubmitting(true);
    const client = supabaseWithOwnerToken(token);
    const { error } = await client
      .from("orders")
      .update({ cancellation_requested: true })
      .eq("id", order.id);

    if (!error) {
      await client.from("order_audit_log").insert({
        order_id: order.id,
        from_status: order.status,
        to_status: "cancellation_requested",
        note: "Cancellation requested by customer",
      });
    }
    setSubmitting(false);

    if (error) {
      toast.error(
        error.message.includes("Cannot request cancellation")
          ? "Order is too far along to cancel."
          : "Could not submit request."
      );
      return;
    }
    toast.success("Cancellation requested. Awaiting confirmation.");
    onChanged();
  };

  const { selections, freeText } = decodeNotes(order.notes);
  const isTemp = order.size === "Iced" || order.size === "Hot";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              cancelled ? "bg-destructive/15 text-destructive" : "bg-secondary text-primary"
            }`}
          >
            {cancelled ? <Ban className="h-5 w-5" /> : <Coffee className="h-5 w-5" />}
          </div>
          <div>
            <div className="font-display text-lg font-semibold">{order.drink}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              {isTemp ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium">
                  <span aria-hidden>{order.size === "Iced" ? "🧊" : "☕"}</span> {order.size}
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 font-medium">{order.size}</span>
              )}
              {selections.flatMap((s) =>
                s.labels.map((l) => (
                  <span
                    key={`${s.groupName}-${l}`}
                    className="inline-flex rounded-full bg-secondary px-2 py-0.5 font-medium"
                  >
                    {l}
                  </span>
                ))
              )}
            </div>
            <div className="mt-1.5 text-sm text-muted-foreground">
              {order.customer_name} · #{order.id.slice(0, 8)}
            </div>
            {freeText && <div className="mt-1 text-sm italic text-muted-foreground">"{freeText}"</div>}
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
            cancelled ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
          }`}
        >
          {order.status}
        </span>
      </div>

      {!cancelled && (
        <div className="mt-5">
          <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {STATUS_STEPS.map((s, i) => (
              <span key={s} className={i <= stepIndex ? "text-primary" : ""}>
                {s}
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1">
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-1">
                <div className={`h-2 flex-1 rounded-full transition-colors ${i <= stepIndex ? "bg-primary" : "bg-muted"}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-muted-foreground">
        Placed {new Date(order.created_at).toLocaleString()}
        {order.cancelled_at && <> · Cancelled {new Date(order.cancelled_at).toLocaleString()}</>}
      </div>

      {order.cancellation_requested && !cancelled && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Cancellation requested</div>
            <div className="text-xs opacity-80">
              Submitted{" "}
              {order.cancellation_requested_at
                ? new Date(order.cancellation_requested_at).toLocaleString()
                : ""}{" "}
              · awaiting barista confirmation.
            </div>
          </div>
        </div>
      )}

      {canRequestCancel && (
        <button
          onClick={requestCancel}
          disabled={submitting}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          <Ban className="h-4 w-4" /> Request cancellation
        </button>
      )}

      {!canRequestCancel && !order.cancellation_requested && !cancelled && (
        <p className="mt-4 text-xs text-muted-foreground">
          This order is too far along to cancel — please speak with a barista.
        </p>
      )}
    </div>
  );
}
