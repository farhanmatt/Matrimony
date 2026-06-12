import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeSupportIssueForUser } from "@/lib/utils/support-assistant";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      message?: unknown;
      shortlistCount?: unknown;
    };

    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    const shortlistCount =
      typeof body.shortlistCount === "number" &&
      Number.isInteger(body.shortlistCount) &&
      body.shortlistCount >= 0
        ? body.shortlistCount
        : null;

    if (!message) {
      return NextResponse.json(
        { error: "Please describe your issue before sending." },
        { status: 400 }
      );
    }

    if (message.length > 1500) {
      return NextResponse.json(
        { error: "Please keep your message under 1500 characters." },
        { status: 400 }
      );
    }

    const result = await analyzeSupportIssueForUser(
      session.user.id,
      message,
      shortlistCount
    );

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    console.error("Support assistant error:", error);
    return NextResponse.json(
      { error: "Failed to contact support assistant." },
      { status: 500 }
    );
  }
}
