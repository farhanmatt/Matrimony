import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDatabaseConnectionError } from "@/lib/utils/errors";
import {
  dismissUnreadMessageNotificationsForUser,
  getDashboardNotificationsForUser,
} from "@/lib/utils/notifications";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getDashboardNotificationsForUser(session.user.id);
    return NextResponse.json({ data });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json({
        data: {
          profileId: null,
          items: [],
        },
      });
    }

    throw error;
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { kind, actorProfileId, action } = await req.json();

    if (kind !== "message") {
      return NextResponse.json(
        { error: "Only message notifications can be updated here" },
        { status: 400 }
      );
    }

    if (typeof actorProfileId !== "string" || !actorProfileId.trim()) {
      return NextResponse.json(
        { error: "actorProfileId is required" },
        { status: 400 }
      );
    }

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be either accept or reject" },
        { status: 400 }
      );
    }

    const result = await dismissUnreadMessageNotificationsForUser(
      session.user.id,
      actorProfileId,
      action
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json({ data: { updatedCount: 0 } });
    }

    console.error("Notification update error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
