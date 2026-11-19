import { getAdminDb } from "./admin";
import type { Logo, LogoInput } from "@/lib/logos";
import type { PortalSettings } from "@/lib/portal";
import initialLogosJson from "@/data/logos.json";
import initialSettingsJson from "@/data/settings.json";

export const LOGOS_COLLECTION = "logos";
export const SETTINGS_COLLECTION = "settings";
export const PORTAL_SETTINGS_DOC_ID = "portal";

/**
 * Converts Markdown links like [text](https://example.com) to plain URLs
 * and trims whitespace.
 */
export function normalizeUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  const mdMatch = trimmed.match(/^\[[^\]]*\]\(([^)]+)\)$/);
  if (mdMatch && mdMatch[1]) {
    return mdMatch[1].trim();
  }
  return trimmed;
}

const DANGEROUS_PROTOCOLS = ["javascript:", "data:", "vbscript:"];

export function isSafeUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return !DANGEROUS_PROTOCOLS.some((proto) => lower.startsWith(proto));
}

export function getInitialLogosSeed(): Logo[] {
  return (initialLogosJson as Logo[]).map((item, idx) => ({
    ...item,
    id: item.id || `logo_${idx + 1}`,
    targetUrl: normalizeUrl(item.targetUrl),
    displayUrl:
      item.displayUrl ||
      normalizeUrl(item.targetUrl)
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, ""),
    order: typeof item.order === "number" ? item.order : idx,
  }));
}

export function getInitialSettingsSeed(): PortalSettings {
  const raw = initialSettingsJson as PortalSettings;
  return {
    siteTitle: raw.siteTitle || "Premium Logo Portal",
    siteDescription: raw.siteDescription || "Markalarımız ve iş ortaklarımız",
    backgroundType: raw.backgroundType || "gradient",
    backgroundImageUrl: normalizeUrl(raw.backgroundImageUrl || ""),
    backgroundOverlay:
      typeof raw.backgroundOverlay === "number" ? raw.backgroundOverlay : 0.5,
    layout: raw.layout || "grid",
    animationIntensity: raw.animationIntensity || "medium",
    updatedAt: raw.updatedAt || null,
  };
}

/**
 * Idempotent seed for logos collection.
 * Does NOT overwrite existing documents in Firestore.
 */
export async function seedLogosIfEmpty(): Promise<{
  seeded: number;
  skipped: number;
}> {
  const db = getAdminDb();
  const colRef = db.collection(LOGOS_COLLECTION);
  const existingSnap = await colRef.limit(1).get();

  if (!existingSnap.empty) {
    return { seeded: 0, skipped: 1 };
  }

  const seedItems = getInitialLogosSeed();
  const now = new Date().toISOString();
  const batch = db.batch();
  let seeded = 0;

  for (const item of seedItems) {
    const docRef = colRef.doc(item.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      batch.set(docRef, {
        ...item,
        createdAt: item.createdAt || now,
        updatedAt: item.updatedAt || now,
      });
      seeded++;
    }
  }

  if (seeded > 0) {
    await batch.commit();
  }

  return { seeded, skipped: seedItems.length - seeded };
}

/**
 * Idempotent seed for settings/portal document.
 * Does NOT overwrite if document already exists.
 */
export async function seedSettingsIfEmpty(): Promise<{ seeded: boolean }> {
  const db = getAdminDb();
  const docRef = db
    .collection(SETTINGS_COLLECTION)
    .doc(PORTAL_SETTINGS_DOC_ID);
  const snap = await docRef.get();

  if (snap.exists) {
    return { seeded: false };
  }

  const defaults = getInitialSettingsSeed();
  await docRef.set({
    ...defaults,
    updatedAt: defaults.updatedAt || new Date().toISOString(),
  });
  return { seeded: true };
}

// ── Logos CRUD ─────────────────────────────────────────

