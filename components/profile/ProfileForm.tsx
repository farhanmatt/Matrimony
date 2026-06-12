"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightCircle,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Copy,
  Globe2,
  ImagePlus,
  Leaf,
  Loader2,
  Save,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  DOSHAM_OPTIONS,
  NAKSHATRA_OPTIONS,
  RASI_OPTIONS,
} from "@/lib/constants/astrology";
import { MOTHER_TONGUE_OPTIONS } from "@/lib/constants/languages";
import {
  STATE_OPTIONS,
  findMatchingCityForState,
  findMatchingStateOption,
  getCitiesForState,
  getPincodeForCity,
} from "@/lib/constants/cityData";
import {
  getProfileAgeValidationMessage,
  profileFormSchema,
  type PreferenceInput,
  type ProfileFormInput,
  type ProfileInput,
} from "@/lib/validations/profile";
import ImageUpload from "@/components/common/ImageUpload";
import MultiImageUpload from "@/components/common/MultiImageUpload";
import {
  mapPreferenceSourceToBrowseFilters,
  writeStoredBrowseFilters,
} from "@/lib/utils/browse-filters";
import { MARITAL_STATUS_LABELS } from "@/lib/utils/helpers";

const genderOptions = ["MALE", "FEMALE", "OTHER"] as const;
const nationalityOptions = ["Indian", "NRI", "Expat"] as const;
const maritalOptions = [
  "NEVER_MARRIED",
  "DIVORCED",
  "WIDOWED",
  "SEPARATED",
  "AWAITING_DIVORCE",
] as const;
const familyTypeOptions = ["NUCLEAR", "JOINT", "EXTENDED"] as const;
const familyStatusOptions = [
  "MIDDLE_CLASS",
  "UPPER_MIDDLE_CLASS",
  "RICH",
  "AFFLUENT",
] as const;
const dietOptions = ["Vegetarian", "Non-Vegetarian", "Vegan", "Eggetarian"];
const smokingOptions = ["Never", "Occasionally", "Regularly"];
const drinkingOptions = ["Never", "Occasionally", "Regularly"];
const hobbiesOptions = [
  "Reading",
  "Traveling",
  "Music",
  "Movies",
  "Cooking",
  "Sports",
  "Fitness",
  "Dancing",
  "Photography",
  "Gaming",
  "Gardening",
  "Volunteering",
];
const physicalActivityOptions = [
  "Sedentary",
  "Lightly Active",
  "Moderately Active",
  "Active",
  "Very Active",
];
const personalityTypeOptions = [
  "Introvert",
  "Extrovert",
  "Ambivert",
  "Calm and Grounded",
  "Fun-Loving",
  "Adventurous",
  "Family-Oriented",
  "Spiritual",
];
const religions = [
  "Hindu",
  "Muslim",
  "Christian",
];
const partnerPreferenceReligionOptions = [
  "Hindu",
  "Muslim",
  "Christian",
  "Sikh",
  "Jain",
  "Buddhist",
  "Parsi",
  "Other",
];
const casteSuggestions = ["No Caste"];
const higherEducationOptions = [
  "High School",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "M.Phil",
  "Doctorate / PhD",
  "Professional Degree",
  "Other",
];
const courseOptions = [
  "Computer Science",
  "Information Technology",
  "Engineering",
  "Medicine",
  "Management",
  "Commerce",
  "Arts",
  "Science",
  "Law",
  "Education",
  "Architecture",
  "Nursing",
  "Pharmacy",
  "Other",
];
const occupationOptions = [
  "Software Engineer",
  "Doctor",
  "Teacher",
  "Business Owner",
  "Government Employee",
  "Private Sector Employee",
  "Chartered Accountant",
  "Lawyer",
  "Consultant",
  "Designer",
  "Civil Services",
  "Student",
  "Other",
];
const employedInOptions = [
  "Private Company",
  "Government / Public Sector",
  "Business / Self Employed",
  "Defence",
  "Not Working",
  "Student",
  "Other",
];
const annualIncomeOptions = [
  "No Income",
  "Below 1 LPA",
  "1-2 LPA",
  "2-4 LPA",
  "4-6 LPA",
  "6-8 LPA",
  "8-10 LPA",
  "10-15 LPA",
  "15-20 LPA",
  "20-30 LPA",
  "30+ LPA",
];
const OTHER_ANNUAL_INCOME_OPTION = "__other_annual_income__";
const timeHourOptions = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, "0")
);
const timeMinuteOptions = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0")
);
const timePeriodOptions = ["AM", "PM"] as const;

const heightOptions = Array.from({ length: 37 }, (_, index) => {
  const totalInches = 48 + index;
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  const centimeters = Number((totalInches * 2.54).toFixed(2));

  return {
    value: centimeters,
    label: `${feet}'${inches}" (${centimeters.toFixed(2)} cm)`,
  };
});

const labelMap: Record<string, Record<string, string>> = {
  gender: { MALE: "Male", FEMALE: "Female", OTHER: "Other" },
  marital: {
    NEVER_MARRIED: "Never Married",
    DIVORCED: "Divorced",
    WIDOWED: "Widowed",
    SEPARATED: "Separated",
    AWAITING_DIVORCE: "Awaiting Divorce",
  },
  familyType: { NUCLEAR: "Nuclear", JOINT: "Joint", EXTENDED: "Extended" },
  familyStatus: {
    MIDDLE_CLASS: "Middle Class",
    UPPER_MIDDLE_CLASS: "Upper Middle Class",
    RICH: "Rich",
    AFFLUENT: "Affluent",
  },
};

type ProfileFieldName = keyof ProfileInput & string;
type TimePeriod = (typeof timePeriodOptions)[number];
type CreateStepId =
  | "personal"
  | "family"
  | "education"
  | "cultural"
  | "horoscope"
  | "lifestyle"
  | "photos";
type TimeOfBirthParts = {
  hour: string;
  minute: string;
  period: TimePeriod | "";
};

type CreateStep = {
  id: CreateStepId;
  title: string;
  description: string;
  sidebarDescription: string;
  panelDescription: string;
  icon: LucideIcon;
  fields: ProfileFieldName[];
};

const createProfileSteps: CreateStep[] = [
  {
    id: "personal",
    title: "Personal Information",
    description:
      "Add your basic details and address information to start your profile.",
    sidebarDescription: "Let's start with the basics",
    panelDescription: "Tell us about yourself",
    icon: User,
    fields: [
      "fullName",
      "gender",
      "dateOfBirth",
      "height",
      "nationality",
      "maritalStatus",
      "phone",
      "bio",
      "houseNumber",
      "streetName",
      "state",
      "city",
      "pincode",
    ],
  },
  {
    id: "family",
    title: "Family Information",
    description:
      "Add your parents and family background details for a more complete profile.",
    sidebarDescription: "Tell us about your family",
    panelDescription: "Share your family background",
    icon: Users,
    fields: [
      "fatherName",
      "motherName",
      "familyType",
      "familyStatus",
      "siblings",
    ],
  },
  {
    id: "education",
    title: "Education & Career Information",
    description:
      "Tell matches about your education, occupation, workplace, and income details.",
    sidebarDescription: "Your education and profession",
    panelDescription: "Highlight your education and career",
    icon: Briefcase,
    fields: ["education", "course", "profession", "employedIn", "income"],
  },
  {
    id: "cultural",
    title: "Cultural Background",
    description:
      "Share your religion, mother tongue, caste, and sub caste details here.",
    sidebarDescription: "Your caste, community & more",
    panelDescription: "Add your cultural background",
    icon: Globe2,
    fields: ["religion", "caste", "subCaste", "language"],
  },
  {
    id: "horoscope",
    title: "Horoscope",
    description:
      "Add your horoscope details now. You can upload the horoscope image in the final stage.",
    sidebarDescription: "Astrological information",
    panelDescription: "Share your horoscope details",
    icon: Sparkles,
    fields: ["star", "rasi", "dosham", "timeOfBirth", "placeOfBirth"],
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    description:
      "Help others understand your day-to-day habits and lifestyle choices.",
    sidebarDescription: "Your lifestyle and preferences",
    panelDescription: "Tell us about your lifestyle",
    icon: Leaf,
    fields: [
      "diet",
      "smoking",
      "drinking",
      "hobbies",
      "physicalActivity",
      "personalityType",
    ],
  },
  {
    id: "photos",
    title: "Add Photos",
    description:
      "Upload your profile picture, more profile photos, and horoscope image in the last step.",
    sidebarDescription: "Add photos to your profile",
    panelDescription: "Upload the photos that represent you",
    icon: ImagePlus,
    fields: ["profileImage", "additionalPhotoUrls", "horoscopeImage"],
  },
];

interface ProfileFormProps {
  defaultValues?: Partial<ProfileFormInput>;
  isEdit?: boolean;
  profileUserId?: string | null;
}

type CreateProfileDraft = {
  currentStep: number;
  values: Partial<ProfileFormInput>;
};

type PincodeLookupState = {
  pincode: string;
  status: "idle" | "loading" | "success" | "invalid" | "error";
  message?: string;
  state?: string;
  city?: string;
};

type CreatedProfileSuccess = {
  fullName: string;
  profileUserId: string;
};

const emptyPreference: PreferenceInput = {
  ageMin: null,
  ageMax: null,
  heightMin: null,
  heightMax: null,
  religion: null,
  caste: null,
  education: null,
  profession: null,
  location: null,
  maritalStatus: null,
  language: null,
};

const CREATE_PROFILE_DRAFT_STORAGE_KEY = "vivah-bandhan-create-profile-draft";

type SearchableOptionItem = {
  kind: "custom" | "option";
  value: string;
  label: string;
};

type SearchableDropdownInputProps = {
  id: string;
  value: string;
  options: readonly string[];
  selectedOption?: string | null;
  placeholder: string;
  emptyMessage: string;
  suggestionLabel: string;
  inputClassName: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onCommit: (value: string) => void;
};

function toNullableNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function toNullableValue(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value === "" ? null : value;
}

function normalizePhoneDigits(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\D/g, "").slice(0, 10);
}

function normalizePincodeDigits(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\D/g, "").slice(0, 6);
}

