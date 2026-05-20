"use client";

export const SHORTLIST_STORAGE_KEY = "vivah-interest-shortlist";
export const SHORTLIST_UPDATED_EVENT = "vivah-shortlist-updated";

function getShortlistStorageKey(userId?: string | null) {
  const normalizedUserId = userId?.trim();
  return normalizedUserId
    ? `${SHORTLIST_STORAGE_KEY}:${normalizedUserId}`
    : SHORTLIST_STORAGE_KEY;
}

export function readShortlistedProfileIds(userId?: string | null) {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const normalizedUserId = userId?.trim();
    if (!normalizedUserId) {
      return [] as string[];
    }

    const storedValue = window.localStorage.getItem(
      getShortlistStorageKey(normalizedUserId)
    );
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

export function writeShortlistedProfileIds(
  profileIds: string[],
  userId?: string | null
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    return;
  }

  window.localStorage.setItem(
    getShortlistStorageKey(normalizedUserId),
    JSON.stringify(profileIds)
  );
  window.dispatchEvent(
    new CustomEvent(SHORTLIST_UPDATED_EVENT, {
      detail: { profileIds, userId: normalizedUserId },
    })
  );
}

export function setShortlistedProfileId(
  profileId: string,
  shortlisted: boolean,
  userId?: string | null
) {
  const shortlistedIds = readShortlistedProfileIds(userId);
  const nextShortlistedIds = shortlisted
    ? Array.from(new Set([...shortlistedIds, profileId]))
    : shortlistedIds.filter((savedProfileId) => savedProfileId !== profileId);

  writeShortlistedProfileIds(nextShortlistedIds, userId);
  return nextShortlistedIds;
}
