import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/coupon/validate - validate a coupon code and return discount info
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code, totalAmount, unlockType = "PROFILE" } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "Please enter a coupon code" },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    const coupon = await prisma.couponCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      return NextResponse.json({
        valid: false,
        error: "Invalid coupon code. Please check and try again.",
      });
    }

    if (!coupon.isActive) {
      return NextResponse.json({
        valid: false,
        error: "This coupon code is no longer active.",
      });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return NextResponse.json({
        valid: false,
        error: "This coupon code has expired.",
      });
    }

    if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
      return NextResponse.json({
        valid: false,
        error: "This coupon code has reached its usage limit.",
      });
    }

    const isValidForType = 
      coupon.couponFor === "BOTH" || 
      (unlockType === "PROFILE" && coupon.couponFor === "PROFILE_UNLOCK") ||
      (unlockType === "CHAT" && coupon.couponFor === "CHAT_UNLOCK");

    if (!isValidForType) {
      return NextResponse.json({
        valid: false,
        error: `This coupon is not valid for ${unlockType === "CHAT" ? "chat" : "profile"} unlocks.`,
      });
    }

    const orderAmount = typeof totalAmount === "number" ? totalAmount : 0;

    if (orderAmount < coupon.minAmount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount of ₹${coupon.minAmount} required for this coupon.`,
      });
    }

    // Calculate discount
    let discountAmount: number;

    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = Math.floor((orderAmount * coupon.discountValue) / 100);
      // Cap at maxDiscount if set
      if (coupon.maxDiscount !== null && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      // FIXED discount
      discountAmount = Math.floor(coupon.discountValue);
    }

    // Ensure discount doesn't exceed the total amount
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }

    const finalAmount = orderAmount - discountAmount;

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      finalAmount,
      message:
        coupon.discountType === "PERCENTAGE"
          ? `${coupon.discountValue}% discount applied! You save ₹${discountAmount}.`
          : `₹${discountAmount} discount applied!`,
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate coupon code" },
      { status: 500 }
    );
  }
}
