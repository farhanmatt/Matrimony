import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Vivah Bandhan support team. We're available 24/7 to help you with your matrimony journey.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main>
      <Navbar />
      <div className="pt-28 pb-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-display font-bold text-gray-900 mb-3">
              Contact Us
            </h1>
            <p className="text-gray-500 max-w-xl mx-auto">
              Have a question or need help? Our friendly support team is here for you.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Contact info */}
            <div className="space-y-6">
              {[
                {
                  icon: Phone,
                  title: "Phone Support",
                  content: "+91 1800 123 456",
                  sub: "Toll-free · Mon–Sat 9am–8pm",
                },
                {
                  icon: Mail,
                  title: "Email Support",
                  content: "support@vivahbandhan.com",
                  sub: "We respond within 24 hours",
                },
                {
                  icon: MapPin,
                  title: "Office Address",
                  content: "123 Matrimony Lane",
                  sub: "Mumbai, Maharashtra 400001",
                },
                {
                  icon: Clock,
                  title: "Working Hours",
                  content: "Monday to Saturday",
                  sub: "9:00 AM – 8:00 PM IST",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                    <p className="text-gray-800 text-sm font-medium">{item.content}</p>
                    <p className="text-gray-400 text-xs">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="font-display font-bold text-xl text-gray-900 mb-6">
                Send Us a Message
              </h2>
              <form className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                  <input
                    type="text"
                    placeholder="How can we help?"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                  <textarea
                    rows={5}
                    placeholder="Describe your issue or question..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <button type="submit" className="btn-primary py-3 px-8 rounded-xl w-full">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
