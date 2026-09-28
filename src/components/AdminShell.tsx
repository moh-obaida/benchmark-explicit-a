"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAdmin } from "@/server/actions";
import { Reed } from "./Icons";

const LINKS = [
  ["/admin", "لوحة التحكم"],
  ["/admin/stories", "القصص"],
  ["/admin/categories", "التصنيفات"],
  ["/admin/authors", "المؤلفون"],
  ["/admin/homepage", "الصفحة الرئيسية"],
  ["/admin/media", "الوسائط"],
  ["/admin/settings", "الإعدادات"],
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <strong>
          <Reed /> يراع
        </strong>
        <nav aria-label="إدارة المحتوى">
          {LINKS.map(([href, label]) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}>
                {label}
              </Link>
            );
          })}
        </nav>
        <Link href="/">عرض الموقع</Link>
        <form action={logoutAdmin}>
          <button className="btn-quiet" type="submit">
            خروج
          </button>
        </form>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
