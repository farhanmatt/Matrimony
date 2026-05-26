import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FAQSection from "@/components/landing/FAQSection";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions",
  description:
    "Find answers to common questions about Vivah Bandhan — how matching works, pricing, privacy, and more.",
  alternates: { canonical: "/faq" },
};

export default function FAQPage() {
  return (
    <main>
      <Navbar />
      <div className="pt-28 pb-4">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-500">
            Everything you need to know about Vivah Bandhan
          </p>
        </div>
      </div>
      <FAQSection showIntro={false} />
      <Footer />
    </main>
  );
}
