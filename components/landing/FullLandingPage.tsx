import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Crown,
  Gem,
  Headphones,
  Heart,
  HeartHandshake,
  ImagePlus,
  Instagram,
  Linkedin,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Twitter,
  UserPlus,
  Users,
  Youtube,
} from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHeroBanner from "@/components/landing/LandingHeroBanner";
import LandingReveal from "@/components/landing/LandingReveal";
import { blogCardImageOverrides } from "@/lib/constants/blog-card-image-overrides";
import { blogPosts } from "@/lib/constants/blog";

const searchFields = [
  {
    label: "I am looking for",
    options: ["Bride", "Groom"],
  },
  {
    label: "Age",
    options: ["22", "23", "24", "25"],
  },
  {
    label: "To",
    options: ["28", "29", "30", "31"],
  },
  {
    label: "Religion",
    options: ["Hindu", "Muslim", "Christian", "Sikh"],
  },
  {
    label: "Community",
    options: ["Select Community", "Tamil", "Telugu", "Kannada"],
  },
  {
    label: "Location",
    options: ["Select Location", "Chennai", "Bangalore", "Hyderabad"],
  },
];

export type LandingFeaturedProfile = {
  cardKey: string;
  nameLabelUrl: string | null;
  location: string;
  previewImageUrl: string | null;
};

const whyChooseUs = [
  {
    icon: ShieldCheck,
    title: "Verified Profiles",
    description: "All profiles are manually verified for authenticity.",
  },
  {
    icon: Lock,
    title: "100% Privacy",
    description: "Your privacy is our priority. Data is secure with us.",
  },
  {
    icon: HeartHandshake,
    title: "Easy Matching",
    description: "Advanced matching logic helps you find better fits faster.",
  },
  {
    icon: MessageCircle,
    title: "Secure Chat",
    description: "Profile visibility control helps protect every conversation.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "We are always here to help you at every stage.",
  },
];

const steps = [
  {
    step: "1",
    icon: UserPlus,
    title: "Register",
    description: "Create your account for free and get started in minutes.",
  },
  {
    step: "2",
    icon: ImagePlus,
    title: "Create Profile",
    description: "Fill your details, add photos, and set your preferences.",
  },
  {
    step: "3",
    icon: Heart,
    title: "Find Match",
    description: "Search, connect, and find your perfect life partner.",
  },
];

const successStories = [
  {
    name: "Arun & Divya",
    quote: "We met on this platform and found our perfect match. Thank you.",
    imagePosition: "78% center",
  },
  {
    name: "Karthik & Meena",
    quote: "A trusted platform that helped us find each other and start a new journey.",
    imagePosition: "76% center",
  },
  {
    name: "Vignesh & Sowmya",
    quote: "Highly recommended for people who are looking for serious relationships.",
    imagePosition: "82% center",
  },
];

const membershipPlans = [
  {
    name: "Free Plan",
    price: "Rs0",
    duration: "/ Lifetime",
    icon: Star,
    accent: "from-amber-50 to-white",
    iconWrap: "bg-amber-100 text-amber-500",
    button: "Join Free",
    features: ["Create Profile", "Search Profiles", "Send Interest (Limited)"],
  },
  {
    name: "Premium Plan",
    price: "Rs1499",
    duration: "/ 3 Months",
    icon: Crown,
    accent: "from-rose-50 to-white",
    iconWrap: "bg-rose-100 text-rose-500",
    button: "Upgrade Now",
    badge: "Popular",
    features: [
      "View Full Profiles",
      "Send & Receive Messages",
      "Contact Details Access",
      "Premium Support",
    ],
  },
  {
    name: "Deluxe Plan",
    price: "Rs2999",
    duration: "/ 6 Months",
    icon: Gem,
    accent: "from-yellow-50 to-white",
    iconWrap: "bg-yellow-100 text-yellow-600",
    button: "Upgrade Now",
    features: [
      "All Premium Features",
      "Highlighted Profile",
      "Priority Customer Support",
      "Profile Boost",
    ],
  },
];

const premiumBenefits = [
  "Safe & Secure",
  "Trusted by Millions",
  "No Hidden Charges",
  "14 Days Money Back",
];

const footerColumns = [
  {
    title: "Quick Links",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/#find-match", label: "Search" },
      { href: "/#membership-plans", label: "Membership Plans" },
      { href: "/#success-stories", label: "Success Stories" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact Us" },
    ],
  },
  {
    title: "Help & Support",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/contact", label: "Support" },
      { href: "/contact", label: "Safety Tips" },
    ],
  },
];

function resolveExternalUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

