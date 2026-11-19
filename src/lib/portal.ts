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

export const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
  siteTitle: "Premium Logo Portal",
  siteDescription: "Markalarımız ve iş ortaklarımız",
  backgroundType: "gradient",
  backgroundImageUrl: "",
  backgroundOverlay: 0.5,
  layout: "grid",
  animationIntensity: "medium",
  updatedAt: null,
};

const SETTINGS_EVENT = "kehf_settings_updated";

function emitSettingsUpdated(settings: PortalSettings): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PortalSettings>(SETTINGS_EVENT, { detail: settings })
  );
}

// ── Read ───────────────────────────────────────────────

/** Fetch portal settings from server (Firestore). */
export async function getPortalSettings(): Promise<PortalSettings> {
  const res = await fetch("/api/portal-settings", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.settings) {
    throw new Error(data.error || "Portal ayarları yüklenemedi.");
  }
  return data.settings as PortalSettings;
}

/** Listener for portal settings. Fetches fresh from Firestore and reacts to updates. */
export function subscribeToPortalSettings(
  callback: (settings: PortalSettings) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let active = true;

  getPortalSettings()
    .then((settings) => {
      if (active) callback(settings);
    })
    .catch((err) => {
      console.warn("Portal ayarları sunucudan alınamadı:", err);
      if (active) callback(DEFAULT_PORTAL_SETTINGS);
    });

  const handleUpdate = (e: Event) => {
    const custom = e as CustomEvent<PortalSettings>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      getPortalSettings()
        .then((settings) => {
          if (active) callback(settings);
        })
        .catch(() => {});
    }
  };

  window.addEventListener(SETTINGS_EVENT, handleUpdate);

  return () => {
    active = false;
    window.removeEventListener(SETTINGS_EVENT, handleUpdate);
  };
}

// ── Write (Protected by server HttpOnly Admin Session) ─

/** Update portal settings in Firestore (merge). */
export async function updatePortalSettings(
  data: Partial<Omit<PortalSettings, "updatedAt">>
): Promise<PortalSettings> {
  const res = await fetch("/api/portal-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success || !json.settings) {
    throw new Error(json.error || "Portal ayarları kaydedilemedi.");
  }

  emitSettingsUpdated(json.settings as PortalSettings);
  return json.settings as PortalSettings;
}