function normalizeTextInputValue(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function filterAutocompleteOptions(
  options: readonly string[],
  query?: string | null
) {
  const normalizedQuery = normalizeTextInputValue(query).toLowerCase();

  if (!normalizedQuery) {
    return options;
  }

  const startsWithMatches: string[] = [];
  const includesMatches: string[] = [];

  for (const option of options) {
    const normalizedOption = option.toLowerCase();

    if (normalizedOption.startsWith(normalizedQuery)) {
      startsWithMatches.push(option);
      continue;
    }

    if (normalizedOption.includes(normalizedQuery)) {
      includesMatches.push(option);
    }
  }

  return [...startsWithMatches, ...includesMatches];
}

function SearchableDropdownInput({
  id,
  value,
  options,
  selectedOption,
  placeholder,
  emptyMessage,
  suggestionLabel,
  inputClassName,
  disabled = false,
  onValueChange,
  onCommit,
}: SearchableDropdownInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const normalizedValue = normalizeTextInputValue(value);
  const exactOptionMatch =
    options.find(
      (option) => option.toLowerCase() === normalizedValue.toLowerCase()
    ) ?? null;
  const resolvedSelectedOption = selectedOption ?? exactOptionMatch;
  const shouldShowCustomValue =
    normalizedValue.length > 0 &&
    (!resolvedSelectedOption ||
      resolvedSelectedOption.toLowerCase() !== normalizedValue.toLowerCase());
  const dropdownItems = useMemo<SearchableOptionItem[]>(() => {
    const items: SearchableOptionItem[] = [];

    if (shouldShowCustomValue) {
      items.push({
        kind: "custom",
        value: normalizedValue,
        label: `Use "${normalizedValue}"`,
      });
    }

    for (const option of options) {
      items.push({
        kind: "option",
        value: option,
        label: option,
      });
    }

    return items;
  }, [normalizedValue, options, shouldShowCustomValue]);

  const commitCurrentValue = useCallback(() => {
    onCommit(normalizedValue);
  }, [normalizedValue, onCommit]);

  const updateMenuPosition = useCallback(() => {
    const input = inputRef.current;
    if (!input || typeof window === "undefined") {
      return;
    }

    const rect = input.getBoundingClientRect();
    const viewportPadding = 12;
    const dropdownGap = 8;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUpward = spaceBelow < 280 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(
      140,
      (openUpward ? spaceAbove : spaceBelow) - dropdownGap
    );
    const maxHeight = Math.min(320, availableHeight);
    const width = Math.min(
      Math.max(rect.width, 260),
      window.innerWidth - viewportPadding * 2
    );
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding
    );

    setMenuPosition({
      left,
      width,
      maxHeight,
      top: openUpward ? undefined : rect.bottom + dropdownGap,
      bottom: openUpward ? window.innerHeight - rect.top + dropdownGap : undefined,
    });
  }, []);

  useEffect(() => {
    if (!open || disabled) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [disabled, open, updateMenuPosition]);

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      return;
    }

    const selectedIndex = dropdownItems.findIndex((item) => {
      if (resolvedSelectedOption) {
        return item.value.toLowerCase() === resolvedSelectedOption.toLowerCase();
      }

      return item.kind === "custom";
    });

    setActiveIndex(selectedIndex >= 0 ? selectedIndex : dropdownItems.length ? 0 : -1);
  }, [dropdownItems, open, resolvedSelectedOption]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        containerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }

      commitCurrentValue();
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [commitCurrentValue, open]);

  useEffect(() => {
    if (!open || activeIndex < 0) {
      return;
    }

    const activeElement = panelRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`
    );

    activeElement?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex, open]);

  const handleSelect = useCallback(
    (nextValue: string) => {
      onValueChange(nextValue);
      onCommit(nextValue);
      setOpen(false);
      setActiveIndex(-1);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [onCommit, onValueChange]
  );

  const handleBlur = useCallback(() => {
    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (
        activeElement instanceof Node &&
        (containerRef.current?.contains(activeElement) ||
          panelRef.current?.contains(activeElement))
      ) {
        return;
      }

      commitCurrentValue();
      setOpen(false);
    }, 0);
  }, [commitCurrentValue]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          autoComplete="off"
          disabled={disabled}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
            }
          }}
          onBlur={handleBlur}
          onChange={(event) => {
            onValueChange(event.target.value);
            if (!open && !disabled) {
              setOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (disabled) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((currentIndex) => {
                if (!dropdownItems.length) {
                  return -1;
                }

                return currentIndex < dropdownItems.length - 1 ? currentIndex + 1 : 0;
              });
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((currentIndex) => {
                if (!dropdownItems.length) {
                  return -1;
                }

                return currentIndex > 0 ? currentIndex - 1 : dropdownItems.length - 1;
              });
              return;
            }

            if (event.key === "Enter") {
              if (open && activeIndex >= 0 && dropdownItems[activeIndex]) {
                event.preventDefault();
                handleSelect(dropdownItems[activeIndex].value);
                return;
              }

              commitCurrentValue();
              setOpen(false);
              return;
            }

            if (event.key === "Escape") {
              if (open) {
                event.preventDefault();
                setOpen(false);
              }
              return;
            }

            if (event.key === "Tab") {
              commitCurrentValue();
              setOpen(false);
            }
          }}
          className={`${inputClassName} pr-12`}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${id}-dropdown`}
          aria-autocomplete="list"
        />

        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (disabled) {
              return;
            }

            if (!open) {
              inputRef.current?.focus();
              setOpen(true);
              return;
            }

            commitCurrentValue();
            setOpen(false);
          }}
          className={`absolute inset-y-0 right-0 flex items-center px-4 transition-colors ${
            disabled
              ? "cursor-not-allowed text-gray-300"
              : open
                ? "text-rose-500"
                : "text-gray-400 hover:text-rose-500"
          }`}
          aria-label={open ? "Close suggestions" : "Open suggestions"}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {open && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              id={`${id}-dropdown`}
              role="listbox"
              className="fixed z-[9999] overflow-hidden border border-gray-400 bg-white shadow-sm"
              style={{
                left: `${menuPosition.left}px`,
                width: `${menuPosition.width}px`,
                maxHeight: `${menuPosition.maxHeight}px`,
                top:
                  typeof menuPosition.top === "number"
                    ? `${menuPosition.top}px`
                    : undefined,
                bottom:
                  typeof menuPosition.bottom === "number"
                    ? `${menuPosition.bottom}px`
                    : undefined,
              }}
            >
              <div
                className="max-h-[inherit] overflow-y-auto py-1"
                style={{ maxHeight: `${menuPosition.maxHeight}px` }}
              >
                {dropdownItems.length ? (
                  dropdownItems.map((item, index) => {
                    const isSelected = resolvedSelectedOption
                      ? item.value.toLowerCase() ===
                        resolvedSelectedOption.toLowerCase()
                      : item.kind === "custom" &&
                        item.value.toLowerCase() === normalizedValue.toLowerCase();
                    const isActive = index === activeIndex;

                    return (
                      <button
                        key={`${item.kind}-${item.value}`}
                        type="button"
                        tabIndex={-1}
                        data-option-index={index}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelect(item.value)}
                        className={`block w-full px-6 py-1.5 text-left text-base leading-6 transition-colors ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : isSelected
                              ? "bg-blue-600 text-white"
                              : "text-gray-900 hover:bg-blue-50"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-6 py-2 text-base text-gray-500">
                    {emptyMessage}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function getAnnualIncomeSelectValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return annualIncomeOptions.includes(value)
    ? value
    : OTHER_ANNUAL_INCOME_OPTION;
}

function formatHeightLabel(value: number) {
  const totalInches = value / 2.54;
  const roundedTotalInches = Math.round(totalInches);

  if (Math.abs(totalInches - roundedTotalInches) < 0.01) {
    const feet = Math.floor(roundedTotalInches / 12);
    const inches = roundedTotalInches % 12;
    return `${feet}'${inches}" (${value.toFixed(2)} cm)`;
  }

  return `${value} cm`;
}

function parseTimeOfBirth(value: string | null | undefined): TimeOfBirthParts {
  if (!value) {
    return { hour: "", minute: "", period: "" };
  }

  const trimmedValue = value.trim();
  const twelveHourMatch = trimmedValue.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (twelveHourMatch) {
    const hour = Number(twelveHourMatch[1]);
    const minute = Number(twelveHourMatch[2]);
    const period = twelveHourMatch[3].toUpperCase() as TimePeriod;

    if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
      return {
        hour: String(hour).padStart(2, "0"),
        minute: String(minute).padStart(2, "0"),
        period,
      };
    }
  }

  const twentyFourHourMatch = trimmedValue.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHourMatch) {
    const hour = Number(twentyFourHourMatch[1]);
    const minute = Number(twentyFourHourMatch[2]);

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      const period: TimePeriod = hour >= 12 ? "PM" : "AM";
      const normalizedHour = hour % 12 || 12;

      return {
        hour: String(normalizedHour).padStart(2, "0"),
        minute: String(minute).padStart(2, "0"),
        period,
      };
    }
  }

  return { hour: "", minute: "", period: "" };
}

function formatTimeOfBirth(parts: TimeOfBirthParts) {
  if (parts.hour && parts.minute && parts.period) {
    return `${parts.hour}:${parts.minute} ${parts.period}`;
  }

  return null;
}

function scrollToTop() {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function loadCreateProfileDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(CREATE_PROFILE_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return null;
    }

    return JSON.parse(rawDraft) as CreateProfileDraft;
  } catch {
    return null;
  }
}

function saveCreateProfileDraft(draft: CreateProfileDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CREATE_PROFILE_DRAFT_STORAGE_KEY,
    JSON.stringify(draft)
  );
}

function clearCreateProfileDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CREATE_PROFILE_DRAFT_STORAGE_KEY);
}

function getProfileFormDefaults(defaultValues?: Partial<ProfileFormInput>) {
  return {
    country: "India",
    ...defaultValues,
    maritalStatus: defaultValues?.maritalStatus ?? "NEVER_MARRIED",
    additionalPhotoUrls: defaultValues?.additionalPhotoUrls ?? [],
    preference: defaultValues?.preference
      ? { ...emptyPreference, ...defaultValues.preference }
      : undefined,
  };
}

