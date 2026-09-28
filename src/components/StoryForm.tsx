import { saveStory } from "@/server/actions";
import { MediaPicker } from "./MediaPicker";
import type { AdminStory } from "@/lib/admin-data";

type Option = { id: string; name?: string; title?: string };
type MediaItem = { id: string; alt: string };

function localInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function StoryForm({
  story,
  authors,
  categories,
  stories,
  media,
  tags,
  categoryIds,
  relatedIds,
  imageIds,
}: {
  story?: AdminStory | null;
  authors: Option[];
  categories: Option[];
  stories: { id: string; title: string }[];
  media: MediaItem[];
  tags: string;
  categoryIds: string[];
  relatedIds: string[];
  imageIds: string[];
}) {
  return (
    <form action={saveStory} className="form-layout">
      {story ? <input type="hidden" name="id" value={story.id} /> : null}
      <nav className="form-index" aria-label="أقسام النموذج">
        <a href="#basic">الأساسية</a>
        <a href="#media">الوسائط</a>
        <a href="#author">المؤلف</a>
        <a href="#category">التصنيف</a>
        <a href="#tags">الوسوم</a>
        <a href="#description">الوصف</a>
        <a href="#discovery">الاكتشاف</a>
        <a href="#display">العرض</a>
        <a href="#related">المرتبط</a>
        <a href="#publish">النشر</a>
      </nav>
      <div>
        <fieldset id="basic">
          <legend>المعلومات الأساسية</legend>
          <div className="stack">
            <label>
              العنوان
              <input name="title" required defaultValue={story?.title || ""} />
            </label>
            <label>
              الرابط
              <input name="slug" defaultValue={story?.slug || ""} placeholder="يُولَّد من العنوان إن تُرك فارغًا" />
            </label>
          </div>
        </fieldset>
        <fieldset id="media">
          <legend>الوسائط</legend>
          <MediaPicker name="cover_id" label="الغلاف" selected={story?.coverId} items={media} />
          <p className="muted">لاستبدال الغلاف اختر صورة أخرى أو ارفع صورة جديدة.</p>
          <div className="scroll-box">
            {media.map((item) => (
              <label className="check" key={item.id}>
                <input type="checkbox" name="extra_images" value={item.id} defaultChecked={imageIds.includes(item.id)} />
                صور إضافية: {item.alt || item.id}
              </label>
            ))}
          </div>
          <label>
            رابط صوت
            <input name="audio_url" dir="ltr" defaultValue={story?.audioUrl || ""} />
          </label>
          <label>
            رابط فيديو
            <input name="video_url" dir="ltr" defaultValue={story?.videoUrl || ""} />
          </label>
        </fieldset>
        <fieldset id="author">
          <legend>المؤلف</legend>
          <label>
            المؤلف
            <select name="author_id" defaultValue={story?.authorId || ""}>
              <option value="">بدون مؤلف</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الراوي
            <input name="narrator" defaultValue={story?.narrator || ""} />
          </label>
        </fieldset>
        <fieldset id="category">
          <legend>التصنيف</legend>
          <label>
            التصنيف الأساسي
            <select name="primary_category_id" defaultValue={story?.primaryCategoryId || ""}>
              <option value="">بدون تصنيف</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <div className="scroll-box">
            {categories.map((category) => (
              <label className="check" key={category.id}>
                <input
                  type="checkbox"
                  name="category_ids"
                  value={category.id}
                  defaultChecked={categoryIds.includes(category.id)}
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset id="tags">
          <legend>الوسوم</legend>
          <label>
            الوسوم
            <input name="tags" defaultValue={tags} placeholder="افصل الوسوم بفاصلة" />
          </label>
        </fieldset>
        <fieldset id="description">
          <legend>الوصف</legend>
          <label>
            وصف قصير
            <textarea name="short_description" defaultValue={story?.shortDescription || ""} rows={3} />
          </label>
          <label>
            الوصف الكامل
            <textarea name="full_description" defaultValue={story?.fullDescription || ""} rows={8} />
          </label>
        </fieldset>
        <fieldset id="discovery">
          <legend>الاكتشاف</legend>
          <div className="filters">
            <label>
              النوع الأدبي
              <input name="genre" defaultValue={story?.genre || ""} />
            </label>
            <label>
              شكل القصة
              <input name="story_type" defaultValue={story?.storyType || ""} />
            </label>
            <label>
              العمر من
              <input name="age_min" type="number" min={0} defaultValue={story?.ageMin ?? ""} />
            </label>
            <label>
              العمر إلى
              <input name="age_max" type="number" min={0} defaultValue={story?.ageMax ?? ""} />
            </label>
            <label>
              دقائق القراءة
              <input name="reading_minutes" type="number" min={0} defaultValue={story?.readingMinutes ?? ""} />
            </label>
            <label>
              درجة الرواج
              <input name="popularity" type="number" defaultValue={story?.popularity ?? 0} />
            </label>
            <label>
              أولوية الاقتراح
              <input name="priority" type="number" defaultValue={story?.priority ?? 0} />
            </label>
          </div>
          <p className="muted">درجة الرواج ترتيب تحريري، وليست عدد قراء.</p>
        </fieldset>
        <fieldset id="display">
          <legend>العرض</legend>
          <label>
            ترتيب العرض
            <input name="display_order" type="number" defaultValue={story?.displayOrder ?? 0} />
          </label>
          <label>
            السلسلة
            <input name="series_name" defaultValue={story?.seriesName || ""} />
          </label>
          <label>
            رقم الجزء
            <input name="episode_number" type="number" defaultValue={story?.episodeNumber ?? ""} />
          </label>
          <label>
            مصدر خارجي
            <input name="external_source" dir="ltr" defaultValue={story?.externalSource || ""} />
          </label>
          <label className="check">
            <input type="checkbox" name="featured" value="1" defaultChecked={Boolean(story?.featured)} />
            قصة مميزة
          </label>
        </fieldset>
        <fieldset id="related">
          <legend>محتوى مرتبط</legend>
          <div className="scroll-box">
            {stories
              .filter((item) => item.id !== story?.id)
              .map((item) => (
                <label className="check" key={item.id}>
                  <input type="checkbox" name="related_ids" value={item.id} defaultChecked={relatedIds.includes(item.id)} />
                  {item.title}
                </label>
              ))}
          </div>
        </fieldset>
        <fieldset id="publish">
          <legend>النشر</legend>
          <label className="check">
            <input type="checkbox" name="published" value="1" defaultChecked={Boolean(story?.published)} />
            منشورة
          </label>
          <label>
            موعد النشر
            <input name="publish_at" type="datetime-local" dir="ltr" defaultValue={localInput(story?.publishAt || null)} />
          </label>
          <p className="muted">إذا كان الموعد في المستقبل تبقى القصة مخفية حتى يحين، حتى لو كانت منشورة.</p>
          <label>
            ملاحظات الإدارة
            <textarea name="admin_notes" defaultValue={story?.adminNotes || ""} rows={3} />
          </label>
          <div className="actions">
            <button type="submit" name="intent" value="save">
              حفظ
            </button>
            <button type="submit" name="intent" value="publish">
              نشر
            </button>
            <button className="btn-quiet" type="submit" name="intent" value="unpublish">
              إلغاء النشر
            </button>
          </div>
        </fieldset>
      </div>
    </form>
  );
}
