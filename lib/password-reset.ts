import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/prisma";

export const PASSWORD_RESET_COOKIE_NAME = "vivah-password-reset";
export const PASSWORD_RESET_SESSION_TTL_MINUTES = 30;
export const PASSWORD_RESET_CODE_TTL_MINUTES = 2;
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;

const PASSWORD_RESET_SESSION_TTL_MS =
  PASSWORD_RESET_SESSION_TTL_MINUTES * 60 * 1000;

const passwordResetRequestWithUser = {
  user: {
    select: {
      id: true,
      email: true,
      emailVerified: true,
      name: true,
      password: true,
    },
  },
} satisfies Prisma.PasswordResetRequestInclude;

export type PasswordResetRequestWithUser =
  Prisma.PasswordResetRequestGetPayload<{
    include: typeof passwordResetRequestWithUser;
  }>;

export function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createPasswordResetSessionToken() {
  const token = crypto.randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: sha256(token),
  };
}

export function createPasswordResetVerificationCode() {
  return crypto.randomInt(100000, 1_000_000).toString();
}

export function getPasswordResetSessionExpiry() {
  return new Date(Date.now() + PASSWORD_RESET_SESSION_TTL_MS);
}

export function getPasswordResetCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export function getExpiredPasswordResetCookieOptions() {
  return {
    ...getPasswordResetCookieOptions(new Date(0)),
    maxAge: 0,
  };
}

export async function getPasswordResetSessionTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(PASSWORD_RESET_COOKIE_NAME)?.value?.trim() || null;
}

async function findPasswordResetRequestBySessionToken(sessionToken: string) {
  const prisma = getPrismaClient();

  return prisma.passwordResetRequest.findUnique({
    where: { sessionTokenHash: sha256(sessionToken) },
    include: passwordResetRequestWithUser,
  });
}

export async function getPasswordResetRequestFromCookies() {
  const sessionToken = await getPasswordResetSessionTokenFromCookies();

  if (!sessionToken) {
    return null;
  }

  const request = await findPasswordResetRequestBySessionToken(sessionToken);

  if (!request) {
    return null;
  }

  if (request.expiresAt <= new Date()) {
    const prisma = getPrismaClient();

    await prisma.passwordResetRequest
      .delete({ where: { id: request.id } })
      .catch(() => {});
    return null;
  }

  return request;
}
