import { notFound } from "next/navigation";
import { adminAuthor } from "@/lib/admin-data";
import { deleteAuthor } from "@/server/actions";
import { Notice } from "@/components/Notice";

export default async function DeleteAuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const author = adminAuthor(id);
  if (!author) notFound();
  return (
    <>
      <h1>حذف «{author.name}»</h1>
      <p>تبقى القصص، ويُزال اسم المؤلف منها. اكتب كلمة حذف.</p>
      <Notice error={query.error} />
      <form action={deleteAuthor} className="stack">
        <input type="hidden" name="id" value={author.id} />
        <label>
          التأكيد
          <input name="confirm" required />
        </label>
        <button className="btn-danger" type="submit">
          حذف المؤلف
        </button>
      </form>
    </>
  );
}
