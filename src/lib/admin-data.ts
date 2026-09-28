import { getDb } from "./db";
import { tagsFor } from "./recommend";

export type AdminStory = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  fullDescription: string | null;
  authorId: string | null;
  coverId: string | null;
  primaryCategoryId: string | null;
  ageMin: number | null;
  ageMax: number | null;
  storyType: string | null;
  genre: string | null;
  readingMinutes: number | null;
  featured: number;
  published: number;
  publishAt: string | null;
  popularity: number;
  viewCount: number;
  favoriteCount: number;
  adminNotes: string | null;
  displayOrder: number;
  narrator: string | null;
  seriesName: string | null;
  episodeNumber: number | null;
  externalSource: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  priority: number;
  origin: string;
  authorName: string | null;
  categoryName: string | null;
};

const STORY = `
  s.id, s.title, s.slug,
  s.short_description AS shortDescription,
  s.full_description AS fullDescription,
  s.author_id AS authorId,
  s.cover_id AS coverId,
  s.primary_category_id AS primaryCategoryId,
  s.age_min AS ageMin,
  s.age_max AS ageMax,
  s.story_type AS storyType,
  s.genre AS genre,
  s.reading_minutes AS readingMinutes,
  s.featured, s.published, s.publish_at AS publishAt,
  s.popularity, s.view_count AS viewCount, s.favorite_count AS favoriteCount,
  s.admin_notes AS adminNotes, s.display_order AS displayOrder,
  s.narrator, s.series_name AS seriesName, s.episode_number AS episodeNumber,
  s.external_source AS externalSource, s.audio_url AS audioUrl, s.video_url AS videoUrl,
  s.priority, s.origin,
  a.name AS authorName, c.name AS categoryName
`;

export function adminStoryList(q = "", status = "all"): AdminStory[] {
  const where: string[] = [];
  const params: string[] = [];
  if (q.trim()) {
    where.push(`(s.title LIKE ? ESCAPE '\\' OR IFNULL(a.name,'') LIKE ? ESCAPE '\\')`);
    const pattern = `%${q.trim().replace(/[\\%_]/g, "\\$&")}%`;
    params.push(pattern, pattern);
  }
  if (status === "published") where.push(`s.published = 1`);
  if (status === "draft") where.push(`s.published = 0`);
  if (status === "demo") where.push(`s.origin = 'demo'`);
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return getDb()
    .prepare(
      `SELECT ${STORY}
       FROM stories s
       LEFT JOIN authors a ON a.id = s.author_id
       LEFT JOIN categories c ON c.id = s.primary_category_id
       ${clause}
       ORDER BY s.updated_at DESC`,
    )
    .all(...params) as AdminStory[];
}

export function adminStory(id: string): AdminStory | null {
  const row = getDb()
    .prepare(
      `SELECT ${STORY}
       FROM stories s
       LEFT JOIN authors a ON a.id = s.author_id
       LEFT JOIN categories c ON c.id = s.primary_category_id
       WHERE s.id = ?`,
    )
    .get(id) as AdminStory | undefined;
  return row ?? null;
}

export function storyCategoryIds(id: string): string[] {
  return (getDb().prepare(`SELECT category_id AS id FROM story_categories WHERE story_id = ?`).all(id) as { id: string }[]).map(
    (row) => row.id,
  );
}

export function storyRelatedIds(id: string): string[] {
  return (getDb().prepare(`SELECT related_id AS id FROM story_relations WHERE story_id = ?`).all(id) as { id: string }[]).map(
    (row) => row.id,
  );
}

export function storyImageIds(id: string): string[] {
  return (
    getDb().prepare(`SELECT media_id AS id FROM story_images WHERE story_id = ? ORDER BY sort_order`).all(id) as { id: string }[]
  ).map((row) => row.id);
}

export function storyTagText(id: string): string {
  return tagsFor(id).join("، ");
}

export function adminCategories() {
  return getDb()
    .prepare(
      `SELECT id, name, slug, description, image_id AS imageId, icon, color_token AS colorToken,
        sort_order AS sortOrder, published, show_on_home AS showOnHome, show_in_nav AS showInNav,
        featured, origin,
        (SELECT COUNT(*) FROM stories s WHERE s.primary_category_id = categories.id) AS storyCount
       FROM categories ORDER BY sort_order ASC, name ASC`,
    )
    .all() as Array<{
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
    origin: string;
    storyCount: number;
  }>;
}

export function adminCategory(id: string) {
  return adminCategories().find((item) => item.id === id) ?? null;
}

export function adminAuthors() {
  return getDb()
    .prepare(
      `SELECT id, name, slug, bio, image_id AS imageId, featured, origin,
        (SELECT COUNT(*) FROM stories s WHERE s.author_id = authors.id) AS storyCount
       FROM authors ORDER BY name ASC`,
    )
    .all() as Array<{
    id: string;
    name: string;
    slug: string;
    bio: string | null;
    imageId: string | null;
    featured: number;
    origin: string;
    storyCount: number;
  }>;
}

export function adminAuthor(id: string) {
  return adminAuthors().find((item) => item.id === id) ?? null;
}

export function allStoriesBrief() {
  return getDb()
    .prepare(`SELECT id, title, slug, published FROM stories ORDER BY title ASC`)
    .all() as { id: string; title: string; slug: string; published: number }[];
}
