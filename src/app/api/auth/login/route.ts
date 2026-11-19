import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  isAuthorizedAdminToken,
  getSessionCookieOptions,
  SESSION_EXPIRES_IN_MS,
  AdminSessionUser,
} from "@/lib/firebase/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const idToken = typeof body?.idToken === "string" ? body.idToken.trim() : "";

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "Firebase kimlik doğrulama token'ı gerekli." },
        { status: 400 }
      );
    }

    const adminAuth = getAdminAuth();

    // 1. Verify Firebase ID Token
    const decoded = await adminAuth.verifyIdToken(idToken, true);

    // 2. Enforce admin authorization (allowlist or custom claims)
    if (!isAuthorizedAdminToken(decoded)) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu hesabın admin paneline erişim yetkisi bulunmuyor.",
        },
        { status: 403 }
      );
    }

    // 3. Create HttpOnly Firebase Session Cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });

    const user: AdminSessionUser = {
      uid: decoded.uid,
      email: decoded.email || "",
      displayName: decoded.name || decoded.email?.split("@")[0] || "KEHF Admin",
      role: "admin",
    };

    const response = NextResponse.json({ success: true, user });
    const cookieOpts = getSessionCookieOptions();
    response.cookies.set(cookieOpts.name, sessionCookie, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });

    return response;
  } catch (err: unknown) {
    console.error("Admin login session error:", err);
    const code = (err as { code?: string })?.code;
    if (
      code === "auth/id-token-expired" ||
      code === "auth/id-token-revoked" ||
      code === "auth/argument-error"
    ) {
      return NextResponse.json(
        { success: false, error: "Geçersiz veya süresi dolmuş oturum bilgisi." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Oturum oluşturulamadı. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
