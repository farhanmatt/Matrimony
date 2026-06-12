import "server-only";

import type { Gender, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PROFILE_USER_ID_PREFIX = "FMLP";
const PROFILE_USER_ID_START_NUMBER = 141;

type ProfileForUserIdAssignment = {
  id: string;
  gender: Gender;
  profileUserId: string | null;
};

function getGenderCode(gender: Gender) {
  if (gender === "MALE") {
    return "M";
  }

  if (gender === "FEMALE") {
    return "F";
  }

  return "O";
}

function formatProfileUserId(gender: Gender, sequenceNumber: number) {
  return `${PROFILE_USER_ID_PREFIX}${getGenderCode(gender)}${String(
    sequenceNumber
  ).padStart(5, "0")}`;
}

function coerceSequenceNumber(value: number | bigint | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  return PROFILE_USER_ID_START_NUMBER - 1;
}

async function getHighestAssignedSequenceNumber(
  tx: Prisma.TransactionClient,
  genderCode: string
) {
  const userIdPrefix = `${PROFILE_USER_ID_PREFIX}${genderCode}`;
  const userIdPattern = `^${userIdPrefix}[0-9]{5}$`;

  const rows = await tx.$queryRaw<Array<{ max_number: number | bigint | null }>>`
    SELECT MAX(CAST(RIGHT("profileUserId", 5) AS INTEGER)) AS "max_number"
    FROM "Profile"
    WHERE "profileUserId" IS NOT NULL
      AND "profileUserId" LIKE ${`${userIdPrefix}%`}
      AND "profileUserId" ~ ${userIdPattern}
  `;

  return coerceSequenceNumber(rows[0]?.max_number);
}

export async function generateProfileUserId(
  tx: Prisma.TransactionClient,
  gender: Gender
) {
  const genderKey = getGenderCode(gender);
  const highestAssignedNumber = await getHighestAssignedSequenceNumber(tx, genderKey);
  const firstAvailableNumber = Math.max(
    PROFILE_USER_ID_START_NUMBER,
    highestAssignedNumber + 1
  );
  const nextNumberAfterAssignment = firstAvailableNumber + 1;

  const rows = await tx.$queryRaw<Array<{ assigned_number: number }>>`
    INSERT INTO "ProfileUserIdSequence" ("gender", "nextNumber", "createdAt", "updatedAt")
    VALUES (${genderKey}, ${nextNumberAfterAssignment}, NOW(), NOW())
    ON CONFLICT ("gender")
    DO UPDATE SET
      "nextNumber" = GREATEST(
        "ProfileUserIdSequence"."nextNumber",
        ${firstAvailableNumber}
      ) + 1,
      "updatedAt" = NOW()
    RETURNING "nextNumber" - 1 AS "assigned_number"
  `;

  const sequenceNumber = rows[0]?.assigned_number;

  if (typeof sequenceNumber !== "number") {
    throw new Error("Unable to generate profile user ID.");
  }

  return formatProfileUserId(gender, sequenceNumber);
}

export async function ensureProfileUserId(
  tx: Prisma.TransactionClient,
  profile: ProfileForUserIdAssignment
) {
  const existingProfileUserId = profile.profileUserId?.trim();
  if (existingProfileUserId) {
    return existingProfileUserId;
  }

  const profileUserId = await generateProfileUserId(tx, profile.gender);
  const updateResult = await tx.profile.updateMany({
    where: {
      id: profile.id,
      OR: [{ profileUserId: null }, { profileUserId: "" }],
    },
    data: { profileUserId },
  });

  if (updateResult.count > 0) {
    return profileUserId;
  }

  const currentProfile = await tx.profile.findUnique({
    where: { id: profile.id },
    select: { profileUserId: true },
  });

  const currentProfileUserId = currentProfile?.profileUserId?.trim();
  if (currentProfileUserId) {
    return currentProfileUserId;
  }

  throw new Error("Unable to assign profile user ID.");
}

export async function ensureProfileUserIdForProfile(
  profile: ProfileForUserIdAssignment
) {
  return prisma.$transaction((tx) => ensureProfileUserId(tx, profile));
}
