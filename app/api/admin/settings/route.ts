import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

function adminGuard(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/settings — get admin settings (pricing)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.adminSettings.findUnique({
    where: { id: "singleton" },
  });

  return NextResponse.json({ settings });
}

// PUT /api/admin/settings — update pricing
export async function PUT(req: NextRequest) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const { baseAmount, profileAmount } = await req.json();

  if (typeof baseAmount !== "number" || typeof profileAmount !== "number") {
    return NextResponse.json({ error: "Invalid pricing values" }, { status: 400 });
  }

  const settings = await prisma.adminSettings.upsert({
    where: { id: "singleton" },
    update: { baseAmount, profileAmount },
    create: { id: "singleton", baseAmount, profileAmount },
  });

  return NextResponse.json({ settings });
}
