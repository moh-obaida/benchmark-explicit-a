import Link from "next/link";
import { AGE_BANDS, SORTS } from "@/lib/constants";
import { storyCountLabel } from "@/lib/format";
import { filterOptions, searchStories, type CatalogQuery } from "@/lib/queries";
import { StoryCardView } from "./StoryCard";

export function Catalog({
  query,
  title,
  intent,
}: {
  query: CatalogQuery;
  title: string;
  intent: "browse" | "search";
}) {
  const options = filterOptions();
  const q = (query.q || "").trim();
  const searching = intent === "search";
  const result = q || intent === "browse" ? searchStories(query) : null;
  const active = [query.category, query.genre, query.age, query.type, query.author].filter(Boolean);
  const emptySearch = searching && q && result && result.total === 0;
  const emptyFilter = intent === "browse" && result && result.total === 0 && (active.length > 0 || q);
  const emptyLibrary = intent === "browse" && result && result.total === 0 && active.length === 0 && !q;

  return (
    <div className="wrap page">
      <div className="catalog-head">
        <h1>{title}</h1>
        {searching && !q ? <p className="lead">ابحث بعنوان القصة أو المؤلف أو التصنيف أو الوسم أو النوع.</p> : null}
        <form action={searching ? "/search" : "/explore"} method="get" className="filters" role="search">
          <label>
            البحث
            <input name="q" defaultValue={q} placeholder="كلمة من العنوان أو الاسم" />
          </label>
          <label>
            التصنيف
            <select name="category" defaultValue={query.category || ""}>
              <option value="">الكل</option>
              {options.categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            النوع
            <select name="genre" defaultValue={query.genre || ""}>
              <option value="">الكل</option>
              {options.genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </label>
          <label>
            العمر
            <select name="age" defaultValue={query.age || ""}>
              <option value="">الكل</option>
              {AGE_BANDS.map((band) => (
                <option key={band.id} value={band.id}>
                  {band.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            شكل القصة
            <select name="type" defaultValue={query.type || ""}>
              <option value="">الكل</option>
              {options.types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            المؤلف
            <select name="author" defaultValue={query.author || ""}>
              <option value="">الكل</option>
              {options.authors.map((author) => (
                <option key={author.slug} value={author.slug}>
                  {author.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الترتيب
            <select name="sort" defaultValue={query.sort || "new"}>
              {SORTS.map((sort) => (
                <option key={sort.id} value={sort.id}>
                  {sort.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">تطبيق</button>
          <Link className="btn btn-quiet" href={searching ? "/search" : "/explore"}>
            مسح
          </Link>
        </form>
        {result && (q || intent === "browse") ? (
          <p className="result-count" role="status">
            {storyCountLabel(result.total)}
            {q ? ` تطابق «${q}»` : ""}
          </p>
        ) : null}
      </div>

      {searching && !q ? (
        <p>
          <Link href="/explore">أو تصفح كل القصص</Link>
        </p>
      ) : null}

      {emptyLibrary ? (
        <div className="empty">
          <h2>لا توجد قصص هنا حتى الآن.</h2>
          <Link href="/categories">تصفح التصنيفات</Link>
        </div>
      ) : null}

      {emptySearch ? (
        <div className="empty">
          <h2>ما لقينا قصة تطابق بحثك.</h2>
          <p>جرّب كلمة أخرى، أو امسح التصفية إن كانت مفعّلة.</p>
          <Link href="/search">مسح البحث</Link>
        </div>
      ) : null}

      {emptyFilter ? (
        <div className="empty">
          <h2>لا توجد قصص ضمن هذا التصفية.</h2>
          <p>القصص موجودة، لكن الخيارات الحالية تخفيها.</p>
          <Link href="/explore">مسح التصفية</Link>
        </div>
      ) : null}

      {result && result.items.length > 0 ? (
        <ul className="story-grid">
          {result.items.map((story, index) => (
            <li key={story.id}>
              <StoryCardView story={story} eager={index < 4} />
            </li>
          ))}
        </ul>
      ) : null}

      {result && result.pages > 1 ? (
        <nav className="pager" aria-label="الصفحات">
          {result.page > 1 ? <Link href={pageHref(query, searching, result.page - 1)}>السابق</Link> : null}
          <span>
            {result.page} / {result.pages}
          </span>
          {result.page < result.pages ? <Link href={pageHref(query, searching, result.page + 1)}>التالي</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}

function pageHref(query: CatalogQuery, searching: boolean, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && key !== "page") params.set(key, value);
  }
  params.set("page", String(page));
  return `${searching ? "/search" : "/explore"}?${params.toString()}`;
}
