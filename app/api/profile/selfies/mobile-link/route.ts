import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { sendMobileSelfieLinkEmail } from "@/lib/email";

const JWT_SECRET = process.env.AUTH_SECRET || "fallback_secret_for_dev";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    });

    if (!user || !user.email) {
      return NextResponse.json({ error: "User or email not found" }, { status: 404 });
    }

    // Create a secure token valid for 15 minutes
    const token = jwt.sign(
      { userId: session.user.id, purpose: "selfie_capture" },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Get the base URL (from request or env)
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    const baseUrl = `${protocol}://${host}`;

    const link = `${baseUrl}/verify-selfie?token=${token}`;

    const emailResult = await sendMobileSelfieLinkEmail({
      to: user.email,
      recipientName: user.name,
      link,
    });

    if (emailResult.ok) {
      return NextResponse.json({ success: true, status: emailResult.status });
    } else {
      console.warn("Email send skipped or failed:", emailResult);
      // In dev environment without SMTP, we return the link for easy testing
      return NextResponse.json({ success: true, status: "skipped", debugLink: link });
    }

  } catch (error) {
    console.error("Failed to generate mobile link:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
