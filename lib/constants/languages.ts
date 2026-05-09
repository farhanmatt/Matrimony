export const MOTHER_TONGUE_OPTIONS = [
  { value: "Tamil", label: "Tamil" },
  { value: "Hindi", label: "Hindi" },
  { value: "English", label: "English (official for communication)" },
  { value: "Telugu", label: "Telugu" },
  { value: "Kannada", label: "Kannada" },
  { value: "Malayalam", label: "Malayalam" },
  { value: "Bengali", label: "Bengali" },
  { value: "Marathi", label: "Marathi" },
  { value: "Gujarati", label: "Gujarati" },
  { value: "Punjabi", label: "Punjabi" },
  { value: "Odia", label: "Odia" },
  { value: "Assamese", label: "Assamese" },
  { value: "Urdu", label: "Urdu" },
  { value: "Sanskrit", label: "Sanskrit" },
  { value: "Konkani", label: "Konkani" },
  { value: "Manipuri (Meitei)", label: "Manipuri (Meitei)" },
  { value: "Nepali", label: "Nepali" },
  { value: "Bodo", label: "Bodo" },
  { value: "Santhali", label: "Santhali" },
  { value: "Maithili", label: "Maithili" },
  { value: "Dogri", label: "Dogri" },
  { value: "Sindhi", label: "Sindhi" },
] as const;

const MOTHER_TONGUE_ALIAS_MAP: Record<string, string> = {
  english: "English",
  manipuri: "Manipuri (Meitei)",
  meitei: "Manipuri (Meitei)",
  oriya: "Odia",
};

export function normalizeMotherTongue(value?: string | null) {
  if (!value) return value ?? undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const normalizedValue = trimmed.toLowerCase();

  const directMatch = MOTHER_TONGUE_OPTIONS.find(
    (option) =>
      option.value.toLowerCase() === normalizedValue ||
      option.label.toLowerCase() === normalizedValue
  );

  if (directMatch) {
    return directMatch.value;
  }

  return MOTHER_TONGUE_ALIAS_MAP[normalizedValue] ?? trimmed;
}
