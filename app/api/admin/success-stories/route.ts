import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

function adminGuard(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/success-stories
export async function GET() {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  try {
    const stories = await (prisma as any).successStory.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ stories });
  } catch (error: any) {
    console.error("Error fetching success stories:", error);
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}

// POST /api/admin/success-stories
export async function POST(req: NextRequest) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  try {
    const body = await req.json();
    const { coupleName, review, description, date, images } = body;

    if (!coupleName || !review) {
      return NextResponse.json({ error: "Couple Name and Review are required" }, { status: 400 });
    }

    const newStory = await (prisma as any).successStory.create({
      data: {
        coupleName,
        review,
        description: description || null,
        date: date ? new Date(date) : null,
        images: Array.isArray(images) ? images : [],
      },
    });

    revalidatePath("/", "layout");

    return NextResponse.json({ story: newStory }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating success story:", error);
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
  }
}
