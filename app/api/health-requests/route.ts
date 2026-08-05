import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { recipientId } = body;

    if (!recipientId) {
      return NextResponse.json({ error: "recipientId is required" }, { status: 400 });
    }

    const requester = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!requester) {
      return NextResponse.json({ error: "Profile required" }, { status: 403 });
    }

    if (requester.id === recipientId) {
      return NextResponse.json({ error: "Cannot request your own health details" }, { status: 400 });
    }

    const existing: any[] = await prisma.$queryRaw`
      SELECT id, status FROM "HealthRequest"
      WHERE "requesterId" = ${requester.id} AND "recipientId" = ${recipientId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      if (existing[0].status === "PENDING" || existing[0].status === "ACCEPTED") {
        return NextResponse.json({ error: "Request already exists" }, { status: 400 });
      } else {
        await prisma.$executeRaw`
          UPDATE "HealthRequest" SET status = 'PENDING', "updatedAt" = NOW()
          WHERE id = ${existing[0].id}
        `;
        
        const notifId = crypto.randomUUID();
        await prisma.$executeRaw`
          INSERT INTO "ProfileNotification" (id, "recipientProfileId", "actorProfileId", kind, "createdAt")
          VALUES (${notifId}, ${recipientId}, ${requester.id}, 'HEALTH_REQUEST_RECEIVED'::"ProfileNotificationKind", NOW())
        `;

        return NextResponse.json({ data: { id: existing[0].id, status: "PENDING" } });
      }
    }

    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "HealthRequest" (id, "requesterId", "recipientId", status, "createdAt", "updatedAt")
      VALUES (${id}, ${requester.id}, ${recipientId}, 'PENDING', NOW(), NOW())
    `;

    const notifId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "ProfileNotification" (id, "recipientProfileId", "actorProfileId", kind, "createdAt")
      VALUES (${notifId}, ${recipientId}, ${requester.id}, 'HEALTH_REQUEST_RECEIVED'::"ProfileNotificationKind", NOW())
    `;

    return NextResponse.json({ data: { id, status: "PENDING" } });

  } catch (error) {
    console.error("Failed to create health request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
