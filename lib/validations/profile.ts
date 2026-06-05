import { z } from "zod";

const optionalText = (max: number) => z.string().max(max).optional().nullable();
const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
const requiredNullableText = (label: string, max: number) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) {
        return "";
      }

      return value;
    },
    z
      .string()
      .trim()
      .min(1, `${label} is required`)
      .max(max, `${label} must be ${max} characters or fewer`)
  );
const optionalPhone = z
  .string()
  .refine((value) => value === "" || /^\d{10}$/.test(value), {
    message: "Phone number must be exactly 10 digits",
  })
  .optional()
  .nullable();
const optionalPincode = z
  .string()
  .refine((value) => value === "" || /^\d{6}$/.test(value), {
    message: "Pincode must be 6 digits",
  })
  .optional()
  .nullable();

function parseDateInput(value: string) {
  const trimmedValue = value.trim();
  const isoMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const localMatch = trimmedValue.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

  if (!isoMatch && !localMatch) {
    return null;
  }

  const year = Number(isoMatch?.[1] ?? localMatch?.[3]);
  const month = Number(isoMatch?.[2] ?? localMatch?.[2]);
  const day = Number(isoMatch?.[3] ?? localMatch?.[1]);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getAgeFromDateOfBirth(dateOfBirth: Date) {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDifference = today.getMonth() - dateOfBirth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function getProfileAgeValidationMessage(
  gender: "MALE" | "FEMALE" | "OTHER" | "" | null | undefined,
  dateOfBirth: string | null | undefined
) {
  const normalizedDateOfBirth = dateOfBirth?.trim() ?? "";

  if (!normalizedDateOfBirth) {
    return null;
  }

  const parsedDateOfBirth = parseDateInput(normalizedDateOfBirth);

  if (!parsedDateOfBirth) {
    return "Date of birth must be a valid date";
  }

  if (parsedDateOfBirth > new Date()) {
    return "Date of birth cannot be in the future";
  }

  const age = getAgeFromDateOfBirth(parsedDateOfBirth);

  if (gender === "MALE" && age < 21) {
    return "Male users must be at least 21 years old to create a profile.";
  }

  if (gender === "FEMALE" && age < 18) {
    return "Female users must be at least 18 years old to create a profile.";
  }

  return null;
}

function validateMinimumProfileAge(
  data: {
    gender: "MALE" | "FEMALE" | "OTHER";
    dateOfBirth: string;
  },
  ctx: z.RefinementCtx
) {
  const ageValidationMessage = getProfileAgeValidationMessage(
    data.gender,
    data.dateOfBirth
  );

  if (ageValidationMessage) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: ageValidationMessage,
      path: ["dateOfBirth"],
    });
  }
}

function hasRequiredTextValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateHinduHoroscopeRequirements(
  data: {
    religion?: string | null;
    star?: string | null;
    rasi?: string | null;
    timeOfBirth?: string | null;
    placeOfBirth?: string | null;
  },
  ctx: z.RefinementCtx
) {
  if (data.religion?.trim().toLowerCase() !== "hindu") {
    return;
  }

  if (!hasRequiredTextValue(data.star)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Nakshatra is required for Hindu users",
      path: ["star"],
    });
  }

  if (!hasRequiredTextValue(data.rasi)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Rasi is required for Hindu users",
      path: ["rasi"],
    });
  }

  if (!hasRequiredTextValue(data.timeOfBirth)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Time of birth is required for Hindu users",
      path: ["timeOfBirth"],
    });
  }

  if (!hasRequiredTextValue(data.placeOfBirth)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Place of birth is required for Hindu users",
      path: ["placeOfBirth"],
    });
  }
}

function validateRequiredPhotoUploads(
  data: {
    religion?: string | null;
    profileImage?: string | null;
    horoscopeImage?: string | null;
  },
  ctx: z.RefinementCtx
) {
  if (!hasRequiredTextValue(data.profileImage)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Profile picture is required",
      path: ["profileImage"],
    });
  }

  if (
    data.religion?.trim().toLowerCase() === "hindu" &&
    !hasRequiredTextValue(data.horoscopeImage)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Horoscope image is required for Hindu users",
      path: ["horoscopeImage"],
    });
  }
}

