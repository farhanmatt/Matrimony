import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tempVideoUrl: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.tempVideoUrl) {
      // Clear it from the database after fetching so we don't return it again
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          tempVideoUrl: null,
        },
      });
      return NextResponse.json({ videoUrl: user.tempVideoUrl });
    }

    return NextResponse.json({ videoUrl: null });
  } catch (error) {
    console.error("Failed to sync mobile video:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
