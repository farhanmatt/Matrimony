import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createFeaturedProfilePreviewToken,
  getFeaturedProfilePreviewSource,
} from "@/lib/server/featured-profile-preview";
import { getProtectedMatchProfileImageUrl } from "@/lib/server/match-profile-preview";
import { isDatabaseConnectionError } from "@/lib/utils/errors";
import { calculateAge } from "@/lib/utils/helpers";
import { getMatchesForProfile } from "@/lib/utils/matching";
import { getProfileCompletion } from "@/lib/utils/profileCompletion";
import DashboardNotificationsCard from "@/components/dashboard/DashboardNotificationsCard";
import {
  DashboardProfileCompletionSidebar,
  DashboardProfileCompletionStatCard,
} from "@/components/dashboard/DashboardProfileCompletion";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  DatabaseZap,
  Heart,
  HeartHandshake,
  LifeBuoy,
  Lock,
  MapPin,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Unlock,
  Users,
} from "lucide-react";

const sampleProfileImages = [
  "/pp-1%20%281%29.png",
  "/pp-1%20%282%29.png",
  "/pp-1%20%283%29.png",
  "/pp-1%20%284%29.png",
  "/pp-1%20%285%29.png",
  "/image-2.png",
];

const fallbackRecommendedProfiles = [
  {
    id: "sample-f-1",
    fullName: "Anushree",
    age: 26,
    profession: "Software Engineer",
    location: "Chennai, Tamil Nadu",
    image: sampleProfileImages[0],
    badge: "New",
    gender: "FEMALE",
  },
  {
    id: "sample-f-2",
    fullName: "Swetha",
    age: 24,
    profession: "Doctor",
    location: "Coimbatore, Tamil Nadu",
    image: sampleProfileImages[1],
    badge: "New",
    gender: "FEMALE",
  },
  {
    id: "sample-f-3",
    fullName: "Harini",
    age: 27,
    profession: "Chartered Accountant",
    location: "Bangalore, Karnataka",
    image: sampleProfileImages[2],
    badge: "Premium",
    gender: "FEMALE",
  },
  {
    id: "sample-f-4",
    fullName: "Nandhini",
    age: 25,
    profession: "Marketing Manager",
    location: "Hyderabad, Telangana",
    image: sampleProfileImages[3],
    badge: "New",
    gender: "FEMALE",
  },
  {
    id: "sample-f-5",
    fullName: "Priya",
    age: 26,
    profession: "Software Developer",
    location: "Pune, Maharashtra",
    image: sampleProfileImages[4],
    badge: "Premium",
    gender: "FEMALE",
  },
  {
    id: "sample-f-6",
    fullName: "Aishwarya",
    age: 28,
    profession: "Architect",
    location: "Trichy, Tamil Nadu",
    image: sampleProfileImages[5],
    badge: "New",
    gender: "FEMALE",
  },
  {
    id: "sample-m-1",
    fullName: "Arjun",
    age: 28,
    profession: "Software Engineer",
    location: "Chennai, Tamil Nadu",
    image: "/male-avatar.svg",
    badge: "New",
    gender: "MALE",
  },
  {
    id: "sample-m-2",
    fullName: "Karthik",
    age: 29,
    profession: "Architect",
    location: "Coimbatore, Tamil Nadu",
    image: "/male-avatar.svg",
    badge: "Premium",
    gender: "MALE",
  },
  {
    id: "sample-m-3",
    fullName: "Rohit",
    age: 27,
    profession: "Product Designer",
    location: "Bangalore, Karnataka",
    image: "/male-avatar.svg",
    badge: "New",
    gender: "MALE",
  },
  {
    id: "sample-m-4",
    fullName: "Vikram",
    age: 30,
    profession: "Business Owner",
    location: "Madurai, Tamil Nadu",
    image: "/male-avatar.svg",
    badge: "New",
    gender: "MALE",
  },
  {
    id: "sample-m-5",
    fullName: "Surya",
    age: 26,
    profession: "Doctor",
    location: "Trichy, Tamil Nadu",
    image: "/male-avatar.svg",
    badge: "Premium",
    gender: "MALE",
  },
  {
    id: "sample-m-6",
    fullName: "Naveen",
    age: 25,
    profession: "Marketing Manager",
    location: "Hyderabad, Telangana",
    image: "/male-avatar.svg",
    badge: "New",
    gender: "MALE",
  },
] as const;

