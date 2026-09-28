import { notFound } from "next/navigation";
import { adminCategory } from "@/lib/admin-data";
import { deleteCategory } from "@/server/actions";
import { Notice } from "@/components/Notice";
import { arNumber } from "@/lib/format";

export default async function DeleteCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const category = adminCategory(id);
  if (!category) notFound();
  return (
    <>
      <h1>حذف «{category.name}»</h1>
      <p>سيبقى {arNumber(category.storyCount)} من القصص، ويُزال التصنيف عنها. اكتب كلمة حذف.</p>
      <Notice error={query.error} />
      <form action={deleteCategory} className="stack">
        <input type="hidden" name="id" value={category.id} />
        <label>
          التأكيد
          <input name="confirm" required />
        </label>
        <button className="btn-danger" type="submit">
          حذف التصنيف
        </button>
      </form>
    </>
  );
}
