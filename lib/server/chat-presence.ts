const CHAT_PRESENCE_WINDOW_MS = 45_000;
const CHAT_PRESENCE_STALE_MS = CHAT_PRESENCE_WINDOW_MS * 6;

const activeChatProfiles = new Map<string, number>();

function pruneExpiredPresence(nowMs: number) {
  for (const [profileId, lastActiveAtMs] of activeChatProfiles.entries()) {
    if (nowMs - lastActiveAtMs > CHAT_PRESENCE_STALE_MS) {
      activeChatProfiles.delete(profileId);
    }
  }
}

export function markChatProfileActive(profileId: string, at = new Date()) {
  const timestampMs = at.getTime();
  pruneExpiredPresence(timestampMs);
  activeChatProfiles.set(profileId, timestampMs);

  return {
    isOnline: true,
    lastActiveAt: at.toISOString(),
  };
}

export function getChatProfilePresence(profileId: string, now = new Date()) {
  const nowMs = now.getTime();
  pruneExpiredPresence(nowMs);

  const lastActiveAtMs = activeChatProfiles.get(profileId) ?? null;
  const isOnline =
    lastActiveAtMs !== null && nowMs - lastActiveAtMs <= CHAT_PRESENCE_WINDOW_MS;

  return {
    isOnline,
    lastActiveAt:
      lastActiveAtMs !== null ? new Date(lastActiveAtMs).toISOString() : null,
  };
}

