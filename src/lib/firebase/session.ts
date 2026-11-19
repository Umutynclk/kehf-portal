import { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "./admin";

export const SESSION_COOKIE_NAME = "kehf_admin_session";
export const SESSION_EXPIRES_IN_MS = 5 * 24 * 60 * 60 * 1000; // 5 gün
export const SESSION_EXPIRES_IN_SEC = Math.floor(SESSION_EXPIRES_IN_MS / 1000);

export interface AdminSessionUser {
  uid: string;
  email: string;
  displayName: string;
  role: "admin";
}

/**
 * Parse allowed admin emails from server-only ADMIN_EMAILS env var.
 * Example: ADMIN_EMAILS="admin@kehf.com,volkan@kehf.com"
 */
export function getAllowedAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks whether a decoded Firebase token belongs to an authorized admin.
 * Requires either Firebase Custom Claims (admin: true or role: "admin")
 * OR an email explicitly listed in server-side ADMIN_EMAILS allowlist.
 */
export function isAuthorizedAdminToken(decoded: DecodedIdToken): boolean {
  // 1. Custom claims check
  if (decoded.admin === true || decoded.role === "admin") {
    return true;
  }

  // 2. Server-side email allowlist check
  const email = (decoded.email || "").trim().toLowerCase();
  if (!email) return false;

  const allowedEmails = getAllowedAdminEmails();
  if (allowedEmails.length === 0) {
    return false;
  }

  return allowedEmails.includes(email);
}

/**
 * Verify HttpOnly session cookie from an incoming API request.
 * Returns the authenticated AdminSessionUser or null if unauthorized.
 */
export async function verifyAdminRequest(
  request: NextRequest
): Promise<AdminSessionUser | null> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const adminAuth = getAdminAuth();
    // checkRevoked = true ensures revoked sessions are immediately rejected
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    if (!isAuthorizedAdminToken(decoded)) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: decoded.email || "",
      displayName: decoded.name || decoded.email?.split("@")[0] || "KEHF Admin",
      role: "admin",
    };
  } catch {
    return null;
  }
}

/**
 * Helper to build standardized session cookie options.
 */
export function getSessionCookieOptions(maxAge = SESSION_EXPIRES_IN_SEC) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
