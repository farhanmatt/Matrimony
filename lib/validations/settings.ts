import { z } from "zod";
import { deleteAccountReasonOptions } from "@/lib/constants/delete-account";

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain uppercase, lowercase, and a number"
  );

export const accountSettingsSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    currentPassword: z.string().max(200).optional().nullable(),
    newPassword: z.string().max(200).optional().nullable(),
    confirmPassword: z.string().max(200).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const wantsPasswordChange = Boolean(
      data.currentPassword || data.newPassword || data.confirmPassword
    );

    if (!wantsPasswordChange) return;

    if (!data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New password is required",
        path: ["newPassword"],
      });
      return;
    }

    const passwordResult = passwordRule.safeParse(data.newPassword);
    if (!passwordResult.success) {
      for (const issue of passwordResult.error.issues) {
        ctx.addIssue({ ...issue, path: ["newPassword"] });
      }
    }

    if (!data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please confirm your new password",
        path: ["confirmPassword"],
      });
    } else if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export type AccountSettingsInput = z.infer<typeof accountSettingsSchema>;

export const deleteAccountSchema = z
  .object({
    deletionReason: z.enum(deleteAccountReasonOptions, {
      errorMap: () => ({ message: "Please select a reason for deleting your account" }),
    }),
    currentPassword: z.string().max(200).optional().nullable(),
  });

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
