import { getDb } from "@/lib/db";
import { nowIso, publishedClause } from "@/lib/recommend";
import { readAnonId, rememberView, getCurrentUser } from "@/lib/auth";
import { safeDecode } from "@/lib/format";

export async function POST(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await context.params;
  const slug = safeDecode(raw);
  const story = getDb()
    .prepare(`SELECT id, primary_category_id AS categoryId FROM stories s WHERE s.slug = ? AND ${publishedClause("s")}`)
    .get(slug, nowIso()) as { id: string; categoryId: string | null } | undefined;
  if (!story) return new Response(null, { status: 404 });
  const user = await getCurrentUser();
  let anon = await readAnonId();
  if (!anon) anon = crypto.randomUUID();
  const already = await rememberView(story.id, anon);
  if (!already) {
    getDb().prepare(`UPDATE stories SET view_count = view_count + 1 WHERE id = ?`).run(story.id);
    getDb()
      .prepare(
        `INSERT INTO activity (id, user_id, anon_id, story_id, category_id, event, created_at) VALUES (?, ?, ?, ?, ?, 'view', ?)`,
      )
      .run(crypto.randomUUID(), user?.id ?? null, anon, story.id, story.categoryId, new Date().toISOString());
  }
  return new Response(null, { status: 204 });
}
