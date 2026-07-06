"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Heart, X } from "lucide-react";
import { createPortal } from "react-dom";
import { getWatermarkedCloudinaryUrl } from "@/lib/utils/image";

export default function SuccessStoryModal({ story, children }: { story: any; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur transition-colors hover:bg-black/40"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
        
        <div className="flex flex-col md:flex-row max-h-[90vh]">
          <div className="relative h-64 w-full shrink-0 bg-rose-50 md:h-auto md:w-2/5">
            {story.images && story.images.length > 0 ? (
              <Image
                src={getWatermarkedCloudinaryUrl(story.images[0])}
                alt={story.coupleName}
                fill
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="object-cover select-none pointer-events-none"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-rose-200">
                <Heart className="h-16 w-16 opacity-50" />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-8 md:w-3/5">
            <div className="flex flex-col h-full">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                {story.coupleName}
              </h3>
              {story.date && (
                <p className="mt-1 text-sm font-medium text-rose-500">
                  {new Date(story.date).toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              )}
              
              <div className="mt-6">
                <Heart className="h-6 w-6 text-rose-200 mb-2" />
                <p className="text-base leading-relaxed text-slate-700 italic">
                  &quot;{story.review}&quot;
                </p>
              </div>
              
              {story.description && (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Their Story
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                    {story.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer h-full">
        {children}
      </div>
      {mounted && isOpen && createPortal(modalContent, document.body)}
    </>
  );
}
