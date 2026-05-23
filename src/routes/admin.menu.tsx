import { createFileRoute } from "@tanstack/react-router";
import { memo, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, X, GripVertical, ArrowUp, ArrowDown, Settings2, ChevronDown, ChevronUp, Trash2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchGroupsForMenuItem, type GroupWithChoices, type OptionChoice } from "@/lib/options";

export const Route = createFileRoute("/admin/menu")({
  component: MenuAdminPage,
});

type Item = {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  sort_order: number;
};

function MenuAdminPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const itemsRes = await supabase
      .from("menu_items")
      .select("id,name,description,price,available,sort_order")
      .order("sort_order", { ascending: true });
    if (itemsRes.error) toast.error(itemsRes.error.message);
    setItems(((itemsRes.data ?? []) as Item[]).map((d) => ({ ...d, price: Number(d.price) })));
    setLoading(false);
  };
  useEffect(() => {
    load();
    // No realtime subscription on menu_items: we apply optimistic updates locally.
    // Realtime would just cause extra re-renders that fight in-flight edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = async (item: Item, patch: Partial<Item>) => {
    const next = { ...item, ...patch };
    setItems((prev) => prev.map((i) => (i.id === item.id ? next : i)));
    const { error } = await supabase.from("menu_items").update(patch).eq("id", item.id);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const remove = async (item: Item) => {
    if (!confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  const persistOrder = async (ordered: Item[]) => {
    const updates = ordered
      .map((it, idx) => ({ it, newOrder: (idx + 1) * 10 }))
      .filter(({ it, newOrder }) => it.sort_order !== newOrder);
    if (updates.length === 0) return;
    const renumbered = ordered.map((it, idx) => ({ ...it, sort_order: (idx + 1) * 10 }));
    setItems(renumbered);
    const results = await Promise.all(
      updates.map(({ it, newOrder }) =>
        supabase.from("menu_items").update({ sort_order: newOrder }).eq("id", it.id)
      )
    );
    if (results.some((r) => r.error)) {
      toast.error("Failed to save order");
      load();
    }
  };

  const moveTo = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || toIdx < 0 || toIdx >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    persistOrder(next);
  };

  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Menu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag to reorder. Expand any item to edit its customisation options. Each drink has its own independent options.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>

      {loading ? (
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted" />
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          No items yet. Click "Add item" to create your first drink.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              onDragOver={(e) => { e.preventDefault(); if (overIdx !== idx) setOverIdx(idx); }}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragIdx.current;
                dragIdx.current = null;
                setOverIdx(null);
                if (from === null) return;
                moveTo(from, idx);
              }}
              className={overIdx === idx && dragIdx.current !== null && dragIdx.current !== idx ? "rounded-2xl ring-2 ring-primary" : ""}
            >
              <ItemRow
                item={item}
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
                onUpdate={updateField}
                onDelete={remove}
                onMoveUp={() => moveTo(idx, idx - 1)}
                onMoveDown={() => moveTo(idx, idx + 1)}
                onDragStart={() => { dragIdx.current = idx; }}
                onDragEnd={() => { dragIdx.current = null; setOverIdx(null); }}
              />
            </div>
          ))}
        </div>
      )}

      {adding && (
        <AddDrawer
          existingIds={items.map((i) => i.id)}
          nextSort={(items[items.length - 1]?.sort_order ?? 0) + 10}
          onClose={() => setAdding(false)}
          onAdded={() => { setAdding(false); load(); }}
        />
      )}
    </main>
  );
}

