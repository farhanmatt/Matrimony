"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, RefreshCcw, Save, Upload, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/helpers";

type AdminSettingsResponse = {
  settings?: {
    heroImageUrl?: string | null;
    logoImageUrl?: string | null;
  } | null;
};

interface AdminLandingSettingsFormProps {
  initialHeroImageUrl: string;
  initialLogoImageUrl: string;
}

const DEFAULT_HERO_IMAGE = "/main.jpeg";
const DEFAULT_LOGO_IMAGE = "/default-logo.svg";
const ALLOWED_HOSTS = new Set([
  "res.cloudinary.com",
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
]);

function resolvePreviewSrc(value: string, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (ALLOWED_HOSTS.has(url.hostname)) {
      return trimmed;
    }
  } catch {
    // Fall back to the default preview image below.
  }

  return fallback;
}

function isAllowedImageFile(file: File) {
  return [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/jpg",
    "image/svg+xml",
  ].includes(file.type);
}

async function uploadImageToCloudinary(file: File) {
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
  const [heroImages, setHeroImages] = useState<string[]>(
    initialHeroImageUrl ? initialHeroImageUrl.split(",") : [DEFAULT_HERO_IMAGE]
  );
  const [logoImageUrl, setLogoImageUrl] = useState(initialLogoImageUrl || DEFAULT_LOGO_IMAGE);
  
  const [heroActiveIndex, setHeroActiveIndex] = useState(0);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(resolvePreviewSrc(initialLogoImageUrl, DEFAULT_LOGO_IMAGE));

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"banner" | "logo">("banner");
  const [savingHero, setSavingHero] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);

  const [heroDragActive, setHeroDragActive] = useState(false);
  const [logoDragActive, setLogoDragActive] = useState(false);

  const [selectedLogoFileName, setSelectedLogoFileName] = useState<string | null>(null);
  const [replacingHeroIndex, setReplacingHeroIndex] = useState<number | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [hasHeroChanges, setHasHeroChanges] = useState(false);

  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);

  const heroFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  const heroObjectUrlRef = useRef<string | null>(null);
  const logoObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/settings")
      .then((response) => response.json())
      .then((data: AdminSettingsResponse) => {
        if (!active) return;
        
        const nextHeroStr = data.settings?.heroImageUrl?.trim() || DEFAULT_HERO_IMAGE;
        setHeroImages(nextHeroStr.split(","));
        setHasHeroChanges(false);

        const nextLogo = data.settings?.logoImageUrl?.trim() || DEFAULT_LOGO_IMAGE;
        setLogoImageUrl(nextLogo);
        setLogoPreviewUrl(resolvePreviewSrc(nextLogo, DEFAULT_LOGO_IMAGE));
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

  // Auto-rotate hero preview
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setHeroActiveIndex((prev) => (prev + 1) % heroImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  useEffect(() => {
    return () => {
      if (heroObjectUrlRef.current) URL.revokeObjectURL(heroObjectUrlRef.current);
      if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
    };
  }, []);

  const clearPendingHeroFile = useCallback(() => {
    if (heroObjectUrlRef.current) {
      URL.revokeObjectURL(heroObjectUrlRef.current);
      heroObjectUrlRef.current = null;
    }
    setReplacingHeroIndex(null);
  }, []);

  const clearPendingLogoFile = useCallback(() => {
    setPendingLogoFile(null);
    setSelectedLogoFileName(null);
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
  }, []);

  const handleHeroFiles = useCallback(async (files: FileList | File[] | null | undefined, indexToReplace?: number | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!isAllowedImageFile(file)) {
      toast.error("Please choose a supported image format (JPG, PNG, WEBP, SVG, GIF)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Please choose an image smaller than 10 MB");
      return;
    }

    setUploadingHero(true);
    const targetIdx = indexToReplace !== undefined ? indexToReplace : replacingHeroIndex;
    
    try {
      const uploadedUrl = await uploadImageToCloudinary(file);
      
      setHeroImages(prev => {
        const next = [...prev];
        if (targetIdx !== null) {
          next[targetIdx] = uploadedUrl;
        } else {
          next.push(uploadedUrl);
        }
        return next;
      });

      setHasHeroChanges(true);
      toast.success(targetIdx !== null ? "Image ready for review" : "New image added to workspace");
      setReplacingHeroIndex(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingHero(false);
    }
  }, [heroImages, replacingHeroIndex]);

  const setLogoFilePreview = useCallback((file: File) => {
    if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    logoObjectUrlRef.current = objectUrl;
    setPendingLogoFile(file);
    setSelectedLogoFileName(file.name);
    setLogoPreviewUrl(objectUrl);
  }, []);

  const handleLogoFiles = useCallback((files: FileList | File[] | null | undefined) => {
    const file = files?.[0];
    if (!file) return;
    if (!isAllowedImageFile(file)) {
      toast.error("Please choose a supported image format (JPG, PNG, WEBP, SVG, GIF)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Please choose a logo smaller than 5 MB");
      return;
    }
    setLogoFilePreview(file);
  }, [setLogoFilePreview]);

  const handleSaveHero = useCallback(async () => {
    setSavingHero(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageUrl: heroImages.join(",") }),
      });

      if (!response.ok) throw new Error("Failed to update landing images");

      setHasHeroChanges(false);
      toast.success("Landing banner images updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong while saving");
    } finally {
      setSavingHero(false);
    }
  }, [heroImages]);

  const handleRemoveHero = useCallback((index: number) => {
    if (heroImages.length <= 1) {
      toast.error("At least one banner image is required");
      return;
    }
    const nextImages = heroImages.filter((_, i) => i !== index);
    setHeroImages(nextImages);
    setHasHeroChanges(true);
    setHeroActiveIndex(0);
  }, [heroImages]);

  const handleSaveLogo = useCallback(async () => {
    setSavingLogo(true);
    try {
      let nextLogoImageUrl = logoImageUrl;
      if (pendingLogoFile) {
        nextLogoImageUrl = await uploadImageToCloudinary(pendingLogoFile);
      }

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoImageUrl: nextLogoImageUrl }),
      });

      if (!response.ok) throw new Error("Failed to update logo");

      setLogoImageUrl(nextLogoImageUrl);
      setLogoPreviewUrl(resolvePreviewSrc(nextLogoImageUrl, DEFAULT_LOGO_IMAGE));
      clearPendingLogoFile();

      // Dispatch event to update logo across the site
      window.dispatchEvent(new CustomEvent("branding-logo-updated", {
        detail: { logoImageUrl: nextLogoImageUrl }
      }));

      toast.success("Logo updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSavingLogo(false);
    }
  }, [clearPendingLogoFile, logoImageUrl, pendingLogoFile]);

  const handleResetHero = useCallback(() => {
    const defaultList = [DEFAULT_HERO_IMAGE];
    setHeroImages(defaultList);
    setHeroActiveIndex(0);
    setHasHeroChanges(true);
    toast.info("Reset to default layout. Click Save to publish.");
  }, []);

  const handleResetLogo = useCallback(async () => {
    setSavingLogo(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoImageUrl: DEFAULT_LOGO_IMAGE }),
      });
      if (!response.ok) throw new Error("Failed to restore default logo");
      setLogoImageUrl(DEFAULT_LOGO_IMAGE);
      setLogoPreviewUrl(DEFAULT_LOGO_IMAGE);
      clearPendingLogoFile();
      
      window.dispatchEvent(new CustomEvent("branding-logo-updated", {
        detail: { logoImageUrl: DEFAULT_LOGO_IMAGE }
      }));
      
      toast.success("Default logo restored");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingLogo(false);
    }
  }, [clearPendingLogoFile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-rose-100 bg-white px-6 py-16 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tab Switcheer */}
      <div className="flex items-center gap-2 rounded-[24px] border border-rose-100 bg-white p-1.5 shadow-sm max-w-fit">
        <button
          onClick={() => setActiveTab("banner")}
          className={cn(
            "flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all",
            activeTab === "banner"
              ? "bg-gradient-to-r from-rose-600 to-pink-500 text-white shadow-md"
              : "text-gray-500 hover:bg-rose-50 hover:text-rose-600"
          )}
        >
          <ImagePlus className="h-4 w-4" />
          Landing Image
        </button>
        <button
          onClick={() => setActiveTab("logo")}
          className={cn(
            "flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all",
            activeTab === "logo"
              ? "bg-gradient-to-r from-rose-600 to-pink-500 text-white shadow-md"
              : "text-gray-500 hover:bg-rose-50 hover:text-rose-600"
          )}
        >
          <Upload className="h-4 w-4" />
          Logo Image
        </button>
      </div>

      {activeTab === "banner" && (
        <section className="grid animate-in fade-in slide-in-from-bottom-4 duration-500 gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-2xl bg-rose-50 p-3 text-rose-500">
              <ImagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Landing Hero Banner Slider</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage up to 6 banner images that rotate automatically on your homepage.
              </p>
            </div>
          </div>

          <input
            ref={heroFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => handleHeroFiles(e.target.files)}
          />

          <div className="space-y-6">
            {/* Multi-Image Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {heroImages.map((src, index) => (
                <div 
                  key={`${src}-${index}`} 
                  className={cn(
                    "group relative aspect-[16/9] overflow-hidden rounded-2xl border-2 transition-all",
                    heroActiveIndex === index ? "border-rose-500 ring-2 ring-rose-100" : "border-rose-100/50"
                  )}
                >
                  <img src={src} alt={`Banner ${index + 1}`} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setReplacingHeroIndex(index);
                        heroFileInputRef.current?.click();
                      }}
                      className="p-2 rounded-full bg-white text-gray-700 shadow-sm hover:text-rose-600"
                      title="Replace Image"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveHero(index)}
                      className="p-2 rounded-full bg-white text-gray-700 shadow-sm hover:text-red-600"
                      title="Remove Image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 rounded-lg bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                    Slot {index + 1}
                  </div>
                </div>
              ))}
              
              {heroImages.length < 6 && (
                <button
                  onClick={() => {
                    setReplacingHeroIndex(null);
                    heroFileInputRef.current?.click();
                  }}
                  onDragOver={(e) => { e.preventDefault(); setHeroDragActive(true); }}
                  onDragLeave={() => setHeroDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setHeroDragActive(false); handleHeroFiles(e.dataTransfer.files); }}
                  className={cn(
                    "flex aspect-[16/9] flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all",
                    heroDragActive
                      ? "border-rose-500 bg-rose-50"
                      : "border-rose-200 bg-gray-50/50 hover:border-rose-300 hover:bg-rose-50"
                  )}
                >
                  <Plus className="h-6 w-6 text-rose-400" />
                  <span className="mt-1 text-[11px] font-bold text-rose-500">Add Image</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleResetHero}
                disabled={uploadingHero || savingHero}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset to Default
              </button>
              <button
                onClick={handleSaveHero}
                disabled={uploadingHero || savingHero || !hasHeroChanges || heroImages.length === 0}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg transition-all disabled:opacity-50",
                  hasHeroChanges 
                    ? "bg-gradient-to-r from-rose-600 to-pink-500 text-white" 
                    : "bg-gray-100 text-gray-400 shadow-none"
                )}
              >
                {savingHero ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {uploadingHero ? "Uploading..." : savingHero ? "Saving..." : hasHeroChanges ? "Save Changes" : "Up to Date"}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
          <div className="border-b border-rose-100 px-6 py-4 flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Hero Preview</h3>
          </div>
          <div className="relative aspect-[16/10] bg-slate-50">
            {heroImages.map((src, index) => (
              <div
                key={`${src}-${index}`}
                className={cn(
                  "absolute inset-0 transition-opacity duration-1000",
                  heroActiveIndex === index ? "opacity-100" : "opacity-0"
                )}
              >
                <Image
                  src={src}
                  alt={`Banner preview ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
            
            {/* Dots */}
            {heroImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                {heroImages.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-all",
                      heroActiveIndex === i ? "bg-white w-4" : "bg-white/40"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {activeTab === "logo" && (
        <section className="grid animate-in fade-in slide-in-from-bottom-4 duration-500 gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-500">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Logo Management</h2>
              <p className="mt-1 text-sm text-gray-500">
                Replace your website logo. Supported formats: JPG, PNG, SVG, WebP.
              </p>
            </div>
          </div>

          <input
            ref={logoFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => handleLogoFiles(e.target.files)}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={() => logoFileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setLogoDragActive(true); }}
            onDragLeave={() => setLogoDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setLogoDragActive(false); handleLogoFiles(e.dataTransfer.files); }}
            className={cn(
              "flex min-h-[12rem] flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed px-6 text-center transition-colors",
              logoDragActive
                ? "border-blue-500 bg-blue-50/70"
                : "border-slate-200 bg-gradient-to-br from-slate-50/60 via-white to-blue-50/40 hover:border-blue-300 hover:bg-blue-50/40"
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-500 shadow-sm">
              <ImagePlus className="h-5 w-5" />
            </div>
            <div className="mt-4">
              <h3 className="font-semibold text-gray-900">
                {logoDragActive ? "Drop the logo here" : "Click or drag logo here"}
              </h3>
              <p className="mt-1 text-xs text-gray-500">Max size 5 MB</p>
            </div>
            {selectedLogoFileName && (
              <div className="mt-3 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm">
                {selectedLogoFileName}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => logoFileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              New Logo
            </button>
            <button
              onClick={handleResetLogo}
              disabled={savingLogo}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Reset Logo
            </button>
            <button
              onClick={handleSaveLogo}
              disabled={savingLogo || !pendingLogoFile}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
            >
              {savingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Logo
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-rose-100 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-rose-100 px-6 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Logo Preview</h3>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] bg-slate-50">
            <div className="relative h-24 w-full bg-white/80 backdrop-blur-sm rounded-xl border border-slate-100 shadow-sm flex items-center justify-center p-4">
              <img
                src={logoPreviewUrl}
                alt="Logo preview"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
          <div className="p-4 bg-slate-50/50 border-t border-rose-50 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">How it looks on your navbar</p>
          </div>
        </div>
      </section>
      )}
    </div>
  );
}

