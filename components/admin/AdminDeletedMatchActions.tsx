"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AlertTriangle, MoreVertical, RotateCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface AdminDeletedMatchActionsProps {
  deletedMatchId: string;
  profileAName: string;
  profileBName: string;
}

export default function AdminDeletedMatchActions({
  deletedMatchId,
  profileAName,
  profileBName,
}: AdminDeletedMatchActionsProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"restore" | "delete" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const openConfirm = (type: "restore" | "delete") => {
    setConfirmType(type);
    setConfirmOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const menuHeight = 112;
      const menuWidth = 208;
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
  }, [menuOpen]);

  const handleConfirm = async () => {
    if (!confirmType) return;
    setIsSubmitting(true);

    try {
      if (confirmType === "restore") {
        const res = await fetch("/api/admin/matches/deleted", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: deletedMatchId }),
        });

        const data = await res.json().catch(() => ({})) as { error?: string };

        if (!res.ok) {
          toast.error(data.error ?? "Failed to restore match");
          return;
        }

        toast.success("Match restored successfully");
        router.refresh();
        router.push("/admin/matches");
      } else {
        const res = await fetch("/api/admin/matches/deleted", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [deletedMatchId] }),
        });

        const data = await res.json().catch(() => ({})) as { error?: string };

        if (!res.ok) {
          toast.error(data.error ?? "Failed to permanently delete record");
          return;
        }

        toast.success("Record permanently deleted");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
      setConfirmOpen(false);
      setConfirmType(null);
    }
  };

  const isRestore = confirmType === "restore";

  return (
    <>
      <div className="relative flex justify-center" onClick={(event) => event.stopPropagation()}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-100 bg-white text-slate-500 shadow-sm transition-colors hover:border-rose-200 hover:text-rose-600"
          aria-label="Open actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen && menuPosition && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={menuRef}
                className="fixed z-[9999] w-52 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl"
                style={{
                  top: `${menuPosition.top}px`,
                  left: `${menuPosition.left}px`,
                }}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    openConfirm("restore");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                >
                  <RotateCw className="h-4 w-4 text-emerald-500" />
                  Restore
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    openConfirm("delete");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-rose-700 transition-colors hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                  Delete
                </button>
              </div>,
              document.body,
            )
          : null}
      </div>

      {/* Confirmation modal */}
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
                  disabled={isSubmitting}
                  className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500 disabled:opacity-50"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="mb-6 flex flex-col items-center text-center">
                  <div
                    className={`mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                      isRestore ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                    }`}
                  >
                    {isRestore ? (
                      <RotateCw className="h-6 w-6" />
                    ) : (
                      <AlertTriangle className="h-6 w-6" />
                    )}
                  </div>

                  <h3 className="font-display text-[1.4rem] font-bold text-slate-900">
                    {isRestore ? "Restore this match?" : "Permanently delete this record?"}
                  </h3>

                  <p className="mt-3 text-[15px] leading-7 text-slate-500">
                    {isRestore ? (
                      <>
                        This will restore the match between{" "}
                        <span className="font-semibold text-slate-700">{profileAName}</span> and{" "}
                        <span className="font-semibold text-slate-700">{profileBName}</span> as an
                        active match. It will be removed from this deleted archive.
                      </>
                    ) : (
                      <>
                        This will permanently erase the deleted match record for{" "}
                        <span className="font-semibold text-slate-700">{profileAName}</span> &{" "}
                        <span className="font-semibold text-slate-700">{profileBName}</span> from
                        the archive. This cannot be undone.
                      </>
                    )}
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
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-[16px] px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-75 ${
                      isRestore
                        ? "bg-gradient-to-r from-emerald-600 to-teal-500 shadow-[0_18px_36px_rgba(16,185,129,0.24)]"
                        : "bg-gradient-to-r from-rose-600 to-pink-500 shadow-[0_18px_36px_rgba(244,63,94,0.24)]"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {isRestore ? "Restoring..." : "Deleting..."}
                      </>
                    ) : (
                      <>
                        {isRestore ? (
                          <RotateCw className="h-4 w-4" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        {isRestore ? "Restore Match" : "Delete Permanently"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
