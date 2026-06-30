"use client";

export const SHORTLIST_STORAGE_KEY = "vivah-interest-shortlist";
export const SHORTLIST_METADATA_STORAGE_KEY = "vivah-interest-shortlist-meta";
export const SHORTLIST_UPDATED_EVENT = "vivah-shortlist-updated";

export type ShortlistProfileSource = "interest" | "message";

export type ShortlistProfileMetadata = {
  savedAt: string;
  source: ShortlistProfileSource;
};

export type ShortlistProfileMetadataMap = Record<
  string,
  ShortlistProfileMetadata
>;

function getShortlistStorageKey(userId?: string | null) {
  const normalizedUserId = userId?.trim();
  return normalizedUserId
    ? `${SHORTLIST_STORAGE_KEY}:${normalizedUserId}`
    : SHORTLIST_STORAGE_KEY;
}

function getShortlistMetadataStorageKey(userId?: string | null) {
  const normalizedUserId = userId?.trim();
  return normalizedUserId
    ? `${SHORTLIST_METADATA_STORAGE_KEY}:${normalizedUserId}`
    : SHORTLIST_METADATA_STORAGE_KEY;
}

function normalizeProfileIds(profileIds: string[]) {
  return Array.from(
    new Set(
      profileIds
        .map((profileId) => profileId.trim())
        .filter((profileId) => profileId.length > 0)
    )
  );
}

function normalizeMetadataEntry(
  value: unknown
): ShortlistProfileMetadata | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const savedAt =
    typeof (value as { savedAt?: unknown }).savedAt === "string"
      ? (value as { savedAt: string }).savedAt.trim()
      : "";
  const source = (value as { source?: unknown }).source;
  const normalizedSource: ShortlistProfileSource =
    source === "message" ? "message" : "interest";

  if (!savedAt) {
    return null;
  }

  return {
    savedAt,
    source: normalizedSource,
  };
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

export function readShortlistedProfileMetadata(userId?: string | null) {
  if (typeof window === "undefined") {
    return {} as ShortlistProfileMetadataMap;
  }

  try {
    const normalizedUserId = userId?.trim();
    if (!normalizedUserId) {
      return {} as ShortlistProfileMetadataMap;
    }

    const storedValue = window.localStorage.getItem(
      getShortlistMetadataStorageKey(normalizedUserId)
    );
    if (!storedValue) {
      return {} as ShortlistProfileMetadataMap;
    }

    const parsedValue = JSON.parse(storedValue);
    if (!parsedValue || typeof parsedValue !== "object") {
      return {} as ShortlistProfileMetadataMap;
    }

    return Object.entries(parsedValue).reduce<ShortlistProfileMetadataMap>(
      (accumulator, [profileId, value]) => {
        const normalizedProfileId = profileId.trim();
        const normalizedEntry = normalizeMetadataEntry(value);

        if (normalizedProfileId && normalizedEntry) {
          accumulator[normalizedProfileId] = normalizedEntry;
        }

        return accumulator;
      },
      {}
    );
  } catch {
    return {} as ShortlistProfileMetadataMap;
  }
}

function buildShortlistMetadata(
  profileIds: string[],
  currentMetadata: ShortlistProfileMetadataMap,
  overrides: Partial<Record<string, ShortlistProfileMetadata>> = {}
) {
  const timestamp = new Date().toISOString();

  return profileIds.reduce<ShortlistProfileMetadataMap>((accumulator, profileId) => {
    const override = overrides[profileId];

    accumulator[profileId] =
      override ??
      currentMetadata[profileId] ?? {
        savedAt: timestamp,
        source: "interest",
      };

    return accumulator;
  }, {});
}

function persistShortlistState(
  profileIds: string[],
  metadata: ShortlistProfileMetadataMap,
  userId?: string | null
) {
  const normalizedUserId = userId?.trim();
  if (typeof window === "undefined" || !normalizedUserId) {
    return;
  }

  try {
    window.localStorage.setItem(
      getShortlistStorageKey(normalizedUserId),
      JSON.stringify(profileIds)
    );
    window.localStorage.setItem(
      getShortlistMetadataStorageKey(normalizedUserId),
      JSON.stringify(metadata)
    );
    window.dispatchEvent(
      new CustomEvent(SHORTLIST_UPDATED_EVENT, {
        detail: { profileIds, userId: normalizedUserId, metadata },
      })
    );
  } catch {
    // Ignore storage failures and keep the shortlist UI usable.
  }
}

export function writeShortlistedProfileIds(
  profileIds: string[],
  userId?: string | null
) {
  const normalizedUserId = userId?.trim();
  if (typeof window === "undefined" || !normalizedUserId) {
    return;
  }

  const normalizedProfileIds = normalizeProfileIds(profileIds);
  const currentMetadata = readShortlistedProfileMetadata(normalizedUserId);
  const nextMetadata = buildShortlistMetadata(
    normalizedProfileIds,
    currentMetadata
  );

  persistShortlistState(normalizedProfileIds, nextMetadata, normalizedUserId);
}

export function clearShortlistedProfileIds(userId?: string | null) {
  const normalizedUserId = userId?.trim();
  if (typeof window === "undefined" || !normalizedUserId) {
    return;
  }

  try {
    window.localStorage.removeItem(getShortlistStorageKey(normalizedUserId));
    window.localStorage.removeItem(getShortlistMetadataStorageKey(normalizedUserId));
    window.dispatchEvent(
      new CustomEvent(SHORTLIST_UPDATED_EVENT, {
        detail: { profileIds: [], userId: normalizedUserId, metadata: {} },
      })
    );
  } catch {
    // Ignore storage failures
  }
}

export function setShortlistedProfileId(
  profileId: string,
  shortlisted: boolean,
  userId?: string | null,
  metadata?: Partial<ShortlistProfileMetadata>
) {
  const normalizedProfileId = profileId.trim();
  if (!normalizedProfileId) {
    return readShortlistedProfileIds(userId);
  }

  const shortlistedIds = readShortlistedProfileIds(userId);
  const shortlistedMetadata = readShortlistedProfileMetadata(userId);
  const nextShortlistedIds = shortlisted
    ? normalizeProfileIds([...shortlistedIds, normalizedProfileId])
    : shortlistedIds.filter(
        (savedProfileId) => savedProfileId !== normalizedProfileId
      );

  const nextMetadata = buildShortlistMetadata(
    nextShortlistedIds,
    shortlistedMetadata,
    shortlisted
      ? {
          [normalizedProfileId]: {
            savedAt:
              metadata?.savedAt ??
              shortlistedMetadata[normalizedProfileId]?.savedAt ??
              new Date().toISOString(),
            source:
              metadata?.source ??
              shortlistedMetadata[normalizedProfileId]?.source ??
              "interest",
          },
        }
      : {}
  );

  persistShortlistState(nextShortlistedIds, nextMetadata, userId);
  return nextShortlistedIds;
}
