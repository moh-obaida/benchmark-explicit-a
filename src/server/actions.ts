"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin, logAdmin, getCurrentUser, createSession, readAnonId, loginAllowed, clearSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clip, isHttpUrl, slugify, splitTags, uniqueSlug } from "@/lib/format";
import { approvedIcon, approvedTone } from "@/lib/palette";
import { approvedSectionType, approvedSource, clampLimit } from "@/lib/constants";
import { setSetting } from "@/lib/settings";
import { deleteMedia } from "@/lib/media";

function fail(path: string, error: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`);
}

function ok(path: string): never {
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/admin");
  redirect(`${path}${path.includes("?") ? "&" : "?"}saved=1`);
}

function optionalText(form: FormData, key: string, max: number) {
  const value = clip(String(form.get(key) ?? ""), max);
  return value || null;
}

function optionalInt(form: FormData, key: string) {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function flag(form: FormData, key: string) {
  const value = form.get(key);
  return value === "1" || value === "on" ? 1 : 0;
}

function httpOrEmpty(value: string | null, label: string) {
  if (!value) return null;
  if (!isHttpUrl(value)) throw new Error(`${label} يحتاج رابطًا يبدأ بـ http أو https.`);
  return value;
}

function slugTaken(table: "stories" | "categories" | "authors", slug: string, exceptId?: string) {
  const row = getDb().prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug) as { id: string } | undefined;
  return Boolean(row && row.id !== exceptId);
}

function replaceTags(storyId: string, names: string[]) {
  const db = getDb();
  db.prepare(`DELETE FROM story_tags WHERE story_id = ?`).run(storyId);
  for (const name of names) {
    const found = db.prepare(`SELECT id FROM tags WHERE name = ?`).get(name) as { id: string } | undefined;
    const id = found?.id ?? crypto.randomUUID();
    if (!found) db.prepare(`INSERT INTO tags (id, name) VALUES (?, ?)`).run(id, name);
    db.prepare(`INSERT OR IGNORE INTO story_tags (story_id, tag_id) VALUES (?, ?)`).run(storyId, id);
  }
}

function replaceIds(sql: string, storyId: string, ids: string[]) {
  const db = getDb();
  const clear =
    sql.includes("story_categories")
      ? `DELETE FROM story_categories WHERE story_id = ?`
      : sql.includes("story_relations")
        ? `DELETE FROM story_relations WHERE story_id = ?`
        : `DELETE FROM story_images WHERE story_id = ?`;
  db.prepare(clear).run(storyId);
  ids.forEach((id, index) => {
    if (sql.includes("story_images")) {
      db.prepare(`INSERT INTO story_images (story_id, media_id, sort_order) VALUES (?, ?, ?)`).run(storyId, id, index);
    } else if (sql.includes("story_relations")) {
      if (id !== storyId) db.prepare(`INSERT INTO story_relations (story_id, related_id) VALUES (?, ?)`).run(storyId, id);
    } else {
      db.prepare(`INSERT INTO story_categories (story_id, category_id) VALUES (?, ?)`).run(storyId, id);
    }
  });
}

export async function saveStory(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") || "");
  const title = clip(String(form.get("title") || ""), 140);
  if (title.length < 2) fail(id ? `/admin/stories/${id}` : "/admin/stories/new", "اكتب عنوان القصة.");
  let external: string | null = null;
  let audio: string | null = null;
  let video: string | null = null;
  try {
    external = httpOrEmpty(optionalText(form, "external_source", 300), "المصدر");
    audio = httpOrEmpty(optionalText(form, "audio_url", 300), "الصوت");
    video = httpOrEmpty(optionalText(form, "video_url", 300), "الفيديو");
  } catch (error) {
    fail(id ? `/admin/stories/${id}` : "/admin/stories/new", error instanceof Error ? error.message : "تحقق من الروابط.");
  }
  const ageMin = optionalInt(form, "age_min");
  const ageMax = optionalInt(form, "age_max");
  if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
    fail(id ? `/admin/stories/${id}` : "/admin/stories/new", "عمر البداية أكبر من عمر النهاية.");
  }
  const baseSlug = slugify(String(form.get("slug") || title));
  const slug = uniqueSlug(baseSlug, (value) => slugTaken("stories", value, id || undefined));
  const now = new Date().toISOString();
  const publishRaw = String(form.get("publish_at") || "");
  const publishAt = publishRaw ? new Date(publishRaw).toISOString() : null;
  const intent = String(form.get("intent") || "save");
  const published = intent === "publish" ? 1 : intent === "unpublish" ? 0 : flag(form, "published");
  const values = {
    title,
    slug,
    short: optionalText(form, "short_description", 280),
    full: optionalText(form, "full_description", 8000),
    author: String(form.get("author_id") || "") || null,
    cover: String(form.get("cover_id") || "") || null,
    category: String(form.get("primary_category_id") || "") || null,
    ageMin,
    ageMax,
    type: optionalText(form, "story_type", 60),
    genre: optionalText(form, "genre", 60),
    minutes: optionalInt(form, "reading_minutes"),
    featured: flag(form, "featured"),
    published,
    publishAt: publishAt && !Number.isNaN(new Date(publishAt).getTime()) ? publishAt : null,
    popularity: optionalInt(form, "popularity") ?? 0,
    notes: optionalText(form, "admin_notes", 2000),
    order: optionalInt(form, "display_order") ?? 0,
    narrator: optionalText(form, "narrator", 80),
    series: optionalText(form, "series_name", 80),
    episode: optionalInt(form, "episode_number"),
    external,
    audio,
    video,
    priority: optionalInt(form, "priority") ?? 0,
  };
  const db = getDb();
  let storyId = id;
  if (!id) {
    storyId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO stories (
        id, title, slug, short_description, full_description, author_id, cover_id, primary_category_id,
        age_min, age_max, story_type, genre, reading_minutes, featured, published, publish_at, popularity,
        view_count, favorite_count, admin_notes, display_order, narrator, series_name, episode_number,
        external_source, audio_url, video_url, priority, origin, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?)`,
    ).run(
      storyId, values.title, values.slug, values.short, values.full, values.author, values.cover, values.category,
      values.ageMin, values.ageMax, values.type, values.genre, values.minutes, values.featured, values.published,
      values.publishAt, values.popularity, values.notes, values.order, values.narrator, values.series, values.episode,
      values.external, values.audio, values.video, values.priority, now, now,
    );
    logAdmin(admin.id, "أُضيفت قصة", "story", storyId);
  } else {
    db.prepare(
      `UPDATE stories SET
        title=?, slug=?, short_description=?, full_description=?, author_id=?, cover_id=?, primary_category_id=?,
        age_min=?, age_max=?, story_type=?, genre=?, reading_minutes=?, featured=?, published=?, publish_at=?,
        popularity=?, admin_notes=?, display_order=?, narrator=?, series_name=?, episode_number=?,
        external_source=?, audio_url=?, video_url=?, priority=?, origin='admin', updated_at=?
       WHERE id=?`,
    ).run(
      values.title, values.slug, values.short, values.full, values.author, values.cover, values.category,
      values.ageMin, values.ageMax, values.type, values.genre, values.minutes, values.featured, values.published,
      values.publishAt, values.popularity, values.notes, values.order, values.narrator, values.series, values.episode,
      values.external, values.audio, values.video, values.priority, now, storyId,
    );
    logAdmin(admin.id, published ? "حُفظت قصة" : "حُفظت مسودة", "story", storyId);
  }
  const categories = new Set(
    [values.category, ...form.getAll("category_ids").map(String)].filter((item): item is string => Boolean(item)),
  );
  replaceIds("story_categories", storyId, [...categories]);
  replaceIds("story_relations", storyId, form.getAll("related_ids").map(String).filter(Boolean));
  replaceIds("story_images", storyId, form.getAll("extra_images").map(String).filter(Boolean));
  replaceTags(storyId, splitTags(String(form.get("tags") || "")));
  revalidatePath("/stories/[slug]", "page");
  ok(`/admin/stories/${storyId}`);
}

