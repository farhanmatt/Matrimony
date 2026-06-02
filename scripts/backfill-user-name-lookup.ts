import { PrismaClient } from "@prisma/client";
import { normalizeNameLookup } from "@/lib/utils/user-identity";

const BATCH_SIZE = 200;
const prisma = new PrismaClient();

type BackfillUserRow = {
  id: string;
  name: string | null;
};

async function main() {
  let cursorId: string | null = null;
  let updatedCount = 0;

  while (true) {
    const users: BackfillUserRow[] = await prisma.user.findMany({
      where: {
        nameLookup: null,
        name: { not: null },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursorId
        ? {
            skip: 1,
            cursor: { id: cursorId },
          }
        : {}),
    });

    if (users.length === 0) {
      break;
    }

    await Promise.all(
      users.map((user) =>
        prisma.user.update({
          where: { id: user.id },
          data: {
            nameLookup: normalizeNameLookup(user.name ?? ""),
          },
        })
      )
    );

    updatedCount += users.length;
    cursorId = users[users.length - 1]?.id ?? null;
  }

  console.log(`Backfilled name lookup for ${updatedCount} user(s).`);
}

main()
  .catch((error) => {
    console.error("Failed to backfill user name lookup:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
