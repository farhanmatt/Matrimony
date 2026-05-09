import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read Vivah Bandhan's privacy policy to understand how we collect, use, and protect your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main>
      <Navbar />
      <div className="pt-28 pb-24 max-w-3xl mx-auto px-4">
        <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: April 2025</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">1. Information We Collect</h2>
            <p>When you register on Vivah Bandhan, we collect your name, email address, and password. When you create a matrimony profile, you may provide additional personal information such as age, gender, religion, education, profession, and photos. This information is used solely to facilitate the matrimony matching service.</p>
          </section>
          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <p>Your information is used to create and display your matrimony profile to other verified members, facilitate mutual matching, process payments securely through Razorpay, and improve our platform. We do not sell your personal data to third parties.</p>
          </section>
          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">3. Profile Visibility</h2>
            <p>Your contact details (phone number, email) are never shown to other users unless a mutual match is established AND the other user has paid to unlock your profile. Profile photos are blurred for unverified/unpaid users.</p>
          </section>
          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">4. Data Security</h2>
            <p>We use industry-standard encryption (bcrypt for passwords, HTTPS for all connections) and regularly audit our security practices. Payments are processed by Razorpay — we do not store card details.</p>
          </section>
          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">5. Contact Us</h2>
            <p>For any privacy-related concerns, contact us at: <a href="mailto:privacy@vivahbandhan.com" className="text-rose-500 hover:underline">privacy@vivahbandhan.com</a></p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
