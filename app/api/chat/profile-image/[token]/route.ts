import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getFeaturedProfilePreviewSource,
  verifyFeaturedProfilePreviewToken,
} from "@/lib/server/featured-profile-preview";
import { canStartChatForProfiles } from "@/lib/utils/chat";
import { resolveAllowedImageSrc } from "@/lib/utils/image";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

function buildFallbackPreviewSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="Protected chat profile image">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fde2e8" />
          <stop offset="58%" stop-color="#f6bfd0" />
          <stop offset="100%" stop-color="#e690b0" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" fill="url(#bg)" />
      <circle cx="160" cy="122" r="62" fill="rgba(255,255,255,0.42)" />
      <rect x="82" y="205" width="156" height="82" rx="40" fill="rgba(255,255,255,0.34)" />
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
    throw new Error("Unsupported chat profile preview source");
  }

  const response = await fetch(safeSource, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch chat preview source: ${response.status}`);
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
      "Content-Disposition": 'inline; filename="chat-profile.jpg"',
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

  const canAccess = await canStartChatForProfiles(
    viewerProfile.id,
    targetProfile.id
  );

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const imageBuffer = await loadPreviewSourceBuffer(previewSource.previewUrl);

    const renderedImage = await sharp(imageBuffer)
      .rotate()
      .resize(320, 320, {
        fit: "cover",
        position: "centre",
      })
      .blur(18)
      .modulate({
        brightness: 0.9,
        saturation: 0.84,
      })
      .jpeg({
        quality: 42,
        mozjpeg: true,
      })
      .toBuffer();

    return buildImageResponse(renderedImage);
  } catch (error) {
    console.error("Failed to render protected chat profile image:", error);
    return buildFallbackPreviewResponse();
  }
}
