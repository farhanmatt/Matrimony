import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDatabaseConnectionError } from "@/lib/utils/errors";
import { getDashboardNotificationsForUser } from "@/lib/utils/notifications";

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
