import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { sendRegistrationOtpEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  createRegistrationSessionToken,
  createRegistrationVerificationCode,
  getRegistrationCodeExpiry,
  getRegistrationCookieOptions,
  getRegistrationSessionExpiry,
  REGISTRATION_OTP_CODE_TTL_MINUTES,
  REGISTRATION_OTP_COOKIE_NAME,
} from "@/lib/registration-otp";
import {
  normalizeEmailIdentifier,
  normalizeNameLookup,
} from "@/lib/utils/user-identity";
import { registerSchema } from "@/lib/validations/auth";
import { preferenceSchema, profileSchema } from "@/lib/validations/profile";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors[0].message },
        { status: 400 }
      );
    }

    if (body.preference && !body.profile) {
      return NextResponse.json(
        { error: "Profile data is required when saving preferences" },
        { status: 400 }
      );
    }

    const validatedProfile = body.profile
      ? profileSchema.safeParse(body.profile)
      : null;
    if (validatedProfile && !validatedProfile.success) {
      return NextResponse.json(
        { error: validatedProfile.error.errors[0].message },
        { status: 400 }
      );
    }

    const validatedPreference = body.preference
      ? preferenceSchema.safeParse(body.preference)
      : null;
    if (validatedPreference && !validatedPreference.success) {
      return NextResponse.json(
        { error: validatedPreference.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, password } = validatedData.data;
    const email = normalizeEmailIdentifier(validatedData.data.email);
    const normalizedNameLookup = normalizeNameLookup(name);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationCode = createRegistrationVerificationCode();
    const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
    const verificationCodeExpiresAt = getRegistrationCodeExpiry();
    const { token, tokenHash } = createRegistrationSessionToken();
    const expiresAt = getRegistrationSessionExpiry();

    await prisma.pendingRegistration.deleteMany({
      where: { email },
    });

    const pendingRegistration = await prisma.pendingRegistration.create({
      data: {
        email,
        name,
        nameLookup: normalizedNameLookup,
        passwordHash,
        profile:
          validatedProfile?.success && validatedProfile.data
            ? toJsonValue(validatedProfile.data)
            : undefined,
        preference:
          validatedPreference?.success && validatedPreference.data
            ? toJsonValue(validatedPreference.data)
            : undefined,
        sessionTokenHash: tokenHash,
        verificationCodeHash,
        verificationCodeExpiresAt,
        expiresAt,
      },
      select: { id: true },
    });

    const emailResult = await sendRegistrationOtpEmail({
      to: email,
      recipientName: name,
      verificationCode,
      expiresInMinutes: REGISTRATION_OTP_CODE_TTL_MINUTES,
    });

    if (!emailResult.ok) {
      await prisma.pendingRegistration
        .delete({ where: { id: pendingRegistration.id } })
        .catch(() => {});

      return NextResponse.json(
        {
          error:
            emailResult.reason ||
            "We couldn't send the verification OTP. Please try again.",
        },
        { status: emailResult.status === "skipped" ? 503 : 500 }
      );
    }

    const response = NextResponse.json(
      {
        message: "Verification OTP sent successfully.",
        requiresOtp: true,
        email,
        verificationCodeExpiresAt: verificationCodeExpiresAt.toISOString(),
      },
      { status: 202 }
    );

    response.cookies.set(
      REGISTRATION_OTP_COOKIE_NAME,
      token,
      getRegistrationCookieOptions(expiresAt)
    );

    return response;
  } catch (error) {
    console.error("Register OTP start error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