const fallbackSuccessStory = {
  title: "Arun & Divya",
  quote:
    "We met on this platform and found our perfect match. Thank you for making the journey feel simple and meaningful.",
  image: "/image-1.jpeg",
};

function formatRelativeTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function getLocation(city?: string | null, state?: string | null) {
  const parts = [city, state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "India";
}

function getOppositeGender(gender?: string | null) {
  if (gender === "MALE") return "FEMALE" as const;
  if (gender === "FEMALE") return "MALE" as const;
  return null;
}

function getSafeImageUrl(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getFallbackAvatar(gender?: string | null, index = 0) {
  if (gender === "MALE") return "/male-avatar.svg";
  if (gender === "FEMALE") return "/female-avatar.svg";
  return sampleProfileImages[index % sampleProfileImages.length];
}

function getProfileCardImage(
  previewImageUrl?: string | null,
  gender?: string | null,
  index = 0
) {
  return (
    getSafeImageUrl(previewImageUrl) ??
    getFallbackAvatar(gender, index)
  );
}

function getAuthenticatedProfilePreviewUrl(profile: {
  id: string;
  profileImage?: string | null;
  photos: Array<{
    url: string;
    publicId: string;
  }>;
}) {
  const previewSource = getFeaturedProfilePreviewSource({
    profileImage: profile.profileImage ?? null,
    photos: profile.photos,
  });
  const previewToken =
    previewSource.previewUrl && previewSource.fingerprint
      ? createFeaturedProfilePreviewToken({
          profileId: profile.id,
          fingerprint: previewSource.fingerprint,
        })
      : null;

  return previewToken
    ? `/api/profiles/preview/${encodeURIComponent(previewToken)}`
    : null;
}

async function getDashboardHomeData(userId: string) {
  try {
    const profile = await prisma.profile.findFirst({
      where: { userId, status: "ACTIVE" },
      select: {
        id: true,
        fullName: true,
        status: true,
        profileImage: true,
        gender: true,
        dateOfBirth: true,
        height: true,
        maritalStatus: true,
        phone: true,
        bio: true,
        profession: true,
        education: true,
        course: true,
        employedIn: true,
        income: true,
        religion: true,
        caste: true,
        subCaste: true,
        language: true,
        fatherName: true,
        familyType: true,
        familyStatus: true,
        motherName: true,
        siblings: true,
        star: true,
        rasi: true,
        timeOfBirth: true,
        placeOfBirth: true,
        diet: true,
        smoking: true,
        drinking: true,
        hobbies: true,
        physicalActivity: true,
        personalityType: true,
        horoscopeImage: true,
        city: true,
        state: true,
        pincode: true,
        photos: {
          where: { isPrimary: true },
          select: { url: true, isPrimary: true },
          take: 1,
        },
        preference: {
          select: {
            id: true,
            ageMin: true,
            ageMax: true,
            heightMin: true,
            heightMax: true,
            religion: true,
            caste: true,
            location: true,
            language: true,
            education: true,
            profession: true,
            maritalStatus: true,
          },
        },
      },
    });

    if (!profile) {
      return {
        profile: null,
        stats: {
          likesGiven: 0,
          likesReceived: 0,
          matches: 0,
          unlocks: 0,
        },
        recentLikes: [],
        recentMatches: [],
        recommendedProfiles: [],
        dbUnavailable: false,
      };
    }

    const recommendedGender = getOppositeGender(profile.gender);

    const [
      likesGiven,
      likesReceived,
      recentLikes,
      activeMatches,
      unlocks,
      recommendedProfiles,
    ] = await Promise.all([
      prisma.like.count({
        where: {
          fromProfileId: profile.id,
          toProfile: { status: "ACTIVE" },
        },
      }),
      prisma.like.count({
        where: {
          toProfileId: profile.id,
          fromProfile: { status: "ACTIVE" },
        },
      }),
      prisma.like.findMany({
        where: {
          toProfileId: profile.id,
          fromProfile: { status: "ACTIVE" },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          createdAt: true,
          fromProfile: {
            select: {
              id: true,
              fullName: true,
              city: true,
              state: true,
              location: true,
              profession: true,
              profileImage: true,
              photos: {
                where: { isPrimary: true },
                select: { url: true, publicId: true, isPrimary: true },
                take: 1,
              },
            },
          },
        },
      }),
      getMatchesForProfile(profile.id),
      prisma.unlock.count({
        where: {
          userId,
          type: "PROFILE",
          match: {
            OR: [
              { profileA: { status: "ACTIVE" }, profileBId: profile.id },
              { profileB: { status: "ACTIVE" }, profileAId: profile.id },
            ]
          }
        },
      }),
      prisma.profile.findMany({
        where: {
          status: "ACTIVE",
          userId: { not: userId },
          ...(recommendedGender ? { gender: recommendedGender } : {}),
          likesReceived: {
            none: {
              fromProfile: {
                userId,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          fullName: true,
          gender: true,
          dateOfBirth: true,
          profession: true,
          city: true,
          state: true,
          profileImage: true,
          photos: {
            where: { isPrimary: true },
            select: { url: true, publicId: true, isPrimary: true },
            take: 1,
          },
        },
      }),
    ]);

    const matchedProfileIds = new Set(
      activeMatches.map((match) =>
        match.profileAId === profile.id ? match.profileB.id : match.profileA.id
      )
    );
    const recentMatches = activeMatches.slice(0, 3).map((match) =>
      match.profileAId === profile.id ? match.profileB : match.profileA
    );
    const visibleRecentLikes = recentLikes.filter(
      (like) => !matchedProfileIds.has(like.fromProfile.id)
    );

    return {
      profile,
      stats: {
        likesGiven,
        likesReceived,
        matches: activeMatches.length,
        unlocks,
      },
      recentLikes: visibleRecentLikes.map((like) => ({
        id: like.id,
        createdAt: like.createdAt.toISOString(),
        fromProfile: like.fromProfile,
      })),
      recentMatches,
      recommendedProfiles,
      dbUnavailable: false,
    };
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return {
        profile: null,
        stats: {
          likesGiven: 0,
          likesReceived: 0,
          matches: 0,
          unlocks: 0,
        },
        recentLikes: [],
        recentMatches: [],
        recommendedProfiles: [],
        dbUnavailable: true,
      };
    }

    throw error;
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { profile, stats, recentLikes, recentMatches, recommendedProfiles, dbUnavailable } =
    await getDashboardHomeData(session.user.id);

  const profileCompletion = getProfileCompletion(profile, {
    hasPersistedProfile: Boolean(profile),
  });
  const recommendedGender = getOppositeGender(profile?.gender);
  const fallbackRecommendedCards = fallbackRecommendedProfiles.filter(
    (candidate) => !recommendedGender || candidate.gender === recommendedGender
  );
  const recommendedCards = recommendedProfiles.map((candidate, index) => ({
    id: candidate.id,
    fullName: candidate.fullName,
    age: calculateAge(candidate.dateOfBirth),
    profession: candidate.profession ?? "Professional",
    location: getLocation(candidate.city, candidate.state),
    image: getProfileCardImage(
      getAuthenticatedProfilePreviewUrl(candidate),
      candidate.gender,
      index
    ),
    badge: index % 3 === 1 ? "Premium" : "New",
  }));
  const visibleRecommendedCards = recommendedCards.slice(0, 4);
  const suggestedFallbackCards =
    recommendedCards.length > 0 ? recommendedCards : fallbackRecommendedCards.slice(0, 6);

  const notificationItems =
    recentLikes.length > 0
      ? recentLikes.map((like) => ({
          id: like.id,
          title: `${like.fromProfile.fullName} liked your profile`,
          subtitle: like.fromProfile.profession ?? "New interest received",
          time: formatRelativeTime(like.createdAt),
        }))
      : [
          {
            id: "empty-notification",
            title: "No new profile activity yet",
            subtitle: "Keep your profile fresh to attract more interests.",
            time: "Just now",
          },
        ];

  const recentInterestItems =
    recentLikes.slice(0, 3).map((like) => ({
      id: like.id,
      name: like.fromProfile.fullName,
      profession: like.fromProfile.profession ?? "Interest received",
      location: getLocation(like.fromProfile.city, like.fromProfile.state),
      avatar:
        getAuthenticatedProfilePreviewUrl(like.fromProfile) ??
        sampleProfileImages[0],
      status: "Received",
    }));

  const matchItems =
    recentMatches.map((match, index) => ({
      id: match.id,
      name: match.fullName,
      profession: match.profession ?? "Match found",
      location: getLocation(match.city, match.state),
      avatar:
        getProtectedMatchProfileImageUrl(match) ??
        sampleProfileImages[index % sampleProfileImages.length],
      status: "New Match",
    }));

  const statCards = [
    {
      label: "Likes Given",
      value: stats.likesGiven,
      helper: "Profiles you reached out to",
      icon: Heart,
      iconWrap: "bg-rose-50 text-rose-500",
      helperColor: "text-emerald-500",
    },
    {
      label: "Likes Received",
      value: stats.likesReceived,
      helper: "People interested in you",
      icon: Users,
      iconWrap: "bg-fuchsia-50 text-fuchsia-500",
      helperColor: "text-sky-500",
    },
    {
      label: "Matches",
      value: stats.matches,
      helper: "Mutual connections",
      icon: HeartHandshake,
      iconWrap: "bg-emerald-50 text-emerald-500",
      helperColor: "text-emerald-500",
    },
    {
      label: "Unlocked",
      value: stats.unlocks,
      helper: "Profiles you unlocked",
      icon: Unlock,
      iconWrap: "bg-amber-50 text-amber-500",
      helperColor: "text-amber-500",
    },
  ] as const;

  if (dbUnavailable) {
    return (
      <div className="ui-enter-scale ui-card-lift-soft rounded-[32px] border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-amber-100 text-amber-700">
            <DatabaseZap className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-gray-900">
              Dashboard temporarily unavailable
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              We could not reach your database right now, so the personalized home
              dashboard could not load. Once the connection is back, your home page
              will show matches, recommendations, and profile insights again.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="ui-link-shift inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Dashboard
              </Link>
              <Link
                href="/"
                className="ui-link-shift inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-rose-300 hover:text-rose-600"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2.05fr)_290px]">
      <div className="space-y-6">
        <section
          className="ui-enter-up ui-card-lift-soft group relative overflow-hidden rounded-[14px] border border-rose-100 bg-[linear-gradient(135deg,#fff9f3_0%,#fff6ef_22%,#ffe9ef_58%,#fff7fb_100%)] shadow-[0_22px_60px_rgba(15,23,42,0.08)]"
          style={{ animationDelay: "40ms", animationFillMode: "forwards" }}
        >
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.78)_0%,rgba(255,248,238,0.72)_28%,rgba(255,232,240,0.28)_66%,rgba(255,255,255,0.1)_100%)]" />
            <div className="ui-soft-float absolute -left-20 top-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,231,180,0.88)_0%,rgba(255,231,180,0.34)_42%,rgba(255,231,180,0)_74%)] blur-[6px]" />
            <div
              className="ui-soft-float absolute bottom-[-4.5rem] left-[18%] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,214,224,0.55)_0%,rgba(255,214,224,0.18)_42%,rgba(255,214,224,0)_74%)]"
              style={{ animationDelay: "0.9s" }}
            />
            <div
              className="ui-soft-float absolute right-[-6rem] top-[-2rem] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,205,168,0.44)_0%,rgba(255,205,168,0.14)_40%,rgba(255,205,168,0)_74%)]"
              style={{ animationDelay: "1.6s" }}
            />
            <div className="absolute inset-y-0 right-[12%] w-px bg-white/35" />
            <div className="absolute inset-y-8 right-[18%] w-px bg-rose-100/40" />
          </div>

          <div className="relative z-10 flex flex-col gap-7 px-6 py-5 sm:px-10 xl:min-h-[220px] xl:flex-row xl:items-center xl:justify-between">
            <div
              className="ui-enter-left max-w-[42rem] xl:max-w-[26rem]"
              style={{ animationDelay: "120ms", animationFillMode: "forwards" }}
            >
              <h1 className="font-display text-[1.15rem] font-bold leading-tight text-gray-900 sm:text-[1.45rem] sm:whitespace-nowrap lg:text-[1.6rem]">
                Let&apos;s find your <span className="text-rose-600">perfect match</span>
              </h1>
              <p className="mt-3 max-w-[28rem] text-[14px] leading-relaxed text-gray-700">
                {profile ? (
                  "Explore Your Life Partner"
                ) : (
                  <>
                    Creating or updating your profile accurately will help us provide
                    better profile recommendations for you and other members. Please
                    take your time and fill in the details carefully.
                  </>
                )}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={profile ? "/dashboard/browse" : "/dashboard/profile/create"}
                  className="ui-link-shift inline-flex items-center gap-2.5 rounded-[10px] bg-[#e11d48] px-3.5 py-2 text-[13px] font-semibold text-white shadow-lg shadow-rose-200 transition-all hover:-translate-y-0.5 hover:bg-[#be123c] hover:shadow-xl"
                >
                  {profile ? "Explore Matches" : "Create / Update Your Profile"}
                  <span className="ui-icon-lift flex h-7 w-7 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm">
                    <ArrowRight className="ui-arrow-shift h-3 w-3" />
                  </span>
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:ml-8 xl:min-w-0 xl:flex-1 xl:grid-cols-5 xl:gap-0 xl:divide-x xl:divide-rose-100/60">
              {statCards.map((card, index) => (
                <div
                  key={card.label}
                  className="ui-enter-scale ui-card-lift-soft group rounded-[22px] border border-white/70 bg-white/88 px-4 py-3 shadow-sm backdrop-blur-sm xl:rounded-none xl:border-0 xl:bg-transparent xl:px-5 xl:py-1 xl:shadow-none"
                  style={{
                    animationDelay: `${180 + index * 70}ms`,
                    animationFillMode: "forwards",
                  }}
                >
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`ui-icon-lift inline-flex h-9 w-9 items-center justify-center rounded-full ${card.iconWrap}`}
                    >
                      <card.icon className="h-4 w-4" />
                    </div>
                    <div className="mt-3 text-[1.5rem] font-display font-bold leading-none text-gray-900">
                      {card.value}
                    </div>
                    <p className="mt-2 text-[11px] font-semibold text-gray-900">
                      {card.label}
                    </p>
                    <p className={`mt-1 text-[9px] leading-4 ${card.helperColor}`}>
                      {card.helper}
                    </p>
                  </div>
                </div>
              ))}
              <DashboardProfileCompletionStatCard
                hasPersistedProfile={Boolean(profile)}
                initialCompletion={profileCompletion}
                animationDelayMs={180 + statCards.length * 70}
              />
            </div>
          </div>
        </section>

        <section
          className="ui-enter-up rounded-[30px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
          style={{ animationDelay: "140ms", animationFillMode: "forwards" }}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-gray-900">
                Recommended Profiles for You
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Curated suggestions to help you start meaningful conversations.
              </p>
            </div>
            <Link
              href="/dashboard/browse"
              className="ui-link-shift shrink-0 text-sm font-semibold text-rose-600 transition-colors hover:text-rose-700"
            >
              View All
            </Link>
          </div>

          {visibleRecommendedCards.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {visibleRecommendedCards.map((candidate, index) => (
                <article
                  key={candidate.id}
                  className="ui-enter-scale ui-card-lift group overflow-hidden rounded-[18px] border border-gray-100 bg-white shadow-sm"
                  style={{
                    animationDelay: `${220 + index * 70}ms`,
                    animationFillMode: "forwards",
                  }}
                >
                  <div className="relative h-40 bg-rose-50">
                    <Image
                      src={candidate.image}
                      alt={candidate.fullName}
                      fill
                      className="ui-media-zoom scale-[1.04] object-cover blur-[5px]"
                      sizes="(max-width: 640px) 100vw, 260px"
                      unoptimized
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-rose-600 shadow-sm backdrop-blur">
                      {candidate.badge}
                    </span>
                  </div>

                  <div className="p-3.5">
                    <h3 className="text-base font-semibold text-gray-900">
                      {candidate.fullName}, {candidate.age}
                    </h3>
                    <p className="mt-1 text-[13px] text-gray-600">{candidate.profession}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500">
                      <MapPin className="h-3 w-3 text-rose-400" />
                      {candidate.location}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="ui-enter-scale rounded-[18px] border border-dashed border-gray-200 bg-rose-50/40 px-6 py-12 text-center">
              <p className="text-sm font-semibold text-gray-900">
                No recommended profiles yet
              </p>
              <p className="mt-2 text-sm text-gray-500">
                This section will show only members who have registered and created
                their profile.
              </p>
            </div>
          )}
        </section>

        <section
          className="ui-enter-up grid gap-4 lg:grid-cols-3"
          style={{ animationDelay: "220ms", animationFillMode: "forwards" }}
        >
          <div
            className="ui-enter-up ui-card-lift-soft rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm"
            style={{ animationDelay: "260ms", animationFillMode: "forwards" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-gray-900">
                Recent Interests
              </h3>
              <Link
                href="/dashboard/liked"
                className="ui-link-shift text-xs font-semibold text-rose-600 transition-colors hover:text-rose-700"
              >
                View All
              </Link>
            </div>

            {recentInterestItems.length > 0 ? (
              <div className="space-y-4">
                {recentInterestItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl transition-transform duration-300 hover:translate-x-1"
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-rose-50">
                      <Image
                        src={item.avatar}
                        alt={item.name}
                        fill
                        className="ui-media-zoom scale-[1.06] object-cover blur-[3px]"
                        sizes="48px"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {item.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {item.location}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-rose-50/40 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-gray-900">
                  No recent interests right now
                </p>
                <p className="mt-2 text-xs leading-6 text-gray-500">
                  New received likes that are not already mutual will appear here.
                </p>
              </div>
            )}
          </div>

          <div
            className="ui-enter-up ui-card-lift-soft rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm"
            style={{ animationDelay: "330ms", animationFillMode: "forwards" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-gray-900">
                Mutual Interest
              </h3>
              <Link
                href="/dashboard/matches"
                className="ui-link-shift text-xs font-semibold text-rose-600 transition-colors hover:text-rose-700"
              >
                View All
              </Link>
            </div>

            {matchItems.length > 0 ? (
              <div className="space-y-4">
                {matchItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl transition-transform duration-300 hover:translate-x-1"
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-rose-50">
                      <Image
                        src={item.avatar}
                        alt={item.name}
                        fill
                        className="ui-media-zoom scale-[1.06] object-cover blur-[3px]"
                        sizes="48px"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {item.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {item.location}
                      </p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-600">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-sky-50/40 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-gray-900">
                  No mutual interests yet
                </p>
                <p className="mt-2 text-xs leading-6 text-gray-500">
                  Profiles will appear here only after both of you like each other.
                </p>
              </div>
            )}
          </div>

          <div
            className="ui-enter-up ui-card-lift-soft group rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm"
            style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-gray-900">
                Success Story
              </h3>
              <span className="text-xs font-semibold text-rose-600">
                Featured
              </span>
            </div>

            <div className="overflow-hidden rounded-[24px] bg-rose-50">
              <div className="relative h-44">
                <Image
                  src={fallbackSuccessStory.image}
                  alt={fallbackSuccessStory.title}
                  fill
                  className="ui-media-zoom object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
              </div>
              <div className="p-4">
                <h4 className="font-display text-lg font-bold text-gray-900">
                  {fallbackSuccessStory.title}
                </h4>
                <p className="mt-2 text-sm leading-7 text-gray-600">
                  {fallbackSuccessStory.quote}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="ui-enter-up grid gap-4 rounded-[30px] border border-rose-100 bg-gradient-to-r from-white via-rose-50 to-pink-50 p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4"
          style={{ animationDelay: "300ms", animationFillMode: "forwards" }}
        >
          {[
            {
              icon: ShieldCheck,
              title: "100% Verified Profiles",
              description: "All profiles are manually verified for authenticity.",
            },
            {
              icon: Lock,
              title: "Privacy Guaranteed",
              description: "Your privacy is our priority and your data stays protected.",
            },
            {
              icon: HeartHandshake,
              title: "Safe & Secure",
              description: "We ensure a safe and trusted space for every member.",
            },
            {
              icon: LifeBuoy,
              title: "24/7 Support",
              description: "Help is always available whenever you need guidance.",
            },
          ].map((item, index) => (
            <div
              key={item.title}
              className="ui-enter-up ui-card-lift-soft flex gap-3 rounded-[22px]"
              style={{
                animationDelay: `${360 + index * 60}ms`,
                animationFillMode: "forwards",
              }}
            >
              <div className="ui-icon-lift flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="mt-1 text-xs leading-6 text-gray-500">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </section>
      </div>

      <aside className="space-y-6">
        <div
          className="ui-enter-right"
          style={{ animationDelay: "110ms", animationFillMode: "forwards" }}
        >
          <DashboardNotificationsCard items={notificationItems} />
        </div>

        <div
          className="ui-enter-right"
          style={{ animationDelay: "190ms", animationFillMode: "forwards" }}
        >
          <DashboardProfileCompletionSidebar
            hasPersistedProfile={Boolean(profile)}
            initialCompletion={profileCompletion}
          />
        </div>
      </aside>
    </div>
  );
}
