import Link from "next/link";
import { Heart, Search, Shield, Star } from "lucide-react";

const stats = [
  { value: "10 Lakh+", label: "Registered Members" },
  { value: "5 Lakh+", label: "Happy Couples" },
  { value: "98%", label: "Success Rate" },
  { value: "24/7", label: "Customer Support" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden hero-gradient pt-24">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-10 w-72 h-72 bg-rose-200 rounded-full opacity-30 blur-3xl animate-float" />
        <div
          className="absolute bottom-20 left-10 w-96 h-96 bg-pink-200 rounded-full opacity-20 blur-3xl animate-float"
          style={{ animationDelay: "3s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-50 rounded-full opacity-40" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-full px-4 py-2 text-rose-600 text-sm font-medium mb-6">
              <Star className="w-4 h-4 fill-rose-500" />
              India&apos;s #1 Trusted Matrimony Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-gray-900 leading-tight mb-6">
              Find Your{" "}
              <span className="gradient-text">Perfect</span>{" "}
              Life Partner
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Join over 10 lakh members who have found love and happiness through
              Vivah Bandhan. Our intelligent matching system brings you closer to
              your ideal partner.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Link href="/register" className="btn-primary inline-flex items-center justify-center gap-2">
                <Heart className="w-5 h-5" />
                Register Free Today
              </Link>
              <Link href="/browse" className="btn-outline inline-flex items-center justify-center gap-2">
                <Search className="w-5 h-5" />
                Browse Profiles
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              {[
                { icon: Shield, text: "Verified Profiles" },
                { icon: Heart, text: "Mutual Matching" },
                { icon: Star, text: "Premium Support" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 text-sm text-gray-600 bg-white/70 rounded-full px-3 py-1.5 border border-gray-100"
                >
                  <Icon className="w-4 h-4 text-rose-500" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Stats grid */}
          <div className="hidden lg:grid grid-cols-2 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="glass-card rounded-2xl p-8 text-center card-hover"
              >
                <div className="text-4xl font-display font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile stats */}
        <div className="lg:hidden mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-display font-bold gradient-text">{stat.value}</div>
              <div className="text-gray-600 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
