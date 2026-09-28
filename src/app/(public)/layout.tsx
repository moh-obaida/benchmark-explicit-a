import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/Chrome";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip" href="#content">
        تجاوز إلى المحتوى
      </a>
      <SiteHeader />
      <main id="content">{children}</main>
      <SiteFooter />
    </>
  );
}
