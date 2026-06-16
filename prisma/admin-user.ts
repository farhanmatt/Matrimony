import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  normalizeEmailIdentifier,
  normalizeNameLookup,
} from "@/lib/utils/user-identity";

export const ADMIN_EMAIL = "admin@matrimony.com";
export const ADMIN_PASSWORD = "Matt@4321admin";
export const ADMIN_NAME = "Admin User";

function normalizeAdminIdentifier(identifier: string) {
  return normalizeEmailIdentifier(identifier);
}

export function isDefaultAdminIdentifier(identifier: string) {
  const normalizedIdentifier = normalizeAdminIdentifier(identifier);

  return (
    normalizedIdentifier === normalizeAdminIdentifier(ADMIN_EMAIL) ||
    normalizedIdentifier === normalizeAdminIdentifier(ADMIN_NAME)
  );
}

export function isDefaultAdminCredentials(identifier: string, password: string) {
  return isDefaultAdminIdentifier(identifier) && password === ADMIN_PASSWORD;
}

export async function upsertAdminUser(prisma: PrismaClient) {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });
  const normalizedAdminNameLookup = normalizeNameLookup(ADMIN_NAME);
  const existingPasswordMatches =
    existingAdmin?.password
      ? await bcrypt.compare(ADMIN_PASSWORD, existingAdmin.password)
      : false;

  if (
    existingAdmin &&
    existingAdmin.role === "ADMIN" &&
    existingAdmin.name === ADMIN_NAME &&
    existingAdmin.nameLookup === normalizedAdminNameLookup &&
    existingAdmin.emailVerified &&
    existingPasswordMatches
  ) {
    return existingAdmin;
  }

  const hashedPassword =
    existingPasswordMatches && existingAdmin?.password
      ? existingAdmin.password
      : await bcrypt.hash(ADMIN_PASSWORD, 12);

  return prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      nameLookup: normalizedAdminNameLookup,
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
    create: {
      name: ADMIN_NAME,
      nameLookup: normalizedAdminNameLookup,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
}
