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

// GET /api/admin/profiles
export async function GET(req: NextRequest) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const where = {
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: "insensitive" as const } },
        { location: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status ? { status: status as never } : { status: { notIn: ["INACTIVE", "SUSPENDED"] } as never }),
  };

  const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        photos: { where: { isPrimary: true }, take: 1 },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.profile.count({ where }),
  ]);

  return NextResponse.json({ data: profiles, total, page, limit, totalPages: Math.ceil(total / limit) });
}

// PATCH /api/admin/profiles — toggle profile status
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const { profileId, status } = await req.json();
  const profile = await prisma.profile.update({
    where: { id: profileId },
    data: { status },
  });

  return NextResponse.json({ profile });
}

// DELETE /api/admin/profiles
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const { profileId, permanent } = await req.json();
  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  if (permanent) {
    await prisma.profile.delete({
      where: { id: profileId },
    });

    return NextResponse.json({ success: true, permanent: true });
  }

  const profile = await prisma.profile.update({
    where: { id: profileId },
    data: { status: "INACTIVE" },
  });

  return NextResponse.json({ profile });
}
