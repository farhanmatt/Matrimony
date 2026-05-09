"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

interface ProfileDetailActionsProps {
  profileId: string;
  nextProfileHref?: string | null;
  browseQueryString?: string;
}

export default function ProfileDetailActions({
  profileId,
  nextProfileHref,
  browseQueryString,
}: ProfileDetailActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSendInterest = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toProfileId: profileId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send interest");
        return;
      }
      if (data.matched) {
        toast.success("It's a match!");
        router.push("/dashboard/matches");
        return;
      }
      toast.success("Interest sent successfully.");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleSendInterest}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(244,63,94,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(244,63,94,0.28)] disabled:opacity-70"
      >
        <Heart className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
        {loading ? "Sending..." : "Send Interest"}
      </button>
    </div>
  );
}
