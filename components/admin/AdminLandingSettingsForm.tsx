"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, RefreshCcw, Save, Upload } from "lucide-react";
import { toast } from "sonner";

type AdminSettingsResponse = {
  settings?: {
    heroImageUrl?: string | null;
  } | null;
};

interface AdminLandingSettingsFormProps {
  initialHeroImageUrl: string;
  initialLogoImageUrl: string;
}

const DEFAULT_HERO_IMAGE = "/main.jpeg";
const ALLOWED_HOSTS = new Set([
  "res.cloudinary.com",
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
]);

function resolvePreviewSrc(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_HERO_IMAGE;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (ALLOWED_HOSTS.has(url.hostname)) {
      return trimmed;
    }
  } catch {
    // Fall back to the default preview image below.
  }

  return DEFAULT_HERO_IMAGE;
}

function isAllowedImageFile(file: File) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"].includes(file.type);
}

async function uploadHeroImageToCloudinary(file: File) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "ml_default";

  if (!cloudName) {
    throw new Error("Cloudinary is not configured");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = (await response.json().catch(() => ({}))) as {
    secure_url?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Failed to upload image");
  }

  if (!data.secure_url) {
    throw new Error("Upload completed without an image URL");
  }

  return data.secure_url;
}

export default function AdminLandingSettingsForm({
  initialHeroImageUrl,
  initialLogoImageUrl,
}: AdminLandingSettingsFormProps) {
  const initialHero = resolvePreviewSrc(initialHeroImageUrl || DEFAULT_HERO_IMAGE);
  void initialLogoImageUrl;
  const [heroImageUrl, setHeroImageUrl] = useState(initialHeroImageUrl || DEFAULT_HERO_IMAGE);
  const [previewUrl, setPreviewUrl] = useState(initialHero);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/settings")
      .then((response) => response.json())
      .then((data: AdminSettingsResponse) => {
        if (!active) return;
        const nextImage = data.settings?.heroImageUrl?.trim() || DEFAULT_HERO_IMAGE;
        setHeroImageUrl(nextImage);
        setPreviewUrl(resolvePreviewSrc(nextImage));
      })
      .catch(() => {
        if (active) toast.error("Failed to load landing settings");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const clearPendingFile = useCallback(() => {
    setPendingFile(null);
    setSelectedFileName(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const setFilePreview = useCallback((file: File) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPendingFile(file);
    setSelectedFileName(file.name);
    setPreviewUrl(objectUrl);
  }, []);

  const handleFiles = useCallback(
    (files: FileList | File[] | null | undefined) => {
      const file = files?.[0];
      if (!file) return;

      if (!isAllowedImageFile(file)) {
        toast.error("Please choose a JPG, PNG, WEBP, or GIF image");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Please choose an image smaller than 10 MB");
        return;
      }

      setFilePreview(file);
    },
    [setFilePreview],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      let nextHeroImageUrl = heroImageUrl;

      if (pendingFile) {
        nextHeroImageUrl = await uploadHeroImageToCloudinary(pendingFile);
      }

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageUrl: nextHeroImageUrl }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? "Failed to update landing image");
        return;
      }

      setHeroImageUrl(nextHeroImageUrl);
      setPreviewUrl(resolvePreviewSrc(nextHeroImageUrl));
      clearPendingFile();
      toast.success("Landing image updated successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [clearPendingFile, heroImageUrl, pendingFile]);

  const handleResetToDefault = useCallback(async () => {
    setSaving(true);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageUrl: DEFAULT_HERO_IMAGE }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? "Failed to restore default image");
        return;
      }

      setHeroImageUrl(DEFAULT_HERO_IMAGE);
      setPreviewUrl(DEFAULT_HERO_IMAGE);
      clearPendingFile();
      toast.success("Default landing image restored");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }, [clearPendingFile]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    handleFiles(event.dataTransfer.files);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-rose-100 bg-white px-6 py-16 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
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
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragActive(false);
          }}
          onDrop={onDrop}
          className={[
            "flex min-h-[16rem] flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed px-6 text-center transition-colors",
            dragActive
              ? "border-rose-500 bg-rose-50/70"
              : "border-rose-200 bg-gradient-to-br from-rose-50/60 via-white to-pink-50/40 hover:border-rose-300 hover:bg-rose-50/40",
          ].join(" ")}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm">
            <Upload className="h-6 w-6" />
          </div>
          <div className="mt-4 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900">
              {dragActive ? "Drop the banner image here" : "Drag and drop a banner image"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              JPG, PNG, WEBP, or GIF up to 10 MB. Click anywhere in this box to browse files.
            </p>
          </div>

          {selectedFileName ? (
            <div className="mt-4 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 shadow-sm">
              Selected file: {selectedFileName}
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
            onClick={openFilePicker}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <ImagePlus className="h-4 w-4" />
            Choose File
          </button>
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset to Default
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(244,63,94,0.22)] transition-colors disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Banner"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
        <div className="border-b border-rose-100 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
            Preview
          </h3>
        </div>

        <div className="relative aspect-[16/10] bg-gradient-to-br from-rose-50 via-white to-pink-50">
          <Image
            src={previewUrl}
            alt="Landing hero preview"
            fill
            unoptimized
            sizes="(max-width: 1280px) 100vw, 50vw"
            className="object-cover object-center"
          />
        </div>
      </div>
    </div>
  );
}
