import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sendRegistrationOtpEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  createRegistrationVerificationCode,
  getExpiredRegistrationCookieOptions,
  getPendingRegistrationFromCookies,
  getRegistrationCodeExpiry,
  getRegistrationCookieOptions,
  getRegistrationSessionExpiry,
  getRegistrationSessionTokenFromCookies,
  REGISTRATION_OTP_CODE_TTL_MINUTES,
  REGISTRATION_OTP_COOKIE_NAME,
} from "@/lib/registration-otp";

export async function POST() {
  try {
    const pendingRegistration = await getPendingRegistrationFromCookies();

    if (!pendingRegistration) {
      const response = NextResponse.json(
        { error: "Your registration session has expired. Please start again." },
        { status: 401 }
      );
      response.cookies.set(
        REGISTRATION_OTP_COOKIE_NAME,
        "",
        getExpiredRegistrationCookieOptions()
      );
      return response;
    }

    if (pendingRegistration.verificationCodeExpiresAt > new Date()) {
      return NextResponse.json(
        {
          error:
            "Your current OTP is still valid. Please wait until it expires before requesting a new one.",
        },
        { status: 400 }
      );
    }

    const verificationCode = createRegistrationVerificationCode();
    const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
    const verificationCodeExpiresAt = getRegistrationCodeExpiry();
    const expiresAt = getRegistrationSessionExpiry();
    const previousCode = {
      verificationCodeHash: pendingRegistration.verificationCodeHash,
      verificationCodeExpiresAt: pendingRegistration.verificationCodeExpiresAt,
      verificationAttempts: pendingRegistration.verificationAttempts,
      expiresAt: pendingRegistration.expiresAt,
    };

    await prisma.pendingRegistration.update({
      where: { id: pendingRegistration.id },
      data: {
        verificationCodeHash,
        verificationCodeExpiresAt,
        verificationAttempts: 0,
        expiresAt,
      },
    });

    const emailResult = await sendRegistrationOtpEmail({
      to: pendingRegistration.email,
      recipientName: pendingRegistration.name,
      verificationCode,
      expiresInMinutes: REGISTRATION_OTP_CODE_TTL_MINUTES,
    });

    if (!emailResult.ok) {
      await prisma.pendingRegistration
        .update({
          where: { id: pendingRegistration.id },
          data: previousCode,
        })
        .catch(() => {});

      return NextResponse.json(
        {
          error:
            emailResult.reason ||
            "We couldn't resend the verification OTP. Please try again.",
        },
        { status: emailResult.status === "skipped" ? 503 : 500 }
      );
    }

    const sessionToken = await getRegistrationSessionTokenFromCookies();
    const response = NextResponse.json({
      message: "A new verification OTP has been sent successfully.",
      email: pendingRegistration.email,
      verificationCodeExpiresAt: verificationCodeExpiresAt.toISOString(),
    });

    if (sessionToken) {
      response.cookies.set(
        REGISTRATION_OTP_COOKIE_NAME,
        sessionToken,
        getRegistrationCookieOptions(expiresAt)
      );
    }

    return response;
  } catch (error) {
    console.error("Register OTP resend error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
