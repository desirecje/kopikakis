// Colour-codes module pills by their subject prefix.
// e.g. CS2030S -> green, IS1108 -> amber, BT1101 -> blue.

type Palette = { bg: string; text: string };

// A spread of distinct, theme-friendly palettes.
const PALETTES = {
  green:     { bg: "bg-[#B8E0D2]", text: "text-[#1a6b52]" },
  amber:     { bg: "bg-[#F5D48A]", text: "text-[#7A4F00]" },
  blue:      { bg: "bg-[#AECBEB]", text: "text-[#1c4a73]" },
  purple:    { bg: "bg-[#D6BDE8]", text: "text-[#5a2d78]" },
  orange:    { bg: "bg-[#F5C6A5]", text: "text-[#8a3f12]" },
  rose:      { bg: "bg-[#E8C6C6]", text: "text-[#7a3030]" },
  teal:      { bg: "bg-[#A8D8D8]", text: "text-[#1d5e5e]" },
  lime:      { bg: "bg-[#CFE3A3]", text: "text-[#4d6118]" },
  pink:      { bg: "bg-[#F2C6DC]", text: "text-[#8a2f5c]" },
  indigo:    { bg: "bg-[#C2C2EC]", text: "text-[#36369c]" },
  tan:       { bg: "bg-[#EBD9AE]", text: "text-[#6b551c]" },
  cyan:      { bg: "bg-[#AEE0EB]", text: "text-[#155e6b]" },
  coral:     { bg: "bg-[#F5B8A8]", text: "text-[#8a311c]" },
  sage:      { bg: "bg-[#C6E8C9]", text: "text-[#2d6b34]" },
  gold:      { bg: "bg-[#EAD08A]", text: "text-[#6b4f00]" },
} as const;

// Prefix -> palette. Covers the most common NUS module prefixes.
const PREFIX_COLORS: Record<string, Palette> = {
  // Computing
  CS: PALETTES.green,
  CG: PALETTES.green,
  IS: PALETTES.amber,
  BT: PALETTES.blue,
  BZA: PALETTES.blue,
  // Math & Stats
  MA: PALETTES.purple,
  ST: PALETTES.indigo,
  QF: PALETTES.indigo,
  // Engineering
  EE: PALETTES.orange,
  ME: PALETTES.orange,
  CE: PALETTES.coral,
  BN: PALETTES.coral,
  MLE: PALETTES.coral,
  EG: PALETTES.orange,
  // Sciences
  LSM: PALETTES.sage,
  CM: PALETTES.sage,
  PC: PALETTES.purple,
  PL: PALETTES.tan,
  FST: PALETTES.lime,
  // Business
  ACC: PALETTES.blue,
  BSP: PALETTES.blue,
  MKT: PALETTES.cyan,
  FIN: PALETTES.teal,
  DAO: PALETTES.cyan,
  MNO: PALETTES.teal,
  // FASS
  EC: PALETTES.tan,
  PS: PALETTES.tan,
  SC: PALETTES.tan,
  PS_: PALETTES.tan,
  GL: PALETTES.gold,
  HY: PALETTES.gold,
  EN: PALETTES.pink,
  NM: PALETTES.pink,
  SW: PALETTES.rose,
  PH: PALETTES.indigo,
  GE: PALETTES.rose,    // Geography / Gen-Ed Geog
  // University-wide pillars (General Education) — give each its own colour
  GEA: PALETTES.rose,
  GEC: PALETTES.coral,
  GEN: PALETTES.pink,
  GEI: PALETTES.gold,
  GES: PALETTES.lime,
  GEX: PALETTES.cyan,
  // Common standalone gen-ed / language / cross-faculty prefixes
  UTP: PALETTES.teal,   // UTown Programme (e.g. UTP1001P)
  UTC: PALETTES.teal,
  UTS: PALETTES.teal,
  HSI: PALETTES.lime,   // Integrated modules
  HSH: PALETTES.gold,   // Humanities
  HSA: PALETTES.coral,
  HSS: PALETTES.pink,
  HSB: PALETTES.sage,
  IDS: PALETTES.cyan,
  DTK: PALETTES.indigo,
  // Law / Medicine / Design
  LAW: PALETTES.rose,
  LC: PALETTES.rose,
  MED: PALETTES.coral,
  NUR: PALETTES.pink,
  AR: PALETTES.gold,    // Architecture
  ID: PALETTES.cyan,    // Industrial Design
  MUA: PALETTES.purple, // Music
  MUL: PALETTES.purple,
  // Languages
  LA: PALETTES.pink,
  LScrap: PALETTES.pink,
};

const DEFAULT_COLOR: Palette = { bg: "bg-[#D3CFC6]", text: "text-[#4A4035]" };

// Extract leading letters from a module code (CS2030S -> "CS", UTP1001P -> "UTP")
function prefixOf(code: string): string {
  const match = code.toUpperCase().match(/^[A-Z]+/);
  return match ? match[0] : "";
}

// Deterministic fallback: hash the prefix to one of the palettes so even
// unmapped prefixes get a consistent, non-grey colour.
function hashToPalette(prefix: string): Palette {
  let hash = 0;
  for (let i = 0; i < prefix.length; i++) {
    hash = (hash * 31 + prefix.charCodeAt(i)) % 100000;
  }
  const values = Object.values(PALETTES);
  return values[hash % values.length];
}

export function moduleColor(code: string): Palette {
  const prefix = prefixOf(code);
  if (!prefix) return DEFAULT_COLOR;
  // Try full prefix, then progressively shorter (UTP -> UT -> U)
  for (let len = prefix.length; len >= 2; len--) {
    const key = prefix.slice(0, len);
    if (PREFIX_COLORS[key]) return PREFIX_COLORS[key];
  }
  // Unmapped — give it a stable colour instead of grey
  return hashToPalette(prefix);
}

export function modulePillClass(code: string): string {
  const { bg, text } = moduleColor(code);
  return `${bg} ${text} text-[10px] font-medium px-2 py-0.5 rounded-full`;
}
