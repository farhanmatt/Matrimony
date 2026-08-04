import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const FALLBACK_ADMIN_SETTINGS = {
  id: "singleton",
  baseAmount: 500,
  profileAmount: 500,
  perProfileChatAmount: 0,
  isChatPaymentEnabled: true,
  isChatFeatureEnabled: true,
  isHealthDetailsEnabled: true,
  heroImageUrl: "/main.jpeg",
  logoImageUrl: "",
  officialEmail: "support@fmlpmatrimony.com",
  doorNumber: null as string | null,
  streetName: null as string | null,
  roadName: null as string | null,
  areaLocality: null as string | null,
  city: null as string | null,
  district: null as string | null,
  state: null as string | null,
  pincode: null as string | null,
  country: null as string | null,
};

type AdminSettingsSnapshot = typeof FALLBACK_ADMIN_SETTINGS;

function clientSupportsChatPaymentSettings() {
  const fields = Object.values(Prisma.AdminSettingsScalarFieldEnum);
  return fields.includes("perProfileChatAmount") && fields.includes("isChatPaymentEnabled") && fields.includes("isChatFeatureEnabled") && fields.includes("isHealthDetailsEnabled") && fields.includes("officialEmail");
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
          ...legacySettings,
          perProfileChatAmount: 0,
          isChatPaymentEnabled: true,
          isChatFeatureEnabled: true,
          isHealthDetailsEnabled: true,
          officialEmail: "support@fmlpmatrimony.com",
          doorNumber: null,
          streetName: null,
          roadName: null,
          areaLocality: null,
          city: null,
          district: null,
          state: null,
          pincode: null,
          country: null,
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
    (error.message.includes("perProfileChatAmount") || error.message.includes("isChatPaymentEnabled") || error.message.includes("isChatFeatureEnabled") || error.message.includes("isHealthDetailsEnabled") || error.message.includes("officialEmail"))
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
        isChatFeatureEnabled: true,
        isHealthDetailsEnabled: true,
        heroImageUrl: true,
        logoImageUrl: true,
        officialEmail: true,
        doorNumber: true,
        streetName: true,
        roadName: true,
        areaLocality: true,
        city: true,
        district: true,
        state: true,
        pincode: true,
        country: true,
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
