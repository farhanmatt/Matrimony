import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConnectionError } from "@/lib/utils/errors";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await prisma.user.updateMany({
      where: { id: session.user.id },
      data: { hasSeenDashboardIntro: true },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        { error: "Database unavailable. Please try again." },
        { status: 503 }
      );
    }

    console.error("Dashboard intro update error:", error);
    return NextResponse.json(
      { error: "Unable to save the introduction status" },
      { status: 500 }
    );
  }
}
