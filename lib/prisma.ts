import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED) {
  // Keep application traffic on DATABASE_URL when it's configured.
  // Fall back to the direct URL only if a pooled runtime URL is missing.
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
