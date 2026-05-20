import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

function adminGuard(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/stats
export async function GET() {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const [totalUsers, totalProfiles, activeProfiles, totalMatches, paymentsAgg] =
    await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.profile.count(),
      prisma.profile.count({ where: { status: "ACTIVE" } }),
      prisma.match.count(),
      prisma.payment.aggregate({
        where: { status: "PAID" },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

  return NextResponse.json({
    totalUsers,
    totalProfiles,
    activeProfiles,
    totalMatches,
    totalPayments: paymentsAgg._count,
    totalRevenue: Math.floor((paymentsAgg._sum.amount ?? 0) / 100), // paise → rupees
  });
}
