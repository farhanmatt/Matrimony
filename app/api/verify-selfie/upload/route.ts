import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.AUTH_SECRET || "fallback_secret_for_dev";

export async function POST(req: Request) {
  try {
    const { token, secureUrl } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    if (!secureUrl) {
      return NextResponse.json({ error: "Missing image URL" }, { status: 400 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; purpose: string };
    } catch (e) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    if (decoded.purpose !== "selfie_capture") {
      return NextResponse.json({ error: "Invalid token purpose" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { tempSelfieImages: true, profile: { select: { selfieImages: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentProfileSelfies = user.profile?.selfieImages || [];
    const totalSelfies = currentProfileSelfies.length + user.tempSelfieImages.length;

    if (totalSelfies >= 4) {
      return NextResponse.json({ error: "Maximum of 4 selfie photos allowed." }, { status: 400 });
    }

    // Update the User model's temporary selfie array for the desktop to poll
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        tempSelfieImages: {
          push: secureUrl,
        },
      },
    });

    return NextResponse.json({ success: true, url: secureUrl });
  } catch (error) {
    console.error("Failed to upload via mobile link:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
