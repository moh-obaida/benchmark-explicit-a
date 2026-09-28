import Link from "next/link";
import { listSections } from "@/lib/queries";
import { createSection, moveSection, toggleSection } from "@/server/actions";
import { Notice } from "@/components/Notice";
import { SECTION_TYPES } from "@/lib/constants";

export const metadata = { title: "الصفحة الرئيسية" };

export default async function HomepageAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const query = await searchParams;
  const sections = listSections(false);
  return (
    <>
      <h1>إدارة الصفحة الرئيسية</h1>
      <p className="muted">رتّب الأقسام الظاهرة. الشكل والخط واللون الأساسي يبقيان ثابتين. التذييل يُدار من الإعدادات حتى يبقى في كل الصفحات.</p>
      <Notice saved={query.saved} error={query.error} />
      <div className="stack">
        {sections.map((section, index) => (
          <article key={section.id} className="notice" style={{ display: "grid", gap: ".4rem" }}>
            <strong>
              {index + 1}. {section.title}
            </strong>
            <p className="muted">
              {section.sectionType} · {section.enabled ? "ظاهر" : "مخفي"} · {section.mode === "manual" ? "اختيار يدوي" : "تلقائي"} · {section.layout}
            </p>
            {section.subtitle ? <p>{section.subtitle}</p> : null}
            <div className="actions">
              <form action={moveSection}>
                <input type="hidden" name="id" value={section.id} />
                <button className="btn-quiet" name="dir" value="up" type="submit" aria-label={`تحريك ${section.title} للأعلى`}>
                  أعلى
                </button>
              </form>
              <form action={moveSection}>
                <input type="hidden" name="id" value={section.id} />
                <button className="btn-quiet" name="dir" value="down" type="submit" aria-label={`تحريك ${section.title} للأسفل`}>
                  أسفل
                </button>
              </form>
              <form action={toggleSection}>
                <input type="hidden" name="id" value={section.id} />
                <button className="btn-quiet" type="submit">
                  {section.enabled ? "إخفاء" : "إظهار"}
                </button>
              </form>
              <Link className="btn" href={`/admin/homepage/${section.id}`}>
                تعديل
              </Link>
            </div>
          </article>
        ))}
      </div>
      <form action={createSection} className="filters" style={{ marginTop: "1rem" }}>
        <label>
          قسم جديد
          <select name="section_type">
            {SECTION_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">إضافة</button>
      </form>
    </>
  );
}
