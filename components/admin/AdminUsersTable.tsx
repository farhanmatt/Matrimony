"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cake,
  CalendarDays,
  Check,
  CheckSquare,
  Copy,
  Eye,
  Heart,
  MapPin,
  MoreVertical,
  Phone,
  Square,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/common/StatusBadge";
import AdminPreviewableImage from "@/components/admin/AdminPreviewableImage";
import { cn, formatDate, getInitials } from "@/lib/utils/helpers";

type UserTableRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  profile: {
    id: string;
    fullName: string;
    gender: string;
    dateOfBirth: Date;
    maritalStatus: string;
    phone: string | null;
    status: string;
    religion: string | null;
    caste: string | null;
    location: string | null;
    city: string | null;
    state: string | null;
    profileImage: string | null;
  } | null;
};

interface AdminUsersTableProps {
  users: UserTableRow[];
  listFooter?: React.ReactNode;
}

function formatAge(dateOfBirth: Date) {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  const dayDiff = now.getDate() - dateOfBirth.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

function formatMaritalStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

export default function AdminUsersTable({
  users,
  listFooter,
}: AdminUsersTableProps) {
  const router = useRouter();
  const [visibleUsers, setVisibleUsers] = useState(users);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMenuPosition, setBulkMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [openActionRowId, setOpenActionRowId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const bulkMenuRef = useRef<HTMLDivElement | null>(null);
  const bulkTriggerRef = useRef<HTMLButtonElement | null>(null);
  const bulkPanelRef = useRef<HTMLDivElement | null>(null);
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const selectedCount = selectedIds.length;
  const allSelected = visibleUsers.length > 0 && selectedCount === visibleUsers.length;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    setVisibleUsers(users);
  }, [users]);

  useEffect(() => {
    if (!bulkOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        bulkMenuRef.current &&
        !bulkMenuRef.current.contains(target) &&
        bulkPanelRef.current &&
        !bulkPanelRef.current.contains(target)
      ) {
        setBulkOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [bulkOpen]);

  useEffect(() => {
    if (!bulkOpen) {
      setBulkMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = bulkTriggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuHeight = 156;
      const menuWidth = 224;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < menuHeight + 16 && spaceAbove > menuHeight;
      const top = openUpward ? rect.top - menuHeight - 8 : rect.bottom + 8;
      const left = Math.min(Math.max(12, rect.right - menuWidth), window.innerWidth - menuWidth - 12);

      setBulkMenuPosition({
        top: Math.max(12, top),
        left,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [bulkOpen]);

  useEffect(() => {
    if (!openActionRowId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(target) &&
        actionTriggerRef.current &&
        !actionTriggerRef.current.contains(target)
      ) {
        setOpenActionRowId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionRowId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openActionRowId]);

  useEffect(() => {
    if (!openActionRowId) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = actionTriggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuHeight = 156;
      const menuWidth = 224;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < menuHeight + 16 && spaceAbove > menuHeight;
      const top = openUpward ? rect.top - menuHeight - 8 : rect.bottom + 8;
      const left = Math.min(Math.max(12, rect.right - menuWidth), window.innerWidth - menuWidth - 12);

      setMenuPosition({
        top: Math.max(12, top),
        left,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openActionRowId]);

  const toggleSelected = (userId: string) => {
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : visibleUsers.map((user) => user.id));
  };

  const handleViewProfile = (profileId: string) => {
    router.push(`/admin/profiles/${profileId}`);
    setOpenActionRowId(null);
  };

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email copied");
    } catch {
      toast.error("Could not copy email");
    } finally {
      setOpenActionRowId(null);
    }
  };

  const handleCopyUserId = async (userId: string) => {
    try {
      await navigator.clipboard.writeText(userId);
      toast.success("User ID copied");
    } catch {
      toast.error("Could not copy user ID");
    } finally {
      setOpenActionRowId(null);
    }
  };

  const runBulkProfileStatusUpdate = async (status: "ACTIVE" | "SUSPENDED") => {
    if (bulkLoading || selectedIds.length === 0) return;
    const selectedProfiles = users
      .filter((user) => selectedSet.has(user.id) && user.profile)
      .map((user) => user.profile?.id)
      .filter((value): value is string => Boolean(value));

    if (selectedProfiles.length === 0) {
      toast.error("No linked profiles were selected");
      setBulkOpen(false);
      return;
    }

    setBulkLoading(true);

    try {
      const results = await Promise.all(
        selectedProfiles.map(async (profileId) => {
          const res = await fetch("/api/admin/profiles", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId, status }),
          });
          return res.ok;
        }),
      );

      if (results.every(Boolean)) {
        setVisibleUsers((current) =>
          current.map((user) => {
            if (!selectedIds.includes(user.id) || !user.profile) return user;
            return {
              ...user,
              profile: {
                ...user.profile,
                status,
              },
            };
          }),
        );
        setSelectedIds([]);
        toast.success(`Updated ${selectedProfiles.length} profiles`);
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto px-4 pt-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full min-w-[1180px] table-fixed text-sm xl:min-w-[1180px]">
            <colgroup>
              <col style={{ width: "40px" }} />
              <col style={{ width: "280px" }} />
              <col style={{ width: "300px" }} />
              <col style={{ width: "240px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "80px" }} />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-rose-100 bg-rose-50/95 backdrop-blur">
                <th className="w-10 bg-rose-50/95 px-3 py-3.5 text-left">
                  <SelectableCheckbox checked={allSelected} onChange={toggleAll} ariaLabel="Select all users" />
                </th>
                <th className="bg-rose-50/95 px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  User
                </th>
                <th className="bg-rose-50/95 px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Contact
                </th>
                <th className="bg-rose-50/95 px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Personal Details
                </th>
                <th className="bg-rose-50/95 px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Status
                </th>
                <th className="bg-rose-50/95 px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Joined
                </th>
                <th className="bg-rose-50/95 px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100">
              {visibleUsers.map((user) => {
                const checked = selectedSet.has(user.id);
                const profile = user.profile;
                const imageSrc = profile?.profileImage ?? null;

                return (
                  <tr key={user.id} className={cn("transition-colors hover:bg-rose-50/80", checked && "bg-rose-50/50")}>
                    <td className="px-3 py-4 align-middle">
                      <SelectableCheckbox
                        checked={checked}
                        onChange={() => toggleSelected(user.id)}
                        ariaLabel={`Select ${user.name ?? user.email}`}
                      />
                    </td>

                    <td className="px-3 py-4 align-middle">
                      <div className="flex items-center gap-2.5">
                        {imageSrc ? (
                          <AdminPreviewableImage
                            src={imageSrc}
                            alt={profile?.fullName ?? user.name ?? user.email}
                            className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-rose-100 via-white to-pink-100 shadow-sm ring-1 ring-rose-100"
                            imageClassName="object-cover object-[center_10%]"
                            sizes="44px"
                          />
                        ) : (
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-rose-100 via-white to-pink-100 shadow-sm ring-1 ring-rose-100">
                            <div className="flex h-full w-full items-center justify-center bg-rose-50 text-[11px] font-semibold text-slate-500">
                              {getInitials(profile?.fullName ?? user.name ?? user.email)}
                            </div>
                          </div>
                        )}

                        <div className="min-w-0 space-y-0.5 pt-0.5">
                          <div className="whitespace-nowrap text-[15px] font-semibold leading-tight text-slate-900">
                            {profile?.fullName ?? user.name ?? user.email}
                          </div>
                          <div className="whitespace-nowrap text-[11px] leading-tight text-slate-500">{user.email}</div>
                          {profile?.phone ? (
                            <div className="flex items-center gap-1 whitespace-nowrap text-[11px] leading-tight text-slate-500">
                              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                              <span>{profile.phone}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4 align-middle">
                      {profile ? (
                        <div className="space-y-1 text-sm text-slate-600">
                          <div className="flex items-start gap-2">
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-50 text-[10px] font-semibold text-rose-500">
                              <Heart className="h-3 w-3" />
                            </span>
                            <div className="min-w-0">
                              <div className="leading-tight text-[13px] text-slate-500">Marital Status</div>
                              <div className="truncate leading-tight text-[13px] font-medium text-slate-700">
                                {formatMaritalStatus(profile.maritalStatus)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                              <MapPin className="h-3 w-3" />
                            </span>
                            <div className="min-w-0">
                              <div className="leading-tight text-[13px] text-slate-500">Location</div>
                              <div className="truncate leading-tight text-[13px] font-medium text-slate-700">
                                {profile.location ?? profile.city ?? profile.state ?? "Not added"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="px-[15px] py-4 align-middle">
                      {profile ? (
                        <div className="space-y-0.5">
                          <div className="truncate text-sm font-semibold text-slate-900">{profile.fullName}</div>
                          <div className="flex items-center gap-1 text-[13px] text-slate-600">
                            <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{profile.gender}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[13px] text-slate-600">
                            <Cake className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{formatAge(profile.dateOfBirth)} years</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm italic text-slate-300">No profile</div>
                      )}
                    </td>

                    <td className="px-3 py-4 align-middle">
                      {profile ? <StatusBadge status={profile.status} /> : <span className="text-slate-300">-</span>}
                    </td>

                    <td className="px-3 py-4 align-middle">
                      <div className="whitespace-nowrap text-sm text-slate-600">{formatDate(user.createdAt)}</div>
                    </td>

                    <td className="px-3 py-4 align-middle">
                      <div className="relative flex justify-center">
                        <button
                          ref={openActionRowId === user.id ? actionTriggerRef : null}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenActionRowId((current) => (current === user.id ? null : user.id));
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-100 bg-white text-slate-500 shadow-sm transition-colors hover:border-rose-200 hover:text-rose-600"
                          aria-label={`Open actions for ${user.id}`}
                          aria-haspopup="menu"
                          aria-expanded={openActionRowId === user.id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openActionRowId === user.id && menuPosition && typeof document !== "undefined"
                          ? createPortal(
                              <div
                                ref={actionMenuRef}
                                className="fixed z-[9999] w-56 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl"
                                style={{
                                  top: `${menuPosition.top}px`,
                                  left: `${menuPosition.left}px`,
                                }}
                              >
                                {profile ? (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleViewProfile(profile.id);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                                  >
                                    <Eye className="h-4 w-4 text-rose-500" />
                                    View profile
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleCopyEmail(user.email);
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                                >
                                  <Copy className="h-4 w-4 text-slate-500" />
                                  Copy email
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleCopyUserId(user.id);
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                                >
                                  <Copy className="h-4 w-4 text-slate-500" />
                                  Copy user ID
                                </button>
                              </div>,
                              document.body,
                            )
                          : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {listFooter ? (
          <div className="mt-4 border-t border-rose-100 bg-rose-50/30 px-4 py-3">
            {listFooter}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 flex flex-col gap-3 border-t border-rose-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
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
            ref={bulkTriggerRef}
            type="button"
            onClick={() => setBulkOpen((value) => !value)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-100 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={selectedCount === 0 || bulkLoading}
          >
            Bulk Actions
          </button>

          {bulkOpen && bulkMenuPosition && typeof document !== "undefined"
            ? createPortal(
                <div
                  ref={bulkPanelRef}
                  className="fixed z-[9999] w-56 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl"
                  style={{
                    top: `${bulkMenuPosition.top}px`,
                    left: `${bulkMenuPosition.left}px`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => runBulkProfileStatusUpdate("ACTIVE")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                  >
                    <CheckSquare className="h-4 w-4 text-emerald-500" />
                    Activate selected
                  </button>
                  <button
                    type="button"
                    onClick={() => runBulkProfileStatusUpdate("SUSPENDED")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                  >
                    <Square className="h-4 w-4 text-amber-500" />
                    Suspend selected
                  </button>
                </div>,
                document.body,
              )
            : null}
        </div>
      </div>
    </div>
  );
}
