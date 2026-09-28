import Link from "next/link";
import { Reed, CategoryIcon } from "./Icons";
import { getSettings } from "@/lib/settings";
import { listNavCategories } from "@/lib/queries";

export function SiteHeader() {
  const settings = getSettings();
  const categories = listNavCategories();
  return (
    <>
      <div className="brand-line" />
      <header className="site-header">
        <div className="wrap header-row">
          <Link href="/" className="brand">
            {settings.logo_id ? (
              <img src={`/api/media/${settings.logo_id}`} alt="" width={28} height={28} />
            ) : (
              <Reed />
            )}
            <span>{settings.site_name}</span>
          </Link>
          <nav className="desk-nav" aria-label="التنقل">
            <Link href="/">الرئيسية</Link>
            <details>
              <summary>التصنيفات</summary>
              <div className="menu-panel">
                {categories.map((category) => (
                  <Link key={category.id} href={`/categories/${category.slug}`}>
                    {category.name}
                  </Link>
                ))}
                <Link href="/categories">كل التصنيفات</Link>
              </div>
            </details>
            <Link href="/explore">استكشف</Link>
          </nav>
          <form className="search-mini desk-only" action="/search" method="get" role="search">
            <label className="sr" htmlFor="header-q">
              البحث
            </label>
            <input id="header-q" name="q" placeholder="البحث" />
            <button className="btn-quiet" type="submit">
              بحث
            </button>
          </form>
          <Link className="text-link" href="/favorites">
            المفضلة
          </Link>
          <details className="mobile-only">
            <summary className="btn-quiet">القائمة</summary>
            <div className="mobile-panel">
              <Link href="/">الرئيسية</Link>
              <Link href="/categories">التصنيفات</Link>
              <Link href="/explore">استكشف</Link>
              <Link href="/search">البحث</Link>
              <Link href="/favorites">المفضلة</Link>
              {categories.map((category) => (
                <Link key={category.id} href={`/categories/${category.slug}`}>
                  <CategoryIcon name={category.icon} /> {category.name}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  const settings = getSettings();
  return (
    <footer className="site-footer">
      <div className="wrap footer-row">
        <div>
          <strong>{settings.site_name}</strong>
          {settings.description ? <p className="muted">{settings.description}</p> : null}
        </div>
        <div className="footer-links">
          <Link href="/categories">التصنيفات</Link>
          <Link href="/explore">استكشف</Link>
          <Link href="/search">البحث</Link>
          {settings.contact_email ? (
            <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
          ) : null}
          {settings.instagram ? (
            <a href={settings.instagram} rel="noreferrer">
              إنستغرام
            </a>
          ) : null}
          {settings.social_links.map((link) => (
            <a key={link.url} href={link.url} rel="noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
