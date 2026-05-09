"use client";

import { Lock } from "lucide-react";
import { toast } from "sonner";

export default function DobLockedBadge() {
  return (
    <button
      type="button"
      onClick={() => toast.error("Please unlock this profile to view DOB")}
      className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-600 transition-colors hover:border-amber-300 hover:bg-amber-100"
    >
      <Lock className="h-4 w-4" />
      DOB locked
    </button>
  );
}
