import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const userProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!userProfile) {
      return NextResponse.json({ error: "Profile required" }, { status: 403 });
    }

    const hasAccessRows: any[] = await prisma.$queryRaw`
      SELECT id FROM "HealthRequest"
      WHERE "requesterId" = ${userProfile.id} 
        AND "recipientId" = ${id} 
        AND status = 'ACCEPTED'
      LIMIT 1
    `;
    const hasAccess = hasAccessRows.length > 0;

    if (!hasAccess && userProfile.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const healthDetailsRows: any[] = await prisma.$queryRaw`
      SELECT * FROM "HealthDetails"
      WHERE "profileId" = ${id}
      LIMIT 1
    `;

    if (healthDetailsRows.length === 0) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: healthDetailsRows[0] });
  } catch (error) {
    console.error("Failed to get health details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
