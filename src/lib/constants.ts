export const SECTION_TYPES = [
  { id: "hero", label: "ترحيب" },
  { id: "categories", label: "تصنيفات" },
  { id: "stories", label: "قصص" },
  { id: "banner", label: "لافتة" },
  { id: "announcement", label: "تنبيه" },
  { id: "authors", label: "مؤلفون" },
] as const;

export const STORY_SOURCES = [
  { id: "recommended", label: "مقترحة حسب النشاط" },
  { id: "popular", label: "الأكثر رواجًا" },
  { id: "recent", label: "وصل حديثًا" },
  { id: "picks", label: "اختيارات تحريرية" },
  { id: "featured", label: "قصص مميزة" },
  { id: "category", label: "تصنيف محدد" },
] as const;

export const STORY_LAYOUTS = [
  { id: "rail", label: "صف متحرك" },
  { id: "grid", label: "شبكة" },
  { id: "feature", label: "قصة بارزة" },
] as const;

export const CATEGORY_LAYOUTS = [
  { id: "tiles", label: "بطاقات" },
  { id: "row", label: "صف أسماء" },
] as const;

export const HERO_LAYOUTS = [
  { id: "with-search", label: "مع بحث" },
  { id: "quiet", label: "عنوان فقط" },
] as const;

export type SectionType = (typeof SECTION_TYPES)[number]["id"];
export type StorySource = (typeof STORY_SOURCES)[number]["id"];
export type StoryLayout = (typeof STORY_LAYOUTS)[number]["id"];

const sectionIds = new Set<string>(SECTION_TYPES.map((item) => item.id));
const sourceIds = new Set<string>(STORY_SOURCES.map((item) => item.id));
const storyLayouts = new Set<string>(STORY_LAYOUTS.map((item) => item.id));
const categoryLayouts = new Set<string>(CATEGORY_LAYOUTS.map((item) => item.id));
const heroLayouts = new Set<string>(HERO_LAYOUTS.map((item) => item.id));

export function approvedSectionType(value: unknown): SectionType {
  return typeof value === "string" && sectionIds.has(value) ? (value as SectionType) : "stories";
}

export function approvedSource(value: unknown): StorySource {
  return typeof value === "string" && sourceIds.has(value) ? (value as StorySource) : "recommended";
}

export function approvedStoryLayout(value: unknown): StoryLayout {
  return typeof value === "string" && storyLayouts.has(value) ? (value as StoryLayout) : "rail";
}

export function approvedCategoryLayout(value: unknown): "tiles" | "row" {
  return value === "row" ? "row" : "tiles";
}

export function approvedHeroLayout(value: unknown): "with-search" | "quiet" {
  return value === "quiet" ? "quiet" : "with-search";
}

export function clampLimit(value: unknown, fallback = 4): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(12, Math.max(1, Math.round(number)));
}

export const AGE_BANDS = [
  { id: "0-5", label: "حتى ٥ سنوات", min: 0, max: 5 },
  { id: "6-8", label: "٦–٨ سنوات", min: 6, max: 8 },
  { id: "9-12", label: "٩–١٢ سنة", min: 9, max: 12 },
  { id: "13+", label: "١٣ فأكثر", min: 13, max: 120 },
] as const;

export const SORTS = [
  { id: "new", label: "الأحدث" },
  { id: "popular", label: "الأكثر رواجًا" },
  { id: "views", label: "الأكثر مشاهدة" },
  { id: "picks", label: "اختيارات يراع" },
] as const;

export type SortId = (typeof SORTS)[number]["id"];

export function approvedSort(value: unknown): SortId {
  const ids = new Set(SORTS.map((item) => item.id));
  return typeof value === "string" && ids.has(value as SortId) ? (value as SortId) : "new";
}

export function approvedCategoryLayoutId(value: unknown) {
  return typeof value === "string" && categoryLayouts.has(value) ? value : "tiles";
}

export function approvedHeroLayoutId(value: unknown) {
  return typeof value === "string" && heroLayouts.has(value) ? value : "with-search";
}