function SectionBlock({
  title,
  description,
  children,
  delayMs = 0,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  delayMs?: number;
}) {
  return (
    <section
      className="ui-enter-up"
      style={{
        animationDelay: `${delayMs}ms`,
        animationFillMode: "forwards",
      }}
    >
      <div className="border-b border-gray-100 pb-3 mb-6">
        <h2 className="text-base font-display font-semibold text-gray-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SubsectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
      {children}
    </p>
  );
}

function TimeOfBirthInput({
  value,
  onChange,
  onBlur,
  selectClass,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  onBlur?: () => void;
  selectClass: string;
}) {
  const [parts, setParts] = useState<TimeOfBirthParts>(() => parseTimeOfBirth(value));

  useEffect(() => {
    setParts(parseTimeOfBirth(value));
  }, [value]);

  const updatePart = (key: keyof TimeOfBirthParts, nextValue: string) => {
    const nextParts = { ...parts, [key]: nextValue };

    setParts(nextParts);
    onChange(formatTimeOfBirth(nextParts));
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      <select
        id="pf-timeOfBirth-hour"
        value={parts.hour}
        onChange={(event) => updatePart("hour", event.target.value)}
        onBlur={onBlur}
        className={selectClass}
      >
        <option value="">Hour</option>
        {timeHourOptions.map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>

      <select
        value={parts.minute}
        onChange={(event) => updatePart("minute", event.target.value)}
        onBlur={onBlur}
        className={selectClass}
      >
        <option value="">Minute</option>
        {timeMinuteOptions.map((minute) => (
          <option key={minute} value={minute}>
            {minute}
          </option>
        ))}
      </select>

      <select
        value={parts.period}
        onChange={(event) =>
          updatePart("period", event.target.value as TimePeriod | "")
        }
        onBlur={onBlur}
        className={selectClass}
      >
        <option value="">AM / PM</option>
        {timePeriodOptions.map((period) => (
          <option key={period} value={period}>
            {period}
          </option>
        ))}
      </select>
    </div>
  );
}

function ProfileCreatedSuccessModal({
  fullName,
  profileUserId,
  onContinue,
}: {
  fullName: string;
  profileUserId: string;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = profileUserId;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const firstName = fullName.split(" ")[0] || fullName;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-created-success-title"
      aria-describedby="profile-created-success-description"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ animation: "pcsm-overlay-in 300ms ease-out forwards" }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{ animation: "pcsm-fade-in 300ms ease-out forwards" }}
      />

      <div
        className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-[20px] border border-white/20 bg-white shadow-[0_32px_80px_rgba(0,0,0,0.18)]"
        style={{ animation: "pcsm-card-in 400ms cubic-bezier(0.16,1,0.3,1) 100ms forwards", opacity: 0 }}
      >
        <div className="h-[6px] bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400" />

        <div className="px-7 pb-8 pt-7 text-center sm:px-9">
          <div
            className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-green-50 ring-1 ring-emerald-100"
            style={{ animation: "pcsm-icon-pop 500ms cubic-bezier(0.34,1.56,0.64,1) 350ms forwards", opacity: 0, transform: "scale(0.5)" }}
          >
            <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={1.8} />
          </div>

          <h2
            id="profile-created-success-title"
            className="mt-5 font-display text-[1.55rem] font-bold leading-tight text-gray-900"
            style={{ animation: "pcsm-slide-up 400ms ease-out 450ms forwards", opacity: 0 }}
          >
            🎉 Profile Created Successfully!
          </h2>

          <p
            id="profile-created-success-description"
            className="mt-3 text-[15px] leading-relaxed text-gray-600"
            style={{ animation: "pcsm-slide-up 400ms ease-out 520ms forwards", opacity: 0 }}
          >
            Hi <span className="font-semibold text-gray-900">{firstName}</span>,
            your profile has been created successfully.
          </p>

          <div
            className="mx-auto mt-6 max-w-[340px] overflow-hidden rounded-[14px] border border-rose-100 bg-gradient-to-br from-rose-50/80 via-pink-50/60 to-white"
            style={{ animation: "pcsm-slide-up 400ms ease-out 590ms forwards", opacity: 0 }}
          >
            <div className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-400">
                Your User ID
              </p>
              <div className="mt-2 flex items-center justify-center gap-2.5">
                <span className="font-mono text-[1.35rem] font-bold tracking-wider text-gray-900">
                  {profileUserId || "—"}
                </span>
                {profileUserId ? (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="group flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 transition-all hover:border-rose-300 hover:bg-rose-50 active:scale-95"
                    title="Copy User ID"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4 transition-transform group-hover:scale-110" />
                    )}
                  </button>
                ) : null}
              </div>
              {copied ? (
                <p className="mt-1.5 text-xs font-medium text-emerald-600">
                  Copied to clipboard!
                </p>
              ) : null}
            </div>
          </div>

          <p
            className="mt-4 text-[13px] leading-relaxed text-gray-400"
            style={{ animation: "pcsm-slide-up 400ms ease-out 660ms forwards", opacity: 0 }}
          >
            You can use this User ID for profile reference and support inquiries.
          </p>

          <button
            type="button"
            onClick={onContinue}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(244,63,94,0.3)] transition-all hover:shadow-[0_18px_40px_rgba(244,63,94,0.38)] active:scale-[0.97]"
            style={{ animation: "pcsm-slide-up 400ms ease-out 730ms forwards", opacity: 0 }}
          >
            Go to Dashboard
            <ArrowRightCircle className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pcsm-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pcsm-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pcsm-card-in {
          from { opacity: 0; transform: scale(0.92) translateY(24px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pcsm-icon-pop {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pcsm-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function ProfileForm({
  defaultValues,
  isEdit = false,
  profileUserId = null,
}: ProfileFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreateDraftHydrated, setIsCreateDraftHydrated] = useState(isEdit);
  const pincodeLookupAbortRef = useRef<AbortController | null>(null);
  const pendingPincodeAutofillRef = useRef<{
    pincode: string;
    state: string;
    city: string;
  } | null>(null);
  const [incomeSelectValue, setIncomeSelectValue] = useState(() =>
    getAnnualIncomeSelectValue(defaultValues?.income)
  );
  const [pincodeLookupState, setPincodeLookupState] =
    useState<PincodeLookupState>({
      pincode: "",
      status: "idle",
    });
  const [createdProfileSuccess, setCreatedProfileSuccess] =
    useState<CreatedProfileSuccess | null>(null);
  const displayProfileUserId = profileUserId?.trim() ?? "";

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    watch,
    setValue,
    trigger,
    clearErrors,
    setError,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: getProfileFormDefaults(defaultValues),
  });

  useEffect(() => {
    setIncomeSelectValue(getAnnualIncomeSelectValue(defaultValues?.income));
    reset(getProfileFormDefaults(defaultValues));
  }, [defaultValues, reset]);

  useEffect(() => {
    if (isEdit) {
      setIsCreateDraftHydrated(true);
      return;
    }

    const savedDraft = loadCreateProfileDraft();
    if (savedDraft) {
      setIncomeSelectValue(getAnnualIncomeSelectValue(savedDraft.values.income));
      reset(getProfileFormDefaults(savedDraft.values));
      setCurrentStep(Math.max(savedDraft.currentStep, 0));
    }
    setIsCreateDraftHydrated(true);
  }, [isEdit, reset]);

  useEffect(() => {
    if (isEdit || !isCreateDraftHydrated) {
      return;
    }

    saveCreateProfileDraft({
      currentStep,
      values: getValues(),
    });
  }, [currentStep, getValues, isCreateDraftHydrated, isEdit]);

  useEffect(() => {
    if (isEdit || !isCreateDraftHydrated) {
      return;
    }

    const subscription = watch((values) => {
      saveCreateProfileDraft({
        currentStep,
        values: values as Partial<ProfileFormInput>,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentStep, isCreateDraftHydrated, isEdit, watch]);

  const inputClass = isEdit
    ? "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
    : "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-[0_10px_30px_rgba(15,23,42,0.04)] outline-none transition-all focus:border-rose-300 focus:ring-4 focus:ring-rose-100";
  const selectClass = inputClass;
  const labelClass = isEdit
    ? "block text-sm font-medium text-gray-700 mb-1"
    : "mb-2 block text-[13px] font-medium text-gray-700";
  const errorClass = "mt-1 text-xs text-rose-500";
  const selectedHeight = watch("height");
  const availableMaritalOptions = isEdit
    ? maritalOptions
    : maritalOptions.filter((status) => status !== "SEPARATED");
  const selectedEducation = watch("education");
  const selectedCourse = watch("course");
  const selectedProfession = watch("profession");
  const selectedEmployedIn = watch("employedIn");
  const selectedNakshatra = watch("star");
  const selectedRasi = watch("rasi");
  const selectedDosham = watch("dosham");
  const selectedReligion = watch("religion");
  const selectedLanguage = watch("language");
  const selectedPreferenceLanguage = watch("preference.language");
  const selectedState = watch("state");
  const selectedCity = watch("city");
  const selectedPincode = watch("pincode");
  const selectedDiet = watch("diet");
  const selectedSmoking = watch("smoking");
  const selectedDrinking = watch("drinking");
  const selectedHobbies = watch("hobbies");
  const selectedPhysicalActivity = watch("physicalActivity");
  const selectedPersonalityType = watch("personalityType");
  const matchedStateOption = findMatchingStateOption(selectedState);
  const matchedCityOption = matchedStateOption
    ? findMatchingCityForState(matchedStateOption, [selectedCity])
    : null;
  const resolvedSelectedState =
    matchedStateOption ?? normalizeTextInputValue(selectedState);
  const resolvedSelectedCity =
    matchedCityOption ?? normalizeTextInputValue(selectedCity);
  const cityOptions = getCitiesForState(matchedStateOption);
  const filteredStateOptions = filterAutocompleteOptions(
    STATE_OPTIONS,
    selectedState
  );
  const filteredCityOptions = filterAutocompleteOptions(cityOptions, selectedCity);
  const normalizedSelectedPincode = normalizePincodeDigits(selectedPincode);
  const hasCustomHeightOption =
    typeof selectedHeight === "number" &&
    !heightOptions.some((option) => option.value === selectedHeight);
  const hasCustomDietOption =
    typeof selectedDiet === "string" &&
    selectedDiet.length > 0 &&
    !dietOptions.includes(selectedDiet);
  const hasCustomSmokingOption =
    typeof selectedSmoking === "string" &&
    selectedSmoking.length > 0 &&
    !smokingOptions.includes(selectedSmoking);
  const hasCustomDrinkingOption =
    typeof selectedDrinking === "string" &&
    selectedDrinking.length > 0 &&
    !drinkingOptions.includes(selectedDrinking);
  const hasCustomHobbiesOption =
    typeof selectedHobbies === "string" &&
    selectedHobbies.length > 0 &&
    !hobbiesOptions.includes(selectedHobbies);
  const hasCustomPhysicalActivityOption =
    typeof selectedPhysicalActivity === "string" &&
    selectedPhysicalActivity.length > 0 &&
    !physicalActivityOptions.includes(selectedPhysicalActivity);
  const hasCustomPersonalityTypeOption =
    typeof selectedPersonalityType === "string" &&
    selectedPersonalityType.length > 0 &&
    !personalityTypeOptions.includes(selectedPersonalityType);
  const shouldShowHoroscopeStep =
    !selectedReligion || selectedReligion === "Hindu";
  const activeCreateProfileSteps = createProfileSteps
    .filter((step) => shouldShowHoroscopeStep || step.id !== "horoscope")
    .map((step) =>
      !shouldShowHoroscopeStep && step.id === "photos"
        ? {
            ...step,
            description:
              "Upload your profile picture and more profile photos in the last step.",
            sidebarDescription: "Add photos to your profile",
            panelDescription: "Upload the photos that represent you",
          }
        : step
    );

  const resetPincodeLookup = useCallback(() => {
    pincodeLookupAbortRef.current?.abort();
    pincodeLookupAbortRef.current = null;
    pendingPincodeAutofillRef.current = null;
    setPincodeLookupState({ pincode: "", status: "idle" });
  }, []);

  const syncPincodeWithAddress = useCallback(
    (stateValue: unknown, cityValue: unknown) => {
      const normalizedState = normalizeTextInputValue(stateValue);
      const normalizedCity = normalizeTextInputValue(cityValue);
      const canonicalState = findMatchingStateOption(normalizedState);
      const canonicalCity = canonicalState
        ? findMatchingCityForState(canonicalState, [normalizedCity])
        : null;
      const nextPincode =
        canonicalState && canonicalCity
          ? getPincodeForCity(canonicalState, canonicalCity)
          : "";
      const currentPincode = normalizePincodeDigits(getValues("pincode"));

      if (nextPincode) {
        if (currentPincode !== nextPincode) {
          setValue("pincode", nextPincode, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }

        clearErrors("pincode");
        return;
      }

      if (currentPincode) {
        resetPincodeLookup();
        setValue("pincode", "", {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    },
    [clearErrors, getValues, resetPincodeLookup, setValue]
  );

  const commitStateValue = useCallback(
    (stateValue: string) => {
      const nextState =
        findMatchingStateOption(stateValue) ?? normalizeTextInputValue(stateValue);

      setValue("state", nextState, {
        shouldValidate: true,
        shouldDirty: true,
      });

      const currentCity = getValues("city");
      syncPincodeWithAddress(nextState, currentCity);
    },
    [getValues, setValue, syncPincodeWithAddress]
  );

  const commitCityValue = useCallback(
    (cityValue: string) => {
      const currentState = normalizeTextInputValue(getValues("state"));
      const canonicalState = findMatchingStateOption(currentState);
      const nextCity =
        canonicalState && cityValue
          ? findMatchingCityForState(canonicalState, [cityValue]) ??
            normalizeTextInputValue(cityValue)
          : normalizeTextInputValue(cityValue);

      setValue("city", nextCity, {
        shouldValidate: true,
        shouldDirty: true,
      });

      syncPincodeWithAddress(canonicalState ?? currentState, nextCity);
    },
    [getValues, setValue, syncPincodeWithAddress]
  );

  const lookupPincode = useCallback(
    async (normalizedPincode: string) => {
      if (normalizedPincode.length !== 6) {
        resetPincodeLookup();
        return;
      }

      if (
        pincodeLookupState.pincode === normalizedPincode &&
        (pincodeLookupState.status === "loading" ||
          pincodeLookupState.status === "success")
      ) {
        return;
      }

      pincodeLookupAbortRef.current?.abort();
      const abortController = new AbortController();
      pincodeLookupAbortRef.current = abortController;

      setPincodeLookupState({
        pincode: normalizedPincode,
        status: "loading",
      });

      try {
        const response = await fetch(
          `/api/pincode?pincode=${normalizedPincode}`,
          {
            cache: "no-store",
            signal: abortController.signal,
          }
        );

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            typeof result?.error === "string"
              ? result.error
              : "Unable to validate this pincode right now. Please try again.";

          setPincodeLookupState({
            pincode: normalizedPincode,
            status:
              response.status === 400 || response.status === 404
                ? "invalid"
                : "error",
            message,
          });
          setError("pincode", {
            type: "manual",
            message,
          });
          return;
        }

        const resolvedState =
          typeof result?.data?.state === "string" ? result.data.state : "";
        const resolvedCity =
          typeof result?.data?.city === "string" ? result.data.city : "";

        if (!resolvedState || !resolvedCity) {
          pendingPincodeAutofillRef.current = null;
          setPincodeLookupState({
            pincode: normalizedPincode,
            status: "invalid",
            message: "Enter a valid pincode",
          });
          setError("pincode", {
            type: "manual",
            message: "Enter a valid pincode",
          });
          return;
        }

        pendingPincodeAutofillRef.current = {
          pincode: normalizedPincode,
          state: resolvedState,
          city: resolvedCity,
        };

        setValue("state", resolvedState, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setValue("city", resolvedCity, {
          shouldValidate: true,
          shouldDirty: true,
        });
        clearErrors(["pincode", "state", "city"]);
        setPincodeLookupState({
          pincode: normalizedPincode,
          status: "success",
          state: resolvedState,
          city: resolvedCity,
        });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        pendingPincodeAutofillRef.current = null;
        setPincodeLookupState({
          pincode: normalizedPincode,
          status: "error",
          message: "Unable to validate this pincode right now. Please try again.",
        });
        setError("pincode", {
          type: "manual",
          message: "Unable to validate this pincode right now. Please try again.",
        });
      }
    },
    [
      clearErrors,
      pincodeLookupState.pincode,
      pincodeLookupState.status,
      resetPincodeLookup,
      setError,
      setValue,
    ]
  );

  useEffect(() => {
    const pendingAutofill = pendingPincodeAutofillRef.current;

    if (
      pendingAutofill &&
      pendingAutofill.pincode === normalizedSelectedPincode &&
      pendingAutofill.state === resolvedSelectedState &&
      pendingAutofill.city === resolvedSelectedCity
    ) {
      pendingPincodeAutofillRef.current = null;
    }
  }, [
    normalizedSelectedPincode,
    resolvedSelectedCity,
    resolvedSelectedState,
  ]);

  useEffect(() => {
    if (!resolvedSelectedState || !resolvedSelectedCity) return;

    const pincode = getPincodeForCity(
      resolvedSelectedState,
      resolvedSelectedCity
    );
    if (pincode) {
      setValue("pincode", pincode, { shouldValidate: true });
    }
  }, [resolvedSelectedCity, resolvedSelectedState, setValue]);

  useEffect(() => {
    if (normalizedSelectedPincode.length < 6) {
      if (pincodeLookupState.status !== "idle" || pincodeLookupState.pincode) {
        resetPincodeLookup();
      }

      return;
    }

    if (
      !selectedState ||
      !selectedCity ||
      pincodeLookupState.pincode !== normalizedSelectedPincode
    ) {
      void lookupPincode(normalizedSelectedPincode);
    }
  }, [
    lookupPincode,
    normalizedSelectedPincode,
    pincodeLookupState.pincode,
    pincodeLookupState.status,
    resetPincodeLookup,
    selectedCity,
    selectedState,
  ]);

  useEffect(() => {
    if (shouldShowHoroscopeStep) {
      return;
    }

    setValue("star", "");
    setValue("rasi", "");
    setValue("dosham", "");
    setValue("timeOfBirth", null);
    setValue("placeOfBirth", "");
    setValue("horoscopeImage", null);
    clearErrors([
      "star",
      "rasi",
      "dosham",
      "timeOfBirth",
      "placeOfBirth",
      "horoscopeImage",
    ]);
  }, [clearErrors, setValue, shouldShowHoroscopeStep]);

  useEffect(() => {
    if (isEdit) {
      return;
    }

    if (currentStep <= activeCreateProfileSteps.length - 1) {
      return;
    }

    setCurrentStep(Math.max(activeCreateProfileSteps.length - 1, 0));
  }, [activeCreateProfileSteps.length, currentStep, isEdit]);

  const currentCreateStep =
    activeCreateProfileSteps[currentStep] ?? activeCreateProfileSteps[0];
  const isLastCreateStep = currentStep === activeCreateProfileSteps.length - 1;
  const completedStepCount = currentStep;
  const completionPercentage = Math.round(
    (completedStepCount / activeCreateProfileSteps.length) * 100
  );
  const CurrentCreateStepIcon = currentCreateStep.icon;

  const syncDateOfBirthAgeError = useCallback(
    (
      genderValue: ProfileFormInput["gender"] | "" | null | undefined = getValues("gender"),
      dateOfBirthValue: string | null | undefined = getValues("dateOfBirth")
    ) => {
      const ageValidationMessage = getProfileAgeValidationMessage(
        genderValue,
        dateOfBirthValue
      );

      if (ageValidationMessage) {
        setError("dateOfBirth", {
          type: "manual",
          message: ageValidationMessage,
        });
        return false;
      }

      if (errors.dateOfBirth?.type === "manual") {
        clearErrors("dateOfBirth");
      }

      return true;
    },
    [clearErrors, errors.dateOfBirth?.type, getValues, setError]
  );

  const handleNextStep = async () => {
    if (isEdit) return;

    if (
      currentCreateStep.id === "personal" &&
      normalizedSelectedPincode.length === 6 &&
      pincodeLookupState.pincode === normalizedSelectedPincode &&
      pincodeLookupState.status === "loading"
    ) {
      toast.error("Please wait while we validate the pincode.");
      return;
    }

    if (currentCreateStep.id === "personal" && !syncDateOfBirthAgeError()) {
      toast.error(
        getProfileAgeValidationMessage(
          getValues("gender"),
          getValues("dateOfBirth")
        ) ?? "Please enter a valid date of birth."
      );
      return;
    }

    const isStepValid = await trigger(currentCreateStep.fields);
    if (!isStepValid) {
      toast.error("Please complete the highlighted fields before continuing.");
      return;
    }

    setCurrentStep((step) =>
      Math.min(step + 1, activeCreateProfileSteps.length - 1)
    );
    scrollToTop();
  };

  const handlePreviousStep = () => {
    if (isEdit) return;

    setCurrentStep((step) => Math.max(step - 1, 0));
    scrollToTop();
  };

  const handleSaveAndExit = () => {
    if (isEdit) {
      router.push("/dashboard");
      return;
    }

    saveCreateProfileDraft({
      currentStep,
      values: getValues(),
    });

    toast.success("Progress saved. You can continue your profile later.");
    router.push("/dashboard");
  };

  const onSubmit = async (data: ProfileFormInput) => {
    const ageValidationMessage = getProfileAgeValidationMessage(
      data.gender,
      data.dateOfBirth
    );

    if (ageValidationMessage) {
      setError("dateOfBirth", {
        type: "manual",
        message: ageValidationMessage,
      });
      toast.error(ageValidationMessage);
      return;
    }

    const url = "/api/profile";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to save profile");
      return;
    }

    const nextProfileImage =
      typeof json.profile?.profileImage === "string" && json.profile.profileImage.trim()
        ? json.profile.profileImage.trim()
        : null;

    if (nextProfileImage) {
      window.dispatchEvent(
        new CustomEvent("dashboard-avatar-updated", {
          detail: { image: nextProfileImage },
        })
      );

      try {
        await update({
          user: {
            image: nextProfileImage,
          },
        });
      } catch {
        // The local UI already has the new image via the custom event.
      }
    }

    if (isEdit) {
      writeStoredBrowseFilters(
        mapPreferenceSourceToBrowseFilters(data.preference ?? null)
      );
    }

    if (isEdit) {
      toast.success("Profile updated successfully. Redirecting to home...");
      await new Promise((resolve) => setTimeout(resolve, 900));
      router.replace("/dashboard");
      return;
    }

    const createdProfileUserId =
      typeof json.profile?.profileUserId === "string"
        ? json.profile.profileUserId
        : "";

    clearCreateProfileDraft();
    setCreatedProfileSuccess({
      fullName:
        typeof json.profile?.fullName === "string" && json.profile.fullName.trim()
          ? json.profile.fullName.trim()
          : data.fullName,
      profileUserId: createdProfileUserId,
    });
  };

  const handleProfileSuccessContinue = () => {
    setCreatedProfileSuccess(null);
    router.replace("/dashboard");
    router.refresh();
  };

  const handleCreateProfile = async () => {
    if (isEdit) return;

    await handleSubmit(onSubmit)();
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isEdit) {
      await handleSubmit(onSubmit)(event);
    }
  };

  const phoneRegistration = register("phone", {
    setValueAs: normalizePhoneDigits,
    validate: (value) => {
      const normalizedPhone = normalizePhoneDigits(value);

      if (!normalizedPhone) {
        return "Phone number is required";
      }

      return normalizedPhone.length === 10
        ? true
        : "Phone number must be exactly 10 digits";
    },
    onChange: (event) => {
      const normalizedPhone = normalizePhoneDigits(event.target.value);
      event.target.value = normalizedPhone;

      if (errors.phone && normalizedPhone.length === 10) {
        clearErrors("phone");
      }
    },
  });

  const genderRegistration = register("gender", {
    onChange: (event) => {
      const currentDateOfBirth = getValues("dateOfBirth");

      if (currentDateOfBirth || errors.dateOfBirth) {
        syncDateOfBirthAgeError(
          event.target.value as ProfileFormInput["gender"],
          currentDateOfBirth
        );
      }
    },
  });

  const dateOfBirthRegistration = register("dateOfBirth", {
    validate: (value) => {
      const ageValidationMessage = getProfileAgeValidationMessage(
        getValues("gender"),
        value
      );

      return ageValidationMessage ?? true;
    },
    onChange: (event) => {
      const currentDateOfBirth = event.target.value;

      if (currentDateOfBirth || errors.dateOfBirth) {
        syncDateOfBirthAgeError(getValues("gender"), currentDateOfBirth);
      }
    },
    onBlur: (event) => {
      const currentDateOfBirth = event.target.value;

      if (currentDateOfBirth || errors.dateOfBirth) {
        syncDateOfBirthAgeError(getValues("gender"), currentDateOfBirth);
        void trigger("dateOfBirth");
      }
    },
  });

  const pincodeRegistration = register("pincode", {
    setValueAs: normalizePincodeDigits,
    validate: (value) => {
      const normalizedPincode = normalizePincodeDigits(value);

      if (!normalizedPincode) {
        return "Pincode is required";
      }

      if (normalizedPincode.length !== 6) {
        return "Pincode must be 6 digits";
      }

      if (pincodeLookupState.pincode !== normalizedPincode) {
        return true;
      }

      if (pincodeLookupState.status === "loading") {
        return "Validating pincode...";
      }

      if (pincodeLookupState.status === "invalid") {
        return pincodeLookupState.message ?? "Enter a valid pincode";
      }

      if (pincodeLookupState.status === "error") {
        return (
          pincodeLookupState.message ??
          "Unable to validate this pincode right now. Please try again."
        );
      }

      return true;
    },
    onChange: (event) => {
      const normalizedPincode = normalizePincodeDigits(event.target.value);
      event.target.value = normalizedPincode;

      if (errors.pincode) {
        clearErrors("pincode");
      }

      if (normalizedPincode.length < 6) {
        resetPincodeLookup();
        return;
      }

      if (normalizedPincode.length === 6) {
        void lookupPincode(normalizedPincode);
      }
    },
    onBlur: (event) => {
      const normalizedPincode = normalizePincodeDigits(event.target.value);

      if (normalizedPincode.length === 6) {
        void lookupPincode(normalizedPincode);
      }
    },
  });

  const renderPersonalInformation = () => (
    <div className="space-y-7">
      <div className={`grid gap-5 ${isEdit ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
        <div>
          <label className={labelClass} htmlFor="pf-fullName">
            Full Name *
          </label>
          <input
            id="pf-fullName"
            type="text"
            {...register("fullName")}
            className={inputClass}
            placeholder="Arjun Sharma"
          />
          {errors.fullName ? (
            <p className={errorClass}>{errors.fullName.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-gender">
            Gender *
          </label>
          <select id="pf-gender" {...genderRegistration} className={selectClass}>
            {!isEdit ? <option value="">Select gender</option> : null}
            {genderOptions.map((gender) => (
              <option key={gender} value={gender}>
                {labelMap.gender[gender]}
              </option>
            ))}
          </select>
          {errors.gender ? (
            <p className={errorClass}>{errors.gender.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-dob">
            Date of Birth *
          </label>
          <input
            id="pf-dob"
            type="date"
            {...dateOfBirthRegistration}
            className={inputClass}
          />
          {errors.dateOfBirth ? (
            <p className={errorClass}>{errors.dateOfBirth.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-height">
            Height
          </label>
          <select
            id="pf-height"
            {...register("height", { setValueAs: toNullableNumber })}
            className={selectClass}
          >
            <option value="">Select height</option>
            {hasCustomHeightOption ? (
              <option value={selectedHeight}>
                {formatHeightLabel(selectedHeight)}
              </option>
            ) : null}
            {heightOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.height ? (
            <p className={errorClass}>{errors.height.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-marital">
            Marital Status *
          </label>
          <select
            id="pf-marital"
            {...register("maritalStatus")}
            className={selectClass}
          >
            {availableMaritalOptions.map((status) => (
              <option key={status} value={status}>
                {labelMap.marital[status]}
              </option>
            ))}
          </select>
          {errors.maritalStatus ? (
            <p className={errorClass}>{errors.maritalStatus.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-phone">
            Phone Number *
          </label>
          <input
            id="pf-phone"
            type="tel"
            {...phoneRegistration}
            className={inputClass}
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            pattern="[0-9]{10}"
            placeholder="9876543210"
          />
          {errors.phone ? (
            <p className={errorClass}>{errors.phone.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-nationality">
            Nationality *
          </label>
          <select
            id="pf-nationality"
            {...register("nationality", { setValueAs: toNullableValue })}
            className={selectClass}
          >
            <option value="">Select nationality</option>
            {nationalityOptions.map((nationality) => (
              <option key={nationality} value={nationality}>
                {nationality}
              </option>
            ))}
          </select>
          {errors.nationality ? (
            <p className={errorClass}>{errors.nationality.message}</p>
          ) : null}
        </div>

      </div>

      <div className="space-y-4">
        <SubsectionLabel>Address Details</SubsectionLabel>

        <div className={`grid gap-5 ${isEdit ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
          <div>
            <label className={labelClass} htmlFor="pf-houseNumber">
              House Number *
            </label>
            <input
              id="pf-houseNumber"
              type="text"
              {...register("houseNumber")}
              className={inputClass}
              placeholder="Flat / House No."
            />
            {errors.houseNumber ? (
              <p className={errorClass}>{errors.houseNumber.message}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-streetName">
              Street Name *
            </label>
            <input
              id="pf-streetName"
              type="text"
              {...register("streetName")}
              className={inputClass}
              placeholder="Street / Area / Locality"
            />
            {errors.streetName ? (
              <p className={errorClass}>{errors.streetName.message}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-state">
              State *
            </label>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <SearchableDropdownInput
                  id="pf-state"
                  value={typeof field.value === "string" ? field.value : ""}
                  options={filteredStateOptions}
                  selectedOption={matchedStateOption}
                  placeholder="Search or type a state"
                  emptyMessage="No matching states found. Press Enter to use your typed value."
                  suggestionLabel="Suggested States"
                  inputClassName={inputClass}
                  onValueChange={field.onChange}
                  onCommit={(nextValue) => {
                    commitStateValue(nextValue);
                    field.onBlur();
                  }}
                />
              )}
            />
            {errors.state ? <p className={errorClass}>{errors.state.message}</p> : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-city">
              City *
            </label>
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <SearchableDropdownInput
                  id="pf-city"
                  value={typeof field.value === "string" ? field.value : ""}
                  options={filteredCityOptions}
                  selectedOption={matchedCityOption}
                  placeholder={
                    matchedStateOption
                      ? "Search or type a city"
                      : "Type a city or enter a full state name for suggestions"
                  }
                  emptyMessage={
                    matchedStateOption
                      ? "No matching cities found. Press Enter to use your typed value."
                      : "Enter or choose a state to see city suggestions. You can still type a city manually."
                  }
                  suggestionLabel="Suggested Cities"
                  inputClassName={inputClass}
                  onValueChange={field.onChange}
                  onCommit={(nextValue) => {
                    commitCityValue(nextValue);
                    field.onBlur();
                  }}
                />
              )}
            />
            {errors.city ? <p className={errorClass}>{errors.city.message}</p> : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-pincode">
              Pincode *
            </label>
            <input
              id="pf-pincode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              {...pincodeRegistration}
              className={inputClass}
              placeholder="Enter 6-digit pincode"
            />
            {errors.pincode ? (
              <p className={errorClass}>{errors.pincode.message}</p>
            ) : null}
            <p className="text-gray-400 text-xs mt-1.5">
              Enter a valid pincode to auto-fill the city and state.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="pf-bio">
          About Me
        </label>
        <textarea
          id="pf-bio"
          {...register("bio")}
          className={inputClass}
          rows={4}
          placeholder="Tell potential partners about yourself, your interests, and what you're looking for..."
        />
        {errors.bio ? <p className={errorClass}>{errors.bio.message}</p> : null}
      </div>
    </div>
  );

  const renderEducationCareer = () => (
    <div className="grid sm:grid-cols-2 gap-5">
      <div>
        <label className={labelClass} htmlFor="pf-education">
          Higher Education *
        </label>
        <select
          id="pf-education"
          {...register("education", { setValueAs: toNullableValue })}
          className={selectClass}
        >
          <option value="">Select higher education</option>
          {selectedEducation &&
          !higherEducationOptions.includes(selectedEducation) ? (
            <option value={selectedEducation}>{selectedEducation}</option>
          ) : null}
          {higherEducationOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.education ? (
          <p className={errorClass}>{errors.education.message}</p>
        ) : null}
      </div>

      <div>
        <label className={labelClass} htmlFor="pf-course">
          Course *
        </label>
        <select
          id="pf-course"
          {...register("course", { setValueAs: toNullableValue })}
          className={selectClass}
        >
          <option value="">Select course</option>
          {selectedCourse && !courseOptions.includes(selectedCourse) ? (
            <option value={selectedCourse}>{selectedCourse}</option>
          ) : null}
          {courseOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.course ? (
          <p className={errorClass}>{errors.course.message}</p>
        ) : null}
      </div>

      <div>
        <label className={labelClass} htmlFor="pf-profession">
          Occupation *
        </label>
        <select
          id="pf-profession"
          {...register("profession", { setValueAs: toNullableValue })}
          className={selectClass}
        >
          <option value="">Select occupation</option>
          {selectedProfession &&
          !occupationOptions.includes(selectedProfession) ? (
            <option value={selectedProfession}>{selectedProfession}</option>
          ) : null}
          {occupationOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.profession ? (
          <p className={errorClass}>{errors.profession.message}</p>
        ) : null}
      </div>

      <div>
        <label className={labelClass} htmlFor="pf-employedIn">
          Employed In *
        </label>
        <select
          id="pf-employedIn"
          {...register("employedIn", { setValueAs: toNullableValue })}
          className={selectClass}
        >
          <option value="">Select employment type</option>
          {selectedEmployedIn &&
          !employedInOptions.includes(selectedEmployedIn) ? (
            <option value={selectedEmployedIn}>{selectedEmployedIn}</option>
          ) : null}
          {employedInOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.employedIn ? (
          <p className={errorClass}>{errors.employedIn.message}</p>
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="pf-income">
          Annual Income *
        </label>
        <Controller
          name="income"
          control={control}
          render={({ field }) => {
            const hasCustomIncomeValue =
              typeof field.value === "string" &&
              field.value.length > 0 &&
              !annualIncomeOptions.includes(field.value);

            return (
              <>
                <select
                  id="pf-income"
                  value={incomeSelectValue}
                  onChange={(event) => {
                    const nextValue = event.target.value;

                    setIncomeSelectValue(nextValue);

                    if (nextValue === OTHER_ANNUAL_INCOME_OPTION) {
                      if (!hasCustomIncomeValue) {
                        field.onChange("");
                      }

                      return;
                    }

                    field.onChange(nextValue === "" ? null : nextValue);
                  }}
                  onBlur={field.onBlur}
                  className={selectClass}
                >
                  <option value="">Select annual income</option>
                  {annualIncomeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  <option value={OTHER_ANNUAL_INCOME_OPTION}>Other</option>
                </select>

                {incomeSelectValue === OTHER_ANNUAL_INCOME_OPTION ? (
                  <input
                    id="pf-income-other"
                    type="text"
                    value={typeof field.value === "string" ? field.value : ""}
                    onChange={(event) =>
                      field.onChange(toNullableValue(event.target.value))
                    }
                    onBlur={field.onBlur}
                    className={`${inputClass} mt-3`}
                    placeholder="Type your salary"
                  />
                ) : null}
              </>
            );
          }}
        />
        {errors.income ? (
          <p className={errorClass}>{errors.income.message}</p>
        ) : null}
      </div>
    </div>
  );

  const renderCommunityDetails = () => (
    <div className="space-y-4">
      <SubsectionLabel>Community Details</SubsectionLabel>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass} htmlFor="pf-religion">
            Religion *
          </label>
          <select id="pf-religion" {...register("religion")} className={selectClass}>
            <option value="">Select Religion</option>
            {religions.map((religion) => (
              <option key={religion} value={religion}>
                {religion}
              </option>
            ))}
          </select>
          {errors.religion ? (
            <p className={errorClass}>{errors.religion.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-language">
            Mother Tongue *
          </label>
          <select id="pf-language" {...register("language")} className={selectClass}>
            <option value="">Select Mother Tongue</option>
            {selectedLanguage &&
            !MOTHER_TONGUE_OPTIONS.some(
              (option) => option.value === selectedLanguage
            ) ? (
              <option value={selectedLanguage}>{selectedLanguage}</option>
            ) : null}
            {MOTHER_TONGUE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.language ? (
            <p className={errorClass}>{errors.language.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-caste">
            Caste *
          </label>
          <input
            id="pf-caste"
            type="text"
            list="pf-caste-options"
            {...register("caste")}
            className={inputClass}
            placeholder="Type caste or choose No Caste"
          />
          <datalist id="pf-caste-options">
            {casteSuggestions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          {errors.caste ? <p className={errorClass}>{errors.caste.message}</p> : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-subCaste">
            Sub Caste
          </label>
          <input
            id="pf-subCaste"
            type="text"
            {...register("subCaste")}
            className={inputClass}
            placeholder="Optional"
          />
          {errors.subCaste ? (
            <p className={errorClass}>{errors.subCaste.message}</p>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderFamilyDetails = () => (
    <div className="space-y-4">
      <SubsectionLabel>Family Details</SubsectionLabel>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass} htmlFor="pf-father">
            Father&apos;s Name *
          </label>
          <input
            id="pf-father"
            type="text"
            {...register("fatherName")}
            className={inputClass}
          />
          {errors.fatherName ? (
            <p className={errorClass}>{errors.fatherName.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-mother">
            Mother&apos;s Name *
          </label>
          <input
            id="pf-mother"
            type="text"
            {...register("motherName")}
            className={inputClass}
          />
          {errors.motherName ? (
            <p className={errorClass}>{errors.motherName.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-familyType">
            Family Type *
          </label>
          <select
            id="pf-familyType"
            {...register("familyType", { setValueAs: toNullableValue })}
            className={selectClass}
          >
            <option value="">Select</option>
            {familyTypeOptions.map((familyType) => (
              <option key={familyType} value={familyType}>
                {labelMap.familyType[familyType]}
              </option>
            ))}
          </select>
          {errors.familyType ? (
            <p className={errorClass}>{errors.familyType.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-familyStatus">
            Family Status *
          </label>
          <select
            id="pf-familyStatus"
            {...register("familyStatus", { setValueAs: toNullableValue })}
            className={selectClass}
          >
            <option value="">Select</option>
            {familyStatusOptions.map((familyStatus) => (
              <option key={familyStatus} value={familyStatus}>
                {labelMap.familyStatus[familyStatus]}
              </option>
            ))}
          </select>
          {errors.familyStatus ? (
            <p className={errorClass}>{errors.familyStatus.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-siblings">
            No. of Siblings *
          </label>
          <input
            id="pf-siblings"
            type="number"
            {...register("siblings", { setValueAs: toNullableNumber })}
            className={inputClass}
            min={0}
            max={20}
          />
          {errors.siblings ? (
            <p className={errorClass}>{errors.siblings.message}</p>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderCulturalBackground = () => renderCommunityDetails();

  const renderHoroscope = () => (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass} htmlFor="pf-star">
            Nakshatra *
          </label>
          <select id="pf-star" {...register("star")} className={selectClass}>
            <option value="">Select Nakshatra</option>
            {selectedNakshatra &&
            !NAKSHATRA_OPTIONS.some(
              (option) => option.value === selectedNakshatra
            ) ? (
              <option value={selectedNakshatra}>{selectedNakshatra}</option>
            ) : null}
            {NAKSHATRA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.star ? <p className={errorClass}>{errors.star.message}</p> : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-rasi">
            Rasi / Star Sign *
          </label>
          <select id="pf-rasi" {...register("rasi")} className={selectClass}>
            <option value="">Select Rasi</option>
            {selectedRasi &&
            !RASI_OPTIONS.some((option) => option.value === selectedRasi) ? (
              <option value={selectedRasi}>{selectedRasi}</option>
            ) : null}
            {RASI_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.rasi ? <p className={errorClass}>{errors.rasi.message}</p> : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-timeOfBirth-hour">
            Time of Birth *
          </label>
          <Controller
            name="timeOfBirth"
            control={control}
            render={({ field }) => (
              <TimeOfBirthInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                selectClass={selectClass}
              />
            )}
          />
          {errors.timeOfBirth ? (
            <p className={errorClass}>{errors.timeOfBirth.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-dosham">
            Dosham
          </label>
          <select
            id="pf-dosham"
            {...register("dosham")}
            className={selectClass}
          >
            <option value="">Select Dosham</option>
            {selectedDosham &&
            !DOSHAM_OPTIONS.some((option) => option.value === selectedDosham) ? (
              <option value={selectedDosham}>{selectedDosham}</option>
            ) : null}
            {DOSHAM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.dosham ? (
            <p className={errorClass}>{errors.dosham.message}</p>
          ) : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-placeOfBirth">
            Place of Birth *
          </label>
          <input
            id="pf-placeOfBirth"
            type="text"
            {...register("placeOfBirth")}
            className={inputClass}
            placeholder="e.g., Chennai, Tamil Nadu"
          />
          {errors.placeOfBirth ? (
            <p className={errorClass}>{errors.placeOfBirth.message}</p>
          ) : null}
        </div>
      </div>

      {!isEdit ? (
        <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Horoscope image upload is available in the final photo stage so the create
          flow stays clean and step-by-step.
        </p>
      ) : null}
    </div>
  );

  const renderLifestyle = () => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <div>
        <label className={labelClass} htmlFor="pf-diet">
          Diet *
        </label>
        <select id="pf-diet" {...register("diet")} className={selectClass}>
          <option value="">Select</option>
          {hasCustomDietOption ? (
            <option value={selectedDiet}>{selectedDiet}</option>
          ) : null}
          {dietOptions.map((diet) => (
            <option key={diet} value={diet}>
              {diet}
            </option>
          ))}
        </select>
        {errors.diet ? <p className={errorClass}>{errors.diet.message}</p> : null}
      </div>

      <div>
        <label className={labelClass} htmlFor="pf-smoking">
          Smoking *
        </label>
        <select id="pf-smoking" {...register("smoking")} className={selectClass}>
          <option value="">Select</option>
          {hasCustomSmokingOption ? (
            <option value={selectedSmoking}>{selectedSmoking}</option>
          ) : null}
          {smokingOptions.map((smoking) => (
            <option key={smoking} value={smoking}>
              {smoking}
            </option>
          ))}
        </select>
        {errors.smoking ? (
          <p className={errorClass}>{errors.smoking.message}</p>
        ) : null}
      </div>

      <div>
        <label className={labelClass} htmlFor="pf-drinking">
          Drinking *
        </label>
        <select id="pf-drinking" {...register("drinking")} className={selectClass}>
          <option value="">Select</option>
          {hasCustomDrinkingOption ? (
            <option value={selectedDrinking}>{selectedDrinking}</option>
          ) : null}
          {drinkingOptions.map((drinking) => (
            <option key={drinking} value={drinking}>
              {drinking}
            </option>
          ))}
        </select>
        {errors.drinking ? (
          <p className={errorClass}>{errors.drinking.message}</p>
        ) : null}
      </div>

      <div>
        <label className={labelClass} htmlFor="pf-hobbies">
          Hobbies
        </label>
        <select id="pf-hobbies" {...register("hobbies")} className={selectClass}>
          <option value="">Select</option>
          {hasCustomHobbiesOption ? (
            <option value={selectedHobbies}>{selectedHobbies}</option>
          ) : null}
          {hobbiesOptions.map((hobby) => (
            <option key={hobby} value={hobby}>
              {hobby}
            </option>
          ))}
        </select>
        {errors.hobbies ? (
          <p className={errorClass}>{errors.hobbies.message}</p>
        ) : null}
      </div>

      <div>
        <label className={labelClass} htmlFor="pf-physicalActivity">
          Physical Activity
        </label>
        <select
          id="pf-physicalActivity"
          {...register("physicalActivity")}
          className={selectClass}
        >
          <option value="">Select</option>
          {hasCustomPhysicalActivityOption ? (
            <option value={selectedPhysicalActivity}>
              {selectedPhysicalActivity}
            </option>
          ) : null}
          {physicalActivityOptions.map((activity) => (
            <option key={activity} value={activity}>
              {activity}
            </option>
          ))}
        </select>
        {errors.physicalActivity ? (
          <p className={errorClass}>{errors.physicalActivity.message}</p>
        ) : null}
      </div>

      <div>
        <label className={labelClass} htmlFor="pf-personalityType">
          Personality Type
        </label>
        <select
          id="pf-personalityType"
          {...register("personalityType")}
          className={selectClass}
        >
          <option value="">Select</option>
          {hasCustomPersonalityTypeOption ? (
            <option value={selectedPersonalityType}>
              {selectedPersonalityType}
            </option>
          ) : null}
          {personalityTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.personalityType ? (
          <p className={errorClass}>{errors.personalityType.message}</p>
        ) : null}
      </div>
    </div>
  );

  const renderPartnerPreferences = () => (
    <div className="space-y-8">
      <section>
        <h3 className="mb-5 border-b border-gray-100 pb-3 text-base font-display font-semibold text-gray-900">
          Basic Preferences
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="pf-pref-age-min">
              Minimum Age
            </label>
            <input
              id="pf-pref-age-min"
              type="number"
              min={18}
              max={100}
              {...register("preference.ageMin", { setValueAs: toNullableNumber })}
              className={inputClass}
              placeholder="24"
            />
            {errors.preference?.ageMin ? (
              <p className={errorClass}>{errors.preference.ageMin.message}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-pref-age-max">
              Maximum Age
            </label>
            <input
              id="pf-pref-age-max"
              type="number"
              min={18}
              max={100}
              {...register("preference.ageMax", { setValueAs: toNullableNumber })}
              className={inputClass}
              placeholder="32"
            />
            {errors.preference?.ageMax ? (
              <p className={errorClass}>{errors.preference.ageMax.message}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-pref-height-min">
              Minimum Height (cm)
            </label>
            <input
              id="pf-pref-height-min"
              type="number"
              min={100}
              max={250}
              {...register("preference.heightMin", { setValueAs: toNullableNumber })}
              className={inputClass}
              placeholder="155"
            />
            {errors.preference?.heightMin ? (
              <p className={errorClass}>{errors.preference.heightMin.message}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-pref-height-max">
              Maximum Height (cm)
            </label>
            <input
              id="pf-pref-height-max"
              type="number"
              min={100}
              max={250}
              {...register("preference.heightMax", { setValueAs: toNullableNumber })}
              className={inputClass}
              placeholder="185"
            />
            {errors.preference?.heightMax ? (
              <p className={errorClass}>{errors.preference.heightMax.message}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-pref-marital-status">
              Marital Status
            </label>
            <select
              id="pf-pref-marital-status"
              {...register("preference.maritalStatus", {
                setValueAs: toNullableValue,
              })}
              className={selectClass}
            >
              <option value="">Any</option>
              {Object.entries(MARITAL_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.preference?.maritalStatus ? (
              <p className={errorClass}>
                {errors.preference.maritalStatus.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-pref-location">
              Preferred Location
            </label>
            <input
              id="pf-pref-location"
              type="text"
              {...register("preference.location", {
                setValueAs: toNullableValue,
              })}
              className={inputClass}
              placeholder="City, state, or country"
            />
            {errors.preference?.location ? (
              <p className={errorClass}>{errors.preference.location.message}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-5 border-b border-gray-100 pb-3 text-base font-display font-semibold text-gray-900">
          Community & Lifestyle
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="pf-pref-religion">
              Religion
            </label>
            <select
              id="pf-pref-religion"
              {...register("preference.religion", {
                setValueAs: toNullableValue,
              })}
              className={selectClass}
            >
              <option value="">Any</option>
              {partnerPreferenceReligionOptions.map((religion) => (
                <option key={religion} value={religion}>
                  {religion}
                </option>
              ))}
            </select>
            {errors.preference?.religion ? (
              <p className={errorClass}>{errors.preference.religion.message}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-pref-caste">
              Caste
            </label>
            <input
              id="pf-pref-caste"
              type="text"
              {...register("preference.caste", {
                setValueAs: toNullableValue,
              })}
              className={inputClass}
              placeholder="Optional"
            />
            {errors.preference?.caste ? (
              <p className={errorClass}>{errors.preference.caste.message}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-pref-language">
              Mother Tongue
            </label>
            <select
              id="pf-pref-language"
              {...register("preference.language", {
                setValueAs: toNullableValue,
              })}
              className={selectClass}
            >
              <option value="">Any</option>
              {selectedPreferenceLanguage &&
              !MOTHER_TONGUE_OPTIONS.some(
                (option) => option.value === selectedPreferenceLanguage
              ) ? (
                <option value={selectedPreferenceLanguage}>
                  {selectedPreferenceLanguage}
                </option>
              ) : null}
              {MOTHER_TONGUE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.preference?.language ? (
              <p className={errorClass}>{errors.preference.language.message}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-pref-education">
              Education
            </label>
            <input
              id="pf-pref-education"
              type="text"
              {...register("preference.education", {
                setValueAs: toNullableValue,
              })}
              className={inputClass}
              placeholder="Graduate, MBA, B.Tech..."
            />
            {errors.preference?.education ? (
              <p className={errorClass}>
                {errors.preference.education.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="pf-pref-profession">
              Profession
            </label>
            <input
              id="pf-pref-profession"
              type="text"
              {...register("preference.profession", {
                setValueAs: toNullableValue,
              })}
              className={inputClass}
              placeholder="Doctor, engineer, business..."
            />
            {errors.preference?.profession ? (
              <p className={errorClass}>
                {errors.preference.profession.message}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );

  const renderPhotoUploads = () => (
    <div className="space-y-5">
      <div
        className={`grid gap-8 ${
          shouldShowHoroscopeStep ? "lg:grid-cols-2" : "lg:grid-cols-1"
        }`}
      >
        <div className="space-y-6">
          <Controller
            name="profileImage"
            control={control}
            render={({ field }) => (
              <ImageUpload
                label="Profile Picture *"
                value={field.value}
                onChange={field.onChange}
                onRemove={() => field.onChange(null)}
                error={errors.profileImage?.message}
              />
            )}
          />

          <Controller
            name="additionalPhotoUrls"
            control={control}
            render={({ field }) => (
              <MultiImageUpload
                label="More Photos"
                values={field.value ?? []}
                onChange={field.onChange}
                helperText="Upload up to 4 more photos. Your profile picture stays separate as the main image."
                error={errors.additionalPhotoUrls?.message}
              />
            )}
          />
        </div>

        {shouldShowHoroscopeStep ? (
          <Controller
            name="horoscopeImage"
            control={control}
            render={({ field }) => (
              <ImageUpload
                label="Horoscope Image *"
                value={field.value}
                onChange={field.onChange}
                onRemove={() => field.onChange(null)}
                error={errors.horoscopeImage?.message}
              />
            )}
          />
        ) : null}
      </div>

      <p className="text-sm text-gray-500">
        You can upload photos now and update them later anytime from Edit Profile.
      </p>
    </div>
  );

  const renderCreateStepContent = () => {
    switch (currentCreateStep.id) {
      case "personal":
        return renderPersonalInformation();
      case "family":
        return renderFamilyDetails();
      case "education":
        return renderEducationCareer();
      case "cultural":
        return renderCulturalBackground();
      case "horoscope":
        return renderHoroscope();
      case "lifestyle":
        return renderLifestyle();
      case "photos":
        return renderPhotoUploads();
      default:
        return renderPersonalInformation();
    }
  };

  return (
    <>
    <form onSubmit={handleFormSubmit} className="space-y-8">
      {!isEdit ? (
        <>
          <div className="ui-card-lift-soft overflow-hidden rounded-[16px] border border-rose-100 bg-white shadow-[0_24px_72px_rgba(15,23,42,0.06)]">
            <div className="grid xl:grid-cols-[290px_minmax(0,1fr)]">
              <aside className="border-b border-gray-100 bg-[linear-gradient(180deg,#fffdfd_0%,#fff7fa_100%)] p-6 sm:p-7 xl:border-b-0 xl:border-r xl:p-8">
                <div className="ui-card-lift-soft bg-white/85 p-5 backdrop-blur-sm">
                  <h2 className="whitespace-nowrap text-[1.15rem] font-semibold text-gray-900">
                    Complete Your Profile
                  </h2>
                  <div className="mt-4 text-[2.15rem] font-display font-bold leading-none text-rose-600">
                    {completionPercentage}%
                  </div>
                  <div className="-mx-3 mt-4 h-2 overflow-hidden rounded-full bg-rose-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-gray-500">
                    {completedStepCount} of {activeCreateProfileSteps.length} sections completed
                  </p>
                </div>

                <div className="relative mt-3 space-y-4">
                  <div className="pointer-events-none absolute bottom-[18px] left-[18px] top-[18px] z-0 w-px -translate-x-1/2 bg-gradient-to-b from-rose-200 via-rose-100 to-gray-200" />
                  {activeCreateProfileSteps.map((step, index) => {
                    const isCurrent = index === currentStep;
                    const isCompleted = index < currentStep;

                    return (
                      <div key={step.title} className="relative z-10 flex items-start gap-4">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all ${
                            isCurrent
                              ? "border-transparent bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-sm"
                              : isCompleted
                                ? "border-rose-200 bg-rose-50 text-rose-600"
                                : "border-gray-200 bg-white text-gray-500"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-semibold ${
                              isCurrent ? "text-rose-600" : "text-gray-900"
                            }`}
                          >
                            {step.title}
                          </p>
                          <p className="mt-1 text-[13px] leading-5 text-gray-500">
                            {step.sidebarDescription}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="ui-card-lift-soft mt-8 rounded-[12px] border border-rose-100 bg-[linear-gradient(135deg,#fff9fb_0%,#fff1f5_100%)] p-5 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">Need Help?</p>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    We&apos;re here to assist you at every step.
                  </p>
                  <Link
                    href="/contact"
                    className="ui-link-shift mt-4 inline-flex items-center text-sm font-semibold text-rose-600 transition-colors hover:text-rose-700"
                  >
                    Contact Support
                  </Link>
                </div>
              </aside>

              <div className="bg-white p-6 sm:p-7 xl:p-8">
                <div className="ui-card-lift-soft rounded-[14px] border border-gray-100 bg-[linear-gradient(180deg,#ffffff_0%,#fffdfd_100%)] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.04)] sm:p-7 lg:p-8">
                  <div className="ui-soft-float mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500 ring-1 ring-rose-100">
                    <CurrentCreateStepIcon className="h-8 w-8" />
                  </div>

                  <div className="mt-5 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">
                      Stage {currentStep + 1} of {activeCreateProfileSteps.length}
                    </p>
                    <h2 className="mt-3 font-display text-[1.9rem] font-bold text-gray-900">
                      {currentCreateStep.title}
                    </h2>
                    <p className="mt-2 text-base text-gray-500">
                      {currentCreateStep.panelDescription}
                    </p>
                  </div>

                  <div className="mt-8">{renderCreateStepContent()}</div>

                  <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleSaveAndExit}
                        className="ui-link-shift inline-flex items-center justify-center rounded-xl border border-rose-200 px-6 py-3 text-sm font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
                      >
                        Save & Exit
                      </button>

                      {currentStep > 0 ? (
                        <button
                          type="button"
                          onClick={handlePreviousStep}
                          className="ui-link-shift inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-rose-200 hover:text-rose-600"
                        >
                          <ArrowLeft className="ui-arrow-shift h-4 w-4" />
                          Back
                        </button>
                      ) : null}
                    </div>

                    {!isLastCreateStep ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="ui-link-shift inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(244,63,94,0.28)] transition-all hover:shadow-[0_18px_40px_rgba(244,63,94,0.34)]"
                      >
                        Save & Continue
                        <ArrowRight className="ui-arrow-shift h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCreateProfile}
                        disabled={isSubmitting}
                        className="ui-link-shift inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(244,63,94,0.28)] transition-all hover:shadow-[0_18px_40px_rgba(244,63,94,0.34)] disabled:opacity-70"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Create Profile
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="ui-card-lift-soft rounded-[12px] border border-rose-100 bg-[linear-gradient(135deg,#fff7fa_0%,#fff1f6_100%)] px-5 py-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="ui-icon-lift flex h-12 w-12 items-center justify-center rounded-xl bg-white text-rose-500 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Your information is safe and secure with us.
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  We don&apos;t share your details with anyone.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {displayProfileUserId ? (
            <div
              className="ui-enter-up rounded-2xl border border-rose-100 bg-[linear-gradient(135deg,#fff7fa_0%,#ffffff_100%)] p-5 shadow-sm"
              style={{ animationDelay: "20ms", animationFillMode: "forwards" }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
                    Your User ID
                  </p>
                  <p className="mt-2 font-mono text-2xl font-bold tracking-[0.08em] text-gray-900">
                    {displayProfileUserId}
                  </p>
                </div>
                <p className="max-w-md text-sm leading-6 text-gray-500">
                  This ID is generated automatically and cannot be edited.
                </p>
              </div>
            </div>
          ) : null}

          <SectionBlock
            title="Personal Information"
            description="Update your basic and address details."
            delayMs={40}
          >
            {renderPersonalInformation()}
          </SectionBlock>

          <SectionBlock
            title="Family Details"
            description="Update your parents and family background details."
            delayMs={110}
          >
            {renderFamilyDetails()}
          </SectionBlock>

          <SectionBlock
            title="Education & Career Information"
            description="Keep your education and profession details current."
            delayMs={180}
          >
            {renderEducationCareer()}
          </SectionBlock>

          <SectionBlock
            title="Cultural Background"
            description="Edit your religion, mother tongue, caste, and sub caste details."
            delayMs={250}
          >
            {renderCulturalBackground()}
          </SectionBlock>

          {shouldShowHoroscopeStep ? (
            <SectionBlock
              title="Horoscope"
              description="Update your astrology details if you use them."
              delayMs={320}
            >
              {renderHoroscope()}
            </SectionBlock>
          ) : null}

          <SectionBlock
            title="Lifestyle"
            description="Share your food and habit preferences."
            delayMs={390}
          >
            {renderLifestyle()}
          </SectionBlock>

          <SectionBlock
            title="Partner Preferences"
            description="Add the partner details you want to see in your match suggestions."
            delayMs={460}
          >
            {renderPartnerPreferences()}
          </SectionBlock>

          <SectionBlock
            title="Add Photos"
            description={
              shouldShowHoroscopeStep
                ? "Manage your profile and horoscope images."
                : "Manage your profile image."
            }
            delayMs={530}
          >
            {renderPhotoUploads()}
          </SectionBlock>
        </>
      )}

      {isEdit ? (
        <div
          className="ui-enter-up flex flex-col gap-3 border-t border-gray-100 pt-2 sm:flex-row sm:justify-start"
          style={{ animationDelay: "600ms", animationFillMode: "forwards" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary ui-link-shift flex items-center justify-center gap-2 px-8 py-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </form>

      {createdProfileSuccess && typeof document !== "undefined"
        ? createPortal(
            <ProfileCreatedSuccessModal
              fullName={createdProfileSuccess.fullName}
              profileUserId={createdProfileSuccess.profileUserId}
              onContinue={handleProfileSuccessContinue}
            />,
            document.body
          )
        : null}
    </>
  );
}