export async function deleteStory(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") || "");
  const confirm = String(form.get("confirm") || "");
  if (confirm !== "حذف") fail(`/admin/stories/${id}/delete`, "اكتب كلمة حذف للتأكيد.");
  const db = getDb();
  db.prepare(`DELETE FROM story_categories WHERE story_id = ?`).run(id);
  db.prepare(`DELETE FROM story_tags WHERE story_id = ?`).run(id);
  db.prepare(`DELETE FROM story_relations WHERE story_id = ? OR related_id = ?`).run(id, id);
  db.prepare(`DELETE FROM story_images WHERE story_id = ?`).run(id);
  db.prepare(`DELETE FROM section_stories WHERE story_id = ?`).run(id);
  db.prepare(`DELETE FROM favorites WHERE story_id = ?`).run(id);
  db.prepare(`DELETE FROM activity WHERE story_id = ?`).run(id);
  db.prepare(`DELETE FROM stories WHERE id = ?`).run(id);
  logAdmin(admin.id, "حُذفت قصة", "story", id);
  ok("/admin/stories");
}

export async function saveCategory(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") || "");
  const name = clip(String(form.get("name") || ""), 80);
  if (name.length < 2) fail(id ? `/admin/categories/${id}` : "/admin/categories/new", "اكتب اسم التصنيف.");
  const slug = uniqueSlug(slugify(String(form.get("slug") || name)), (value) => slugTaken("categories", value, id || undefined));
  const now = new Date().toISOString();
  const fields = [
    name,
    slug,
    optionalText(form, "description", 300),
    String(form.get("image_id") || "") || null,
    approvedIcon(form.get("icon")),
    approvedTone(form.get("color_token")),
    optionalInt(form, "sort_order") ?? 0,
    flag(form, "published"),
    flag(form, "show_on_home"),
    flag(form, "show_in_nav"),
    flag(form, "featured"),
  ];
  if (!id) {
    const newId = crypto.randomUUID();
    getDb()
      .prepare(
        `INSERT INTO categories (id, name, slug, description, image_id, icon, color_token, sort_order, published, show_on_home, show_in_nav, featured, origin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?)`,
      )
      .run(newId, ...fields, now, now);
    logAdmin(admin.id, "أُضيف تصنيف", "category", newId);
    ok(`/admin/categories/${newId}`);
  }
  getDb()
    .prepare(
      `UPDATE categories SET name=?, slug=?, description=?, image_id=?, icon=?, color_token=?, sort_order=?, published=?, show_on_home=?, show_in_nav=?, featured=?, origin='admin', updated_at=? WHERE id=?`,
    )
    .run(...fields, now, id);
  logAdmin(admin.id, "عُدّل تصنيف", "category", id);
  ok(`/admin/categories/${id}`);
}

