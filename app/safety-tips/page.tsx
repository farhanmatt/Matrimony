import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Safety Tips | MIP Matrimony",
  description: "Read our comprehensive safety tips and guidelines to ensure a secure and trusted matchmaking experience on MIP Matrimony.",
  alternates: { canonical: "/safety-tips" },
};

export default async function SafetyTipsPage() {
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
          
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-gray-900 mb-6 tracking-tight">Safety Tips</h1>
          <p className="text-gray-500 mb-10 font-medium inline-block bg-gray-50 px-4 py-2 rounded-full text-sm">
            Your safety is our top priority. Please read these guidelines carefully.
          </p>

          <div className="prose prose-gray max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-2xl prose-h2:text-gray-900 prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-600 prose-p:leading-relaxed space-y-8">
            <section>
              <h2>1. Safe Profile Creation Practices</h2>
              <p>
                When creating your profile, be honest but cautious. Provide accurate details regarding your profession, education, and lifestyle. However, avoid putting highly sensitive information (like your exact home address, financial details, or workplace) in the public bio section.
              </p>
            </section>

            <section>
              <h2>2. Keeping Personal Information Private</h2>
              <p>
                MIP Matrimony intentionally hides your contact number and email address from regular users. This information is only revealed when someone unlocks your profile using our secure payment gateway (Instamojo) and a mutual match is formed. Do not share your personal phone number, WhatsApp, or private email address in your bio or immediately in your first chat messages. Take time to build trust first.
              </p>
            </section>

            <section>
              <h2>3. Verifying Profile Authenticity</h2>
              <p>
                Look for profiles that have completed the mandatory Selfie Verification. While we manually review and verify profiles using uploaded photos, always do your own independent research. Check if the information they provide in chats matches their profile details consistently.
              </p>
            </section>

            <section>
              <h2>4. Safe Communication with Other Members</h2>
              <p>
                Always use the built-in MIP Matrimony Chat feature for initial conversations. Our chat platform is monitored for abusive language and helps protect you from unsolicited contacts. Be cautious if a member insists on moving the conversation to an external platform (like WhatsApp or Facebook) very quickly.
              </p>
            </section>

            <section>
              <h2>5. Safe Use of Profile Unlock and Chat Features</h2>
              <p>
                Unlocking a profile via Instamojo gives you access to contact details and chat. Use this feature responsibly. Unlocking a profile does not guarantee a response or a relationship. If a user does not respond after you unlock their profile, please respect their decision and do not harass them.
              </p>
            </section>

            <section>
              <h2>6. Photo and Document Sharing Guidelines</h2>
              <p>
                You may have the option to upload medical reports or additional photos. Ensure that any documents uploaded are authentic. Never send intimate, compromising, or highly sensitive documents to another member through chat. If someone requests such photos or documents inappropriately, report them immediately.
              </p>
            </section>

            <section>
              <h2>7. Avoiding Financial Scams and Fraudulent Requests</h2>
              <p>
                MIP Matrimony will <strong>never</strong> ask you for your passwords, credit card numbers, or OTPs over email or phone calls. Furthermore, you should <strong>never send money</strong> to anyone you meet on this platform, no matter what reason or emergency they claim to have. If a match asks for financial assistance, loans, or investments, cease contact and report them immediately.
              </p>
            </section>

            <section>
              <h2>8. Meeting in Public Places for the First Time</h2>
              <p>
                When you decide to meet a match in person:
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2 mt-3">
                <li>Always choose a safe, busy, and public location (like a cafe or restaurant).</li>
                <li>Inform a friend or family member about your plans, who you are meeting, and where you are going.</li>
                <li>Arrange your own transportation to and from the venue.</li>
                <li>Trust your instincts. If something feels off, leave immediately.</li>
              </ul>
            </section>

            <section>
              <h2>9. Protecting Account Credentials</h2>
              <p>
                Use a strong, unique password for your MIP Matrimony account. Do not share your login details with anyone, including family members or agents. Ensure you log out if you are using a shared or public computer.
              </p>
            </section>

            <section>
              <h2>10. Online Safety Best Practices</h2>
              <p>
                Treat your online matrimony search like any other aspect of your life—with caution and common sense. Conduct independent background checks before finalizing any marriage plans. Remember that the platform is a facilitator to help you connect, but verifying character and history is your responsibility.
              </p>
            </section>

            <section>
              <h2>11. Reporting Suspicious Users and Emergency Guidance</h2>
              <p>
                If you encounter any abusive behavior, fraudulent requests, or fake profiles, please report the user immediately using the report functionality on their profile or in the chat. In case of serious threats, harassment, or emergencies, do not hesitate to contact your local law enforcement authorities.
              </p>
            </section>

            <section className="bg-rose-50 p-6 rounded-2xl mt-12 border border-rose-100">
              <h2 className="!mt-0 text-rose-900">Need Immediate Support?</h2>
              <p className="mb-0 text-rose-800">
                If you need to report an incident or require assistance regarding your safety on the platform, please contact our support team at:{" "}
                <a href={`mailto:${contactEmail}`} className="text-rose-600 font-bold hover:text-rose-700 transition-colors">
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
