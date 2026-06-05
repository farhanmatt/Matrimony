import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getFeaturedProfilePreviewSource,
  verifyFeaturedProfilePreviewToken,
} from "@/lib/server/featured-profile-preview";
import { resolveAllowedImageSrc } from "@/lib/utils/image";
import { findUnlockForProfiles } from "@/lib/utils/matching";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

function buildFallbackPreviewSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 560" role="img" aria-label="Protected notification profile preview">
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
    </svg>
  `.trim();
}

function buildFallbackPreviewResponse() {
  return new NextResponse(buildFallbackPreviewSvg(), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, noimageindex, noarchive",
      "Cross-Origin-Resource-Policy": "same-origin",
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
    throw new Error("Unsupported notification profile preview source");
  }

  const response = await fetch(safeSource, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch preview source: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function buildImageResponse(imageBuffer: Buffer) {
  return new NextResponse(new Uint8Array(imageBuffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, noimageindex, noarchive",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Content-Disposition": 'inline; filename="notification-profile.jpg"',
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await context.params;
  const payload = verifyFeaturedProfilePreviewToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [viewerProfile, targetProfile] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    }),
    prisma.profile.findFirst({
      where: {
        id: payload.profileId,
        status: "ACTIVE",
      },
      select: {
        id: true,
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
    }),
  ]);

  if (!viewerProfile || !targetProfile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const previewSource = getFeaturedProfilePreviewSource(targetProfile);

  if (
    !previewSource.previewUrl ||
    !previewSource.fingerprint ||
    previewSource.fingerprint !== payload.fingerprint
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const [imageBuffer, unlock] = await Promise.all([
      loadPreviewSourceBuffer(previewSource.previewUrl),
      findUnlockForProfiles(
        session.user.id,
        viewerProfile.id,
        targetProfile.id
      ),
    ]);

    const renderedImage = unlock
      ? await sharp(imageBuffer)
          .rotate()
          .resize(480, 560, {
            fit: "cover",
            position: "centre",
          })
          .jpeg({
            quality: 78,
            mozjpeg: true,
          })
          .toBuffer()
      : await sharp(imageBuffer)
          .rotate()
          .resize(480, 560, {
            fit: "cover",
            position: "centre",
          })
          .blur(20)
          .modulate({
            brightness: 0.92,
            saturation: 0.88,
          })
          .jpeg({
            quality: 44,
            mozjpeg: true,
          })
          .toBuffer();

    return buildImageResponse(renderedImage);
  } catch (error) {
    console.error("Failed to render notification profile preview:", error);
    return buildFallbackPreviewResponse();
  }
}
