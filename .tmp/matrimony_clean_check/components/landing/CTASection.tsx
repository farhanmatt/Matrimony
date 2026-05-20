import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-br from-rose-600 via-pink-600 to-rose-700 relative overflow-hidden">
      {/* Decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Heart className="w-8 h-8 text-white fill-white" />
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white mb-6 leading-tight">
          Begin Your Journey to{" "}
          <span className="text-yellow-300">Happiness</span>
        </h2>

        <p className="text-rose-100 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
          Join over 10 lakh members who have found their perfect life partner on
          Vivah Bandhan. Registration is free and takes less than 2 minutes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-white text-rose-600 font-bold rounded-full px-8 py-4 text-lg hover:bg-yellow-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
          >
            Register Free Now
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-white/10 border-2 border-white/50 text-white font-bold rounded-full px-8 py-4 text-lg hover:bg-white/20 transition-all"
          >
            Already a Member?
          </Link>
        </div>

        <p className="text-rose-200 text-sm mt-8">
          No credit card required • Free forever for basic features
        </p>
      </div>
    </section>
  );
}
