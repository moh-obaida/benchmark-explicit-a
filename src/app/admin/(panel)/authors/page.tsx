import Link from "next/link";
import { adminAuthors } from "@/lib/admin-data";
import { Notice } from "@/components/Notice";

export const metadata = { title: "المؤلفون" };

export default async function AuthorsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const query = await searchParams;
  const authors = adminAuthors();
  return (
    <>
      <div className="section-head">
        <h1>المؤلفون</h1>
        <Link className="btn" href="/admin/authors/new">
          إضافة مؤلف
        </Link>
      </div>
      <Notice saved={query.saved} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>القصص</th>
              <th>بارز</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {authors.map((author) => (
              <tr key={author.id}>
                <td>
                  {author.name}
                  {author.origin === "demo" ? <span className="muted"> · تجريبي</span> : null}
                </td>
                <td>{author.storyCount}</td>
                <td>{author.featured ? "نعم" : "لا"}</td>
                <td>
                  <Link href={`/admin/authors/${author.id}`}>تعديل</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
