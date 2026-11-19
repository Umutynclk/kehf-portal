import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  ensureFirebaseAuth,
  getFirebaseAuth,
  isFirebaseClientConfigured,
} from "./firebase/client";

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: "admin";
}

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "E-posta veya şifre hatalı.";
    case "auth/invalid-email":
      return "Geçerli bir e-posta adresi girin.";
    case "auth/too-many-requests":
      return "Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.";
    case "auth/user-disabled":
      return "Bu hesap devre dışı bırakılmış.";
    case "auth/network-request-failed":
      return "Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.";
    default:
      if (err instanceof Error && err.message) {
        return err.message;
      }
      return "Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.";
  }
}

/**
 * Authenticate admin via Firebase Authentication Email/Password,
 * exchange ID token for a server-verified HttpOnly session cookie.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AdminUser> {
  const trimmedEmail = (email || "").trim();
  if (!trimmedEmail || !password) {
    throw new Error("E-posta ve şifre zorunludur.");
  }

  const auth = await ensureFirebaseAuth();

  let idToken: string;
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      trimmedEmail,
      password
    );
    idToken = await credential.user.getIdToken(true);
  } catch (err) {
    throw new Error(mapFirebaseAuthError(err));
  }

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success || !data.user) {
    // Ensure client auth is signed out if server rejected admin access
    await firebaseSignOut(auth).catch(() => {});
    throw new Error(
      data.error || "Bu hesabın admin paneline erişim yetkisi yok."
    );
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-changed"));
  }

  return data.user as AdminUser;
}

/**
 * Fetch current authenticated admin session from server (HttpOnly cookie).
 */
export async function fetchAdminSession(): Promise<AdminUser | null> {
  if (typeof window === "undefined") return null;

  try {
    const res = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.authenticated && data.user) {
      return data.user as AdminUser;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sign out: clear server HttpOnly session cookie, revoke tokens, and sign out Firebase client.
 */
export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore network error during logout cleanup
  }

  try {
    if (isFirebaseClientConfigured()) {
      await firebaseSignOut(getFirebaseAuth());
    }
  } catch {
    // Ignore client signOut errors
  }

  if (typeof window !== "undefined") {
    // Clean up any legacy localStorage keys from previous versions
    try {
      localStorage.removeItem("kehf_admin_session");
      localStorage.removeItem("kehf_admin_token");
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event("auth-changed"));
  }
}
