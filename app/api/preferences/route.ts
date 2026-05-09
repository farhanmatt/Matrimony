import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { preferenceSchema, type PreferenceInput } from "@/lib/validations/profile";

function emptyToNull(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePreference(data: PreferenceInput) {
  return {
    ageMin: data.ageMin ?? null,
    ageMax: data.ageMax ?? null,
    heightMin: data.heightMin ?? null,
    heightMax: data.heightMax ?? null,
    religion: emptyToNull(data.religion),
    caste: emptyToNull(data.caste),
    education: emptyToNull(data.education),
    profession: emptyToNull(data.profession),
    location: emptyToNull(data.location),
    maritalStatus: emptyToNull(data.maritalStatus),
    language: emptyToNull(data.language),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { preference: true },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Create your profile before setting preferences" },
      { status: 404 }
    );
  }

  return NextResponse.json({ preference: profile.preference });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = preferenceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Create your profile before setting preferences" },
        { status: 404 }
      );
    }

    const data = normalizePreference(validated.data);
    const preference = await prisma.preference.upsert({
      where: { profileId: profile.id },
      create: { profileId: profile.id, ...data },
      update: data,
    });

    return NextResponse.json({ preference });
  } catch (error) {
    console.error("Preference update error:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
