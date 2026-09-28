import Link from "next/link";
import { notFound } from "next/navigation";
import { adminCategory } from "@/lib/admin-data";
import { listMedia } from "@/lib/queries";
import { CategoryForm } from "@/components/CategoryForm";
import { Notice } from "@/components/Notice";

export default async function EditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const category = adminCategory(id);
  if (!category) notFound();
  return (
    <>
      <div className="section-head">
        <h1>{category.name}</h1>
        <Link href={`/admin/categories/${category.id}/delete`}>حذف</Link>
      </div>
      <Notice error={query.error} saved={query.saved} />
      <CategoryForm category={category} media={listMedia().map((item) => ({ id: item.id, alt: item.alt }))} />
    </>
  );
}
