"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import BrowseProfileCard from "@/components/profile/BrowseProfileCard";
import { SkeletonGrid } from "@/components/common/SkeletonCard";
import EmptyState from "@/components/common/EmptyState";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";
import {
  EMPTY_BROWSE_FILTERS,
  mapPreferenceSourceToBrowseFilters,
  readStoredBrowseFilters,
  type BrowseFilterValues,
  writeStoredBrowseFilters,
} from "@/lib/utils/browse-filters";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Heart,
  PlusCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";

const religionOptions = [
  "Hindu",
  "Muslim",
  "Christian",
  "Sikh",
  "Jain",
  "Buddhist",
  "Parsi",
  "Other",
];

const motherTongueOptions = [
  "Tamil",
  "Hindi",
  "Telugu",
  "Malayalam",
  "Kannada",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Punjabi",
  "Urdu",
];

const maritalStatusOptions = [
  { value: "NEVER_MARRIED", label: "Never Married" },
  { value: "DIVORCED", label: "Divorced" },
  { value: "WIDOWED", label: "Widowed" },
  { value: "AWAITING_DIVORCE", label: "Awaiting Divorce" },
];

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "youngest", label: "Youngest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name", label: "Name A-Z" },
];

interface Profile {
  id: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  height: number | null;
  maritalStatus: string;
  education: string | null;
  course?: string | null;
  profession: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  religion: string | null;
  previewImageUrl: string | null;
}


function getPaginationItems(currentPage: number, pageCount: number) {
  if (pageCount <= 1) return [];

  if (pageCount <= 6) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "end-ellipsis", pageCount];
  }

  if (currentPage >= pageCount - 2) {
    return [1, "start-ellipsis", pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  }

  return [
    1,
    "start-ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "end-ellipsis",
    pageCount,
  ];
}

