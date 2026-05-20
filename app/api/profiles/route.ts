import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subYears } from "date-fns";
import { Gender, Prisma } from "@prisma/client";

function getDefaultBrowseGender(gender: Gender | null | undefined) {
  if (gender === "MALE") return "FEMALE";
  if (gender === "FEMALE") return "MALE";
  return undefined;
}

// GET /api/profiles — paginated, filtered profile browse
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserProfile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, gender: true },
  });

  if (!currentUserProfile) {
    return NextResponse.json(
      {
        error: "Create your profile first to browse other profiles.",
        code: "PROFILE_REQUIRED",
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "12");
  const requestedGender = searchParams.get("gender") ?? undefined;
  const gender = requestedGender ?? getDefaultBrowseGender(currentUserProfile.gender);
  const search = searchParams.get("search") ?? undefined;
  const religion = searchParams.get("religion") ?? undefined;
  const caste = searchParams.get("caste") ?? undefined;
  const language = searchParams.get("language") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
  const profession = searchParams.get("profession") ?? undefined;
  const maritalStatus = searchParams.get("maritalStatus") ?? undefined;
  const heightMin = searchParams.get("heightMin")
    ? Number(searchParams.get("heightMin"))
    : undefined;
  const heightMax = searchParams.get("heightMax")
    ? Number(searchParams.get("heightMax"))
    : undefined;
  const annualIncome = searchParams.get("annualIncome") ?? undefined;
  const education = searchParams.get("education") ?? undefined;
  const ageMin = searchParams.get("ageMin") ? parseInt(searchParams.get("ageMin")!) : undefined;
  const ageMax = searchParams.get("ageMax") ? parseInt(searchParams.get("ageMax")!) : undefined;
  const sort = searchParams.get("sort") ?? "newest";

  const searchFilter = search
    ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { profession: { contains: search, mode: "insensitive" as const } },
          { education: { contains: search, mode: "insensitive" as const } },
          { location: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
          { state: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const locationFilter = location
    ? {
        OR: [
          { location: { contains: location, mode: "insensitive" as const } },
          { city: { contains: location, mode: "insensitive" as const } },
          { state: { contains: location, mode: "insensitive" as const } },
        ],
      }
    : {};

  const dateOfBirthFilter =
    ageMin || ageMax
      ? {
          dateOfBirth: {
            ...(ageMax && { gte: subYears(new Date(), ageMax) }),
            ...(ageMin && { lte: subYears(new Date(), ageMin) }),
          },
        }
      : {};

  const heightFilter =
    heightMin || heightMax
      ? {
          height: {
            ...(heightMin && { gte: heightMin }),
            ...(heightMax && { lte: heightMax }),
          },
        }
      : {};

  const where: Prisma.ProfileWhereInput = {
    status: "ACTIVE" as const,
    userId: { not: session.user.id },
    likesReceived: {
      none: {
        fromProfile: {
          userId: session.user.id,
        },
      },
    },
    ...(gender && { gender: gender as "MALE" | "FEMALE" | "OTHER" }),
    ...searchFilter,
    ...(religion && { religion }),
    ...(caste && { caste: { contains: caste, mode: "insensitive" as const } }),
    ...(language && {
      language: { contains: language, mode: "insensitive" as const },
    }),
    ...locationFilter,
    ...(profession && {
      profession: { contains: profession, mode: "insensitive" as const },
    }),
    ...(maritalStatus && { maritalStatus: maritalStatus as never }),
    ...heightFilter,
    ...(annualIncome && {
      income: { contains: annualIncome, mode: "insensitive" as const },
    }),
    ...(education && {
      education: { contains: education, mode: "insensitive" as const },
    }),
    ...dateOfBirthFilter,
  };

  const orderBy: Prisma.ProfileOrderByWithRelationInput =
    sort === "youngest"
      ? { dateOfBirth: "desc" }
      : sort === "oldest"
        ? { dateOfBirth: "asc" }
        : sort === "name"
          ? { fullName: "asc" }
          : { createdAt: "desc" };

  const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        photos: { where: { isPrimary: true }, take: 1 },
      },
      orderBy,
    }),
    prisma.profile.count({ where }),
  ]);

  return NextResponse.json({
    data: profiles,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
