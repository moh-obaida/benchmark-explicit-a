import fs from "fs";
import path from "path";

/**
 * TEMPORARY with vercel.json.
 * Vercel’s deployment filesystem is read-only, so opening the sqlite file
 * beside the app crashes every Server Component. /tmp is the writable spot.
 * Delete vercel.json and this branch together when the host can store data.
 */
export function dataDir() {
  if (process.env.VERCEL) return path.join("/tmp", "yara3");
  return path.join(process.cwd(), "data");
}

export function mediaDir() {
  const dir = path.join(dataDir(), "media");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
