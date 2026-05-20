"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface AdminPreviewableImageProps {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  gallery?: string[];
  initialIndex?: number;
}

export default function AdminPreviewableImage({
  src,
  alt,
  className,
  imageClassName,
  sizes = "(max-width: 1280px) 100vw, 48vw",
  triggerLabel,
  triggerClassName,
  gallery,
  initialIndex = 0,
}: AdminPreviewableImageProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const galleryImages = useMemo(() => {
    const items = (gallery?.length ? gallery : [src]).filter(
      (value): value is string => Boolean(value && value.trim())
    );

    return items.filter((value, index, array) => array.indexOf(value) === index);
  }, [gallery, src]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    if (!open || galleryImages.length === 0) return;

    const nextIndex = Math.min(Math.max(initialIndex, 0), galleryImages.length - 1);
    setActiveIndex(nextIndex);

    const frame = scrollRef.current;
    if (!frame) return;

    frame.scrollTo({ left: frame.clientWidth * nextIndex, behavior: "auto" });
  }, [galleryImages, initialIndex, open]);

  useEffect(() => {
    if (!open || galleryImages.length <= 1) return;

    const frame = scrollRef.current;
    if (!frame) return;

    const updateActiveIndex = () => {
      const width = frame.clientWidth || 1;
      const nextIndex = Math.min(
        galleryImages.length - 1,
        Math.max(0, Math.round(frame.scrollLeft / width))
      );
      setActiveIndex(nextIndex);
    };

    updateActiveIndex();
    frame.addEventListener("scroll", updateActiveIndex, { passive: true });
    window.addEventListener("resize", updateActiveIndex);

    return () => {
      frame.removeEventListener("scroll", updateActiveIndex);
      window.removeEventListener("resize", updateActiveIndex);
    };
  }, [galleryImages.length, open]);

  useEffect(() => {
    if (!open || galleryImages.length <= 1) return;

    const handleArrowKeys = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();

      const frame = scrollRef.current;
      if (!frame) return;

      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const nextIndex = Math.min(
        galleryImages.length - 1,
        Math.max(0, activeIndex + direction)
      );

      frame.scrollTo({
        left: frame.clientWidth * nextIndex,
        behavior: "smooth",
      });
      setActiveIndex(nextIndex);
    };

    window.addEventListener("keydown", handleArrowKeys);
    return () => window.removeEventListener("keydown", handleArrowKeys);
  }, [activeIndex, galleryImages.length, open]);

  const scrollByOne = (direction: -1 | 1) => {
    const frame = scrollRef.current;
    if (!frame || galleryImages.length <= 1) return;

    const nextIndex = Math.min(
      galleryImages.length - 1,
      Math.max(0, activeIndex + direction)
    );

    frame.scrollTo({
      left: frame.clientWidth * nextIndex,
      behavior: "smooth",
    });
    setActiveIndex(nextIndex);
  };

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-y-0 right-0 left-0 z-[9999] bg-slate-950/80 p-4 backdrop-blur-sm lg:left-56"
            onClick={() => setOpen(false)}
          >
            <div className="flex h-full w-full items-center justify-center">
              <div
                className="relative block max-h-[92vh] max-w-[92vw] overflow-hidden rounded-3xl bg-transparent shadow-none outline-none"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={`Close preview for ${alt}`}
              >
                <div
                  ref={scrollRef}
                  className="flex h-[min(92vh,920px)] w-[min(92vw,720px)] overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {galleryImages.map((imageSrc, index) => (
                    <div key={`${imageSrc}-${index}`} className="relative min-w-full snap-center">
                      <Image
                        src={imageSrc}
                        alt={`${alt} ${index + 1}`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 92vw, 720px"
                        priority={index === activeIndex}
                      />
                    </div>
                  ))}
                </div>

                {galleryImages.length > 1 ? (
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 backdrop-blur">
                    {galleryImages.map((imageSrc, index) => (
                      <span
                        key={`${imageSrc}-dot-${index}`}
                        className={`h-2 rounded-full transition-all ${
                          index === activeIndex ? "w-5 bg-white" : "w-2 bg-white/40"
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                ) : null}

                {galleryImages.length > 1 ? (
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2">
                    <button
                      type="button"
                      onClick={() => scrollByOne(-1)}
                      className="h-11 w-11 rounded-full bg-white/80 text-slate-700 shadow-lg backdrop-blur transition-colors hover:bg-white"
                      aria-label="Previous image"
                    >
                      {"<"}
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollByOne(1)}
                      className="h-11 w-11 rounded-full bg-white/80 text-slate-700 shadow-lg backdrop-blur transition-colors hover:bg-white"
                      aria-label="Next image"
                    >
                      {">"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={className ?? triggerClassName}
        aria-label={`Open full image for ${alt}`}
      >
        {triggerLabel ? (
          <span className="block w-full text-left">{triggerLabel}</span>
        ) : (
          <Image src={src} alt={alt} fill className={imageClassName ?? "object-cover"} sizes={sizes} />
        )}
      </button>

      {modal}
    </>
  );
}
