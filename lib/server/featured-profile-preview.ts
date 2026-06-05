import "server-only";

import crypto from "crypto";
import { Gender } from "@prisma/client";
import { calculateAge } from "@/lib/utils/helpers";

const FEATURED_PROFILE_PREVIEW_ROUTE = "/api/public/featured-profile-preview";
const FEATURED_PROFILE_NAME_ROUTE = "/api/public/featured-profile-name";

type FeaturedProfilePreviewPayload = {
  profileId: string;
  fingerprint: string;
};

type FeaturedProfilePreviewSource = {
  profileImage: string | null;
  photos: Array<{
    url: string;
    publicId: string;
  }>;
};

export type PublicLandingFeaturedProfile = {
  cardKey: string;
  nameLabelUrl: string | null;
  location: string;
  previewImageUrl: string | null;
};

function getFeaturedProfilePreviewSecret() {
  const configuredSecret =
    process.env.FEATURED_PROFILE_PREVIEW_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "featured-profile-preview-dev-secret";
  }

  return null;
}

function signFeaturedProfilePreviewPayload(encodedPayload: string) {
  const secret = getFeaturedProfilePreviewSecret();

  if (!secret) {
    return null;
  }

  return crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

function encodeFeaturedProfilePreviewPayload(
  payload: FeaturedProfilePreviewPayload
) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeFeaturedProfilePreviewPayload(encodedPayload: string) {
  try {
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<FeaturedProfilePreviewPayload>;

    if (
      typeof decoded.profileId !== "string" ||
      !decoded.profileId.trim() ||
      typeof decoded.fingerprint !== "string" ||
      !decoded.fingerprint.trim()
    ) {
      return null;
    }

    return {
      profileId: decoded.profileId.trim(),
      fingerprint: decoded.fingerprint.trim(),
    } satisfies FeaturedProfilePreviewPayload;
  } catch {
    return null;
  }
}

export function createFeaturedProfilePreviewToken(
  payload: FeaturedProfilePreviewPayload
) {
  const encodedPayload = encodeFeaturedProfilePreviewPayload(payload);
  const signature = signFeaturedProfilePreviewPayload(encodedPayload);

  if (!signature) {
    return null;
  }

  return `${encodedPayload}.${signature}`;
}

export function verifyFeaturedProfilePreviewToken(token: string) {
  const [encodedPayload, providedSignature, ...rest] = token.split(".");

  if (!encodedPayload || !providedSignature || rest.length > 0) {
    return null;
  }

  const expectedSignature = signFeaturedProfilePreviewPayload(encodedPayload);

  if (!expectedSignature) {
    return null;
  }

  const providedSignatureBuffer = Buffer.from(providedSignature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    providedSignatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(
      providedSignatureBuffer,
      expectedSignatureBuffer
    )
  ) {
    return null;
  }

  return decodeFeaturedProfilePreviewPayload(encodedPayload);
}

export function getFeaturedProfilePreviewSource(
  profile: FeaturedProfilePreviewSource
) {
  const primaryPhoto = profile.photos[0];
  const previewUrl = primaryPhoto?.url?.trim() || profile.profileImage?.trim() || null;
  const fingerprint = primaryPhoto?.publicId?.trim() || previewUrl || null;

  return {
    previewUrl,
    fingerprint,
  };
}

function maskFirstName(fullName: string) {
  const firstName = fullName.trim().split(/\s+/)[0] ?? "";

  if (firstName.length <= 1) {
    return firstName;
  }

  if (firstName.length === 2) {
    return `${firstName[0]}*`;
  }

  return `${firstName[0]}${"*".repeat(
    Math.max(2, firstName.length - 2)
  )}${firstName[firstName.length - 1]}`;
}

export function getFeaturedProfileMaskedNameLabel(profile: {
  fullName: string;
  dateOfBirth: Date;
  gender?: Gender;
}) {
  const maskedName = maskFirstName(profile.fullName);
  const age = calculateAge(profile.dateOfBirth);

  if (maskedName && Number.isFinite(age) && age >= 18) {
    return `${maskedName}, ${age}`;
  }

  if (maskedName) {
    return maskedName;
  }

  if (profile.gender === "FEMALE") {
    return "Verified Bride";
  }

  if (profile.gender === "MALE") {
    return "Verified Groom";
  }

  return "Verified Member";
}

function getPublicFeaturedProfileLocation(
  state: string | null,
  country: string | null
) {
  const normalizedState = state?.trim();
  if (normalizedState) {
    return normalizedState;
  }

  const normalizedCountry = country?.trim();
  if (normalizedCountry) {
    return normalizedCountry;
  }

  return "India";
}

export function getFeaturedProfilePreviewUrl(token: string) {
  return `${FEATURED_PROFILE_PREVIEW_ROUTE}/${encodeURIComponent(token)}`;
}

export function getFeaturedProfileNameLabelUrl(token: string) {
  return `${FEATURED_PROFILE_NAME_ROUTE}/${encodeURIComponent(token)}`;
}

export function toPublicLandingFeaturedProfile(profile: {
  id: string;
  state: string | null;
  country: string | null;
  profileImage: string | null;
  photos: Array<{
    url: string;
    publicId: string;
  }>;
}): PublicLandingFeaturedProfile {
  const previewSource = getFeaturedProfilePreviewSource(profile);
  const previewToken =
    previewSource.previewUrl && previewSource.fingerprint
      ? createFeaturedProfilePreviewToken({
          profileId: profile.id,
          fingerprint: previewSource.fingerprint,
        })
      : null;

  return {
    cardKey: previewToken ?? profile.id,
    nameLabelUrl: previewToken
      ? getFeaturedProfileNameLabelUrl(previewToken)
      : null,
    location: getPublicFeaturedProfileLocation(profile.state, profile.country),
    previewImageUrl: previewToken
      ? getFeaturedProfilePreviewUrl(previewToken)
      : null,
  };
}
