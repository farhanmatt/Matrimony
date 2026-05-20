"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  Check,
  CheckSquare,
  Home,
  MapPin,
  Ruler,
  Square,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/common/StatusBadge";
import AdminProfileRowActions from "@/components/admin/AdminProfileRowActions";
import AdminPreviewableImage from "@/components/admin/AdminPreviewableImage";
import { cn, calculateAge, GENDER_LABELS, getInitials } from "@/lib/utils/helpers";

type ProfileTableRow = {
  id: string;
  fullName: string;
  phone: string | null;
  gender: string;
  dateOfBirth: string;
  height: number | null;
  maritalStatus: string;
  status: string;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  religion: string | null;
  caste: string | null;
  education: string | null;
  profession: string | null;
  income: string | null;
  profileImage: string | null;
  user: {
    email: string;
    name: string | null;
    image: string | null;
  };
  isPaidProfile: boolean;
};

interface AdminProfilesTableProps {
  profiles: ProfileTableRow[];
  listReturnHref: string;
}

function formatHeight(height: number | null) {
  if (height == null) return "Not added";
  const totalInches = height / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${height.toFixed(0)} cm (${feet}'${inches}")`;
}

function SelectableCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-rose-300 bg-white text-rose-700 transition-colors hover:border-rose-500"
      aria-label={ariaLabel}
    >
      {checked ? <Check className="h-3.5 w-3.5" /> : null}
    </button>
  );
}

