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
      select: { tempSelfieImages: true },
    });

    if (user?.tempSelfieImages && user.tempSelfieImages.length > 0) {
      // Clear them out so we don't fetch them again
      await prisma.user.update({
        where: { id: session.user.id },
        data: { tempSelfieImages: [] },
      });
      return NextResponse.json({ selfies: user.tempSelfieImages });
    }

    return NextResponse.json({ selfies: [] });
  } catch (error) {
    console.error("Failed to sync mobile selfies:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
