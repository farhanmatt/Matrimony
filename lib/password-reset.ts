import { randomInt } from "node:crypto";

export const PASSWORD_RESET_CODE_LENGTH = 6;
export const PASSWORD_RESET_EXPIRES_MINUTES = 15;

export type PasswordResetTokenPayload = {
  codeHash: string;
  passwordHash: string;
};

export function normalizePasswordResetEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getPasswordResetIdentifier(email: string) {
  return `password-reset:${normalizePasswordResetEmail(email)}`;
}

export function generatePasswordResetCode() {
  const min = 10 ** (PASSWORD_RESET_CODE_LENGTH - 1);
  const max = 10 ** PASSWORD_RESET_CODE_LENGTH;

  return String(randomInt(min, max));
}

export function getPasswordResetExpiryDate() {
  return new Date(Date.now() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);
}

export function encodePasswordResetToken(payload: PasswordResetTokenPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodePasswordResetToken(token: string) {
  try {
    const parsed = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8")
    ) as Partial<PasswordResetTokenPayload>;

    if (
      typeof parsed.codeHash !== "string" ||
      typeof parsed.passwordHash !== "string"
    ) {
      return null;
    }

    return {
      codeHash: parsed.codeHash,
      passwordHash: parsed.passwordHash,
    };
  } catch {
    return null;
  }
}
