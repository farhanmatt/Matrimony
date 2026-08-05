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

export function getWatermarkedCloudinaryUrl(url: string, watermarkText = "FMLP Matrimony") {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  
  // Skip if it already has a text overlay to prevent double watermarking
  if (url.includes("l_text:")) {
    return url;
  }
  
  const encodedText = encodeURIComponent(watermarkText);
  // Add a white, semi-transparent text watermark to the bottom right corner
  const watermarkParams = `l_text:Arial_30_bold:${encodedText},co_white,o_50,g_south_east,x_20,y_20`;
  
  // Insert the parameters right after "/upload/"
  return url.replace("/upload/", `/upload/${watermarkParams}/`);
}

export function getPdfCloudinaryUrl(url: string | null | undefined) {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url || "";
  }
  
  // If the file was uploaded as raw, transformations are invalid.
  if (url.includes("/raw/upload/")) {
    return url.replace("/fl_attachment/", "/");
  }
  
  // For PDF files on Cloudinary free tier, direct PDF delivery is restricted (returns 401).
  // The official workaround is to deliver the PDF as an image (e.g. using f_auto).
  // We remove fl_attachment (if present) and insert f_auto,q_auto to render it securely in the browser.
  let safeUrl = url;
  if (safeUrl.includes("fl_attachment")) {
    safeUrl = safeUrl.replace("fl_attachment/", "").replace("/fl_attachment", "");
  }
  
  if (safeUrl.includes("/image/upload/") && !safeUrl.includes("f_auto")) {
    return safeUrl.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
  }
  
  return safeUrl;
}

export function getPdfPageUrl(url: string | null | undefined, pageNum: number) {
  const safeUrl = getPdfCloudinaryUrl(url);
  
  // Only apply page transformation if it's a Cloudinary image URL and has f_auto
  if (safeUrl.includes("/image/upload/f_auto,q_auto/")) {
     return safeUrl.replace("/image/upload/f_auto,q_auto/", `/image/upload/pg_${pageNum},f_auto,q_auto/`);
  }
  
  return safeUrl;
}
