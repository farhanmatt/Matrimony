import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProfilePdf, type ProfilePdfSection } from "@/lib/pdf/profilePdf";
import { findUnlockForProfiles } from "@/lib/utils/matching";
import {
  calculateAge,
  cmToFeetInches,
  FAMILY_STATUS_LABELS,
  FAMILY_TYPE_LABELS,
  formatDate,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
  slugify,
} from "@/lib/utils/helpers";

export const runtime = "nodejs";

function buildProfilePhotoUrls(profile: {
  photos: { url: string; isPrimary: boolean }[];
  profileImage?: string | null;
  user?: { image?: string | null } | null;
}) {
  const orderedUrls = [
    profile.photos.find((photo) => photo.isPrimary)?.url ?? null,
    ...profile.photos.map((photo) => photo.url),
    profile.profileImage ?? null,
    profile.user?.image ?? null,
  ];

  return Array.from(
    new Set(
      orderedUrls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    )
  );
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not added";
  }

  if (typeof value === "string") {
    return value.trim() || "Not added";
  }

  return String(value);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams, origin } = new URL(req.url);
  const profileId = searchParams.get("id");

  if (!profileId) {
    return NextResponse.json({ error: "Profile id is required" }, { status: 400 });
  }

  const ownProfile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!ownProfile) {
    return NextResponse.json(
      { error: "Create your profile first to download profile details." },
      { status: 403 }
    );
  }

  const profile = await prisma.profile.findFirst({
    where: { id: profileId },
    include: {
      photos: true,
      user: {
        select: {
          image: true,
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const hasUnlockedAccess =
    ownProfile.id === profile.id ||
    Boolean(
      await findUnlockForProfiles(session.user.id, ownProfile.id, profile.id)
    );

  if (!hasUnlockedAccess) {
    return NextResponse.json(
      { error: "Unlock this profile first to download full details." },
      { status: 403 }
    );
  }

  const age = calculateAge(profile.dateOfBirth);
  const displayLocation =
    [profile.city, profile.state].filter(Boolean).join(", ") || profile.location || "India";
  const photoUrls = buildProfilePhotoUrls(profile);
  const profileUrl = `${origin}/dashboard/profile/${profile.id}`;
  const quickFacts = [
    profile.height ? cmToFeetInches(profile.height) : null,
    profile.religion || null,
    MARITAL_STATUS_LABELS[profile.maritalStatus],
  ].filter((value): value is string => Boolean(value));

  const sections: ProfilePdfSection[] = [
    {
      title: "Basic Information",
      rows: [
        { label: "Full Name", value: formatValue(profile.fullName) },
        { label: "Gender", value: formatValue(GENDER_LABELS[profile.gender]) },
        { label: "Age", value: `${age} years` },
        { label: "Date of Birth", value: formatDate(profile.dateOfBirth) },
        { label: "Phone Number", value: formatValue(profile.phone) },
        {
          label: "Height",
          value: profile.height ? cmToFeetInches(profile.height) : "Not added",
        },
        {
          label: "Marital Status",
          value: formatValue(MARITAL_STATUS_LABELS[profile.maritalStatus]),
        },
        { label: "Religion", value: formatValue(profile.religion) },
        { label: "Mother Tongue", value: formatValue(profile.language) },
        { label: "Location", value: formatValue(displayLocation) },
        { label: "Bio", value: formatValue(profile.bio) },
      ],
    },
    {
      title: "Family Details",
      rows: [
        { label: "Father's Name", value: formatValue(profile.fatherName) },
        { label: "Mother's Name", value: formatValue(profile.motherName) },
        {
          label: "Family Type",
          value: profile.familyType
            ? FAMILY_TYPE_LABELS[profile.familyType]
            : "Not added",
        },
        {
          label: "Family Status",
          value: profile.familyStatus
            ? FAMILY_STATUS_LABELS[profile.familyStatus]
            : "Not added",
        },
        { label: "Siblings", value: formatValue(profile.siblings) },
      ],
    },
    {
      title: "Education & Career",
      rows: [
        { label: "Education", value: formatValue(profile.education) },
        { label: "Course", value: formatValue(profile.course) },
        { label: "Profession", value: formatValue(profile.profession) },
        { label: "Employed In", value: formatValue(profile.employedIn) },
        { label: "Annual Income", value: formatValue(profile.income) },
      ],
    },
    {
      title: "Lifestyle",
      rows: [
        { label: "Diet", value: formatValue(profile.diet) },
        { label: "Smoking", value: formatValue(profile.smoking) },
        { label: "Drinking", value: formatValue(profile.drinking) },
        { label: "Hobbies", value: formatValue(profile.hobbies) },
        { label: "Physical Activity", value: formatValue(profile.physicalActivity) },
        { label: "Personality Type", value: formatValue(profile.personalityType) },
        { label: "Exercise", value: formatValue(profile.exercise) },
      ],
    },
    {
      title: "Religious & Cultural Background",
      rows: [
        { label: "Religion", value: formatValue(profile.religion) },
        { label: "Caste", value: formatValue(profile.caste) },
        { label: "Sub Caste", value: formatValue(profile.subCaste) },
        { label: "Mother Tongue", value: formatValue(profile.language) },
        { label: "City", value: formatValue(profile.city) },
        { label: "State", value: formatValue(profile.state) },
        { label: "Country", value: formatValue(profile.country) },
      ],
    },
    {
      title: "Address & Contact",
      rows: [
        { label: "House Number", value: formatValue(profile.houseNumber) },
        { label: "Street Name", value: formatValue(profile.streetName) },
        { label: "City", value: formatValue(profile.city) },
        { label: "State", value: formatValue(profile.state) },
        { label: "Pincode", value: formatValue(profile.pincode) },
        { label: "Country", value: formatValue(profile.country) },
        { label: "Phone Number", value: formatValue(profile.phone) },
        { label: "Profile Link", value: profileUrl },
      ],
    },
  ];

  if (profile.star || profile.rasi || profile.dosham || profile.timeOfBirth || profile.placeOfBirth || profile.horoscopeImage) {
    sections.push({
      title: "Horoscope Details",
      rows: [
        { label: "Rasi / Moon Sign", value: formatValue(profile.rasi) },
        { label: "Nakshatra", value: formatValue(profile.star) },
        { label: "Dosham", value: formatValue(profile.dosham) },
        { label: "Time of Birth", value: formatValue(profile.timeOfBirth) },
        { label: "Place of Birth", value: formatValue(profile.placeOfBirth) },
        { label: "Horoscope Image", value: formatValue(profile.horoscopeImage) },
      ],
    });
  }

  const pdfBuffer = await buildProfilePdf({
    profileName: profile.fullName,
    ageLabel: String(age),
    subtitle: profile.profession || profile.education || "Matrimony Member",
    location: displayLocation,
    education: profile.course || profile.education || "Not added",
    phone: profile.phone || "Not added",
    quickFacts,
    profileUrl,
    downloadedAt: new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date()),
    photoUrl: photoUrls[0] ?? null,
    sections,
  });

  const filename = `${slugify(profile.fullName)}-profile.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
