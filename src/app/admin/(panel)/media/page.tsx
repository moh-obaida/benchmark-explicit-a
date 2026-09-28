import { listMedia } from "@/lib/queries";
import { removeMedia, updateMediaAlt } from "@/server/actions";
import { MediaPicker } from "@/components/MediaPicker";
import { Notice } from "@/components/Notice";
import { arNumber } from "@/lib/format";

export const metadata = { title: "الوسائط" };

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const query = await searchParams;
  const media = listMedia();
  return (
    <>
      <h1>الوسائط</h1>
      <p className="muted">الصور تُحفظ على الخادم، ويمكن إعادة استخدامها في القصص والمؤلفين والصفحة الرئيسية.</p>
      <Notice error={query.error} saved={query.saved} />
      <MediaPicker name="unused" label="رفع صورة جديدة" items={media.map((item) => ({ id: item.id, alt: item.alt }))} />
      <div className="media-grid" style={{ marginTop: "1rem" }}>
        {media.map((item) => (
          <article key={item.id}>
            <img src={`/api/media/${item.id}`} alt={item.alt} />
            <p>
              {item.width}×{item.height} · {arNumber(Math.ceil(item.bytes / 1024))} ك.ب
            </p>
            <form action={updateMediaAlt} className="stack">
              <input type="hidden" name="id" value={item.id} />
              <label>
                الوصف
                <input name="alt" defaultValue={item.alt} />
              </label>
              <button className="btn-quiet" type="submit">
                حفظ الوصف
              </button>
            </form>
            <form action={removeMedia}>
              <input type="hidden" name="id" value={item.id} />
              <button className="btn-danger" type="submit">
                حذف
              </button>
            </form>
          </article>
        ))}
      </div>
    </>
  );
}
