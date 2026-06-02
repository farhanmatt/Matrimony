import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/profile/ProfileForm";
import { normalizeMotherTongue } from "@/lib/constants/languages";
import type { ProfileInput } from "@/lib/validations/profile";
import { format } from "date-fns";

export const metadata: Metadata = { title: "Edit Profile" };

export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { photos: true },
  });

  if (!profile) redirect("/dashboard/profile/create");

  const profileData = profile as typeof profile & {
    phone?: string | null;
    course?: string | null;
    employedIn?: string | null;
    timeOfBirth?: string | null;
    placeOfBirth?: string | null;
    hobbies?: string | null;
    physicalActivity?: string | null;
    personalityType?: string | null;
  };

  // Map Prisma model to form shape
  const defaultValues: Partial<ProfileInput> = {
    fullName: profile.fullName,
    gender: profile.gender as ProfileInput["gender"],
    dateOfBirth: format(new Date(profile.dateOfBirth), "yyyy-MM-dd"),
    height: profile.height ?? undefined,
    maritalStatus: profile.maritalStatus as ProfileInput["maritalStatus"],
    phone: profileData.phone ?? undefined,
    education: profile.education ?? undefined,
    course: profileData.course ?? undefined,
    profession: profile.profession ?? undefined,
    employedIn: profileData.employedIn ?? undefined,
    income: profile.income ?? undefined,
    houseNumber: profile.houseNumber ?? undefined,
    streetName: profile.streetName ?? undefined,
    city: profile.city ?? undefined,
    state: profile.state ?? undefined,
    pincode: profile.pincode ?? undefined,
    country: profile.country,
    bio: profile.bio ?? undefined,
    fatherName: profile.fatherName ?? undefined,
    motherName: profile.motherName ?? undefined,
    familyType: (profile.familyType as ProfileInput["familyType"]) ?? undefined,
    familyStatus: (profile.familyStatus as ProfileInput["familyStatus"]) ?? undefined,
    siblings: profile.siblings ?? undefined,
    religion: profile.religion ?? undefined,
    caste: profile.caste ?? undefined,
    subCaste: profile.subCaste ?? undefined,
    language: normalizeMotherTongue(profile.language),
    star: profile.star ?? undefined,
    rasi: profile.rasi ?? undefined,
    timeOfBirth: profileData.timeOfBirth ?? undefined,
    placeOfBirth: profileData.placeOfBirth ?? undefined,
    diet: profile.diet ?? undefined,
    smoking: profile.smoking ?? undefined,
    drinking: profile.drinking ?? undefined,
    hobbies: profileData.hobbies ?? undefined,
    physicalActivity:
      profileData.physicalActivity ?? profile.exercise ?? undefined,
    personalityType: profileData.personalityType ?? undefined,
    profileImage:
      profile.profileImage ??
      profile.photos.find((photo) => photo.isPrimary)?.url ??
      undefined,
    additionalPhotoUrls: profile.photos
      .filter((photo) => !photo.isPrimary)
      .map((photo) => photo.url),
    horoscopeImage: profile.horoscopeImage ?? undefined,
  };

  return (
    <div>
      <h1
        className="ui-enter-up mb-2 text-2xl font-display font-bold text-gray-900"
        style={{ animationDelay: "40ms", animationFillMode: "forwards" }}
      >
        Edit Profile
      </h1>
      <p
        className="ui-enter-up mb-8 text-sm text-gray-500"
        style={{ animationDelay: "110ms", animationFillMode: "forwards" }}
      >
        Keep your profile updated to improve match accuracy.
      </p>
      <div
        className="ui-enter-scale ui-card-lift-soft rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
        style={{ animationDelay: "180ms", animationFillMode: "forwards" }}
      >
        <ProfileForm defaultValues={defaultValues} isEdit />
      </div>
    </div>
  );
}
