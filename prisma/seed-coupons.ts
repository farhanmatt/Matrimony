import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedCoupons() {
  console.log("🎟️  Seeding coupon codes...\n");

  const coupons = [
    {
      code: "WELCOME20",
      description: "Welcome offer - 20% off on first unlock",
      discountType: "PERCENTAGE",
      discountValue: 20,
      maxUses: 100,
      maxDiscount: 300,
      isActive: true,
      expiresAt: new Date("2027-12-31T23:59:59Z"),
    },
    {
      code: "FLAT100",
      description: "Flat ₹100 off on profile unlock",
      discountType: "FIXED",
      discountValue: 100,
      maxUses: 200,
      isActive: true,
      expiresAt: new Date("2027-06-30T23:59:59Z"),
    },
    {
      code: "MATCH50",
      description: "Special match discount - 50% off (max ₹500)",
      discountType: "PERCENTAGE",
      discountValue: 50,
      maxUses: 50,
      maxDiscount: 500,
      isActive: true,
      expiresAt: new Date("2027-03-31T23:59:59Z"),
    },
    {
      code: "FLAT200",
      description: "Flat ₹200 off on premium unlock",
      discountType: "FIXED",
      discountValue: 200,
      maxUses: null,
      minAmount: 500,
      isActive: true,
      expiresAt: new Date("2099-12-31T23:59:59Z"),
    },
    {
      code: "EXPIRED10",
      description: "Expired coupon for testing",
      discountType: "PERCENTAGE",
      discountValue: 10,
      maxUses: 100,
      isActive: true,
      expiresAt: new Date("2025-01-01T00:00:00Z"),
    },
  ];

  for (const coupon of coupons) {
    const existing = await prisma.couponCode.findUnique({
      where: { code: coupon.code },
    });

    if (existing) {
      console.log(`  ⏩ Coupon "${coupon.code}" already exists, skipping.`);
      continue;
    }

    await prisma.couponCode.create({ data: coupon });
    console.log(`  ✅ Created coupon: ${coupon.code} — ${coupon.description}`);
  }

  console.log("\n🎉 Coupon seeding complete!");
}

seedCoupons()
  .catch((error) => {
    console.error("Coupon seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
