"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  Heart,
  Mail,
  MapPin,
  Phone,
  Ruler,
  UserCircle2,
  Users,
} from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import AdminPreviewableImage from "@/components/admin/AdminPreviewableImage";
import { formatDistanceToNow } from "date-fns";
import { calculateAge, cmToFeetInches, GENDER_LABELS, MARITAL_STATUS_LABELS } from "@/lib/utils/helpers";

type RelationProfile = {
  id: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  city: string | null;
  state: string | null;
  profession: string | null;
  education: string | null;
  religion: string | null;
  maritalStatus: string;
  height: number | null;
  profileImage: string | null;
  matchId: string;
  matchCreatedAt: string;
  unlockCount: number;
  latestUnlockAt: string | null;
  latestUnlockUser: string | null;
};

type CurrentProfile = {
  id: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  height: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  houseNumber: string | null;
  streetName: string | null;
  pincode: string | null;
  profession: string | null;
  education: string | null;
  course: string | null;
  employedIn: string | null;
  income: string | null;
  religion: string | null;
  caste: string | null;
  subCaste: string | null;
  language: string | null;
  star: string | null;
  rasi: string | null;
  timeOfBirth: string | null;
  placeOfBirth: string | null;
  fatherName: string | null;
  motherName: string | null;
  familyType: string | null;
  familyStatus: string | null;
  maritalStatus: string;
  profileImage: string | null;
  photos: { url: string; isPrimary: boolean }[];
  horoscopeImage: string | null;
  displayId: string;
  email: string | null;
  phone: string | null;
  isPaidProfile: boolean;
  joinedAt: string;
  lastActiveAt: string;
};

function detailValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "Not added";
  if (typeof value === "string" && value.trim().length === 0) return "Not added";
  return String(value);
}

