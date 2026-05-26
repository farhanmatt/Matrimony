"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { isAllowedImageFile, resolveAllowedImageSrc } from "@/lib/utils/image";

type AdminLandingSettingsFormProps = {
  initialHeroImageUrl: string;
  initialLogoImageUrl: string;
};

type AdminSettingsResponse = {
  error?: string;
};

type UploadImageResponse = {
  secureUrl?: string;
  error?: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: {
    message?: string;
  };
};

const DEFAULT_HERO_IMAGE = "/main.jpeg";
const DEFAULT_LOGO_IMAGE = "/default-logo.svg";
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function isBrandingImageFile(file: File) {
  return isAllowedImageFile(file) || file.type === "image/svg+xml";
}

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

async function uploadLandingImageViaAdminApi(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/admin/upload-image", {
    method: "POST",
    body: formData,
  });

  const data = await readJson<UploadImageResponse>(response);

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to upload image");
  }

  if (!data?.secureUrl) {
    throw new Error("Upload completed without an image URL");
  }

  return data.secureUrl;
}

async function uploadLandingImageDirect(file: File) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary upload is not configured");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const data = (await readJson<CloudinaryUploadResponse>(response)) ?? null;

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Failed to upload image");
  }

  if (!data?.secure_url) {
    throw new Error("Upload completed without an image URL");
  }

  return data.secure_url;
}

