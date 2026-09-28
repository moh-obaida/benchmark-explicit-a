import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Tajawal } from "next/font/google";
import { getSettings } from "@/lib/settings";
import "@/styles/globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-tajawal",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = getSettings();
  return {
    title: { default: settings.seo_title, template: `%s · ${settings.site_name}` },
    description: settings.seo_description,
    openGraph: {
      title: settings.seo_title,
      description: settings.seo_description,
      locale: "ar",
      images: settings.social_image_id ? [`/api/media/${settings.social_image_id}`] : undefined,
    },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const settings = getSettings();
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable} data-density={settings.density}>
      <body>{children}</body>
    </html>
  );
}
