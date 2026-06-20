import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMutualLike } from "@/lib/utils/matching";
import { publishUserNotification } from "@/lib/utils/notification-events";

// GET /api/unlock - get all unlocked profiles for current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unlocks = await prisma.unlock.findMany({
    where: { 
      userId: session.user.id,
      type: "PROFILE"
    },
    include: {
      payment: { select: { amount: true, createdAt: true } },
      match: {
        include: {
          profileA: { include: { photos: true } },
          profileB: { include: { photos: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: unlocks });
}

// POST /api/unlock - unlock a matched profile without Razorpay
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestedMatchId: string | null = null;
  let requestedType: "PROFILE" | "CHAT" = "PROFILE";

  try {
    const { matchId, targetProfileId, couponCode, type = "PROFILE" } = await req.json();
    requestedType = type === "CHAT" ? "CHAT" : "PROFILE";

    if ((!matchId || typeof matchId !== "string") && (!targetProfileId || typeof targetProfileId !== "string")) {
      return NextResponse.json({ error: "matchId or targetProfileId is required" }, { status: 400 });
    }

    const ownProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, fullName: true },
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
      } catch (error: any) {
        if (error.code === "P2002") {
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
      include: {
        payment: {
          select: {
            amount: true,
            createdAt: true,
          },
        },
      },
    });

    if (existingUnlock) {
      return NextResponse.json({
        success: true,
        alreadyUnlocked: true,
        message: `${requestedType === "CHAT" ? "Chat" : "Profile"} already unlocked.`,
        data: existingUnlock,
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
      totalAmount = perProfileChatAmount * 100;
    } else {
      totalAmount = (baseAmount + profileAmount) * 100;
    }

    let discountAmount = 0;
    let appliedCoupon: string | null = null;

    if (couponCode && totalAmount > 0) {
      const coupon = await prisma.couponCode.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });

      if (coupon && coupon.isActive && (!coupon.expiresAt || new Date() <= coupon.expiresAt)) {
        // Check if coupon is valid for this type
        const isValidForType = 
          coupon.couponFor === "BOTH" || 
          (requestedType === "PROFILE" && coupon.couponFor === "PROFILE_UNLOCK") ||
          (requestedType === "CHAT" && coupon.couponFor === "CHAT_UNLOCK");

        if (isValidForType && (coupon.maxUses === null || coupon.currentUses < coupon.maxUses)) {
          appliedCoupon = coupon.code;
          if (coupon.discountType === "PERCENTAGE") {
            discountAmount = Math.floor((totalAmount * coupon.discountValue) / 100);
            if (coupon.maxDiscount !== null && (discountAmount / 100) > coupon.maxDiscount) {
              discountAmount = coupon.maxDiscount * 100;
            }
          } else {
            discountAmount = coupon.discountValue * 100;
          }
          totalAmount = Math.max(0, totalAmount - discountAmount);
        }
      }
    }

    const unlock = await prisma.$transaction(async (tx) => {
      // If coupon was applied, increment its usage
      if (appliedCoupon) {
        const updatedCoupon = await tx.couponCode.update({
          where: { code: appliedCoupon },
          data: { currentUses: { increment: 1 } },
        });
        
        if (updatedCoupon.maxUses !== null && updatedCoupon.currentUses > updatedCoupon.maxUses) {
          throw new Error("usage_limit_reached");
        }
      }

      const payment = await tx.payment.create({
        data: {
          userId: session.user.id,
          matchId: requestedMatchId!,
          razorpayOrderId: `manual_unlock_${requestedType.toLowerCase()}_${randomUUID()}`,
          amount: totalAmount,
          currency: "INR",
          status: "PAID",
          baseAmount: requestedType === "PROFILE" ? baseAmount : 0,
          profileAmount: requestedType === "PROFILE" ? profileAmount : 0,
          perProfileChatAmount: requestedType === "CHAT" ? perProfileChatAmount : 0,
          couponCode: appliedCoupon,
          discountAmount: Math.floor(discountAmount / 100),
        },
      });

      const createdUnlock = await tx.unlock.create({
        data: {
          userId: session.user.id,
          matchId: requestedMatchId!,
          paymentId: payment.id,
          type: requestedType,
        },
        include: {
          payment: {
            select: {
              amount: true,
              createdAt: true,
            },
          },
        },
      });

      if (requestedType === "CHAT") {
        const pair = {
          profileAId: match.profileAId,
          profileBId: match.profileBId,
        };
        const conversation = await tx.chatConversation.findUnique({
          where: { profileAId_profileBId: pair },
        });

        if (conversation && conversation.status === "PENDING" && conversation.initiatorProfileId !== ownProfile.id) {
          await tx.chatConversation.update({
            where: { id: conversation.id },
            data: {
              status: "ACCEPTED",
              updatedAt: new Date(),
            },
          });

          await tx.chatMessage.create({
            data: {
              conversationId: conversation.id,
              senderProfileId: ownProfile.id,
              isSystemMessage: true,
              systemAction: "REQUEST_ACCEPTED",
              content: `${ownProfile.fullName} accepted the chat request.`,
            },
          });

          const otherProfileId = match.profileAId === ownProfile.id ? match.profileBId : match.profileAId;
          await tx.chatMessage.updateMany({
            where: {
              conversationId: conversation.id,
              senderProfileId: otherProfileId,
              isRead: false,
            },
            data: { isRead: true },
          });
        }
      }

      return createdUnlock;
    });

    if (requestedType === "CHAT") {
      const otherProfileId = match.profileAId === ownProfile.id ? match.profileBId : match.profileAId;
      const [otherProfile, conversation] = await Promise.all([
        prisma.profile.findUnique({
          where: { id: otherProfileId },
          select: { userId: true },
        }),
        prisma.chatConversation.findUnique({
          where: { profileAId_profileBId: { profileAId: match.profileAId, profileBId: match.profileBId } },
        }),
      ]);

      if (conversation && conversation.status === "ACCEPTED" && otherProfile) {
        publishUserNotification(otherProfile.userId, {
          type: "status_updated",
          status: "ACCEPTED",
          createdAt: conversation.updatedAt.toISOString(),
          conversationId: conversation.id,
          fromProfileId: ownProfile.id,
          toProfileId: otherProfileId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${requestedType === "CHAT" ? "Chat" : "Profile"} unlocked successfully.`,
      data: unlock,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      if (requestedMatchId) {
        const existingUnlock = await prisma.unlock.findUnique({
          where: {
            userId_matchId_type: {
              userId: session.user.id,
              matchId: requestedMatchId,
              type: requestedType,
            },
          },
          include: {
            payment: {
              select: {
                amount: true,
                createdAt: true,
              },
            },
          },
        });

        if (existingUnlock) {
          return NextResponse.json({
            success: true,
            alreadyUnlocked: true,
            message: `${requestedType === "CHAT" ? "Chat" : "Profile"} already unlocked.`,
            data: existingUnlock,
          });
        }
      }
    }

    console.error("Unlock profile error:", error);
    return NextResponse.json(
      { error: "Failed to unlock profile" },
      { status: 500 }
    );
  }
}
