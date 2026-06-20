import { auth } from "@/lib/auth";
import LikedPageClient from "@/components/dashboard/LikedPageClient";
import { getLikedPageData } from "@/lib/server/dashboard-page-data";

export default async function ShortlistPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const { likes, matches, pricing } = await getLikedPageData(session.user.id);

  return (
    <LikedPageClient
      initialLikes={likes}
      initialMatches={matches}
      initialPricing={pricing}
      viewMode="shortlist"
    />
  );
}
