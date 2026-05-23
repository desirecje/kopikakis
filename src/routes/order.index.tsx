import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { newOwnerToken, rememberOrderToken } from "@/lib/order-token";
import { useMenuItems } from "@/lib/menu";
import {
  defaultSelection,
  encodeSelectionToNotes,
  selectionExtras,
  useGroupsForMenuItem,
  type GroupWithChoices,
  type Selection,
} from "@/lib/options";

const searchSchema = z.object({
  drink: z.string().optional(),
});

export const Route = createFileRoute("/order/")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Order — RC4 Coffee Academy" }] }),
  component: OrderPage,
});

function OrderPage() {
  const { drink: initialDrink } = Route.useSearch();
  const navigate = useNavigate();
  const menuResult = useMenuItems();
  const drinks = menuResult?.items ?? [];
  const menuLoading = menuResult?.loading ?? true;
  const [name, setName] = useState("");
  const [drink, setDrink] = useState<string>(initialDrink ?? "");
  const [temperature, setTemperature] = useState<"Iced" | "Hot">("Hot");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Default selection once menu loads
  useEffect(() => {
    if (!drink && drinks.length > 0) setDrink(drinks[0].id);
  }, [drinks, drink]);

  const selected = drinks.find((d) => d.id === drink) ?? drinks[0];
  const { groups, loading: groupsLoading } = useGroupsForMenuItem(selected?.id ?? null);

  const [selection, setSelection] = useState<Selection>({});
  // Reset selection when groups change (new drink picked)
  useEffect(() => {
    setSelection(defaultSelection(groups));
  }, [groups]);

  const extras = useMemo(() => selectionExtras(groups, selection), [groups, selection]);
  const total = (selected?.price ?? 0) + extras;

  const toggleChoice = (group: GroupWithChoices, label: string) => {
    setSelection((prev) => {
      const current = prev[group.id] ?? [];
      if (group.selection_type === "single") {
        return { ...prev, [group.id]: current[0] === label && !group.required ? [] : [label] };
      }
      return {
        ...prev,
        [group.id]: current.includes(label) ? current.filter((l) => l !== label) : [...current, label],
      };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.error("Pick a drink");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    // Validate required groups
    for (const g of groups) {
      if (g.required && (selection[g.id]?.length ?? 0) === 0) {
        toast.error(`Pick a ${g.name.toLowerCase()}`);
        return;
      }
    }
    const combinedNotes = encodeSelectionToNotes(groups, selection, notes);
    const ownerToken = newOwnerToken();
    setSubmitting(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name: name.trim().slice(0, 80),
        drink: selected.name,
        size: temperature,
        notes: combinedNotes,
        owner_token: ownerToken,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast.error("Could not place order. Try again.");
      return;
    }
    rememberOrderToken(data.id, ownerToken);
    navigate({ to: "/order/confirmed", search: { id: data.id } });
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-semibold">Place your order</h1>
      <p className="mt-2 text-muted-foreground">Pay at pickup. Check your order status in the Status Tab.</p>

      <form onSubmit={submit} className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <Field label="Your Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full rounded-lg border border-input bg-background px-4 py-2.5 outline-none ring-ring/30 focus:ring-2"
            placeholder="E.g. Des"
          />
        </Field>

        <Field label="Drink">
          <div className="grid gap-2 sm:grid-cols-2">
            {menuLoading && <div className="text-sm text-muted-foreground sm:col-span-2">Loading menu…</div>}
            {!menuLoading && drinks.length === 0 && (
              <div className="text-sm text-muted-foreground sm:col-span-2">No drinks available right now.</div>
            )}
            {drinks.map((d) => (
              <label
                key={d.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                  drink === d.id ? "border-primary bg-secondary" : "border-border hover:border-primary/40"
                }`}
              >
                <span className="font-medium">{d.name}</span>
                <span className="text-sm text-muted-foreground">${d.price.toFixed(2)}</span>
                <input
                  type="radio"
                  name="drink"
                  value={d.id}
                  checked={drink === d.id}
                  onChange={() => setDrink(d.id)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </Field>

        <Field label="Temperature">
          <div className="flex gap-2">
            {(["Iced", "Hot"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTemperature(t)}
                className={`flex-1 rounded-lg border px-4 py-2.5 font-medium transition-colors ${
                  temperature === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        {!groupsLoading &&
          groups.map((g) => {
            const current = selection[g.id] ?? [];
            const hint = g.choices.some((c) => c.price_delta > 0)
              ? g.choices
                  .filter((c) => c.price_delta > 0)
                  .map((c) => `${c.label} +$${c.price_delta.toFixed(2)}`)
                  .join(" · ")
              : undefined;
            return (
              <Field key={g.id} label={g.name + (g.required ? "" : " (optional)")} hint={hint}>
                <div className={`grid gap-2 ${g.choices.length > 2 ? "sm:grid-cols-2" : "grid-cols-2"}`}>
                  {g.choices.map((c) => {
                    const active = current.includes(c.label);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => toggleChoice(g, c.label)}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-left font-medium transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <span>{c.label}</span>
                        {c.price_delta > 0 && (
                          <span
                            className={`text-xs font-normal ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                          >
                            +${c.price_delta.toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Field>
            );
          })}

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Extra hot, light ice, etc."
            className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2.5 outline-none ring-ring/30 focus:ring-2"
          />
        </Field>

        {selected && (
          <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{selected.name}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="inline-flex rounded-full bg-background px-2 py-0.5 text-xs font-medium">
                    {temperature}
                  </span>
                  {groups.flatMap((g) =>
                    (selection[g.id] ?? []).map((label) => (
                      <span
                        key={`${g.id}-${label}`}
                        className="inline-flex rounded-full bg-background px-2 py-0.5 text-xs font-medium"
                      >
                        {label}
                      </span>
                    )),
                  )}
                </div>
              </div>
              <span className="tabular-nums text-muted-foreground">${selected.price.toFixed(2)}</span>
            </div>
            {groups.map((g) =>
              (selection[g.id] ?? []).map((label) => {
                const c = g.choices.find((ch) => ch.label === label);
                if (!c || c.price_delta === 0) return null;
                return (
                  <div key={`extra-${g.id}-${label}`} className="mt-1 flex justify-between">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="tabular-nums">+${c.price_delta.toFixed(2)}</span>
                  </div>
                );
              }),
            )}
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-medium">
              <span>Total</span>
              <span className="tabular-nums">${total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Placing order..." : selected ? `Order ${selected.name} ($${total.toFixed(2)})` : "Order"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label className="block text-sm font-medium">{label}</label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
