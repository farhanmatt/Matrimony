import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import {
  createPasswordResetSessionToken,
  getPasswordResetCookieOptions,
  getPasswordResetSessionExpiry,
  normalizeEmailAddress,
  PASSWORD_RESET_COOKIE_NAME,
} from "@/lib/password-reset";
import { forgotPasswordEmailSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrismaClient();
    const body = await req.json();
    const validatedData = forgotPasswordEmailSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors[0].message },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmailAddress(validatedData.data.email);

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account was found with that email address." },
        { status: 404 }
      );
    }

    const { token, tokenHash } = createPasswordResetSessionToken();
    const expiresAt = getPasswordResetSessionExpiry();

    await prisma.passwordResetRequest.deleteMany({
      where: {
        userId: user.id,
      },
    });

    await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        email: user.email,
        sessionTokenHash: tokenHash,
        expiresAt,
      },
    });

    const response = NextResponse.json({
      message: "Email confirmed.",
      email: user.email,
    });

    response.cookies.set(
      PASSWORD_RESET_COOKIE_NAME,
      token,
      getPasswordResetCookieOptions(expiresAt)
    );

    return response;
  } catch (error) {
    console.error("Forgot password start error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