const baseProfileSchema = z.object({
  // Personal
  fullName: z.string().min(2, "Full name is required").max(100),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  height: z.number().min(100).max(250).optional().nullable(),
  maritalStatus: z.enum([
    "NEVER_MARRIED",
    "DIVORCED",
    "WIDOWED",
    "SEPARATED",
    "AWAITING_DIVORCE",
  ]),
  phone: optionalPhone,
  education: z.string().max(200).optional().nullable(),
  course: z.string().max(200).optional().nullable(),
  profession: z.string().max(200).optional().nullable(),
  employedIn: z.string().max(200).optional().nullable(),
  income: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  country: z.string().max(100).default("India"),
  bio: z.string().max(2000).optional().nullable(),

  // Address
  houseNumber: optionalText(50),
  streetName: optionalText(200),
  state: optionalText(100),
  city: optionalText(100),
  pincode: optionalPincode,

  // Family
  fatherName: z.string().max(100).optional().nullable(),
  motherName: z.string().max(100).optional().nullable(),
  familyType: z
    .enum(["NUCLEAR", "JOINT", "EXTENDED"])
    .optional()
    .nullable(),
  familyStatus: z
    .enum(["MIDDLE_CLASS", "UPPER_MIDDLE_CLASS", "RICH", "AFFLUENT"])
    .optional()
    .nullable(),
  siblings: z.number().min(0).max(20).optional().nullable(),

  // Religious
  religion: z.string().max(100).optional().nullable(),
  caste: z.string().max(100).optional().nullable(),
  subCaste: z.string().max(100).optional().nullable(),
  language: z.string().max(100).optional().nullable(),
  star: z.string().max(100).optional().nullable(),
  rasi: z.string().max(100).optional().nullable(),
  timeOfBirth: z.string().max(20).optional().nullable(),
  placeOfBirth: z.string().max(200).optional().nullable(),

  // Lifestyle
  diet: z.string().max(50).optional().nullable(),
  smoking: z.string().max(50).optional().nullable(),
  drinking: z.string().max(50).optional().nullable(),
  hobbies: z.string().max(100).optional().nullable(),
  physicalActivity: z.string().max(100).optional().nullable(),
  personalityType: z.string().max(100).optional().nullable(),
  exercise: z.string().max(50).optional().nullable(),
  profileImage: z.string().url("Invalid profile image URL").optional().nullable(),
  additionalPhotoUrls: z
    .array(z.string().url("Invalid additional photo URL"))
    .max(4, "You can upload up to 4 additional photos")
    .optional()
    .default([]),
  horoscopeImage: z.string().url("Invalid horoscope image URL").optional().nullable(),
});

export const profileSchema = baseProfileSchema.superRefine(
  validateMinimumProfileAge
);

export const preferenceSchema = z.object({
  ageMin: z.number().min(18).max(100).optional().nullable(),
  ageMax: z.number().min(18).max(100).optional().nullable(),
  heightMin: z.number().min(100).max(250).optional().nullable(),
  heightMax: z.number().min(100).max(250).optional().nullable(),
  religion: z.string().max(100).optional().nullable(),
  caste: z.string().max(100).optional().nullable(),
  education: z.string().max(200).optional().nullable(),
  profession: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  maritalStatus: z.string().max(100).optional().nullable(),
  language: z.string().max(100).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.ageMin && data.ageMax && data.ageMin > data.ageMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum age cannot be greater than maximum age",
      path: ["ageMin"],
    });
  }

  if (data.heightMin && data.heightMax && data.heightMin > data.heightMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum height cannot be greater than maximum height",
      path: ["heightMin"],
    });
  }
});

export const profileFormSchema = baseProfileSchema.extend({
  education: requiredNullableText("Higher education", 200),
  course: requiredNullableText("Course", 200),
  profession: requiredNullableText("Occupation", 200),
  employedIn: requiredNullableText("Employment type", 200),
  income: requiredNullableText("Annual income", 100),
  religion: requiredNullableText("Religion", 100),
  caste: requiredNullableText("Caste", 100),
  language: requiredNullableText("Mother tongue", 100),
  diet: requiredNullableText("Diet", 50),
  smoking: requiredNullableText("Smoking", 50),
  drinking: requiredNullableText("Drinking", 50),
  fatherName: requiredText("Father's name", 100),
  motherName: requiredText("Mother's name", 100),
  familyType: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["NUCLEAR", "JOINT", "EXTENDED"], {
      required_error: "Family type is required",
      invalid_type_error: "Family type is required",
    })
  ),
  familyStatus: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["MIDDLE_CLASS", "UPPER_MIDDLE_CLASS", "RICH", "AFFLUENT"], {
      required_error: "Family status is required",
      invalid_type_error: "Family status is required",
    })
  ),
  siblings: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z
      .number({
        required_error: "Number of siblings is required",
        invalid_type_error: "Number of siblings is required",
      })
      .min(0, "Number of siblings cannot be negative")
      .max(20, "Number of siblings cannot be more than 20")
  ),
  preference: preferenceSchema.optional(),
})
  .superRefine(validateMinimumProfileAge)
  .superRefine(validateHinduHoroscopeRequirements)
  .superRefine(validateRequiredPhotoUploads);

export type ProfileInput = z.infer<typeof profileSchema>;
export type PreferenceInput = z.infer<typeof preferenceSchema>;
export type ProfileFormInput = z.infer<typeof profileFormSchema>;
