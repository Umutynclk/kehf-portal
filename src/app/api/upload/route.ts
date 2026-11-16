import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Dosya bulunamadı." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename
    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "_");
    const filename = `${Date.now()}_${safeName}`;

    // Target directory: public/logos/
    const logosDir = path.join(process.cwd(), "public", "logos");
    await mkdir(logosDir, { recursive: true });

    const filePath = path.join(logosDir, filename);
    await writeFile(filePath, buffer);

    const publicUrl = `/logos/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
    });
  } catch (error: any) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { error: error?.message || "Dosya yüklenirken hata oluştu." },
      { status: 500 }
    );
  }
}
