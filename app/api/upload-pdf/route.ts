import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("No file uploaded", { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return new NextResponse("Only PDF files are allowed", { status: 400 });
    }

    // Ensure the uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "medical-reports");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const uniqueId = crypto.randomUUID();
    const fileName = `${session.user.id}_${uniqueId}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    // Write file to local storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL for the file
    const publicUrl = `/uploads/medical-reports/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
