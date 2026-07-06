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

// PUT /api/admin/success-stories/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const { id } = await params;

  try {
    const body = await req.json();
    const { coupleName, review, description, date, images } = body;

    if (!coupleName || !review) {
      return NextResponse.json({ error: "Couple Name and Review are required" }, { status: 400 });
    }

    const updatedStory = await (prisma as any).successStory.update({
      where: { id },
      data: {
        coupleName,
        review,
        description: description || null,
        date: date ? new Date(date) : null,
        images: Array.isArray(images) ? images : [],
      },
    });

    revalidatePath("/", "layout");

    return NextResponse.json({ story: updatedStory });
  } catch (error: any) {
    console.error("Error updating success story:", error);
    return NextResponse.json({ error: "Failed to update story" }, { status: 500 });
  }
}

// DELETE /api/admin/success-stories/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const { id } = await params;

  try {
    await (prisma as any).successStory.delete({
      where: { id },
    });
    
    revalidatePath("/", "layout");
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting success story:", error);
    return NextResponse.json({ error: "Failed to delete story" }, { status: 500 });
  }
}
