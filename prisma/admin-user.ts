import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const ADMIN_EMAIL = "admin@matrimony.com";
export const ADMIN_PASSWORD = "Matt@4321admin";
export const ADMIN_NAME = "Admin User";

function normalizeAdminIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

export function isDefaultAdminIdentifier(identifier: string) {
  const normalizedIdentifier = normalizeAdminIdentifier(identifier);

  return (
    normalizedIdentifier === normalizeAdminIdentifier(ADMIN_EMAIL) ||
    normalizedIdentifier === normalizeAdminIdentifier(ADMIN_NAME)
  );
}

export async function upsertAdminUser(prisma: PrismaClient) {
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  return prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
}
