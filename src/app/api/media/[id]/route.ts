import { NextResponse } from "next/server";
import fs from "fs";
import { getMedia } from "@/lib/queries";
import { mediaPath } from "@/lib/media";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const row = getMedia(id);
  if (!row) return new NextResponse("Not found", { status: 404 });
  const full = mediaPath(row);
  if (!full || !fs.existsSync(full)) return new NextResponse("Not found", { status: 404 });
  const file = fs.readFileSync(full);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
