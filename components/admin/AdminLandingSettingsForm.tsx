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
      <img
        src={displaySrc}
        alt={alt}
        className={className}
        onError={handleError}
      />
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

async function uploadLandingImage(file: File, assetType: "hero" | "logo") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("assetType", assetType);

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

  const saveHeroImage = useCallback(async () => {
    setSavingHero(true);
    const toastId = toast.loading("Uploading and saving hero banner...");

    try {
      const nextHeroImageUrl = heroPendingFile
        ? await uploadLandingImage(heroPendingFile, "hero")
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
        ? await uploadLandingImage(logoPendingFile, "logo")
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
    <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-2xl bg-rose-50 p-3 text-rose-500">
              <ImagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Landing Hero Image</h2>
              <p className="mt-1 text-sm text-gray-500">
                Upload, drag and drop, or replace the homepage hero banner.
              </p>
            </div>
          </div>

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
              "flex min-h-[16rem] flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed px-6 text-center transition-colors",
              heroDragActive
                ? "border-rose-500 bg-rose-50/70"
                : "border-rose-200 bg-gradient-to-br from-rose-50/60 via-white to-pink-50/40 hover:border-rose-300 hover:bg-rose-50/40",
            ].join(" ")}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm">
              <Upload className="h-6 w-6" />
            </div>
            <div className="mt-4 max-w-md">
              <h3 className="text-lg font-semibold text-gray-900">
                {heroDragActive ? "Drop the banner image here" : "Drag and drop a banner image"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                JPG, PNG, WEBP, GIF, or SVG up to 10 MB. Click anywhere in this box to browse files.
              </p>
            </div>

            {heroSelectedFileName ? (
              <div className="mt-4 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 shadow-sm">
                Selected file: {heroSelectedFileName}
              </div>
            ) : (
              <div className="mt-4 text-xs text-gray-400">
                Current banner is kept until you save a new image.
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openHeroFilePicker}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <ImagePlus className="h-4 w-4" />
              Choose File
            </button>
            <button
              type="button"
              onClick={() => void saveHeroImage()}
              disabled={savingHero}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(244,63,94,0.22)] transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingHero ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingHero ? "Saving..." : "Save Hero Image"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-2xl bg-rose-50 p-3 text-rose-500">
              <ImagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Site Logo Image</h2>
              <p className="mt-1 text-sm text-gray-500">
                Upload the logo shown in the header across the public site.
              </p>
            </div>
          </div>

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
              "flex min-h-[13rem] flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed px-6 text-center transition-colors",
              logoDragActive
                ? "border-rose-500 bg-rose-50/70"
                : "border-rose-200 bg-gradient-to-br from-rose-50/60 via-white to-pink-50/40 hover:border-rose-300 hover:bg-rose-50/40",
            ].join(" ")}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm">
              <Upload className="h-6 w-6" />
            </div>
            <div className="mt-4 max-w-md">
              <h3 className="text-lg font-semibold text-gray-900">
                {logoDragActive ? "Drop the logo image here" : "Drag and drop a logo image"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                JPG, PNG, WEBP, GIF, or SVG up to 10 MB. Click anywhere in this box to browse files.
              </p>
            </div>

            {logoSelectedFileName ? (
              <div className="mt-4 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 shadow-sm">
                Selected file: {logoSelectedFileName}
              </div>
            ) : (
              <div className="mt-4 text-xs text-gray-400">
                The current logo stays live until you save a new image.
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openLogoFilePicker}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <ImagePlus className="h-4 w-4" />
              Choose File
            </button>
            <button
              type="button"
              onClick={() => void saveLogoImage()}
              disabled={savingLogo}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(244,63,94,0.22)] transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingLogo ? "Saving..." : "Save Logo Image"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
          <div className="border-b border-rose-100 px-6 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              Banner Preview
            </h3>
          </div>

          <div className="relative aspect-[16/10] bg-gradient-to-br from-rose-50 via-white to-pink-50">
            <PreviewImage
              src={heroPreviewUrl}
              fallback={DEFAULT_HERO_IMAGE}
              alt="Landing hero preview"
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
          <div className="border-b border-rose-100 px-6 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              Site Logo Preview
            </h3>
          </div>

          <div className="flex min-h-[15rem] items-center justify-center bg-gradient-to-br from-white via-rose-50/50 to-pink-50/60 p-6">
            <div className="flex w-full max-w-md items-center justify-center rounded-[2rem] border border-rose-100 bg-white p-6 shadow-sm">
              <PreviewImage
                src={logoPreviewUrl}
                fallback={DEFAULT_LOGO_IMAGE}
                alt="Site logo preview"
                className="max-h-40 w-full object-contain object-center"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
