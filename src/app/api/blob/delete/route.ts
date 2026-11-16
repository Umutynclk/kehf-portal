import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { verifyAdminToken } from "@/lib/auth";

// ── Helper to extract and verify admin token from request ────────
function checkAdminAuth(request: NextRequest, bodyToken?: string | null): boolean {
  // 1. From body
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

// ── Only allow deletion of blobs under images/ prefix ─────────────
function isAllowedPathname(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return pathname.startsWith("/images/") || pathname.includes("/images/");
  } catch {
    return url.startsWith("images/") || url.includes("images/");
  }
}

// ── POST /api/blob/delete ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, adminToken } = body as { url?: string; adminToken?: string };

    // 1. Admin auth check
    const isAuthorized = checkAdminAuth(request, adminToken);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Yetkisiz erişim: admin kimlik doğrulaması gerekli." },
        { status: 401 }
      );
    }

    // 2. URL presence check
    if (!url) {
      return NextResponse.json(
        { error: "Silinecek Blob URL belirtilmedi." },
        { status: 400 }
      );
    }

    // 3. Pathname safety check — prevent arbitrary blob deletion
    if (!isAllowedPathname(url)) {
      return NextResponse.json(
        { error: "Bu blob pathname'i silme yetkiniz yok." },
        { status: 403 }
      );
    }

    // 4. Delete from Vercel Blob
    const oidcToken = process.env.VERCEL_OIDC_TOKEN;
    const storeId = process.env.BLOB_STORE_ID;

    const delOptions: Parameters<typeof del>[1] = {};

    if (oidcToken && storeId) {
      (delOptions as Record<string, unknown>).token = oidcToken;
      (delOptions as Record<string, unknown>).storeId = storeId;
    }

    await del(url, delOptions);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Blob delete error:", error);
    return NextResponse.json(
      { error: `Fotoğraf silinirken bir hata oluştu: ${message}` },
      { status: 500 }
    );
  }
}
