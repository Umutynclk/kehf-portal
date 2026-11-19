import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { verifyAdminRequest } from "@/lib/firebase/session";

function isAllowedPathname(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return pathname.startsWith("/images/") || pathname.includes("/images/");
  } catch {
    return url.startsWith("images/") || url.includes("images/");
  }
}

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

    const body = await request.json().catch(() => null);
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    // 2. URL presence check
    if (!url) {
      return NextResponse.json(
        { success: false, error: "Silinecek Blob URL belirtilmedi." },
        { status: 400 }
      );
    }

    // 3. Pathname safety check — prevent arbitrary blob deletion
    if (!isAllowedPathname(url)) {
      return NextResponse.json(
        { success: false, error: "Bu blob pathname'i silme yetkiniz yok." },
        { status: 403 }
      );
    }

    // 4. Delete from Vercel Blob
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

    const delOptions: Parameters<typeof del>[1] = {};
    if (blobToken) {
      (delOptions as Record<string, unknown>).token = blobToken;
    } else if (oidcToken && storeId) {
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
      {
        success: false,
        error: `Görsel Vercel Blob'dan silinemedi: ${message}`,
      },
      { status: 500 }
    );
  }
}
