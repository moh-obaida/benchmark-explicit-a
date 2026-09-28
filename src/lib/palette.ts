/** Approved pastel tokens. The primary brand value is locked. */
export const BRAND_HEX = "#EEDCEE";

export const PALETTE = [
  { id: "brand", label: "لافندر هادئ", hex: "#EEDCEE" },
  { id: "sage", label: "مريمية", hex: "#D7E3D8" },
  { id: "blue", label: "أزرق ترابي", hex: "#D5E0EA" },
  { id: "cream", label: "كريمي", hex: "#F3EEE6" },
  { id: "blush", label: "وردي هادئ", hex: "#F4E6E8" },
  { id: "stone", label: "رمادي دافئ", hex: "#E7E2E0" },
] as const;

export type ToneId = (typeof PALETTE)[number]["id"];

const TONE_SET = new Set<string>(PALETTE.map((item) => item.id));

export function approvedTone(value: unknown, fallback: ToneId = "brand"): ToneId {
  return typeof value === "string" && TONE_SET.has(value) ? (value as ToneId) : fallback;
}

export function toneHex(value: unknown): string {
  const tone = approvedTone(value);
  return PALETTE.find((item) => item.id === tone)?.hex ?? BRAND_HEX;
}

export const CATEGORY_ICONS = [
  { id: "", label: "بدون رمز" },
  { id: "reed", label: "ريشة" },
  { id: "moon", label: "قمر" },
  { id: "book", label: "كتاب" },
  { id: "path", label: "طريق" },
  { id: "home", label: "بيت" },
  { id: "leaf", label: "ورقة" },
] as const;

export type IconId = (typeof CATEGORY_ICONS)[number]["id"];

export function approvedIcon(value: unknown): IconId {
  const ids = new Set(CATEGORY_ICONS.map((item) => item.id));
  return typeof value === "string" && ids.has(value as IconId) ? (value as IconId) : "";
}
