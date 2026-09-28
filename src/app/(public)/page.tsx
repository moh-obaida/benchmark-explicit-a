import { getCurrentUser, readAnonId, readSeenIds } from "@/lib/auth";
import { visitorContext, resolveSections } from "@/lib/sections";
import { HomeSections } from "@/components/HomeSections";

export default async function HomePage() {
  const user = await getCurrentUser();
  const context = await visitorContext(user?.id ?? null, await readAnonId(), await readSeenIds());
  const sections = resolveSections(context, true);
  return <HomeSections sections={sections} />;
}