const ItemRow = memo(function ItemRow({ item, isFirst, isLast, onUpdate, onDelete, onMoveUp, onMoveDown, onDragStart, onDragEnd }: {
  item: Item;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (item: Item, patch: Partial<Item>) => void;
  onDelete: (item: Item) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(item.name);
  const [desc, setDesc] = useState(item.description);
  const [price, setPrice] = useState(item.price.toFixed(2));
  const [groups, setGroups] = useState<GroupWithChoices[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Sync local field state when the item prop changes (e.g. after server-side change)
  useEffect(() => { setName(item.name); }, [item.name]);
  useEffect(() => { setDesc(item.description); }, [item.description]);
  useEffect(() => { setPrice(item.price.toFixed(2)); }, [item.price]);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    setGroupsLoading(true);
    fetchGroupsForMenuItem(item.id).then((g) => {
      if (cancelled) return;
      setGroups(g);
      setGroupsLoading(false);
    });
    return () => { cancelled = true; };
  }, [expanded, item.id]);

  // Optimistic local mutators — no refetch after writes.
  const patchGroup = (groupId: string, patch: Partial<GroupWithChoices>) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g)));
  };
  const removeGroupLocal = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };
  const patchChoice = (groupId: string, choiceId: string, patch: Partial<OptionChoice>) => {
    setGroups((prev) => prev.map((g) =>
      g.id !== groupId ? g : { ...g, choices: g.choices.map((c) => (c.id === choiceId ? { ...c, ...patch } : c)) }
    ));
  };
  const removeChoiceLocal = (groupId: string, choiceId: string) => {
    setGroups((prev) => prev.map((g) =>
      g.id !== groupId ? g : { ...g, choices: g.choices.filter((c) => c.id !== choiceId) }
    ));
  };
  const addChoiceLocal = (groupId: string, choice: OptionChoice) => {
    setGroups((prev) => prev.map((g) =>
      g.id !== groupId ? g : { ...g, choices: [...g.choices, choice] }
    ));
  };

  const addGroup = async () => {
    const nextSort = (groups[groups.length - 1]?.sort_order ?? 0) + 10;
    const { data, error } = await supabase.from("option_groups").insert({
      menu_item_id: item.id,
      name: "New option group",
      selection_type: "single",
      required: false,
      sort_order: nextSort,
    }).select("*").single();
    if (error) { toast.error(error.message); return; }
    if (data) setGroups((prev) => [...prev, { ...(data as any), choices: [] }]);
  };

  const addPresetGroup = async (preset: "milk" | "espresso") => {
    // Avoid duplicates
    if (groups.some((g) => g.name.toLowerCase() === (preset === "milk" ? "milk" : "espresso shots"))) {
      toast.error(`${preset === "milk" ? "Milk" : "Espresso"} group already exists`);
      return;
    }
    const nextSort = (groups[groups.length - 1]?.sort_order ?? 0) + 10;
    const config = preset === "milk"
      ? {
          name: "Milk",
          selection_type: "single" as const,
          required: true,
          choices: [
            { label: "Fresh milk", price_delta: 0, is_default: true },
            { label: "Oat milk", price_delta: 1.0, is_default: false },
          ],
        }
      : {
          name: "Espresso shots",
          selection_type: "single" as const,
          required: true,
          choices: [
            { label: "1 shot", price_delta: 0, is_default: true },
            { label: "2 shots", price_delta: 1.0, is_default: false },
            { label: "3 shots", price_delta: 2.0, is_default: false },
            { label: "4 shots", price_delta: 3.0, is_default: false },
          ],
        };

    const { data: groupData, error: groupErr } = await supabase.from("option_groups").insert({
      menu_item_id: item.id,
      name: config.name,
      selection_type: config.selection_type,
      required: config.required,
      sort_order: nextSort,
    }).select("*").single();
    if (groupErr || !groupData) { toast.error(groupErr?.message ?? "Failed to add group"); return; }

    const choiceRows = config.choices.map((c, idx) => ({
      group_id: (groupData as any).id,
      label: c.label,
      price_delta: c.price_delta,
      is_default: c.is_default,
      sort_order: (idx + 1) * 10,
    }));
    const { data: choicesData, error: choicesErr } = await supabase
      .from("option_choices").insert(choiceRows).select("*");
    if (choicesErr) { toast.error(choicesErr.message); return; }

    const choices: OptionChoice[] = ((choicesData ?? []) as any[])
      .map((c) => ({ ...c, price_delta: Number(c.price_delta) }))
      .sort((a, b) => a.sort_order - b.sort_order);
    setGroups((prev) => [...prev, { ...(groupData as any), choices }]);
    toast.success(`${config.name} options added`);
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      {/* Collapsed header — click to expand */}
      <div className="flex items-center gap-2 p-3">
        <span
          draggable
          onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
          onDragEnd={onDragEnd}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <div className="flex flex-col">
          <button onClick={onMoveUp} disabled={isFirst} title="Move up" className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent">
            <ArrowUp className="h-3 w-3" />
          </button>
          <button onClick={onMoveDown} disabled={isLast} title="Move down" className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent">
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-secondary/50"
        >
          <span className="flex-1 truncate text-sm font-medium">{item.name || <span className="text-muted-foreground italic">Untitled</span>}</span>
          <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[260px]">{item.description}</span>
          <span className="text-sm font-semibold tabular-nums">${item.price.toFixed(2)}</span>
          {!item.available && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Hidden</span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-5">
          {/* Item details */}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Item name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => name !== item.name && onUpdate(item, { name: name.trim() })}
                  placeholder="Drink name"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  onBlur={() => desc !== item.description && onUpdate(item, { description: desc.trim() })}
                  placeholder="Description"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 sm:min-w-[140px]">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Price</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    onBlur={() => {
                      const v = Number(price);
                      if (!isNaN(v) && v !== item.price) onUpdate(item, { price: v });
                      else setPrice(item.price.toFixed(2));
                    }}
                    className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-right text-sm font-medium"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={item.available} onChange={(e) => onUpdate(item, { available: e.target.checked })} />
                <span className={item.available ? "text-primary font-medium" : "text-muted-foreground"}>
                  {item.available ? "Visible" : "Hidden"}
                </span>
              </label>
              <button onClick={() => onDelete(item)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-destructive hover:bg-destructive/10">
                <X className="h-3 w-3" /> Delete item
              </button>
            </div>
          </div>

          {/* Customisation section */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <Settings2 className="h-4 w-4 text-primary" /> Customisation
              </div>
              <span className="text-[11px] text-muted-foreground">Edits here only affect this drink.</span>
            </div>

            {groupsLoading ? (
              <div className="h-16 animate-pulse rounded-lg bg-muted/50" />
            ) : groups.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No customisation groups yet — add one below.</p>
            ) : (
              groups.map((g) => (
                <GroupEditor
                  key={g.id}
                  group={g}
                  onPatch={(patch) => patchGroup(g.id, patch)}
                  onDeleted={() => removeGroupLocal(g.id)}
                  onChoicePatch={(choiceId, patch) => patchChoice(g.id, choiceId, patch)}
                  onChoiceDeleted={(choiceId) => removeChoiceLocal(g.id, choiceId)}
                  onChoiceAdded={(choice) => addChoiceLocal(g.id, choice)}
                />
              ))
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={addGroup}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-secondary"
              >
                <Plus className="h-3 w-3" /> Add option group
              </button>
              <span className="text-[11px] text-muted-foreground">Quick add:</span>
              <button
                onClick={() => addPresetGroup("milk")}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary"
              >
                <Plus className="h-3 w-3" /> Milk
              </button>
              <button
                onClick={() => addPresetGroup("espresso")}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary"
              >
                <Plus className="h-3 w-3" /> Espresso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

const GroupEditor = memo(function GroupEditor({ group, onPatch, onDeleted, onChoicePatch, onChoiceDeleted, onChoiceAdded }: {
  group: GroupWithChoices;
  onPatch: (patch: Partial<GroupWithChoices>) => void;
  onDeleted: () => void;
  onChoicePatch: (choiceId: string, patch: Partial<OptionChoice>) => void;
  onChoiceDeleted: (choiceId: string) => void;
  onChoiceAdded: (choice: OptionChoice) => void;
}) {
  const [name, setName] = useState(group.name);
  useEffect(() => { setName(group.name); }, [group.name]);

  const updateGroup = async (patch: Partial<GroupWithChoices>) => {
    const prev = { name: group.name, selection_type: group.selection_type, required: group.required };
    onPatch(patch); // optimistic
    const { choices: _c, ...rest } = patch as any;
    const { error } = await supabase.from("option_groups").update(rest).eq("id", group.id);
    if (error) {
      toast.error(error.message);
      onPatch(prev as any); // rollback
    }
  };

  const deleteGroup = async () => {
    if (!confirm(`Delete option group "${group.name}" from this drink?`)) return;
    const { error } = await supabase.from("option_groups").delete().eq("id", group.id);
    if (error) { toast.error(error.message); return; }
    onDeleted();
    toast.success("Group deleted");
  };

  const addChoice = async () => {
    const nextSort = (group.choices[group.choices.length - 1]?.sort_order ?? 0) + 10;
    const { data, error } = await supabase.from("option_choices").insert({
      group_id: group.id,
      label: "New option",
      price_delta: 0,
      sort_order: nextSort,
    }).select("*").single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      const choice: OptionChoice = { ...(data as any), price_delta: Number((data as any).price_delta) };
      onChoiceAdded(choice);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      {/* Group header */}
      <div className="flex flex-wrap items-center gap-2 bg-secondary/40 px-3 py-2 border-b border-border">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== group.name && updateGroup({ name: name.trim() })}
          placeholder="Group name (e.g. Espresso shots)"
          className="flex-1 min-w-[160px] rounded-md border border-input bg-background px-2 py-1.5 text-sm font-semibold"
        />
        <select
          value={group.selection_type}
          onChange={(e) => updateGroup({ selection_type: e.target.value as "single" | "multi" })}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        >
          <option value="single">Pick one</option>
          <option value="multi">Pick many</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={group.required} onChange={(e) => updateGroup({ required: e.target.checked })} />
          Required
        </label>
        <button onClick={deleteGroup} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10">
          <Trash2 className="h-3 w-3" /> Delete group
        </button>
      </div>

      {/* Choices list */}
      <div className="space-y-1.5 p-3">
        {group.choices.length === 0 ? (
          <div className="text-xs italic text-muted-foreground">No options yet — add one below.</div>
        ) : (
          group.choices.map((c) => (
            <ChoiceRow
              key={c.id}
              choice={c}
              onPatch={(patch) => onChoicePatch(c.id, patch)}
              onDeleted={() => onChoiceDeleted(c.id)}
            />
          ))
        )}
        <button onClick={addChoice} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-primary hover:bg-primary/5">
          <Plus className="h-3 w-3" /> Add option
        </button>
      </div>
    </div>
  );
});

const ChoiceRow = memo(function ChoiceRow({ choice, onPatch, onDeleted }: {
  choice: OptionChoice;
  onPatch: (patch: Partial<OptionChoice>) => void;
  onDeleted: () => void;
}) {
  const [label, setLabel] = useState(choice.label);
  const [price, setPrice] = useState(choice.price_delta.toFixed(2));
  useEffect(() => { setLabel(choice.label); }, [choice.label]);
  useEffect(() => { setPrice(choice.price_delta.toFixed(2)); }, [choice.price_delta]);

  const update = async (patch: Partial<OptionChoice>) => {
    const prev: Partial<OptionChoice> = {
      label: choice.label, price_delta: choice.price_delta, is_default: choice.is_default,
    };
    onPatch(patch); // optimistic
    const { error } = await supabase.from("option_choices").update(patch).eq("id", choice.id);
    if (error) { toast.error(error.message); onPatch(prev); }
  };
  const del = async () => {
    if (!confirm("Delete this choice?")) return;
    const { error } = await supabase.from("option_choices").delete().eq("id", choice.id);
    if (error) { toast.error(error.message); return; }
    onDeleted();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-1.5">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => label.trim() && label !== choice.label && update({ label: label.trim() })}
        placeholder="Label"
        className="flex-1 min-w-[120px] rounded-md border border-input bg-background px-2 py-1 text-xs"
      />
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-muted-foreground">+$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => {
            const v = Number(price);
            if (!isNaN(v) && v !== choice.price_delta) update({ price_delta: v });
            else setPrice(choice.price_delta.toFixed(2));
          }}
          className="w-16 rounded-md border border-input bg-background px-2 py-1 text-right text-xs tabular-nums"
        />
      </div>
      <label className="flex items-center gap-1 text-[11px]">
        <input type="checkbox" checked={choice.is_default} onChange={(e) => update({ is_default: e.target.checked })} />
        <Check className="h-3 w-3" /> Default
      </label>
      <button onClick={del} className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete choice">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
});

function AddDrawer({ existingIds, nextSort, onClose, onAdded }: {
  existingIds: string[];
  nextSort: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("5.00");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) { toast.error("Enter a name"); return; }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) { toast.error("Invalid price"); return; }
    let id = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!id) { toast.error("Name must contain letters or numbers"); return; }
    let suffix = 2;
    const baseId = id;
    while (existingIds.includes(id)) { id = `${baseId}-${suffix++}`; }

    setBusy(true);
    const { error } = await supabase.from("menu_items").insert({
      id,
      name: trimmedName,
      description: desc.trim(),
      price: numPrice,
      available: true,
      sort_order: nextSort,
    });
    if (error) { setBusy(false); toast.error(error.message); return; }
    setBusy(false);
    toast.success("Added — expand the item to add customisation options.");
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl border border-border bg-background sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background p-4">
          <div className="font-semibold">Add menu item</div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Price ($)</label>
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <p className="text-xs text-muted-foreground">
            Customisation options (espresso shots, milk, syrups…) are configured per drink — add them after creating this item by expanding it on the menu.
          </p>
          <button onClick={submit} disabled={busy} className="mt-2 w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {busy ? "…" : "Add item"}
          </button>
        </div>
      </div>
    </div>
  );
}