export default function AdminProfilesTable({
  profiles,
  listReturnHref,
}: AdminProfilesTableProps) {
  const router = useRouter();
  const [visibleProfiles, setVisibleProfiles] = useState(profiles);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleProfiles(profiles);
  }, [profiles]);

  const selectedCount = selectedIds.length;
  const allSelected = visibleProfiles.length > 0 && selectedCount === visibleProfiles.length;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (!bulkOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(event.target as Node)) {
        setBulkOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [bulkOpen]);

  const buildRowHref = (profileId: string) =>
    `/admin/profiles/${profileId}?returnTo=${encodeURIComponent(listReturnHref)}`;

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : visibleProfiles.map((profile) => profile.id));
  };

  const toggleSelected = (profileId: string) => {
    setSelectedIds((current) =>
      current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId],
    );
  };

  const runBulkStatusUpdate = async (status: "ACTIVE" | "SUSPENDED") => {
    if (bulkLoading || selectedIds.length === 0) return;
    setBulkLoading(true);

    try {
      const results = await Promise.all(
        selectedIds.map(async (profileId) => {
          const res = await fetch("/api/admin/profiles", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId, status }),
          });
          return res.ok;
        }),
      );

      if (results.every(Boolean)) {
        setVisibleProfiles((current) =>
          current.map((profile) => (selectedIds.includes(profile.id) ? { ...profile, status } : profile)),
        );
        setSelectedIds([]);
        toast.success(`Updated ${selectedIds.length} profiles`);
        router.refresh();
      } else {
        toast.error("Some profiles could not be updated");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBulkLoading(false);
      setBulkOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col style={{ width: "4%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "8%" }} />
        </colgroup>
        <thead>
          <tr className="border-b border-rose-100 bg-rose-50/80">
            <th className="px-2 py-3.5 text-left">
              <SelectableCheckbox
                checked={allSelected}
                onChange={toggleAll}
                ariaLabel="Select all profiles"
              />
            </th>
            <th className="px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              Profile
            </th>
            <th className="px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              Basic Info
            </th>
            <th className="px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              Community Details
            </th>
            <th className="px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              Location
            </th>
            <th className="px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              Career
            </th>
            <th className="px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              Status
            </th>
            <th className="px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              Contact Number
            </th>
            <th className="px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rose-100">
          {visibleProfiles.map((profile) => {
            const age = calculateAge(profile.dateOfBirth);
            const checked = selectedSet.has(profile.id);
            const rowHref = buildRowHref(profile.id);
            const imageSrc = profile.profileImage ?? profile.user.image ?? null;

            return (
              <tr
                key={profile.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-rose-50/80",
                  checked && "bg-rose-50/50",
                )}
                onClick={() => router.push(rowHref)}
                role="link"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(rowHref);
                  }
                }}
              >
                <td className="px-2 py-3 align-middle">
                  <SelectableCheckbox
                    checked={checked}
                    onChange={() => toggleSelected(profile.id)}
                    ariaLabel={`Select ${profile.fullName}`}
                  />
                </td>

                <td className="px-2 py-3 align-middle">
                  <div className="flex items-start gap-2.5">
                    {imageSrc ? (
                      <AdminPreviewableImage
                        src={imageSrc}
                        alt={profile.fullName}
                        className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-rose-100 via-white to-pink-100 shadow-sm ring-1 ring-rose-100"
                        imageClassName="object-cover"
                        sizes="44px"
                      />
                    ) : (
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-rose-100 via-white to-pink-100 shadow-sm ring-1 ring-rose-100">
                        <div className="flex h-full w-full items-center justify-center bg-rose-50 text-[11px] font-semibold text-slate-500">
                          {getInitials(profile.fullName)}
                        </div>
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-slate-900">
                          {profile.fullName}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>
                          {age} Years, {GENDER_LABELS[profile.gender] ?? profile.gender}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-2 py-3 align-middle">
                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <UserCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div className="min-w-0 truncate text-[13px] leading-5">
                        {GENDER_LABELS[profile.gender] ?? profile.gender}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div className="min-w-0 truncate text-[13px] leading-5">
                        {age} Years
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div className="min-w-0 truncate text-[12px] leading-5 text-slate-600">
                        {formatHeight(profile.height)}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div className="min-w-0 truncate text-[12px] leading-5 text-slate-600">
                        {profile.maritalStatus}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-2 py-3 align-middle">
                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <Home className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <div className="truncate text-[13px] leading-5">{profile.religion ?? "Not added"}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div className="min-w-0 truncate text-[13px] leading-5">{profile.caste ?? "Not added"}</div>
                    </div>
                  </div>
                </td>

                <td className="px-2 py-3 align-middle">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div className="min-w-0 space-y-0.5">
                      <div className="truncate text-[13px] leading-5">{profile.city ?? "Not added"}</div>
                      <div className="truncate text-[13px] leading-5">{profile.state ?? "Not added"}</div>
                      <div className="truncate text-[13px] leading-5">{profile.country ?? "India"}</div>
                    </div>
                  </div>
                </td>

                <td className="px-2 py-3 align-middle">
                  <div className="space-y-0.5 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <BriefcaseBusiness className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-slate-700">
                          {profile.profession ?? "Not added"}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          {profile.education ?? "Not added"}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          Income: {profile.income ?? "Not added"}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-2 py-3 align-middle">
                  <div className="flex flex-col items-start gap-0.5">
                    <StatusBadge status={profile.status} />
                    {profile.isPaidProfile ? (
                      <span className="inline-flex w-fit whitespace-nowrap rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex w-fit whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                        Not Verified
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-2 py-3 align-middle">
                  <div className="text-sm text-slate-600">
                    <div className="whitespace-nowrap text-[14px] font-medium text-slate-700">
                      {profile.phone ?? "Not added"}
                    </div>
                  </div>
                </td>

                <td className="px-2 py-3 align-middle">
                  <div onClick={(event) => event.stopPropagation()}>
                    <AdminProfileRowActions
                      profileId={profile.id}
                      profileStatus={profile.status}
                      viewHref={rowHref}
                      onStatusChange={(profileId, nextStatus) => {
                        setVisibleProfiles((current) =>
                          current.map((item) => (item.id === profileId ? { ...item, status: nextStatus } : item)),
                        );
                      }}
                      onDelete={(profileId) => {
                        setVisibleProfiles((current) => current.filter((item) => item.id !== profileId));
                        setSelectedIds((current) => current.filter((id) => id !== profileId));
                      }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-col gap-3 border-t border-rose-100 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2 shadow-sm">
            <span className="font-semibold text-slate-900">{selectedCount}</span> Selected
          </span>
          {selectedCount > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
            >
              Clear selection
            </button>
          ) : null}
        </div>

        <div ref={bulkMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setBulkOpen((value) => !value)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-100 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={selectedCount === 0 || bulkLoading}
          >
            Bulk Actions
          </button>

          {bulkOpen ? (
            <div className="absolute left-0 bottom-14 z-20 w-56 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl">
              <button
                type="button"
                onClick={() => runBulkStatusUpdate("ACTIVE")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
              >
                <CheckSquare className="h-4 w-4 text-emerald-500" />
                Activate selected
              </button>
              <button
                type="button"
                onClick={() => runBulkStatusUpdate("SUSPENDED")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
              >
                <Square className="h-4 w-4 text-amber-500" />
                Suspend selected
              </button>
            </div>
          ) : null}
        </div>
      </div>

    </div>
  );
}
