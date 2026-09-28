import { CategoryForm } from "@/components/CategoryForm";
import { Notice } from "@/components/Notice";
import { listMedia } from "@/lib/queries";

export const metadata = { title: "إضافة تصنيف" };

export default async function NewCategoryPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <>
      <h1>إضافة تصنيف</h1>
      <Notice error={query.error} />
      <CategoryForm media={listMedia().map((item) => ({ id: item.id, alt: item.alt }))} />
    </>
  );
}
