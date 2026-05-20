import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  decodePasswordResetToken,
  getPasswordResetIdentifier,
  normalizePasswordResetEmail,
} from "@/lib/password-reset";
import { forgotPasswordVerificationSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = forgotPasswordVerificationSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const email = normalizePasswordResetEmail(validated.data.email);
    const identifier = getPasswordResetIdentifier(email);
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      );
    }

    const resetToken = await prisma.verificationToken.findFirst({
      where: { identifier },
      orderBy: { expires: "desc" },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "No password reset request was found for this email" },
        { status: 400 }
      );
    }

    if (resetToken.expires.getTime() < Date.now()) {
      await prisma.verificationToken.deleteMany({
        where: { identifier },
      });

      return NextResponse.json(
        { error: "The verification code has expired. Please start again." },
        { status: 400 }
      );
    }

    const payload = decodePasswordResetToken(resetToken.token);

    if (!payload) {
      await prisma.verificationToken.deleteMany({
        where: { identifier },
      });

      return NextResponse.json(
        { error: "The password reset request is invalid. Please start again." },
        { status: 400 }
      );
    }

    const isCodeValid = await bcrypt.compare(validated.data.code, payload.codeHash);

    if (!isCodeValid) {
      return NextResponse.json(
        { error: "The verification code is incorrect" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { password: payload.passwordHash },
      });

      await tx.verificationToken.deleteMany({
        where: { identifier },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password verify error:", error);
    return NextResponse.json(
      { error: "Failed to reset the password" },
      { status: 500 }
    );
  }
}
