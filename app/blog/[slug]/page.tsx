import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Heart,
  HeartHandshake,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import Footer from "@/components/layout/Footer";
import { blogCardImageOverrides } from "@/lib/constants/blog-card-image-overrides";
import {
  blogCategories,
  blogPosts,
  formatBlogDate,
  getBlogPostBySlug,
  getRelatedBlogPosts,
} from "@/lib/constants/blog";

const articleSectionIcons = [
  UserPlus,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  Users,
  Search,
  Sparkles,
];

const popularPostSidebarImageOverrides: Record<
  string,
  {
    imageSrc: string;
    objectPosition: string;
  }
> = {
  "how-to-choose-the-right-life-partner": {
    imageSrc: "/pp-1 (1).png",
    objectPosition: "center center",
  },
  "tips-for-a-successful-matrimonial-profile": {
    imageSrc: "/pp-1 (2).png",
    objectPosition: "center center",
  },
  "understanding-compatibility-in-relationships": {
    imageSrc: "/pp-1 (4).png",
    objectPosition: "center center",
  },
  "family-involvement-in-matchmaking": {
    imageSrc: "/pp-1 (5).png",
    objectPosition: "center center",
  },
  "things-to-discuss-before-marriage": {
    imageSrc: "/pp-1 (3).png",
    objectPosition: "center center",
  },
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Article Not Found",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [
        {
          url: post.imageSrc,
          alt: post.imageAlt,
        },
      ],
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedBlogPosts(post.slug, 4);
  const popularPosts = blogPosts.filter((entry) => entry.slug !== post.slug).slice(0, 5);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7fa_56%,#ffffff_100%)]">
      <LandingNavbar />

      <section className="pt-28 sm:pt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="ui-enter-up flex flex-wrap items-center gap-2 text-sm text-slate-500" style={{ animationDelay: "40ms" }}>
            <Link href="/" className="ui-link-shift transition-colors hover:text-rose-500">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/blog" className="ui-link-shift transition-colors hover:text-rose-500">
              Blog
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-slate-700">{post.category}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="line-clamp-1 text-slate-900">{post.title}</span>
          </div>

          <div className="ui-enter-scale relative mt-6 overflow-hidden rounded-[1rem] border border-rose-100 bg-white shadow-[0_24px_60px_rgba(244,63,94,0.08)]" style={{ animationDelay: "100ms" }}>
            <div className="absolute inset-x-0 -inset-y-3 sm:-inset-y-4 lg:-inset-y-5">
              <Image
                src={post.imageSrc}
                alt={post.imageAlt}
                fill
                className="object-contain object-right"
                priority
                sizes="100vw"
              />
            </div>

            <div className="relative min-h-[340px] p-8 sm:min-h-[400px] sm:px-10 sm:py-10 lg:min-h-[460px] lg:px-14 lg:py-12">
              <div className="max-w-3xl lg:max-w-[46%]">
                <span className="ui-enter-up inline-flex rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm" style={{ animationDelay: "180ms" }}>
                  {post.category}
                </span>
                <h1 className="ui-enter-up mt-6 max-w-2xl text-4xl font-bold tracking-tight text-[#931e42] sm:text-5xl lg:text-6xl lg:leading-[0.95]" style={{ animationDelay: "240ms" }}>
                  {post.title}
                </h1>
                <p className="ui-enter-up mt-6 max-w-2xl text-base leading-8 text-slate-700 sm:text-lg" style={{ animationDelay: "300ms" }}>
                  {post.excerpt}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
                    <div>
                      <div className="font-semibold text-slate-900">{post.author}</div>
                      <div className="text-xs text-slate-500">Expert editorial team</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-rose-400" />
                    <span>
                      {formatBlogDate(post.publishedAt)} - {post.readTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="space-y-8">
              <div className="ui-enter-up ui-card-lift rounded-[1.75rem] border border-rose-100 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)] sm:p-8" style={{ animationDelay: "120ms" }}>
                <p className="text-base leading-8 text-slate-700">{post.introduction}</p>

                <div className="mt-8 space-y-4">
                  {post.sections.map((section, index) => {
                    const Icon = articleSectionIcons[index % articleSectionIcons.length];

                    return (
                      <div
                        key={section.title}
                        className="ui-card-lift-soft flex gap-4 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm"
                      >
                        <div className="ui-icon-lift flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">
                            {index + 1}. {section.title}
                          </h2>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="ui-card-lift-soft mt-8 rounded-[1.5rem] border border-rose-100 bg-gradient-to-r from-rose-50 via-pink-50 to-white p-6">
                  <div className="flex items-center gap-3 text-rose-600">
                    <Check className="ui-icon-lift h-5 w-5" />
                    <span className="text-sm font-semibold uppercase tracking-[0.2em]">
                      Final Thought
                    </span>
                  </div>
                  <p className="mt-3 text-base leading-8 text-slate-700">
                    {post.finalThought}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-slate-900">Related Articles</h2>
                  <Link
                    href="/blog"
                    className="ui-link-shift inline-flex items-center gap-2 text-sm font-semibold text-rose-500 transition-colors hover:text-rose-600"
                  >
                    View All Articles
                    <ArrowRight className="ui-arrow-shift h-4 w-4" />
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {relatedPosts.map((relatedPost, index) => {
                    const relatedCardImage = blogCardImageOverrides[relatedPost.slug];

                    return (
                      <Link
                        key={relatedPost.slug}
                        href={`/blog/${relatedPost.slug}`}
                        className="ui-enter-up ui-card-lift group overflow-hidden rounded-[1.35rem] border border-rose-100 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.05)]"
                        style={{ animationDelay: `${180 + index * 70}ms` }}
                      >
                        <article>
                          <div className="relative h-36">
                            <Image
                              src={relatedCardImage?.imageSrc ?? relatedPost.imageSrc}
                              alt={relatedCardImage?.imageAlt ?? relatedPost.imageAlt}
                              fill
                              className="ui-media-zoom object-cover"
                              style={{
                                objectPosition:
                                  relatedCardImage?.cardObjectPosition ??
                                  relatedPost.cardObjectPosition,
                              }}
                              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="line-clamp-2 text-sm font-bold leading-6 text-slate-900">
                              {relatedPost.title}
                            </h3>
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                              <BookOpen className="h-3.5 w-3.5 text-rose-400" />
                              {relatedPost.readTime}
                            </div>
                          </div>
                        </article>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </article>

            <aside className="space-y-6">
              <div className="ui-enter-right ui-card-lift rounded-[1.75rem] border border-rose-100 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)]" style={{ animationDelay: "140ms" }}>
                <h2 className="text-2xl font-bold text-slate-900">Categories</h2>
                <div className="mt-5 space-y-2">
                  {blogCategories.map((category) => {
                    const isActive = category === post.category;

                    return (
                      <div
                        key={category}
                        className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-rose-50 text-rose-600"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {category}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="ui-enter-right ui-card-lift rounded-[1.75rem] border border-rose-100 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)]" style={{ animationDelay: "220ms" }}>
                <h2 className="text-2xl font-bold text-slate-900">Popular Posts</h2>
                <div className="mt-5 space-y-4">
                  {popularPosts.map((popularPost) => {
                    const sidebarImageOverride =
                      popularPostSidebarImageOverrides[popularPost.slug];

                    return (
                      <Link
                        key={popularPost.slug}
                        href={`/blog/${popularPost.slug}`}
                        className="ui-card-lift-soft flex gap-3 rounded-2xl p-2 transition-colors hover:bg-rose-50"
                      >
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                          <Image
                            src={sidebarImageOverride?.imageSrc ?? popularPost.imageSrc}
                            alt={popularPost.imageAlt}
                            fill
                            className="ui-media-zoom object-cover"
                            style={{
                              objectPosition:
                                sidebarImageOverride?.objectPosition ??
                                popularPost.cardObjectPosition,
                            }}
                            sizes="80px"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-slate-900">
                            {popularPost.title}
                          </h3>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatBlogDate(popularPost.publishedAt)}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="ui-enter-right ui-card-lift rounded-[1.75rem] border border-rose-100 bg-gradient-to-b from-rose-50 to-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)]" style={{ animationDelay: "300ms" }}>
                <h2 className="text-2xl font-bold text-slate-900">
                  Subscribe to Our Newsletter
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Get updates on new articles, success stories, and premium offers.
                </p>
                <div className="mt-5 space-y-3">
                  <div className="flex h-12 items-center rounded-xl border border-rose-100 bg-white px-4 text-sm text-slate-400">
                    <Mail className="mr-2 h-4 w-4 text-rose-400" />
                    Enter your email
                  </div>
                  <Link
                    href="/register"
                    className="ui-link-shift inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(244,63,94,0.22)]"
                  >
                    Subscribe
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="ui-enter-up ui-card-lift rounded-[2rem] border border-rose-100 bg-gradient-to-r from-rose-50 via-pink-50 to-white p-8 shadow-[0_16px_40px_rgba(244,63,94,0.08)] lg:flex lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-rose-500">
                <Heart className="ui-soft-float h-5 w-5 fill-rose-100" />
                <span className="text-sm font-semibold uppercase tracking-[0.24em]">
                  Find Your Match
                </span>
              </div>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">
                Ready to Find Your Perfect Match?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Join millions of happy members and start your journey with trusted
                profiles, meaningful conversations, and better matchmaking support.
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
