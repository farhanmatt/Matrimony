export type ProfileCompletionPreference = {
  ageMin?: number | null;
  ageMax?: number | null;
  heightMin?: number | null;
  heightMax?: number | null;
  religion?: string | null;
  caste?: string | null;
  location?: string | null;
  language?: string | null;
  education?: string | null;
  profession?: string | null;
  maritalStatus?: string | null;
} | null;

export type ProfileCompletionSource = {
  fullName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | Date | null;
  maritalStatus?: string | null;
  height?: number | null;
  phone?: string | null;
  bio?: string | null;
  education?: string | null;
  course?: string | null;
  profession?: string | null;
  employedIn?: string | null;
  income?: string | null;
  religion?: string | null;
  caste?: string | null;
  subCaste?: string | null;
  language?: string | null;
  familyType?: string | null;
  familyStatus?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  siblings?: number | null;
  star?: string | null;
  rasi?: string | null;
  timeOfBirth?: string | null;
  placeOfBirth?: string | null;
  diet?: string | null;
  smoking?: string | null;
  drinking?: string | null;
  hobbies?: string | null;
  physicalActivity?: string | null;
  personalityType?: string | null;
  horoscopeImage?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  profileImage?: string | null;
  photos?: Array<{ url?: string | null; isPrimary?: boolean | null }> | null;
  additionalPhotoUrls?: string[] | null;
  preference?: ProfileCompletionPreference;
};

export type ProfileCompletionItem = {
  label: string;
  complete: boolean;
  href: string;
  progress: number;
};

export type ProfileCompletionResult = {
  items: ProfileCompletionItem[];
  percent: number;
  completedCount: number;
  nextStepHref: string;
  hasAnyProgress: boolean;
};

type CompletionSection = {
  label: string;
  href: string;
  progressChecks: Array<(profile: ProfileCompletionSource | null) => boolean>;
  isComplete: (profile: ProfileCompletionSource | null) => boolean;
};

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasValue(item));
  }

  return true;
}

function getFilledCount(
  profile: ProfileCompletionSource | null,
  checks: CompletionSection["progressChecks"]
) {
  return checks.reduce((count, check) => count + (check(profile) ? 1 : 0), 0);
}

