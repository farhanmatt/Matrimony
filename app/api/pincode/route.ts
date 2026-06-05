import { NextRequest, NextResponse } from "next/server";
import {
  findMatchingCityForState,
  findMatchingStateOption,
} from "@/lib/constants/cityData";

type PostalApiPostOffice = {
  Name?: string | null;
  District?: string | null;
  State?: string | null;
  Block?: string | null;
  Division?: string | null;
  Region?: string | null;
  Taluk?: string | null;
};

type PostalApiResponseItem = {
  Status?: string | null;
  Message?: string | null;
  PostOffice?: PostalApiPostOffice[] | null;
};

export async function GET(request: NextRequest) {
  const pincode = request.nextUrl.searchParams.get("pincode")?.trim() ?? "";

  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json(
      { error: "Pincode must be 6 digits" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`,
      {
        next: { revalidate: 60 * 60 * 24 * 30 },
      }
    );

    if (!response.ok) {
      throw new Error("Postal lookup failed");
    }

    const payload = (await response.json()) as PostalApiResponseItem[];
    const result = Array.isArray(payload) ? payload[0] : null;
    const postOffices = result?.PostOffice?.filter(Boolean) ?? [];

    if (result?.Status !== "Success" || !postOffices.length) {
      return NextResponse.json(
        { error: "Enter a valid pincode" },
        { status: 404 }
      );
    }

    const matchedState = findMatchingStateOption(postOffices[0].State ?? "");

    if (!matchedState) {
      return NextResponse.json(
        { error: "Enter a valid pincode" },
        { status: 404 }
      );
    }

    const cityCandidates = postOffices.flatMap((office) => [
      office.Name,
      office.District,
      office.Block,
      office.Division,
      office.Region,
      office.Taluk,
    ]);

    const matchedCity =
      findMatchingCityForState(matchedState, cityCandidates) ??
      cityCandidates.find(
        (candidate): candidate is string =>
          typeof candidate === "string" && candidate.trim().length > 0
      ) ??
      "";

    if (!matchedCity) {
      return NextResponse.json(
        { error: "Enter a valid pincode" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        pincode,
        state: matchedState,
        city: matchedCity.trim(),
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to validate this pincode right now. Please try again.",
      },
      { status: 502 }
    );
  }
}
