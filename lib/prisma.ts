import "server-only";
import path from "path";
import { createRequire } from "module";
import type { PrismaClient as PrismaClientInstance } from "@prisma/client";

const require = createRequire(import.meta.url);

function clearPrismaModuleCache() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const cache = (require as NodeJS.Require).cache ?? {};
  const prismaClientPathFragment = `${path.sep}node_modules${path.sep}@prisma${path.sep}client${path.sep}`;
  const generatedClientPathFragment = `${path.sep}node_modules${path.sep}.prisma${path.sep}client${path.sep}`;

  for (const cacheKey of Object.keys(cache)) {
    if (
      cacheKey.includes(prismaClientPathFragment) ||
      cacheKey.includes(generatedClientPathFragment)
    ) {
      delete cache[cacheKey];
    }
  }
}

clearPrismaModuleCache();

const prismaClientModule = require("@prisma/client") as typeof import("@prisma/client");
const { Prisma, PrismaClient } = prismaClientModule;

const currentSchemaSignature = JSON.stringify({
  paymentFields: Object.values(Prisma.PaymentScalarFieldEnum).sort(),
  adminSettingsFields: Object.values(Prisma.AdminSettingsScalarFieldEnum).sort(),
});

if (!process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED) {
  // Keep application traffic on DATABASE_URL when it's configured.
  // Fall back to the direct URL only if a pooled runtime URL is missing.
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientInstance | undefined;
  prismaSchemaSignature: string | undefined;
};

function createPrismaClient(): PrismaClientInstance {
  const developmentLogLevels: Array<"query" | "error" | "warn"> =
    process.env.PRISMA_QUERY_LOGS === "true"
      ? ["query", "error", "warn"]
      : ["error", "warn"];

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? developmentLogLevels : ["error"],
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

  if (
    cachedClient &&
    globalForPrisma.prismaSchemaSignature === currentSchemaSignature &&
    matchesGeneratedSchema(cachedClient)
  ) {
    return cachedClient;
  }

  if (cachedClient) {
    void cachedClient.$disconnect().catch(() => {});
  }

  const nextClient = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = nextClient;
    globalForPrisma.prismaSchemaSignature = currentSchemaSignature;
  }

  return nextClient;
}

const prisma: PrismaClientInstance = getPrismaClient();

export { prisma };
