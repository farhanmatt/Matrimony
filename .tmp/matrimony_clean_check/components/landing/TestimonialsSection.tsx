import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya & Rajesh",
    location: "Mumbai, Maharashtra",
    since: "Married in 2023",
    rating: 5,
    text: "We found each other on Vivah Bandhan and couldn't be happier! The mutual match feature gave us confidence that the interest was genuine. Highly recommend to everyone looking for a life partner.",
    initial: "P",
    color: "bg-rose-500",
  },
  {
    name: "Ananya & Karthik",
    location: "Bangalore, Karnataka",
    since: "Married in 2022",
    rating: 5,
    text: "The profile privacy feature was a big plus for us. We felt safe sharing our information. The unlock feature worked flawlessly and we connected within a day of matching!",
    initial: "A",
    color: "bg-purple-500",
  },
  {
    name: "Sunita & Aakash",
    location: "Delhi, NCR",
    since: "Married in 2024",
    rating: 5,
    text: "My parents found my match on Vivah Bandhan. The family-oriented design made the process comfortable and transparent. We're now happily married and expecting our first child!",
    initial: "S",
    color: "bg-amber-500",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-white" id="testimonials">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="section-title">Success Stories</h2>
          <p className="section-subtitle mx-auto">
            Real stories from real couples who found love through Vivah Bandhan.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-gradient-to-br from-rose-50 to-white rounded-2xl p-8 border border-rose-100 card-hover relative"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-rose-100" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>

              <p className="text-gray-700 text-sm leading-relaxed mb-6 italic">
                &quot;{t.text}&quot;
              </p>

              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 ${t.color} rounded-full flex items-center justify-center text-white font-bold text-lg`}
                >
                  {t.initial}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 font-display text-sm">
                    {t.name}
                  </div>
                  <div className="text-xs text-gray-500">{t.location}</div>
                  <div className="text-xs text-rose-500 font-medium">{t.since}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
