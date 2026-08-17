import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Refund Policy | MIP Matrimony",
  description: "Read MIP Matrimony's refund and cancellation policy regarding profile unlocks, chat unlocks, and premium payments.",
  alternates: { canonical: "/refund" },
};

export default async function RefundPage() {
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
          
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-gray-900 mb-6 tracking-tight">Refund Policy</h1>
          <p className="text-gray-500 mb-10 font-medium inline-block bg-gray-50 px-4 py-2 rounded-full text-sm">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>

          <div className="prose prose-gray max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-2xl prose-h2:text-gray-900 prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-600 prose-p:leading-relaxed space-y-8">
            <section>
              <h2>1. Overview</h2>
              <p>
                At MIP Matrimony, we strive to provide a transparent and seamless matchmaking experience. Our platform operates on a freemium model where basic features are free, but accessing premium features such as unlocking profiles or initiating chats requires a payment. This policy outlines our guidelines regarding refunds and cancellations for these premium services.
              </p>
            </section>

            <section>
              <h2>2. Payment Processing</h2>
              <p>
                All financial transactions on our platform are processed securely via <strong>Instamojo</strong>. When you make a payment to unlock a profile or access chat features, the transaction is handled entirely by Instamojo. MIP Matrimony does not store any of your sensitive banking or credit card information.
              </p>
            </section>

            <section>
              <h2>3. Eligible Refund Scenarios</h2>
              <p>
                Refunds are generally not permitted for our digital services, but we may issue a refund under the following strict scenarios:
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2 mt-3">
                <li>If a technical error on our platform prevents you from accessing a profile or chat that you successfully paid to unlock.</li>
                <li>If the unlocked profile is determined to be fraudulent or violating our Terms &amp; Conditions and is subsequently removed by our administration immediately after your purchase.</li>
              </ul>
            </section>

            <section>
              <h2>4. Non-Refundable Payments</h2>
              <p>
                To maintain the integrity of our service, payments are considered final and non-refundable in the following situations:
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2 mt-3">
                <li>You changed your mind after successfully unlocking a profile or chat.</li>
                <li>The matched user does not respond to your messages, calls, or interests. Our platform facilitates connection, but we cannot guarantee interaction or a successful marriage.</li>
                <li>You are dissatisfied with the profile&apos;s details after unlocking.</li>
                <li>Your account is suspended or terminated due to a violation of our Terms &amp; Conditions or Safety Guidelines.</li>
              </ul>
            </section>

            <section>
              <h2>5. Refund Request Process</h2>
              <p>
                If you believe your situation qualifies for a refund based on our Eligible Scenarios, you must submit a refund request within <strong>7 days</strong> of the transaction date. Please email our support team with your registered email address, the Instamojo transaction ID, and a detailed explanation of the issue.
              </p>
            </section>

            <section>
              <h2>6. Refund Review and Approval</h2>
              <p>
                Once a refund request is received, our team will investigate the transaction and the associated profile logs. We reserve the right to verify the claim and determine its validity. We will notify you of the approval or rejection of your refund request within 5 to 7 business days.
              </p>
            </section>

            <section>
              <h2>7. Refund Processing Time</h2>
              <p>
                If your refund is approved, it will be processed and credited back to your original method of payment via Instamojo. Please allow 5 to 10 business days for the amount to reflect in your bank account or credit card statement, depending on your bank&apos;s processing time.
              </p>
            </section>

            <section>
              <h2>8. Cancellation Policy</h2>
              <p>
                Since MIP Matrimony utilizes a pay-per-unlock model rather than a recurring subscription, there is no ongoing subscription to cancel. However, if you wish to delete your account or stop using our services, you may do so at any time from your account settings. Deleting your account will not automatically trigger a refund for past purchases.
              </p>
            </section>

            <section>
              <h2>9. Failed or Duplicate Transactions</h2>
              <p>
                If your account is debited but the payment fails to reflect on our platform (e.g., the profile remains locked), or if you are accidentally charged twice for the same unlock due to a network error, please contact us immediately. Duplicate charges will be refunded promptly upon verification via the Instamojo dashboard.
              </p>
            </section>

            <section>
              <h2>10. Changes to the Refund Policy</h2>
              <p>
                We reserve the right to modify or update this Refund Policy at any time. Any changes will be posted on this page, and the &quot;Last updated&quot; date will be revised accordingly. Your continued use of the platform after any changes indicates your acceptance of the updated policy.
              </p>
            </section>

            <section className="bg-gray-50 p-6 rounded-2xl mt-12 border border-gray-100">
              <h2 className="!mt-0">11. Contact Support</h2>
              <p className="mb-0">
                If you have any questions or require assistance regarding a payment or refund, please reach out to our billing support team at:{" "}
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
