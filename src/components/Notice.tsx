export function Notice({ saved, error }: { saved?: string; error?: string }) {
  if (error) return <p className="notice error" role="alert">{error}</p>;
  if (saved) return <p className="notice ok" role="status">تم التحديث.</p>;
  return null;
}

export function storyStatus(published: number, publishAt: string | null) {
  if (!published) return { label: "مسودة", live: false };
  if (publishAt && new Date(publishAt) > new Date()) return { label: "مجدولة", live: false };
  return { label: "منشورة", live: true };
}
