import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConnectionError } from "@/lib/utils/errors";
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

  let existingProfile: { id: string } | null = null;
  let introStatus: { hasSeenDashboardIntro: boolean } | null = {
    hasSeenDashboardIntro: true,
  };
  let receivedLikes: Array<{
    id: string;
    createdAt: Date;
      fromProfile: {
        id: string;
        fullName: string;
      city: string | null;
      state: string | null;
      location: string | null;
      profession: string | null;
      profileImage: string | null;
      photos: { url: string; isPrimary: boolean }[];
      };
    }> = [];

  try {
    [existingProfile, introStatus] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { hasSeenDashboardIntro: true },
      }),
    ]);

    receivedLikes = existingProfile
      ? await prisma.like.findMany({
          where: { toProfileId: existingProfile.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
            fromProfile: {
              select: {
                id: true,
                fullName: true,
                city: true,
                state: true,
                location: true,
                profession: true,
                profileImage: true,
                photos: {
                  where: { isPrimary: true },
                  select: { url: true, isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        })
      : [];
  } catch (error) {
    if (!isDatabaseConnectionError(error)) {
      throw error;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardAutoRefresh />
      <DashboardWelcomeIntro
        initialOpen={false}
      />
      <DashboardSidebar
        initialHasProfile={Boolean(existingProfile)}
        initialLikes={receivedLikes.map((like) => ({
          id: like.id,
          createdAt: like.createdAt.toISOString(),
          fromProfile: like.fromProfile,
        }))}
      />
      <main className="min-h-screen pt-[72px]">
        <div className="mx-auto max-w-[1600px] px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6 lg:px-8 lg:pt-4 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