async function uploadLandingImage(file: File) {
  try {
    return await uploadLandingImageDirect(file);
  } catch (directUploadError) {
    try {
      return await uploadLandingImageViaAdminApi(file);
    } catch (apiUploadError) {
      const directMessage =
        directUploadError instanceof Error ? directUploadError.message : null;
      const apiMessage =
        apiUploadError instanceof Error ? apiUploadError.message : null;

      if (directMessage && apiMessage && directMessage !== apiMessage) {
        throw new Error(
          `${directMessage}. Fallback upload also failed: ${apiMessage}`,
        );
      }

      if (apiMessage) {
        throw new Error(apiMessage);
      }

      if (directMessage) {
        throw new Error(directMessage);
      }

      throw new Error("Failed to upload image");
    }
  }
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const clearDraftFile = useCallback(() => {
    setPendingFile(null);
    setSelectedFileName(null);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const applySavedValue = useCallback(
    (value: string) => {
      const resolved = resolveAllowedImageSrc(value, fallbackValue) ?? fallbackValue;
      setSavedValue(resolved);
      setPreviewUrl(resolved);
      setDragActive(false);
      clearDraftFile();
    },
    [clearDraftFile, fallbackValue],
  );

  useEffect(() => {
    applySavedValue(initialValue);
  }, [applySavedValue, initialValue]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const setFilePreview = useCallback(
    (file: File) => {
      if (!isBrandingImageFile(file)) {
        toast.error("Please choose a JPG, PNG, WEBP, GIF, or SVG image");
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error("Please choose an image smaller than 10 MB");
        return;
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setPendingFile(file);
      setSelectedFileName(file.name);
      setPreviewUrl(objectUrl);
      setDragActive(false);
    },
    [],
  );

  const handleFiles = useCallback(
    (files: FileList | File[] | null | undefined) => {
      const file = files?.[0];
      if (!file) return;
      setFilePreview(file);
    },
    [setFilePreview],
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    savedValue,
    previewUrl,
    selectedFileName,
    pendingFile,
    dragActive,
    setDragActive,
    fileInputRef,
    openFilePicker,
    handleFiles,
    applySavedValue,
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
    pendingFile: heroPendingFile,
    dragActive: heroDragActive,
    setDragActive: setHeroDragActive,
    fileInputRef: heroFileInputRef,
    openFilePicker: openHeroFilePicker,
    handleFiles: handleHeroFiles,
    applySavedValue: applyHeroSavedValue,
  } = hero;
  const {
    savedValue: logoSavedValue,
    previewUrl: logoPreviewUrl,
    selectedFileName: logoSelectedFileName,
    pendingFile: logoPendingFile,
    dragActive: logoDragActive,
    setDragActive: setLogoDragActive,
    fileInputRef: logoFileInputRef,
    openFilePicker: openLogoFilePicker,
    handleFiles: handleLogoFiles,
    applySavedValue: applyLogoSavedValue,
  } = logo;
  const heroHasDraft = Boolean(heroPendingFile);
  const logoHasDraft = Boolean(logoPendingFile);

  const saveHeroImage = useCallback(async () => {
    setSavingHero(true);
    const toastId = toast.loading("Uploading and saving hero banner...");

    try {
      const nextHeroImageUrl = heroPendingFile
        ? await uploadLandingImage(heroPendingFile)
        : heroSavedValue;

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
  }, [applyHeroSavedValue, heroPendingFile, heroSavedValue]);

  const saveLogoImage = useCallback(async () => {
    setSavingLogo(true);
    const toastId = toast.loading("Uploading and saving site logo...");

    try {
      const nextLogoImageUrl = logoPendingFile
        ? await uploadLandingImage(logoPendingFile)
        : logoSavedValue;

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
  }, [applyLogoSavedValue, logoPendingFile, logoSavedValue]);

  const onDropHero = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setHeroDragActive(false);
      handleHeroFiles(event.dataTransfer.files);
    },
    [handleHeroFiles, setHeroDragActive],
  );

  const onDropLogo = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setLogoDragActive(false);
      handleLogoFiles(event.dataTransfer.files);
    },
    [handleLogoFiles, setLogoDragActive],
  );

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
              <input
                ref={heroFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={(event) => handleHeroFiles(event.target.files)}
              />

              <div
                role="button"
                tabIndex={0}
                onClick={openHeroFilePicker}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openHeroFilePicker();
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setHeroDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setHeroDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setHeroDragActive(false);
                }}
                onDrop={onDropHero}
                className={[
                  "group relative isolate flex min-h-[9.5rem] flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border px-6 py-4 text-center transition-all duration-300 sm:px-8",
                  heroDragActive
                    ? "border-rose-400 bg-rose-50 shadow-[0_18px_45px_rgba(244,63,94,0.12)]"
                    : "border-rose-200/90 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(255,241,242,0.92)_42%,rgba(253,242,248,0.76)_100%)] hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-[0_18px_45px_rgba(244,63,94,0.08)]",
                ].join(" ")}
              >
                <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-white/70 blur-3xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/90 text-rose-500 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                  <Upload className="h-7 w-7" />
                </div>
                <div className="relative mt-2.5 max-w-lg">
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                    {heroDragActive ? "Drop the banner image here" : "Drag and drop a banner image"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    JPG, PNG, WEBP, GIF, or SVG up to 10 MB. Click anywhere in this box to browse files.
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
                    Current banner is kept until you save a new image.
                  </div>
                )}

              </div>

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
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={(event) => handleLogoFiles(event.target.files)}
              />

              <div
                role="button"
                tabIndex={0}
                onClick={openLogoFilePicker}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openLogoFilePicker();
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setLogoDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setLogoDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setLogoDragActive(false);
                }}
                onDrop={onDropLogo}
                className={[
                  "group relative isolate flex min-h-[9.25rem] flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border px-6 py-3.5 text-center transition-all duration-300 sm:px-8",
                  logoDragActive
                    ? "border-rose-400 bg-rose-50 shadow-[0_18px_45px_rgba(244,63,94,0.12)]"
                    : "border-rose-200/90 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(255,241,242,0.92)_42%,rgba(253,242,248,0.76)_100%)] hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-[0_18px_45px_rgba(244,63,94,0.08)]",
                ].join(" ")}
              >
                <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-white/70 blur-3xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/90 text-rose-500 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                  <Upload className="h-7 w-7" />
                </div>
                <div className="relative mt-2.5 max-w-lg">
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                    {logoDragActive ? "Drop the logo image here" : "Drag and drop a logo image"}
                  </h3>
                  <p className="mt-2 text-sm leading-5 text-slate-500">
                    JPG, PNG, WEBP, GIF, or SVG up to 10 MB. Click anywhere in this box to browse files.
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
                    The current logo stays live until you save a new image.
                  </div>
                )}

              </div>

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