export async function deleteCategory(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") || "");
  if (String(form.get("confirm") || "") !== "حذف") fail(`/admin/categories/${id}/delete`, "اكتب كلمة حذف للتأكيد.");
  const db = getDb();
  db.prepare(`DELETE FROM story_categories WHERE category_id = ?`).run(id);
  db.prepare(`UPDATE stories SET primary_category_id = NULL WHERE primary_category_id = ?`).run(id);
  db.prepare(`UPDATE homepage_sections SET category_id = NULL WHERE category_id = ?`).run(id);
  db.prepare(`DELETE FROM categories WHERE id = ?`).run(id);
  logAdmin(admin.id, "حُذف تصنيف", "category", id);
  ok("/admin/categories");
}

export async function moveCategory(form: FormData) {
  await requireAdmin();
  moveRow("categories", String(form.get("id") || ""), String(form.get("dir") || ""));
  ok("/admin/categories");
}

export async function saveAuthor(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") || "");
  const name = clip(String(form.get("name") || ""), 80);
  if (name.length < 2) fail(id ? `/admin/authors/${id}` : "/admin/authors/new", "اكتب اسم المؤلف.");
  const slug = uniqueSlug(slugify(String(form.get("slug") || name)), (value) => slugTaken("authors", value, id || undefined));
  const now = new Date().toISOString();
  const bio = optionalText(form, "bio", 800);
  const image = String(form.get("image_id") || "") || null;
  const featured = flag(form, "featured");
  if (!id) {
    const newId = crypto.randomUUID();
    getDb()
      .prepare(
        `INSERT INTO authors (id, name, slug, bio, image_id, featured, origin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'admin', ?, ?)`,
      )
      .run(newId, name, slug, bio, image, featured, now, now);
    logAdmin(admin.id, "أُضيف مؤلف", "author", newId);
    ok(`/admin/authors/${newId}`);
  }
  getDb()
    .prepare(`UPDATE authors SET name=?, slug=?, bio=?, image_id=?, featured=?, origin='admin', updated_at=? WHERE id=?`)
    .run(name, slug, bio, image, featured, now, id);
  logAdmin(admin.id, "عُدّل مؤلف", "author", id);
  ok(`/admin/authors/${id}`);
}

