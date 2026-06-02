"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, SlidersHorizontal, X } from "lucide-react";

const genderOptions = [
  { value: "", label: "All Genders" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
] as const;

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
] as const;

const maritalStatusOptions = [
  { value: "", label: "All Statuses" },
  { value: "NEVER_MARRIED", label: "Never Married" },
  { value: "DIVORCED", label: "Divorced" },
  { value: "WIDOWED", label: "Widowed" },
  { value: "SEPARATED", label: "Separated" },
  { value: "AWAITING_DIVORCE", label: "Awaiting Divorce" },
] as const;

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

const educationOptions = [
  "High School",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "M.Phil",
  "Doctorate / PhD",
  "Professional Degree",
  "Other",
];

const professionOptions = [
  "Software Engineer",
  "Doctor",
  "Teacher",
  "Business Owner",
  "Government Employee",
  "Private Sector Employee",
  "Chartered Accountant",
  "Lawyer",
  "Consultant",
  "Designer",
  "Civil Services",
  "Student",
  "Other",
];

const incomeOptions = [
  "No Income",
  "Below 1 LPA",
  "1-2 LPA",
  "2-4 LPA",
  "4-6 LPA",
  "6-8 LPA",
  "8-10 LPA",
  "10-15 LPA",
  "15-20 LPA",
  "20-30 LPA",
  "30+ LPA",
];

type DraftFilters = {
  gender: string;
  status: string;
  religion: string;
  maritalStatus: string;
  location: string;
  ageMin: string;
  ageMax: string;
  heightMin: string;
  heightMax: string;
  education: string;
  profession: string;
  income: string;
};

const emptyDrafts: DraftFilters = {
  gender: "",
  status: "",
  religion: "",
  maritalStatus: "",
  location: "",
  ageMin: "",
  ageMax: "",
  heightMin: "",
  heightMax: "",
  education: "",
  profession: "",
  income: "",
};

function readDrafts(searchParams: ReturnType<typeof useSearchParams>): DraftFilters {
  return {
    gender: searchParams.get("gender") ?? "",
    status: searchParams.get("status") ?? "",
    religion: searchParams.get("religion") ?? "",
    maritalStatus: searchParams.get("maritalStatus") ?? "",
    location: searchParams.get("location") ?? "",
    ageMin: searchParams.get("ageMin") ?? "",
    ageMax: searchParams.get("ageMax") ?? "",
    heightMin: searchParams.get("heightMin") ?? "",
    heightMax: searchParams.get("heightMax") ?? "",
    education: searchParams.get("education") ?? "",
    profession: searchParams.get("profession") ?? "",
    income: searchParams.get("income") ?? "",
  };
}

function updateParams(
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  router: ReturnType<typeof useRouter>,
  drafts: DraftFilters,
) {
  const params = new URLSearchParams(searchParams.toString());

  (Object.entries(drafts) as Array<[keyof DraftFilters, string]>).forEach(([key, value]) => {
    const trimmed = value.trim();
    if (trimmed) {
      params.set(key, trimmed);
    } else {
      params.delete(key);
    }
  });

  params.delete("page");
  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
}

interface AdminProfileFiltersProps {
  activeCount?: number;
}

export default function AdminProfileFilters({ activeCount = 0 }: AdminProfileFiltersProps) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftFilters>(emptyDrafts);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentActiveCount = useMemo(() => {
    const keys: (keyof DraftFilters)[] = [
      "gender",
      "status",
      "religion",
      "maritalStatus",
      "location",
      "ageMin",
      "ageMax",
      "heightMin",
      "heightMax",
      "education",
      "profession",
      "income",
    ];

    return keys.filter((key) => (searchParams.get(key) ?? "").trim().length > 0).length;
  }, [searchParams]);

  const openFilters = () => {
    setDrafts(readDrafts(searchParams));
    setOpen(true);
  };

  const closeFilters = () => setOpen(false);

  const applyFilters = () => {
    updateParams(pathname, searchParams, router, drafts);
    setOpen(false);
  };

  const clearFilters = () => {
    updateParams(pathname, searchParams, router, emptyDrafts);
    setDrafts(emptyDrafts);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFilters();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const totalActive = currentActiveCount || activeCount;

  return (
    <>
      <button
        type="button"
        onClick={openFilters}
        className="ui-link-shift inline-flex h-12 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-all duration-300 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md active:scale-[0.985]"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {totalActive > 0 ? (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1 text-[11px] font-semibold text-gray-700">
            {totalActive}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="ui-overlay-fade absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
            onClick={closeFilters}
          />

          <div className="ui-modal-pop relative z-10 w-full max-w-4xl rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                  Filter Profiles
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold text-gray-900">
                  Narrow your profile search
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Use matrimony-style filters to find the right profiles faster.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFilters}
                className="ui-link-shift rounded-full border border-gray-200 p-2 text-gray-500 transition-all duration-300 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Gender</label>
                <select
                  value={drafts.gender}
                  onChange={(event) => setDrafts((current) => ({ ...current, gender: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {genderOptions.map((option) => (
                    <option key={option.value || option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Profile Status
                </label>
                <select
                  value={drafts.status}
                  onChange={(event) => setDrafts((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value || option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Religion</label>
                <select
                  value={drafts.religion}
                  onChange={(event) => setDrafts((current) => ({ ...current, religion: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Marital Status
                </label>
                <select
                  value={drafts.maritalStatus}
                  onChange={(event) => setDrafts((current) => ({ ...current, maritalStatus: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {maritalStatusOptions.map((option) => (
                    <option key={option.value || option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Location</label>
                <input
                  value={drafts.location}
                  onChange={(event) => setDrafts((current) => ({ ...current, location: event.target.value }))}
                  placeholder="City, state or area"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Minimum Age
                </label>
                <input
                  type="number"
                  min="18"
                  max="70"
                  value={drafts.ageMin}
                  onChange={(event) => setDrafts((current) => ({ ...current, ageMin: event.target.value }))}
                  placeholder="e.g., 24"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Maximum Age
                </label>
                <input
                  type="number"
                  min="18"
                  max="70"
                  value={drafts.ageMax}
                  onChange={(event) => setDrafts((current) => ({ ...current, ageMax: event.target.value }))}
                  placeholder="e.g., 30"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Minimum Height (cm)
                </label>
                <input
                  type="number"
                  min="100"
                  max="250"
                  value={drafts.heightMin}
                  onChange={(event) => setDrafts((current) => ({ ...current, heightMin: event.target.value }))}
                  placeholder="e.g., 160"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Maximum Height (cm)
                </label>
                <input
                  type="number"
                  min="100"
                  max="250"
                  value={drafts.heightMax}
                  onChange={(event) => setDrafts((current) => ({ ...current, heightMax: event.target.value }))}
                  placeholder="e.g., 180"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Education</label>
                <select
                  value={drafts.education}
                  onChange={(event) => setDrafts((current) => ({ ...current, education: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Any Education</option>
                  {educationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Profession</label>
                <select
                  value={drafts.profession}
                  onChange={(event) => setDrafts((current) => ({ ...current, profession: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Any Profession</option>
                  {professionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Annual Income</label>
                <select
                  value={drafts.income}
                  onChange={(event) => setDrafts((current) => ({ ...current, income: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Any Income</option>
                  {incomeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="ui-link-shift inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-all duration-300 hover:border-gray-300 hover:text-gray-800"
              >
                <RotateCcw className="h-4 w-4" />
                Clear Filters
              </button>

              <button
                type="button"
                onClick={applyFilters}
                className="ui-link-shift inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-gray-800 hover:shadow-md"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
