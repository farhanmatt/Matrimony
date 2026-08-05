const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const kind = 'HEALTH_REQUEST_ACCEPTED';
    await prisma.$executeRaw`
      INSERT INTO "ProfileNotification" (id, "recipientProfileId", "actorProfileId", kind, "isRead", "createdAt")
      VALUES ('test-id', 'test', 'test', ${kind}, false, NOW())
    `;
    console.log("Success parameter");
  } catch(e) {
    console.error("Failed parameter:", e.message);
  }

  try {
    const kind = 'HEALTH_REQUEST_ACCEPTED';
    await prisma.$executeRaw`
      INSERT INTO "ProfileNotification" (id, "recipientProfileId", "actorProfileId", kind, "isRead", "createdAt")
      VALUES ('test-id-2', 'test', 'test', CAST(${kind} AS "ProfileNotificationKind"), false, NOW())
    `;
    console.log("Success CAST parameter");
  } catch(e) {
    console.error("Failed CAST parameter:", e.message);
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO "ProfileNotification" (id, "recipientProfileId", "actorProfileId", kind, "isRead", "createdAt")
      VALUES ('test-id-3', 'test', 'test', 'HEALTH_REQUEST_RECEIVED', false, NOW())
    `;
    console.log("Success literal");
  } catch(e) {
    console.error("Failed literal:", e.message);
  }

  await prisma.$executeRaw`DELETE FROM "ProfileNotification" WHERE id LIKE 'test-id%'`;
}
main().finally(() => prisma.$disconnect());
