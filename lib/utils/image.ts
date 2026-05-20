export const ALLOWED_IMAGE_HOSTS = new Set([
  "res.cloudinary.com",
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
]);

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
