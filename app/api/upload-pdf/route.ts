import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

function ensureCloudinaryConfigured() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  if (apiSecret.includes("***")) {
    throw new Error("Cloudinary API Secret contains dummy asterisks. Please set the real secret in your .env file.");
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
        public_id: `${publicId}.pdf`,
        resource_type: "image",
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

    const contentType = req.headers.get("content-type");
    if (contentType !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: "No file uploaded or invalid file format" }, { status: 400 });
    }

    const buffer = Buffer.from(arrayBuffer);
    const secureUrl = await uploadPdf(buffer);

    return NextResponse.json({ url: secureUrl });
  } catch (error: any) {
    console.error("Error uploading PDF:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
