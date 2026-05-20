import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  forgotPasswordEmailSchema,
} from "@/lib/validations/auth";
import { normalizePasswordResetEmail } from "@/lib/password-reset";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = forgotPasswordEmailSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message ?? "Invalid email address" },
        { status: 400 }
      );
    }

    const email = normalizePasswordResetEmail(validated.data.email);
    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      );
    }

    return NextResponse.json({ email: user.email });
  } catch (error) {
    console.error("Forgot password start error:", error);
    return NextResponse.json(
      { error: "Failed to validate the email address" },
      { status: 500 }
    );
  }
}
