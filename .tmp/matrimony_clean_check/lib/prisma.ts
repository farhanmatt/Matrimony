import "server-only";
import { createRequire } from "module";
import type { PrismaClient as PrismaClientInstance } from "@prisma/client";

const require = createRequire(import.meta.url);
const prismaClientModule = require("@prisma/client") as typeof import("@prisma/client");
const { Prisma, PrismaClient } = prismaClientModule;

if (!process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED) {
  // Keep application traffic on DATABASE_URL when it's configured.
  // Fall back to the direct URL only if a pooled runtime URL is missing.
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientInstance | undefined;
};

function createPrismaClient(): PrismaClientInstance {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

function toDelegateKey(modelName: string) {
  return `${modelName[0].toLowerCase()}${modelName.slice(1)}`;
}

function matchesGeneratedSchema(client: PrismaClientInstance | undefined) {
  if (!client) {
    return false;
  }

  return Object.values(Prisma.ModelName).every((modelName) => {
    const delegate = ((client as unknown) as Record<string, unknown>)[
      toDelegateKey(modelName)
    ];

    return typeof delegate === "object" && delegate !== null;
  });
}

export function getPrismaClient(): PrismaClientInstance {
  const cachedClient = globalForPrisma.prisma;

  if (cachedClient && matchesGeneratedSchema(cachedClient)) {
    return cachedClient;
  }

  if (cachedClient) {
    void cachedClient.$disconnect().catch(() => {});
  }

  const nextClient = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = nextClient;
  }

  return nextClient;
}

const prisma: PrismaClientInstance = getPrismaClient();

export { prisma };
