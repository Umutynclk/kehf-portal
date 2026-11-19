import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/firebase/session";

export async function POST(request: NextRequest) {
  const admin = await verifyAdminRequest(request);
  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Yetkisiz erişim: admin girişi gerekli." },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error:
        "Yerel dosya yükleme devre dışı bırakıldı. Lütfen /api/blob/upload kullanın.",
    },
    { status: 410 }
  );
}
