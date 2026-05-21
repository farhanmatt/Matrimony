import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const BRANDING_FOLDERS = {
  hero: "branding/hero",
  logo: "branding/logo",
} as const;

type BrandingAssetType = keyof typeof BRANDING_FOLDERS;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function getBrandingAssetType(
  value: FormDataEntryValue | null,
): BrandingAssetType {
  return value === "logo" || value === "hero" ? value : "hero";
}

async function uploadImageToCloudinary(
  file: File,
  assetType: BrandingAssetType,
) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary upload preset is not configured");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", BRANDING_FOLDERS[assetType]);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const data = (await response.json().catch(() => null)) as
    | { secure_url?: string; error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Cloudinary upload failed");
  }

  if (!data?.secure_url) {
    throw new Error("Cloudinary upload completed without a secure URL");
  }

  return data.secure_url;
}

function adminGuard(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const assetType = getBrandingAssetType(formData.get("assetType"));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WEBP, GIF, and SVG images are allowed" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 10 MB" },
        { status: 400 },
      );
    }

    const secureUrl = await uploadImageToCloudinary(file, assetType);

    return NextResponse.json({ secureUrl });
  } catch (error) {
    console.error("Image upload failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
