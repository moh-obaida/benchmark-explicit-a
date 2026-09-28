import { Catalog } from "@/components/Catalog";
import type { CatalogQuery } from "@/lib/queries";

export const metadata = { title: "استكشف" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<CatalogQuery> }) {
  const query = await searchParams;
  return <Catalog query={query} title="استكشف" intent="browse" />;
}
