import "server-only";
import path from "path";
import { createRequire } from "module";
import type { PrismaClient as PrismaClientInstance } from "@prisma/client";

const require = createRequire(import.meta.url);
type PrismaClientModule = typeof import("@prisma/client");

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

function loadPrismaClientModule(): PrismaClientModule {
  clearPrismaModuleCache();
  return require("@prisma/client") as PrismaClientModule;
}

function getCurrentSchemaSignature(Prisma: PrismaClientModule["Prisma"]) {
  const scalarFieldEnums = Object.entries(Prisma)
    .filter(([key, value]) => {
      return (
        key.endsWith("ScalarFieldEnum") &&
        typeof value === "object" &&
        value !== null
      );
    })
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => {
      return [
        key,
        Object.values(value as Record<string, string>).sort(),
      ] as const;
    });

  return JSON.stringify({
    modelNames: Object.values(Prisma.ModelName).sort(),
    scalarFieldEnums,
  });
}

if (!process.env.DATABASE_URL && process.env.DATABASE_URL_UNPOOLED) {
  // Keep application traffic on DATABASE_URL when it's configured.
  // Fall back to the direct URL only if a pooled runtime URL is missing.
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientInstance | undefined;
  prismaSchemaSignature: string | undefined;
};

function createPrismaClient(
  PrismaClient: PrismaClientModule["PrismaClient"]
): PrismaClientInstance {
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

function matchesGeneratedSchema(
  client: PrismaClientInstance | undefined,
  Prisma: PrismaClientModule["Prisma"]
) {
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
  const prismaClientModule = loadPrismaClientModule();
  const { Prisma, PrismaClient } = prismaClientModule;
  const currentSchemaSignature = getCurrentSchemaSignature(Prisma);

  if (
    cachedClient &&
    globalForPrisma.prismaSchemaSignature === currentSchemaSignature &&
    matchesGeneratedSchema(cachedClient, Prisma)
  ) {
    return cachedClient;
  }

  if (cachedClient) {
    void cachedClient.$disconnect().catch(() => {});
  }

  const nextClient = createPrismaClient(PrismaClient);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = nextClient;
    globalForPrisma.prismaSchemaSignature = currentSchemaSignature;
  }

  return nextClient;
}

const prisma: PrismaClientInstance = getPrismaClient();

export { prisma };
