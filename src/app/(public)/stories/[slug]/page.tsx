import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ageLabel, arNumber, minutesLabel } from "@/lib/format";
import { isFavorite } from "@/lib/queries";
import { extraImages, getStoryBySlug, moreFromAuthor, relatedStories, similarStories } from "@/lib/recommend";
import { StoryList } from "@/components/StoryCard";
import { ViewBeacon } from "@/components/ViewBeacon";
import { toggleFavorite } from "@/server/actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = getStoryBySlug(slug);
  return { title: story?.title || "قصة", description: story?.shortDescription || undefined };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = getStoryBySlug(slug);
  if (!story) notFound();
  const user = await getCurrentUser();
  const saved = user ? isFavorite(user.id, story.id) : false;
  const related = relatedStories(story.id);
  const fromAuthor = story.authorId ? moreFromAuthor(story.authorId, story.id) : [];
  const taken = new Set([story.id, ...related.map((item) => item.id), ...fromAuthor.map((item) => item.id)]);
  const similar = similarStories(story, 4, [...taken]);
  const images = extraImages(story.id);
  const meta = [
    ageLabel(story.ageMin, story.ageMax),
    minutesLabel(story.readingMinutes),
    story.genre,
    story.storyType,
  ].filter(Boolean);
  const paragraphs = (story.fullDescription || "").split(/\n+/).map((part) => part.trim()).filter(Boolean);

  return (
    <div className="wrap page">
      <ViewBeacon slug={story.slug} />
      <nav className="crumbs" aria-label="مسار التنقل">
        <Link href="/">الرئيسية</Link>
        <span aria-hidden="true">/</span>
        {story.categorySlug ? <Link href={`/categories/${story.categorySlug}`}>{story.categoryName}</Link> : <Link href="/explore">استكشف</Link>}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{story.title}</span>
      </nav>
      <article className="story-layout">
        <div className="story-cover">
          {story.coverId ? (
            <img src={`/api/media/${story.coverId}`} alt={story.coverAlt || `غلاف ${story.title}`} width={600} height={800} />
          ) : null}
        </div>
        <div>
          <h1>{story.title}</h1>
          {story.authorName && story.authorSlug ? (
            <p className="meta">
              <Link href={`/authors/${story.authorSlug}`}>{story.authorName}</Link>
            </p>
          ) : null}
          {story.shortDescription ? <p className="lead">{story.shortDescription}</p> : null}
          {meta.length ? (
            <p className="meta-row">
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </p>
          ) : null}
          {story.seriesName ? (
            <p className="muted">
              سلسلة: {story.seriesName}
              {story.episodeNumber ? ` · الجزء ${arNumber(story.episodeNumber)}` : ""}
            </p>
          ) : null}
          {story.narrator ? <p className="muted">الرواية بصوت {story.narrator}</p> : null}
          <form action={toggleFavorite}>
            <input type="hidden" name="slug" value={story.slug} />
            <button className={saved ? "btn-quiet" : ""} type="submit">
              {saved ? "إزالة من المفضلة" : "حفظ القصة"}
            </button>
          </form>
          {paragraphs.length ? (
            <div className="prose">
              {paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>
          ) : null}
          {story.tags && story.tags.length ? (
            <p className="tags">
              {story.tags.map((tag) => (
                <Link className="tag" key={tag} href={`/search?q=${encodeURIComponent(tag)}`}>
                  {tag}
                </Link>
              ))}
            </p>
          ) : null}
          {images.length ? (
            <div className="picker-grid" style={{ marginTop: "1rem" }}>
              {images.map((image) => (
                <img key={image.id} src={`/api/media/${image.id}`} alt={image.alt} />
              ))}
            </div>
          ) : null}
          {story.audioUrl ? (
            <p>
              <a href={story.audioUrl} rel="noreferrer">
                استماع
              </a>
            </p>
          ) : null}
          {story.videoUrl ? (
            <p>
              <a href={story.videoUrl} rel="noreferrer">
                مشاهدة
              </a>
            </p>
          ) : null}
          {story.externalSource ? (
            <p>
              <a href={story.externalSource} rel="noreferrer">
                المصدر
              </a>
            </p>
          ) : null}
          {story.authorSlug ? (
            <Link className="author-box" href={`/authors/${story.authorSlug}`}>
              <span>
                <strong>{story.authorName}</strong>
                <span className="muted"> المزيد من هذا المؤلف</span>
              </span>
            </Link>
          ) : null}
        </div>
      </article>
      {related.length ? (
        <section className="section">
          <h2>قصص مرتبطة</h2>
          <StoryList stories={related} layout="grid" />
        </section>
      ) : null}
      {fromAuthor.length ? (
        <section className="section">
          <h2>المزيد من {story.authorName}</h2>
          <StoryList stories={fromAuthor} layout="rail" />
        </section>
      ) : null}
      {similar.length ? (
        <section className="section">
          <h2>قصص قريبة</h2>
          <StoryList stories={similar} layout="grid" />
        </section>
      ) : null}
    </div>
  );
}
