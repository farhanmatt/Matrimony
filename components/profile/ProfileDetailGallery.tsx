"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Heart, ImageIcon, UserCircle2 } from "lucide-react";

interface ProfileDetailGalleryProps {
  name: string;
  photoUrls: string[];
  isNew?: boolean;
  isOnline?: boolean;
  extraPhotoCount?: number;
}

export default function ProfileDetailGallery({
  name,
  photoUrls,
  isNew = false,
  isOnline = true,
  extraPhotoCount = 0,
}: ProfileDetailGalleryProps) {
  const [activePhoto, setActivePhoto] = useState<string | null>(
    photoUrls[0] ?? null
  );

  useEffect(() => {
    setActivePhoto(photoUrls[0] ?? null);
  }, [photoUrls]);

  return (
    <div>
      <div className="ui-card-lift-soft overflow-hidden rounded-[16px] border border-rose-100 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
        <div className="relative aspect-[11/10] w-full bg-[linear-gradient(180deg,#fff7f9_0%,#fff1f5_100%)]">
          {activePhoto ? (
            <Image
              src={activePhoto}
              alt={`${name} profile photo`}
              fill
              className="ui-media-zoom object-cover"
              style={{ objectPosition: "center 12%" }}
              sizes="(max-width: 1024px) 100vw, 360px"
              priority
              unoptimized
              quality={100}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#fff6f8_0%,#fff0f4_42%,#ffe5ee_100%)]">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/94 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                <UserCircle2 className="h-20 w-20 text-rose-300" />
              </div>
            </div>
          )}

          {isNew ? (
            <div className="absolute left-4 top-4 inline-flex items-center rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm">
              New
            </div>
          ) : null}

          <div className="ui-icon-lift absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-rose-500 shadow-[0_12px_26px_rgba(15,23,42,0.16)]">
            <Heart className="h-5 w-5" />
          </div>

          {isOnline ? (
            <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-black/78 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Online
            </div>
          ) : null}
        </div>

        {photoUrls.length > 1 ? (
          <div className="border-t border-rose-100 bg-white p-2.5">
            <div className="grid grid-cols-5 gap-2">
              {photoUrls
                .slice(0, extraPhotoCount > 0 ? 4 : 5)
                .map((photoUrl, index) => {
                  const isActive = photoUrl === activePhoto;

                  return (
                    <button
                      key={`${photoUrl}-${index}`}
                      type="button"
                      onClick={() => setActivePhoto(photoUrl)}
                      className={`ui-card-lift-soft group relative aspect-[4/5] overflow-hidden rounded-[10px] border bg-white transition-all ${
                        isActive
                          ? "border-rose-300 ring-2 ring-rose-100"
                          : "border-gray-200 hover:border-rose-200"
                      }`}
                      aria-label={`View photo ${index + 1}`}
                    >
                      <Image
                        src={photoUrl}
                        alt={`${name} thumbnail ${index + 1}`}
                        fill
                        className="ui-media-zoom object-cover"
                        style={{ objectPosition: "center 12%" }}
                        sizes="96px"
                        unoptimized
                        quality={100}
                      />
                    </button>
                  );
                })}

              {extraPhotoCount > 0 && photoUrls[4] ? (
                <button
                  type="button"
                  onClick={() => setActivePhoto(photoUrls[4])}
                  className="ui-card-lift-soft group relative aspect-[4/5] overflow-hidden rounded-[10px] border border-gray-200 bg-white"
                  aria-label={`View ${extraPhotoCount} more photos`}
                >
                  <Image
                    src={photoUrls[4]}
                    alt={`${name} more photos`}
                    fill
                    className="ui-media-zoom object-cover"
                    style={{ objectPosition: "center 12%" }}
                    sizes="96px"
                    unoptimized
                    quality={100}
                  />
                  <div className="absolute inset-0 bg-black/48" />
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white">
                    +{extraPhotoCount}
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="ui-card-lift-soft border-t border-dashed border-rose-200 bg-white/90 px-4 py-5 text-center text-sm text-gray-500">
            <div className="ui-icon-lift mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-400">
              <ImageIcon className="h-4.5 w-4.5" />
            </div>
            More photos will appear here when available.
          </div>
        )}
      </div>
    </div>
  );
}
