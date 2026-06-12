export const ALLOWED_IMAGE_HOSTS = new Set([
  "res.cloudinary.com",
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
]);

export const DEFAULT_IMAGE_UPLOAD_MAX_BYTES = 500 * 1024;
export const DEFAULT_IMAGE_UPLOAD_SIZE_ERROR_MESSAGE =
  "Image size must be 500 KB or less.";

export function resolveAllowedImageSrc(value: string, fallback: string | null = null) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("data:image/")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (ALLOWED_IMAGE_HOSTS.has(url.hostname)) {
      return trimmed;
    }
  } catch {
    // Keep the provided fallback when the URL is invalid or unsupported.
  }

  return fallback;
}

export function isAllowedImageFile(file: File) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"].includes(file.type);
}

export function isSvgImageSrc(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith("data:image/svg+xml") || trimmed.endsWith(".svg");
}

export function getCloudinaryUploadResultInfo(result: unknown) {
  const info =
    typeof result === "object" &&
    result &&
    "info" in result &&
    typeof result.info === "object" &&
    result.info
      ? (result.info as Record<string, unknown>)
      : null;

  return {
    secureUrl: typeof info?.secure_url === "string" ? info.secure_url : null,
    bytes: typeof info?.bytes === "number" ? info.bytes : null,
  };
}

export function isImageUploadWithinSizeLimit(
  bytes: number | null | undefined,
  maxFileSizeBytes = DEFAULT_IMAGE_UPLOAD_MAX_BYTES
) {
  return typeof bytes !== "number" || bytes <= maxFileSizeBytes;
}

export function getImageUploadErrorMessage(
  error: unknown,
  maxSizeMessage = DEFAULT_IMAGE_UPLOAD_SIZE_ERROR_MESSAGE
) {
  const rawMessage =
    typeof error === "string"
      ? error
      : typeof error === "object" &&
          error &&
          "statusText" in error &&
          typeof error.statusText === "string"
        ? error.statusText
        : "";

  const normalizedMessage = rawMessage.trim().toLowerCase();

  if (
    normalizedMessage.includes("file size") ||
    normalizedMessage.includes("max file size") ||
    normalizedMessage.includes("maxfilesize") ||
    normalizedMessage.includes("max image file size") ||
    normalizedMessage.includes("maximagefilesize") ||
    normalizedMessage.includes("too large") ||
    normalizedMessage.includes("too big")
  ) {
    return maxSizeMessage;
  }

  return rawMessage.trim() || "Failed to upload image. Please try again.";
}
