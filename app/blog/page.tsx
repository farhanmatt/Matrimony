import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, Heart } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import Footer from "@/components/layout/Footer";
import { blogPosts, formatBlogDate } from "@/lib/constants/blog";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Expert Advice & Blog",
  description:
    "Read expert relationship advice, matchmaking tips, and matrimony guidance from Vivah Bandhan.",
  alternates: { canonical: "/blog" },
};

export default async function BlogListingPage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff_0%,#fff7fa_48%,#ffffff_100%)]">
      <LandingNavbar session={session} />

      <section className="pt-28 sm:pt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="ui-enter-up flex items-center gap-2 text-sm text-slate-500" style={{ animationDelay: "40ms" }}>
            <Link href="/" className="ui-link-shift transition-colors hover:text-rose-500">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-slate-700">Blog</span>
          </div>

          <div className="ui-enter-scale mt-6 rounded-[2rem] border border-rose-100 bg-white/90 p-8 shadow-[0_24px_60px_rgba(244,63,94,0.08)] backdrop-blur md:p-10" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-2 text-rose-500">
              <Heart className="ui-soft-float h-5 w-5 fill-rose-100" />
              <span className="text-sm font-semibold uppercase tracking-[0.24em]">
                Expert Advice
              </span>
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Expert Advice & Blog
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Explore relationship insights, profile tips, and practical guidance
              designed to help singles and families make better matrimonial decisions.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {blogPosts.map((post, index) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="ui-enter-up ui-card-lift group overflow-hidden rounded-[1.75rem] border border-rose-100 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
                style={{ animationDelay: `${160 + index * 70}ms` }}
              >
                <article>
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={post.imageSrc}
                      alt={post.imageAlt}
                      fill
                      className="ui-media-zoom object-cover"
                      style={{ objectPosition: post.cardObjectPosition }}
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm">
                        {post.category}
                      </span>
                      <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-white">
                        {post.readTime}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <h2 className="line-clamp-2 text-2xl font-bold leading-tight text-slate-900">
                      {post.title}
                    </h2>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {post.excerpt}
                    </p>
                    <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-rose-400" />
                        {formatBlogDate(post.publishedAt)}
                      </div>
                      <span className="ui-link-shift inline-flex items-center gap-2 font-semibold text-rose-500 transition-colors group-hover:text-rose-600">
                        Read article
                        <ArrowRight className="ui-arrow-shift h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="ui-enter-up ui-card-lift mt-2 rounded-[2rem] border border-rose-100 bg-gradient-to-r from-rose-50 via-pink-50 to-white p-8 shadow-[0_16px_40px_rgba(244,63,94,0.08)] lg:flex lg:items-center lg:justify-between" style={{ animationDelay: "120ms" }}>
            <div>
              <div className="flex items-center gap-2 text-rose-500">
                <Heart className="ui-soft-float h-5 w-5 fill-rose-100" />
                <span className="text-sm font-semibold uppercase tracking-[0.24em]">
                  Start Your Journey
                </span>
              </div>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">
                Ready to Find Your Perfect Match?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Join thousands of members who are taking the next step with trusted
                profiles, better guidance, and meaningful connections.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0">
              <Link
                href="/register"
                className="ui-link-shift inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-6 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(244,63,94,0.22)]"
              >
                Register Free
              </Link>
              <Link
                href="/#find-match"
                className="ui-link-shift inline-flex h-12 items-center justify-center rounded-xl border border-rose-200 bg-white px-6 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50"
              >
                Search Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
