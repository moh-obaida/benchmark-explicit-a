import Link from "next/link";
import { arNumber, formatDate } from "@/lib/format";
import { dashboardCounts, recentAdminActivity } from "@/lib/queries";
import { Notice } from "@/components/Notice";

export const metadata = { title: "لوحة التحكم" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const query = await searchParams;
  const counts = dashboardCounts();
  const activity = recentAdminActivity();
  const cards = [
    ["القصص", counts.stories],
    ["المنشورة", counts.published],
    ["المسودات", counts.unpublished],
    ["التصنيفات", counts.categories],
    ["المؤلفون", counts.authors],
    ["المشاهدات", counts.views],
    ["الحفظ", counts.favorites],
    ["المميزة", counts.featured],
  ];
  return (
    <>
      <h1>لوحة التحكم</h1>
      <Notice saved={query.saved} error={query.error} />
      <dl className="stats">
        {cards.map(([label, value]) => (
          <div key={String(label)}>
            <dt>{label}</dt>
            <dd>{arNumber(Number(value))}</dd>
          </div>
        ))}
      </dl>
      <div className="quick">
        <Link className="btn" href="/admin/stories/new">
          إضافة قصة
        </Link>
        <Link className="btn btn-quiet" href="/admin/categories/new">
          إضافة تصنيف
        </Link>
        <Link className="btn btn-quiet" href="/admin/authors/new">
          إضافة مؤلف
        </Link>
        <Link className="btn btn-quiet" href="/admin/homepage">
          تعديل الصفحة الرئيسية
        </Link>
      </div>
      <h2>آخر الحركة</h2>
      {activity.length === 0 ? (
        <p>لا توجد حركات بعد.</p>
      ) : (
        <ul>
          {activity.map((item) => (
            <li key={`${item.createdAt}-${item.action}`}>
              {item.action} · {formatDate(item.createdAt)}
            </li>
          ))}
        </ul>
      )}
      {counts.demo > 0 ? (
        <p>
          <Link href="/admin/demo-delete">حذف المحتوى التجريبي ({arNumber(counts.demo)})</Link>
        </p>
      ) : null}
    </>
  );
}
