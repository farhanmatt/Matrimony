"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

const faqs = [
  {
    q: "Is registration on Vivah Bandhan free?",
    a: "Yes! Basic registration is completely free. You can create your profile, browse matches, and show interest at no cost. Payment is only required when you want to unlock a mutual match's full contact details.",
  },
  {
    q: "How does the mutual matching system work?",
    a: "When you like someone's profile and they like your profile back, a mutual match is created automatically. Only mutual matches appear in your Matches section - ensuring genuine interest from both sides.",
  },
  {
    q: "Are the profiles verified?",
    a: "All profiles go through our multi-step verification process. We verify email addresses and encourage users to submit identity documents for a Verified badge, increasing trust and credibility.",
  },
  {
    q: "What information is hidden before unlocking?",
    a: "Before unlocking, the matched profile's contact details (phone, email), full address, and complete profile photos are hidden/blurred. You can see a brief summary but full access requires unlocking.",
  },
  {
    q: "How much does it cost to unlock a profile?",
    a: "The unlock cost consists of a base amount and a profile amount, configured by our admin team. The total and breakdown are clearly shown before you make any payment - no hidden charges.",
  },
  {
    q: "What payment methods are supported?",
    a: "We use Razorpay for secure payments, which supports UPI, Credit/Debit cards, Net Banking, and popular wallets like PhonePe and GPay.",
  },
  {
    q: "Can I edit my profile after creating it?",
    a: "Absolutely! You can update your profile information, upload new photos, and change your partner preferences at any time from your dashboard.",
  },
  {
    q: "How do I contact customer support?",
    a: "You can reach us via email at support@vivahbandhan.com or call our toll-free number 1800-123-456. We're available 24/7 to assist you.",
  },
];

export default function FAQSection({
  showIntro = true,
}: {
  showIntro?: boolean;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="py-24 section-gradient" id="faq">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {showIntro ? (
          <div className="text-center mb-16">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-subtitle mx-auto">
              Everything you need to know about Vivah Bandhan.
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-rose-50/50 transition-colors"
                aria-expanded={openIdx === idx}
              >
                <span className="font-semibold text-gray-900 pr-4 text-sm sm:text-base">
                  {faq.q}
                </span>
                {openIdx === idx ? (
                  <ChevronUp className="w-5 h-5 text-rose-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                )}
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openIdx === idx ? "max-h-64" : "max-h-0"
                )}
              >
                <p className="px-6 pb-5 text-gray-600 text-sm leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
