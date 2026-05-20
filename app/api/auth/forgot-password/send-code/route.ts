import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetCodeEmail } from "@/lib/email";
import {
  encodePasswordResetToken,
  generatePasswordResetCode,
  getPasswordResetExpiryDate,
  getPasswordResetIdentifier,
  normalizePasswordResetEmail,
  PASSWORD_RESET_EXPIRES_MINUTES,
} from "@/lib/password-reset";
import { forgotPasswordNewPasswordSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = forgotPasswordNewPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const email = normalizePasswordResetEmail(validated.data.email);
    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      );
    }

    const verificationCode = generatePasswordResetCode();
    const passwordHash = await bcrypt.hash(validated.data.password, 12);
    const codeHash = await bcrypt.hash(verificationCode, 12);
    const identifier = getPasswordResetIdentifier(email);
    const expires = getPasswordResetExpiryDate();
    const token = encodePasswordResetToken({ codeHash, passwordHash });

    await prisma.$transaction(async (tx) => {
      await tx.verificationToken.deleteMany({
        where: { identifier },
      });

      await tx.verificationToken.create({
        data: {
          identifier,
          token,
          expires,
        },
      });
    });

    const emailResult = await sendPasswordResetCodeEmail({
      to: user.email,
      recipientName: user.name,
      verificationCode,
      expiresInMinutes: PASSWORD_RESET_EXPIRES_MINUTES,
    });

    if (!emailResult.ok) {
      await prisma.verificationToken.deleteMany({
        where: { identifier },
      });

      return NextResponse.json(
        {
          error:
            emailResult.status === "skipped"
              ? "Password reset email could not be sent because email settings are incomplete."
              : emailResult.reason,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ email: user.email });
  } catch (error) {
    console.error("Forgot password send code error:", error);
    return NextResponse.json(
      { error: "Failed to send the verification code" },
      { status: 500 }
    );
  }
}
