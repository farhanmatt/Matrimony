"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { startTransition, useState } from "react";
import { toast } from "sonner";

export default function RecommendedProfileLikeButton({
  profileId,
}: {
  profileId: string;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (loading || liked) return;

    setLoading(true);
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toProfileId: profileId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to like profile");
        return;
      }

      setLiked(true);
      toast.success(
        data.matched
          ? "It's a Match! You both liked each other!"
          : "Profile liked!"
      );

      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLike}
      disabled={loading || liked}
      aria-label={liked ? "Liked" : "Like profile"}
      aria-pressed={liked}
      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-sm backdrop-blur transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-80"
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
    </button>
  );
}