export async function deleteAuthor(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") || "");
  if (String(form.get("confirm") || "") !== "حذف") fail(`/admin/authors/${id}/delete`, "اكتب كلمة حذف للتأكيد.");
  getDb().prepare(`UPDATE stories SET author_id = NULL WHERE author_id = ?`).run(id);
  getDb().prepare(`DELETE FROM authors WHERE id = ?`).run(id);
  logAdmin(admin.id, "حُذف مؤلف", "author", id);
  ok("/admin/authors");
}

function moveRow(table: "categories" | "homepage_sections", id: string, dir: string) {
  const rows = getDb().prepare(`SELECT id, sort_order AS sortOrder FROM ${table} ORDER BY sort_order ASC`).all() as {
    id: string;
    sortOrder: number;
  }[];
  const index = rows.findIndex((row) => row.id === id);
  const next = dir === "up" ? index - 1 : index + 1;
  if (index < 0 || next < 0 || next >= rows.length) return;
  const db = getDb();
  db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).run(rows[next].sortOrder, rows[index].id);
  db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).run(rows[index].sortOrder, rows[next].id);
}

export async function moveSection(form: FormData) {
  await requireAdmin();
  moveRow("homepage_sections", String(form.get("id") || ""), String(form.get("dir") || ""));
  ok("/admin/homepage");
}

export async function toggleSection(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") || "");
  getDb().prepare(`UPDATE homepage_sections SET enabled = CASE enabled WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?`).run(new Date().toISOString(), id);
  logAdmin(admin.id, "تغيّر ظهور قسم", "section", id);
  ok("/admin/homepage");
}

