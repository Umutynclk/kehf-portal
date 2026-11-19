import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/firebase/session";
import {
  fetchPortalSettingsFromFirestore,
  updatePortalSettingsInFirestore,
  isSafeUrl,
  normalizeUrl,
} from "@/lib/firebase/firestore-repo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await fetchPortalSettingsFromFirestore();
    return NextResponse.json(
      { success: true, settings },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: unknown) {
    console.error("GET /api/portal-settings error:", err);
    const msg =
      err instanceof Error
        ? err.message
        : "Portal ayarları yüklenirken hata oluştu.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdminRequest(request);
  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Yetkisiz erişim: admin girişi gerekli." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Geçersiz ayar verisi." },
        { status: 400 }
      );
    }

    if (typeof body.backgroundImageUrl === "string") {
      const cleanBg = normalizeUrl(body.backgroundImageUrl);
      if (cleanBg && !isSafeUrl(cleanBg)) {
        return NextResponse.json(
          { success: false, error: "Güvensiz arka plan görsel URL'i." },
          { status: 400 }
        );
      }
    }

    const settings = await updatePortalSettingsInFirestore(body);
    return NextResponse.json({ success: true, settings });
  } catch (err: unknown) {
    console.error("POST /api/portal-settings error:", err);
    const msg =
      err instanceof Error ? err.message : "Ayarlar kaydedilirken hata oluştu.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
