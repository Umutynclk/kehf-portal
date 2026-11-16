// ── Types ──────────────────────────────────────────────

export interface PortalSettings {
  siteTitle: string;
  siteDescription: string;
  backgroundType: "image" | "gradient" | "solid";
  backgroundImageUrl: string;
  backgroundOverlay: number; // 0 – 1
  layout: "grid" | "flex" | "masonry";
  animationIntensity: "none" | "low" | "medium" | "high";
  updatedAt: string | null;
}

const DEFAULTS: PortalSettings = {
  siteTitle: "Premium Logo Portal",
  siteDescription: "Markalarımız ve iş ortaklarımız",
  backgroundType: "gradient",
  backgroundImageUrl: "",
  backgroundOverlay: 0.5,
  layout: "grid",
  animationIntensity: "medium",
  updatedAt: null,
};

const LOCAL_STORAGE_KEY = "kehf_portal_settings_v3";
const SETTINGS_EVENT = "kehf_settings_updated";

function getStoredSettings(): PortalSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Portal settings parse error:", e);
  }
  return DEFAULTS;
}

function setStoredSettings(settings: PortalSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
  } catch (e) {
    console.warn("Portal settings write error:", e);
  }
}

// ── Read ───────────────────────────────────────────────

/** Fetch portal settings (one-time read). */
export async function getPortalSettings(): Promise<PortalSettings> {
  return getStoredSettings();
}

/** Realtime listener for portal settings. Returns unsubscribe fn. */
export function subscribeToPortalSettings(
  callback: (settings: PortalSettings) => void
): () => void {
  const update = () => callback(getStoredSettings());
  update();

  if (typeof window === "undefined") return () => {};

  const handleUpdate = () => update();
  window.addEventListener(SETTINGS_EVENT, handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener(SETTINGS_EVENT, handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

// ── Write ──────────────────────────────────────────────

/** Update portal settings (merge). */
export async function updatePortalSettings(
  data: Partial<Omit<PortalSettings, "updatedAt">>
): Promise<void> {
  const current = getStoredSettings();
  const updated: PortalSettings = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  setStoredSettings(updated);
}
