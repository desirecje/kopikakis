// Admin-managed customization option groups (Milk, Shots, Syrups, etc.)
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OptionGroup = {
  id: string;
  name: string;
  selection_type: "single" | "multi";
  required: boolean;
  sort_order: number;
};

export type OptionChoice = {
  id: string;
  group_id: string;
  label: string;
  price_delta: number;
  is_default: boolean;
  sort_order: number;
};

export type GroupWithChoices = OptionGroup & { choices: OptionChoice[] };

// Selection state: groupId -> array of choice labels (single-select = length 0 or 1)
export type Selection = Record<string, string[]>;

export async function fetchAllOptions(): Promise<{ groups: GroupWithChoices[] }> {
  const [{ data: groups }, { data: choices }] = await Promise.all([
    supabase.from("option_groups").select("*").order("sort_order"),
    supabase.from("option_choices").select("*").order("sort_order"),
  ]);
  const byGroup: Record<string, OptionChoice[]> = {};
  ((choices ?? []) as any[]).forEach((c) => {
    const choice: OptionChoice = { ...c, price_delta: Number(c.price_delta) };
    (byGroup[choice.group_id] ||= []).push(choice);
  });
  const out: GroupWithChoices[] = ((groups ?? []) as OptionGroup[]).map((g) => ({
    ...g,
    choices: byGroup[g.id] ?? [],
  }));
  return { groups: out };
}

export async function fetchGroupsForMenuItem(menuItemId: string): Promise<GroupWithChoices[]> {
  const { data: groups } = await supabase
    .from("option_groups")
    .select("*")
    .eq("menu_item_id", menuItemId)
    .order("sort_order");
  const ids = ((groups ?? []) as OptionGroup[]).map((g) => g.id);
  if (ids.length === 0) return [];
  const { data: choices } = await supabase
    .from("option_choices")
    .select("*")
    .in("group_id", ids)
    .order("sort_order");
  const byGroup: Record<string, OptionChoice[]> = {};
  ((choices ?? []) as any[]).forEach((c) => {
    const choice: OptionChoice = { ...c, price_delta: Number(c.price_delta) };
    (byGroup[choice.group_id] ||= []).push(choice);
  });
  return ((groups ?? []) as OptionGroup[]).map((g) => ({ ...g, choices: byGroup[g.id] ?? [] }));
}

export function useGroupsForMenuItem(menuItemId: string | null | undefined) {
  const [groups, setGroups] = useState<GroupWithChoices[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (!menuItemId) { setGroups([]); setLoading(false); return; }
    setLoading(true);
    fetchGroupsForMenuItem(menuItemId).then((g) => {
      if (!cancelled) { setGroups(g); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [menuItemId]);
  return { groups, loading };
}

export function defaultSelection(groups: GroupWithChoices[]): Selection {
  const sel: Selection = {};
  for (const g of groups) {
    const defaults = g.choices.filter((c) => c.is_default).map((c) => c.label);
    if (g.selection_type === "single") {
      sel[g.id] = defaults.length > 0 ? [defaults[0]] : (g.required && g.choices[0] ? [g.choices[0].label] : []);
    } else {
      sel[g.id] = defaults;
    }
  }
  return sel;
}

export function selectionExtras(groups: GroupWithChoices[], selection: Selection): number {
  let total = 0;
  for (const g of groups) {
    const labels = selection[g.id] ?? [];
    for (const c of g.choices) {
      if (labels.includes(c.label)) total += c.price_delta;
    }
  }
  return total;
}

// Encode selection into the orders.notes column.
// Format: "[GroupA: choiceA, choiceB] [GroupB: choiceC] | free text"
const PREFIX_RE = /^(\s*\[[^\]]+\])+\s*(\|\s*)?/;

export function encodeSelectionToNotes(
  groups: GroupWithChoices[],
  selection: Selection,
  freeText: string
): string | null {
  const parts: string[] = [];
  for (const g of groups) {
    const labels = (selection[g.id] ?? []).filter(Boolean);
    if (labels.length === 0) continue;
    parts.push(`[${g.name}: ${labels.join(", ")}]`);
  }
  const ft = freeText.trim();
  const encoded = parts.join(" ");
  if (encoded && ft) return `${encoded} | ${ft}`;
  if (encoded) return encoded;
  return ft || null;
}

export type DecodedNotes = {
  selections: Array<{ groupName: string; labels: string[] }>;
  freeText: string;
};

export function decodeNotes(notes: string | null): DecodedNotes {
  if (!notes) return { selections: [], freeText: "" };
  const selections: Array<{ groupName: string; labels: string[] }> = [];
  const re = /\[([^:\]]+):\s*([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(notes)) !== null) {
    selections.push({
      groupName: m[1].trim(),
      labels: m[2].split(",").map((s) => s.trim()).filter(Boolean),
    });
  }
  let freeText = notes.replace(PREFIX_RE, "").trim();
  // Fallback: if there were no encoded brackets, treat whole string as free text
  if (selections.length === 0) freeText = notes.trim();
  return { selections, freeText };
}
