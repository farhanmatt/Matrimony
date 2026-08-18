import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profileDraft: true },
    });

    return NextResponse.json({ draft: user?.profileDraft || null });
  } catch (error) {
    console.error("Failed to fetch profile draft:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    await prisma.user.update({
      where: { id: session.user.id },
      data: { profileDraft: body.draft || Prisma.DbNull },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save profile draft:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { profileDraft: Prisma.DbNull },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear profile draft:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
