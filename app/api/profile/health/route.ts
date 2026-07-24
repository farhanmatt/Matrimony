import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminSettingsSnapshot } from "@/lib/utils/admin-settings";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAdminSettingsSnapshot();
  if (!settings.isHealthDetailsEnabled) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { healthDetails: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ healthDetails: profile.healthDetails });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAdminSettingsSnapshot();
  if (!settings.isHealthDetailsEnabled) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  try {
    const body = await req.json();

    const healthDetails = await prisma.healthDetails.upsert({
      where: { profileId: profile.id },
      create: {
        profileId: profile.id,
        bloodPressure: body.bloodPressure,
        diabetesStatus: body.diabetesStatus,
        diabetesDetails: body.diabetesStatus && body.diabetesStatus !== "No" ? body.diabetesDetails : null,
        medicalReportUrl: body.medicalReportUrl,
      },
      update: {
        bloodPressure: body.bloodPressure,
        diabetesStatus: body.diabetesStatus,
        diabetesDetails: body.diabetesStatus && body.diabetesStatus !== "No" ? body.diabetesDetails : null,
        medicalReportUrl: body.medicalReportUrl,
      },
    });

    return NextResponse.json({ healthDetails });
  } catch (error) {
    console.error("HealthDetails error:", error);
    return NextResponse.json({ error: "Failed to save health details" }, { status: 500 });
  }
}
