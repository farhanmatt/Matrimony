import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendProfileCreatedEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validations/profile";

function compactAddressLocation(city?: string | null, state?: string | null) {
  const parts = [city, state]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(", ") : null;
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

async function syncProfilePhotos(
  profileId: string,
  profileImage?: string | null,
  additionalPhotoUrls: string[] = []
) {
  const normalizedUrls = normalizePhotoUrls(profileImage, additionalPhotoUrls);
  const primaryUrl = profileImage?.trim() || normalizedUrls[0] || null;

  await prisma.profilePhoto.deleteMany({
    where: { profileId },
  });

  if (normalizedUrls.length === 0) {
    return;
  }

  await prisma.profilePhoto.createMany({
    data: normalizedUrls.map((url, index) => ({
      profileId,
      url,
      publicId:
        extractCloudinaryPublicId(url) ?? `profile-${profileId}-${index + 1}`,
      isPrimary: url === primaryUrl,
    })),
  });
}

// GET /api/profile — get current user's own profile
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { photos: true, preference: true },
  });

  return NextResponse.json({ profile });
}

// POST /api/profile — create profile
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = profileSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const [existing, currentUser] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId: session.user.id },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true },
      }),
    ]);

    if (existing) {
      return NextResponse.json(
        { error: "Profile already exists. Use PUT to update." },
        { status: 409 }
      );
    }

    if (!currentUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const { dateOfBirth, additionalPhotoUrls = [], ...rest } = validated.data;
    const location = compactAddressLocation(rest.city, rest.state);

    const profile = await prisma.profile.create({
      data: {
        userId: session.user.id,
        dateOfBirth: new Date(dateOfBirth),
        status: "ACTIVE",
        ...rest,
        location,
      },
    });

    await syncProfilePhotos(profile.id, rest.profileImage, additionalPhotoUrls);

    // Sync user image
    if (rest.profileImage) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: rest.profileImage },
      });
    }

    const emailResult = currentUser.email
      ? await sendProfileCreatedEmail({
          to: currentUser.email,
          recipientName: currentUser.name ?? rest.fullName,
          profileName: rest.fullName,
        })
      : {
          ok: false as const,
          status: "skipped" as const,
          reason: "User session email is not available.",
        };

    return NextResponse.json(
      {
        profile,
        confirmationEmailSent: emailResult.ok,
        confirmationEmailStatus: emailResult.status,
        confirmationEmailReason: emailResult.ok ? null : emailResult.reason,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create profile error:", error);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}

// PUT /api/profile — update profile
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = profileSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { dateOfBirth, additionalPhotoUrls = [], ...rest } = validated.data;
    const location = compactAddressLocation(rest.city, rest.state);

    const profile = await prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        dateOfBirth: new Date(dateOfBirth),
        ...rest,
        location,
      },
    });

    await syncProfilePhotos(profile.id, rest.profileImage, additionalPhotoUrls);

    // Sync user image
    if (rest.profileImage) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: rest.profileImage },
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
