import { getDb } from "./db";
import { clampLimit, approvedSource, approvedStoryLayout } from "./constants";
import { getSettings } from "./settings";
import {
  buildRankContext,
  listPublishedStories,
  rankStories,
  type RankContext,
  type StoryCard,
} from "./recommend";
import { listFeaturedAuthors, listHomeCategories, sectionLinks, storiesByCategory, type AuthorRow, type CategoryRow, type SectionRow } from "./queries";

export type ResolvedSection = SectionRow & {
  stories: StoryCard[];
  categories: CategoryRow[];
  authors: AuthorRow[];
};

export function resolveSections(context: RankContext, enabledOnly = true): ResolvedSection[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, section_type AS sectionType, title, subtitle, enabled, sort_order AS sortOrder,
        mode, source, category_id AS categoryId, item_limit AS itemLimit, layout, accent_token AS accentToken,
        body, image_id AS imageId, link_href AS linkHref, link_label AS linkLabel
       FROM homepage_sections ${enabledOnly ? "WHERE enabled = 1" : ""}
       ORDER BY sort_order ASC`,
    )
    .all() as SectionRow[];
  const used = new Set<string>();
  return rows.map((section) => {
    const resolved = resolveOne(section, context, used);
    if (section.mode !== "manual") {
      resolved.stories.forEach((story) => used.add(story.id));
    }
    return resolved;
  });
}

export function resolveOne(section: SectionRow, context: RankContext, used = new Set<string>()): ResolvedSection {
  const limit = clampLimit(section.itemLimit, 4);
  const base = {
    ...section,
    layout: section.sectionType === "stories" ? approvedStoryLayout(section.layout) : section.layout,
    stories: [] as StoryCard[],
    categories: [] as CategoryRow[],
    authors: [] as AuthorRow[],
  };
  if (section.sectionType === "categories") {
    base.categories = listHomeCategories().slice(0, limit);
    return base;
  }
  if (section.sectionType === "authors") {
    base.authors = listFeaturedAuthors(limit);
    return base;
  }
  if (section.sectionType !== "stories") return base;

  const links = sectionLinks(section.id);
  const pinnedIds = links.filter((link) => link.pinned && !link.excluded).sort((a, b) => a.sortOrder - b.sortOrder);
  const excluded = new Set(links.filter((link) => link.excluded).map((link) => link.storyId));
  const byId = new Map(listPublishedStories().map((story) => [story.id, story]));

  if (section.mode === "manual") {
    const manual = links
      .filter((link) => !link.excluded)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((link) => byId.get(link.storyId))
      .filter((story): story is StoryCard => Boolean(story));
    base.stories = manual.slice(0, limit);
    return base;
  }

  const source = approvedSource(section.source);
  let pool = [...byId.values()].filter((story) => !excluded.has(story.id));
  if (source === "category" && section.categoryId) {
    const ids = new Set(storiesByCategory(section.categoryId).map((story) => story.id));
    pool = pool.filter((story) => ids.has(story.id));
  } else if (source === "featured") {
    pool = pool.filter((story) => story.featured === 1);
  } else if (source === "picks") {
    pool = pool.filter((story) => story.priority > 0).sort((a, b) => b.priority - a.priority);
  } else if (source === "popular") {
    pool = pool.sort(
      (a, b) => b.popularity - a.popularity || b.favoriteCount - a.favoriteCount || b.viewCount - a.viewCount,
    );
  } else if (source === "recent") {
    const windowMs = getSettings().recent_days * 86400000;
    const fresh = pool.filter((story) => story.publishAt && Date.now() - new Date(story.publishAt).getTime() <= windowMs);
    pool = (fresh.length ? fresh : pool).sort(
      (a, b) => new Date(b.publishAt || 0).getTime() - new Date(a.publishAt || 0).getTime(),
    );
  } else {
    pool = rankStories(pool, context);
  }

  const fresh = pool.filter((story) => !used.has(story.id));
  const rest = pool.filter((story) => used.has(story.id));
  const ordered = [...fresh, ...rest];
  const pinned = pinnedIds.map((link) => byId.get(link.storyId)).filter((story): story is StoryCard => Boolean(story));
  const pinnedSet = new Set(pinned.map((story) => story.id));
  const merged = [...pinned, ...ordered.filter((story) => !pinnedSet.has(story.id))];
  base.stories = merged.slice(0, limit);
  return base;
}

export function previewContext(): RankContext {
  return { viewedIds: [], categoryIds: [], authorIds: [], tagIds: [] };
}

export async function visitorContext(userId: string | null, anonId: string | null, seenIds: string[]) {
  return buildRankContext(userId, anonId, seenIds);
}
