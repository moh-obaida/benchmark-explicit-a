import { approvedIcon } from "@/lib/palette";

export function Reed({ className = "reed" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M18 4c2.2 6 2.2 11 0 17" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M18 21c-4 2.2-8 6.2-10.2 8.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.5 9.5h8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function CategoryIcon({ name }: { name: string }) {
  const id = approvedIcon(name);
  if (!id) return null;
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      {id === "reed" && <path d="M14 3c1.4 4 1.4 7 0 11M14 14c-3 1.5-6 4.5-7.5 6M10 7h6" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === "moon" && <path d="M14 4a7 7 0 1 0 6 10 5.5 5.5 0 1 1-6-10z" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === "book" && <path d="M5 5.5h6.5V19H6.2A1.7 1.7 0 0 1 5 17.2zM19 5.5h-6.5V19h5.3A1.7 1.7 0 0 0 19 17.2z" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === "path" && <path d="M12 4c4 4-4 7 0 11s-4 7 0 9" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === "home" && <path d="M4 11.5 12 5l8 6.5V20H4zM9 20v-6h6v6" fill="none" stroke="currentColor" strokeWidth="1.4" />}
      {id === "leaf" && <path d="M6 16c6-1 10-6 12-12-6 1-11 6-12 12zM8 14c2-1 4-3 5-5" fill="none" stroke="currentColor" strokeWidth="1.4" />}
    </svg>
  );
}
