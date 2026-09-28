import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthorBySlug, storiesByAuthor } from "@/lib/queries";
import { StoryCardView } from "@/components/StoryCard";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  return { title: author?.name || "مؤلف" };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) notFound();
  const stories = storiesByAuthor(author.id);
  return (
    <div className="wrap page">
      <nav className="crumbs" aria-label="مسار التنقل">
        <Link href="/">الرئيسية</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{author.name}</span>
      </nav>
      <h1>{author.name}</h1>
      {author.bio ? <p className="lead">{author.bio}</p> : null}
      {stories.length === 0 ? (
        <div className="empty">
          <h2>لا توجد قصص هنا حتى الآن.</h2>
        </div>
      ) : (
        <ul className="story-grid" style={{ marginTop: "1.2rem" }}>
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
