import { notFound } from "next/navigation";
import { adminStory } from "@/lib/admin-data";
import { deleteStory } from "@/server/actions";
import { Notice } from "@/components/Notice";

export default async function DeleteStoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const story = adminStory(id);
  if (!story) notFound();
  return (
    <>
      <h1>حذف «{story.title}»</h1>
      <p>الحذف نهائي. اكتب كلمة حذف للمتابعة.</p>
      <Notice error={query.error} />
      <form action={deleteStory} className="stack">
        <input type="hidden" name="id" value={story.id} />
        <label>
          التأكيد
          <input name="confirm" required />
        </label>
        <button className="btn-danger" type="submit">
          حذف القصة
        </button>
      </form>
    </>
  );
}
