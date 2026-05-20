import { auth } from "@/lib/auth";
import UnlockedPageClient from "@/components/dashboard/UnlockedPageClient";
import { getUnlockedPageData } from "@/lib/server/dashboard-page-data";

export default async function UnlockedPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const { unlocks, ownProfileId } = await getUnlockedPageData(session.user.id);

  return (
    <UnlockedPageClient
      initialUnlocks={unlocks}
      initialOwnProfileId={ownProfileId}
    />
  );
}

