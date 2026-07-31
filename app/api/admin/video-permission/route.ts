import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereClause: any = {
      selfieVideoUrl: { not: null },
    };

    if (status && status !== "ALL") {
      whereClause.selfieVideoStatus = status;
    }

    const profiles = await prisma.profile.findMany({
      where: whereClause,
      select: {
        id: true,
        profileUserId: true,
        fullName: true,
        profileImage: true,
        selfieVideoUrl: true,
        selfieVideoStatus: true,
        createdAt: true,
        phone: true,
        user: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(profiles);
  } catch (error: any) {
    console.error("Error fetching video permissions:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profileId, status } = await request.json();

    if (!profileId || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true }
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: profileId },
        data: { selfieVideoStatus: status },
      });

      // We use a dummy actor or just create a notification for the system by using the recipient's id as actor
      // but actorProfileId can be null now. Let's pass null for system notification.
      await tx.profileNotification.create({
        data: {
          recipientProfileId: profileId,
          actorProfileId: null,
          kind: status === "APPROVED" ? "VIDEO_APPROVED" : "VIDEO_REJECTED",
        }
      });
    });

    return NextResponse.json({ success: true, message: `Video ${status.toLowerCase()} successfully` });
  } catch (error: any) {
    console.error("Error updating video status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
