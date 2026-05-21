const AUTH_REDIRECT_PATHS = new Set(["/login", "/register", "/admin/login"]);
const INTERNAL_BASE_URL = "https://auth.local";
const MAX_REDIRECT_DEPTH = 5;

function isHttpUrl(url: URL) {
  return url.protocol === "http:" || url.protocol === "https:";
}

function parseRedirectTarget(target: string) {
  try {
    const parsed = target.startsWith("/")
      ? new URL(target, INTERNAL_BASE_URL)
      : new URL(target);

    return isHttpUrl(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getDefaultRedirectForPath(pathname: string) {
  return pathname.startsWith("/admin") ? "/admin" : "/dashboard";
}

function toRelativeTarget(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function normalizeAuthRedirectTargetInternal(
  target: string | null | undefined,
  fallback: string,
  depth: number,
): string {
  if (!target || depth > MAX_REDIRECT_DEPTH) {
    return fallback;
  }

  const parsed = parseRedirectTarget(target.trim());

  if (!parsed) {
    return fallback;
  }

  if (!AUTH_REDIRECT_PATHS.has(parsed.pathname)) {
    return toRelativeTarget(parsed);
  }

  return normalizeAuthRedirectTargetInternal(
    parsed.searchParams.get("callbackUrl"),
    getDefaultRedirectForPath(parsed.pathname),
    depth + 1,
  );
}

export function normalizeAuthRedirectTarget(
  target: string | null | undefined,
  fallback = "/dashboard",
) {
  return normalizeAuthRedirectTargetInternal(target, fallback, 0);
}

export function resolveAuthRedirectUrl(url: string, baseUrl: string) {
  try {
    const candidate = url.startsWith("/") ? new URL(url, baseUrl) : new URL(url);
    const base = new URL(baseUrl);

    if (candidate.origin !== base.origin) {
      return baseUrl;
    }

    if (!AUTH_REDIRECT_PATHS.has(candidate.pathname)) {
      return candidate.toString();
    }

    const fallback = getDefaultRedirectForPath(candidate.pathname);
    const normalizedTarget = normalizeAuthRedirectTarget(
      candidate.searchParams.get("callbackUrl"),
      fallback,
    );

    return new URL(normalizedTarget, base).toString();
  } catch {
    return baseUrl;
  }
}
