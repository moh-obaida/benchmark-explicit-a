import { saveCategory } from "@/server/actions";
import { MediaPicker } from "./MediaPicker";
import { CATEGORY_ICONS, PALETTE } from "@/lib/palette";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageId: string | null;
  icon: string;
  colorToken: string;
  sortOrder: number;
  published: number;
  showOnHome: number;
  showInNav: number;
  featured: number;
};

export function CategoryForm({
  category,
  media,
}: {
  category?: Category | null;
  media: { id: string; alt: string }[];
}) {
  return (
    <form action={saveCategory} className="stack" style={{ maxWidth: "40rem" }}>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <label>
        الاسم
        <input name="name" required defaultValue={category?.name || ""} />
      </label>
      <label>
        الرابط
        <input name="slug" defaultValue={category?.slug || ""} />
      </label>
      <label>
        الوصف
        <textarea name="description" defaultValue={category?.description || ""} rows={3} />
      </label>
      <MediaPicker name="image_id" label="صورة التصنيف" selected={category?.imageId} items={media} />
      <label>
        الرمز
        <select name="icon" defaultValue={category?.icon || ""}>
          {CATEGORY_ICONS.map((icon) => (
            <option key={icon.id} value={icon.id}>
              {icon.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        اللون
        <select name="color_token" defaultValue={category?.colorToken || "brand"}>
          {PALETTE.map((tone) => (
            <option key={tone.id} value={tone.id}>
              {tone.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        الترتيب
        <input name="sort_order" type="number" defaultValue={category?.sortOrder ?? 0} />
      </label>
      <label className="check">
        <input type="checkbox" name="published" value="1" defaultChecked={category ? Boolean(category.published) : true} />
        منشور
      </label>
      <label className="check">
        <input type="checkbox" name="show_on_home" value="1" defaultChecked={category ? Boolean(category.showOnHome) : true} />
        يظهر في الرئيسية
      </label>
      <label className="check">
        <input type="checkbox" name="show_in_nav" value="1" defaultChecked={Boolean(category?.showInNav)} />
        يظهر في القائمة
      </label>
      <label className="check">
        <input type="checkbox" name="featured" value="1" defaultChecked={Boolean(category?.featured)} />
        تصنيف بارز
      </label>
      <button type="submit">حفظ</button>
    </form>
  );
}
