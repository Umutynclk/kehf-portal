import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/firebase/session";
import {
  fetchAllLogosFromFirestore,
  createLogoInFirestore,
  updateLogoInFirestore,
  deleteLogoInFirestore,
  reorderLogosInFirestore,
  seedLogosIfEmpty,
  isSafeUrl,
  normalizeUrl,
} from "@/lib/firebase/firestore-repo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logos = await fetchAllLogosFromFirestore();
    return NextResponse.json(
      { success: true, logos },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: unknown) {
    console.error("GET /api/logos error:", err);
    const msg =
      err instanceof Error ? err.message : "Logolar yüklenirken hata oluştu.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Strictly enforce server-side HttpOnly admin session
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
        { success: false, error: "Geçersiz istek gövdesi." },
        { status: 400 }
      );
    }

    const action = body.action;

    if (action === "create") {
      const data = body.data;
      if (!data || typeof data.title !== "string" || !data.title.trim()) {
        return NextResponse.json(
          { success: false, error: "Marka adı (title) zorunludur." },
          { status: 400 }
        );
      }
      if (typeof data.imageUrl !== "string" || !data.imageUrl.trim()) {
        return NextResponse.json(
          { success: false, error: "Logo görseli (imageUrl) zorunludur." },
          { status: 400 }
        );
      }
      const cleanTarget = normalizeUrl(data.targetUrl);
      if (cleanTarget && !isSafeUrl(cleanTarget)) {
        return NextResponse.json(
          { success: false, error: "Güvensiz hedef URL engellendi." },
          { status: 400 }
        );
      }

      const created = await createLogoInFirestore(data);
      const logos = await fetchAllLogosFromFirestore();
      return NextResponse.json({
        success: true,
        id: created.id,
        logo: created,
        logos,
      });
    }

    if (action === "update") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      const data = body.data;
      if (!id || !data || typeof data !== "object") {
        return NextResponse.json(
          { success: false, error: "Güncelleme için logo ID ve veri gereklidir." },
          { status: 400 }
        );
      }
      if (typeof data.targetUrl === "string") {
        const cleanTarget = normalizeUrl(data.targetUrl);
        if (cleanTarget && !isSafeUrl(cleanTarget)) {
          return NextResponse.json(
            { success: false, error: "Güvensiz hedef URL engellendi." },
            { status: 400 }
          );
        }
      }

      const logos = await updateLogoInFirestore(id, data);
      return NextResponse.json({ success: true, logos });
    }

    if (action === "delete") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) {
        return NextResponse.json(
          { success: false, error: "Silinecek logo ID belirtilmedi." },
          { status: 400 }
        );
      }
      const logos = await deleteLogoInFirestore(id);
      return NextResponse.json({ success: true, logos });
    }

    if (action === "reorder") {
      if (
        !Array.isArray(body.orderedIds) ||
        body.orderedIds.some((id: unknown) => typeof id !== "string" || !id.trim())
      ) {
        return NextResponse.json(
          { success: false, error: "Geçerli orderedIds dizisi gerekli." },
          { status: 400 }
        );
      }
      const logos = await reorderLogosInFirestore(body.orderedIds);
      return NextResponse.json({ success: true, logos });
    }

    if (action === "seed") {
      // Idempotent seed: never overwrites existing records
      const result = await seedLogosIfEmpty();
      const logos = await fetchAllLogosFromFirestore();
      return NextResponse.json({ success: true, ...result, logos });
    }

    return NextResponse.json(
      { success: false, error: "Geçersiz işlem türü." },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("POST /api/logos error:", err);
    const msg =
      err instanceof Error ? err.message : "Logo işlemi sırasında sunucu hatası.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