const footerSocialLinks = [
  {
    label: "Instagram",
    href: resolveExternalUrl(
      process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL || "https://www.instagram.com/",
    ),
    Icon: Instagram,
  },
  {
    label: "X (Twitter)",
    href: resolveExternalUrl(
      process.env.NEXT_PUBLIC_SOCIAL_TWITTER_URL || "https://x.com/",
    ),
    Icon: Twitter,
  },
  {
    label: "LinkedIn",
    href: resolveExternalUrl(
      process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL || "https://www.linkedin.com/",
    ),
    Icon: Linkedin,
  },
  {
    label: "YouTube",
    href: resolveExternalUrl(
      process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL || "https://www.youtube.com/",
    ),
    Icon: Youtube,
  },
];

function SectionTitle({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 fill-rose-100 text-rose-500" />
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="landing-section-link inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50"
        >
          {linkLabel}
          <ChevronRight className="landing-section-link-icon h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

interface FullLandingPageProps {
  featuredProfiles?: LandingFeaturedProfile[];
  featuredProfilesUnavailable?: boolean;
  heroImageUrl?: string;
  session?: Session | null;
}

export default function FullLandingPage({
  featuredProfiles = [],
  featuredProfilesUnavailable = false,
  heroImageUrl,
  session,
}: FullLandingPageProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff9fb_0%,#fff4f7_40%,#ffffff_100%)] text-slate-900">
      <LandingNavbar session={session} />

      <section className="relative overflow-hidden border-b border-rose-100/70 bg-white pt-[76px]">
        <div className="relative w-full pb-24">
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[1600/639]">
            <LandingHeroBanner initialHeroImageUrl={heroImageUrl ?? "/main.jpeg"} />
          </div>

          <div
            id="find-match"
            className="landing-reveal relative z-10 mx-auto mt-12 max-w-[84rem] rounded-[1rem] border border-white/80 bg-white/95 p-6 shadow-[0_24px_56px_rgba(15,23,42,0.12)] backdrop-blur lg:mt-8"
            style={{ animationDelay: "620ms" }}
          >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-rose-200/90 to-transparent" />
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-rose-100 p-2 text-rose-500">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">
                    Find Your Match
                  </div>
                  <div className="text-sm text-slate-500">
                    Refine your preferences and discover better introductions.
                  </div>
                </div>
              </div>
              <Link
                href="/register"
                className="text-sm font-semibold text-rose-500 transition-colors hover:text-rose-600"
              >
                Advanced Search
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_0.75fr_0.75fr_1fr_1fr_1fr_auto]">
              {searchFields.map((field) => (
                <label key={field.label} className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {field.label}
                  </span>
                  <select
                    suppressHydrationWarning
                    className="h-12 w-full rounded-xl border border-rose-100 bg-white px-4 text-sm text-slate-700 outline-none transition-colors focus:border-rose-300"
                  >
                    {field.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              ))}
              <div className="flex items-end">
                <Link
                  href="/register"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-6 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(244,63,94,0.2)]"
                >
                  Search
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="featured" className="py-8">
        <div className="mx-auto max-w-[86rem] px-4 sm:px-6 lg:px-8">
          <LandingReveal delayMs={40} variant="left">
            <div>
              <SectionTitle
                title="Featured Profiles"
                href="/register"
                linkLabel="View All Profiles"
              />
            </div>
          </LandingReveal>

          {featuredProfiles.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              {featuredProfiles.map((profile, index) => (
                <LandingReveal
                  key={profile.cardKey}
                  delayMs={80 + index * 70}
                  variant="scale"
                >
                  <article className="landing-surface group overflow-hidden rounded-[1.5rem] border border-rose-100 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                    <div className="relative h-52">
                      {profile.previewImageUrl ? (
                        <Image
                          src={profile.previewImageUrl}
                          alt="Blurred featured profile preview"
                          fill
                          className="landing-surface-media object-cover blur-[3px]"
                          sizes="(max-width: 1280px) 50vw, 16vw"
                        />
                      ) : (
                        <div className="h-full bg-[radial-gradient(circle_at_top,#ffe4eb_0%,#f8bbd0_42%,#f48fb1_100%)]" />
                      )}
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-rose-600 to-pink-500 px-3 py-1 text-xs font-semibold text-white">
                        Featured
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="landing-surface-icon rounded-full bg-white/90 p-4 text-rose-500 shadow-lg">
                          <Lock className="h-6 w-6" />
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="min-h-[1.9rem]">
                        {profile.nameLabelUrl ? (
                          <Image
                            src={profile.nameLabelUrl}
                            alt="Featured profile name"
                            width={360}
                            height={42}
                            className="block h-7 w-auto max-w-full"
                            sizes="180px"
                            unoptimized
                          />
                        ) : (
                          <div className="text-lg font-bold text-slate-900">
                            Featured Profile
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="h-4 w-4 text-rose-400" />
                        {profile.location}
                      </div>
                    </div>
                  </article>
                </LandingReveal>
              ))}
            </div>
          ) : (
            <LandingReveal delayMs={90}>
              <div className="rounded-[1.5rem] border border-rose-100 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
                {featuredProfilesUnavailable
                  ? "Featured profiles are temporarily unavailable because we couldn't reach the database. Please refresh shortly."
                  : "Featured member profiles will appear here as users complete their registration."}
              </div>
            </LandingReveal>
          )}

          <LandingReveal delayMs={130} variant="up">
            <div className="mx-auto mt-5 flex w-full max-w-5xl flex-col gap-3 px-2 py-1 text-sm font-medium text-slate-600 sm:w-fit sm:max-w-full sm:flex-row sm:items-center sm:justify-center sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="landing-surface-icon rounded-full bg-rose-100 p-2 text-rose-500">
                  <Lock className="h-4 w-4" />
                </div>
                Login or Register to view full profiles, contact details, and more.
              </div>
              <Link
                href="/register"
                className="landing-inline-hover inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Register Now
              </Link>
            </div>
          </LandingReveal>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-[82rem] px-4 sm:px-6 lg:px-8">
          <LandingReveal delayMs={40} variant="left">
            <div>
              <SectionTitle title="Why Choose Us?" />
            </div>
          </LandingReveal>
          <LandingReveal delayMs={100} variant="up">
            <div className="landing-surface rounded-[1.2rem] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,246,248,0.9),rgba(255,255,255,0.9))] px-6 py-6 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
              <div className="grid gap-6 lg:grid-cols-5">
                {whyChooseUs.map((item) => (
                  <div key={item.title} className="landing-inline-hover flex items-start gap-4">
                    <div className="landing-surface-icon mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500 shadow-sm ring-1 ring-rose-100">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">{item.title}</div>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </LandingReveal>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-[82rem] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.84fr_1.16fr]">
            <LandingReveal delayMs={40} variant="left">
              <div>
                <SectionTitle title="How It Works?" />
                <div className="rounded-[1.7rem] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,249,0.92))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-4.5">
                  <div className="grid gap-2.5 md:grid-cols-3">
                    {steps.map((step, index) => (
                      <div
                        key={step.step}
                        className="landing-surface-soft relative flex min-h-[5.9rem] flex-col rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,244,247,0.9),rgba(255,250,251,0.98))] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="landing-surface-icon flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-rose-600 to-pink-500 text-base font-bold text-white shadow-[0_12px_24px_rgba(244,63,94,0.18)]">
                            {step.step}
                          </div>
                          {index < steps.length - 1 ? (
                            <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-white/80 text-rose-300 shadow-sm ring-1 ring-rose-100 md:flex">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          ) : null}
                        </div>
                        <div className="landing-surface-icon mt-2 flex h-9 w-9 items-center justify-center rounded-[0.85rem] bg-white text-rose-500 shadow-[0_10px_22px_rgba(15,23,42,0.08)] ring-1 ring-rose-100">
                          <step.icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="mt-0.5 text-[0.9rem] font-bold leading-snug text-slate-900">
                          {step.title}
                        </div>
                        <p className="mt-0.5 max-w-[11.5rem] text-[0.74rem] leading-4 text-slate-600">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </LandingReveal>

            <div id="success-stories" className="lg:w-full">
              <LandingReveal delayMs={90} variant="right">
                <div>
                  <SectionTitle
                    title="Success Stories"
                    href="/register"
                    linkLabel="View All Stories"
                  />
                </div>
              </LandingReveal>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {successStories.map((story, index) => (
                  <LandingReveal key={story.name} delayMs={130 + index * 80} variant="right">
                    <article className="landing-surface group flex min-h-[4.6rem] overflow-hidden rounded-[1.1rem] border border-rose-100 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
                      <div className="relative w-20 shrink-0 sm:w-24">
                        <Image
                          src="/main.jpeg"
                          alt={story.name}
                          fill
                          className="landing-surface-media object-cover"
                          style={{ objectPosition: story.imagePosition }}
                          sizes="(max-width: 640px) 80px, 96px"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-center px-3 py-2">
                        <div className="text-[0.9rem] font-bold leading-snug text-slate-900">
                          {story.name}
                        </div>
                        <p className="mt-0.5 text-[0.72rem] leading-4 text-slate-500">
                          &quot;{story.quote}&quot;
                        </p>
                      </div>
                    </article>
                  </LandingReveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="blog" className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <LandingReveal delayMs={40} variant="left">
            <div>
              <SectionTitle
                title="Expert Advice & Blog"
                href="/blog"
                linkLabel="View All Articles"
              />
            </div>
          </LandingReveal>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {blogPosts.map((post, index) => {
              const landingImage = blogCardImageOverrides[post.slug];

              return (
                <LandingReveal key={post.slug} delayMs={90 + index * 70} variant="scale">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="landing-surface group block overflow-hidden rounded-[1.5rem] border border-rose-100 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]"
                  >
                    <article>
                      <div className="relative h-44">
                        <Image
                          src={landingImage?.imageSrc ?? post.imageSrc}
                          alt={landingImage?.imageAlt ?? post.imageAlt}
                          fill
                          className="landing-surface-media object-cover"
                          style={{
                            objectPosition:
                              landingImage?.cardObjectPosition ??
                              post.cardObjectPosition,
                          }}
                          sizes="(max-width: 1280px) 50vw, 20vw"
                        />
                      </div>
                      <div className="p-4">
                        <div className="line-clamp-2 text-base font-bold text-slate-900">
                          {post.title}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                          <BookOpen className="h-4 w-4 text-rose-400" />
                          {post.readTime}
                        </div>
                      </div>
                    </article>
                  </Link>
                </LandingReveal>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="mt-10 bg-[linear-gradient(180deg,#b3135e_0%,#4a1239_34%,#26102f_100%)] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <LandingReveal delayMs={40} variant="up">
            <div className="grid gap-6 border-b border-white/10 py-5 lg:grid-cols-[1.2fr_1.5fr_0.8fr] lg:items-center">
              <div>
                <div className="text-xl font-bold">Subscribe to our Newsletter</div>
                <p className="mt-1 text-sm text-rose-100/90">
                  Get updates on new profiles, success stories, and premium offers.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  autoComplete="email"
                  suppressHydrationWarning
                  placeholder="Enter your email"
                  className="h-12 flex-1 rounded-xl border border-white/15 bg-white/95 px-4 text-sm text-slate-700 outline-none"
                />
                <Link
                  href="/register"
                  className="landing-inline-hover inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-pink-400 px-6 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(244,63,94,0.24)]"
                >
                  Subscribe
                </Link>
              </div>
              <div className="flex items-center gap-3 lg:justify-end">
                <span className="text-sm font-semibold text-rose-100">Follow Us</span>
                {footerSocialLinks.map(({ label, href, Icon }) =>
                  href ? (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="landing-inline-hover flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/90 transition-colors hover:bg-white/20"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ) : (
                    <span
                      key={label}
                      aria-disabled="true"
                      aria-label={`${label} link not configured`}
                      title={`${label} link not configured`}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40"
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  ),
                )}
              </div>
            </div>
          </LandingReveal>

          <LandingReveal delayMs={110} variant="up">
            <div className="grid gap-10 py-7 lg:grid-cols-[1.1fr_0.7fr_0.7fr_1fr]">
              <div>
                <Link href="/" className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                    <Heart className="h-5 w-5 fill-white" />
                  </div>
                  <div className="font-display text-2xl font-bold">Vivah Bandhan</div>
                </Link>
                <p className="mt-4 max-w-xs text-sm leading-7 text-rose-100/85">
                  Helping you find your perfect life partner with trusted and
                  verified profiles across India.
                </p>
              </div>

              {footerColumns.map((column) => (
                <div key={column.title}>
                  <div className="text-lg font-bold">{column.title}</div>
                  <ul className="mt-4 space-y-3 text-sm text-rose-100/85">
                    {column.links
                      .filter((link) => link.label !== "Membership Plans")
                      .map((link) => (
                        <li key={link.label}>
                          <Link
                            href={link.href}
                            className="transition-colors hover:text-white"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}

              <div>
                <div className="text-lg font-bold">Contact Us</div>
                <ul className="mt-4 space-y-4 text-sm text-rose-100/85">
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-rose-200" />
                    <div>
                      <div>Bagavath85@gmail.com</div>
                      <p className="mt-2 max-w-xs text-xs leading-5 text-rose-100/65">
                        Have a question? We&apos;re here to help. Expect a response within 48 hours.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </LandingReveal>

          <div className="border-t border-white/10 py-5 text-center text-sm text-rose-100/75">
            © {new Date().getFullYear()} Vivah Bandhan. All Rights Reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