export async function fetchAllLogosFromFirestore(): Promise<Logo[]> {
  const db = getAdminDb();
  const colRef = db.collection(LOGOS_COLLECTION);
  let snap = await colRef.orderBy("order", "asc").get();

  // Auto-seed once if collection is completely empty
  if (snap.empty) {
    await seedLogosIfEmpty();
    snap = await colRef.orderBy("order", "asc").get();
  }

  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: String(d.title || ""),
      subtitle: String(d.subtitle || ""),
      imageUrl: String(d.imageUrl || ""),
      targetUrl: normalizeUrl(d.targetUrl),
      displayUrl: String(d.displayUrl || ""),
      targetType: d.targetType === "internal" ? "internal" : "external",
      openInNewTab: d.openInNewTab !== false,
      order: typeof d.order === "number" ? d.order : 0,
      isFeatured: Boolean(d.isFeatured),
      active: d.active !== false,
      createdAt: d.createdAt || null,
      updatedAt: d.updatedAt || null,
    };
  });
}

export async function createLogoInFirestore(data: LogoInput): Promise<Logo> {
  const db = getAdminDb();
  const colRef = db.collection(LOGOS_COLLECTION);
  const now = new Date().toISOString();
  const newId = `logo_${Date.now()}`;

  const cleanTargetUrl = normalizeUrl(data.targetUrl);
  const newLogo: Logo = {
    id: newId,
    title: data.title.trim(),
    subtitle: (data.subtitle || "").trim(),
    imageUrl: data.imageUrl.trim(),
    targetUrl: cleanTargetUrl,
    displayUrl:
      (data.displayUrl || "").trim() ||
      cleanTargetUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    targetType: data.targetType === "internal" ? "internal" : "external",
    openInNewTab: data.openInNewTab !== false,
    order: typeof data.order === "number" ? data.order : 0,
    isFeatured: Boolean(data.isFeatured),
    active: data.active !== false,
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();

  // If this logo is marked featured, unset isFeatured on all others
  if (newLogo.isFeatured) {
    const featuredSnap = await colRef.where("isFeatured", "==", true).get();
    featuredSnap.docs.forEach((doc) => {
      batch.update(doc.ref, { isFeatured: false, updatedAt: now });
    });
  }

  batch.set(colRef.doc(newId), newLogo);
  await batch.commit();

  return newLogo;
}

export async function updateLogoInFirestore(
  id: string,
  data: Partial<LogoInput>
): Promise<Logo[]> {
  const db = getAdminDb();
  const colRef = db.collection(LOGOS_COLLECTION);
  const docRef = colRef.doc(id);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new Error(`Logo bulunamadı: ${id}`);
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = { updatedAt: now };

  if (typeof data.title === "string") updatePayload.title = data.title.trim();
  if (typeof data.subtitle === "string")
    updatePayload.subtitle = data.subtitle.trim();
  if (typeof data.imageUrl === "string")
    updatePayload.imageUrl = data.imageUrl.trim();
  if (typeof data.targetUrl === "string")
    updatePayload.targetUrl = normalizeUrl(data.targetUrl);
  if (typeof data.displayUrl === "string")
    updatePayload.displayUrl = data.displayUrl.trim();
  if (data.targetType === "internal" || data.targetType === "external")
    updatePayload.targetType = data.targetType;
  if (typeof data.openInNewTab === "boolean")
    updatePayload.openInNewTab = data.openInNewTab;
  if (typeof data.order === "number") updatePayload.order = data.order;
  if (typeof data.isFeatured === "boolean")
    updatePayload.isFeatured = data.isFeatured;
  if (typeof data.active === "boolean") updatePayload.active = data.active;

  const batch = db.batch();

  if (data.isFeatured === true) {
    const featuredSnap = await colRef.where("isFeatured", "==", true).get();
    featuredSnap.docs.forEach((doc) => {
      if (doc.id !== id) {
        batch.update(doc.ref, { isFeatured: false, updatedAt: now });
      }
    });
  }

  batch.update(docRef, updatePayload);
  await batch.commit();

  return fetchAllLogosFromFirestore();
}

export async function deleteLogoInFirestore(id: string): Promise<Logo[]> {
  const db = getAdminDb();
  const docRef = db.collection(LOGOS_COLLECTION).doc(id);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error(`Silinecek logo bulunamadı: ${id}`);
  }
  await docRef.delete();
  return fetchAllLogosFromFirestore();
}

