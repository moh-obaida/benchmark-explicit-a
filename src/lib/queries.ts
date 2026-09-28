import { getDb } from "./db";
import { likePattern, clip, safeDecode } from "./format";
import { AGE_BANDS, approvedSort, type SortId } from "./constants";
import { nowIso, publishedClause, type StoryCard } from "./recommend";
import { getSettings } from "./settings";

const CARD_SELECT = `
  s.id, s.title, s.slug,
  s.short_description AS shortDescription,
  s.author_id AS authorId,
  a.name AS authorName,
  a.slug AS authorSlug,
  s.primary_category_id AS categoryId,
  c.name AS categoryName,
  c.slug AS categorySlug,
  s.cover_id AS coverId,
  m.alt AS coverAlt,
  s.reading_minutes AS readingMinutes,
  s.age_min AS ageMin,
  s.age_max AS ageMax,
  s.genre AS genre,
  s.story_type AS storyType,
  s.featured AS featured,
  s.popularity AS popularity,
  s.priority AS priority,
  s.view_count AS viewCount,
  s.favorite_count AS favoriteCount,
  s.publish_at AS publishAt,
  s.display_order AS displayOrder
`;

const FROM = `
  FROM stories s
  LEFT JOIN authors a ON a.id = s.author_id
  LEFT JOIN categories c ON c.id = s.primary_category_id AND c.published = 1
  LEFT JOIN media m ON m.id = s.cover_id
`;

export type CatalogQuery = {
  q?: string;
  category?: string;
  genre?: string;
  age?: string;
  type?: string;
  author?: string;
  sort?: string;
  page?: string;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageId: string | null;
  icon: string;
  colorToken: string;
  sortOrder: number;
  published: number;
  showOnHome: number;
  showInNav: number;
  featured: number;
  origin?: string;
};

export type AuthorRow = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  imageId: string | null;
  featured: number;
  origin?: string;
};

export type SectionRow = {
  id: string;
  sectionType: string;
  title: string;
  subtitle: string | null;
  enabled: number;
  sortOrder: number;
  mode: string;
  source: string | null;
  categoryId: string | null;
  itemLimit: number;
  layout: string;
  accentToken: string | null;
  body: string | null;
  imageId: string | null;
  linkHref: string | null;
  linkLabel: string | null;
};

const CATEGORY_SELECT = `
  id, name, slug, description,
  image_id AS imageId, icon, color_token AS colorToken, sort_order AS sortOrder,
  published, show_on_home AS showOnHome, show_in_nav AS showInNav, featured, origin
`;

export function listHomeCategories(): CategoryRow[] {
  return getDb()
    .prepare(
      `SELECT ${CATEGORY_SELECT} FROM categories
       WHERE published = 1 AND show_on_home = 1
       ORDER BY featured DESC, sort_order ASC, name ASC`,
    )
    .all() as CategoryRow[];
}

export function listNavCategories(): CategoryRow[] {
  return getDb()
    .prepare(
      `SELECT ${CATEGORY_SELECT} FROM categories
       WHERE published = 1 AND show_in_nav = 1
       ORDER BY sort_order ASC, name ASC`,
    )
    .all() as CategoryRow[];
}

export function listPublicCategories(): CategoryRow[] {
  return getDb()
    .prepare(
      `SELECT ${CATEGORY_SELECT} FROM categories WHERE published = 1
       ORDER BY featured DESC, sort_order ASC, name ASC`,
    )
    .all() as CategoryRow[];
}

export function getCategoryBySlug(slug: string): CategoryRow | null {
  const decoded = safeDecode(slug);
  return (
    (getDb()
      .prepare(`SELECT ${CATEGORY_SELECT} FROM categories WHERE slug = ? AND published = 1`)
      .get(decoded) as CategoryRow | undefined) ?? null
  );
}

export function listFeaturedAuthors(limit = 8): AuthorRow[] {
  return getDb()
    .prepare(
      `SELECT id, name, slug, bio, image_id AS imageId, featured, origin
       FROM authors WHERE featured = 1 ORDER BY name ASC LIMIT ?`,
    )
    .all(limit) as AuthorRow[];
}

export function getAuthorBySlug(slug: string): AuthorRow | null {
  const decoded = safeDecode(slug);
  return (
    (getDb()
      .prepare(`SELECT id, name, slug, bio, image_id AS imageId, featured FROM authors WHERE slug = ?`)
      .get(decoded) as AuthorRow | undefined) ?? null
  );
}

export function storiesByAuthor(authorId: string): StoryCard[] {
  return getDb()
    .prepare(`SELECT ${CARD_SELECT} ${FROM} WHERE s.author_id = ? AND ${publishedClause()} ORDER BY s.publish_at DESC`)
    .all(authorId, nowIso()) as unknown as StoryCard[];
}

