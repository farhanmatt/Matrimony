export function getOtpRemainingSeconds(expiresAt: string | null | undefined) {
  if (!expiresAt) {
    return 0;
  }

  const expiryTime = new Date(expiresAt).getTime();

  if (!Number.isFinite(expiryTime)) {
    return 0;
  }

  return Math.max(0, Math.ceil((expiryTime - Date.now()) / 1000));
}

export function formatOtpRemainingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
