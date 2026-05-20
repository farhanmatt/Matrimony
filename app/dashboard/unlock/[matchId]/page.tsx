import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMutualLike } from "@/lib/utils/matching";
import { redirect, notFound } from "next/navigation";
import UnlockPaymentPage from "@/components/payment/UnlockPaymentPage";

export const metadata: Metadata = {
  title: "Unlock Profile",
};

type PageParams = Promise<{ matchId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safeReturnTo(value: string | undefined) {
  if (!value) return "/dashboard/matches";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard/matches";
  return value;
}

export default async function UnlockMatchPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams?: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { matchId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const returnTo = safeReturnTo(firstValue(resolvedSearchParams.returnTo));

  const ownProfile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!ownProfile) {
    redirect("/dashboard/profile/create");
  }

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      OR: [
        { profileAId: ownProfile.id },
        { profileBId: ownProfile.id },
      ],
    },
    include: {
      profileA: { select: { id: true, fullName: true } },
      profileB: { select: { id: true, fullName: true } },
    },
  });

  if (!match) {
    notFound();
  }

  if (!(await hasMutualLike(match.profileAId, match.profileBId))) {
    notFound();
  }

  const targetProfileName =
    match.profileAId === ownProfile.id ? match.profileB.fullName : match.profileA.fullName;

  const settings = await prisma.adminSettings.findUnique({
    where: { id: "singleton" },
  });
  const perProfileChatAmount = (settings as { perProfileChatAmount?: number } | null)
    ?.perProfileChatAmount ?? 0;

  return (
    <UnlockPaymentPage
      matchId={match.id}
      profileName={targetProfileName}
      baseAmount={settings?.baseAmount ?? 500}
      profileAmount={settings?.profileAmount ?? 500}
      perProfileChatAmount={perProfileChatAmount}
      returnTo={returnTo}
    />
  );
}
