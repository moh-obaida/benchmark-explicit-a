import { Catalog } from "@/components/Catalog";
import type { CatalogQuery } from "@/lib/queries";

export const metadata = { title: "البحث" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<CatalogQuery> }) {
  const query = await searchParams;
  return <Catalog query={query} title="البحث" intent="search" />;
}
