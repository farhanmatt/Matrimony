import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Privacy Policy | FMLP Matrimony",
  description: "Read FMLP Matrimony's privacy policy to understand how we collect, use, and protect your personal information.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const settings = await prisma.adminSettings.findUnique({
    where: { id: "singleton" },
    select: { officialEmail: true },
  });
  
  const contactEmail = settings?.officialEmail || "support@fmlpmatrimony.com";

  return (
    <main>
      <Navbar />
      <div className="pt-28 pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-xl shadow-rose-100/50 p-8 sm:p-12 border border-rose-50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500" />
          
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-gray-900 mb-6 tracking-tight">Privacy Policy</h1>
          <p className="text-gray-500 mb-10 font-medium inline-block bg-gray-50 px-4 py-2 rounded-full text-sm">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>

          <div className="prose prose-gray max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-2xl prose-h2:text-gray-900 prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-600 prose-p:leading-relaxed space-y-8">
            <section>
              <h2>1. Information We Collect</h2>
              <p>When you register and use FMLP Matrimony, we collect the following types of information to provide you with our matchmaking services:</p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2 mt-3">
                <li><strong>Account Information:</strong> Your name, email address, password, and registration details.</li>
                <li><strong>Profile Information:</strong> Comprehensive details to facilitate matches, including age, gender, date of birth, religion, caste, education, profession, location, and lifestyle choices.</li>
                <li><strong>Media and Verification:</strong> Profile photos, horoscope images, and selfie images required for identity verification.</li>
                <li><strong>Health Information:</strong> If enabled and provided, we may collect basic health details such as blood pressure, diabetes status, and securely uploaded medical reports (PDF).</li>
                <li><strong>Interactions:</strong> Profiles you like, match with, or interact with via our Chat feature.</li>
              </ul>
            </section>

            <section>
              <h2>2. How We Use Your Information</h2>
              <p>We strictly use the collected data to operate the matrimony platform. Your data is used to:</p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2 mt-3">
                <li>Create and display your profile to other verified and registered members.</li>
                <li>Determine and suggest compatible matches based on preferences.</li>
                <li>Facilitate secure communication (Chat) and profile unlocks.</li>
                <li>Verify your identity through selfie capture to maintain a trusted community.</li>
                <li>Process unlocking fees securely.</li>
              </ul>
              <p className="mt-3">We do not sell, rent, or trade your personal information to third parties for marketing purposes.</p>
            </section>

            <section>
              <h2>3. Profile Visibility and Unlocks</h2>
              <p>
                Your privacy is paramount. Basic profile details and blurred photos may be visible to members. However, your sensitive contact details (such as your phone number or email address) and clear profile photos remain locked. They are only revealed to another member if a mutual match is established AND they have explicitly paid to unlock your profile using our secure payment gateway.
              </p>
            </section>

            <section>
              <h2>4. Payment Security</h2>
              <p>
                All payments for profile unlocks or chat functionalities are securely processed via <strong>Instamojo</strong>. FMLP Matrimony does not collect, process, or store your credit card, debit card, or sensitive banking details on our servers.
              </p>
            </section>

            <section>
              <h2>5. Data Security</h2>
              <p>
                We employ industry-standard security measures to protect your data. Passwords are cryptographically hashed using bcrypt. All network communications are encrypted via HTTPS. Uploaded media (photos and medical PDFs) are stored securely using Cloudinary. While we implement robust security practices, no electronic storage or transmission is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2>6. User Rights and Deletion</h2>
              <p>
                You have the right to access, modify, or delete your profile information at any time through your dashboard. If you wish to completely remove your account and all associated data from our systems, you can request account deletion by contacting our support team.
              </p>
            </section>

            <section className="bg-gray-50 p-6 rounded-2xl mt-12 border border-gray-100">
              <h2 className="!mt-0">7. Contact Us</h2>
              <p className="mb-0">
                If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact our support team at:{" "}
                <a href={`mailto:${contactEmail}`} className="text-rose-600 font-semibold hover:text-rose-700 transition-colors">
                  {contactEmail}
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
