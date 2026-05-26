"use client";

import { CldUploadWidget } from "next-cloudinary";
import { useCallback, useEffect, useState } from "react";
import { ImagePlus, Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { resolveAllowedImageSrc } from "@/lib/utils/image";

type AdminLandingSettingsFormProps = {
  initialHeroImageUrl: string;
  initialLogoImageUrl: string;
};

type AdminSettingsResponse = {
  error?: string;
};

type UploadedAsset = {
  fileName: string | null;
  secureUrl: string;
};

const DEFAULT_HERO_IMAGE = "/main.jpeg";
const DEFAULT_LOGO_IMAGE = "/default-logo.svg";
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default";

function resolvePreviewImageSrc(value: string, fallback: string) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("blob:")) return trimmed;
  return resolveAllowedImageSrc(trimmed, fallback) ?? fallback;
}

function PreviewImage({
  src,
  fallback,
  alt,
  className,
}: {
  src: string;
  fallback: string;
  alt: string;
  className: string;
}) {
  const [displaySrc, setDisplaySrc] = useState(() => resolvePreviewImageSrc(src, fallback));

  useEffect(() => {
    setDisplaySrc(resolvePreviewImageSrc(src, fallback));
  }, [fallback, src]);

  const handleError = useCallback(() => {
    setDisplaySrc((current) => (current === fallback ? current : fallback));
  }, [fallback]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={displaySrc} alt={alt} className={className} onError={handleError} />
    </>
  );
}

async function readJson<T>(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function getUploadedFileName(info: Record<string, unknown>) {
  const originalFileName =
    typeof info.original_filename === "string" ? info.original_filename : null;
  const format = typeof info.format === "string" ? info.format : null;

  if (!originalFileName) {
    return null;
  }

  if (originalFileName.includes(".") || !format) {
    return originalFileName;
  }

  return `${originalFileName}.${format}`;
}

function getUploadedAsset(result: unknown): UploadedAsset | null {
  const info =
    typeof result === "object" &&
    result &&
    "info" in result &&
    typeof result.info === "object" &&
    result.info
      ? (result.info as Record<string, unknown>)
      : null;

  const secureUrl = typeof info?.secure_url === "string" ? info.secure_url : null;

  if (!info || !secureUrl) {
    return null;
  }

  return {
    secureUrl,
    fileName: getUploadedFileName(info),
  };
}

async function saveLandingSetting(
  field: "heroImageUrl" | "logoImageUrl",
  value: string,
) {
  const response = await fetch("/api/admin/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ [field]: value }),
  });

  const data = await readJson<AdminSettingsResponse>(response);

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to update landing settings");
  }
}

function useDraftImage(initialValue: string, fallbackValue: string) {
  const normalizedInitialValue =
    resolveAllowedImageSrc(initialValue, fallbackValue) ?? fallbackValue;
  const [savedValue, setSavedValue] = useState(normalizedInitialValue);
  const [previewUrl, setPreviewUrl] = useState(normalizedInitialValue);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [pendingUploadUrl, setPendingUploadUrl] = useState<string | null>(null);

  const clearDraftFile = useCallback(() => {
    setSelectedFileName(null);
    setPendingUploadUrl(null);
  }, []);

  const applySavedValue = useCallback(
    (value: string) => {
      const resolved = resolveAllowedImageSrc(value, fallbackValue) ?? fallbackValue;
      setSavedValue(resolved);
      setPreviewUrl(resolved);
      clearDraftFile();
    },
    [clearDraftFile, fallbackValue],
  );

  useEffect(() => {
    applySavedValue(initialValue);
  }, [applySavedValue, initialValue]);

  const applyUploadedAsset = useCallback(
    (asset: UploadedAsset) => {
      const resolved = resolveAllowedImageSrc(asset.secureUrl, fallbackValue) ?? asset.secureUrl;
      setPendingUploadUrl(asset.secureUrl);
      setSelectedFileName(asset.fileName);
      setPreviewUrl(resolved);
    },
    [fallbackValue],
  );

  return {
    savedValue,
    previewUrl,
    selectedFileName,
    pendingUploadUrl,
    applySavedValue,
    applyUploadedAsset,
  };
}

