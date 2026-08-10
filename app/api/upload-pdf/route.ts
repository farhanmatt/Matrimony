import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

function ensureCloudinaryConfigured() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

function uploadPdf(buffer: Buffer) {
  ensureCloudinaryConfigured();
  const publicId = randomUUID();

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "medical_reports",
        public_id: publicId,
        resource_type: "image", // allows PDF to image conversion for free tier
        format: "pdf",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(new Error("Cloudinary upload completed without a secure URL"));
          return;
        }

        resolve(result.secure_url);
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const secureUrl = await uploadPdf(buffer);

    return NextResponse.json({ url: secureUrl });
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