export async function reorderLogosInFirestore(
  orderedIds: string[]
): Promise<Logo[]> {
  const db = getAdminDb();
  const colRef = db.collection(LOGOS_COLLECTION);
  const now = new Date().toISOString();
  const batch = db.batch();

  orderedIds.forEach((id, index) => {
    batch.update(colRef.doc(id), { order: index, updatedAt: now });
  });

  await batch.commit();
  return fetchAllLogosFromFirestore();
}

// ── Portal Settings CRUD ───────────────────────────────

export async function fetchPortalSettingsFromFirestore(): Promise<PortalSettings> {
  const db = getAdminDb();
  const docRef = db
    .collection(SETTINGS_COLLECTION)
    .doc(PORTAL_SETTINGS_DOC_ID);
  let snap = await docRef.get();

  if (!snap.exists) {
    await seedSettingsIfEmpty();
    snap = await docRef.get();
  }

  const defaults = getInitialSettingsSeed();
  const data = snap.data() || {};

  return {
    siteTitle:
      typeof data.siteTitle === "string" ? data.siteTitle : defaults.siteTitle,
    siteDescription:
      typeof data.siteDescription === "string"
        ? data.siteDescription
        : defaults.siteDescription,
    backgroundType:
      data.backgroundType === "image" ||
      data.backgroundType === "gradient" ||
      data.backgroundType === "solid"
        ? data.backgroundType
        : defaults.backgroundType,
    backgroundImageUrl:
      typeof data.backgroundImageUrl === "string"
        ? normalizeUrl(data.backgroundImageUrl)
        : defaults.backgroundImageUrl,
    backgroundOverlay:
      typeof data.backgroundOverlay === "number"
        ? Math.min(1, Math.max(0, data.backgroundOverlay))
        : defaults.backgroundOverlay,
    layout:
      data.layout === "grid" ||
      data.layout === "flex" ||
      data.layout === "masonry"
        ? data.layout
        : defaults.layout,
    animationIntensity:
      data.animationIntensity === "none" ||
      data.animationIntensity === "low" ||
      data.animationIntensity === "medium" ||
      data.animationIntensity === "high"
        ? data.animationIntensity
        : defaults.animationIntensity,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
  };
}

export async function updatePortalSettingsInFirestore(
  data: Partial<Omit<PortalSettings, "updatedAt">>
): Promise<PortalSettings> {
  const db = getAdminDb();
  const docRef = db
    .collection(SETTINGS_COLLECTION)
    .doc(PORTAL_SETTINGS_DOC_ID);

  const current = await fetchPortalSettingsFromFirestore();
  const updated: PortalSettings = {
    siteTitle:
      typeof data.siteTitle === "string"
        ? data.siteTitle.trim()
        : current.siteTitle,
    siteDescription:
      typeof data.siteDescription === "string"
        ? data.siteDescription.trim()
        : current.siteDescription,
    backgroundType:
      data.backgroundType === "image" ||
      data.backgroundType === "gradient" ||
      data.backgroundType === "solid"
        ? data.backgroundType
        : current.backgroundType,
    backgroundImageUrl:
      typeof data.backgroundImageUrl === "string"
        ? normalizeUrl(data.backgroundImageUrl)
        : current.backgroundImageUrl,
    backgroundOverlay:
      typeof data.backgroundOverlay === "number"
        ? Math.min(1, Math.max(0, data.backgroundOverlay))
        : current.backgroundOverlay,
    layout:
      data.layout === "grid" ||
      data.layout === "flex" ||
      data.layout === "masonry"
        ? data.layout
        : current.layout,
    animationIntensity:
      data.animationIntensity === "none" ||
      data.animationIntensity === "low" ||
      data.animationIntensity === "medium" ||
      data.animationIntensity === "high"
        ? data.animationIntensity
        : current.animationIntensity,
    updatedAt: new Date().toISOString(),
  };

  await docRef.set(updated, { merge: true });
  return updated;
}