export function storiesByCategory(categoryId: string): StoryCard[] {
  return getDb()
    .prepare(
      `SELECT ${CARD_SELECT} ${FROM}
       WHERE ${publishedClause()} AND (
         s.primary_category_id = ? OR EXISTS (
           SELECT 1 FROM story_categories sc WHERE sc.story_id = s.id AND sc.category_id = ?
         )
       )
       ORDER BY s.publish_at DESC`,
    )
    .all(nowIso(), categoryId, categoryId) as unknown as StoryCard[];
}

function orderBy(sort: SortId) {
  if (sort === "popular") return "s.popularity DESC, s.favorite_count DESC, s.view_count DESC, s.publish_at DESC";
  if (sort === "views") return "s.view_count DESC, s.publish_at DESC";
  if (sort === "picks") return "s.priority DESC, s.featured DESC, s.publish_at DESC";
  return "s.publish_at DESC, s.created_at DESC";
}

export function searchStories(query: CatalogQuery): { items: StoryCard[]; total: number; page: number; pages: number } {
  const settings = getSettings();
  const pageSize = settings.default_display_count;
  const page = Math.max(1, Number(query.page) || 1);
  const where: string[] = [publishedClause()];
  const params: Array<string | number> = [nowIso()];
  const q = clip(query.q || "", 80);
  if (q) {
    const pattern = likePattern(q);
    where.push(`(
      s.title LIKE ? ESCAPE '\\' OR s.genre LIKE ? ESCAPE '\\' OR s.story_type LIKE ? ESCAPE '\\'
      OR IFNULL(a.name, '') LIKE ? ESCAPE '\\' OR IFNULL(c.name, '') LIKE ? ESCAPE '\\'
      OR EXISTS (
        SELECT 1 FROM story_tags st JOIN tags t ON t.id = st.tag_id
        WHERE st.story_id = s.id AND t.name LIKE ? ESCAPE '\\'
      )
      OR EXISTS (
        SELECT 1 FROM story_categories sc JOIN categories c2 ON c2.id = sc.category_id
        WHERE sc.story_id = s.id AND c2.published = 1 AND c2.name LIKE ? ESCAPE '\\'
      )
    )`);
    params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern);
  }
  if (query.category) {
    where.push(`(
      c.slug = ? OR EXISTS (
        SELECT 1 FROM story_categories sc JOIN categories c3 ON c3.id = sc.category_id
        WHERE sc.story_id = s.id AND c3.slug = ? AND c3.published = 1
      )
    )`);
    params.push(query.category, query.category);
  }
  if (query.genre) {
    where.push(`s.genre = ?`);
    params.push(query.genre);
  }
  if (query.type) {
    where.push(`s.story_type = ?`);
    params.push(query.type);
  }
  if (query.author) {
    where.push(`a.slug = ?`);
    params.push(query.author);
  }
  const band = AGE_BANDS.find((item) => item.id === query.age);
  if (band) {
    where.push(`s.age_min IS NOT NULL AND s.age_min <= ? AND COALESCE(s.age_max, s.age_min) >= ?`);
    params.push(band.max, band.min);
  }
  const sqlWhere = where.join(" AND ");
  const totalRow = getDb().prepare(`SELECT COUNT(*) AS n ${FROM} WHERE ${sqlWhere}`).get(...params) as { n: number };
  const total = totalRow?.n ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const items = getDb()
    .prepare(
      `SELECT ${CARD_SELECT} ${FROM} WHERE ${sqlWhere} ORDER BY ${orderBy(approvedSort(query.sort))} LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (safePage - 1) * pageSize) as unknown as StoryCard[];
  return { items, total, page: safePage, pages };
}

export function suggestStories(q: string): { title: string; slug: string; authorName: string | null }[] {
  const query = clip(q, 80);
  if ([...query].length < 2) return [];
  const pattern = likePattern(query);
  return getDb()
    .prepare(
      `SELECT s.title, s.slug, a.name AS authorName
       ${FROM}
       WHERE ${publishedClause()} AND (s.title LIKE ? ESCAPE '\\' OR IFNULL(a.name,'') LIKE ? ESCAPE '\\')
       ORDER BY s.popularity DESC, s.publish_at DESC
       LIMIT 6`,
    )
    .all(nowIso(), pattern, pattern) as { title: string; slug: string; authorName: string | null }[];
}

export function filterOptions() {
  const db = getDb();
  const now = nowIso();
  const genres = db
    .prepare(
      `SELECT DISTINCT s.genre AS value FROM stories s WHERE ${publishedClause()} AND s.genre IS NOT NULL AND s.genre != '' ORDER BY s.genre`,
    )
    .all(now) as { value: string }[];
  const types = db
    .prepare(
      `SELECT DISTINCT s.story_type AS value FROM stories s WHERE ${publishedClause()} AND s.story_type IS NOT NULL AND s.story_type != '' ORDER BY s.story_type`,
    )
    .all(now) as { value: string }[];
  const authors = db
    .prepare(
      `SELECT DISTINCT a.slug AS slug, a.name AS name
       FROM stories s JOIN authors a ON a.id = s.author_id
       WHERE ${publishedClause()} ORDER BY a.name`,
    )
    .all(now) as { slug: string; name: string }[];
  return {
    genres: genres.map((item) => item.value),
    types: types.map((item) => item.value),
    authors,
    categories: listPublicCategories(),
  };
}

export function listSections(enabledOnly = false): SectionRow[] {
  const where = enabledOnly ? "WHERE enabled = 1" : "";
  return getDb()
    .prepare(
      `SELECT id, section_type AS sectionType, title, subtitle, enabled, sort_order AS sortOrder,
        mode, source, category_id AS categoryId, item_limit AS itemLimit, layout, accent_token AS accentToken,
        body, image_id AS imageId, link_href AS linkHref, link_label AS linkLabel
       FROM homepage_sections ${where} ORDER BY sort_order ASC, title ASC`,
    )
    .all() as SectionRow[];
}

export function getSection(id: string): SectionRow | null {
  return (
    (getDb()
      .prepare(
        `SELECT id, section_type AS sectionType, title, subtitle, enabled, sort_order AS sortOrder,
          mode, source, category_id AS categoryId, item_limit AS itemLimit, layout, accent_token AS accentToken,
          body, image_id AS imageId, link_href AS linkHref, link_label AS linkLabel
         FROM homepage_sections WHERE id = ?`,
      )
      .get(id) as SectionRow | undefined) ?? null
  );
}

export function sectionLinks(sectionId: string) {
  return getDb()
    .prepare(
      `SELECT story_id AS storyId, pinned, sort_order AS sortOrder, excluded
       FROM section_stories WHERE section_id = ? ORDER BY sort_order ASC`,
    )
    .all(sectionId) as { storyId: string; pinned: number; sortOrder: number; excluded: number }[];
}

export function isFavorite(userId: string, storyId: string) {
  const row = getDb().prepare(`SELECT 1 AS ok FROM favorites WHERE user_id = ? AND story_id = ?`).get(userId, storyId) as
    | { ok: number }
    | undefined;
  return Boolean(row);
}

export function listFavorites(userId: string): StoryCard[] {
  return getDb()
    .prepare(
      `SELECT ${CARD_SELECT} ${FROM}
       JOIN favorites f ON f.story_id = s.id
       WHERE f.user_id = ? AND ${publishedClause()}
       ORDER BY f.created_at DESC`,
    )
    .all(userId, nowIso()) as unknown as StoryCard[];
}

export function dashboardCounts() {
  const db = getDb();
  const now = nowIso();
  const one = (sql: string, ...params: string[]) => (db.prepare(sql).get(...params) as { n: number }).n;
  return {
    stories: one(`SELECT COUNT(*) AS n FROM stories`),
    published: one(`SELECT COUNT(*) AS n FROM stories WHERE published = 1 AND (publish_at IS NULL OR publish_at <= ?)`, now),
    unpublished: one(`SELECT COUNT(*) AS n FROM stories WHERE published = 0 OR (publish_at IS NOT NULL AND publish_at > ?)`, now),
    categories: one(`SELECT COUNT(*) AS n FROM categories`),
    authors: one(`SELECT COUNT(*) AS n FROM authors`),
    views: one(`SELECT COALESCE(SUM(view_count), 0) AS n FROM stories`),
    favorites: one(`SELECT COALESCE(SUM(favorite_count), 0) AS n FROM stories`),
    featured: one(`SELECT COUNT(*) AS n FROM stories WHERE featured = 1`),
    demo: one(`SELECT COUNT(*) AS n FROM stories WHERE origin = 'demo'`),
  };
}

export function recentAdminActivity() {
  return getDb()
    .prepare(
      `SELECT action, entity, entity_id AS entityId, created_at AS createdAt
       FROM admin_log ORDER BY created_at DESC LIMIT 8`,
    )
    .all() as { action: string; entity: string; entityId: string; createdAt: string }[];
}

export function listMedia() {
  return getDb()
    .prepare(
      `SELECT id, filename, mime, bytes, width, height, alt, created_at AS createdAt
       FROM media ORDER BY created_at DESC`,
    )
    .all() as {
    id: string;
    filename: string;
    mime: string;
    bytes: number;
    width: number | null;
    height: number | null;
    alt: string;
    createdAt: string;
  }[];
}

export function getMedia(id: string) {
  return (
    (getDb()
      .prepare(`SELECT id, filename, mime, bytes, width, height, alt FROM media WHERE id = ?`)
      .get(id) as
      | { id: string; filename: string; mime: string; bytes: number; width: number | null; height: number | null; alt: string }
      | undefined) ?? null
  );
}
