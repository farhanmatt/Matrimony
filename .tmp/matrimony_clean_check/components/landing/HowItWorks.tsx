import { UserPlus, Search, HeartHandshake, Unlock } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: UserPlus,
    title: "Create Your Profile",
    description:
      "Sign up and create a detailed matrimony profile with your personal, family, and lifestyle details.",
  },
  {
    step: "02",
    icon: Search,
    title: "Browse & Discover",
    description:
      "Explore thousands of verified profiles filtered by religion, location, age, profession and more.",
  },
  {
    step: "03",
    icon: HeartHandshake,
    title: "Show Interest & Match",
    description:
      "Like profiles you're interested in. A match is confirmed only when both of you like each other.",
  },
  {
    step: "04",
    icon: Unlock,
    title: "Unlock & Connect",
    description:
      "Unlock your match's full profile and contact details to begin your journey towards a happy marriage.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 bg-white" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle mx-auto">
            Find your life partner in four simple steps. Our process is designed
            to be seamless, secure, and effective.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connecting line — desktop only */}
          <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-rose-200 via-rose-400 to-rose-200" />

          {steps.map((step, idx) => (
            <div
              key={step.step}
              className="relative text-center group"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Step circle */}
              <div className="relative mx-auto w-32 h-32 mb-6">
                <div className="absolute inset-0 bg-rose-50 rounded-full group-hover:bg-rose-100 transition-colors" />
                <div className="absolute inset-4 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-rose-300 transition-all group-hover:scale-105">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-900 text-white text-xs font-bold rounded-full flex items-center justify-center font-mono">
                  {step.step}
                </div>
              </div>

              <h3 className="text-lg font-display font-bold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
