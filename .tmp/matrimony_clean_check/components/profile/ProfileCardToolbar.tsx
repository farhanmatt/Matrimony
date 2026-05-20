"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  MoreHorizontal,
  MessageCircle,
  Link2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface ProfileCardToolbarProps {
  profileName: string;
  profileUrl: string;
  downloadUrl?: string;
  downloadFilename?: string;
  canDownloadProfile?: boolean;
}

export default function ProfileCardToolbar({
  profileName,
  profileUrl,
  downloadUrl,
  downloadFilename,
  canDownloadProfile = true,
}: ProfileCardToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const whatsappShareUrl = useMemo(() => {
    const text = `Check out ${profileName}'s profile: ${profileUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [profileName, profileUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Profile link copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Unable to copy link");
    }
  };

  const handleDownloadProfile = async () => {
    if (!canDownloadProfile || !downloadUrl) {
      toast.error("Download is not available for this profile");
      return;
    }

    try {
      setDownloading(true);

      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          Accept: "application/pdf",
        },
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download =
        downloadFilename ?? `${profileName.replace(/\s+/g, "-").toLowerCase()}-profile.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setMenuOpen(false);
      toast.success("Profile downloaded");
    } catch {
      toast.error("Unable to download profile");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  return (
    <div className="flex justify-end">
      <div ref={menuRef} className="relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:border-rose-200 hover:text-rose-600"
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-14 z-50 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
              <button
                type="button"
                onClick={handleDownloadProfile}
                disabled={!canDownloadProfile || downloading}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                <Download className="h-4 w-4 text-gray-500" />
                <span className="flex-1">
                  {downloading ? "Preparing PDF..." : "Download profile"}
                </span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4 text-gray-500" />}
                {copied ? "Link copied" : "Copy profile link"}
              </button>
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                Share on WhatsApp
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

