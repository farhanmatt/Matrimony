import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { getPrismaClient } from "@/lib/prisma";

export const REGISTRATION_OTP_COOKIE_NAME = "vivah-registration-otp";
export const REGISTRATION_OTP_SESSION_TTL_MINUTES = 30;
export const REGISTRATION_OTP_CODE_TTL_MINUTES = 2;
export const REGISTRATION_OTP_MAX_ATTEMPTS = 5;



const REGISTRATION_OTP_SESSION_TTL_MS =
  REGISTRATION_OTP_SESSION_TTL_MINUTES * 60 * 1000;
const REGISTRATION_OTP_CODE_TTL_MS =
  REGISTRATION_OTP_CODE_TTL_MINUTES * 60 * 1000;

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createRegistrationSessionToken() {
  const token = crypto.randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: sha256(token),
  };
}

export function createRegistrationVerificationCode() {
  return crypto.randomInt(100000, 1_000_000).toString();
}

export function getRegistrationSessionExpiry() {
  return new Date(Date.now() + REGISTRATION_OTP_SESSION_TTL_MS);
}

export function getRegistrationCodeExpiry() {
  return new Date(Date.now() + REGISTRATION_OTP_CODE_TTL_MS);
}

export function getRegistrationCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export function getExpiredRegistrationCookieOptions() {
  return {
    ...getRegistrationCookieOptions(new Date(0)),
    maxAge: 0,
  };
}

export async function getRegistrationSessionTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(REGISTRATION_OTP_COOKIE_NAME)?.value?.trim() || null;
}

async function findPendingRegistrationBySessionToken(sessionToken: string) {
  const prisma = getPrismaClient();

  return prisma.pendingRegistration.findUnique({
    where: { sessionTokenHash: sha256(sessionToken) },
  });
}

export async function getPendingRegistrationFromCookies() {
  const sessionToken = await getRegistrationSessionTokenFromCookies();

  if (!sessionToken) {
    return null;
  }

  const pendingRegistration =
    await findPendingRegistrationBySessionToken(sessionToken);

  if (!pendingRegistration) {
    return null;
  }

  if (pendingRegistration.expiresAt <= new Date()) {
    const prisma = getPrismaClient();

    await prisma.pendingRegistration
      .delete({ where: { id: pendingRegistration.id } })
      .catch(() => {});
    return null;
  }

  return pendingRegistration;
}
