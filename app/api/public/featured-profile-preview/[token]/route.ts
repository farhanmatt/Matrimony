import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import {
  getFeaturedProfilePreviewSource,
  verifyFeaturedProfilePreviewToken,
} from "@/lib/server/featured-profile-preview";
import { resolveAllowedImageSrc } from "@/lib/utils/image";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

function buildFallbackPreviewSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 560" role="img" aria-label="Protected profile preview">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fde2e8" />
          <stop offset="55%" stop-color="#f4b6c6" />
          <stop offset="100%" stop-color="#de7f9d" />
        </linearGradient>
      </defs>
      <rect width="480" height="560" fill="url(#bg)" />
      <circle cx="240" cy="206" r="88" fill="rgba(255,255,255,0.38)" />
      <rect x="132" y="320" width="216" height="128" rx="64" fill="rgba(255,255,255,0.34)" />
      <circle cx="240" cy="280" r="54" fill="#ffffff" fill-opacity="0.95" />
      <rect x="212" y="248" width="56" height="44" rx="14" fill="none" stroke="#f43f5e" stroke-width="10" />
      <path d="M224 248v-20c0-20 14-34 32-34s32 14 32 34v20" fill="none" stroke="#f43f5e" stroke-width="10" stroke-linecap="round" />
    </svg>
  `.trim();
}

function buildFallbackPreviewResponse() {
  return new NextResponse(buildFallbackPreviewSvg(), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Robots-Tag": "noindex, noimageindex, noarchive",
    },
  });
}

async function loadPreviewSourceBuffer(source: string) {
  if (source.startsWith("data:image/")) {
    const [, encoded = ""] = source.split(",", 2);
    return Buffer.from(encoded, "base64");
  }

  const safeSource = resolveAllowedImageSrc(source, null);
  if (!safeSource || !safeSource.startsWith("https://")) {
    throw new Error("Unsupported featured profile preview source");
  }

  const response = await fetch(safeSource, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch preview source: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const payload = verifyFeaturedProfilePreviewToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const profile = await prisma.profile.findFirst({
    where: {
      id: payload.profileId,
      status: "ACTIVE",
    },
    select: {
      profileImage: true,
      photos: {
        where: { isPrimary: true },
        take: 1,
        select: {
          url: true,
          publicId: true,
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const previewSource = getFeaturedProfilePreviewSource(profile);

  if (
    !previewSource.previewUrl ||
    !previewSource.fingerprint ||
    previewSource.fingerprint !== payload.fingerprint
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const imageBuffer = await loadPreviewSourceBuffer(previewSource.previewUrl);
    const blurredPreview = await sharp(imageBuffer)
      .rotate()
      .resize(480, 560, {
        fit: "cover",
        position: "centre",
      })
      .blur(22)
      .modulate({
        brightness: 0.92,
        saturation: 0.88,
      })
      .jpeg({
        quality: 48,
        mozjpeg: true,
      })
      .toBuffer();

    return new NextResponse(new Uint8Array(blurredPreview), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "X-Robots-Tag": "noindex, noimageindex, noarchive",
      },
    });
  } catch (error) {
    console.error("Failed to render featured profile preview:", error);
    return buildFallbackPreviewResponse();
  }
}
