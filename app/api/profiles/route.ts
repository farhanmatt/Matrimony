import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subYears } from "date-fns";
import { Gender, Prisma } from "@prisma/client";
import {
  createFeaturedProfilePreviewToken,
  getFeaturedProfilePreviewSource,
} from "@/lib/server/featured-profile-preview";

const DEFAULT_PROFILE_PAGE_SIZE = 12;
const MAX_PROFILE_PAGE_SIZE = 24;

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
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const requestedLimit = Number.parseInt(
    searchParams.get("limit") ?? `${DEFAULT_PROFILE_PAGE_SIZE}`,
    10
  );
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_PROFILE_PAGE_SIZE)
      : DEFAULT_PROFILE_PAGE_SIZE;
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
      select: {
        id: true,
        fullName: true,
        gender: true,
        dateOfBirth: true,
        height: true,
        maritalStatus: true,
        education: true,
        course: true,
        profession: true,
        location: true,
        city: true,
        state: true,
        religion: true,
        profileImage: true,
        photos: {
          where: { isPrimary: true },
          take: 1,
          select: {
            url: true,
            publicId: true,
          },
        },
      },
      orderBy,
    }),
    prisma.profile.count({ where }),
  ]);

  const data = profiles.map((profile) => {
    const previewSource = getFeaturedProfilePreviewSource(profile);
    const previewToken =
      previewSource.previewUrl && previewSource.fingerprint
        ? createFeaturedProfilePreviewToken({
            profileId: profile.id,
            fingerprint: previewSource.fingerprint,
          })
        : null;

    return {
      id: profile.id,
      fullName: profile.fullName,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      height: profile.height,
      maritalStatus: profile.maritalStatus,
      education: profile.education,
      course: profile.course,
      profession: profile.profession,
      location: profile.location,
      city: profile.city,
      state: profile.state,
      religion: profile.religion,
      previewImageUrl: previewToken
        ? `/api/profiles/preview/${encodeURIComponent(previewToken)}`
        : null,
    };
  });

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
