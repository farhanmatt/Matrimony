import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConnectionError } from "@/lib/utils/errors";
import {
  getDashboardNotificationsForUser,
  type DashboardNotificationItem,
} from "@/lib/utils/notifications";
import { redirect } from "next/navigation";
import DashboardAutoRefresh from "@/components/dashboard/DashboardAutoRefresh";
import DashboardWelcomeIntro from "@/components/dashboard/DashboardWelcomeIntro";
import DashboardSidebar from "@/components/layout/DashboardSidebar";

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

  try {
    [notificationState, introStatus] = await Promise.all([
      getDashboardNotificationsForUser(session.user.id),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { hasSeenDashboardIntro: true },
      }),
    ]);
  } catch (error) {
    if (!isDatabaseConnectionError(error)) {
      throw error;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardAutoRefresh />
      <DashboardWelcomeIntro
        initialOpen={!introStatus?.hasSeenDashboardIntro}
      />
      <DashboardSidebar
        initialHasProfile={Boolean(notificationState.profileId)}
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

