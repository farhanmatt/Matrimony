"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Ban, MoreVertical, RotateCw, ShieldCheck, Trash2, X } from "lucide-react";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<() => Promise<void>>(() => async () => {});
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleDeleteProfile = () => {
    if (deleting) return;
    setOpen(false);

    const isPermanent = mode === "deleted";
    setConfirmTitle(isPermanent ? "Permanently delete this profile?" : "Delete this profile?");
    setConfirmMessage(
      isPermanent
        ? "This will permanently remove the profile and all its data. This action cannot be undone."
        : "The profile will be moved to the Deleted Profiles section. You can restore it later from there.",
    );
    setConfirmCallback(() => async () => {
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/admin/profiles", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId, permanent: isPermanent }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? "Failed to delete profile");
          return;
        }

        toast.success(isPermanent ? "Profile permanently deleted" : "Profile moved to Deleted Profiles");
        onDelete?.(profileId, "deleted");
        if (!onDelete) {
          router.refresh();
        }
        // Navigate to the deleted profiles view so admin can see the archived entry
        if (!isPermanent) {
          router.push("/admin/profiles?view=deleted");
        } else {
          router.push("/admin/profiles");
        }
      } catch {
        toast.error("Something went wrong");
      } finally {
        setIsSubmitting(false);
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
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
        className="ui-link-shift inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-300 hover:border-gray-300 hover:text-gray-700 hover:shadow-md"
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
              className="ui-modal-pop fixed z-[9999] w-52 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
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
              <button
                type="button"
                onClick={handleDeleteProfile}
                disabled={deleting}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className={`h-4 w-4 ${deleting ? "animate-pulse" : ""}`} />
                {isDeletedMode ? "Delete permanently" : "Delete profile"}
              </button>
            </div>,
            document.body,
          )
        : null}

      {/* Custom confirm modal — replaces window.confirm */}
      {confirmOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-[2px]"
              onClick={(event) => {
                if (event.target === event.currentTarget && !isSubmitting) {
                  setConfirmOpen(false);
                }
              }}
            >
              <div className="relative w-full max-w-md rounded-[28px] border border-rose-100 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:p-7">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                  aria-label="Close dialog"
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="mb-6 flex flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-[1.4rem] font-bold text-slate-900">
                    {confirmTitle}
                  </h3>
                  <p className="mt-3 text-[15px] leading-7 text-slate-500">
                    {confirmMessage}
                  </p>
                </div>

                <div className="flex gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-[16px] border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmCallback}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-75"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
