import Link from "next/link";
import { adminCategories } from "@/lib/admin-data";
import { moveCategory } from "@/server/actions";
import { Notice } from "@/components/Notice";
import { toneHex } from "@/lib/palette";

export const metadata = { title: "التصنيفات" };

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const query = await searchParams;
  const categories = adminCategories();
  return (
    <>
      <div className="section-head">
        <h1>التصنيفات</h1>
        <Link className="btn" href="/admin/categories/new">
          إضافة تصنيف
        </Link>
      </div>
      <Notice saved={query.saved} error={query.error} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الظهور</th>
              <th>القصص</th>
              <th>الترتيب</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>
                  <span className="tone-mark" style={{ ["--mark" as string]: toneHex(category.colorToken) }} /> {category.name}
                  {category.origin === "demo" ? <span className="muted"> · تجريبي</span> : null}
                </td>
                <td>
                  {category.published ? "منشور" : "مخفي"}
                  {category.showOnHome ? " · الرئيسية" : ""}
                  {category.showInNav ? " · القائمة" : ""}
                </td>
                <td>{category.storyCount}</td>
                <td className="actions">
                  <form action={moveCategory}>
                    <input type="hidden" name="id" value={category.id} />
                    <button className="btn-quiet" name="dir" value="up" type="submit">
                      أعلى
                    </button>
                  </form>
                  <form action={moveCategory}>
                    <input type="hidden" name="id" value={category.id} />
                    <button className="btn-quiet" name="dir" value="down" type="submit">
                      أسفل
                    </button>
                  </form>
                </td>
                <td>
                  <Link href={`/admin/categories/${category.id}`}>تعديل</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
