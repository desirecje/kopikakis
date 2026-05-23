import { describe, it, expect } from "vitest";
import { decodeNotes, encodeSelectionToNotes, type GroupWithChoices } from "./options";

const tempGroup: GroupWithChoices = {
  id: "g-temp",
  name: "Temperature",
  selection_type: "single",
  required: true,
  sort_order: 0,
  choices: [
    { id: "c-hot", group_id: "g-temp", label: "Hot", price_delta: 0, is_default: true, sort_order: 0 },
    { id: "c-iced", group_id: "g-temp", label: "Iced", price_delta: 0, is_default: false, sort_order: 1 },
  ],
};

const shotsGroup: GroupWithChoices = {
  id: "g-shots",
  name: "Espresso shots",
  selection_type: "single",
  required: true,
  sort_order: 1,
  choices: [
    { id: "s1", group_id: "g-shots", label: "1 shot", price_delta: 0, is_default: true, sort_order: 0 },
    { id: "s2", group_id: "g-shots", label: "2 shots", price_delta: 1, is_default: false, sort_order: 1 },
    { id: "s3", group_id: "g-shots", label: "3 shots", price_delta: 2, is_default: false, sort_order: 2 },
  ],
};

const milkGroup: GroupWithChoices = {
  id: "g-milk",
  name: "Milk",
  selection_type: "multi",
  required: false,
  sort_order: 2,
  choices: [
    { id: "m1", group_id: "g-milk", label: "Fresh milk", price_delta: 0, is_default: false, sort_order: 0 },
    { id: "m2", group_id: "g-milk", label: "Oat milk", price_delta: 1, is_default: false, sort_order: 1 },
  ],
};

function findGroup(d: ReturnType<typeof decodeNotes>, name: string) {
  return d.selections.find((s) => s.groupName === name);
}

describe("decodeNotes", () => {
  it("returns empty result for null/empty input", () => {
    expect(decodeNotes(null)).toEqual({ selections: [], freeText: "" });
    expect(decodeNotes("")).toEqual({ selections: [], freeText: "" });
  });

  it("treats plain text without brackets as free text", () => {
    const d = decodeNotes("Extra hot please");
    expect(d.selections).toEqual([]);
    expect(d.freeText).toBe("Extra hot please");
  });

  it("extracts a single Temperature group", () => {
    const d = decodeNotes("[Temperature: Hot]");
    expect(findGroup(d, "Temperature")?.labels).toEqual(["Hot"]);
    expect(d.freeText).toBe("");
  });

  it("extracts Iced temperature", () => {
    const d = decodeNotes("[Temperature: Iced]");
    expect(findGroup(d, "Temperature")?.labels).toEqual(["Iced"]);
  });

  it("extracts Temperature and Espresso shots together", () => {
    const d = decodeNotes("[Temperature: Hot] [Espresso shots: 2 shots]");
    expect(findGroup(d, "Temperature")?.labels).toEqual(["Hot"]);
    expect(findGroup(d, "Espresso shots")?.labels).toEqual(["2 shots"]);
    expect(d.freeText).toBe("");
  });

  it("extracts multi-choice groups with comma-separated labels", () => {
    const d = decodeNotes("[Milk: Fresh milk, Oat milk]");
    expect(findGroup(d, "Milk")?.labels).toEqual(["Fresh milk", "Oat milk"]);
  });

  it("preserves free text after the pipe separator", () => {
    const d = decodeNotes("[Temperature: Iced] [Espresso shots: 3 shots] | no sugar please");
    expect(findGroup(d, "Temperature")?.labels).toEqual(["Iced"]);
    expect(findGroup(d, "Espresso shots")?.labels).toEqual(["3 shots"]);
    expect(d.freeText).toBe("no sugar please");
  });

  it("preserves free text even without the pipe separator", () => {
    const d = decodeNotes("[Temperature: Hot] extra hot");
    expect(findGroup(d, "Temperature")?.labels).toEqual(["Hot"]);
    expect(d.freeText).toBe("extra hot");
  });

  it("trims whitespace inside group labels", () => {
    const d = decodeNotes("[Espresso shots:   2 shots  ]");
    expect(findGroup(d, "Espresso shots")?.labels).toEqual(["2 shots"]);
  });

  it("trims whitespace around comma-separated labels", () => {
    const d = decodeNotes("[Milk:  Fresh milk ,  Oat milk ]");
    expect(findGroup(d, "Milk")?.labels).toEqual(["Fresh milk", "Oat milk"]);
  });

  it("ignores empty labels in comma-separated lists", () => {
    const d = decodeNotes("[Milk: Fresh milk, , Oat milk]");
    expect(findGroup(d, "Milk")?.labels).toEqual(["Fresh milk", "Oat milk"]);
  });

  it("handles many shots variants (1/2/3)", () => {
    for (const n of [1, 2, 3]) {
      const d = decodeNotes(`[Espresso shots: ${n} shot${n === 1 ? "" : "s"}]`);
      expect(findGroup(d, "Espresso shots")?.labels[0]).toMatch(new RegExp(`^${n} shot`));
    }
  });
});

describe("encodeSelectionToNotes ↔ decodeNotes round-trip", () => {
  const groups = [tempGroup, shotsGroup, milkGroup];

  it("round-trips Temperature + shots + free text", () => {
    const encoded = encodeSelectionToNotes(
      groups,
      { [tempGroup.id]: ["Hot"], [shotsGroup.id]: ["2 shots"], [milkGroup.id]: [] },
      "no sugar"
    );
    expect(encoded).toBe("[Temperature: Hot] [Espresso shots: 2 shots] | no sugar");

    const decoded = decodeNotes(encoded);
    expect(findGroup(decoded, "Temperature")?.labels).toEqual(["Hot"]);
    expect(findGroup(decoded, "Espresso shots")?.labels).toEqual(["2 shots"]);
    expect(decoded.freeText).toBe("no sugar");
  });

  it("round-trips a multi-select Milk group", () => {
    const encoded = encodeSelectionToNotes(
      groups,
      { [tempGroup.id]: ["Iced"], [shotsGroup.id]: ["1 shot"], [milkGroup.id]: ["Fresh milk", "Oat milk"] },
      ""
    );
    const decoded = decodeNotes(encoded);
    expect(findGroup(decoded, "Milk")?.labels).toEqual(["Fresh milk", "Oat milk"]);
    expect(decoded.freeText).toBe("");
  });

  it("returns null when nothing is selected and no free text", () => {
    const encoded = encodeSelectionToNotes(groups, {}, "");
    expect(encoded).toBeNull();
  });

  it("returns just the free text when no groups are selected", () => {
    const encoded = encodeSelectionToNotes(groups, {}, "  surprise me  ");
    expect(encoded).toBe("surprise me");
    const decoded = decodeNotes(encoded);
    expect(decoded.selections).toEqual([]);
    expect(decoded.freeText).toBe("surprise me");
  });

  it("skips groups with empty selections in the encoded output", () => {
    const encoded = encodeSelectionToNotes(
      groups,
      { [tempGroup.id]: ["Hot"], [shotsGroup.id]: [], [milkGroup.id]: [] },
      ""
    );
    expect(encoded).toBe("[Temperature: Hot]");
  });
});
