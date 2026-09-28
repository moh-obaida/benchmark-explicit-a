"use client";

import { useEffect } from "react";

export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/stories/${encodeURIComponent(slug)}/view`, { method: "POST" }).catch(() => undefined);
  }, [slug]);
  return null;
}
