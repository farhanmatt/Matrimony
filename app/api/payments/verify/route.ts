import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  COUPON_ALREADY_USED_ERROR,
  COUPON_ALREADY_USED_MESSAGE,
  hasUserUsedCoupon,
} from "@/lib/server/coupons";

// POST /api/payments/verify
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Payment verification failed. Invalid signature." },
        { status: 400 }
      );
    }

    // Find and update payment record
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    if (payment.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update payment + create unlock in a transaction
    await prisma.$transaction(
      async (tx) => {
        if (
          payment.couponCode &&
          (await hasUserUsedCoupon(tx, session.user.id, payment.couponCode, payment.id))
        ) {
          throw new Error(COUPON_ALREADY_USED_ERROR);
        }

        // 1. Update payment status
        await tx.payment.update({
          where: { razorpayOrderId: razorpay_order_id },
          data: {
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            status: "PAID",
          },
        });

        // 2. Increment coupon usage if applied
        if (payment.couponCode) {
          const coupon = await tx.couponCode.update({
            where: { code: payment.couponCode },
            data: { currentUses: { increment: 1 } },
          });

          if (coupon.maxUses !== null && coupon.currentUses > coupon.maxUses) {
            throw new Error("usage_limit_reached");
          }
        }

        // 3. Create unlock record with correct type
        const requestedType = payment.perProfileChatAmount > 0 ? "CHAT" : "PROFILE";

        await tx.unlock.create({
          data: {
            userId: session.user.id,
            matchId: payment.matchId,
            paymentId: payment.id,
            type: requestedType,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Payment verified. Profile unlocked!",
    });
  } catch (error) {
    if (error instanceof Error && error.message === COUPON_ALREADY_USED_ERROR) {
      return NextResponse.json(
        { error: COUPON_ALREADY_USED_MESSAGE },
        { status: 400 }
      );
    }

    console.error("Verify payment error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
