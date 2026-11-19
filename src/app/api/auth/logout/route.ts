import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/lib/firebase/session";

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionCookie) {
    try {
      const adminAuth = getAdminAuth();
      const decoded = await adminAuth.verifySessionCookie(sessionCookie);
      // Revoke refresh tokens so the session cannot be reused
      await adminAuth.revokeRefreshTokens(decoded.sub);
    } catch {
      // Cookie might already be expired or invalid; still clear it
    }
  }

  const response = NextResponse.json({ success: true });
  const cookieOpts = getSessionCookieOptions(0);
  response.cookies.set(cookieOpts.name, "", {
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    path: cookieOpts.path,
    maxAge: 0,
  });

  return response;
}
