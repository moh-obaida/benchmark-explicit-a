const numberFormat = new Intl.NumberFormat("ar");

export function arNumber(value: number): string {
  return numberFormat.format(value);
}

export function storyCountLabel(count: number): string {
  if (count === 0) return "لا قصص";
  if (count === 1) return "قصة واحدة";
  if (count === 2) return "قصتان";
  if (count >= 3 && count <= 10) return `${arNumber(count)} قصص`;
  return `${arNumber(count)} قصة`;
}

export function minutesLabel(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  if (minutes === 1) return "دقيقة واحدة";
  if (minutes === 2) return "دقيقتان";
  if (minutes >= 3 && minutes <= 10) return `${arNumber(minutes)} دقائق`;
  return `${arNumber(minutes)} دقيقة`;
}

export function ageLabel(min: number | null | undefined, max: number | null | undefined): string {
  if (min && max) return `من ${arNumber(min)} إلى ${arNumber(max)} سنوات`;
  if (min) return `من ${arNumber(min)} سنوات`;
  if (max) return `حتى ${arNumber(max)} سنوات`;
  return "";
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium" }).format(date);
}

export function slugify(input: string): string {
  const base = input
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "item";
}

export function uniqueSlug(base: string, exists: (slug: string) => boolean): string {
  let slug = base;
  let index = 2;
  while (exists(slug)) slug = `${base}-${index++}`;
  return slug;
}

export function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export function splitTags(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of value.split(/[,،]/)) {
    const name = part.trim().replace(/\s+/g, " ");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    tags.push(name.slice(0, 40));
  }
  return tags.slice(0, 12);
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function clip(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}
