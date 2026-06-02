"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

const introSteps = [
  {
    title: "Welcome to our Matrimony",
    actionLabel: "Next",
  },
  {
    title: "First, create your profile with your details",
    actionLabel: "Next",
  },
  {
    title: "Find your match",
    actionLabel: "Done",
  },
] as const;

export default function DashboardWelcomeIntro({
  initialOpen,
}: {
  initialOpen: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isLastStep = currentStep === introSteps.length - 1;
  const currentIntroStep = introSteps[currentStep];

  const handleNext = () => {
    if (isLastStep) {
      startTransition(async () => {
        const response = await fetch("/api/dashboard/intro", {
          method: "POST",
        });

        if (!response.ok) {
          const result = await response.json().catch(() => null);
          toast.error(result?.error ?? "Unable to finish the introduction");
          return;
        }

        setIsOpen(false);
        router.refresh();
      });
      return;
    }

    setCurrentStep((step) => step + 1);
  };

  return (
    <div className="ui-overlay-fade fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
      <div className="ui-modal-pop w-full max-w-xl rounded-[32px] border border-rose-100 bg-white p-8 shadow-[0_28px_100px_rgba(15,23,42,0.22)] sm:p-10">
        <div className="ui-soft-float mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg">
          <Sparkles className="h-7 w-7" />
        </div>

        <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-500">
          Step {currentStep + 1} of {introSteps.length}
        </p>

        <h2 className="mx-auto mt-4 max-w-md text-center font-display text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
          {currentIntroStep.title}
        </h2>

        <div className="mt-8 flex items-center justify-center gap-2">
          {introSteps.map((_, index) => (
            <span
              key={index}
              className={`h-2.5 rounded-full transition-all ${
                index === currentStep
                  ? "w-10 bg-rose-500"
                  : "w-2.5 bg-rose-200"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={isPending}
          className="ui-link-shift mt-10 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Saving..." : currentIntroStep.actionLabel}
        </button>
      </div>
    </div>
  );
}
