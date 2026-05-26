import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sendPasswordChangedEmail } from "@/lib/email";
import {
  getExpiredPasswordResetCookieOptions,
  getPasswordResetRequestFromCookies,
  PASSWORD_RESET_COOKIE_NAME,
  PASSWORD_RESET_MAX_ATTEMPTS,
} from "@/lib/password-reset";
import { getPrismaClient } from "@/lib/prisma";
import { forgotPasswordVerificationSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrismaClient();
    const resetRequest = await getPasswordResetRequestFromCookies();

    if (!resetRequest) {
      const response = NextResponse.json(
        { error: "Your reset session has expired. Please start again." },
        { status: 401 }
      );
      response.cookies.set(
        PASSWORD_RESET_COOKIE_NAME,
        "",
        getExpiredPasswordResetCookieOptions()
      );
      return response;
    }

    if (
      !resetRequest.pendingPasswordHash ||
      !resetRequest.verificationCodeHash ||
      !resetRequest.verificationCodeExpiresAt
    ) {
      return NextResponse.json(
        {
          error:
            "Your password reset is incomplete. Please set a new password again.",
        },
        { status: 400 }
      );
    }

    if (resetRequest.verificationCodeExpiresAt <= new Date()) {
      return NextResponse.json(
        {
          error:
            "Your verification code has expired. Please request a new OTP.",
          otpExpired: true,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = forgotPasswordVerificationSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors[0].message },
        { status: 400 }
      );
    }

    if (resetRequest.verificationAttempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
      await prisma.passwordResetRequest.delete({ where: { id: resetRequest.id } });

      const response = NextResponse.json(
        {
          error:
            "Too many incorrect codes were entered. Please start the reset process again.",
        },
        { status: 429 }
      );
      response.cookies.set(
        PASSWORD_RESET_COOKIE_NAME,
        "",
        getExpiredPasswordResetCookieOptions()
      );
      return response;
    }

    const isCodeValid = await bcrypt.compare(
      validatedData.data.code,
      resetRequest.verificationCodeHash
    );

    if (!isCodeValid) {
      const nextAttemptCount = resetRequest.verificationAttempts + 1;

      if (nextAttemptCount >= PASSWORD_RESET_MAX_ATTEMPTS) {
        await prisma.passwordResetRequest.delete({ where: { id: resetRequest.id } });

        const response = NextResponse.json(
          {
            error:
              "Too many incorrect codes were entered. Please start the reset process again.",
          },
          { status: 429 }
        );
        response.cookies.set(
          PASSWORD_RESET_COOKIE_NAME,
          "",
          getExpiredPasswordResetCookieOptions()
        );
        return response;
      }

      await prisma.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: {
          verificationAttempts: {
            increment: 1,
          },
        },
      });

      return NextResponse.json(
        { error: "The verification code you entered is incorrect." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRequest.user.id },
        data: {
          password: resetRequest.pendingPasswordHash,
          emailVerified: resetRequest.user.emailVerified ?? new Date(),
        },
      });

      await tx.passwordResetRequest.deleteMany({
        where: { userId: resetRequest.user.id },
      });
    });

    const emailResult = await sendPasswordChangedEmail({
      to: resetRequest.user.email,
      recipientName: resetRequest.user.name,
    });

    if (!emailResult.ok) {
      console.warn(
        "Password changed confirmation email skipped:",
        emailResult.reason
      );
    }

    const response = NextResponse.json({
      message: "Password updated successfully.",
    });
    response.cookies.set(
      PASSWORD_RESET_COOKIE_NAME,
      "",
      getExpiredPasswordResetCookieOptions()
    );
    return response;
  } catch (error) {
    console.error("Forgot password verification error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
