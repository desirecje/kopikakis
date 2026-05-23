import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, History, RotateCcw, X, Pencil, Save, Trash2, Zap, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMenuItems } from "@/lib/menu";
import {
  decodeNotes,
  encodeSelectionToNotes,
  useGroupsForMenuItem,
  type Selection,
  type GroupWithChoices,
} from "@/lib/options";

export const Route = createFileRoute("/admin/")({
  component: OrdersPage,
});

type Order = {
  id: string;
  customer_name: string;
  drink: string;
  size: string;
  notes: string | null;
  status: string;
  created_at: string;
  status_updated_at: string;
  preparing_at: string | null;
  ready_at: string | null;
  done_at: string | null;
  cancellation_requested: boolean;
  cancellation_requested_at: string | null;
  cancelled_at: string | null;
  queue_number: number | null;
};
type AuditEntry = {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
};

const ORDER_STATUSES = ["pending", "preparing", "ready", "done", "cancelled"] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

function nextStatus(s: string): OrderStatus | null {
  const flow = ["pending", "preparing", "ready", "done"] as const;
  const i = flow.indexOf(s as (typeof flow)[number]);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditFor, setAuditFor] = useState<Order | null>(null);
  const [editing, setEditing] = useState<Order | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

  const load = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data ?? []) as Order[]);
  };
  useEffect(() => {
    load();
    const mountedAt = Date.now();
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const o = payload.new as Order;
          // Skip toasts for any rows that existed before this admin session opened
          if (o?.created_at && new Date(o.created_at).getTime() >= mountedAt) {
            const queue = o.queue_number != null ? `#${o.queue_number} · ` : "";
            toast.success(`New order: ${o.customer_name}`, {
              description: `${queue}${o.drink} (${o.size})`,
              duration: 6000,
            });
          }
          load();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();
    const interval = setInterval(load, 5000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const changeStatus = async (order: Order, to: OrderStatus, note?: string) => {
    if (to === order.status) return;
    const { error } = await supabase.from("orders").update({ status: to }).eq("id", order.id);
    if (error) { toast.error("Update failed"); return; }
    await supabase.from("order_audit_log").insert({
      order_id: order.id,
      from_status: order.status,
      to_status: to,
      note: note?.trim() || null,
    });
    toast.success(`Marked ${to}`);
    load();
  };

  const saveEdit = async (patch: Partial<Order>) => {
    if (!editing) return;
    const { error } = await supabase.from("orders").update(patch).eq("id", editing.id);
    if (error) { toast.error("Save failed"); return; }
    await supabase.from("order_audit_log").insert({
      order_id: editing.id,
      from_status: editing.status,
      to_status: editing.status,
      note: `Order edited by admin`,
    });
    toast.success("Order updated");
    setEditing(null);
    load();
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Update status, edit details, or revert mistakes.</p>
        </div>
        <div className="flex items-center gap-3">
          <RecentOrdersTicker orders={orders} />
          <span className="text-sm text-muted-foreground">{orders.length} total</span>
          <button
            onClick={async () => {
              const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              const { data, error } = await supabase
                .from("orders")
                .select("*")
                .gte("created_at", since)
                .order("created_at", { ascending: false });
              if (error) { toast.error(error.message); return; }
              const rows = (data ?? []) as Order[];
              if (rows.length === 0) { toast.info("No orders in the last 24 hours"); return; }
              const headers = [
                "queue_number","id","created_at","status","customer_name","drink","size","notes",
                "preparing_at","ready_at","done_at","cancellation_requested","cancelled_at",
              ];
              const esc = (v: unknown) => {
                if (v == null) return "";
                const s = String(v).replace(/\r?\n/g, " ");
                return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
              };
              const csv = [
                headers.join(","),
                ...rows.map((r) => headers.map((h) => esc((r as Record<string, unknown>)[h])).join(",")),
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `orders-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              toast.success(`Exported ${rows.length} order${rows.length === 1 ? "" : "s"}`);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" /> Export 24h CSV
          </button>
          <button
            onClick={async () => {
              if (!confirm("Reset queue numbering back to 1? Existing orders keep their numbers; only future orders are affected.")) return;
              const { error } = await supabase.rpc("reset_order_queue");
              if (error) { toast.error(error.message); return; }
              toast.success("Queue reset — next order will be #1");
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset queue
          </button>
          <button
            onClick={async () => {
              if (orders.length === 0) { toast.info("No orders to delete"); return; }
              if (!confirm(`Delete ALL ${orders.length} orders and reset queue numbering? This cannot be undone.`)) return;
              const { error: delErr } = await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
              if (delErr) { toast.error(delErr.message); return; }
              const { error: resetErr } = await supabase.rpc("reset_order_queue");
              if (resetErr) { toast.error(resetErr.message); return; }
              toast.success("All orders deleted and queue reset");
              load();
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete all
          </button>
        </div>
      </div>

      <WeekPerformance orders={orders} />

      <FilterBar
        query={query}
        onQueryChange={setQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      <FilteredOrdersList
        orders={orders}
        query={query}
        statusFilter={statusFilter}
        onChange={changeStatus}
        onAudit={(o) => setAuditFor(o)}
        onEdit={(o) => setEditing(o)}
        onClearFilters={() => { setQuery(""); setStatusFilter("all"); }}
      />

      {auditFor && <AuditDrawer order={auditFor} onClose={() => setAuditFor(null)} />}
      {editing && <EditDrawer order={editing} onClose={() => setEditing(null)} onSave={saveEdit} />}
    </main>
  );
}

function OrderRow({
  order, onChange, onAudit, onEdit,
}: {
  order: Order;
  onChange: (o: Order, to: OrderStatus, note?: string) => void;
  onAudit: () => void;
  onEdit: () => void;
}) {
  const [note, setNote] = useState("");
  const next = nextStatus(order.status);
  const i = ORDER_STATUSES.indexOf(order.status as OrderStatus);
  const stamps = [
    { key: "created", label: "Placed", at: order.created_at },
    { key: "preparing", label: "Preparing", at: order.preparing_at },
    { key: "ready", label: "Ready", at: order.ready_at },
    { key: "done", label: "Done", at: order.done_at },
  ];
  const cancelRequested = order.cancellation_requested && order.status !== "cancelled";

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${cancelRequested ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-[200px]">
          {order.queue_number != null && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-xl font-semibold text-primary tabular-nums">
              {order.queue_number}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium">
              {order.customer_name} <span className="text-muted-foreground">— {order.drink} ({order.size})</span>
            </div>
            {order.notes && <div className="mt-0.5 text-sm italic text-muted-foreground">"{order.notes}"</div>}
            <div className="mt-1 text-xs text-muted-foreground">
              #{order.id.slice(0, 8)} · placed {new Date(order.created_at).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <button onClick={onEdit} title="Edit details" className="rounded-full border border-border p-1.5 hover:bg-secondary">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {cancelRequested && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <span className="font-medium">⚠ Customer requested cancellation</span>
          <span className="text-xs opacity-80">
            {order.cancellation_requested_at && new Date(order.cancellation_requested_at).toLocaleString()}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => onChange(order, "cancelled", "Cancellation approved")}
              className="rounded-full bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:opacity-90"
            >
              Approve cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2">
        {stamps.map((s, idx) => {
          const reached = idx <= i;
          return (
            <div key={s.key} className="flex flex-col gap-1">
              <div className={`h-1.5 rounded-full transition-colors ${reached ? "bg-primary" : "bg-muted"}`} />
              <div className="flex items-baseline justify-between gap-1">
                <span className={`text-xs font-medium uppercase tracking-wider ${reached ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {s.at ? new Date(s.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Audit note (optional)"
          maxLength={200}
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
        />
        {next && (
          <button
            onClick={() => { onChange(order, next, note); setNote(""); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Mark {next} <ChevronRight className="h-4 w-4" />
          </button>
        )}
        <select
          value={order.status}
          onChange={(e) => { onChange(order, e.target.value as OrderStatus, note); setNote(""); }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm capitalize"
        >
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {order.status !== "pending" && (
          <button
            onClick={() => { onChange(order, "pending", note || "reverted"); setNote(""); }}
            title="Revert to pending"
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <button onClick={onAudit} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm hover:bg-secondary">
          <History className="h-4 w-4" /> Log
        </button>
      </div>
    </div>
  );
}

function EditDrawer({ order, onClose, onSave }: { order: Order; onClose: () => void; onSave: (p: Partial<Order>) => void }) {
  const menuResult = useMenuItems();
  const drinks = menuResult?.items ?? [];
  const [customer_name, setName] = useState(order.customer_name);
  const [drink, setDrink] = useState(order.drink);
  const [size, setSize] = useState(order.size);

  // Resolve menu_item_id from the saved drink name to load its option groups
  const menuItem = drinks.find((d) => d.name === drink);
  const { groups } = useGroupsForMenuItem(menuItem?.id ?? null);
  const decoded = useMemo(() => decodeNotes(order.notes), [order.notes]);
  const [selection, setSelection] = useState<Selection>({});
  const [freeText, setFreeText] = useState(decoded.freeText);

  // When groups load (or drink changes), seed selection from decoded notes by matching group names
  useEffect(() => {
    const next: Selection = {};
    for (const g of groups) {
      const fromNotes = decoded.selections.find((s) => s.groupName === g.name);
      next[g.id] = fromNotes ? fromNotes.labels.filter((l) => g.choices.some((c) => c.label === l)) : [];
    }
    setSelection(next);
  }, [groups, decoded]);

  const toggleChoice = (g: GroupWithChoices, label: string) => {
    setSelection((prev) => {
      const current = prev[g.id] ?? [];
      if (g.selection_type === "single") {
        return { ...prev, [g.id]: current[0] === label ? [] : [label] };
      }
      return {
        ...prev,
        [g.id]: current.includes(label) ? current.filter((l) => l !== label) : [...current, label],
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl border border-border bg-background sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background p-4">
          <div className="font-semibold">Edit order</div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-4">
          <Field label="Customer name">
            <input value={customer_name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Drink">
            <select value={drink} onChange={(e) => setDrink(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {drinks.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Temperature">
            <div className="grid grid-cols-2 gap-2">
              {(["Hot", "Iced"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSize(t)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    size === t ? "border-primary bg-primary/10 text-primary" : "border-input bg-background hover:bg-secondary"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          {groups.map((g) => {
            const current = selection[g.id] ?? [];
            return (
              <Field key={g.id} label={g.name}>
                <div className="grid grid-cols-2 gap-2">
                  {g.choices.map((c) => {
                    const active = current.includes(c.label);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleChoice(g, c.label)}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                          active ? "border-primary bg-primary/10 text-primary" : "border-input bg-background hover:bg-secondary"
                        }`}
                      >
                        <span>{c.label}</span>
                        {c.price_delta > 0 && (
                          <span className="text-xs font-normal text-muted-foreground">+${c.price_delta.toFixed(2)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Field>
            );
          })}

          <Field label="Notes">
            <textarea value={freeText} onChange={(e) => setFreeText(e.target.value)} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <button
            onClick={() => onSave({ customer_name, drink, size, notes: encodeSelectionToNotes(groups, selection, freeText) })}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Save className="h-4 w-4" /> Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function AuditDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  useEffect(() => {
    supabase
      .from("order_audit_log")
      .select("id,from_status,to_status,note,created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setEntries((data as AuditEntry[]) ?? []));
  }, [order.id]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-background sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <div className="font-semibold">Audit log</div>
            <div className="text-xs text-muted-foreground">{order.customer_name} · #{order.id.slice(0, 8)}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {entries === null ? (
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
          ) : entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No status changes yet.</p>
          ) : (
            <ol className="space-y-3">
              {entries.map((e) => (
                <li key={e.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2 text-sm">
                    {e.from_status && <span className="capitalize text-muted-foreground">{e.from_status}</span>}
                    {e.from_status && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    <span className="font-medium capitalize text-primary">{e.to_status}</span>
                  </div>
                  {e.note && <p className="mt-1 text-sm italic">"{e.note}"</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "ready" || status === "done"
      ? "bg-primary/15 text-primary"
      : status === "cancelled"
      ? "bg-destructive/15 text-destructive"
      : "bg-secondary text-secondary-foreground";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">{text}</div>;
}

function RecentOrdersTicker({ orders }: { orders: Order[] }) {
  // Rolling queue of order timestamps within the last 60s, sorted ascending
  // (oldest first). We only ever push new timestamps when `orders` changes
  // and shift expired ones off the front — no full-array filter per tick.
  const queueRef = useRef<number[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const [recent, setRecent] = useState(0);

  // Ingest new orders into the rolling queue
  useEffect(() => {
    const cutoff = Date.now() - 60_000;
    const seen = seenRef.current;
    const queue = queueRef.current;
    let added = false;
    for (const o of orders) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      const t = new Date(o.created_at).getTime();
      if (t >= cutoff) {
        queue.push(t);
        added = true;
      }
    }
    if (added) {
      // Maintain ascending order so expiry is a cheap shift from the front
      queue.sort((a: number, b: number) => a - b);
      setRecent(queue.length);
    }
  }, [orders]);

  // Tick every second to expire timestamps that fell out of the 60s window
  useEffect(() => {
    const t = setInterval(() => {
      const cutoff = Date.now() - 60_000;
      const queue = queueRef.current;
      let removed = 0;
      while (queue.length > 0 && queue[0] < cutoff) {
        queue.shift();
        removed++;
      }
      if (removed > 0) setRecent(queue.length);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const active = recent > 0;
  return (
    <span
      key={recent}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-primary/15 text-primary animate-in fade-in zoom-in-95 duration-300"
          : "bg-secondary text-muted-foreground"
      }`}
      title="New orders in the last 60 seconds"
    >
      <Zap className={`h-3.5 w-3.5 ${active ? "animate-pulse" : ""}`} />
      <span className="tabular-nums">{recent}</span>
      <span className="hidden sm:inline">in last 60s</span>
    </span>
  );
}

// Start of week (Monday 00:00 local time)
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

type PriceMaps = {
  drinkPrice: Map<string, number>;
  // Keyed by `${drinkName}|${choiceLabel}` (both lower-cased) so the same
  // label (e.g. "2 shots") resolves to the right price for each drink.
  choicePrice: Map<string, number>;
};

function WeekPerformance({ orders }: { orders: Order[] }) {
  const [maps, setMaps] = useState<PriceMaps | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [{ data: items }, { data: choices }] = await Promise.all([
        supabase.from("menu_items").select("id,name,price"),
        supabase
          .from("option_choices")
          .select("label,price_delta,option_groups(menu_item_id)"),
      ]);
      if (!mounted) return;
      const drinkPrice = new Map<string, number>();
      const idToName = new Map<string, string>();
      for (const i of items ?? []) {
        drinkPrice.set(i.name, Number(i.price));
        idToName.set(i.id, i.name);
      }
      const choicePrice = new Map<string, number>();
      for (const c of (choices ?? []) as Array<{
        label: string;
        price_delta: number;
        option_groups: { menu_item_id: string } | null;
      }>) {
        const itemId = c.option_groups?.menu_item_id;
        const drinkName = itemId ? idToName.get(itemId) : undefined;
        if (!drinkName) continue;
        const k = `${drinkName.toLowerCase()}|${c.label.trim().toLowerCase()}`;
        choicePrice.set(k, Number(c.price_delta));
      }
      setMaps({ drinkPrice, choicePrice });
    };
    load();
    const channel = supabase
      .channel("week-perf-prices")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "option_choices" }, load)
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const inWeek = orders.filter(
      (o) => o.status !== "cancelled" && new Date(o.created_at) >= weekStart
    );
    const orderRevenue = (o: Order) => {
      let total = maps?.drinkPrice.get(o.drink) ?? 0;
      const drinkKey = o.drink.toLowerCase();
      const decoded = decodeNotes(o.notes);
      for (const sel of decoded.selections) {
        for (const lbl of sel.labels) {
          const k = `${drinkKey}|${lbl.trim().toLowerCase()}`;
          total += maps?.choicePrice.get(k) ?? 0;
        }
      }
      return total;
    };
    const weekRevenue = inWeek.reduce((s, o) => s + orderRevenue(o), 0);
    const todayOrders = inWeek.filter((o) => new Date(o.created_at) >= todayStart);
    const todayRevenue = todayOrders.reduce((s, o) => s + orderRevenue(o), 0);
    const avg = inWeek.length > 0 ? weekRevenue / inWeek.length : 0;
    return {
      weekStart,
      weekCount: inWeek.length,
      weekRevenue,
      todayCount: todayOrders.length,
      todayRevenue,
      avg,
    };
  }, [orders, maps]);

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const weekLabel = stats.weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">This week</div>
          <div className="text-sm text-muted-foreground">Since Mon {weekLabel} · excludes cancelled</div>
        </div>
        {!maps && <div className="text-xs text-muted-foreground">Loading prices…</div>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Revenue" value={fmt(stats.weekRevenue)} accent />
        <Stat label="Orders" value={String(stats.weekCount)} />
        <Stat label="Today" value={`${fmt(stats.todayRevenue)} · ${stats.todayCount}`} />
        <Stat label="Avg / order" value={fmt(stats.avg)} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function FilterBar({
  query, onQueryChange, statusFilter, onStatusChange,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  statusFilter: "all" | OrderStatus;
  onStatusChange: (v: "all" | OrderStatus) => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by name, drink, queue # or notes…"
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-9 text-sm outline-none ring-ring/30 focus:ring-2"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {(["all", ...ORDER_STATUSES] as const).map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background hover:bg-secondary"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilteredOrdersList({
  orders, query, statusFilter, onChange, onAudit, onEdit, onClearFilters,
}: {
  orders: Order[];
  query: string;
  statusFilter: "all" | OrderStatus;
  onChange: (o: Order, to: OrderStatus, note?: string) => void;
  onAudit: (o: Order) => void;
  onEdit: (o: Order) => void;
  onClearFilters: () => void;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        o.customer_name,
        o.drink,
        o.size,
        o.notes ?? "",
        o.queue_number != null ? `#${o.queue_number}` : "",
        o.queue_number != null ? String(o.queue_number) : "",
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, query, statusFilter]);

  const filtersActive = query.trim() !== "" || statusFilter !== "all";

  return (
    <>
      {filtersActive && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing <span className="font-medium text-foreground tabular-nums">{filtered.length}</span> of{" "}
            <span className="tabular-nums">{orders.length}</span>
          </span>
          <button onClick={onClearFilters} className="rounded-full border border-border px-2.5 py-1 hover:bg-secondary">
            Clear filters
          </button>
        </div>
      )}
      <div className="mt-4 space-y-3">
        {orders.length === 0 && <Empty text="No orders yet." />}
        {orders.length > 0 && filtered.length === 0 && (
          <Empty text="No orders match your filters." />
        )}
        {filtered.map((o) => (
          <OrderRow
            key={o.id}
            order={o}
            onChange={onChange}
            onAudit={() => onAudit(o)}
            onEdit={() => onEdit(o)}
          />
        ))}
      </div>
    </>
  );
}
