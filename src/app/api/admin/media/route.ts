import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { saveUpload } from "@/lib/media";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "غير مسموح." }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  const alt = String(form.get("alt") || "").trim();
  if (!alt) return NextResponse.json({ error: "أضف وصفًا مختصرًا للصورة." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "اختر ملف صورة." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const saved = saveUpload(buf, alt);
    return NextResponse.json({ id: saved.id, alt: saved.alt });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذّر الرفع." }, { status: 400 });
  }
}
