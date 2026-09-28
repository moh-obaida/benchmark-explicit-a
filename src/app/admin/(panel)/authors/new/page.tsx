import { AuthorForm } from "@/components/AuthorForm";
import { Notice } from "@/components/Notice";
import { listMedia } from "@/lib/queries";

export const metadata = { title: "إضافة مؤلف" };

export default async function NewAuthorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <>
      <h1>إضافة مؤلف</h1>
      <Notice error={query.error} />
      <AuthorForm media={listMedia().map((item) => ({ id: item.id, alt: item.alt }))} />
    </>
  );
}
