import Link from "next/link";
import { notFound } from "next/navigation";
import { adminAuthors, adminCategories, adminStory, allStoriesBrief, storyCategoryIds, storyImageIds, storyRelatedIds, storyTagText } from "@/lib/admin-data";
import { listMedia } from "@/lib/queries";
import { StoryForm } from "@/components/StoryForm";
import { Notice } from "@/components/Notice";

export const metadata = { title: "تعديل قصة" };

export default async function EditStoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const story = adminStory(id);
  if (!story) notFound();
  return (
    <>
      <div className="section-head">
        <h1>{story.title}</h1>
        <Link href={`/admin/stories/${story.id}/delete`}>حذف</Link>
      </div>
      <Notice error={query.error} saved={query.saved} />
      <StoryForm
        story={story}
        authors={adminAuthors()}
        categories={adminCategories()}
        stories={allStoriesBrief()}
        media={listMedia().map((item) => ({ id: item.id, alt: item.alt }))}
        tags={storyTagText(story.id)}
        categoryIds={storyCategoryIds(story.id)}
        relatedIds={storyRelatedIds(story.id)}
        imageIds={storyImageIds(story.id)}
      />
    </>
  );
}