export function getProfileCompletion(
  profile: ProfileCompletionSource | null,
  options?: { hasPersistedProfile?: boolean }
): ProfileCompletionResult {
  const hasPersistedProfile = options?.hasPersistedProfile ?? Boolean(profile);
  const hasPreference = Boolean(
    profile?.preference &&
      [
        profile.preference.ageMin,
        profile.preference.ageMax,
        profile.preference.heightMin,
        profile.preference.heightMax,
        profile.preference.religion,
        profile.preference.caste,
        profile.preference.location,
        profile.preference.language,
        profile.preference.education,
        profile.preference.profession,
        profile.preference.maritalStatus,
      ].some((value) => hasValue(value))
  );

  const sections: CompletionSection[] = [
    {
      label: "Basic Information",
      href: "/dashboard/profile/edit",
      progressChecks: [
        (source) => hasValue(source?.fullName),
        (source) => hasValue(source?.gender),
        (source) => hasValue(source?.dateOfBirth),
        (source) => hasValue(source?.maritalStatus),
        (source) => hasValue(source?.height),
        (source) => hasValue(source?.phone),
        (source) => hasValue(source?.state),
        (source) => hasValue(source?.city),
        (source) => hasValue(source?.pincode),
      ],
      isComplete: (source) =>
        Boolean(
          source?.fullName &&
            source.gender &&
            source.dateOfBirth &&
            source.maritalStatus
        ),
    },
    {
      label: "About Yourself",
      href: "/dashboard/profile/edit",
      progressChecks: [
        (source) => hasValue(source?.bio),
        (source) => hasValue(source?.education),
        (source) => hasValue(source?.course),
        (source) => hasValue(source?.profession),
        (source) => hasValue(source?.employedIn),
        (source) => hasValue(source?.income),
      ],
      isComplete: (source) =>
        Boolean(
          hasValue(source?.bio) ||
            hasValue(source?.profession) ||
            hasValue(source?.education)
        ),
    },
    {
      label: "Partner Preferences",
      href: "/dashboard/preferences",
      progressChecks: [
        (source) => hasValue(source?.preference?.ageMin),
        (source) => hasValue(source?.preference?.ageMax),
        (source) => hasValue(source?.preference?.heightMin),
        (source) => hasValue(source?.preference?.heightMax),
        (source) => hasValue(source?.preference?.religion),
        (source) => hasValue(source?.preference?.caste),
        (source) => hasValue(source?.preference?.education),
        (source) => hasValue(source?.preference?.profession),
        (source) => hasValue(source?.preference?.location),
        (source) => hasValue(source?.preference?.maritalStatus),
        (source) => hasValue(source?.preference?.language),
      ],
      isComplete: () => hasPreference,
    },
    {
      label: "Photos",
      href: "/dashboard/profile/edit",
      progressChecks: [
        (source) => hasValue(source?.profileImage),
        (source) => hasValue(source?.photos),
        (source) => hasValue(source?.additionalPhotoUrls),
      ],
      isComplete: (source) =>
        Boolean(
          hasValue(source?.profileImage) ||
            hasValue(source?.photos) ||
            hasValue(source?.additionalPhotoUrls)
        ),
    },
    {
      label: "Add More Details",
      href: "/dashboard/profile/edit",
      progressChecks: [
        (source) => hasValue(source?.religion),
        (source) => hasValue(source?.caste),
        (source) => hasValue(source?.subCaste),
        (source) => hasValue(source?.language),
        (source) => hasValue(source?.familyType),
        (source) => hasValue(source?.familyStatus),
        (source) => hasValue(source?.fatherName),
        (source) => hasValue(source?.motherName),
        (source) => hasValue(source?.siblings),
        (source) => hasValue(source?.star),
        (source) => hasValue(source?.rasi),
        (source) => hasValue(source?.timeOfBirth),
        (source) => hasValue(source?.placeOfBirth),
        (source) => hasValue(source?.diet),
        (source) => hasValue(source?.smoking),
        (source) => hasValue(source?.drinking),
        (source) => hasValue(source?.hobbies),
        (source) => hasValue(source?.physicalActivity),
        (source) => hasValue(source?.personalityType),
        (source) => hasValue(source?.horoscopeImage),
      ],
      isComplete: (source) =>
        Boolean(
          hasValue(source?.religion) ||
            hasValue(source?.language) ||
            hasValue(source?.familyType) ||
            hasValue(source?.familyStatus) ||
            hasValue(source?.fatherName) ||
            hasValue(source?.motherName) ||
            hasValue(source?.siblings) ||
            hasValue(source?.star) ||
            hasValue(source?.rasi) ||
            hasValue(source?.timeOfBirth) ||
            hasValue(source?.placeOfBirth) ||
            hasValue(source?.diet) ||
            hasValue(source?.smoking) ||
            hasValue(source?.drinking) ||
            hasValue(source?.hobbies) ||
            hasValue(source?.physicalActivity) ||
            hasValue(source?.personalityType) ||
            hasValue(source?.horoscopeImage)
        ),
    },
  ];

  const items = sections.map((section) => {
    const complete = section.isComplete(profile);
    const partialProgress = getFilledCount(profile, section.progressChecks) / section.progressChecks.length;

    return {
      label: section.label,
      complete,
      href: section.href,
      progress: complete ? 1 : partialProgress,
    };
  });

  const completedCount = items.filter((item) => item.complete).length;
  const percent = Math.round(
    (items.reduce((total, item) => total + item.progress, 0) / items.length) * 100
  );
  const nextIncompleteItem = items.find((item) => !item.complete);

  return {
    items,
    percent,
    completedCount,
    nextStepHref: hasPersistedProfile
      ? nextIncompleteItem?.href ?? "/dashboard/profile/edit"
      : "/dashboard/profile/create",
    hasAnyProgress: items.some((item) => item.progress > 0),
  };
}