function RelationCard({
  item,
  active,
  onClick,
}: {
  item: RelationProfile;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mx-auto flex w-full max-w-[360px] min-h-[360px] flex-col overflow-hidden rounded-[26px] border border-gray-100 bg-white text-left shadow-sm transition-all ${
        active ? "ring-2 ring-rose-200" : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="relative aspect-[4/2.25] w-full overflow-hidden bg-slate-100">
        {item.profileImage ? (
          <Image
            src={item.profileImage}
            alt={item.fullName}
            fill
            className="object-cover"
            style={{ objectPosition: "center 12%" }}
            sizes="360px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-rose-200">
            <Users className="h-10 w-10" />
          </div>
        )}

        <span className="absolute right-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur">
          {calculateAge(new Date(item.dateOfBirth))} yrs
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 px-3.5 py-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-display text-[1.2rem] font-semibold tracking-[-0.02em] text-gray-900">
              {item.fullName}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500">
              {calculateAge(new Date(item.dateOfBirth))} yrs - {GENDER_LABELS[item.gender] ?? item.gender}
            </div>
          </div>
        </div>

        <div className="space-y-0.5 text-[11px] text-gray-700">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <MapPin className="h-3 w-3" />
            </div>
            <span className="min-w-0 truncate">
              {[item.city, item.state].filter(Boolean).join(", ") || "India"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <Heart className="h-3 w-3" />
            </div>
            <span className="min-w-0 truncate">
              {MARITAL_STATUS_LABELS[item.maritalStatus] ?? item.maritalStatus}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <BadgeCheck className="h-3 w-3" />
            </div>
            <span className="min-w-0 truncate">{item.religion || "Not added"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <Ruler className="h-3 w-3" />
            </div>
            <span className="min-w-0 truncate">
              {item.height ? `${cmToFeetInches(item.height)} - ${item.height} cm` : "Not added"}
            </span>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-0 text-[10px] font-medium text-gray-600">
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-600 shadow-sm">
            {MARITAL_STATUS_LABELS[item.maritalStatus] ?? item.maritalStatus}
          </span>
          <span className="rounded-full bg-gray-50 px-2 py-0.5 shadow-sm">
            {item.religion || "Not added"}
          </span>
          <span className="rounded-full bg-gray-50 px-2 py-0.5 shadow-sm">
            {item.height ? `${cmToFeetInches(item.height)}` : "Not added"}
          </span>
        </div>
        <div className="inline-flex w-fit rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-700 shadow-sm">
          {item.unlockCount} unlock{item.unlockCount === 1 ? "" : "s"}
        </div>
      </div>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function ProfileDetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <UserCircle2 className="h-4 w-4" />
        </div>
        <h3 className="font-display text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="mt-4 space-y-3 text-sm">{children}</div>
    </section>
  );
}

export default function AdminProfileRelationsExplorer({
  matchedProfiles,
  unlockedProfiles,
  currentProfile,
}: {
  matchedProfiles: RelationProfile[];
  unlockedProfiles: RelationProfile[];
  currentProfile: CurrentProfile;
}) {
  const tabs = useMemo(
    () => [
      { key: "matched" as const, label: "Matched Profiles", count: matchedProfiles.length },
      { key: "unlocked" as const, label: "Unlocked Profiles", count: unlockedProfiles.length },
    ],
    [matchedProfiles.length, unlockedProfiles.length]
  );
  const [activeView, setActiveView] = useState<"profile" | "matched" | "unlocked">("profile");
  const activeTab = activeView === "unlocked" ? "unlocked" : "matched";
  const activeList = activeTab === "matched" ? matchedProfiles : unlockedProfiles;
  const [selectedId, setSelectedId] = useState(activeList[0]?.id ?? "");
  const [showHoroscopeImage, setShowHoroscopeImage] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const galleryScrollRef = useRef<HTMLDivElement | null>(null);

  const selectedList = activeList.length > 0 ? activeList : [];
  const selected = selectedList.find((item) => item.id === selectedId) ?? selectedList[0] ?? null;
  const currentAge = calculateAge(new Date(currentProfile.dateOfBirth));
  const currentLocation =
    [currentProfile.city, currentProfile.state].filter(Boolean).join(", ") ||
    currentProfile.country ||
    "India";
  const profilePhotos = useMemo(() => {
    const orderedUrls = [
      currentProfile.profileImage,
      ...currentProfile.photos.map((photo) => photo.url),
    ].filter((url): url is string => Boolean(url && url.trim()));

    return orderedUrls.filter((url, index, array) => array.indexOf(url) === index);
  }, [currentProfile.photos, currentProfile.profileImage]);
  const profileLabel = currentProfile.displayId || currentProfile.id;
  const memberSince = new Date(currentProfile.joinedAt).toLocaleDateString();
  const lastActive = formatDistanceToNow(new Date(currentProfile.lastActiveAt), { addSuffix: true });
  const heightLabel = currentProfile.height
    ? `${cmToFeetInches(currentProfile.height)} - ${detailValue(currentProfile.height)} cm`
    : "Not added";
  const showHoroscopeSection =
    currentProfile.religion?.toLowerCase() === "hindu" &&
    Boolean(
      currentProfile.star ||
        currentProfile.rasi ||
        currentProfile.timeOfBirth ||
        currentProfile.placeOfBirth
    );
  const completionFields = [
    currentProfile.fullName,
    currentProfile.gender,
    currentProfile.dateOfBirth,
    currentProfile.height,
    currentProfile.maritalStatus,
    currentProfile.city,
    currentProfile.state,
    currentProfile.profession,
    currentProfile.education,
    currentProfile.religion,
    currentProfile.caste,
    currentProfile.language,
    currentProfile.familyType,
    currentProfile.familyStatus,
    currentProfile.star,
    currentProfile.rasi,
    currentProfile.timeOfBirth,
    currentProfile.placeOfBirth,
    currentProfile.profileImage,
  ];
  const profileCompletionScore = Math.round(
    (completionFields.filter((value) => value !== null && value !== undefined && String(value).trim() !== "").length /
      completionFields.length) *
      100
  );

  useEffect(() => {
    setShowHoroscopeImage(false);
  }, [currentProfile.id, currentProfile.horoscopeImage]);

  useEffect(() => {
    const gallery = galleryScrollRef.current;
    if (!gallery) return;
    gallery.scrollTo({ left: 0, behavior: "auto" });
  }, [currentProfile.id]);

  useEffect(() => {
    const gallery = galleryScrollRef.current;
    if (!gallery || profilePhotos.length === 0) return;

    const updateActivePhoto = () => {
      const slideWidth = gallery.clientWidth || 1;
      const nextIndex = Math.min(
        profilePhotos.length - 1,
        Math.max(0, Math.round(gallery.scrollLeft / slideWidth))
      );
      setActivePhotoIndex(nextIndex);
    };

    updateActivePhoto();
    gallery.addEventListener("scroll", updateActivePhoto, { passive: true });
    window.addEventListener("resize", updateActivePhoto);

    return () => {
      gallery.removeEventListener("scroll", updateActivePhoto);
      window.removeEventListener("resize", updateActivePhoto);
    };
  }, [currentProfile.id, profilePhotos]);

  const scrollGallery = (direction: -1 | 1) => {
    const gallery = galleryScrollRef.current;
    if (!gallery) return;

    const nextIndex = Math.min(
      profilePhotos.length - 1,
      Math.max(0, activePhotoIndex + direction)
    );
    gallery.scrollBy({
      left: (nextIndex - activePhotoIndex) * gallery.clientWidth,
      behavior: "smooth",
    });
    setActivePhotoIndex(nextIndex);
  };

  const currentCard = (
    <article className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[320px_minmax(0,1fr)_360px] xl:items-start xl:gap-8">
        <div className="relative h-[285px] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 via-white to-pink-50 shadow-sm xl:w-[320px] xl:flex-shrink-0">
          {profilePhotos.length > 0 ? (
            <>
              <div
                ref={galleryScrollRef}
                className="flex h-full overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {profilePhotos.map((photo, index) => (
                  <div key={`${photo}-${index}`} className="relative h-full min-w-full snap-start">
                    <AdminPreviewableImage
                      src={photo}
                      alt={`${currentProfile.fullName} photo ${index + 1}`}
                      className="relative block h-full w-full cursor-zoom-in overflow-hidden rounded-3xl outline-none"
                      imageClassName="object-cover object-[center_12%]"
                      sizes="320px"
                      gallery={profilePhotos}
                      initialIndex={index}
                    />
                  </div>
                ))}
              </div>

              {profilePhotos.length > 1 ? (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 shadow-sm backdrop-blur">
                  {profilePhotos.map((photo, index) => (
                    <span
                      key={`${photo}-dot-${index}`}
                      className={`h-2 rounded-full transition-all ${
                        index === activePhotoIndex ? "w-5 bg-rose-500" : "w-2 bg-rose-200"
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-rose-200">
              <UserCircle2 className="h-18 w-18" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <div className="truncate text-[1.85rem] font-semibold tracking-[-0.03em] text-gray-900 sm:text-[2.15rem]">
              {currentProfile.fullName}
            </div>
            {currentProfile.isPaidProfile ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[15px] font-medium text-rose-600">
            ID: {currentProfile.displayId}
          </div>
          <div className="mt-2 text-sm text-gray-500 sm:text-base">
            {currentAge} yrs - {GENDER_LABELS[currentProfile.gender] ?? currentProfile.gender}
          </div>

          <div className="mt-4 space-y-3.5 text-[15px] text-gray-700">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
              <span>{currentLocation}</span>
            </div>
            <div className="flex items-center gap-3">
              <Ruler className="h-4 w-4 shrink-0 text-gray-400" />
              <span>{heightLabel}</span>
            </div>
            <div className="flex items-center gap-3">
              <Heart className="h-4 w-4 shrink-0 text-gray-400" />
              <span>{MARITAL_STATUS_LABELS[currentProfile.maritalStatus] ?? currentProfile.maritalStatus}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-gray-400" />
              {currentProfile.email ? (
                <a
                  href={`mailto:${currentProfile.email}`}
                  className="truncate text-gray-900 transition-colors hover:text-rose-600 hover:underline"
                  title={`Send email to ${currentProfile.email}`}
                >
                  {currentProfile.email}
                </a>
              ) : (
                <span>{detailValue(currentProfile.email)}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-gray-400" />
              <span>{detailValue(currentProfile.phone)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:mt-6">
          <div className="text-sm font-semibold text-gray-900">Profile Completeness</div>
          <div className="mt-4.5 flex items-center gap-6">
            <div
              className="flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#e11d48 ${profileCompletionScore * 3.6}deg, #e5e7eb 0deg)`,
              }}
            >
              <div className="flex h-[4.25rem] w-[4.25rem] flex-col items-center justify-center rounded-full bg-white">
                <div className="text-lg font-semibold text-gray-900">{profileCompletionScore}%</div>
                <div className="text-[10px] text-gray-500">Complete</div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900">Great! Keep going...</div>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                Add more details to increase your match opportunities.
              </p>
              <button
                type="button"
                onClick={() => {
                  document.getElementById("full-biodata")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
              >
                View Full Biodata
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-4.5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-end">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveView("profile")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeView === "profile"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-gray-50 text-gray-600 hover:bg-rose-50 hover:text-rose-600"
            }`}
          >
            <Users className="h-4 w-4" />
            Profile
          </button>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveView(tab.key);
                const nextList = tab.key === "matched" ? matchedProfiles : unlockedProfiles;
                setSelectedId(nextList[0]?.id ?? "");
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeView === tab.key
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-rose-50 hover:text-rose-600"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {activeView === "profile" ? (
        <div className="mt-5 space-y-5">
          {currentCard}

          <div id="full-biodata" className="grid gap-4 xl:grid-cols-3 xl:items-start">
            <ProfileDetailCard title="Personal Information">
              <Row label="Gender" value={GENDER_LABELS[currentProfile.gender] ?? currentProfile.gender} />
              <Row label="Date of Birth" value={new Date(currentProfile.dateOfBirth).toLocaleDateString()} />
              <Row label="Age" value={`${calculateAge(new Date(currentProfile.dateOfBirth))} years`} />
              <Row label="Height" value={detailValue(currentProfile.height)} />
              <Row
                label="Marital Status"
                value={MARITAL_STATUS_LABELS[currentProfile.maritalStatus] ?? currentProfile.maritalStatus}
              />
            </ProfileDetailCard>

            <ProfileDetailCard title="Contact & Address">
              <Row label="City" value={detailValue(currentProfile.city)} />
              <Row label="State" value={detailValue(currentProfile.state)} />
              <Row label="Country" value={detailValue(currentProfile.country)} />
              <Row label="House Number" value={detailValue(currentProfile.houseNumber)} />
              <Row label="Street Name" value={detailValue(currentProfile.streetName)} />
              <Row label="Pincode" value={detailValue(currentProfile.pincode)} />
            </ProfileDetailCard>

            <ProfileDetailCard title="Family & Religion">
              <Row label="Father Name" value={detailValue(currentProfile.fatherName)} />
              <Row label="Mother Name" value={detailValue(currentProfile.motherName)} />
              <Row label="Family Type" value={detailValue(currentProfile.familyType)} />
              <Row label="Family Status" value={detailValue(currentProfile.familyStatus)} />
            </ProfileDetailCard>

            <ProfileDetailCard title="Education & Career">
              <Row label="Education" value={detailValue(currentProfile.education)} />
              <Row label="Course" value={detailValue(currentProfile.course)} />
              <Row label="Profession" value={detailValue(currentProfile.profession)} />
              <Row label="Employed In" value={detailValue(currentProfile.employedIn)} />
              <Row label="Annual Income" value={detailValue(currentProfile.income)} />
            </ProfileDetailCard>

            <ProfileDetailCard title="Religious Details">
              <Row label="Religion" value={detailValue(currentProfile.religion)} />
              <Row label="Caste" value={detailValue(currentProfile.caste)} />
              <Row label="Sub Caste" value={detailValue(currentProfile.subCaste)} />
              <Row label="Mother Tongue" value={detailValue(currentProfile.language)} />
            </ProfileDetailCard>

            {showHoroscopeSection ? (
              <ProfileDetailCard title="Horoscope Details">
                <Row label="Star" value={detailValue(currentProfile.star)} />
                <Row label="Rasi" value={detailValue(currentProfile.rasi)} />
                <Row label="Time of Birth" value={detailValue(currentProfile.timeOfBirth)} />
                <Row label="Place of Birth" value={detailValue(currentProfile.placeOfBirth)} />
                {currentProfile.horoscopeImage ? (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowHoroscopeImage((value) => !value)}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      {showHoroscopeImage ? "Hide" : "View"}
                    </button>
                    {showHoroscopeImage ? (
                      <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                        <AdminPreviewableImage
                          src={currentProfile.horoscopeImage}
                          alt={`${currentProfile.fullName} horoscope`}
                          className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden outline-none"
                          sizes="(max-width: 768px) 100vw, 400px"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </ProfileDetailCard>
            ) : null}
          </div>
        </div>
      ) : selectedList.length > 0 ? (
        <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {selectedList.map((item) => (
            <RelationCard
              key={item.id}
              item={item}
              active={item.id === selected?.id}
              onClick={() => setSelectedId(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon="search"
            title={activeView === "matched" ? "No matched profiles" : "No unlocked profiles"}
            description={
              activeView === "matched"
                ? "This profile does not have any matches yet."
                : "This profile has no unlocked profiles yet."
            }
          />
        </div>
      )}
    </section>
  );
}
