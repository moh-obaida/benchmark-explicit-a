import Link from "next/link";
import { minutesLabel } from "@/lib/format";
import type { StoryCard } from "@/lib/recommend";

export function StoryCardView({ story, eager = false }: { story: StoryCard; eager?: boolean }) {
  const meta = [story.authorName, story.categoryName, minutesLabel(story.readingMinutes)].filter(Boolean);
  return (
    <article className="card">
      <Link href={`/stories/${story.slug}`} className="card-link">
        <span className="card-cover">
          {story.coverId ? (
            <img
              src={`/api/media/${story.coverId}`}
              alt={story.coverAlt || `غلاف ${story.title}`}
              width={600}
              height={800}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
            />
          ) : (
            <span className="card-cover" />
          )}
        </span>
        <span className="card-body">
          <h3>{story.title}</h3>
          {meta.length > 0 ? <p>{meta.join(" · ")}</p> : null}
        </span>
      </Link>
    </article>
  );
}

export function StoryList({ stories, layout, eager = false }: { stories: StoryCard[]; layout: string; eager?: boolean }) {
  if (!stories.length) {
    return (
      <div className="empty">
        <h2>لا توجد قصص هنا حتى الآن.</h2>
        <Link href="/categories">تصفح التصنيفات</Link>
      </div>
    );
  }
  if (layout === "feature" && stories.length > 1) {
    const [first, ...rest] = stories;
    return (
      <div className="feature">
        <Link href={`/stories/${first.slug}`} className="feature-main">
          {first.coverId ? (
            <img src={`/api/media/${first.coverId}`} alt={first.coverAlt || `غلاف ${first.title}`} width={600} height={800} loading={eager ? "eager" : "lazy"} />
          ) : (
            <span />
          )}
          <span className="feature-copy">
            <h3>{first.title}</h3>
            <p className="muted">{[first.authorName, first.categoryName].filter(Boolean).join(" · ")}</p>
            {first.shortDescription ? <p>{first.shortDescription}</p> : null}
          </span>
        </Link>
        <div className="feature-side">
          {rest.map((story) => (
            <Link key={story.id} href={`/stories/${story.slug}`}>
              {story.coverId ? <img src={`/api/media/${story.coverId}`} alt="" width={54} height={72} loading="lazy" /> : <span />}
              <span>{story.title}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }
  const Tag = layout === "rail" ? "ul" : "ul";
  return (
    <Tag className={layout === "grid" ? "story-grid" : "rail"}>
      {stories.map((story, index) => (
        <li key={story.id}>
          <StoryCardView story={story} eager={eager && index < 2} />
        </li>
      ))}
    </Tag>
  );
}
