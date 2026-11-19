import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  initializeApp,
  getApps,
  getApp,
  applicationDefault,
  App,
} from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

export const EXPECTED_FIREBASE_PROJECT_ID = "kehf-d1b3a";

let adminAppInstance: App | null = null;

function isCloudManagedRuntime(): boolean {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.CLOUD_RUN_JOB ||
      process.env.FIREBASE_APP_HOSTING ||
      process.env.FUNCTION_TARGET
  );
}

function getDefaultLocalAdcPath(): string {
  if (process.platform === "win32" && process.env.APPDATA) {
    return path.join(
      process.env.APPDATA,
      "gcloud",
      "application_default_credentials.json"
    );
  }
  return path.join(
    os.homedir(),
    ".config",
    "gcloud",
    "application_default_credentials.json"
  );
}

/**
 * Ensures we strictly target `kehf-d1b3a` and never accidentally write to another project.
 */
function assertTargetProject(): void {
  const configuredProject = process.env.FIREBASE_PROJECT_ID?.trim();
  if (configuredProject && configuredProject !== EXPECTED_FIREBASE_PROJECT_ID) {
    throw new Error(
      `Yanlış Firebase projesi tespit edildi ("${configuredProject}"). Bu proje yalnızca "${EXPECTED_FIREBASE_PROJECT_ID}" ile çalışabilir.`
    );
  }
}

/**
 * Validates local credential file (if present via GOOGLE_APPLICATION_CREDENTIALS or gcloud ADC)
 * without embedding any service account private key in source code or .env.local.
 */
function resolveLocalAdc(): void {
  if (isCloudManagedRuntime()) {
    // Firebase App Hosting / Cloud Run uses managed ADC automatically.
    return;
  }

  const explicitCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (explicitCredPath) {
    if (!existsSync(explicitCredPath)) {
      throw new Error(
        `GOOGLE_APPLICATION_CREDENTIALS dosyası bulunamadı: ${explicitCredPath}`
      );
    }
    try {
      const raw = JSON.parse(readFileSync(explicitCredPath, "utf-8")) as {
        type?: string;
        project_id?: string;
      };
      if (
        raw.type === "service_account" &&
        raw.project_id &&
        raw.project_id !== EXPECTED_FIREBASE_PROJECT_ID
      ) {
        throw new Error(
          `GOOGLE_APPLICATION_CREDENTIALS farklı bir projeye ait ("${raw.project_id}"). Beklenen proje: "${EXPECTED_FIREBASE_PROJECT_ID}".`
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("farklı bir projeye")) {
        throw err;
      }
      throw new Error(
        `GOOGLE_APPLICATION_CREDENTIALS geçerli bir JSON dosyası değil: ${explicitCredPath}`
      );
    }
    return;
  }

  // Fallback to standard local Application Default Credentials created via gcloud / Firebase CLI
  const defaultAdcPath = getDefaultLocalAdcPath();
  if (existsSync(defaultAdcPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = defaultAdcPath;
    return;
  }

  throw new Error(
    `Yerel Application Default Credentials (ADC) bulunamadı. Lütfen şu komutu çalıştırın:\n` +
      `gcloud auth application-default login --project=${EXPECTED_FIREBASE_PROJECT_ID}`
  );
}

function initAdminApp(): App {
  assertTargetProject();

  if (adminAppInstance) return adminAppInstance;
  if (getApps().length > 0) {
    const existing = getApp();
    const existingProjectId = existing.options.projectId;
    if (existingProjectId && existingProjectId !== EXPECTED_FIREBASE_PROJECT_ID) {
      throw new Error(
        `Mevcut Firebase Admin örneği farklı bir projeye bağlı ("${existingProjectId}"). Beklenen: "${EXPECTED_FIREBASE_PROJECT_ID}".`
      );
    }
    adminAppInstance = existing;
    return adminAppInstance;
  }

  resolveLocalAdc();

  // Pin project environment strictly to kehf-d1b3a for ADC requests
  process.env.GOOGLE_CLOUD_PROJECT = EXPECTED_FIREBASE_PROJECT_ID;
  process.env.GCLOUD_PROJECT = EXPECTED_FIREBASE_PROJECT_ID;

  adminAppInstance = initializeApp({
    credential: applicationDefault(),
    projectId: EXPECTED_FIREBASE_PROJECT_ID,
  });

  return adminAppInstance;
}

export function getAdminAuth(): Auth {
  return getAuth(initAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(initAdminApp());
}