export async function createSection(form: FormData) {
  const admin = await requireAdmin();
  const type = approvedSectionType(form.get("section_type"));
  const titles: Record<string, string> = {
    hero: "ترحيب",
    categories: "التصنيفات",
    stories: "قسم قصص",
    banner: "لافتة",
    announcement: "تنبيه",
    authors: "المؤلفون",
  };
  const max = getDb().prepare(`SELECT COALESCE(MAX(sort_order), 0) AS n FROM homepage_sections`).get() as { n: number };
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO homepage_sections
        (id, section_type, title, subtitle, enabled, sort_order, mode, source, category_id, item_limit, layout, accent_token, body, image_id, link_href, link_label, created_at, updated_at)
       VALUES (?, ?, ?, '', 1, ?, 'auto', 'recommended', NULL, 4, ?, 'brand', '', NULL, '', '', ?, ?)`,
    )
    .run(id, type, titles[type] || "قسم", max.n + 1, type === "stories" ? "rail" : type === "hero" ? "with-search" : "tiles", now, now);
  logAdmin(admin.id, "أُضيف قسم", "section", id);
  ok(`/admin/homepage/${id}`);
}

export async function saveSection(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") || "");
  const title = clip(String(form.get("title") || ""), 80);
  if (title.length < 2) fail(`/admin/homepage/${id}`, "اكتب عنوان القسم.");
  const now = new Date().toISOString();
  const link = optionalText(form, "link_href", 200);
  if (link && !link.startsWith("/") && !isHttpUrl(link)) fail(`/admin/homepage/${id}`, "الرابط داخلي أو http.");
  getDb()
    .prepare(
      `UPDATE homepage_sections SET
        title=?, subtitle=?, enabled=?, mode=?, source=?, category_id=?, item_limit=?, layout=?, accent_token=?,
        body=?, image_id=?, link_href=?, link_label=?, updated_at=?
       WHERE id=?`,
    )
    .run(
      title,
      optionalText(form, "subtitle", 180),
      flag(form, "enabled"),
      form.get("mode") === "manual" ? "manual" : "auto",
      approvedSource(form.get("source")),
      String(form.get("category_id") || "") || null,
      clampLimit(form.get("item_limit"), 4),
      ["rail", "grid", "feature", "tiles", "row", "with-search", "quiet"].includes(String(form.get("layout")))
        ? String(form.get("layout"))
        : "rail",
      approvedTone(form.get("accent_token")),
      optionalText(form, "body", 400),
      String(form.get("image_id") || "") || null,
      link,
      optionalText(form, "link_label", 40),
      now,
      id,
    );
  const db = getDb();
  db.prepare(`DELETE FROM section_stories WHERE section_id = ?`).run(id);
  const storyIds = form.getAll("story_id").map(String);
  storyIds.forEach((storyId, index) => {
    const include = form.get(`include_${storyId}`);
    const pinned = form.get(`pin_${storyId}`);
    const excluded = form.get(`hide_${storyId}`);
    const order = Number(form.get(`order_${storyId}`) || index + 1);
    if (!include && !pinned && !excluded) return;
    db.prepare(
      `INSERT INTO section_stories (section_id, story_id, pinned, sort_order, excluded) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, storyId, pinned ? 1 : 0, Number.isFinite(order) ? order : index + 1, excluded ? 1 : 0);
  });
  logAdmin(admin.id, "عُدّل قسم", "section", id);
  ok(`/admin/homepage/${id}`);
}

export async function deleteSection(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") || "");
  if (String(form.get("confirm") || "") !== "حذف") fail(`/admin/homepage/${id}`, "اكتب كلمة حذف للتأكيد.");
  getDb().prepare(`DELETE FROM section_stories WHERE section_id = ?`).run(id);
  getDb().prepare(`DELETE FROM homepage_sections WHERE id = ?`).run(id);
  logAdmin(admin.id, "حُذف قسم", "section", id);
  ok("/admin/homepage");
}

