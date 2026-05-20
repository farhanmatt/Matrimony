import Image from "next/image";
import { Lock, Eye } from "lucide-react";
import { calculateAge } from "@/lib/utils/helpers";

interface LockedProfileCardProps {
  profile: {
    id: string;
    fullName: string;
    gender: string;
    dateOfBirth: Date | string;
    profession: string | null;
    city: string | null;
    state: string | null;
    religion: string | null;
    photos: { url: string; isPrimary: boolean }[];
  };
  matchId: string;
  baseAmount: number;
  profileAmount: number;
  onUnlock: (matchId: string) => void;
}

export default function LockedProfileCard({
  profile,
  matchId,
  baseAmount,
  profileAmount,
  onUnlock,
}: LockedProfileCardProps) {
  const primaryPhoto = profile.photos.find((p) => p.isPrimary)?.url ?? profile.photos[0]?.url;
  const age = calculateAge(profile.dateOfBirth);
  const total = baseAmount + profileAmount;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
      {/* Blurred photo with watermark */}
      <div className="relative h-56 bg-gradient-to-br from-rose-50 to-pink-100 profile-locked">
        {primaryPhoto ? (
          <Image
            src={primaryPhoto}
            alt="Locked matrimony profile"
            fill
            className="object-cover"
            style={{ objectPosition: "center 12%" }}
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full not-profile-locked">
            <div className="w-20 h-20 bg-rose-200 rounded-full flex items-center justify-center">
              <span className="text-3xl font-display font-bold text-rose-300">?</span>
            </div>
          </div>
        )}
        {/* Watermark overlay */}
        <div className="watermark">
          <Lock className="w-10 h-10 text-white drop-shadow-lg relative z-20" />
        </div>
        {/* Matched badge */}
        <div className="absolute top-3 left-3 bg-rose-500 text-white rounded-full px-3 py-1 text-xs font-bold z-10">
          ❤️ Matched
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-display font-bold text-gray-900 text-lg mb-1">
          {profile.fullName.split(" ")[0]} {/* First name only */}
          <span className="text-gray-300 font-normal"> ••••</span>
        </h3>

        <div className="space-y-1 mb-4 text-sm text-gray-500">
          <p>{age} years • {profile.religion ?? "—"}</p>
          <p>{profile.profession ?? "Professional"}</p>
          <p className="flex items-center gap-1">
            <Lock className="w-3 h-3" /> Contact details hidden
          </p>
        </div>

        {/* Pricing */}
        <div className="bg-rose-50 rounded-xl p-3 mb-4 text-xs text-gray-700">
          <div className="flex justify-between mb-1">
            <span>Base Amount</span>
            <span>₹{baseAmount}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Profile Amount</span>
            <span>₹{profileAmount}</span>
          </div>
          <div className="flex justify-between font-bold text-rose-600 border-t border-rose-200 pt-1 mt-1">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>

        <button
          onClick={() => onUnlock(matchId)}
          className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm"
        >
          <Eye className="w-4 h-4" />
          Unlock Full Profile — ₹{total}
        </button>
      </div>
    </div>
  );
}
