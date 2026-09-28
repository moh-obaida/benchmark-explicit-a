import { dashboardCounts } from "@/lib/queries";
import { deleteDemo } from "@/server/actions";
import { Notice } from "@/components/Notice";
import { arNumber } from "@/lib/format";

export default async function DemoDeletePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const counts = dashboardCounts();
  return (
    <>
      <h1>حذف المحتوى التجريبي</h1>
      <p>سيُحذف {arNumber(counts.demo)} من القصص التجريبية التي لم تُعدَّل بعد، مع المؤلفين والتصنيفات التجريبية غير المستخدمة. أقسام الصفحة الرئيسية تبقى.</p>
      <Notice error={query.error} />
      <form action={deleteDemo} className="stack">
        <label>
          اكتب كلمة حذف
          <input name="confirm" required />
        </label>
        <button className="btn-danger" type="submit">
          حذف المحتوى التجريبي
        </button>
      </form>
    </>
  );
}
