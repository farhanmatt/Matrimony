export const BROWSE_FILTERS_STORAGE_KEY = "vivah-browse-filters";

export type BrowseFilterValues = {
  ageMin: string;
  ageMax: string;
  religion: string;
  caste: string;
  language: string;
  education: string;
  profession: string;
  location: string;
  heightMin: string;
  heightMax: string;
  maritalStatus: string;
};

export type BrowsePreferenceSource = {
  ageMin?: string | number | null;
  ageMax?: string | number | null;
  religion?: string | null;
  caste?: string | null;
  language?: string | null;
  education?: string | null;
  profession?: string | null;
  location?: string | null;
  heightMin?: string | number | null;
  heightMax?: string | number | null;
  maritalStatus?: string | null;
};

export const EMPTY_BROWSE_FILTERS: BrowseFilterValues = {
  ageMin: "",
  ageMax: "",
  religion: "",
  caste: "",
  language: "",
  education: "",
  profession: "",
  location: "",
  heightMin: "",
  heightMax: "",
  maritalStatus: "",
};

const ALLOWED_BROWSE_MARITAL_STATUSES = new Set([
  "NEVER_MARRIED",
  "DIVORCED",
  "WIDOWED",
  "AWAITING_DIVORCE",
]);

export function toBrowseFilterValue(
  value: string | number | null | undefined
) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  return String(value);
}

function normalizeBrowseMaritalStatus(
  value: string | number | null | undefined
) {
  const normalizedValue = toBrowseFilterValue(value);

  return ALLOWED_BROWSE_MARITAL_STATUSES.has(normalizedValue)
    ? normalizedValue
    : "";
}

export function normalizeBrowseFilters(
  value?: Partial<BrowseFilterValues> | null
): BrowseFilterValues {
  return {
    ageMin: value?.ageMin ?? "",
    ageMax: value?.ageMax ?? "",
    religion: value?.religion ?? "",
    caste: value?.caste ?? "",
    language: value?.language ?? "",
    education: value?.education ?? "",
    profession: value?.profession ?? "",
    location: value?.location ?? "",
    heightMin: value?.heightMin ?? "",
    heightMax: value?.heightMax ?? "",
    maritalStatus: normalizeBrowseMaritalStatus(value?.maritalStatus),
  };
}

export function mapPreferenceSourceToBrowseFilters(
  preference?: BrowsePreferenceSource | null
): BrowseFilterValues {
  if (!preference) {
    return { ...EMPTY_BROWSE_FILTERS };
  }

  return {
    ageMin: toBrowseFilterValue(preference.ageMin),
    ageMax: toBrowseFilterValue(preference.ageMax),
    religion: toBrowseFilterValue(preference.religion),
    caste: toBrowseFilterValue(preference.caste),
    language: toBrowseFilterValue(preference.language),
    education: toBrowseFilterValue(preference.education),
    profession: toBrowseFilterValue(preference.profession),
    location: toBrowseFilterValue(preference.location),
    heightMin: toBrowseFilterValue(preference.heightMin),
    heightMax: toBrowseFilterValue(preference.heightMax),
    maritalStatus: normalizeBrowseMaritalStatus(preference.maritalStatus),
  };
}

export function readStoredBrowseFilters() {
  if (typeof window === "undefined") {
    return null as BrowseFilterValues | null;
  }

  try {
    const storedValue = window.localStorage.getItem(BROWSE_FILTERS_STORAGE_KEY);
    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue) as
      | Partial<BrowseFilterValues>
      | null;
    return normalizeBrowseFilters(parsedValue);
  } catch {
    return null;
  }
}

export function writeStoredBrowseFilters(
  filters: Partial<BrowseFilterValues> | null | undefined
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      BROWSE_FILTERS_STORAGE_KEY,
      JSON.stringify(normalizeBrowseFilters(filters))
    );
  } catch {
    // Ignore storage failures and keep the page usable.
  }
}
