import {
  initializeApp,
  getApps,
  getApp,
  FirebaseApp,
  FirebaseOptions,
} from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const EXPECTED_PROJECT_ID = "kehf-d1b3a";

const buildTimeConfig: FirebaseOptions = {
  apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim(),
  authDomain:
    (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim() ||
    "kehf-d1b3a.firebaseapp.com",
  projectId:
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim() ||
    EXPECTED_PROJECT_ID,
  storageBucket:
    (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "").trim() ||
    "kehf-d1b3a.firebasestorage.app",
  messagingSenderId:
    (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "").trim() ||
    "239126156142",
  appId:
    (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim() ||
    "1:239126156142:web:947f70dbe251bcf824a77f",
};

let cachedApp: FirebaseApp | null = null;
let runtimeConfigPromise: Promise<FirebaseOptions> | null = null;

export function isFirebaseClientConfigured(): boolean {
  if (cachedApp || getApps().length > 0) return true;
  return Boolean(
    buildTimeConfig.apiKey && buildTimeConfig.projectId === EXPECTED_PROJECT_ID
  );
}

function initWithConfig(config: FirebaseOptions): FirebaseApp {
  if (cachedApp) return cachedApp;
  if (getApps().length > 0) {
    cachedApp = getApp();
    return cachedApp;
  }
  if (!config.apiKey) {
    throw new Error(
      "Firebase istemci yapılandırması eksik: NEXT_PUBLIC_FIREBASE_API_KEY tanımlanmamış."
    );
  }
  if (config.projectId !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `Geçersiz Firebase proje yapılandırması ("${config.projectId}"). Beklenen: "${EXPECTED_PROJECT_ID}".`
    );
  }
  cachedApp = initializeApp(config);
  return cachedApp;
}

export function getFirebaseApp(): FirebaseApp {
  return initWithConfig(buildTimeConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

/**
 * Ensures Firebase Auth is initialized.
 * 1. Uses build-time NEXT_PUBLIC_FIREBASE_API_KEY immediately when available.
 * 2. Falls back to runtime /api/firebase-config (public web config only) if needed.
 */
export async function ensureFirebaseAuth(): Promise<Auth> {
  if (isFirebaseClientConfigured()) {
    return getAuth(initWithConfig(buildTimeConfig));
  }

  if (typeof window === "undefined") {
    throw new Error(
      "Firebase istemci yapılandırması eksik: NEXT_PUBLIC_FIREBASE_API_KEY tanımlanmamış."
    );
  }

  if (!runtimeConfigPromise) {
    runtimeConfigPromise = fetch("/api/firebase-config", {
      method: "GET",
      cache: "no-store",
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success || !data.config?.apiKey) {
          throw new Error(
            data.error ||
              "Firebase istemci yapılandırması eksik: NEXT_PUBLIC_FIREBASE_API_KEY tanımlanmamış."
          );
        }
        return data.config as FirebaseOptions;
      })
      .catch((err) => {
        // Reset promise so subsequent retries can succeed once configured
        runtimeConfigPromise = null;
        throw err;
      });
  }

  const runtimeConfig = await runtimeConfigPromise;
  return getAuth(initWithConfig(runtimeConfig));
}
