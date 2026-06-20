import { ProfileFormInput } from "@/lib/validations/profile";

export type CreateProfileDraft = {
  currentStep: number;
  maxStepReached: number;
  values: Partial<ProfileFormInput>;
};

const BASE_STORAGE_KEY = "vivah-bandhan-create-profile-draft";

function getScopedKey(userId: string | null | undefined) {
  if (!userId) return BASE_STORAGE_KEY;
  return `${BASE_STORAGE_KEY}:${userId}`;
}

/**
 * Saves the current profile creation draft to localStorage, scoped by user ID.
 * This ensures that different users on the same browser do not see each other's drafts.
 */
export function saveCreateProfileDraft(userId: string | null | undefined, draft: CreateProfileDraft) {
  if (typeof window === "undefined" || !userId) return;

  window.localStorage.setItem(
    getScopedKey(userId),
    JSON.stringify(draft)
  );
}

/**
 * Loads the profile creation draft from localStorage for a specific user.
 */
export function loadCreateProfileDraft(userId: string | null | undefined): CreateProfileDraft | null {
  if (typeof window === "undefined" || !userId) return null;

  try {
    const rawDraft = window.localStorage.getItem(getScopedKey(userId));
    if (!rawDraft) return null;
    return JSON.parse(rawDraft) as CreateProfileDraft;
  } catch {
    return null;
  }
}

/**
 * Clears the profile creation draft from localStorage for a specific user.
 */
export function clearCreateProfileDraft(userId: string | null | undefined) {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.removeItem(getScopedKey(userId));
}
