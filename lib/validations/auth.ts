import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain uppercase, lowercase, and a number"
  );

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Email or name is required"),
  password: z.string().min(1, "Password is required"),
});

export const adminLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Admin email or name is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordEmailSchema = z.object({
  email: emailSchema,
});

export const forgotPasswordPasswordSchema = z.object({
  password: passwordSchema,
});

export const forgotPasswordVerificationSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});

export const registrationOtpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit OTP"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type ForgotPasswordEmailInput = z.infer<typeof forgotPasswordEmailSchema>;
export type ForgotPasswordPasswordInput = z.infer<typeof forgotPasswordPasswordSchema>;
export type ForgotPasswordVerificationInput = z.infer<typeof forgotPasswordVerificationSchema>;
export type RegistrationOtpInput = z.infer<typeof registrationOtpSchema>;
