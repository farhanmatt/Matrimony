import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FAQSection from "@/components/landing/FAQSection";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions",
  description:
    "Find answers to common questions about MIP Matrimony — how matching works, pricing, privacy, and more.",
  alternates: { canonical: "/faq" },
};

export default async function FAQPage() {
  const settings = await prisma.adminSettings.findUnique({
    where: { id: "singleton" },
    select: { officialEmail: true },
  });
  const officialEmail = settings?.officialEmail || "support@fmlpmatrimony.com";

  return (
    <main>
      <Navbar />
      <div className="pt-28 pb-4">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-500">
            Everything you need to know about MIP Matrimony
          </p>
        </div>
      </div>
      <FAQSection showIntro={false} officialEmail={officialEmail} />
      <Footer />
    </main>
  );
}
