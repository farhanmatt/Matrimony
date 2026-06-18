import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const FALLBACK_ADMIN_SETTINGS = {
  id: "singleton",
  baseAmount: 500,
  profileAmount: 500,
  perProfileChatAmount: 0,
  isChatPaymentEnabled: true,
  heroImageUrl: "/main.jpeg",
  logoImageUrl: "",
};

type AdminSettingsSnapshot = typeof FALLBACK_ADMIN_SETTINGS;

function clientSupportsChatPaymentSettings() {
  const fields = Object.values(Prisma.AdminSettingsScalarFieldEnum);
  return fields.includes("perProfileChatAmount") && fields.includes("isChatPaymentEnabled");
}

async function getLegacyAdminSettingsSnapshot(): Promise<AdminSettingsSnapshot> {
  try {
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
          isChatPaymentEnabled: true,
        }
      : FALLBACK_ADMIN_SETTINGS;
  } catch (error) {
    console.error("Failed to fetch legacy admin settings:", error);
    return FALLBACK_ADMIN_SETTINGS;
  }
}

function errorMentionsNewFields(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("perProfileChatAmount") || error.message.includes("isChatPaymentEnabled"))
  );
}

export function isCompatibilityError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientKnownRequestError
  ) {
    return errorMentionsNewFields(error);
  }

  return errorMentionsNewFields(error);
}

export async function getAdminSettingsSnapshot(): Promise<AdminSettingsSnapshot> {
  if (!clientSupportsChatPaymentSettings()) {
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
        isChatPaymentEnabled: true,
        heroImageUrl: true,
        logoImageUrl: true,
      },
    });

    return settings ?? FALLBACK_ADMIN_SETTINGS;
  } catch (error) {
    if (isCompatibilityError(error)) {
      return getLegacyAdminSettingsSnapshot();
    }

    console.error("Failed to fetch admin settings:", error);
    return FALLBACK_ADMIN_SETTINGS;
  }
}

export async function getUnlockPricing() {
  const settings = await getAdminSettingsSnapshot();

  return {
    baseAmount: settings.baseAmount,
    profileAmount: settings.profileAmount,
    perProfileChatAmount: settings.perProfileChatAmount,
    isChatPaymentEnabled: settings.isChatPaymentEnabled,
  };
}
