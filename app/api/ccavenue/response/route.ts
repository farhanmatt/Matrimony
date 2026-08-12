import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/ccavenue";
import { publishUserNotification } from "@/lib/utils/notification-events";
import { hasUserUsedCoupon, COUPON_ALREADY_USED_ERROR } from "@/lib/server/coupons";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const encResp = formData.get("encResp");
    
    if (!encResp || typeof encResp !== "string") {
      return NextResponse.redirect(new URL("/?payment=error", req.url));
    }

    const workingKey = process.env.CCAVENUE_WORKING_KEY;
    if (!workingKey) {
      console.error("Missing CCAvenue working key");
      return NextResponse.redirect(new URL("/?payment=error", req.url));
    }

    const decrypted = decrypt(encResp, workingKey);
    
    // Parse url-encoded string
    const params = new URLSearchParams(decrypted);
    const order_id = params.get("order_id");
    const tracking_id = params.get("tracking_id");
    const bank_ref_no = params.get("bank_ref_no");
    const order_status = params.get("order_status");
    const amount = params.get("amount");
    
    const requestedType = params.get("merchant_param1") as "PROFILE" | "CHAT" | null;
    const paymentId = params.get("merchant_param2");
    const appliedCoupon = params.get("merchant_param3");

    if (!order_id || !paymentId) {
      console.error("Missing required parameters in CCAvenue response");
      return NextResponse.redirect(new URL("/?payment=error", req.url));
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      console.error("Payment record not found for:", paymentId);
      return NextResponse.redirect(new URL("/?payment=error", req.url));
    }

    // Since amount from CCavenue is in rupees and our DB stores paise (amount = rupees * 100)
    // we need to verify.
    const expectedRupees = (payment.amount / 100).toFixed(2);
    const receivedRupees = Number(amount).toFixed(2);
    
    if (expectedRupees !== receivedRupees) {
      console.error("Amount mismatch:", expectedRupees, "vs", receivedRupees);
      return NextResponse.redirect(new URL("/?payment=error", req.url));
    }

    const match = await prisma.match.findUnique({
      where: { id: payment.matchId },
    });

    if (!match) {
      console.error("Match not found");
      return NextResponse.redirect(new URL("/?payment=error", req.url));
    }

    const ownProfile = await prisma.profile.findUnique({
      where: { userId: payment.userId },
    });

    if (!ownProfile) {
      console.error("Profile not found");
      return NextResponse.redirect(new URL("/?payment=error", req.url));
    }

    // Ensure we redirect gracefully depending on success
    const redirectBase = requestedType === "CHAT" 
      ? `/dashboard/matches/${payment.matchId}?chat=true`
      : `/dashboard/matches/${payment.matchId}`;

    if (order_status !== "Success") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: tracking_id || null, // store tracking_id
          razorpaySignature: bank_ref_no || null, // store bank_ref_no
          status: "FAILED",
        }
      });
      return NextResponse.redirect(new URL(`${redirectBase}&payment=failed`, req.url));
    }

    // SUCCESS flow
    // Use transaction to ensure consistency
    await prisma.$transaction(
      async (tx) => {
        // If payment is already marked PAID, just return (idempotency check)
        const currentPayment = await tx.payment.findUnique({ where: { id: payment.id } });
        if (currentPayment?.status === "PAID") return;

        // 1. Update Payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            razorpayPaymentId: tracking_id,
            razorpaySignature: bank_ref_no,
            status: "PAID",
          },
        });

        // 2. Increment coupon usage if applied
        if (appliedCoupon && appliedCoupon.trim() !== "") {
          if (await hasUserUsedCoupon(tx, payment.userId, appliedCoupon)) {
            // Already used, could happen if retry, just ignore or throw
          } else {
            const coupon = await tx.couponCode.update({
              where: { code: appliedCoupon },
              data: { currentUses: { increment: 1 } },
            });
            if (coupon.maxUses !== null && coupon.currentUses > coupon.maxUses) {
              throw new Error("usage_limit_reached");
            }
          }
        }

        // 3. Create unlock record
        await tx.unlock.upsert({
          where: {
            userId_matchId_type: {
              userId: payment.userId,
              matchId: payment.matchId,
              type: requestedType || "PROFILE",
            },
          },
          update: {},
          create: {
            userId: payment.userId,
            matchId: payment.matchId,
            paymentId: payment.id,
            type: requestedType || "PROFILE",
          }
        });

        // 4. Update Chat Conversation if CHAT unlock
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
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    // Send notification out of transaction
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

    return NextResponse.redirect(new URL(`${redirectBase}${redirectBase.includes("?") ? "&" : "?"}payment=success`, req.url));
  } catch (error) {
    console.error("Error processing CCAvenue response:", error);
    return NextResponse.redirect(new URL("/?payment=error", req.url));
  }
}
