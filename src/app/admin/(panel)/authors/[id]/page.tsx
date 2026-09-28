import Link from "next/link";
import { notFound } from "next/navigation";
import { adminAuthor } from "@/lib/admin-data";
import { listMedia } from "@/lib/queries";
import { AuthorForm } from "@/components/AuthorForm";
import { Notice } from "@/components/Notice";

export default async function EditAuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const author = adminAuthor(id);
  if (!author) notFound();
  return (
    <>
      <div className="section-head">
        <h1>{author.name}</h1>
        <Link href={`/admin/authors/${author.id}/delete`}>حذف</Link>
      </div>
      <Notice error={query.error} saved={query.saved} />
      <AuthorForm author={author} media={listMedia().map((item) => ({ id: item.id, alt: item.alt }))} />
    </>
  );
}
