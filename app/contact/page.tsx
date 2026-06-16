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
      <div className="pt-20">
        <section className="bg-[#3d021e] text-white py-24 min-h-[60vh] flex items-center">
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Left Side: Contact Info */}
              <div className="max-w-xl lg:pt-8">
                <h1 className="text-[32px] font-bold mb-10 tracking-tight">Contact Us</h1>
                
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 border border-white/20 rounded-xl flex items-center justify-center shrink-0 bg-white/5">
                      <Mail className="w-6 h-6 text-white/90" />
                    </div>
                    <a 
                      href="mailto:Bagavath85@gmail.com" 
                      className="text-2xl font-medium tracking-tight hover:text-rose-200 transition-colors"
                    >
                      Bagavath85@gmail.com
                    </a>
                  </div>
                  
                  <div className="pl-16">
                    <p className="text-white/70 text-lg leading-relaxed font-light">
                      Have a question? We&apos;re here to help. Expect a <br />
                      response within 48 hours.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Side: Message Form */}
              <div className="bg-white/5 backdrop-blur-sm rounded-[32px] border border-white/10 p-8 lg:p-10 shadow-2xl shadow-black/20">
                <h2 className="text-2xl font-bold mb-8 tracking-tight">Send Us a Message</h2>
                <form className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/60 ml-1">Name</label>
                      <input
                        type="text"
                        placeholder="Your Name"
                        className="w-full bg-white/[0.08] border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-light"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/60 ml-1">Gmail</label>
                      <input
                        type="email"
                        placeholder="Your Gmail"
                        className="w-full bg-white/[0.08] border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-light"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60 ml-1">Message</label>
                    <textarea
                      rows={5}
                      placeholder="How can we help you today?"
                      className="w-full bg-white/[0.08] border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-light resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-rose-900/30 transition-all active:scale-[0.98] mt-2"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
