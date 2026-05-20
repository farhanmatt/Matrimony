import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const FALLBACK_ADMIN_SETTINGS = {
  id: "singleton",
  baseAmount: 500,
  profileAmount: 500,
  perProfileChatAmount: 0,
  heroImageUrl: "/main.jpeg",
  logoImageUrl: "",
};

type AdminSettingsSnapshot = typeof FALLBACK_ADMIN_SETTINGS;

function clientSupportsPerProfileChatAmount() {
  return Object.values(Prisma.AdminSettingsScalarFieldEnum).includes(
    "perProfileChatAmount"
  );
}

async function getLegacyAdminSettingsSnapshot(): Promise<AdminSettingsSnapshot> {
  const legacySettings = await prisma.adminSettings.findUnique({
    where: { id: "singleton" },
    select: {
      id: true,
      baseAmount: true,
      profileAmount: true,
      heroImageUrl: true,
      logoImageUrl: true,
    },
  });

  return legacySettings
    ? {
        ...legacySettings,
        perProfileChatAmount: 0,
      }
    : FALLBACK_ADMIN_SETTINGS;
}

function errorMentionsPerProfileChatAmount(error: unknown) {
  return error instanceof Error && error.message.includes("perProfileChatAmount");
}

export function isPerProfileChatAmountCompatibilityError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientKnownRequestError
  ) {
    return errorMentionsPerProfileChatAmount(error);
  }

  return errorMentionsPerProfileChatAmount(error);
}

export async function getAdminSettingsSnapshot(): Promise<AdminSettingsSnapshot> {
  if (!clientSupportsPerProfileChatAmount()) {
    return getLegacyAdminSettingsSnapshot();
  }

  try {
    const settings = await prisma.adminSettings.findUnique({
      where: { id: "singleton" },
      select: {
        id: true,
        baseAmount: true,
        profileAmount: true,
        perProfileChatAmount: true,
        heroImageUrl: true,
        logoImageUrl: true,
      },
    });

    return settings ?? FALLBACK_ADMIN_SETTINGS;
  } catch (error) {
    if (!isPerProfileChatAmountCompatibilityError(error)) {
      throw error;
    }

    return getLegacyAdminSettingsSnapshot();
  }
}

export async function getUnlockPricing() {
  const settings = await getAdminSettingsSnapshot();

  return {
    baseAmount: settings.baseAmount,
    profileAmount: settings.profileAmount,
    perProfileChatAmount: settings.perProfileChatAmount,
  };
}
