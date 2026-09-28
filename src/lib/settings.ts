import { getDb } from "./db";

export type Weights = {
  category: number;
  tag: number;
  author: number;
  popularity: number;
  recency: number;
  featured: number;
  priority: number;
  viewedPenalty: number;
};

export type Settings = {
  site_name: string;
  description: string;
  contact_email: string;
  instagram: string;
  social_links: { label: string; url: string }[];
  seo_title: string;
  seo_description: string;
  social_image_id: string;
  logo_id: string;
  default_display_count: number;
  recent_days: number;
  density: "comfortable" | "compact";
  weights: Weights;
};

const DEFAULTS: Settings = {
  site_name: "يراع",
  description: "مكان هادئ لاكتشاف القصص والروايات.",
  contact_email: "",
  instagram: "",
  social_links: [],
  seo_title: "يراع — اكتشف قصتك القادمة",
  seo_description: "يراع مكان مريح تكتشف فيه قصتك القادمة: تصنيفات، بحث، واقتراحات.",
  social_image_id: "",
  logo_id: "",
  default_display_count: 12,
  recent_days: 45,
  density: "comfortable",
  weights: {
    category: 4,
    tag: 3,
    author: 2,
    popularity: 2,
    recency: 2,
    featured: 3,
    priority: 4,
    viewedPenalty: 5,
  },
};

function readRaw(): Record<string, string> {
  const rows = getDb().prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function getSettings(): Settings {
  const raw = readRaw();
  let social: { label: string; url: string }[] = [];
  try {
    const parsed = JSON.parse(raw.social_links || "[]");
    if (Array.isArray(parsed)) {
      social = parsed
        .filter((item) => item && typeof item.label === "string" && typeof item.url === "string")
        .slice(0, 5);
    }
  } catch {
    social = [];
  }
  let weights = DEFAULTS.weights;
  try {
    const parsed = JSON.parse(raw.weights || "{}") as Partial<Weights>;
    weights = { ...DEFAULTS.weights, ...parsed };
  } catch {
    weights = DEFAULTS.weights;
  }
  return {
    site_name: raw.site_name || DEFAULTS.site_name,
    description: raw.description || DEFAULTS.description,
    contact_email: raw.contact_email || "",
    instagram: raw.instagram || "",
    social_links: social,
    seo_title: raw.seo_title || DEFAULTS.seo_title,
    seo_description: raw.seo_description || DEFAULTS.seo_description,
    social_image_id: raw.social_image_id || "",
    logo_id: raw.logo_id || "",
    default_display_count: clampCount(raw.default_display_count, 12),
    recent_days: clampCount(raw.recent_days, 45, 7, 180),
    density: raw.density === "compact" ? "compact" : "comfortable",
    weights,
  };
}

export function setSetting(key: string, value: string) {
  getDb()
    .prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .run(key, value);
}

function clampCount(value: string | undefined, fallback: number, min = 6, max = 24) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}
