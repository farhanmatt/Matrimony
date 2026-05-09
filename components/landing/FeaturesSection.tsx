import {
  Shield,
  Search,
  Heart,
  Lock,
  Users,
  Star,
  Smartphone,
  Headphones,
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Verified Profiles",
    description:
      "All profiles go through a verification process ensuring you connect with genuine people.",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    icon: Search,
    title: "Smart Matching",
    description:
      "Our algorithm finds profiles that match your preferences, religion, and lifestyle.",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    icon: Heart,
    title: "Mutual Matching",
    description:
      "Matches are confirmed only when both parties show interest — no awkward one-sided connections.",
    color: "text-rose-500",
    bg: "bg-rose-50",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description:
      "Your contact details are hidden until a mutual match is confirmed and you choose to unlock.",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: Users,
    title: "Family-Friendly",
    description:
      "Designed for families too. Parents can browse and manage profiles with full transparency.",
    color: "text-green-500",
    bg: "bg-green-50",
  },
  {
    icon: Star,
    title: "Premium Profiles",
    description:
      "Standout profiles with detailed information, multiple photos, and horoscope details.",
    color: "text-yellow-500",
    bg: "bg-yellow-50",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description:
      "Fully optimized for all devices. Browse, match, and connect from anywhere.",
    color: "text-cyan-500",
    bg: "bg-cyan-50",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description:
      "Our dedicated team is available around the clock to help you on your journey.",
    color: "text-indigo-500",
    bg: "bg-indigo-50",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 section-gradient" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="section-title">Why Vivah Bandhan?</h2>
          <p className="section-subtitle mx-auto">
            Trusted by millions across India. Here&apos;s what makes us different.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover group"
            >
              <div
                className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="font-display font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
