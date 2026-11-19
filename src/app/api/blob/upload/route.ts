import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomBytes } from "crypto";
import { verifyAdminRequest } from "@/lib/firebase/session";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    // 1. Strict server-side HttpOnly admin session check
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Yetkisiz erişim: admin kimlik doğrulaması gerekli.",
        },
        { status: 401 }
      );
    }

    // 2. Read form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const key = (formData.get("key") as string) || "image";

    // 3. File presence check
    if (!file) {
      return NextResponse.json(
        { success: false, error: "Yüklenecek dosya bulunamadı." },
        { status: 400 }
      );
    }

    // 4. MIME type validation (server-side)
    const mimeType = file.type;
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Desteklenmeyen dosya tipi: ${mimeType}. Yalnızca JPG, PNG ve WEBP kabul edilir.`,
        },
        { status: 415 }
      );
    }

    // 5. File size validation (server-side)
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Dosya çok büyük. Maksimum dosya boyutu 10 MB olabilir.",
        },
        { status: 413 }
      );
    }

    // 6. Build safe, unique pathname
    const ext = mimeType.split("/")[1].replace("jpeg", "jpg");
    const safeKey =
      key
        .replace(/[^a-z0-9_-]/gi, "-")
        .replace(/-+/g, "-")
        .toLowerCase()
        .slice(0, 40) || "image";
    const timestamp = Date.now();
    const randomId = randomBytes(4).toString("hex");
    const pathname = `images/${safeKey}/${timestamp}-${randomId}.${ext}`;

    // 7. Upload to Vercel Blob (preserve existing token / storeId config)
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const oidcToken = process.env.VERCEL_OIDC_TOKEN;
    const storeId = process.env.BLOB_STORE_ID;

    if (!blobToken && !(oidcToken && storeId)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vercel Blob yapılandırması eksik (BLOB_READ_WRITE_TOKEN tanımlı değil).",
        },
        { status: 503 }
      );
    }

    const putOptions = {
      access: "public" as const,
      contentType: mimeType,
      ...(blobToken
        ? { token: blobToken }
        : { token: oidcToken, storeId }),
    };

    const blob = await put(
      pathname,
      file,
      putOptions as Parameters<typeof put>[2]
    );

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Blob upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Görsel Vercel Blob'a yüklenemedi: ${message}`,
      },
      { status: 500 }
    );
  }
}
