import { NextResponse } from "next/server";
import { format } from "date-fns";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/utils/helpers";

function adminGuard(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/notifications
export async function GET() {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const [recentUsers, recentProfiles, recentMatches, recentPayments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        name: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.profile.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        fullName: true,
        dateOfBirth: true,
        createdAt: true,
      },
    }),
    prisma.match.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        createdAt: true,
        profileA: { select: { fullName: true } },
        profileB: { select: { fullName: true } },
      },
    }),
    prisma.payment.findMany({
      where: { status: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        amount: true,
        createdAt: true,
      },
    }),
  ]);

  const notifications = [
    ...recentUsers.map((user) => ({
      id: `user-${user.createdAt.toISOString()}`,
      kind: "user" as const,
      title: "New user registered",
      detail: user.name ?? user.email,
      createdAt: user.createdAt.toISOString(),
      createdAtLabel: format(user.createdAt, "dd MMM yyyy, hh:mm a"),
      sortAt: user.createdAt,
    })),
    ...recentProfiles.map((profile) => ({
      id: `profile-${profile.createdAt.toISOString()}`,
      kind: "profile" as const,
      title: "New profile created",
      detail: `${profile.fullName} (${calculateAge(profile.dateOfBirth)} yrs)`,
      createdAt: profile.createdAt.toISOString(),
      createdAtLabel: format(profile.createdAt, "dd MMM yyyy, hh:mm a"),
      sortAt: profile.createdAt,
    })),
    ...recentMatches.map((match) => ({
      id: `match-${match.createdAt.toISOString()}`,
      kind: "match" as const,
      title: "New match found",
      detail: `${match.profileA.fullName} & ${match.profileB.fullName}`,
      createdAt: match.createdAt.toISOString(),
      createdAtLabel: format(match.createdAt, "dd MMM yyyy, hh:mm a"),
      sortAt: match.createdAt,
    })),
    ...recentPayments.map((payment) => ({
      id: `payment-${payment.createdAt.toISOString()}`,
      kind: "payment" as const,
      title: "Payment received",
      detail: `Payment of ₹${Math.round(payment.amount / 100)}`,
      createdAt: payment.createdAt.toISOString(),
      createdAtLabel: format(payment.createdAt, "dd MMM yyyy, hh:mm a"),
      sortAt: payment.createdAt,
    })),
  ]
    .sort((a, b) => {
      return b.sortAt.getTime() - a.sortAt.getTime();
    })
    .slice(0, 6)
    .map(({ sortAt, ...item }) => item);

  return NextResponse.json({ notifications });
}
