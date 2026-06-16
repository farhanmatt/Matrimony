import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/utils/helpers";

export type AdminNotificationKind = "user" | "profile" | "match" | "payment";

export type AdminNotificationItem = {
  id: string;
  kind: AdminNotificationKind;
  title: string;
  detail: string;
  createdAtLabel: string;
  sortAt: Date;
};

export async function getAdminNotifications(limitPerType?: number): Promise<AdminNotificationItem[]> {
  const userQuery = {
    where: { role: "USER" as const },
    orderBy: { createdAt: "desc" as const },
    select: {
      name: true,
      email: true,
      createdAt: true,
    },
  };

  const profileQuery = {
    orderBy: { createdAt: "desc" as const },
    select: {
      fullName: true,
      dateOfBirth: true,
      createdAt: true,
    },
  };

  const matchQuery = {
    orderBy: { createdAt: "desc" as const },
    select: {
      createdAt: true,
      profileA: { select: { fullName: true } },
      profileB: { select: { fullName: true } },
    },
  };

  const paymentQuery = {
    where: { status: "PAID" as const },
    orderBy: { createdAt: "desc" as const },
    select: {
      amount: true,
      createdAt: true,
    },
  };

  const recentUsers = (await prisma.user.findMany(
    (limitPerType ? { ...userQuery, take: limitPerType } : userQuery) as any
  )) as any[];
  const recentProfiles = (await prisma.profile.findMany(
    (limitPerType ? { ...profileQuery, take: limitPerType } : profileQuery) as any
  )) as any[];
  const recentMatches = (await prisma.match.findMany(
    (limitPerType ? { ...matchQuery, take: limitPerType } : matchQuery) as any
  )) as any[];
  const recentPayments = (await prisma.payment.findMany(
    (limitPerType ? { ...paymentQuery, take: limitPerType } : paymentQuery) as any
  )) as any[];

  return [
    ...recentUsers.map((user) => ({
      id: `user-${user.createdAt.toISOString()}`,
      kind: "user" as const,
      title: "New user registered",
      detail: user.name ?? user.email,
      createdAtLabel: format(user.createdAt, "dd MMM yyyy, hh:mm a"),
      sortAt: user.createdAt,
    })),
    ...recentProfiles.map((profile) => ({
      id: `profile-${profile.createdAt.toISOString()}`,
      kind: "profile" as const,
      title: "New profile created",
      detail: `${profile.fullName} (${calculateAge(profile.dateOfBirth)} yrs)`,
      createdAtLabel: format(profile.createdAt, "dd MMM yyyy, hh:mm a"),
      sortAt: profile.createdAt,
    })),
    ...recentMatches.map((match) => ({
      id: `match-${match.createdAt.toISOString()}`,
      kind: "match" as const,
      title: "New match found",
      detail: `${match.profileA.fullName} & ${match.profileB.fullName}`,
      createdAtLabel: format(match.createdAt, "dd MMM yyyy, hh:mm a"),
      sortAt: match.createdAt,
    })),
    ...recentPayments.map((payment) => ({
      id: `payment-${payment.createdAt.toISOString()}`,
      kind: "payment" as const,
      title: "Payment received",
      detail: `Payment of ₹${Math.round(payment.amount / 100)}`,
      createdAtLabel: format(payment.createdAt, "dd MMM yyyy, hh:mm a"),
      sortAt: payment.createdAt,
    })),
  ]
    .sort((a, b) => b.sortAt.getTime() - a.sortAt.getTime());
}
