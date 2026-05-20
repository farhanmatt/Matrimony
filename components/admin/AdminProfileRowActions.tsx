"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, MoreVertical, RotateCw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AdminProfileRowActionsProps {
  profileId: string;
  profileStatus: string;
  viewHref: string;
  mode?: "default" | "deleted" | "blocked";
  onStatusChange?: (profileId: string, nextStatus: string) => void;
  onDelete?: (profileId: string, nextStatus: string) => void;
}

export default function AdminProfileRowActions({
  profileId,
  profileStatus,
  viewHref,
  mode = "default",
  onStatusChange,
  onDelete,
}: AdminProfileRowActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const menuHeight = 156;
  const menuWidth = 208;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < menuHeight + 16 && spaceAbove > menuHeight;
      const top = openUpward ? rect.top - menuHeight - 8 : rect.bottom + 8;
      const left = Math.min(
        Math.max(12, rect.right - menuWidth),
        window.innerWidth - menuWidth - 12,
      );

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
  }, [open]);

  const handleToggleStatus = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const nextStatus =
        mode === "deleted" || mode === "blocked" ? "ACTIVE" : profileStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      const res = await fetch("/api/admin/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, status: nextStatus }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to update profile status");
        return;
      }

      toast.success(`Profile marked as ${nextStatus.toLowerCase()}`);
      onStatusChange?.(profileId, nextStatus);
      if (!onStatusChange) {
        router.refresh();
      }
      setOpen(false);
      if ((mode === "deleted" || mode === "blocked") && nextStatus === "ACTIVE") {
        router.push("/admin/profiles");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (deleting) return;
    const confirmed = window.confirm("Delete this profile? This cannot be undone.");
    if (!confirmed) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/profiles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, permanent: mode === "deleted" }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete profile");
        return;
      }

      toast.success("Profile deleted");
      setOpen(false);
      onDelete?.(profileId, mode === "deleted" ? "deleted" : "deleted");
      if (!onDelete) {
        router.refresh();
      }
      router.push("/admin/profiles?view=deleted");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  const isActive = profileStatus === "ACTIVE";
  const isDeletedMode = mode === "deleted";
  const isBlockedMode = mode === "blocked";
  const actionLabel = isDeletedMode || isBlockedMode ? "Restore profile" : isActive ? "Block user" : "Unblock user";

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-700"
        aria-label="Profile actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>

      {open && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[9999] w-52 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
            >
              <a
                href={viewHref}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <ShieldCheck className="h-4 w-4 text-gray-500" />
                View profile
              </a>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={loading}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                {isDeletedMode || isBlockedMode ? (
                  <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""} text-emerald-500`} />
                ) : isActive ? (
                  <Ban className={`h-4 w-4 ${loading ? "animate-spin" : ""} text-amber-500`} />
                ) : (
                  <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""} text-emerald-500`} />
                )}
                {actionLabel}
              </button>
              {isDeletedMode ? (
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  disabled={deleting}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className={`h-4 w-4 ${deleting ? "animate-pulse" : ""}`} />
                  Delete permanently
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  disabled={deleting}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className={`h-4 w-4 ${deleting ? "animate-pulse" : ""}`} />
                  Delete user
                </button>
              )}
            </div>,
            document.body,
          )
        : null}

    </div>
  );
}
