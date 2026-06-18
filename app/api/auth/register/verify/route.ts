import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createVerifiedRegistrationAccount } from "@/lib/registration";
import {
  getExpiredRegistrationCookieOptions,
  getPendingRegistrationFromCookies,
  REGISTRATION_OTP_COOKIE_NAME,
  REGISTRATION_OTP_MAX_ATTEMPTS,
  sha256,
} from "@/lib/registration-otp";
import { prisma } from "@/lib/prisma";
import { normalizeNameLookup } from "@/lib/utils/user-identity";
import { registrationOtpSchema } from "@/lib/validations/auth";
import { preferenceSchema, profileSchema } from "@/lib/validations/profile";

type CreatedRegistrationAccount = Awaited<
  ReturnType<typeof createVerifiedRegistrationAccount>
>;

function clearRegistrationCookie(response: NextResponse) {
  response.cookies.set(
    REGISTRATION_OTP_COOKIE_NAME,
    "",
    getExpiredRegistrationCookieOptions()
  );
  return response;
}

export async function POST(req: NextRequest) {
  try {
    const pendingRegistration = await getPendingRegistrationFromCookies();

    if (!pendingRegistration) {
      return clearRegistrationCookie(
        NextResponse.json(
          { error: "Your registration session has expired. Please start again." },
          { status: 401 }
        )
      );
    }

    if (pendingRegistration.verificationCodeExpiresAt <= new Date()) {
      return NextResponse.json(
        {
          error:
            "Your verification OTP has expired. Please request a new OTP.",
          otpExpired: true,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = registrationOtpSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors[0].message },
        { status: 400 }
      );
    }

    if (pendingRegistration.verificationAttempts >= REGISTRATION_OTP_MAX_ATTEMPTS) {
      await prisma.pendingRegistration.delete({
        where: { id: pendingRegistration.id },
      });

      return clearRegistrationCookie(
        NextResponse.json(
          {
            error:
              "Too many incorrect OTPs were entered. Please start registration again.",
          },
          { status: 429 }
        )
      );
    }

    const isCodeValid =
      validatedData.data.code === pendingRegistration.verificationCodeHash;


    if (!isCodeValid) {
      const nextAttemptCount = pendingRegistration.verificationAttempts + 1;

      if (nextAttemptCount >= REGISTRATION_OTP_MAX_ATTEMPTS) {
        await prisma.pendingRegistration.delete({
          where: { id: pendingRegistration.id },
        });

        return clearRegistrationCookie(
          NextResponse.json(
            {
              error:
                "Too many incorrect OTPs were entered. Please start registration again.",
            },
            { status: 429 }
          )
        );
      }

      await prisma.pendingRegistration.update({
        where: { id: pendingRegistration.id },
        data: {
          verificationAttempts: {
            increment: 1,
          },
        },
      });

      return NextResponse.json(
        {
          error:
            "The OTP you entered is incorrect. Please enter a valid OTP or request a new one.",
        },
        { status: 400 }
      );
    }

    const validatedProfile = pendingRegistration.profile
      ? profileSchema.safeParse(pendingRegistration.profile)
      : null;
    if (validatedProfile && !validatedProfile.success) {
      await prisma.pendingRegistration.delete({
        where: { id: pendingRegistration.id },
      });

      return clearRegistrationCookie(
        NextResponse.json(
          {
            error:
              "Your registration details could not be verified. Please start again.",
          },
          { status: 400 }
        )
      );
    }

    const validatedPreference = pendingRegistration.preference
      ? preferenceSchema.safeParse(pendingRegistration.preference)
      : null;
    if (validatedPreference && !validatedPreference.success) {
      await prisma.pendingRegistration.delete({
        where: { id: pendingRegistration.id },
      });

      return clearRegistrationCookie(
        NextResponse.json(
          {
            error:
              "Your preference details could not be verified. Please start again.",
          },
          { status: 400 }
        )
      );
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: pendingRegistration.email },
        select: { id: true },
      });

      if (existing) {
        await tx.pendingRegistration.delete({
          where: { id: pendingRegistration.id },
        });
        return {
          duplicateEmail: true,
          result: null as CreatedRegistrationAccount | null,
        };
      }

      const result = await createVerifiedRegistrationAccount({
        tx,
        name: pendingRegistration.name,
        nameLookup:
          pendingRegistration.nameLookup ??
          normalizeNameLookup(pendingRegistration.name),
        email: pendingRegistration.email,
        passwordHash: pendingRegistration.passwordHash,
        profile: validatedProfile?.success ? validatedProfile.data : undefined,
        preference: validatedPreference?.success
          ? validatedPreference.data
          : undefined,
      });

      await tx.pendingRegistration.delete({
        where: { id: pendingRegistration.id },
      });

      return {
        duplicateEmail: false,
        result,
      };
    });

    if (transactionResult.duplicateEmail) {
      return clearRegistrationCookie(
        NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        )
      );
    }

    const result = transactionResult.result;

    if (!result) {
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    return clearRegistrationCookie(
      NextResponse.json(
        {
          message: "Account created successfully",
          user: result.user,
          profileCreated: result.profileCreated,
        },
        { status: 201 }
      )
    );
  } catch (error) {
    console.error("Register OTP verification error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
