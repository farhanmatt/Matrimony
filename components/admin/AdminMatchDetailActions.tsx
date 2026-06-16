"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

interface AdminMatchDetailActionsProps {
  matchId: string;
}

export default function AdminMatchDetailActions({ matchId }: AdminMatchDetailActionsProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/matches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchIds: [matchId] }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to delete match");
        return;
      }

      toast.success("Match deleted");
      router.refresh();
      router.push("/admin/matches/deleted");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-5 text-sm font-semibold text-rose-600 shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50"
      >
        <Trash2 className="h-4.5 w-4.5" />
        Delete Match
      </button>

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
                  <X className="h-4.5 w-4.5" />
                </button>

                <div className="mb-6 flex flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-[1.4rem] font-bold text-slate-900">
                    Delete this match?
                  </h3>
                  <p className="mt-3 text-[15px] leading-7 text-slate-500">
                    Are you sure you want to delete this match? This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-[16px] border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-75"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4.5 w-4.5" />
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
    </>
  );
}
