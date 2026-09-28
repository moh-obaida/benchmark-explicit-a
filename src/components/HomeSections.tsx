import Link from "next/link";
import { SearchBox } from "./SearchBox";
import { StoryList } from "./StoryCard";
import { CategoryIcon } from "./Icons";
import { toneHex } from "@/lib/palette";
import type { ResolvedSection } from "@/lib/sections";

export function HomeSections({ sections }: { sections: ResolvedSection[] }) {
  return (
    <>
      {sections.map((section) => {
        if (section.sectionType === "hero") {
          return (
            <section className="hero" key={section.id} aria-labelledby={`s-${section.id}`}>
              <div className="wrap">
                <h1 id={`s-${section.id}`}>{section.title}</h1>
                {section.subtitle ? <p className="lead">{section.subtitle}</p> : null}
                {section.layout !== "quiet" ? (
                  <form action="/search" method="get" role="search">
                    <SearchBox />
                  </form>
                ) : null}
              </div>
            </section>
          );
        }
        return (
          <section className="section" key={section.id} aria-labelledby={`s-${section.id}`}>
            <div className="wrap">
              <div className="section-head">
                <div>
                  <div className="section-title">
                    <span className="tone-mark" style={{ ["--mark" as string]: toneHex(section.accentToken) }} />
                    <h2 id={`s-${section.id}`}>{section.title}</h2>
                  </div>
                  {section.subtitle ? <p>{section.subtitle}</p> : null}
                </div>
                {section.linkHref && section.linkLabel ? <Link href={section.linkHref}>{section.linkLabel}</Link> : null}
              </div>
              {section.sectionType === "announcement" && section.body ? <p className="announce">{section.body}</p> : null}
              {section.sectionType === "banner" ? (
                <div className="banner">
                  {section.imageId ? <img src={`/api/media/${section.imageId}`} alt="" /> : null}
                  <div>
                    {section.body ? <p>{section.body}</p> : null}
                    {section.linkHref && section.linkLabel ? <Link href={section.linkHref}>{section.linkLabel}</Link> : null}
                  </div>
                </div>
              ) : null}
              {section.sectionType === "categories" && section.layout === "row" ? (
                <div className="cat-row">
                  {section.categories.map((category) => (
                    <Link key={category.id} href={`/categories/${category.slug}`} style={{ ["--mark" as string]: toneHex(category.colorToken) }}>
                      {category.name}
                    </Link>
                  ))}
                </div>
              ) : null}
              {section.sectionType === "categories" && section.layout !== "row" ? (
                <div className="cat-grid">
                  {section.categories.map((category) => (
                    <Link key={category.id} href={`/categories/${category.slug}`} className="cat-tile" style={{ background: toneHex(category.colorToken) }}>
                      <CategoryIcon name={category.icon} />
                      <strong>{category.name}</strong>
                      {category.description ? <span>{category.description}</span> : null}
                    </Link>
                  ))}
                </div>
              ) : null}
              {section.sectionType === "stories" ? (
                <StoryList stories={section.stories} layout={section.layout} />
              ) : null}
              {section.sectionType === "authors" ? (
                <div className="cat-grid">
                  {section.authors.map((author) => (
                    <Link key={author.id} href={`/authors/${author.slug}`} className="card card-link" style={{ padding: "1rem" }}>
                      <strong>{author.name}</strong>
                      {author.bio ? <span className="muted">{author.bio}</span> : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </>
  );
}
