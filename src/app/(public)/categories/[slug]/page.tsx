import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug, storiesByCategory } from "@/lib/queries";
import { StoryCardView } from "@/components/StoryCard";
import { toneHex } from "@/lib/palette";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  return { title: category?.name || "تصنيف" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();
  const stories = storiesByCategory(category.id);
  return (
    <div className="wrap page">
      <nav className="crumbs" aria-label="مسار التنقل">
        <Link href="/">الرئيسية</Link>
        <span aria-hidden="true">/</span>
        <Link href="/categories">التصنيفات</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{category.name}</span>
      </nav>
      <h1>{category.name}</h1>
      {category.description ? <p className="lead">{category.description}</p> : null}
      <div className="tone-mark" style={{ ["--mark" as string]: toneHex(category.colorToken), margin: "1rem 0" }} />
      {stories.length === 0 ? (
        <div className="empty">
          <h2>لا توجد قصص هنا حتى الآن.</h2>
          <Link href="/categories">التصنيفات الأخرى</Link>
        </div>
      ) : (
        <ul className="story-grid">
          {stories.map((story) => (
            <li key={story.id}>
              <StoryCardView story={story} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
