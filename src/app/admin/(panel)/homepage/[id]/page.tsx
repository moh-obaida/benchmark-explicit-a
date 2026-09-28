import { notFound } from "next/navigation";
import { allStoriesBrief, adminCategories } from "@/lib/admin-data";
import { getSection, listMedia, sectionLinks } from "@/lib/queries";
import { deleteSection, saveSection } from "@/server/actions";
import { Notice } from "@/components/Notice";
import { MediaPicker } from "@/components/MediaPicker";
import { CATEGORY_LAYOUTS, HERO_LAYOUTS, STORY_LAYOUTS, STORY_SOURCES } from "@/lib/constants";
import { PALETTE } from "@/lib/palette";
import { previewContext, resolveOne } from "@/lib/sections";

export default async function EditSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const section = getSection(id);
  if (!section) notFound();
  const links = sectionLinks(section.id);
  const linkMap = new Map(links.map((link) => [link.storyId, link]));
  const stories = allStoriesBrief();
  const categories = adminCategories().filter((item) => item.published);
  const preview = resolveOne(section, previewContext());
  const layouts =
    section.sectionType === "hero" ? HERO_LAYOUTS : section.sectionType === "categories" ? CATEGORY_LAYOUTS : STORY_LAYOUTS;
  const media = listMedia().map((item) => ({ id: item.id, alt: item.alt }));

  return (
    <>
      <h1>تعديل القسم</h1>
      <Notice error={query.error} saved={query.saved} />
      {section.sectionType === "stories" && section.source === "recommended" ? (
        <p className="muted">معاينة «مقترحة لك» هنا من دون سجل زائر. عند الزائر تتغير حسب ما فتحه وحفظه.</p>
      ) : null}
      {preview.stories.length ? (
        <p className="muted">يظهر الآن: {preview.stories.map((story) => story.title).join("، ")}</p>
      ) : null}
      <form action={saveSection} className="stack" style={{ maxWidth: "46rem" }}>
        <input type="hidden" name="id" value={section.id} />
        <label>
          العنوان
          <input name="title" defaultValue={section.title} required />
        </label>
        <label>
          السطر الثانوي
          <input name="subtitle" defaultValue={section.subtitle || ""} />
        </label>
        <label className="check">
          <input type="checkbox" name="enabled" value="1" defaultChecked={Boolean(section.enabled)} />
          ظاهر
        </label>
        <fieldset>
          <legend>الشكل</legend>
          <div className="layout-choices">
            {layouts.map((layout) => (
              <label key={layout.id}>
                <input type="radio" name="layout" value={layout.id} defaultChecked={section.layout === layout.id} />
                {layout.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          لون خفيف
          <select name="accent_token" defaultValue={section.accentToken || "brand"}>
            {PALETTE.map((tone) => (
              <option key={tone.id} value={tone.id}>
                {tone.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          عدد العناصر
          <input name="item_limit" type="number" min={1} max={12} defaultValue={section.itemLimit} />
        </label>
        {section.sectionType === "stories" ? (
          <>
            <fieldset>
              <legend>مصدر القصص</legend>
              <label className="check">
                <input type="radio" name="mode" value="auto" defaultChecked={section.mode !== "manual"} />
                تلقائي
              </label>
              <label className="check">
                <input type="radio" name="mode" value="manual" defaultChecked={section.mode === "manual"} />
                اختيار يدوي
              </label>
              <label>
                المصدر التلقائي
                <select name="source" defaultValue={section.source || "recommended"}>
                  {STORY_SOURCES.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                التصنيف عند اختيار «تصنيف محدد»
                <select name="category_id" defaultValue={section.categoryId || ""}>
                  <option value="">—</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
            <fieldset>
              <legend>القصص</legend>
              <p className="muted">في الوضع اليدوي فعّل «إظهار». في التلقائي يمكن التثبيت أو الإخفاء.</p>
              <div className="scroll-box">
                {stories.map((story) => {
                  const link = linkMap.get(story.id);
                  return (
                    <div key={story.id} className="filters">
                      <input type="hidden" name="story_id" value={story.id} />
                      <label className="check">
                        <input type="checkbox" name={`include_${story.id}`} defaultChecked={Boolean(link && !link.excluded)} />
                        {story.title}
                      </label>
                      <label className="check">
                        <input type="checkbox" name={`pin_${story.id}`} defaultChecked={Boolean(link?.pinned)} />
                        تثبيت
                      </label>
                      <label className="check">
                        <input type="checkbox" name={`hide_${story.id}`} defaultChecked={Boolean(link?.excluded)} />
                        إخفاء
                      </label>
                      <label>
                        ترتيب
                        <input name={`order_${story.id}`} type="number" defaultValue={link?.sortOrder ?? 0} />
                      </label>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </>
        ) : null}
        {section.sectionType === "hero" || section.sectionType === "banner" || section.sectionType === "announcement" ? (
          <label>
            النص
            <textarea name="body" rows={3} defaultValue={section.body || ""} />
          </label>
        ) : (
          <input type="hidden" name="body" value={section.body || ""} />
        )}
        {section.sectionType === "banner" || section.sectionType === "hero" ? (
          <MediaPicker name="image_id" label="صورة" selected={section.imageId} items={media} />
        ) : (
          <input type="hidden" name="image_id" value={section.imageId || ""} />
        )}
        <label>
          رابط
          <input name="link_href" dir="ltr" defaultValue={section.linkHref || ""} />
        </label>
        <label>
          نص الرابط
          <input name="link_label" defaultValue={section.linkLabel || ""} />
        </label>
        <button type="submit">حفظ القسم</button>
      </form>
      <form action={deleteSection} className="stack" style={{ marginTop: "1rem", maxWidth: "20rem" }}>
        <input type="hidden" name="id" value={section.id} />
        <label>
          لحذف القسم اكتب حذف
          <input name="confirm" />
        </label>
        <button className="btn-danger" type="submit">
          حذف القسم
        </button>
      </form>
    </>
  );
}
