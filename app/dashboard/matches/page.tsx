import { auth } from "@/lib/auth";
import MatchesPageClient from "@/components/dashboard/MatchesPageClient";
import { getMatchesPageData } from "@/lib/server/dashboard-page-data";

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const { matches, unlockedMatchesCount, pricing } =
    await getMatchesPageData(session.user.id);

  return (
    <MatchesPageClient
      initialMatches={matches}
      initialUnlockedMatchesCount={unlockedMatchesCount}
      initialPricing={pricing}
    />
  );
}

