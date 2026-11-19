#!/usr/bin/env node
/**
 * KEHF GROUP — Idempotent Firestore Seed, Backup & Restore Script
 *
 * Hedef Proje: kehf-d1b3a (sabit ve doğrulanır)
 *
 * Kullanım:
 *   node scripts/seed-firestore.mjs backup
 *   node scripts/seed-firestore.mjs seed
 *   node scripts/seed-firestore.mjs restore scripts/backups/<dosya>.json
 *
 * Kimlik Doğrulama (Servis hesabı anahtarı kaynak koda veya .env.local'e gömülmez):
 *   1. GOOGLE_APPLICATION_CREDENTIALS (geçerli yerel ADC veya servis hesabı JSON yolu)
 *   2. Yerel Application Default Credentials (~/.config/gcloud/application_default_credentials.json)
 *      Oluşturmak için: gcloud auth application-default login --project=kehf-d1b3a
 *   3. Üretim ortamında Firebase App Hosting / Cloud Run ADC otomatik kullanılır.
 */

import { existsSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = process.cwd();
const EXPECTED_PROJECT_ID = "kehf-d1b3a";
const LOGOS_FILE = path.join(ROOT, "src", "data", "logos.json");
const SETTINGS_FILE = path.join(ROOT, "src", "data", "settings.json");
const BACKUP_DIR = path.join(ROOT, "scripts", "backups");
const FIREBASERC_FILE = path.join(ROOT, ".firebaserc");

function normalizeUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  const mdMatch = trimmed.match(/^\[[^\]]*\]\(([^)]+)\)$/);
  return mdMatch && mdMatch[1] ? mdMatch[1].trim() : trimmed;
}

function isCloudManagedRuntime() {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.CLOUD_RUN_JOB ||
      process.env.FIREBASE_APP_HOSTING ||
      process.env.FUNCTION_TARGET
  );
}

function getDefaultLocalAdcPath() {
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

function verifyProjectSafety() {
  const envProject = process.env.FIREBASE_PROJECT_ID?.trim();
  if (envProject && envProject !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `Yanlış FIREBASE_PROJECT_ID ("${envProject}"). Bu betik yalnızca "${EXPECTED_PROJECT_ID}" projesinde çalışabilir.`
    );
  }

  if (existsSync(FIREBASERC_FILE)) {
    const rc = JSON.parse(readFileSync(FIREBASERC_FILE, "utf-8"));
    const defaultProj = rc?.projects?.default;
    if (defaultProj && defaultProj !== EXPECTED_PROJECT_ID) {
      throw new Error(
        `.firebaserc varsayılan projesi "${defaultProj}" olarak ayarlı. Beklenen proje: "${EXPECTED_PROJECT_ID}".`
      );
    }
  }
}

function resolveCredentials() {
  if (isCloudManagedRuntime()) {
    return;
  }

  const explicitPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (explicitPath) {
    if (!existsSync(explicitPath)) {
      throw new Error(
        `GOOGLE_APPLICATION_CREDENTIALS dosyası bulunamadı: ${explicitPath}`
      );
    }
    const parsed = JSON.parse(readFileSync(explicitPath, "utf-8"));
    if (
      parsed.type === "service_account" &&
      parsed.project_id &&
      parsed.project_id !== EXPECTED_PROJECT_ID
    ) {
      throw new Error(
        `GOOGLE_APPLICATION_CREDENTIALS farklı bir projeye ait ("${parsed.project_id}"). Beklenen proje: "${EXPECTED_PROJECT_ID}".`
      );
    }
    return;
  }

  const defaultAdcPath = getDefaultLocalAdcPath();
  if (existsSync(defaultAdcPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = defaultAdcPath;
    return;
  }

  throw new Error(
    `Yerel Application Default Credentials (ADC) bulunamadı (NO_ADC_FOUND).\n` +
      `Firebase CLI girişi tek başına ADC oluşturmaz. Lütfen şu komutu çalıştırın:\n` +
      `  gcloud auth application-default login --project=${EXPECTED_PROJECT_ID}\n` +
      `Ardından seed komutunu tekrar çalıştırın.`
  );
}

function initAdmin() {
  verifyProjectSafety();
  resolveCredentials();

  // Proje hedefini kesinlikle kehf-d1b3a olarak sabitle
  process.env.GOOGLE_CLOUD_PROJECT = EXPECTED_PROJECT_ID;
  process.env.GCLOUD_PROJECT = EXPECTED_PROJECT_ID;

  const app = initializeApp({
    credential: applicationDefault(),
    projectId: EXPECTED_PROJECT_ID,
  });

  if (app.options.projectId !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `Beklenmeyen Firebase proje kimliği: ${app.options.projectId}`
    );
  }

  console.log(`Hedef Firestore projesi doğrulandı: ${app.options.projectId}`);
  return app;
}

