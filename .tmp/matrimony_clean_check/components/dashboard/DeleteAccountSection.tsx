"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle, ChevronDown, Loader2, Trash2, X } from "lucide-react";
import { deleteAccountReasonOptions } from "@/lib/constants/delete-account";
import { toast } from "sonner";

type DeleteAccountSectionProps = {
  email: string;
  hasPassword: boolean;
};

export default function DeleteAccountSection({
  email,
  hasPassword,
}: DeleteAccountSectionProps) {
  const [open, setOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeModal = () => {
    if (isSubmitting) return;
    setOpen(false);
    setDeletionReason("");
    setCurrentPassword("");
  };

  const handleDeleteAccount = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deletionReason,
          currentPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Failed to delete account");
        setIsSubmitting(false);
        return;
      }

      toast.success("Your account has been deleted.");
      await signOut({ callbackUrl: "/?accountDeleted=1" });
    } catch {
      toast.error("Something went wrong while deleting your account.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section
        id="delete-profile"
        className="flex flex-col gap-4 rounded-[24px] border border-rose-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,245,247,0.96)_100%)] px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-[1.35rem] font-bold text-slate-900">
              Delete Profile
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] text-slate-500">
              Once you delete your profile, your account, email login, password,
              matches, likes, unlocked profiles, and saved details will be removed permanently.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-rose-400 px-5 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
        >
          <Trash2 className="h-4.5 w-4.5" />
          Delete Profile
        </button>
      </section>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-[2px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="relative w-full max-w-xl rounded-[28px] border border-rose-100 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:p-7">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
              aria-label="Close delete account dialog"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-[1.6rem] font-bold text-slate-900">
                  Delete your account?
                </h3>
                <p className="mt-2 text-[15px] leading-7 text-slate-500">
                  This permanently deletes your full account, including the registered email
                  <span className="font-semibold text-slate-700"> {email}</span>,
                  password login, profile details, likes, matches, payments, and unlocked profiles.
                </p>
              </div>
            </div>

            <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 text-[14px] leading-7 text-amber-800">
              This action cannot be undone. Please choose a reason before you
              continue with deleting your account.
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="delete-account-reason"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Reason
                </label>
                <div className="relative">
                  <select
                    id="delete-account-reason"
                    value={deletionReason}
                    onChange={(event) => setDeletionReason(event.target.value)}
                    className="h-11 w-full appearance-none rounded-[16px] border border-slate-200 bg-white px-4 pr-11 text-[15px] text-slate-700 outline-none transition-colors focus:border-rose-300"
                  >
                    <option value="">Select a reason</option>
                    {deleteAccountReasonOptions.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {hasPassword ? (
                <div>
                  <label
                    htmlFor="delete-account-password"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Current Password
                  </label>
                  <input
                    id="delete-account-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Enter your current password"
                    className="h-11 w-full rounded-[16px] border border-slate-200 px-4 text-[15px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-rose-300"
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center justify-center rounded-[16px] border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isSubmitting || !deletionReason}
                className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Deleting Account...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4.5 w-4.5" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
