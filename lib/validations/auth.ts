import { z } from "zod";

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain uppercase, lowercase, and a number"
  );

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Please enter a valid email address"),
    password: passwordRule,
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
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),
});

export const forgotPasswordNewPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),
  password: passwordRule,
});

export const forgotPasswordVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type ForgotPasswordEmailInput = z.infer<typeof forgotPasswordEmailSchema>;
export type ForgotPasswordNewPasswordInput = z.infer<
  typeof forgotPasswordNewPasswordSchema
>;
export type ForgotPasswordVerificationInput = z.infer<
  typeof forgotPasswordVerificationSchema
>;
