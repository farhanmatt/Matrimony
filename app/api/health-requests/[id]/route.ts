import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (status !== "ACCEPTED" && status !== "REJECTED") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const userProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!userProfile) {
      return NextResponse.json({ error: "Profile required" }, { status: 403 });
    }

    const existing: any[] = await prisma.$queryRaw`
      SELECT id, "recipientId", "requesterId" FROM "HealthRequest"
      WHERE id = ${id}
      LIMIT 1
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const existingRequest = existing[0];

    if (existingRequest.recipientId !== userProfile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$executeRaw`
      UPDATE "HealthRequest" SET status = CAST(${status} AS "HealthRequestStatus"), "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    const kind = status === "ACCEPTED" 
      ? 'HEALTH_REQUEST_ACCEPTED' 
      : 'HEALTH_REQUEST_REJECTED';
    
    const notifId = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "ProfileNotification" (id, "recipientProfileId", "actorProfileId", kind, "createdAt")
      VALUES (${notifId}, ${existingRequest.requesterId}, ${existingRequest.recipientId}, CAST(${kind} AS "ProfileNotificationKind"), NOW())
    `;

    return NextResponse.json({ data: { id, status } });

  } catch (error) {
    console.error("Failed to update health request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
