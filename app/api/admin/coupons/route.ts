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

// GET /api/admin/coupons — list all coupons
export async function GET() {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  try {
    const coupons = await prisma.couponCode.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ coupons });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

// POST /api/admin/coupons — create a new coupon
export async function POST(req: NextRequest) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  try {
    const body = await req.json();
    const {
      couponFor,
      code,
      discountType,
      discountValue,
      expiresAt,
      maxUses,
      isActive,
    } = body;

    // Basic validation
    if (!couponFor || !code || !discountType || discountValue === undefined || !expiresAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (discountValue <= 0) {
      return NextResponse.json({ error: "Discount value must be greater than zero" }, { status: 400 });
    }

    // Check if code is unique
    const existingCoupon = await prisma.couponCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingCoupon) {
      return NextResponse.json({ error: "Coupon code must be unique" }, { status: 400 });
    }

    const coupon = await prisma.couponCode.create({
      data: {
        couponFor,
        code: code.toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue),
        expiresAt: new Date(expiresAt),
        maxUses: maxUses ? parseInt(maxUses) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
