import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConnectionError } from "@/lib/utils/errors";
import {
  getDashboardNotificationsForUser,
  type DashboardNotificationItem,
} from "@/lib/utils/notifications";
import { redirect } from "next/navigation";
import DashboardAutoRefresh from "@/components/dashboard/DashboardAutoRefresh";
import DashboardRealtimeEvents from "@/components/dashboard/DashboardRealtimeEvents";
import DashboardWelcomeIntro from "@/components/dashboard/DashboardWelcomeIntro";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { getDashboardProfileSummary } from "@/lib/server/dashboard-page-data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let notificationState: {
    profileId: string | null;
    items: DashboardNotificationItem[];
  } = {
    profileId: null,
    items: [],
  };
  let introStatus: { hasSeenDashboardIntro: boolean } | null = {
    hasSeenDashboardIntro: true,
  };
  let profileSummary: Awaited<ReturnType<typeof getDashboardProfileSummary>> = null;

  try {
    [notificationState, introStatus, profileSummary] = await Promise.all([
      getDashboardNotificationsForUser(session.user.id),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { hasSeenDashboardIntro: true },
      }),
      getDashboardProfileSummary(session.user.id),
    ]);
  } catch (error) {
    if (!isDatabaseConnectionError(error)) {
      throw error;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardAutoRefresh />
      <DashboardRealtimeEvents />
      <DashboardWelcomeIntro
        initialOpen={!introStatus?.hasSeenDashboardIntro}
      />
      <DashboardSidebar
        initialUser={{
          id: session.user.id,
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
        }}
        initialHasProfile={Boolean(profileSummary?.id ?? notificationState.profileId)}
        initialProfileUserId={profileSummary?.profileUserId ?? null}
        initialAccountImage={profileSummary?.accountImage ?? null}
        initialNotificationProfileId={notificationState.profileId}
        initialNotifications={notificationState.items}
      />
      <main className="min-h-screen pt-[72px]">
        <div className="mx-auto max-w-[1600px] px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6 lg:px-8 lg:pt-4 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}

