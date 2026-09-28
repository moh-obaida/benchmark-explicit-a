import { getDb } from "./db";
import { getSettings, type Weights } from "./settings";
import { safeDecode } from "./format";

export type StoryCard = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  fullDescription?: string | null;
  authorId: string | null;
  authorName: string | null;
  authorSlug: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  coverId: string | null;
  coverAlt: string | null;
  readingMinutes: number | null;
  ageMin: number | null;
  ageMax: number | null;
  genre: string | null;
  storyType: string | null;
  featured: number;
  popularity: number;
  priority: number;
  viewCount: number;
  favoriteCount: number;
  publishAt: string | null;
  displayOrder: number;
  narrator?: string | null;
  seriesName?: string | null;
  episodeNumber?: number | null;
  externalSource?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  tags?: string[];
};

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

export function publishedClause(alias = "s") {
  return `${alias}.published = 1 AND (${alias}.publish_at IS NULL OR ${alias}.publish_at <= ?)`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function listPublishedStories(): StoryCard[] {
  return getDb()
    .prepare(`SELECT ${CARD_SELECT} ${FROM} WHERE ${publishedClause()} ORDER BY s.publish_at DESC`)
    .all(nowIso()) as unknown as StoryCard[];
}

export function getStoryBySlug(slug: string): StoryCard | null {
  const decoded = safeDecode(slug);
  const row = getDb()
    .prepare(
      `SELECT ${CARD_SELECT},
        s.full_description AS fullDescription,
        s.narrator AS narrator,
        s.series_name AS seriesName,
        s.episode_number AS episodeNumber,
        s.external_source AS externalSource,
        s.audio_url AS audioUrl,
        s.video_url AS videoUrl
       ${FROM}
       WHERE s.slug = ? AND ${publishedClause()}`,
    )
    .get(decoded, nowIso()) as StoryCard | undefined;
  if (!row) return null;
  row.tags = tagsFor(row.id);
  return row;
}

export function tagsFor(storyId: string): string[] {
  const rows = getDb()
    .prepare(
      `SELECT t.name AS name FROM story_tags st JOIN tags t ON t.id = st.tag_id WHERE st.story_id = ? ORDER BY t.name`,
    )
    .all(storyId) as { name: string }[];
  return rows.map((row) => row.name);
}

export function tagIdsFor(storyId: string): string[] {
  const rows = getDb().prepare(`SELECT tag_id AS id FROM story_tags WHERE story_id = ?`).all(storyId) as { id: string }[];
  return rows.map((row) => row.id);
}

export function categoryIdsFor(storyId: string): string[] {
  const rows = getDb()
    .prepare(`SELECT category_id AS id FROM story_categories WHERE story_id = ?`)
    .all(storyId) as { id: string }[];
  return rows.map((row) => row.id);
}

export function relatedStories(storyId: string): StoryCard[] {
  return getDb()
    .prepare(
      `SELECT ${CARD_SELECT} ${FROM}
       JOIN story_relations r ON r.related_id = s.id
       WHERE r.story_id = ? AND ${publishedClause()}
       ORDER BY s.display_order ASC`,
    )
    .all(storyId, nowIso()) as unknown as StoryCard[];
}

export function moreFromAuthor(authorId: string, exceptId: string, limit = 4): StoryCard[] {
  return getDb()
    .prepare(
      `SELECT ${CARD_SELECT} ${FROM}
       WHERE s.author_id = ? AND s.id != ? AND ${publishedClause()}
       ORDER BY s.publish_at DESC LIMIT ?`,
    )
    .all(authorId, exceptId, nowIso(), limit) as unknown as StoryCard[];
}

export function extraImages(storyId: string): { id: string; alt: string }[] {
  return getDb()
    .prepare(
      `SELECT m.id, m.alt FROM story_images si JOIN media m ON m.id = si.media_id
       WHERE si.story_id = ? ORDER BY si.sort_order ASC`,
    )
    .all(storyId) as { id: string; alt: string }[];
}

export type RankContext = {
  viewedIds: string[];
  categoryIds: string[];
  authorIds: string[];
  tagIds: string[];
};

export function buildRankContext(userId: string | null, anonId: string | null, seenIds: string[]): RankContext {
  const db = getDb();
  const viewed = new Set(seenIds);
  if (userId) {
    const rows = db
      .prepare(`SELECT story_id AS id FROM activity WHERE user_id = ? AND event = 'view' ORDER BY created_at DESC LIMIT 40`)
      .all(userId) as { id: string }[];
    rows.forEach((row) => viewed.add(row.id));
    const favs = db.prepare(`SELECT story_id AS id FROM favorites WHERE user_id = ?`).all(userId) as { id: string }[];
    favs.forEach((row) => viewed.add(row.id));
  } else if (anonId) {
    const rows = db
      .prepare(`SELECT story_id AS id FROM activity WHERE anon_id = ? AND event = 'view' ORDER BY created_at DESC LIMIT 40`)
      .all(anonId) as { id: string }[];
    rows.forEach((row) => viewed.add(row.id));
  }
  const ids = [...viewed].filter(Boolean);
  const categoryIds = new Set<string>();
  const authorIds = new Set<string>();
  const tagIds = new Set<string>();
  for (const id of ids) {
    const story = db
      .prepare(`SELECT author_id AS authorId, primary_category_id AS categoryId FROM stories WHERE id = ?`)
      .get(id) as { authorId: string | null; categoryId: string | null } | undefined;
    if (story?.authorId) authorIds.add(story.authorId);
    if (story?.categoryId) categoryIds.add(story.categoryId);
    categoryIdsFor(id).forEach((categoryId) => categoryIds.add(categoryId));
    tagIdsFor(id).forEach((tagId) => tagIds.add(tagId));
  }
  return { viewedIds: ids, categoryIds: [...categoryIds], authorIds: [...authorIds], tagIds: [...tagIds] };
}

export function rankStories(candidates: StoryCard[], context: RankContext, weights: Weights = getSettings().weights): StoryCard[] {
  const recentDays = getSettings().recent_days;
  const maxPop = Math.max(1, ...candidates.map((story) => story.popularity || 0));
  const maxPriority = Math.max(1, ...candidates.map((story) => story.priority || 0));
  const hasHistory = context.viewedIds.length > 0;
  const scored = candidates.map((story) => {
    const ageDays = story.publishAt ? (Date.now() - new Date(story.publishAt).getTime()) / 86400000 : recentDays;
    const recency = Math.max(0, 1 - ageDays / recentDays);
    let score =
      (story.popularity / maxPop) * weights.popularity +
      (story.priority / maxPriority) * weights.priority +
      (story.featured ? weights.featured : 0) +
      recency * weights.recency;
    if (hasHistory) {
      const categories = new Set(categoryIdsFor(story.id));
      if (story.categoryId) categories.add(story.categoryId);
      const categoryHit = [...categories].some((id) => context.categoryIds.includes(id));
      const tags = tagIdsFor(story.id);
      const tagHit = tags.some((id) => context.tagIds.includes(id));
      if (categoryHit) score += weights.category;
      if (tagHit) score += weights.tag;
      if (story.authorId && context.authorIds.includes(story.authorId)) score += weights.author;
      if (context.viewedIds.includes(story.id)) score -= weights.viewedPenalty;
    }
    return { story, score };
  });
  scored.sort((a, b) => b.score - a.score || a.story.displayOrder - b.story.displayOrder);
  return scored.map((item) => item.story);
}

export function similarStories(story: StoryCard, limit = 4, except: string[] = []): StoryCard[] {
  const context: RankContext = {
    viewedIds: [story.id, ...except],
    categoryIds: [story.categoryId, ...categoryIdsFor(story.id)].filter((id): id is string => Boolean(id)),
    authorIds: [],
    tagIds: tagIdsFor(story.id),
  };
  const pool = listPublishedStories().filter((item) => item.id !== story.id && !except.includes(item.id));
  return rankStories(pool, context).slice(0, limit);
}