export default function BrowsePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [profileRequired, setProfileRequired] = useState(false);
  const [hiddenProfileIds, setHiddenProfileIds] = useState<string[]>([]);
  const [preferenceFiltersReady, setPreferenceFiltersReady] = useState(false);
  const emptyPreferencePayload = {
    ageMin: null,
    ageMax: null,
    heightMin: null,
    heightMax: null,
    religion: null,
    caste: null,
    education: null,
    profession: null,
    location: null,
    maritalStatus: null,
    language: null,
  } as const;

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  const [religion, setReligion] = useState("");
  const [caste, setCaste] = useState("");
  const [language, setLanguage] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [location, setLocation] = useState("");
  const [heightMin, setHeightMin] = useState("");
  const [heightMax, setHeightMax] = useState("");
  const [education, setEducation] = useState("");
  const [profession, setProfession] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");

  const [draftReligion, setDraftReligion] = useState("");
  const [draftCaste, setDraftCaste] = useState("");
  const [draftLanguage, setDraftLanguage] = useState("");
  const [draftMaritalStatus, setDraftMaritalStatus] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftHeightMin, setDraftHeightMin] = useState("");
  const [draftHeightMax, setDraftHeightMax] = useState("");
  const [draftEducation, setDraftEducation] = useState("");
  const [draftProfession, setDraftProfession] = useState("");
  const [draftAgeMin, setDraftAgeMin] = useState("");
  const [draftAgeMax, setDraftAgeMax] = useState("");

  const applyFiltersToState = useCallback((filters: BrowseFilterValues) => {
    setReligion(filters.religion);
    setCaste(filters.caste);
    setLanguage(filters.language);
    setMaritalStatus(filters.maritalStatus);
    setLocation(filters.location);
    setHeightMin(filters.heightMin);
    setHeightMax(filters.heightMax);
    setEducation(filters.education);
    setProfession(filters.profession);
    setAgeMin(filters.ageMin);
    setAgeMax(filters.ageMax);
  }, []);

  const applyFiltersToDraftState = useCallback((filters: BrowseFilterValues) => {
    setDraftReligion(filters.religion);
    setDraftCaste(filters.caste);
    setDraftLanguage(filters.language);
    setDraftMaritalStatus(filters.maritalStatus);
    setDraftLocation(filters.location);
    setDraftHeightMin(filters.heightMin);
    setDraftHeightMax(filters.heightMax);
    setDraftEducation(filters.education);
    setDraftProfession(filters.profession);
    setDraftAgeMin(filters.ageMin);
    setDraftAgeMax(filters.ageMax);
  }, []);

  const fetchProfiles = useCallback(
    async ({
      showError = true,
      showLoading = true,
    }: {
      showError?: boolean;
      showLoading?: boolean;
    } = {}) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "12",
          sort: sortOrder,
          ...(searchQuery && { search: searchQuery }),
          ...(religion && { religion }),
          ...(caste && { caste }),
          ...(language && { language }),
          ...(maritalStatus && { maritalStatus }),
          ...(location && { location }),
          ...(heightMin && { heightMin }),
          ...(heightMax && { heightMax }),
          ...(education && { education }),
          ...(profession && { profession }),
          ...(ageMin && { ageMin }),
          ...(ageMax && { ageMax }),
        });

        const res = await fetch(`/api/profiles?${params}`, { cache: "no-store" });
        const data = await res.json();

        if (res.status === 403 && data.code === "PROFILE_REQUIRED") {
          setProfiles([]);
          setTotalPages(1);
          setProfileRequired(true);
          setIsFilterOpen(false);
          return;
        }

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load profiles");
        }

        setProfileRequired(false);
        const nextProfiles = (data.data ?? []).filter(
          (profile: Profile) => !hiddenProfileIds.includes(profile.id)
        );
        setProfiles(nextProfiles);
        setTotalPages(data.totalPages ?? 1);
      } catch (error) {
        setProfiles([]);
        setTotalPages(1);
        setProfileRequired(false);
        if (showError) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load profiles"
          );
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [
      ageMax,
      ageMin,
      caste,
      education,
      hiddenProfileIds,
      heightMax,
      heightMin,
      language,
      location,
      maritalStatus,
      page,
      profession,
      religion,
      searchQuery,
      sortOrder,
    ]
  );

  useEffect(() => {
    let isMounted = true;
    const storedFilters = readStoredBrowseFilters();

    if (storedFilters) {
      applyFiltersToState(storedFilters);
      setPreferenceFiltersReady(true);
      return () => {
        isMounted = false;
      };
    }

    const loadSavedPreferences = async () => {
      try {
        const res = await fetch("/api/preferences", { cache: "no-store" });

        if (!res.ok) {
          if (res.status !== 404 && res.status !== 401) {
            throw new Error("Failed to load saved preferences");
          }

          return;
        }

        const json = (await res.json()) as {
          preference?: Record<string, string | number | null> | null;
        };
        if (!isMounted) {
          return;
        }

        const nextFilters = mapPreferenceSourceToBrowseFilters(json.preference);
        applyFiltersToState(nextFilters);
      } catch (error) {
        if (isMounted) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to load saved preferences"
          );
        }
      } finally {
        if (isMounted) {
          setPreferenceFiltersReady(true);
        }
      }
    };

    void loadSavedPreferences();

    return () => {
      isMounted = false;
    };
  }, [applyFiltersToState]);

  useEffect(() => {
    const syncHiddenProfiles = () => {
      try {
        const stored = JSON.parse(
          localStorage.getItem("hidden_browse_profiles") ?? "[]"
        );
        setHiddenProfileIds(Array.isArray(stored) ? stored : []);
      } catch {
        setHiddenProfileIds([]);
      }
    };

    syncHiddenProfiles();
    window.addEventListener("storage", syncHiddenProfiles);
    window.addEventListener("hidden-browse-profiles-changed", syncHiddenProfiles);

    return () => {
      window.removeEventListener("storage", syncHiddenProfiles);
      window.removeEventListener("hidden-browse-profiles-changed", syncHiddenProfiles);
    };
  }, []);

  useEffect(() => {
    if (!preferenceFiltersReady) {
      return;
    }

    void fetchProfiles();
  }, [fetchProfiles, preferenceFiltersReady]);

  useAutoRefresh(
    () => {
      if (!preferenceFiltersReady) {
        return;
      }

      void fetchProfiles({ showError: false, showLoading: false });
    },
    {
      intervalMs: null,
    }
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextSearchQuery = searchInput.trim();
      setSearchQuery((currentQuery) =>
        currentQuery === nextSearchQuery ? currentQuery : nextSearchQuery
      );
      setPage((currentPage) => (currentPage === 1 ? currentPage : 1));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!isFilterOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isFilterOpen]);

  const handleProfileLike = useCallback((profileId: string) => {
    setProfiles((currentProfiles) =>
      currentProfiles.filter((profile) => profile.id !== profileId)
    );
  }, []);

  const activeFilterCount = [
    religion,
    caste,
    language,
    maritalStatus,
    location,
    heightMin || heightMax,
    education,
    profession,
    ageMin || ageMax,
  ].filter(Boolean).length;

  const syncDraftFilters = () => {
    applyFiltersToDraftState({
      religion,
      caste,
      language,
      maritalStatus,
      location,
      heightMin,
      heightMax,
      education,
      profession,
      ageMin,
      ageMax,
    });
  };

  const openFilterModal = () => {
    syncDraftFilters();
    setIsFilterOpen(true);
  };

  const closeFilterModal = () => {
    setIsFilterOpen(false);
  };

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();

    if (draftAgeMin && draftAgeMax && Number(draftAgeMin) > Number(draftAgeMax)) {
      toast.error("Minimum age cannot be greater than maximum age.");
      return;
    }

    if (
      draftHeightMin &&
      draftHeightMax &&
      Number(draftHeightMin) > Number(draftHeightMax)
    ) {
      toast.error("Minimum height cannot be greater than maximum height.");
      return;
    }

    const nextFilters = {
      religion: draftReligion,
      caste: draftCaste,
      language: draftLanguage,
      maritalStatus: draftMaritalStatus,
      location: draftLocation,
      heightMin: draftHeightMin,
      heightMax: draftHeightMax,
      education: draftEducation,
      profession: draftProfession,
      ageMin: draftAgeMin,
      ageMax: draftAgeMax,
    };

    applyFiltersToState(nextFilters);
    writeStoredBrowseFilters(nextFilters);
    setPage(1);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    const previousFilters: BrowseFilterValues = {
      religion,
      caste,
      language,
      maritalStatus,
      location,
      heightMin,
      heightMax,
      education,
      profession,
      ageMin,
      ageMax,
    };
    const previousPage = page;

    applyFiltersToDraftState(EMPTY_BROWSE_FILTERS);
    applyFiltersToState(EMPTY_BROWSE_FILTERS);
    writeStoredBrowseFilters(EMPTY_BROWSE_FILTERS);
    setPage(1);
    setIsFilterOpen(false);

    void (async () => {
      try {
        const response = await fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emptyPreferencePayload),
        });
        const result = await response.json();

        if (!response.ok) {
          applyFiltersToDraftState(previousFilters);
          applyFiltersToState(previousFilters);
          writeStoredBrowseFilters(previousFilters);
          setPage(previousPage);
          toast.error(
            result.error ??
              "Could not clear Partner Preferences, so the previous filters were restored."
          );
        }
      } catch {
        applyFiltersToDraftState(previousFilters);
        applyFiltersToState(previousFilters);
        writeStoredBrowseFilters(previousFilters);
        setPage(previousPage);
        toast.error(
          "Could not clear Partner Preferences, so the previous filters were restored."
        );
      }
    })();
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextSearchQuery = searchInput.trim();
    setSearchQuery(nextSearchQuery);
    setPage(1);
  };

  const buildProfileHref = (profileId: string) => {
    const params = new URLSearchParams();
    params.set("source", "browse");
    params.set("page", String(page));
    if (searchQuery) params.set("search", searchQuery);
    if (sortOrder) params.set("sort", sortOrder);
    if (religion) params.set("religion", religion);
    if (caste) params.set("caste", caste);
    if (language) params.set("language", language);
    if (maritalStatus) params.set("maritalStatus", maritalStatus);
    if (location) params.set("location", location);
    if (heightMin) params.set("heightMin", heightMin);
    if (heightMax) params.set("heightMax", heightMax);
    if (education) params.set("education", education);
    if (profession) params.set("profession", profession);
    if (ageMin) params.set("ageMin", ageMin);
    if (ageMax) params.set("ageMax", ageMax);
    return `/dashboard/profile/${profileId}?${params.toString()}`;
  };

  const filterLabelClass =
    "mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500";
  const filterControlClass =
    "w-full rounded-[16px] border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none input-focus";

  const renderFilterFields = () => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={filterLabelClass}>Age Min</label>
          <input
            type="number"
            min={18}
            max={100}
            value={draftAgeMin}
            onChange={(event) => setDraftAgeMin(event.target.value)}
            placeholder="Eg: 24"
            className={filterControlClass}
          />
        </div>

        <div>
          <label className={filterLabelClass}>Age Max</label>
          <input
            type="number"
            min={18}
            max={100}
            value={draftAgeMax}
            onChange={(event) => setDraftAgeMax(event.target.value)}
            placeholder="Eg: 32"
            className={filterControlClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={filterLabelClass}>Minimum Height</label>
          <input
            type="number"
            min={100}
            max={250}
            value={draftHeightMin}
            onChange={(event) => setDraftHeightMin(event.target.value)}
            placeholder="Eg: 155"
            className={filterControlClass}
          />
        </div>

        <div>
          <label className={filterLabelClass}>Maximum Height</label>
          <input
            type="number"
            min={100}
            max={250}
            value={draftHeightMax}
            onChange={(event) => setDraftHeightMax(event.target.value)}
            placeholder="Eg: 185"
            className={filterControlClass}
          />
        </div>
      </div>

      <div>
        <label className={filterLabelClass}>Religion</label>
        <select
          value={draftReligion}
          onChange={(event) => setDraftReligion(event.target.value)}
          className={filterControlClass}
        >
          <option value="">All Religions</option>
          {religionOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={filterLabelClass}>Caste</label>
        <input
          value={draftCaste}
          onChange={(event) => setDraftCaste(event.target.value)}
          placeholder="Eg: Nair"
          className={filterControlClass}
        />
      </div>

      <div>
        <label className={filterLabelClass}>Mother Tongue</label>
        <select
          value={draftLanguage}
          onChange={(event) => setDraftLanguage(event.target.value)}
          className={filterControlClass}
        >
          <option value="">All Languages</option>
          {motherTongueOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={filterLabelClass}>Education</label>
        <input
          value={draftEducation}
          onChange={(event) => setDraftEducation(event.target.value)}
          placeholder="Eg: B.Tech"
          className={filterControlClass}
        />
      </div>

      <div>
        <label className={filterLabelClass}>Profession</label>
        <input
          value={draftProfession}
          onChange={(event) => setDraftProfession(event.target.value)}
          placeholder="Eg: Engineer"
          className={filterControlClass}
        />
      </div>

      <div>
        <label className={filterLabelClass}>Location</label>
        <input
          value={draftLocation}
          onChange={(event) => setDraftLocation(event.target.value)}
          placeholder="Eg: Chennai"
          className={filterControlClass}
        />
      </div>

      <div>
        <label className={filterLabelClass}>Marital Status</label>
        <select
          value={draftMaritalStatus}
          onChange={(event) => setDraftMaritalStatus(event.target.value)}
          className={filterControlClass}
        >
          <option value="">All Statuses</option>
          {maritalStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const renderBrowseToolbar = () => (
    <div
      className="ui-enter-right flex flex-col gap-3 lg:flex-row lg:items-center"
      style={{ animationDelay: "140ms", animationFillMode: "forwards" }}
    >
      <form onSubmit={handleSearchSubmit} className="flex-1">
        <div className="ui-card-lift-soft relative rounded-[10px]">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, profession, or location..."
            className="h-[48px] w-full rounded-[10px] border border-slate-200/80 bg-white px-5 pr-14 text-[15px] text-slate-700 outline-none input-focus"
          />
          <button
            type="submit"
            className="ui-link-shift absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
            aria-label="Search profiles"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </form>

      <div className="flex items-center gap-3">
        <div className="ui-card-lift-soft relative rounded-[10px]">
          <select
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value);
              setPage(1);
            }}
            className="h-[48px] min-w-[210px] appearance-none rounded-[10px] border border-slate-200/80 bg-white px-5 pr-12 text-[15px] font-medium text-slate-700 outline-none input-focus"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                Sort By: {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <button
          type="button"
          onClick={openFilterModal}
          className="ui-link-shift relative inline-flex h-[48px] w-[48px] items-center justify-center rounded-[10px] border border-slate-200/80 bg-white text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          aria-label="Open filters"
          title="Open filters"
        >
          <SlidersHorizontal className="h-5 w-5" />
          {activeFilterCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );

  const renderRightRail = () => (
    <aside className="hidden xl:flex xl:w-[330px] xl:flex-col xl:gap-6 2xl:w-[350px]">
      <div
        className="ui-enter-right ui-card-lift-soft group relative h-[414px] overflow-hidden rounded-[16px] border border-rose-100/90 bg-[#fff7f8] shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
        style={{ animationDelay: "220ms", animationFillMode: "forwards" }}
      >
        <Image
          src="/fm-1.png"
          alt="Matrimony trust banner"
          fill
          className="ui-media-zoom object-cover object-center"
          sizes="350px"
          quality={85}
        />
        <div className="relative z-10 p-6">
          <h2 className="max-w-[15rem] font-display text-[1.75rem] font-bold leading-[1.08] text-slate-900">
            Every story <span className="block whitespace-nowrap text-rose-500">begins with trust</span>
          </h2>
          <p className="mt-4 max-w-[13rem] text-[13px] leading-6 text-slate-700">
            We help you find a life partner who truly understands and values you.
          </p>
        </div>
      </div>

      <div
        className="ui-enter-right ui-card-lift-soft relative overflow-hidden rounded-[18px] border border-rose-100/90 bg-[radial-gradient(circle_at_top_right,#fff7f8_0%,#fff4f6_44%,#ffffff_100%)] px-6 pb-4 pt-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
        style={{ animationDelay: "300ms", animationFillMode: "forwards" }}
      >
        <Heart
          className="ui-soft-float absolute right-5 top-12 h-16 w-16 text-rose-200"
          strokeWidth={1.5}
        />

        <h3 className="pr-16 whitespace-nowrap font-display text-[1.5rem] font-bold leading-none text-slate-900">
          Trusted by thousands
        </h3>
        <p className="mt-4 max-w-[13rem] text-sm leading-7 text-slate-600">
          Lakhs of successful matches and happy families.
        </p>

        <div className="relative mt-6 h-24">
          <div
            className="ui-soft-float absolute bottom-1 right-24 h-20 w-16 rotate-[-8deg] overflow-hidden rounded-[16px] border-[3px] border-white bg-white shadow-[0_14px_28px_rgba(15,23,42,0.12)]"
            style={{ animationDelay: "0.5s" }}
          >
            <Image
              src="/image-1.jpeg"
              alt="Happy matrimony member"
              fill
              className="ui-media-zoom object-cover"
              sizes="64px"
            />
          </div>
          <div className="ui-soft-float absolute bottom-2 right-10 h-24 w-16 overflow-hidden rounded-[16px] border-[3px] border-white bg-white shadow-[0_16px_30px_rgba(15,23,42,0.14)]">
            <Image
              src="/main.jpeg"
              alt="Matrimony memories collage"
              fill
              className="ui-media-zoom object-cover"
              sizes="64px"
            />
          </div>
          <div
            className="ui-soft-float absolute bottom-1 right-0 h-20 w-16 rotate-[8deg] overflow-hidden rounded-[16px] border-[3px] border-white bg-white shadow-[0_14px_28px_rgba(15,23,42,0.12)]"
            style={{ animationDelay: "1s" }}
          >
            <Image
              src="/image-3.png"
              alt="Trusted couples snapshot"
              fill
              className="ui-media-zoom object-cover"
              sizes="64px"
            />
          </div>
        </div>
      </div>

      <div
        className="ui-enter-right ui-card-lift-soft relative overflow-hidden rounded-[18px] border border-rose-100/90 bg-[radial-gradient(circle_at_bottom_right,#fff5f7_0%,#ffffff_55%)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
        style={{ animationDelay: "380ms", animationFillMode: "forwards" }}
      >
        <div className="absolute bottom-4 right-4 h-24 w-24 rounded-full bg-rose-50" />
        <div className="relative min-h-[210px]">
          <div>
            <h3 className="pr-20 whitespace-nowrap font-display text-[1.42rem] font-bold leading-none text-slate-900">
              We&apos;re here for you
            </h3>
            <p className="mt-4 max-w-[11.5rem] text-[13px] leading-6 text-slate-600">
              Our support team is always ready to assist you in your journey to find the right match.
            </p>
          </div>
          <div className="ui-soft-float absolute bottom-0 right-0 inline-flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(255,228,236,0.95)_0%,rgba(255,241,244,0.98)_100%)] text-rose-500">
            <Headphones className="h-10 w-10" strokeWidth={1.8} />
          </div>
        </div>
      </div>
    </aside>
  );

  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const paginationItems = getPaginationItems(page, totalPages);

  if (profileRequired) {
    return (
      <div className="space-y-8">
        <div className="ui-enter-up" style={{ animationDelay: "40ms", animationFillMode: "forwards" }}>
          <div>
            <h1 className="font-display text-[2.6rem] font-bold leading-none text-slate-900">
              Browse Profiles
            </h1>
            <span className="mt-4 block h-[3px] w-14 rounded-full bg-rose-500" />
            <p className="mt-4 max-w-xl text-[16px] leading-8 text-slate-600">
              Find and connect with your perfect life partner.
            </p>
          </div>
        </div>

        <div
          className="ui-enter-scale ui-card-lift-soft rounded-[32px] border border-rose-100 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-8"
          style={{ animationDelay: "120ms", animationFillMode: "forwards" }}
        >
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="ui-soft-float flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-rose-50 text-rose-500">
              <Search className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h2 className="mb-2 font-display text-2xl font-bold text-slate-900">
                Create your profile to browse matches
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                We only show other profiles after you create your own profile.
                Complete your details first, then profile suggestions will appear
                here for you.
              </p>
              <Link
                href="/dashboard/profile/create"
                className="btn-primary ui-link-shift mt-5 inline-flex items-center gap-2 px-6 py-2.5 text-sm"
              >
                <PlusCircle className="h-4 w-4" />
                Create Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isFilterOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="ui-overlay-fade absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
            onClick={closeFilterModal}
          />

          <div className="ui-modal-pop relative z-10 flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-gray-100 bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">
                  Filters
                </p>
                <h2 className="mt-2 font-display text-xl font-bold text-gray-900">
                  Refine your browse results
                </h2>
              </div>

              <button
                type="button"
                onClick={closeFilterModal}
                className="ui-link-shift rounded-full border border-gray-200 p-2 text-gray-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={applyFilters} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {renderFilterFields()}
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4">
                <button
                  type="submit"
                  className="ui-link-shift inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                >
                  <Search className="h-4 w-4" />
                  Apply Filters
                </button>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="ui-link-shift inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-rose-200 hover:text-rose-600"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Filters
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_330px] xl:gap-6 2xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div
              className="ui-enter-up max-w-xl"
              style={{ animationDelay: "40ms", animationFillMode: "forwards" }}
            >
              <div>
                <h1 className="whitespace-nowrap font-display text-[1.85rem] font-bold leading-none text-slate-900">
                  Find Match
                </h1>
                <span className="mt-4 block h-[3px] w-14 rounded-full bg-rose-500" />
                <p className="mt-4 text-[16px] leading-8 text-slate-600 lg:whitespace-nowrap">
                  Find and connect with your perfect life partner.
                </p>
              </div>
            </div>

            <div className="w-full lg:max-w-[720px] lg:pt-4">{renderBrowseToolbar()}</div>
          </div>

          {loading ? (
            <SkeletonGrid count={8} />
          ) : profiles.length === 0 ? (
            <div className="ui-enter-scale ui-card-lift-soft rounded-[30px] border border-rose-100 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-8">
              <EmptyState
                icon="search"
                title="No profiles found"
                description="Try adjusting your filters to discover more potential matches."
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {profiles.map((profile, index) => (
                  <div
                    key={profile.id}
                    className="ui-enter-scale"
                    style={{
                      animationDelay: `${80 + (index % 8) * 55}ms`,
                      animationFillMode: "forwards",
                    }}
                  >
                    <BrowseProfileCard
                      profile={profile}
                      badge={index % 5 === 2 || index % 5 === 4 ? "Premium" : "New"}
                      onLike={handleProfileLike}
                      profileHref={buildProfileHref(profile.id)}
                    />
                  </div>
                ))}
              </div>

              {totalPages > 1 ? (
                <div
                  className="ui-enter-up flex flex-wrap items-center justify-center gap-3 py-2"
                  style={{ animationDelay: "180ms", animationFillMode: "forwards" }}
                >
                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={!hasPreviousPage}
                    className="ui-link-shift inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-500 transition-all hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {paginationItems.map((item, index) =>
                    typeof item === "number" ? (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        className={`ui-link-shift inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-[14px] border px-3 text-sm font-semibold transition-all ${
                          item === page
                            ? "border-rose-300 bg-rose-50 text-rose-600 shadow-[0_12px_24px_rgba(244,63,94,0.12)]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:text-rose-600"
                        }`}
                      >
                        {item}
                      </button>
                    ) : (
                      <span
                        key={`${item}-${index}`}
                        className="inline-flex h-11 min-w-[2.25rem] items-center justify-center text-sm font-semibold text-slate-400"
                      >
                        ...
                      </span>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setPage((currentPage) => Math.min(totalPages, currentPage + 1))
                    }
                    disabled={!hasNextPage}
                    className="ui-link-shift inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-500 transition-all hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {renderRightRail()}
      </div>
    </div>
  );
}

