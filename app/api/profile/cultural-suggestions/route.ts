import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const religion = searchParams.get("religion");

    if (!religion) {
      return NextResponse.json(
        { error: "Religion parameter is required" },
        { status: 400 }
      );
    }

    const castesRaw = await prisma.profile.findMany({
      where: {
        religion: religion,
        caste: {
          not: "",
        },
      },
      select: { caste: true },
      distinct: ["caste"],
    });

    const subCastesRaw = await prisma.profile.findMany({
      where: {
        religion: religion,
        subCaste: {
          not: "",
        },
      },
      select: { subCaste: true },
      distinct: ["subCaste"],
    });

    const castes = castesRaw
      .map((p) => p.caste)
      .filter((c): c is string => c !== null && c !== undefined && c.trim() !== "");
    const subCastes = subCastesRaw
      .map((p) => p.subCaste)
      .filter((c): c is string => c !== null && c !== undefined && c.trim() !== "");

    // For Hindu, ensure "No Caste" is always available
    if (religion === "Hindu") {
      if (!castes.includes("No Caste")) {
        castes.unshift("No Caste");
      }
    }

    return NextResponse.json({ castes, subCastes });
  } catch (error) {
    console.error("Error fetching cultural suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch cultural suggestions" },
      { status: 500 }
    );
  }
}
