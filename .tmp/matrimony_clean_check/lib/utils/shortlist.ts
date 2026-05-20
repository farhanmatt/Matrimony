"use client";

export const SHORTLIST_STORAGE_KEY = "vivah-interest-shortlist";
export const SHORTLIST_UPDATED_EVENT = "vivah-shortlist-updated";

export function readShortlistedProfileIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const storedValue = window.localStorage.getItem(SHORTLIST_STORAGE_KEY);
    if (!storedValue) {
      return [] as string[];
    }

    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [] as string[];
  }
}

export function writeShortlistedProfileIds(profileIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    SHORTLIST_STORAGE_KEY,
    JSON.stringify(profileIds)
  );
  window.dispatchEvent(
    new CustomEvent(SHORTLIST_UPDATED_EVENT, {
      detail: { profileIds },
    })
  );
}

export function setShortlistedProfileId(
  profileId: string,
  shortlisted: boolean
) {
  const shortlistedIds = readShortlistedProfileIds();
  const nextShortlistedIds = shortlisted
    ? Array.from(new Set([...shortlistedIds, profileId]))
    : shortlistedIds.filter((savedProfileId) => savedProfileId !== profileId);

  writeShortlistedProfileIds(nextShortlistedIds);
  return nextShortlistedIds;
}
