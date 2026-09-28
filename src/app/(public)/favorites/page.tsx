import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getStoryBySlug } from "@/lib/recommend";
import { listFavorites } from "@/lib/queries";
import { StoryCardView } from "@/components/StoryCard";
import { Notice } from "@/components/Notice";
import { logout, saveVisitor, toggleFavorite } from "@/server/actions";

export const metadata = { title: "المفضلة" };

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ save?: string; error?: string }>;
}) {
  const query = await searchParams;
  const user = await getCurrentUser();
  const pending = query.save ? getStoryBySlug(query.save) : null;
  const stories = user ? listFavorites(user.id) : [];

  return (
    <div className="wrap page">
      <h1>المفضلة</h1>
      <Notice error={query.error} />
      {!user ? (
        <div className="empty">
          <h2>لم تحفظ أي قصة بعد.</h2>
          <p>التصفّح لا يحتاج حسابًا. لحفظ القصص نحتاج اسمك وبريدك فقط، حتى تجدها حين تعود.</p>
          {pending ? <p>ستُحفظ «{pending.title}» بعد هذه الخطوة.</p> : null}
          <form action={saveVisitor} className="stack">
            <input type="hidden" name="slug" value={query.save || ""} />
            <label>
              الاسم
              <input name="name" required autoComplete="name" />
            </label>
            <label>
              البريد
              <input name="email" type="email" dir="ltr" required autoComplete="email" />
            </label>
            <button type="submit">{pending ? "حفظ القصة" : "متابعة"}</button>
          </form>
          <Link href="/explore">استكشف القصص</Link>
        </div>
      ) : (
        <>
          <p className="muted">
            {user.name}
            <form action={logout} style={{ display: "inline" }}>
              <button className="btn-quiet" type="submit">
                خروج
              </button>
            </form>
          </p>
          {stories.length === 0 ? (
            <div className="empty">
              <h2>لم تحفظ أي قصة بعد.</h2>
              <Link href="/explore">استكشف القصص</Link>
            </div>
          ) : (
            <ul className="story-grid">
              {stories.map((story) => (
                <li key={story.id}>
                  <StoryCardView story={story} />
                  <form action={toggleFavorite}>
                    <input type="hidden" name="slug" value={story.slug} />
                    <input type="hidden" name="back" value="favorites" />
                    <button className="btn-quiet" type="submit">
                      إزالة من المفضلة
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