export async function saveSettings(form: FormData) {
  const admin = await requireAdmin();
  const links = [0, 1, 2]
    .map((index) => ({
      label: clip(String(form.get(`social_label_${index}`) || ""), 40),
      url: clip(String(form.get(`social_url_${index}`) || ""), 200),
    }))
    .filter((item) => item.label && item.url && isHttpUrl(item.url));
  const weights = {
    category: Number(form.get("w_category") || 4),
    tag: Number(form.get("w_tag") || 3),
    author: Number(form.get("w_author") || 2),
    popularity: Number(form.get("w_popularity") || 2),
    recency: Number(form.get("w_recency") || 2),
    featured: Number(form.get("w_featured") || 3),
    priority: Number(form.get("w_priority") || 4),
    viewedPenalty: Number(form.get("w_viewed") || 5),
  };
  const pairs: Record<string, string> = {
    site_name: clip(String(form.get("site_name") || "يراع"), 40) || "يراع",
    description: clip(String(form.get("description") || ""), 240),
    contact_email: clip(String(form.get("contact_email") || ""), 120),
    instagram: clip(String(form.get("instagram") || ""), 200),
    social_links: JSON.stringify(links),
    seo_title: clip(String(form.get("seo_title") || ""), 80),
    seo_description: clip(String(form.get("seo_description") || ""), 180),
    social_image_id: String(form.get("social_image_id") || ""),
    logo_id: String(form.get("logo_id") || ""),
    default_display_count: String(Math.min(24, Math.max(6, Number(form.get("default_display_count") || 12)))),
    recent_days: String(Math.min(180, Math.max(7, Number(form.get("recent_days") || 45)))),
    density: form.get("density") === "compact" ? "compact" : "comfortable",
    weights: JSON.stringify(weights),
  };
  for (const [key, value] of Object.entries(pairs)) setSetting(key, value);
  const nextPassword = String(form.get("new_password") || "");
  if (nextPassword) {
    if (nextPassword.length < 8) fail("/admin/settings", "كلمة المرور الجديدة أقصر من ٨ أحرف.");
    getDb().prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashPassword(nextPassword), admin.id);
  }
  logAdmin(admin.id, "حُفظت الإعدادات", "settings");
  ok("/admin/settings");
}

export async function removeMedia(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") || "");
  try {
    deleteMedia(id);
  } catch (error) {
    fail("/admin/media", error instanceof Error ? error.message : "تعذّر حذف الصورة.");
  }
  logAdmin(admin.id, "حُذفت صورة", "media", id);
  ok("/admin/media");
}

export async function updateMediaAlt(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  const alt = clip(String(form.get("alt") || ""), 140);
  if (!alt) fail("/admin/media", "الوصف المختصر للصورة مطلوب.");
  getDb().prepare(`UPDATE media SET alt = ? WHERE id = ?`).run(alt, id);
  ok("/admin/media");
}