export default function AdminLandingSettingsForm({
  initialHeroImageUrl,
  initialLogoImageUrl,
}: AdminLandingSettingsFormProps) {
  const hero = useDraftImage(initialHeroImageUrl, DEFAULT_HERO_IMAGE);
  const logo = useDraftImage(initialLogoImageUrl, DEFAULT_LOGO_IMAGE);
  const [savingHero, setSavingHero] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const {
    savedValue: heroSavedValue,
    previewUrl: heroPreviewUrl,
    selectedFileName: heroSelectedFileName,
    pendingUploadUrl: heroPendingUploadUrl,
    applySavedValue: applyHeroSavedValue,
    applyUploadedAsset: applyHeroUploadedAsset,
  } = hero;
  const {
    savedValue: logoSavedValue,
    previewUrl: logoPreviewUrl,
    selectedFileName: logoSelectedFileName,
    pendingUploadUrl: logoPendingUploadUrl,
    applySavedValue: applyLogoSavedValue,
    applyUploadedAsset: applyLogoUploadedAsset,
  } = logo;
  const heroHasDraft = Boolean(heroPendingUploadUrl);
  const logoHasDraft = Boolean(logoPendingUploadUrl);

  const restorePageScroll = useCallback(() => {
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
  }, []);

  const handleUploadError = useCallback(
    (kind: "banner" | "logo", error: unknown) => {
      console.error(`${kind} upload error:`, error);
      restorePageScroll();

      const message =
        typeof error === "object" &&
        error &&
        "statusText" in error &&
        typeof error.statusText === "string"
          ? error.statusText
          : "Failed to upload image";

      toast.error(`Error: ${message}`);
    },
    [restorePageScroll],
  );

  const handleHeroUpload = useCallback(
    (result: unknown) => {
      const asset = getUploadedAsset(result);

      if (!asset) {
        toast.error("Error: Upload completed without an image URL");
        return;
      }

      applyHeroUploadedAsset(asset);
      toast.success("Banner uploaded. Save to publish.");
    },
    [applyHeroUploadedAsset],
  );

  const handleLogoUpload = useCallback(
    (result: unknown) => {
      const asset = getUploadedAsset(result);

      if (!asset) {
        toast.error("Error: Upload completed without an image URL");
        return;
      }

      applyLogoUploadedAsset(asset);
      toast.success("Logo uploaded. Save to publish.");
    },
    [applyLogoUploadedAsset],
  );

  const saveHeroImage = useCallback(async () => {
    setSavingHero(true);
    const toastId = toast.loading("Uploading and saving hero banner...");

    try {
      const nextHeroImageUrl = heroPendingUploadUrl ?? heroSavedValue;

      await saveLandingSetting("heroImageUrl", nextHeroImageUrl);
      applyHeroSavedValue(nextHeroImageUrl);

      window.dispatchEvent(
        new CustomEvent("branding-hero-updated", {
          detail: { heroImageUrl: nextHeroImageUrl },
        }),
      );

      toast.success("Landing hero image saved successfully", { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save hero image";
      console.error("Hero image save error:", error);
      toast.error(`Error: ${message}`, { id: toastId });
    } finally {
      setSavingHero(false);
    }
  }, [applyHeroSavedValue, heroPendingUploadUrl, heroSavedValue]);

  const saveLogoImage = useCallback(async () => {
    setSavingLogo(true);
    const toastId = toast.loading("Uploading and saving site logo...");

    try {
      const nextLogoImageUrl = logoPendingUploadUrl ?? logoSavedValue;

      await saveLandingSetting("logoImageUrl", nextLogoImageUrl);
      applyLogoSavedValue(nextLogoImageUrl);

      if (typeof document !== "undefined") {
        document.body.dataset.logoImageUrl = nextLogoImageUrl;
      }

      window.dispatchEvent(
        new CustomEvent("branding-logo-updated", {
          detail: { logoImageUrl: nextLogoImageUrl },
        }),
      );

      toast.success("Site logo saved successfully", { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save logo image";
      console.error("Logo image save error:", error);
      toast.error(`Error: ${message}`, { id: toastId });
    } finally {
      setSavingLogo(false);
    }
  }, [applyLogoSavedValue, logoPendingUploadUrl, logoSavedValue]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,113,133,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,250,0.98))]" />

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr] 2xl:gap-8">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-rose-100/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
            <div className="relative border-b border-rose-100/80 px-6 py-3 sm:px-8">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.12),transparent_42%),radial-gradient(circle_at_right,rgba(251,113,133,0.1),transparent_34%)]" />

              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-rose-100 via-white to-pink-100 text-rose-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_30px_rgba(244,63,94,0.12)]">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="whitespace-nowrap text-2xl font-bold leading-none tracking-tight text-slate-900">
                      Landing Hero Image
                    </h2>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span
                    className={[
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
                      heroHasDraft
                        ? "border border-rose-200 bg-rose-50 text-rose-600"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-600",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        heroHasDraft ? "bg-rose-500" : "bg-emerald-500",
                      ].join(" ")}
                    />
                    {heroHasDraft ? "Draft selected" : "Live image"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-[1.125rem] sm:p-5">
              <CldUploadWidget
                onSuccess={handleHeroUpload}
                onClose={restorePageScroll}
                onAbort={restorePageScroll}
                onBatchCancelled={restorePageScroll}
                onError={(error) => handleUploadError("banner", error)}
                uploadPreset={CLOUDINARY_UPLOAD_PRESET}
                options={{
                  maxFiles: 1,
                  maxFileSize: MAX_IMAGE_SIZE_BYTES,
                  multiple: false,
                  resourceType: "image",
                  clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
                  showCompletedButton: true,
                  singleUploadAutoClose: true,
                  sources: ["local"],
                }}
              >
                {({ open }) => (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => open()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        open();
                      }
                    }}
                    className="group relative isolate flex min-h-[9.5rem] flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border border-rose-200/90 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(255,241,242,0.92)_42%,rgba(253,242,248,0.76)_100%)] px-6 py-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-[0_18px_45px_rgba(244,63,94,0.08)] sm:px-8"
                  >
                    <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-white/70 blur-3xl" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/90 text-rose-500 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div className="relative mt-2.5 max-w-lg">
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                        Click to upload a banner image
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        JPG, PNG, WEBP, GIF, or SVG up to 10 MB. Choose a file from your laptop,
                        then save to publish it on the homepage.
                      </p>
                    </div>

                    {heroSelectedFileName ? (
                      <div className="relative mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-rose-200 bg-white/95 px-4 py-2 text-xs font-semibold text-rose-700 shadow-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                        <span className="truncate">Pending file: {heroSelectedFileName}</span>
                      </div>
                    ) : (
                      <div className="relative mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-medium text-slate-500 shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Current banner is kept until you upload and save a new image.
                      </div>
                    )}
                  </div>
                )}
              </CldUploadWidget>

              <div className="mt-4 flex flex-col gap-3 rounded-[1.5rem] border border-rose-100 bg-gradient-to-r from-white to-rose-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {heroHasDraft ? "New banner selected and ready to save" : "Choose a new banner when you're ready"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    The preview updates immediately, but the public homepage changes only after you save.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void saveHeroImage()}
                    disabled={savingHero}
                    className="inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(244,63,94,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(244,63,94,0.28)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {savingHero ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savingHero ? "Saving..." : "Save Hero Image"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-rose-100/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
            <div className="relative border-b border-rose-100/80 px-6 py-3.5 sm:px-8">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.1),transparent_40%),radial-gradient(circle_at_right,rgba(251,113,133,0.08),transparent_34%)]" />

              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-rose-100 via-white to-pink-100 text-rose-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_30px_rgba(244,63,94,0.1)]">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="whitespace-nowrap text-2xl font-bold leading-none tracking-tight text-slate-900">
                      Site Logo Image
                    </h2>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span
                    className={[
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
                      logoHasDraft
                        ? "border border-rose-200 bg-rose-50 text-rose-600"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-600",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        logoHasDraft ? "bg-rose-500" : "bg-emerald-500",
                      ].join(" ")}
                    />
                    {logoHasDraft ? "Draft selected" : "Live image"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <CldUploadWidget
                onSuccess={handleLogoUpload}
                onClose={restorePageScroll}
                onAbort={restorePageScroll}
                onBatchCancelled={restorePageScroll}
                onError={(error) => handleUploadError("logo", error)}
                uploadPreset={CLOUDINARY_UPLOAD_PRESET}
                options={{
                  maxFiles: 1,
                  maxFileSize: MAX_IMAGE_SIZE_BYTES,
                  multiple: false,
                  resourceType: "image",
                  clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
                  showCompletedButton: true,
                  singleUploadAutoClose: true,
                  sources: ["local"],
                }}
              >
                {({ open }) => (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => open()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        open();
                      }
                    }}
                    className="group relative isolate flex min-h-[9.25rem] flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border border-rose-200/90 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(255,241,242,0.92)_42%,rgba(253,242,248,0.76)_100%)] px-6 py-3.5 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-[0_18px_45px_rgba(244,63,94,0.08)] sm:px-8"
                  >
                    <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-white/70 blur-3xl" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/90 text-rose-500 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div className="relative mt-2.5 max-w-lg">
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                        Click to upload a logo image
                      </h3>
                      <p className="mt-2 text-sm leading-5 text-slate-500">
                        JPG, PNG, WEBP, GIF, or SVG up to 10 MB. Choose a file from your laptop,
                        then save to update the live site logo.
                      </p>
                    </div>

                    {logoSelectedFileName ? (
                      <div className="relative mt-2.5 inline-flex max-w-full items-center gap-2 rounded-full border border-rose-200 bg-white/95 px-4 py-2 text-xs font-semibold text-rose-700 shadow-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                        <span className="truncate">Pending file: {logoSelectedFileName}</span>
                      </div>
                    ) : (
                      <div className="relative mt-2.5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-medium text-slate-500 shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        The current logo stays live until you upload and save a new image.
                      </div>
                    )}
                  </div>
                )}
              </CldUploadWidget>

              <div className="mt-3.5 flex flex-col gap-3 rounded-[1.5rem] border border-rose-100 bg-gradient-to-r from-white to-rose-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {logoHasDraft ? "New logo selected and ready to save" : "Choose a new logo when you're ready"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    The live site logo changes only after saving, so you can review the preview first.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void saveLogoImage()}
                    disabled={savingLogo}
                    className="inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(244,63,94,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(244,63,94,0.28)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {savingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savingLogo ? "Saving..." : "Save Logo Image"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <div className="overflow-hidden rounded-[2rem] border border-rose-100/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 border-b border-rose-100/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Banner Preview
                </h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  This view updates as soon as you pick a new banner file.
                </p>
              </div>
              <span
                className={[
                  "inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-semibold shadow-sm sm:self-auto",
                  heroHasDraft
                    ? "border border-rose-200 bg-rose-50 text-rose-600"
                    : "border border-slate-200 bg-white text-slate-500",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    heroHasDraft ? "bg-rose-500" : "bg-emerald-500",
                  ].join(" ")}
                />
                {heroHasDraft ? "Draft preview" : "Live preview"}
              </span>
            </div>

            <div className="p-4 sm:p-5">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-rose-100 bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.14),rgba(255,255,255,0.96)_44%,rgba(253,242,248,0.88)_100%)] p-2 sm:p-3">
                <div className="pointer-events-none absolute inset-x-16 top-0 h-20 rounded-full bg-white/70 blur-3xl" />
                <div className="absolute left-5 top-5 z-10 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                  Homepage hero
                </div>
                <div
                  className={[
                    "absolute right-5 top-5 z-10 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-sm",
                    heroHasDraft
                      ? "bg-rose-600 text-white"
                      : "bg-white/90 text-slate-600",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-2 w-2 rounded-full",
                      heroHasDraft ? "bg-white" : "bg-emerald-500",
                    ].join(" ")}
                  />
                  {heroHasDraft ? "Unsaved changes" : "Current live image"}
                </div>

                <div className="relative aspect-[16/10] overflow-hidden rounded-[1.35rem] border border-white/70 bg-gradient-to-br from-rose-50 via-white to-pink-50 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <PreviewImage
                    src={heroPreviewUrl}
                    fallback={DEFAULT_HERO_IMAGE}
                    alt="Landing hero preview"
                    className="h-full w-full object-cover object-center"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-white/10" />
                </div>
              </div>

            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-rose-100/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 border-b border-rose-100/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Site Logo Preview
                </h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  Review how the header logo looks before publishing the change.
                </p>
              </div>
              <span
                className={[
                  "inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-semibold shadow-sm sm:self-auto",
                  logoHasDraft
                    ? "border border-rose-200 bg-rose-50 text-rose-600"
                    : "border border-slate-200 bg-white text-slate-500",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    logoHasDraft ? "bg-rose-500" : "bg-emerald-500",
                  ].join(" ")}
                />
                {logoHasDraft ? "Draft preview" : "Live preview"}
              </span>
            </div>

            <div className="p-4 sm:p-5">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-rose-100 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(255,241,242,0.84),rgba(253,242,248,0.92))] p-5 sm:p-7">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.14),transparent_42%)]" />
                <div className="relative flex min-h-[18rem] items-center justify-center rounded-[1.75rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,250,251,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_20px_50px_rgba(15,23,42,0.08)]">
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                    Header logo
                  </div>
                  <div
                    className={[
                      "absolute right-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-sm",
                      logoHasDraft
                        ? "bg-rose-600 text-white"
                        : "bg-white/90 text-slate-600",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        logoHasDraft ? "bg-white" : "bg-emerald-500",
                      ].join(" ")}
                    />
                    {logoHasDraft ? "Unsaved changes" : "Current live image"}
                  </div>
                  <div className="pointer-events-none absolute inset-4 rounded-[1.35rem] border border-dashed border-rose-100/80" />
                  <PreviewImage
                    src={logoPreviewUrl}
                    fallback={DEFAULT_LOGO_IMAGE}
                    alt="Site logo preview"
                    className="relative z-10 max-h-40 w-full max-w-[290px] object-contain object-center drop-shadow-[0_16px_32px_rgba(15,23,42,0.12)]"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
