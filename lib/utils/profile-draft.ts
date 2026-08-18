import { ProfileFormInput } from "@/lib/validations/profile";

export type CreateProfileDraft = {
  currentStep: number;
  maxStepReached: number;
  values: Partial<ProfileFormInput>;
  updatedAt?: number;
};

const BASE_STORAGE_KEY = "vivah-bandhan-create-profile-draft";

function getScopedKey(userId: string | null | undefined) {
  if (!userId) return BASE_STORAGE_KEY;
  return `${BASE_STORAGE_KEY}:${userId}`;
}

let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Saves the current profile creation draft to localStorage, scoped by user ID.
 * Also synchronizes it to the server so it can be resumed on other devices.
 */
export function saveCreateProfileDraft(userId: string | null | undefined, draft: Omit<CreateProfileDraft, "updatedAt">, immediate = false) {
  if (typeof window === "undefined" || !userId) return;

  const fullDraft = { ...draft, updatedAt: Date.now() };

  // Save to localStorage immediately
  window.localStorage.setItem(getScopedKey(userId), JSON.stringify(fullDraft));

  // Debounced sync to server
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  if (immediate) {
    fetch("/api/profile/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: fullDraft }),
      keepalive: true,
    }).catch(console.error);
  } else {
    syncTimeout = setTimeout(() => {
      fetch("/api/profile/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: fullDraft }),
        keepalive: true,
      }).catch(console.error);
    }, 1000);
  }
}

/**
 * Loads the profile creation draft from localStorage or server for a specific user.
 */
export async function loadCreateProfileDraft(userId: string | null | undefined): Promise<CreateProfileDraft | null> {
  if (typeof window === "undefined" || !userId) return null;

  try {
    // Fetch from server first to support cross-device resume
    const res = await fetch("/api/profile/draft");
    if (res.ok) {
      const data = await res.json();
      if (data.draft) {
        // Sync the server draft to local storage
        window.localStorage.setItem(getScopedKey(userId), JSON.stringify(data.draft));
        return data.draft as CreateProfileDraft;
      }
    }
    
    // Fallback to local storage if server fails or returns null
    const rawDraft = window.localStorage.getItem(getScopedKey(userId));
    if (!rawDraft) return null;
    return JSON.parse(rawDraft) as CreateProfileDraft;
  } catch {
    const rawDraft = window.localStorage.getItem(getScopedKey(userId));
    if (!rawDraft) return null;
    return JSON.parse(rawDraft) as CreateProfileDraft;
  }
}

/**
 * Clears the profile creation draft from localStorage and server for a specific user.
 */
export async function clearCreateProfileDraft(userId: string | null | undefined) {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.removeItem(getScopedKey(userId));
  
  try {
    await fetch("/api/profile/draft", { method: "DELETE" });
  } catch (e) {
    console.error(e);
  }
}
