import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  upsertAdminUser,
} from "./admin-user";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Admin Settings ───────────────────────────────────────────
  await prisma.adminSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      baseAmount: 500,
      profileAmount: 500,
      heroImageUrl: "/main.jpeg",
    },
  });
  console.log("✅ Admin settings created");

  // ─── Admin User ───────────────────────────────────────────────
  const admin = await upsertAdminUser(prisma);
  console.log("✅ Admin user created:", admin.email);

  // ─── Sample Users & Profiles ──────────────────────────────────
  const sampleProfiles = [
    {
      email: "arjun.sharma@example.com",
      password: "Test@123",
      name: "Arjun Sharma",
      profile: {
        fullName: "Arjun Sharma",
        gender: "MALE" as const,
        dateOfBirth: new Date("1995-03-15"),
        height: 175,
        maritalStatus: "NEVER_MARRIED" as const,
        education: "B.Tech Computer Science",
        profession: "Software Engineer",
        income: "15-20 LPA",
        location: "Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        bio: "Tech enthusiast who loves travelling and reading. Looking for a life partner who shares similar values and ambitions.",
        religion: "Hindu",
        caste: "Brahmin",
        language: "Hindi",
        diet: "Vegetarian",
        smoking: "Never",
        drinking: "Never",
        fatherName: "Rajesh Sharma",
        motherName: "Meena Sharma",
        familyType: "JOINT" as const,
        familyStatus: "MIDDLE_CLASS" as const,
        siblings: 1,
        status: "ACTIVE" as const,
      },
    },
    {
      email: "priya.patel@example.com",
      password: "Test@123",
      name: "Priya Patel",
      profile: {
        fullName: "Priya Patel",
        gender: "FEMALE" as const,
        dateOfBirth: new Date("1997-07-22"),
        height: 163,
        maritalStatus: "NEVER_MARRIED" as const,
        education: "MBA Finance",
        profession: "Financial Analyst",
        income: "10-15 LPA",
        location: "Ahmedabad",
        city: "Ahmedabad",
        state: "Gujarat",
        bio: "Finance professional with a love for cooking and classical dance. Family-oriented and values traditions.",
        religion: "Hindu",
        caste: "Patel",
        language: "Gujarati",
        diet: "Vegetarian",
        smoking: "Never",
        drinking: "Never",
        fatherName: "Suresh Patel",
        motherName: "Kavita Patel",
        familyType: "NUCLEAR" as const,
        familyStatus: "UPPER_MIDDLE_CLASS" as const,
        siblings: 2,
        status: "ACTIVE" as const,
      },
    },
    {
      email: "rahul.verma@example.com",
      password: "Test@123",
      name: "Rahul Verma",
      profile: {
        fullName: "Rahul Verma",
        gender: "MALE" as const,
        dateOfBirth: new Date("1993-11-08"),
        height: 178,
        maritalStatus: "NEVER_MARRIED" as const,
        education: "MBBS MD",
        profession: "Doctor",
        income: "25-30 LPA",
        location: "Delhi",
        city: "New Delhi",
        state: "Delhi",
        bio: "Dedicated doctor passionate about healthcare. Love cricket and exploring new cuisines in my free time.",
        religion: "Hindu",
        caste: "Kayastha",
        language: "Hindi",
        diet: "Non-Vegetarian",
        smoking: "Never",
        drinking: "Occasionally",
        fatherName: "Anil Verma",
        motherName: "Sunita Verma",
        familyType: "NUCLEAR" as const,
        familyStatus: "UPPER_MIDDLE_CLASS" as const,
        siblings: 1,
        status: "ACTIVE" as const,
      },
    },
    {
      email: "sneha.krishnan@example.com",
      password: "Test@123",
      name: "Sneha Krishnan",
      profile: {
        fullName: "Sneha Krishnan",
        gender: "FEMALE" as const,
        dateOfBirth: new Date("1996-05-30"),
        height: 160,
        maritalStatus: "NEVER_MARRIED" as const,
        education: "CA",
        profession: "Chartered Accountant",
        income: "12-18 LPA",
        location: "Chennai",
        city: "Chennai",
        state: "Tamil Nadu",
        bio: "CA by profession, Carnatic music enthusiast by passion. Looking for a meaningful connection based on mutual respect.",
        religion: "Hindu",
        caste: "Iyer",
        language: "Tamil",
        diet: "Vegetarian",
        smoking: "Never",
        drinking: "Never",
        fatherName: "Gopal Krishnan",
        motherName: "Lakshmi Krishnan",
        familyType: "JOINT" as const,
        familyStatus: "MIDDLE_CLASS" as const,
        siblings: 0,
        status: "ACTIVE" as const,
      },
    },
    {
      email: "vikram.singh@example.com",
      password: "Test@123",
      name: "Vikram Singh",
      profile: {
        fullName: "Vikram Singh",
        gender: "MALE" as const,
        dateOfBirth: new Date("1992-09-12"),
        height: 182,
        maritalStatus: "NEVER_MARRIED" as const,
        education: "IIM MBA",
        profession: "Business Consultant",
        income: "30+ LPA",
        location: "Bangalore",
        city: "Bangalore",
        state: "Karnataka",
        bio: "MBA from IIM, working with a top consultancy. Love adventure sports and philosophy. Seeking a partner with intellectual depth.",
        religion: "Sikh",
        caste: "Jat",
        language: "Punjabi",
        diet: "Non-Vegetarian",
        smoking: "Never",
        drinking: "Occasionally",
        fatherName: "Harjit Singh",
        motherName: "Gurpreet Singh",
        familyType: "NUCLEAR" as const,
        familyStatus: "RICH" as const,
        siblings: 2,
        status: "ACTIVE" as const,
      },
    },
  ];

  for (const data of sampleProfiles) {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        emailVerified: new Date(),
      },
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        ...data.profile,
      },
    });

    console.log(`✅ Created profile for: ${data.name}`);
  }

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📋 Admin credentials:");
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log("\n📋 Sample user credentials (all use password: Test@123)");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
