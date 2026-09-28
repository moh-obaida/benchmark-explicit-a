import { getSettings } from "@/lib/settings";
import { listMedia } from "@/lib/queries";
import { saveSettings } from "@/server/actions";
import { MediaPicker } from "@/components/MediaPicker";
import { Notice } from "@/components/Notice";
import { BRAND_HEX, PALETTE } from "@/lib/palette";

export const metadata = { title: "الإعدادات" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const query = await searchParams;
  const settings = getSettings();
  const media = listMedia().map((item) => ({ id: item.id, alt: item.alt }));
  return (
    <>
      <h1>الإعدادات</h1>
      <Notice error={query.error} saved={query.saved} />
      <form action={saveSettings} className="stack" style={{ maxWidth: "42rem" }}>
        <fieldset>
          <legend>عام</legend>
          <label>
            اسم الموقع
            <input name="site_name" defaultValue={settings.site_name} />
          </label>
          <label>
            الوصف
            <textarea name="description" defaultValue={settings.description} rows={3} />
          </label>
          <label>
            البريد
            <input name="contact_email" dir="ltr" defaultValue={settings.contact_email} />
          </label>
          <MediaPicker name="logo_id" label="الشعار" selected={settings.logo_id} items={media} />
        </fieldset>
        <fieldset>
          <legend>الهوية</legend>
          <p>اللون الأساسي مقفل: {BRAND_HEX}</p>
          <p>الخط مقفل: Tajawal</p>
          <div className="swatches">
            {PALETTE.map((tone) => (
              <span key={tone.id} className="swatch" style={{ background: tone.hex }}>
                {tone.label}
              </span>
            ))}
          </div>
          <label>
            كثافة الصفحة
            <select name="density" defaultValue={settings.density}>
              <option value="comfortable">مريحة</option>
              <option value="compact">أقرب</option>
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>المحتوى</legend>
          <label>
            عدد القصص في الصفحة
            <input name="default_display_count" type="number" min={6} max={24} defaultValue={settings.default_display_count} />
          </label>
        </fieldset>
        <fieldset>
          <legend>الاكتشاف</legend>
          <label>
            نافذة «وصل حديثًا» بالأيام
            <input name="recent_days" type="number" min={7} max={180} defaultValue={settings.recent_days} />
          </label>
          {(
            [
              ["w_category", "التصنيف", settings.weights.category],
              ["w_tag", "الوسم", settings.weights.tag],
              ["w_author", "المؤلف", settings.weights.author],
              ["w_popularity", "الرواج", settings.weights.popularity],
              ["w_recency", "الحداثة", settings.weights.recency],
              ["w_featured", "التمييز", settings.weights.featured],
              ["w_priority", "الأولوية", settings.weights.priority],
              ["w_viewed", "تخفيض ما شُوهد", settings.weights.viewedPenalty],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name}>
              {label}
              <input name={name} type="number" defaultValue={value} />
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>الظهور في البحث</legend>
          <label>
            عنوان الصفحة
            <input name="seo_title" defaultValue={settings.seo_title} />
          </label>
          <label>
            الوصف
            <textarea name="seo_description" defaultValue={settings.seo_description} rows={3} />
          </label>
          <MediaPicker name="social_image_id" label="صورة المشاركة" selected={settings.social_image_id} items={media} />
        </fieldset>
        <fieldset>
          <legend>التواصل</legend>
          <label>
            إنستغرام
            <input name="instagram" dir="ltr" defaultValue={settings.instagram} placeholder="https://" />
          </label>
          {[0, 1, 2].map((index) => (
            <div className="filters" key={index}>
              <label>
                اسم الرابط
                <input name={`social_label_${index}`} defaultValue={settings.social_links[index]?.label || ""} />
              </label>
              <label>
                الرابط
                <input name={`social_url_${index}`} dir="ltr" defaultValue={settings.social_links[index]?.url || ""} />
              </label>
            </div>
          ))}
        </fieldset>
        <fieldset>
          <legend>كلمة مرور الإدارة</legend>
          <label>
            كلمة مرور جديدة
            <input name="new_password" type="password" dir="ltr" autoComplete="new-password" />
          </label>
        </fieldset>
        <button type="submit">حفظ الإعدادات</button>
      </form>
    </>
  );
}
