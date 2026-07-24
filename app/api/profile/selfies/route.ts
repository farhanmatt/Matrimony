import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { selfieImages: true },
    });

    return NextResponse.json({ selfies: profile?.selfieImages || [] });
  } catch (error) {
    console.error("Failed to fetch selfies:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { secureUrl } = await req.json();
    if (!secureUrl) {
      return NextResponse.json({ error: "Missing image URL" }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, selfieImages: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Please complete your profile before uploading selfie photos." }, { status: 400 });
    }

    if (profile.selfieImages.length >= 4) {
      return NextResponse.json({ error: "Maximum of 4 selfie photos allowed." }, { status: 400 });
    }

    await prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        selfieImages: {
          push: secureUrl,
        },
      },
    });

    return NextResponse.json({ success: true, url: secureUrl });
  } catch (error) {
    console.error("Failed to add selfie:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "Missing image URL" }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, selfieImages: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Please complete your profile before modifying selfie photos." }, { status: 400 });
    }

    const updatedSelfies = profile.selfieImages.filter((s: string) => s !== url);

    await prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        selfieImages: {
          set: updatedSelfies,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete selfie:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
