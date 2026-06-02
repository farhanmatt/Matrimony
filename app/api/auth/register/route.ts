import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  normalizeEmailIdentifier,
  normalizeNameLookup,
} from "@/lib/utils/user-identity";
import { registerSchema } from "@/lib/validations/auth";
import {
  preferenceSchema,
  profileSchema,
  type PreferenceInput,
} from "@/lib/validations/profile";

function compactAddressLocation(
  city?: string | null,
  state?: string | null,
  fallbackLocation?: string | null
) {
  const parts = [city, state]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (parts.length > 0) {
    return parts.join(", ");
  }

  const fallback = fallbackLocation?.trim();
  return fallback ? fallback : null;
}

function extractCloudinaryPublicId(url: string) {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const uploadIndex = pathParts.indexOf("upload");

    if (uploadIndex === -1) {
      return null;
    }

    const uploadPathParts = pathParts.slice(uploadIndex + 1);
    const versionIndex = uploadPathParts.findIndex((part) => /^v\d+$/.test(part));
    const publicIdParts =
      versionIndex >= 0
        ? uploadPathParts.slice(versionIndex + 1)
        : uploadPathParts;

    if (publicIdParts.length === 0) {
      return null;
    }

    const lastPart = publicIdParts[publicIdParts.length - 1];
    publicIdParts[publicIdParts.length - 1] = lastPart.replace(/\.[^.]+$/, "");

    return publicIdParts.join("/");
  } catch {
    return null;
  }
}

function normalizePhotoUrls(
  profileImage?: string | null,
  additionalPhotoUrls: string[] = []
) {
  const uniqueUrls = new Set<string>();
  const normalizedUrls: string[] = [];

  for (const candidate of [profileImage, ...additionalPhotoUrls]) {
    const trimmedUrl = candidate?.trim();
    if (!trimmedUrl || uniqueUrls.has(trimmedUrl)) {
      continue;
    }

    uniqueUrls.add(trimmedUrl);
    normalizedUrls.push(trimmedUrl);
  }

  return normalizedUrls;
}

function buildProfilePhotoData(
  profileId: string,
  profileImage?: string | null,
  additionalPhotoUrls: string[] = []
) {
  const normalizedUrls = normalizePhotoUrls(profileImage, additionalPhotoUrls);
  const primaryUrl = profileImage?.trim() || normalizedUrls[0] || null;

  return normalizedUrls.map((url, index) => ({
    profileId,
    url,
    publicId:
      extractCloudinaryPublicId(url) ?? `profile-${profileId}-${index + 1}`,
    isPrimary: url === primaryUrl,
  }));
}

function emptyToNull(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.errors[0].message },
        { status: 400 }
      );
    }

    if (body.preference && !body.profile) {
      return NextResponse.json(
        { error: "Profile data is required when saving preferences" },
        { status: 400 }
      );
    }

    const validatedProfile = body.profile
      ? profileSchema.safeParse(body.profile)
      : null;
    if (validatedProfile && !validatedProfile.success) {
      return NextResponse.json(
        { error: validatedProfile.error.errors[0].message },
        { status: 400 }
      );
    }

    const validatedPreference = body.preference
      ? preferenceSchema.safeParse(body.preference)
      : null;
    if (validatedPreference && !validatedPreference.success) {
      return NextResponse.json(
        { error: validatedPreference.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, password } = validatedData.data;
    const email = normalizeEmailIdentifier(validatedData.data.email);
    const normalizedNameLookup = normalizeNameLookup(name);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          nameLookup: normalizedNameLookup,
          email,
          password: hashedPassword,
        },
        select: { id: true, name: true, email: true },
      });

      let createdProfileId: string | null = null;

      if (validatedProfile?.success) {
        const { dateOfBirth, additionalPhotoUrls = [], ...rest } =
          validatedProfile.data;

        const createdProfile = await tx.profile.create({
          data: {
            userId: createdUser.id,
            dateOfBirth: new Date(dateOfBirth),
            status: "ACTIVE",
            ...rest,
            location: compactAddressLocation(rest.city, rest.state, rest.location),
          },
          select: { id: true },
        });

        createdProfileId = createdProfile.id;

        const photoRows = buildProfilePhotoData(
          createdProfile.id,
          rest.profileImage,
          additionalPhotoUrls
        );

        if (photoRows.length > 0) {
          await tx.profilePhoto.createMany({
            data: photoRows,
          });
        }

        if (rest.profileImage) {
          await tx.user.update({
            where: { id: createdUser.id },
            data: { image: rest.profileImage },
          });
        }

        if (validatedPreference?.success) {
          await tx.preference.create({
            data: {
              profileId: createdProfile.id,
              ...normalizePreference(validatedPreference.data),
            },
          });
        }
      }

      return {
        user: createdUser,
        profileCreated: Boolean(createdProfileId),
      };
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: result.user,
        profileCreated: result.profileCreated,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
