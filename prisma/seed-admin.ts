import { PrismaClient } from "@prisma/client";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  upsertAdminUser,
} from "./admin-user";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding admin user...");

  await upsertAdminUser(prisma);

  console.log("Admin user seeded successfully!");
  console.log("Email:", ADMIN_EMAIL);
  console.log("Password:", ADMIN_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
