import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMutualLike } from "@/lib/utils/matching";

// GET /api/unlock - get all unlocked profiles for current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unlocks = await prisma.unlock.findMany({
    where: { userId: session.user.id },
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

  try {
    const { matchId } = await req.json();
    requestedMatchId = typeof matchId === "string" ? matchId : null;
    if (!matchId || typeof matchId !== "string") {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }

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
        OR: [{ profileAId: ownProfile.id }, { profileBId: ownProfile.id }],
      },
      select: {
        id: true,
        profileAId: true,
        profileBId: true,
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

    const existingUnlock = await prisma.unlock.findUnique({
      where: {
        userId_matchId: {
          userId: session.user.id,
          matchId,
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
        message: "Profile already unlocked.",
        data: existingUnlock,
      });
    }

    const settings = await prisma.adminSettings.findUnique({
      where: { id: "singleton" },
    });
    const baseAmount = settings?.baseAmount ?? 500;
    const profileAmount = settings?.profileAmount ?? 500;
    const totalAmount = (baseAmount + profileAmount) * 100;

    const unlock = await prisma.$transaction(async (tx) => {
      // Keep the existing payment + unlock data model while Razorpay is disabled.
      const payment = await tx.payment.create({
        data: {
          userId: session.user.id,
          matchId,
          razorpayOrderId: `manual_unlock_${randomUUID()}`,
          amount: totalAmount,
          currency: "INR",
          status: "PAID",
          baseAmount,
          profileAmount,
        },
      });

      return tx.unlock.create({
        data: {
          userId: session.user.id,
          matchId,
          paymentId: payment.id,
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
    });

    return NextResponse.json({
      success: true,
      message: "Profile unlocked successfully.",
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
            userId_matchId: {
              userId: session.user.id,
              matchId: requestedMatchId,
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
            message: "Profile already unlocked.",
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
