import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  COUPON_ALREADY_USED_ERROR,
  COUPON_ALREADY_USED_MESSAGE,
  hasUserUsedCoupon,
} from "@/lib/server/coupons";
import { hasMutualLike } from "@/lib/utils/matching";
import { encrypt } from "@/lib/ccavenue";

// POST /api/ccavenue/request
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestedMatchId: string | null = null;
  let requestedType: "PROFILE" | "CHAT" = "PROFILE";

  try {
    const { matchId, targetProfileId, couponCode, type = "PROFILE", returnUrl } = await req.json();
    requestedType = type === "CHAT" ? "CHAT" : "PROFILE";

    if ((!matchId || typeof matchId !== "string") && (!targetProfileId || typeof targetProfileId !== "string")) {
      return NextResponse.json({ error: "matchId or targetProfileId is required" }, { status: 400 });
    }

    const ownProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, fullName: true, phone: true, userId: true },
    });

    if (!ownProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let match;
    if (matchId && typeof matchId === "string") {
      match = await prisma.match.findFirst({
        where: {
          id: matchId,
          OR: [{ profileAId: ownProfile.id }, { profileBId: ownProfile.id }],
        },
        select: {
          id: true,
          profileAId: true,
          profileBId: true,
        },
      });
    } else if (targetProfileId && typeof targetProfileId === "string") {
      const pair = {
        profileAId: ownProfile.id < targetProfileId ? ownProfile.id : targetProfileId,
        profileBId: ownProfile.id < targetProfileId ? targetProfileId : ownProfile.id,
      };

      try {
        match = await prisma.match.upsert({
          where: { profileAId_profileBId: pair },
          update: {},
          create: pair,
          select: {
            id: true,
            profileAId: true,
            profileBId: true,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          match = await prisma.match.findUnique({
            where: { profileAId_profileBId: pair },
            select: {
              id: true,
              profileAId: true,
              profileBId: true,
            },
          });
        } else {
          throw error;
        }
      }
    }

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    requestedMatchId = match.id;

    if (requestedType === "PROFILE" && !(await hasMutualLike(match.profileAId, match.profileBId))) {
      return NextResponse.json(
        { error: "This match is no longer active" },
        { status: 409 }
      );
    }

    const existingUnlock = await prisma.unlock.findUnique({
      where: {
        userId_matchId_type: {
          userId: session.user.id,
          matchId: requestedMatchId,
          type: requestedType,
        },
      },
    });

    if (existingUnlock) {
      return NextResponse.json({
        success: true,
        alreadyUnlocked: true,
        message: `${requestedType === "CHAT" ? "Chat" : "Profile"} already unlocked.`,
      });
    }

    const settings = await prisma.adminSettings.findUnique({
      where: { id: "singleton" },
    });
    
    const baseAmount = settings?.baseAmount ?? 500;
    const profileAmount = settings?.profileAmount ?? 500;
    const perProfileChatAmount = settings?.perProfileChatAmount ?? 0;
    
    // Calculate total amount based on unlock type
    let totalAmount = 0;
    if (requestedType === "CHAT") {
      totalAmount = perProfileChatAmount;
    } else {
      totalAmount = (baseAmount + profileAmount);
    }

    let discountAmount = 0;
    let appliedCoupon: string | null = null;

    if (couponCode && totalAmount > 0) {
      const coupon = await prisma.couponCode.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });

      if (coupon && coupon.isActive && (!coupon.expiresAt || new Date() <= coupon.expiresAt)) {
        if (await hasUserUsedCoupon(prisma, session.user.id, coupon.code)) {
          return NextResponse.json(
            { error: COUPON_ALREADY_USED_MESSAGE },
            { status: 400 }
          );
        }

        const isValidForType = 
          coupon.couponFor === "BOTH" || 
          (requestedType === "PROFILE" && coupon.couponFor === "PROFILE_UNLOCK") ||
          (requestedType === "CHAT" && coupon.couponFor === "CHAT_UNLOCK");

        if (isValidForType && (coupon.maxUses === null || coupon.currentUses < coupon.maxUses)) {
          appliedCoupon = coupon.code;
          if (coupon.discountType === "PERCENTAGE") {
            discountAmount = Math.floor((totalAmount * coupon.discountValue) / 100);
            if (coupon.maxDiscount !== null && discountAmount > coupon.maxDiscount) {
              discountAmount = coupon.maxDiscount;
            }
          } else {
            discountAmount = coupon.discountValue;
          }
          totalAmount = Math.max(0, totalAmount - discountAmount);
        }
      }
    }

    const orderId = `CCA_${requestedType}_${Date.now()}_${randomUUID().substring(0, 8)}`;

    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        matchId: requestedMatchId!,
        razorpayOrderId: orderId, // Reusing field for CCAvenue Order ID
        amount: totalAmount * 100, // stored in paise, assuming totalAmount is rupees
        currency: "INR",
        status: "CREATED",
        baseAmount: requestedType === "PROFILE" ? baseAmount : 0,
        profileAmount: requestedType === "PROFILE" ? profileAmount : 0,
        perProfileChatAmount: requestedType === "CHAT" ? perProfileChatAmount : 0,
        couponCode: appliedCoupon,
        discountAmount: discountAmount,
      },
    });

    const merchantId = process.env.CCAVENUE_MERCHANT_ID;
    const accessCode = process.env.CCAVENUE_ACCESS_CODE;
    const workingKey = process.env.CCAVENUE_WORKING_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!merchantId || !accessCode || !workingKey) {
      console.error("Missing CCAvenue credentials");
      return NextResponse.json({ error: "Payment gateway configuration error" }, { status: 500 });
    }

    const redirectUrl = `${appUrl}/api/ccavenue/response`;
    const cancelUrl = `${appUrl}/api/ccavenue/response`;

    // Construct CCAvenue standard request parameters
    const paymentData = {
      merchant_id: merchantId,
      order_id: orderId,
      currency: "INR",
      amount: totalAmount.toString(),
      redirect_url: redirectUrl,
      cancel_url: cancelUrl,
      language: "EN",
      billing_name: ownProfile.fullName || "User",
      billing_tel: ownProfile.phone || "0000000000",
      billing_email: session.user.email || "",
      merchant_param1: requestedType, // Pass type to response
      merchant_param2: payment.id, // Pass payment ID
      merchant_param3: appliedCoupon || "", // Pass applied coupon
      merchant_param4: returnUrl || "", // Pass return URL
    };

    const queryParams = new URLSearchParams(paymentData).toString();
    const encRequest = encrypt(queryParams, workingKey);

    return NextResponse.json({
      success: true,
      encRequest,
      accessCode,
      url: "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction",
    });
  } catch (error) {
    if (error instanceof Error && error.message === COUPON_ALREADY_USED_ERROR) {
      return NextResponse.json(
        { error: COUPON_ALREADY_USED_MESSAGE },
        { status: 400 }
      );
    }
    console.error("Create CCAvenue request error:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
