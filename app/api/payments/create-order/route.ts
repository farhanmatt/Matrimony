import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRazorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import {
  getUnlockPricing,
  isPerProfileChatAmountCompatibilityError,
} from "@/lib/utils/admin-settings";
import { hasMutualLike } from "@/lib/utils/matching";

// POST /api/payments/create-order
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { matchId } = await req.json();
    if (!matchId) {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }

    // Verify match exists and belongs to user
    const ownProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!ownProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [
          { profileAId: ownProfile.id },
          { profileBId: ownProfile.id },
        ],
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (!(await hasMutualLike(match.profileAId, match.profileBId))) {
      return NextResponse.json(
        { error: "This match is no longer active" },
        { status: 409 }
      );
    }

    // Check if already unlocked
    const existingUnlock = await prisma.unlock.findUnique({
      where: {
        userId_matchId: { userId: session.user.id, matchId },
      },
    });

    if (existingUnlock) {
      return NextResponse.json(
        { error: "This profile is already unlocked" },
        { status: 409 }
      );
    }

    // Fetch current pricing
    const { baseAmount, profileAmount, perProfileChatAmount } =
      await getUnlockPricing();
    const totalAmount = (baseAmount + profileAmount + perProfileChatAmount) * 100; // paise

    // Create Razorpay order
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: totalAmount,
      currency: "INR",
      receipt: `receipt_${matchId}_${Date.now()}`,
      notes: {
        matchId,
        userId: session.user.id,
      },
    });

    // Store payment record
    const paymentData = {
      userId: session.user.id,
      matchId,
      razorpayOrderId: order.id,
      amount: totalAmount,
      baseAmount,
      profileAmount,
      perProfileChatAmount,
      status: "CREATED",
    };

    await prisma.payment
      .create({
        data: paymentData,
        select: {
          id: true,
        },
      })
      .catch(async (error) => {
        if (!isPerProfileChatAmountCompatibilityError(error)) {
          throw error;
        }

        const { perProfileChatAmount: _ignored, ...legacyPaymentData } =
          paymentData;

        await prisma.payment.create({
          data: legacyPaymentData,
          select: {
            id: true,
          },
        });
      });

    return NextResponse.json({
      orderId: order.id,
      amount: totalAmount,
      currency: "INR",
      baseAmount,
      profileAmount,
      perProfileChatAmount,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}
