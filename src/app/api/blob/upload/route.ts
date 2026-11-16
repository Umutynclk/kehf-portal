import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomBytes } from "crypto";
import { verifyAdminToken } from "@/lib/auth";

// ── Allowed MIME types & limits ──────────────────────────────────
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ── Helper to extract and verify admin token from request ────────
function checkAdminAuth(request: NextRequest, bodyToken?: string | null): boolean {
  // 1. From body or form field
  if (bodyToken && verifyAdminToken(bodyToken)) return true;

  // 2. From Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (verifyAdminToken(token)) return true;
  }

  // 3. From cookie
  const cookieToken = request.cookies.get("kehf_admin_token")?.value;
  if (cookieToken && verifyAdminToken(cookieToken)) return true;

  return false;
}

// ── POST /api/blob/upload ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // 1. Read form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const key = (formData.get("key") as string) || "image";
    const adminToken = formData.get("adminToken") as string | null;

    // 2. Admin auth check
    const isAuthorized = checkAdminAuth(request, adminToken);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Yetkisiz erişim: admin kimlik doğrulaması gerekli." },
        { status: 401 }
      );
    }

    // 3. File presence check
    if (!file) {
      return NextResponse.json(
        { error: "Dosya bulunamadı." },
        { status: 400 }
      );
    }

    // 4. MIME type validation (server-side)
    const mimeType = file.type;
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          error: `Desteklenmeyen dosya tipi: ${mimeType}. Yalnızca JPG, PNG ve WEBP kabul edilir.`,
        },
        { status: 415 }
      );
    }

    // 5. File size validation (server-side)
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Dosya çok büyük. Maksimum boyut 10 MB.` },
        { status: 413 }
      );
    }

    // 6. Build safe, unique pathname
    const ext = mimeType.split("/")[1].replace("jpeg", "jpg");
    const safeKey = key.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
    const timestamp = Date.now();
    const randomId = randomBytes(4).toString("hex");
    const pathname = `images/${safeKey}/${timestamp}-${randomId}.${ext}`;

    // 7. Upload to Vercel Blob using OIDC token (server-side only)
    const oidcToken = process.env.VERCEL_OIDC_TOKEN;
    const storeId = process.env.BLOB_STORE_ID;

    const putOptions = {
      access: "public" as const,
      contentType: mimeType,
      ...(oidcToken && storeId ? { token: oidcToken, storeId } : {}),
    };

    const blob = await put(pathname, file, putOptions as Parameters<typeof put>[2]);

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
      { error: `Fotoğraf yüklenirken bir hata oluştu: ${message}` },
      { status: 500 }
    );
  }
}
