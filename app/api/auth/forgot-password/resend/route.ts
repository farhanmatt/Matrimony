import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sendPasswordResetCodeEmail } from "@/lib/email";
import {
  createPasswordResetVerificationCode,
  getExpiredPasswordResetCookieOptions,
  getPasswordResetCookieOptions,
  getPasswordResetRequestFromCookies,
  getPasswordResetSessionExpiry,
  getPasswordResetSessionTokenFromCookies,
  PASSWORD_RESET_CODE_TTL_MINUTES,
  PASSWORD_RESET_COOKIE_NAME,
} from "@/lib/password-reset";
import { getPrismaClient } from "@/lib/prisma";

export async function POST() {
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

    if (!resetRequest.pendingPasswordHash) {
      return NextResponse.json(
        {
          error:
            "Your password reset is incomplete. Please set a new password again.",
        },
        { status: 400 }
      );
    }

    if (
      resetRequest.verificationCodeHash &&
      resetRequest.verificationCodeExpiresAt &&
      resetRequest.verificationCodeExpiresAt > new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "Your current OTP is still valid. Please wait until it expires before requesting a new one.",
        },
        { status: 400 }
      );
    }

    const verificationCode = createPasswordResetVerificationCode();
    const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
    const verificationCodeExpiresAt = new Date(
      Date.now() + PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000
    );
    const expiresAt = getPasswordResetSessionExpiry();

    await prisma.passwordResetRequest.update({
      where: { id: resetRequest.id },
      data: {
        verificationCodeHash,
        verificationCodeExpiresAt,
        verificationAttempts: 0,
        expiresAt,
      },
    });

    const emailResult = await sendPasswordResetCodeEmail({
      to: resetRequest.user.email,
      recipientName: resetRequest.user.name,
      verificationCode,
      expiresInMinutes: PASSWORD_RESET_CODE_TTL_MINUTES,
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        {
          error:
            emailResult.reason ||
            "We couldn't resend the verification code. Please try again.",
        },
        { status: emailResult.status === "skipped" ? 503 : 500 }
      );
    }

    const sessionToken = await getPasswordResetSessionTokenFromCookies();
    const response = NextResponse.json({
      message: "A new verification code has been sent successfully.",
      verificationCodeExpiresAt: verificationCodeExpiresAt.toISOString(),
    });

    if (sessionToken) {
      response.cookies.set(
        PASSWORD_RESET_COOKIE_NAME,
        sessionToken,
        getPasswordResetCookieOptions(expiresAt)
      );
    }

    return response;
  } catch (error) {
    console.error("Forgot password resend OTP error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
