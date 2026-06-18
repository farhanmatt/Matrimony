import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

function adminGuard(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const { id } = await context.params;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const coupon = await prisma.couponCode.findUnique({
      where: { id },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const allPayments = await prisma.payment.findMany({
      where: {
        couponCode: coupon.code,
        status: "PAID",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalDiscountAmount = allPayments.reduce((acc, curr) => acc + curr.discountAmount, 0);
    const totalRevenueGenerated = allPayments.reduce((acc, curr) => acc + (curr.amount / 100), 0);
    const uniqueUsers = new Set(allPayments.map(p => p.user.id)).size;

    const paginatedPayments = allPayments.slice(skip, skip + limit);

    const usageHistory = paginatedPayments.map((p) => ({
      userId: p.user.id,
      userName: p.user.name || "Anonymous",
      userEmail: p.user.email,
      usedAt: p.createdAt.toISOString(),
      amount: p.amount / 100, // paise to rupees
      discountAmount: p.discountAmount,
    }));

    return NextResponse.json({
      success: true,
      data: {
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          expiresAt: coupon.expiresAt.toISOString(),
          maxUses: coupon.maxUses,
          currentUses: coupon.currentUses,
        },
        stats: {
          totalUsersUsed: uniqueUsers,
          remainingUsage: coupon.maxUses ? Math.max(0, coupon.maxUses - allPayments.length) : null,
          totalTimesApplied: allPayments.length,
          totalDiscountAmount,
          totalRevenueGenerated,
          netProfit: totalRevenueGenerated,
        },
        usageHistory,
        pagination: {
          total: allPayments.length,
          page,
          limit,
          totalPages: Math.ceil(allPayments.length / limit),
        }
      }
    });
  } catch (error) {
    console.error("Error fetching coupon usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch coupon usage stats" },
      { status: 500 }
    );
  }
}
