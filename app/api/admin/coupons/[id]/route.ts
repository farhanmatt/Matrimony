import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { CouponCode } from "@prisma/client";

function adminGuard(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// PATCH /api/admin/coupons/[id] — update a coupon
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const { id } = await context.params;

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

    const data: Partial<CouponCode> = {};

    if (couponFor) data.couponFor = couponFor;
    if (code) {
      data.code = code.toUpperCase();
      // Check for uniqueness if code is changing
      const existing = await prisma.couponCode.findFirst({
        where: {
          code: code.toUpperCase(),
          id: { not: id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: "Coupon code must be unique" }, { status: 400 });
      }
    }
    if (discountType) data.discountType = discountType;
    if (discountValue !== undefined) {
      if (parseFloat(discountValue) <= 0) {
        return NextResponse.json({ error: "Discount value must be greater than zero" }, { status: 400 });
      }
      data.discountValue = parseFloat(discountValue);
    }
    if (expiresAt) data.expiresAt = new Date(expiresAt);
    if (maxUses !== undefined) data.maxUses = maxUses ? parseInt(maxUses) : null;
    if (isActive !== undefined) data.isActive = isActive;

    const coupon = await prisma.couponCode.update({
      where: { id },
      data,
    });

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error("Error updating coupon:", error);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

// DELETE /api/admin/coupons/[id] — delete a coupon
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const { id } = await context.params;

  try {
    await prisma.couponCode.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
