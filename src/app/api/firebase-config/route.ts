import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EXPECTED_PROJECT_ID = "kehf-d1b3a";

interface PublicFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function getRuntimePublicFirebaseConfig(): PublicFirebaseConfig | null {
  let apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
  let authDomain =
    (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim() ||
    "kehf-d1b3a.firebaseapp.com";
  let projectId =
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim() ||
    EXPECTED_PROJECT_ID;
  let storageBucket =
    (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "").trim() ||
    "kehf-d1b3a.firebasestorage.app";
  let messagingSenderId =
    (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "").trim() ||
    "239126156142";
  let appId =
    (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim() ||
    "1:239126156142:web:947f70dbe251bcf824a77f";

  // Fallback to FIREBASE_WEBAPP_CONFIG injected by Firebase App Hosting (strictly kehf-d1b3a)
  if (!apiKey && process.env.FIREBASE_WEBAPP_CONFIG) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG) as Partial<PublicFirebaseConfig>;
      if (parsed.projectId === EXPECTED_PROJECT_ID && parsed.apiKey) {
        apiKey = parsed.apiKey.trim();
        authDomain = parsed.authDomain?.trim() || authDomain;
        projectId = parsed.projectId;
        storageBucket = parsed.storageBucket?.trim() || storageBucket;
        messagingSenderId = parsed.messagingSenderId?.trim() || messagingSenderId;
        appId = parsed.appId?.trim() || appId;
      }
    } catch {
      // Ignore malformed JSON
    }
  }

  if (!apiKey || projectId !== EXPECTED_PROJECT_ID) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

export async function GET() {
  const config = getRuntimePublicFirebaseConfig();

  if (!config) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Firebase istemci yapılandırması eksik: NEXT_PUBLIC_FIREBASE_API_KEY tanımlanmamış.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { success: true, config },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
