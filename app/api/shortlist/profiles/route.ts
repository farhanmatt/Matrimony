import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  profilePreviewCardSelect,
  serializeProfilePreviewCard,
} from "@/lib/server/liked-profile-preview";
import { findOrCreateMatch } from "@/lib/utils/matching";

type ShortlistProfileRecord = Prisma.ProfileGetPayload<{
  select: typeof profilePreviewCardSelect;
}>;

type ShortlistProfilePreview = ReturnType<typeof serializeProfilePreviewCard>;

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      profileIds?: unknown;
    };
    const rawProfileIds = Array.isArray(body.profileIds) ? body.profileIds : [];
    const profileIds: string[] = Array.isArray(body?.profileIds)
      ? Array.from(
          new Set(
            rawProfileIds
              .filter((value: unknown): value is string => typeof value === "string")
              .map((value: string) => value.trim())
              .filter((value: string) => value.length > 0)
          )
        ).slice(0, 50)
      : [];

    if (profileIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const ownProfile = await prisma.profile.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      select: { id: true },
    });

    if (!ownProfile) {
      return NextResponse.json(
        { error: "You must create your profile before loading shortlist previews" },
        { status: 403 }
      );
    }

    // Ensure Match records exist for all shortlisted profiles so they can be unlocked/chatted
    await Promise.all(
      profileIds.map((profileId) =>
        findOrCreateMatch(ownProfile.id, profileId).catch((err) =>
          console.error(`Error syncing match for shortlisted profile ${profileId}:`, err)
        )
      )
    );

    const profiles = (await prisma.profile.findMany({
      where: {
        id: { in: profileIds },
        status: "ACTIVE",
        NOT: { id: ownProfile.id },
        OR: [
          {
            likesReceived: {
              some: {
                fromProfileId: ownProfile.id,
              },
            },
          },
          {
            likesSent: {
              some: {
                toProfileId: ownProfile.id,
              },
            },
          },
          {
            matchesAsA: {
              some: {
                profileBId: ownProfile.id,
              },
            },
          },
          {
            matchesAsB: {
              some: {
                profileAId: ownProfile.id,
              },
            },
          },
          {
            chatConversationsAsA: {
              some: {
                profileBId: ownProfile.id,
              },
            },
          },
          {
            chatConversationsAsB: {
              some: {
                profileAId: ownProfile.id,
              },
            },
          },
        ],
      },
      select: profilePreviewCardSelect,
    })) as ShortlistProfileRecord[];

    const profileMap = new Map<string, ShortlistProfilePreview>(
      profiles.map((profile) => [profile.id, serializeProfilePreviewCard(profile)])
    );

    return NextResponse.json({
      data: profileIds
        .map((profileId) => profileMap.get(profileId))
        .filter(
          (profile): profile is ShortlistProfilePreview => profile !== undefined
        ),
    });
  } catch (error) {
    console.error("Shortlist profile preview error:", error);
    return NextResponse.json(
      { error: "Failed to load shortlisted profiles" },
      { status: 500 }
    );
  }
}