export async function deleteDemo(form: FormData) {
  const admin = await requireAdmin();
  if (String(form.get("confirm") || "") !== "حذف") fail("/admin/demo-delete", "اكتب كلمة حذف للتأكيد.");
  const db = getDb();
  const ids = db.prepare(`SELECT id FROM stories WHERE origin = 'demo'`).all() as { id: string }[];
  db.exec("BEGIN");
  try {
    for (const { id } of ids) {
      db.prepare(`DELETE FROM story_categories WHERE story_id = ?`).run(id);
      db.prepare(`DELETE FROM story_tags WHERE story_id = ?`).run(id);
      db.prepare(`DELETE FROM story_relations WHERE story_id = ? OR related_id = ?`).run(id, id);
      db.prepare(`DELETE FROM story_images WHERE story_id = ?`).run(id);
      db.prepare(`DELETE FROM section_stories WHERE story_id = ?`).run(id);
      db.prepare(`DELETE FROM favorites WHERE story_id = ?`).run(id);
      db.prepare(`DELETE FROM activity WHERE story_id = ?`).run(id);
      db.prepare(`DELETE FROM stories WHERE id = ?`).run(id);
    }
    db.prepare(
      `DELETE FROM authors WHERE origin = 'demo' AND id NOT IN (SELECT author_id FROM stories WHERE author_id IS NOT NULL)`,
    ).run();
    db.prepare(
      `DELETE FROM categories WHERE origin = 'demo' AND id NOT IN (
        SELECT primary_category_id FROM stories WHERE primary_category_id IS NOT NULL
        UNION SELECT category_id FROM story_categories
      )`,
    ).run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  logAdmin(admin.id, "حُذف المحتوى التجريبي", "seed");
  ok("/admin");
}

export async function loginAdmin(form: FormData) {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const key = email || "unknown";
  if (!loginAllowed(key)) fail("/admin/login", "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.");
  const user = getDb().prepare(`SELECT id, password_hash, role FROM users WHERE email = ?`).get(email) as
    | { id: string; password_hash: string | null; role: string }
    | undefined;
  if (!user || user.role !== "admin" || !user.password_hash || !verifyPassword(password, user.password_hash)) {
    fail("/admin/login", "البريد أو كلمة المرور غير صحيحة.");
  }
  await createSession(user.id);
  redirect("/admin");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function logoutAdmin() {
  await clearSession();
  redirect("/admin/login");
}

export async function toggleFavorite(form: FormData) {
  const slug = clip(String(form.get("slug") || ""), 180);
  const user = await getCurrentUser();
  if (!user) redirect(`/favorites?save=${encodeURIComponent(slug)}`);
  const story = getDb()
    .prepare(`SELECT id FROM stories WHERE slug = ? AND published = 1`)
    .get(slug) as { id: string } | undefined;
  if (!story) redirect("/favorites");
  const existing = getDb().prepare(`SELECT 1 FROM favorites WHERE user_id = ? AND story_id = ?`).get(user.id, story.id);
  if (existing) {
    getDb().prepare(`DELETE FROM favorites WHERE user_id = ? AND story_id = ?`).run(user.id, story.id);
  } else {
    getDb()
      .prepare(`INSERT INTO favorites (user_id, story_id, created_at) VALUES (?, ?, ?)`)
      .run(user.id, story.id, new Date().toISOString());
  }
  getDb()
    .prepare(`UPDATE stories SET favorite_count = (SELECT COUNT(*) FROM favorites WHERE story_id = ?) WHERE id = ?`)
    .run(story.id, story.id);
  revalidatePath("/stories/[slug]", "page");
  revalidatePath("/favorites");
  const back = String(form.get("back") || "");
  redirect(back === "favorites" ? "/favorites" : `/stories/${encodeURIComponent(slug)}`);
}

export async function saveVisitor(form: FormData) {
  const name = clip(String(form.get("name") || ""), 40);
  const email = String(form.get("email") || "").trim().toLowerCase();
  const slug = clip(String(form.get("slug") || ""), 180);
  if (name.length < 2) fail(`/favorites?save=${encodeURIComponent(slug)}`, "اكتب اسمك.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(`/favorites?save=${encodeURIComponent(slug)}`, "اكتب بريدًا صالحًا.");
  }
  const db = getDb();
  const existing = db.prepare(`SELECT id, role FROM users WHERE email = ?`).get(email) as { id: string; role: string } | undefined;
  if (existing?.role === "admin") fail("/favorites", "هذا البريد غير متاح. استخدم بريدًا آخر.");
  const now = new Date().toISOString();
  let userId = existing?.id;
  if (!userId) {
    userId = crypto.randomUUID();
    db.prepare(`INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, NULL, 'visitor', ?)`).run(
      userId,
      name,
      email,
      now,
    );
  } else {
    db.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(name, userId);
  }
  const anon = await readAnonId();
  if (anon) {
    db.prepare(`UPDATE activity SET user_id = ? WHERE anon_id = ? AND user_id IS NULL`).run(userId, anon);
  }
  await createSession(userId);
  if (slug) {
    const story = db.prepare(`SELECT id FROM stories WHERE slug = ? AND published = 1`).get(slug) as { id: string } | undefined;
    if (story) {
      db.prepare(`INSERT OR IGNORE INTO favorites (user_id, story_id, created_at) VALUES (?, ?, ?)`).run(userId, story.id, now);
      db.prepare(`UPDATE stories SET favorite_count = (SELECT COUNT(*) FROM favorites WHERE story_id = ?) WHERE id = ?`).run(
        story.id,
        story.id,
      );
      redirect(`/stories/${encodeURIComponent(slug)}`);
    }
  }
  redirect("/favorites");
}
