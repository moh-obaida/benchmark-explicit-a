import { saveAuthor } from "@/server/actions";
import { MediaPicker } from "./MediaPicker";

export function AuthorForm({
  author,
  media,
}: {
  author?: { id: string; name: string; slug: string; bio: string | null; imageId: string | null; featured: number } | null;
  media: { id: string; alt: string }[];
}) {
  return (
    <form action={saveAuthor} className="stack" style={{ maxWidth: "40rem" }}>
      {author ? <input type="hidden" name="id" value={author.id} /> : null}
      <label>
        الاسم
        <input name="name" required defaultValue={author?.name || ""} />
      </label>
      <label>
        الرابط
        <input name="slug" defaultValue={author?.slug || ""} />
      </label>
      <label>
        النبذة
        <textarea name="bio" rows={4} defaultValue={author?.bio || ""} />
      </label>
      <MediaPicker name="image_id" label="صورة المؤلف" selected={author?.imageId} items={media} />
      <label className="check">
        <input type="checkbox" name="featured" value="1" defaultChecked={Boolean(author?.featured)} />
        مؤلف بارز
      </label>
      <button type="submit">حفظ</button>
    </form>
  );
}
