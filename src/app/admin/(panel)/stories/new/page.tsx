import { StoryForm } from "@/components/StoryForm";
import { Notice } from "@/components/Notice";
import { adminAuthors, adminCategories, allStoriesBrief } from "@/lib/admin-data";
import { listMedia } from "@/lib/queries";

export const metadata = { title: "إضافة قصة" };

export default async function NewStoryPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const media = listMedia().map((item) => ({ id: item.id, alt: item.alt }));
  return (
    <>
      <h1>إضافة قصة</h1>
      <Notice error={query.error} />
      <StoryForm
        authors={adminAuthors()}
        categories={adminCategories()}
        stories={allStoriesBrief()}
        media={media}
        tags=""
        categoryIds={[]}
        relatedIds={[]}
        imageIds={[]}
      />
    </>
  );
}