async function backupFirestore(db) {
  const [logosSnap, settingsSnap] = await Promise.all([
    db.collection("logos").orderBy("order", "asc").get(),
    db.collection("settings").doc("portal").get(),
  ]);

  const backupPayload = {
    exportedAt: new Date().toISOString(),
    projectId: EXPECTED_PROJECT_ID,
    logos: logosSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    settings: settingsSnap.exists ? settingsSnap.data() : null,
  };

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(BACKUP_DIR, `firestore-backup-${stamp}.json`);
  await fs.writeFile(outPath, JSON.stringify(backupPayload, null, 2), "utf-8");
  console.log(`Yedek alındı: ${outPath} (${backupPayload.logos.length} logo)`);
  return outPath;
}

async function seedFirestore(db) {
  // 1. Önce mevcut durumun yedeğini al
  await backupFirestore(db);

  // 2. Kaynak JSON dosyalarını oku
  const logosRaw = JSON.parse(await fs.readFile(LOGOS_FILE, "utf-8"));
  const settingsRaw = JSON.parse(await fs.readFile(SETTINGS_FILE, "utf-8"));
  const now = new Date().toISOString();

  // 3. Logoları idempotent olarak aktar (mevcut dokümanların üzerine YAZMA)
  let logosCreated = 0;
  let logosSkipped = 0;

  for (let i = 0; i < logosRaw.length; i++) {
    const item = logosRaw[i];
    const id = item.id || `logo_${i + 1}`;
    const docRef = db.collection("logos").doc(id);
    const snap = await docRef.get();

    if (snap.exists) {
      logosSkipped++;
      continue;
    }

    const cleanTargetUrl = normalizeUrl(item.targetUrl);
    await docRef.set({
      id,
      title: item.title,
      subtitle: item.subtitle || "",
      imageUrl: item.imageUrl,
      targetUrl: cleanTargetUrl,
      displayUrl:
        item.displayUrl ||
        cleanTargetUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      targetType: item.targetType === "internal" ? "internal" : "external",
      openInNewTab: item.openInNewTab !== false,
      order: typeof item.order === "number" ? item.order : i,
      isFeatured: Boolean(item.isFeatured),
      active: item.active !== false,
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now,
    });
    logosCreated++;
  }

  // 4. Portal ayarlarını idempotent olarak aktar
  const settingsRef = db.collection("settings").doc("portal");
  const settingsSnap = await settingsRef.get();
  let settingsStatus = "atlandı (zaten mevcut)";

  if (!settingsSnap.exists) {
    await settingsRef.set({
      ...settingsRaw,
      backgroundImageUrl: normalizeUrl(settingsRaw.backgroundImageUrl || ""),
      updatedAt: settingsRaw.updatedAt || now,
    });
    settingsStatus = "oluşturuldu";
  }

  console.log(
    `Seed tamamlandı -> Logolar: ${logosCreated} eklendi, ${logosSkipped} mevcut korundu. Portal ayarları: ${settingsStatus}.`
  );
}

async function restoreFirestore(db, backupFile) {
  if (!backupFile) {
    throw new Error("Geri yükleme için yedek dosya yolu belirtin.");
  }
  const data = JSON.parse(await fs.readFile(backupFile, "utf-8"));
  if (data.projectId && data.projectId !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `Yedek dosyası farklı bir projeye ait ("${data.projectId}"). Beklenen: "${EXPECTED_PROJECT_ID}".`
    );
  }
  const batch = db.batch();

  if (Array.isArray(data.logos)) {
    for (const logo of data.logos) {
      if (!logo.id) continue;
      batch.set(db.collection("logos").doc(logo.id), logo);
    }
  }
  if (data.settings) {
    batch.set(db.collection("settings").doc("portal"), data.settings);
  }

  await batch.commit();
  console.log(`Geri yükleme tamamlandı: ${backupFile}`);
}

async function main() {
  const cmd = process.argv[2] || "seed";
  initAdmin();
  const db = getFirestore();

  if (cmd === "backup") {
    await backupFirestore(db);
  } else if (cmd === "seed") {
    await seedFirestore(db);
  } else if (cmd === "restore") {
    await restoreFirestore(db, process.argv[3]);
  } else {
    console.error("Geçersiz komut. Kullanım: backup | seed | restore <dosya>");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Hata:", err.message || err);
  process.exit(1);
});
