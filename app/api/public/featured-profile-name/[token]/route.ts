import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import {
  getFeaturedProfileMaskedNameLabel,
  getFeaturedProfilePreviewSource,
  verifyFeaturedProfilePreviewToken,
} from "@/lib/server/featured-profile-preview";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildNameLabelSvg(label: string) {
  const escapedLabel = escapeXml(label);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="42" viewBox="0 0 360 42" preserveAspectRatio="xMinYMid meet">
      <rect width="360" height="42" fill="transparent" />
      <text
        x="0"
        y="30"
        fill="#1e293b"
        font-family="Arial, Helvetica, sans-serif"
        font-size="26"
        font-weight="700"
        letter-spacing="-0.4"
      >${escapedLabel}</text>
    </svg>
  `.trim();
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
      fullName: true,
      gender: true,
      dateOfBirth: true,
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

  const label = getFeaturedProfileMaskedNameLabel(profile);
  const imageBuffer = await sharp(Buffer.from(buildNameLabelSvg(label)))
    .png()
    .toBuffer();

  return new NextResponse(new Uint8Array(imageBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control":
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex, noimageindex, noarchive",
    },
  });
}
