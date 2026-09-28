import Link from "next/link";
import { adminStoryList } from "@/lib/admin-data";
import { storyStatus, Notice } from "@/components/Notice";

export const metadata = { title: "القصص" };

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; saved?: string; error?: string }>;
}) {
  const query = await searchParams;
  const stories = adminStoryList(query.q || "", query.status || "all");
  return (
    <>
      <div className="section-head">
        <h1>القصص</h1>
        <Link className="btn" href="/admin/stories/new">
          إضافة قصة
        </Link>
      </div>
      <Notice saved={query.saved} error={query.error} />
      <form className="filters" method="get">
        <label>
          بحث
          <input name="q" defaultValue={query.q || ""} />
        </label>
        <label>
          الحالة
          <select name="status" defaultValue={query.status || "all"}>
            <option value="all">الكل</option>
            <option value="published">منشورة</option>
            <option value="draft">مسودة</option>
            <option value="demo">تجريبي</option>
          </select>
        </label>
        <button type="submit">عرض</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>العنوان</th>
              <th>الحالة</th>
              <th>التصنيف</th>
              <th>المؤلف</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {stories.map((story) => {
              const status = storyStatus(story.published, story.publishAt);
              return (
                <tr key={story.id}>
                  <td>
                    {story.title}
                    {story.origin === "demo" ? <span className="muted"> · تجريبي</span> : null}
                  </td>
                  <td>
                    <span className={status.live ? "status live" : "status"}>
                      <i />
                      {status.label}
                    </span>
                  </td>
                  <td>{story.categoryName || "—"}</td>
                  <td>{story.authorName || "—"}</td>
                  <td>
                    <Link href={`/admin/stories/${story.id}`}>تعديل</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {stories.length === 0 ? <p>لا توجد قصص هنا حتى الآن.</p> : null}
    </>
  );
}
