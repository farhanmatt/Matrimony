import { NextRequest, NextResponse } from "next/server";
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
import { forgotPasswordPasswordSchema } from "@/lib/validations/auth";

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

    const body = await req.json();
    const validatedData = forgotPasswordPasswordSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors[0].message },
        { status: 400 }
      );
    }

    const password = validatedData.data.password;

    if (
      resetRequest.user.password &&
      (await bcrypt.compare(password, resetRequest.user.password))
    ) {
      return NextResponse.json(
        { error: "Please choose a password different from your current one." },
        { status: 400 }
      );
    }

    const pendingPasswordHash = await bcrypt.hash(password, 12);
    const verificationCode = createPasswordResetVerificationCode();
    const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
    const verificationCodeExpiresAt = new Date(
      Date.now() + PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000
    );
    const expiresAt = getPasswordResetSessionExpiry();

    await prisma.passwordResetRequest.update({
      where: { id: resetRequest.id },
      data: {
        pendingPasswordHash,
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
      await prisma.passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: {
          verificationCodeHash: null,
          verificationCodeExpiresAt: null,
          verificationAttempts: 0,
        },
      });

      return NextResponse.json(
        {
          error:
            emailResult.reason ||
            "We couldn't send the verification code. Please try again.",
        },
        { status: emailResult.status === "skipped" ? 503 : 500 }
      );
    }

    const sessionToken = await getPasswordResetSessionTokenFromCookies();
    const response = NextResponse.json({
      message: "Verification code sent successfully.",
      email: resetRequest.user.email,
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
    console.error("Forgot password password step error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
