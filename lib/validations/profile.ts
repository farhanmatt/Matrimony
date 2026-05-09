import { z } from "zod";

const optionalText = (max: number) => z.string().max(max).optional().nullable();
const optionalPhone = z
  .string()
  .refine(
    (value) => value === "" || /^[+]?[0-9\s-]{10,20}$/.test(value),
    {
      message: "Enter a valid phone number",
    }
  )
  .optional()
  .nullable();
const optionalPincode = z
  .string()
  .refine((value) => value === "" || /^\d{6}$/.test(value), {
    message: "Pincode must be 6 digits",
  })
  .optional()
  .nullable();

export const profileSchema = z.object({
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

export type ProfileInput = z.infer<typeof profileSchema>;
export type PreferenceInput = z.infer<typeof preferenceSchema>;
