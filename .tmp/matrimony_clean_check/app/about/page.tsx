import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Heart, Target, Users, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us — Our Story",
  description:
    "Learn about Vivah Bandhan — India's most trusted matrimony platform. Our mission is to connect families and build happy marriages.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main>
      <Navbar />
      <div className="pt-28 pb-24">
        {/* Hero */}
        <div className="max-w-4xl mx-auto px-4 text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-gray-900 mb-5">
            Our Story & <span className="gradient-text">Mission</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Founded in 2015, Vivah Bandhan was built with a single purpose — to
            help families find trustworthy, compatible life partners through
            technology guided by tradition.
          </p>
        </div>

        {/* Values */}
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Heart,
              title: "Love & Connection",
              desc: "We believe every person deserves a meaningful, loving partnership.",
            },
            {
              icon: Shield,
              title: "Trust & Safety",
              desc: "All profiles are verified. Your privacy is our top priority.",
            },
            {
              icon: Target,
              title: "Smart Matching",
              desc: "AI-powered algorithms find the most compatible profiles for you.",
            },
            {
              icon: Users,
              title: "Family First",
              desc: "We celebrate Indian family values while embracing modern needs.",
            },
          ].map((v) => (
            <div key={v.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center card-hover">
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <v.icon className="w-6 h-6 text-rose-500" />
              </div>
              <h2 className="font-display font-bold text-gray-900 mb-2">{v.title}</h2>
              <p className="text-gray-500 text-sm">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto px-4 mt-16">
          <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl p-10 text-white text-center">
            <h2 className="text-2xl font-display font-bold mb-8">
              Our Impact in Numbers
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: "10L+", label: "Members" },
                { value: "5L+", label: "Married Couples" },
                { value: "28", label: "States Covered" },
                { value: "50+", label: "Communities" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-display font-bold text-yellow-300 mb-1">{s.value}</div>
                  <div className="text-rose-100 text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
