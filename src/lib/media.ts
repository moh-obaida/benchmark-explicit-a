import fs from "fs";
import path from "path";
import { mediaDir, getDb } from "./db";

const MAX_BYTES = 4 * 1024 * 1024;
const MIN_SIDE = 200;
const MAX_SIDE = 6000;

export type MediaRow = {
  id: string;
  filename: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  created_at: string;
};

export function mediaUrl(id: string) {
  return `/api/media/${id}`;
}

export function sniffImage(buf: Buffer): { mime: string; width: number; height: number } | null {
  const png = pngSize(buf);
  if (png) return { mime: "image/png", ...png };
  const jpeg = jpegSize(buf);
  if (jpeg) return { mime: "image/jpeg", ...jpeg };
  const webp = webpSize(buf);
  if (webp) return { mime: "image/webp", ...webp };
  return null;
}

export function validateImage(buf: Buffer): { ok: true; mime: string; width: number; height: number } | { ok: false; error: string } {
  if (buf.length > MAX_BYTES) return { ok: false, error: "حجم الملف أكبر من ٤ ميغابايت." };
  if (buf.length < 32) return { ok: false, error: "الملف ليس صورة صالحة." };
  const sniffed = sniffImage(buf);
  if (!sniffed) return { ok: false, error: "الصيغ المقبولة: JPG و PNG و WebP." };
  if (sniffed.width < MIN_SIDE || sniffed.height < MIN_SIDE) {
    return { ok: false, error: "الصورة صغيرة جدًا. الحد الأدنى ٢٠٠ بكسل في كل ضلع." };
  }
  if (sniffed.width > MAX_SIDE || sniffed.height > MAX_SIDE) {
    return { ok: false, error: "الصورة كبيرة جدًا. الحد الأقصى ٦٠٠٠ بكسل." };
  }
  return { ok: true, ...sniffed };
}

export function saveUpload(buf: Buffer, alt: string): MediaRow {
  const checked = validateImage(buf);
  if (!checked.ok) throw new Error(checked.error);
  const id = crypto.randomUUID();
  const ext = checked.mime === "image/png" ? "png" : checked.mime === "image/webp" ? "webp" : "jpg";
  const filename = `${id}.${ext}`;
  fs.writeFileSync(path.join(mediaDir(), filename), buf);
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO media (id, filename, mime, bytes, width, height, alt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, filename, checked.mime, buf.length, checked.width, checked.height, alt.trim(), now);
  return {
    id,
    filename,
    mime: checked.mime,
    bytes: buf.length,
    width: checked.width,
    height: checked.height,
    alt: alt.trim(),
    created_at: now,
  };
}

export function saveSvgCover(svg: string, alt: string): string {
  const id = crypto.randomUUID();
  const filename = `${id}.svg`;
  const buf = Buffer.from(svg, "utf8");
  fs.writeFileSync(path.join(mediaDir(), filename), buf);
  getDb()
    .prepare(
      `INSERT INTO media (id, filename, mime, bytes, width, height, alt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, filename, "image/svg+xml", buf.length, 600, 800, alt, new Date().toISOString());
  return id;
}

export function mediaPath(row: { filename: string }) {
  const root = mediaDir();
  const full = path.resolve(root, row.filename);
  if (!full.startsWith(root + path.sep)) return null;
  return full;
}

export function mediaReferences(id: string): string[] {
  const db = getDb();
  const uses: string[] = [];
  const story = db.prepare(`SELECT COUNT(*) AS n FROM stories WHERE cover_id = ?`).get(id) as { n: number };
  if (story.n) uses.push("أغلفة قصص");
  const extra = db.prepare(`SELECT COUNT(*) AS n FROM story_images WHERE media_id = ?`).get(id) as { n: number };
  if (extra.n) uses.push("صور قصص");
  const author = db.prepare(`SELECT COUNT(*) AS n FROM authors WHERE image_id = ?`).get(id) as { n: number };
  if (author.n) uses.push("صور مؤلفين");
  const category = db.prepare(`SELECT COUNT(*) AS n FROM categories WHERE image_id = ?`).get(id) as { n: number };
  if (category.n) uses.push("صور تصنيفات");
  const section = db.prepare(`SELECT COUNT(*) AS n FROM homepage_sections WHERE image_id = ?`).get(id) as { n: number };
  if (section.n) uses.push("الصفحة الرئيسية");
  const logo = db.prepare(`SELECT value FROM settings WHERE key = 'logo_id'`).get() as { value: string } | undefined;
  if (logo?.value === id) uses.push("الشعار");
  const social = db.prepare(`SELECT value FROM settings WHERE key = 'social_image_id'`).get() as { value: string } | undefined;
  if (social?.value === id) uses.push("صورة المشاركة");
  return uses;
}

export function deleteMedia(id: string) {
  const uses = mediaReferences(id);
  if (uses.length) throw new Error(`الصورة مستخدمة في: ${uses.join("، ")}.`);
  const row = getDb().prepare(`SELECT filename FROM media WHERE id = ?`).get(id) as { filename: string } | undefined;
  if (!row) return;
  const full = mediaPath(row);
  if (full && fs.existsSync(full)) fs.unlinkSync(full);
  getDb().prepare(`DELETE FROM media WHERE id = ?`).run(id);
}

function pngSize(buf: Buffer) {
  if (buf.length < 24 || buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegSize(buf: Buffer) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 8 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

function webpSize(buf: Buffer) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  }
  if (chunk === "VP8 ") {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}
