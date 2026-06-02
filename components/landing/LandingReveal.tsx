"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils/helpers";

type LandingRevealProps = {
  children: ReactNode;
  delayMs?: number;
  threshold?: number;
  rootMargin?: string;
  variant?: "up" | "left" | "right" | "scale";
};

export default function LandingReveal({
  children,
  delayMs = 0,
  threshold = 0.18,
  rootMargin = "0px 0px -12% 0px",
  variant = "up",
}: LandingRevealProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setIsVisible(true);
        observer.unobserve(entry.target);
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  const variantStyleMap: Record<
    NonNullable<LandingRevealProps["variant"]>,
    Record<string, string>
  > = {
    up: {
      "--landing-x": "0px",
      "--landing-y": "28px",
      "--landing-scale": "0.985",
      "--landing-blur": "3px",
    },
    left: {
      "--landing-x": "-34px",
      "--landing-y": "0px",
      "--landing-scale": "1",
      "--landing-blur": "4px",
    },
    right: {
      "--landing-x": "34px",
      "--landing-y": "0px",
      "--landing-scale": "1",
      "--landing-blur": "4px",
    },
    scale: {
      "--landing-x": "0px",
      "--landing-y": "18px",
      "--landing-scale": "0.96",
      "--landing-blur": "2px",
    },
  };

  return (
    <div
      ref={elementRef}
      className={cn(
      "landing-scroll-reveal",
        isVisible && "landing-scroll-reveal-visible"
      )}
      style={
        {
          ...variantStyleMap[variant],
          transitionDelay: `${delayMs}ms`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
