import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Terms & Conditions | FMLP Matrimony",
  description: "Read FMLP Matrimony's terms and conditions regarding the use of our services, eligibility, and user responsibilities.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
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
          
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-gray-900 mb-6 tracking-tight">Terms & Conditions</h1>
          <p className="text-gray-500 mb-10 font-medium inline-block bg-gray-50 px-4 py-2 rounded-full text-sm">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>

          <div className="prose prose-gray max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-2xl prose-h2:text-gray-900 prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-600 prose-p:leading-relaxed space-y-8">
            <section>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By registering an account and accessing the FMLP Matrimony platform, you explicitly agree to comply with and be bound by these Terms & Conditions. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2>2. Eligibility to Use the Platform</h2>
              <p>
                You must be of legal marriageable age in your jurisdiction (e.g., 18 years for women and 21 years for men in India) to create an account on FMLP Matrimony. By using this platform, you represent and warrant that you have the right, authority, and legal capacity to enter into this agreement and that you are not prohibited or prevented by any applicable law from entering into a matrimony contract.
              </p>
            </section>

            <section>
              <h2>3. User Registration and Account Creation</h2>
              <p>
                To utilize the matchmaking services, you must register by providing accurate account information (name, email, password) and verify your email. You are solely responsible for safeguarding the confidentiality of your login credentials and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2>4. User Responsibilities</h2>
              <p>
                You agree to use FMLP Matrimony exclusively for the purpose of finding a life partner. You are responsible for ensuring that all interactions, both online and offline, are conducted respectfully and with good intent. You agree not to harass, abuse, or engage in any predatory behavior toward other members.
              </p>
            </section>

            <section>
              <h2>5. Profile Information and Accuracy</h2>
              <p>
                You are required to submit accurate, current, and complete information regarding your personal details, family background, education, profession, and lifestyle preferences. Any misrepresentation of facts may result in the immediate suspension or termination of your account.
              </p>
            </section>

            <section>
              <h2>6. Profile Photos and Selfie Verification</h2>
              <p>
                To maintain a trusted community, you must upload recent, clear, and authentic profile photos. Additionally, our platform employs a mandatory selfie verification process to confirm your identity against your uploaded profile photos. Uploading fake photos or attempting to bypass the verification system is strictly prohibited.
              </p>
            </section>

            <section>
              <h2>7. Health Information and Medical Report Upload</h2>
              <p>
                If enabled by the platform administration, you may have the option to provide health-related details (e.g., blood pressure, diabetes status) and securely upload medical reports (PDF). You represent that any such health information provided is completely truthful and belongs to you. FMLP Matrimony acts only as a facilitator and does not independently verify the medical authenticity of these documents.
              </p>
            </section>

            <section>
              <h2>8. Interest, Shortlist, and Match Features</h2>
              <p>
                FMLP Matrimony provides tools to express interest (Likes), shortlist, and form matches with other profiles. These features are meant to facilitate initial contact. We do not guarantee a response or a successful match from any expressed interest.
              </p>
            </section>

            <section>
              <h2>9. Profile Unlock and Chat Unlock System</h2>
              <p>
                While basic profile browsing is free, viewing sensitive contact details or initiating a chat requires a payment to &quot;unlock&quot; the profile. Unlocking a profile grants you access to their contact information and the ability to send chat messages, subject to the other member&apos;s consent and interaction.
              </p>
            </section>

            <section>
              <h2>10. Payments and Refund Policy</h2>
              <p>
                All payments for profile unlocks, chat unlocks, and other premium features are processed securely through <strong>Instamojo</strong>. Fees are clearly displayed prior to purchase.
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2 mt-3">
                <li>All payments made on the platform are final and non-refundable.</li>
                <li>We do not guarantee that the unlocked profile will respond to your chat or phone calls. Refunds will not be issued for lack of response from a matched user.</li>
                <li>If a billing error occurs, please contact support for review.</li>
              </ul>
            </section>

            <section>
              <h2>11. Acceptable Use Policy</h2>
              <p>
                You agree to use our services in a manner consistent with all applicable local, state, and federal laws and regulations. The platform must only be used for bona fide matrimonial purposes and not for dating, flirting, or commercial propositions.
              </p>
            </section>

            <section>
              <h2>12. Prohibited Activities</h2>
              <p>You strictly agree not to:</p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2 mt-3">
                <li>Transmit, distribute, or upload any defamatory, offensive, or sexually explicit content.</li>
                <li>Request money or financial assistance from other members.</li>
                <li>Use automated scripts, bots, or scrapers to extract data from the platform.</li>
                <li>Promote external business ventures, campaigns, or services.</li>
              </ul>
            </section>

            <section>
              <h2>13. User-Generated Content</h2>
              <p>
                Any content you upload, including text in the bio, chat messages, and images, remains your property. However, by uploading content to FMLP Matrimony, you grant us a worldwide, non-exclusive license to use, display, and process it as necessary to provide the matrimonial service.
              </p>
            </section>

            <section>
              <h2>14. Privacy and Data Protection</h2>
              <p>
                Your privacy is extremely important to us. The collection, use, and sharing of your personal data are governed by our <a href="/privacy" className="text-rose-600 hover:underline">Privacy Policy</a>. By using the platform, you consent to the practices described in that policy.
              </p>
            </section>

            <section>
              <h2>15. Account Suspension or Termination</h2>
              <p>
                We reserve the right, at our sole discretion, to investigate, suspend, or terminate your account immediately and without prior notice if we suspect you have violated these Terms & Conditions, engaged in fraudulent activity, or misused the platform. No refunds will be provided upon termination for policy violations.
              </p>
            </section>

            <section>
              <h2>16. Intellectual Property Rights</h2>
              <p>
                All content, trademarks, logos, and software used on the FMLP Matrimony platform are the exclusive property of FMLP Matrimony and its licensors. You may not reproduce, modify, or distribute any of our intellectual property without prior written consent.
              </p>
            </section>

            <section>
              <h2>17. Limitation of Liability</h2>
              <p>
                FMLP Matrimony acts purely as an intermediary facilitating connections. We do not authenticate the background, financial status, or character of any member. We shall not be held liable for any direct, indirect, incidental, or consequential damages arising from your use of the platform, interactions with other members, or any marriages resulting from matches made on the platform. Members are urged to conduct their own independent verification.
              </p>
            </section>

            <section>
              <h2>18. Changes to the Terms</h2>
              <p>
                We may update or modify these Terms & Conditions from time to time to reflect changes in our services or legal requirements. Continued use of the platform after such modifications constitutes your acknowledgment and acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2>19. Governing Law</h2>
              <p>
                These Terms & Conditions shall be governed by and construed in accordance with the laws of India. Any disputes or claims arising out of or in connection with the platform shall be subject to the exclusive jurisdiction of the competent courts in India.
              </p>
            </section>

            <section className="bg-gray-50 p-6 rounded-2xl mt-12 border border-gray-100">
              <h2 className="!mt-0">20. Contact Information</h2>
              <p className="mb-0">
                If you have any questions, concerns, or require support regarding these Terms & Conditions, please contact us at:{" "}
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
