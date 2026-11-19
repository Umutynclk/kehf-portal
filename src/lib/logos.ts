// ── Types ──────────────────────────────────────────────

export interface Logo {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;       // "/logos/smyle.png" or full Blob URL
  targetUrl: string;      // "https://smyle.tr"
  displayUrl: string;     // "www.smyle.tr" (shown under logo)
  targetType: "internal" | "external";
  openInNewTab: boolean;
  order: number;
  isFeatured: boolean;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export type LogoInput = Omit<Logo, "id" | "createdAt" | "updatedAt">;

// ── Default Logos (matches files in public/logos/) ──

export const DEFAULT_LOGOS: Logo[] = [
  {
    id: "logo_kehf",
    title: "KEHF GROUP",
    subtitle: "Ana Kuruluş",
    imageUrl: "/logos/kehf.png",
    targetUrl: "https://kehf.com.tr",
    displayUrl: "kehf.com.tr",
    targetType: "external",
    openInNewTab: true,
    order: 0,
    isFeatured: true,
    active: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "logo_voks",
    title: "VOKS",
    subtitle: "Otomatik Kapı Sistemleri",
    imageUrl: "/logos/voks.png",
    targetUrl: "https://voks.com.tr",
    displayUrl: "voks.com.tr",
    targetType: "external",
    openInNewTab: true,
    order: 1,
    isFeatured: false,
    active: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "logo_kaliport",
    title: "KALİPORT",
    subtitle: "Endüstriyel Kapı Sistemleri",
    imageUrl: "/logos/kaliport.png",
    targetUrl: "https://kaliport.com.tr",
    displayUrl: "kaliport.com.tr",
    targetType: "external",
    openInNewTab: true,
    order: 2,
    isFeatured: false,
    active: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "logo_kutems",
    title: "KUTEMS",
    subtitle: "Garage & Industrial Door Components",
    imageUrl: "/logos/kutems.png",
    targetUrl: "https://kutems.tr",
    displayUrl: "www.kutems.tr",
    targetType: "external",
    openInNewTab: true,
    order: 3,
    isFeatured: false,
    active: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "logo_smyle",
    title: "SMYLE",
    subtitle: "Smile At Life",
    imageUrl: "/logos/smyle.png",
    targetUrl: "https://smyle.tr",
    displayUrl: "smyle.tr",
    targetType: "external",
    openInNewTab: true,
    order: 4,
    isFeatured: false,
    active: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "logo_gulumse",
    title: "GÜLÜMSE",
    subtitle: "Hayata Gülümse",
    imageUrl: "/logos/gulumse.png",
    targetUrl: "https://gulumse.tr",
    displayUrl: "gulumse.tr",
    targetType: "external",
    openInNewTab: true,
    order: 5,
    isFeatured: false,
    active: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "logo_sonrakam",
    title: "SONRAKAM",
    subtitle: "eee Sonrakam Ne Olur",
    imageUrl: "/logos/sonrakam.png",
    targetUrl: "https://sonrakam.com",
    displayUrl: "sonrakam.com",
    targetType: "external",
    openInNewTab: true,
    order: 6,
    isFeatured: false,
    active: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "logo_combi",
    title: "COMBİ M",
    subtitle: "Çözüm & İnovasyon",
    imageUrl: "/logos/combi.png",
    targetUrl: "https://combi.com.tr",
    displayUrl: "combi.com.tr",
    targetType: "external",
    openInNewTab: true,
    order: 7,
    isFeatured: false,
    active: true,
    createdAt: null,
    updatedAt: null,
  },
];

const LOGOS_EVENT = "kehf_logos_updated";

function emitLogosUpdated(logos: Logo[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Logo[]>(LOGOS_EVENT, { detail: logos }));
}

// ── Read ───────────────────────────────────────────────

export async function getLogos(): Promise<Logo[]> {
  const res = await fetch("/api/logos", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !Array.isArray(data.logos)) {
    throw new Error(data.error || "Logolar yüklenemedi.");
  }
  return data.logos as Logo[];
}

export function subscribeToLogos(
  callback: (logos: Logo[]) => void,
  activeOnly = false
): () => void {
  const deliver = (list: Logo[]) => {
    const filtered = activeOnly ? list.filter((l) => l.active) : list;
    const sorted = [...filtered].sort((a, b) => a.order - b.order);
    callback(sorted);
  };

  if (typeof window === "undefined") return () => {};

  let active = true;

  getLogos()
    .then((logos) => {
      if (active) deliver(logos);
    })
    .catch((err) => {
      console.warn("Logo verileri sunucudan alınamadı:", err);
    });

  const handleUpdate = (e: Event) => {
    const custom = e as CustomEvent<Logo[]>;
    if (Array.isArray(custom.detail)) {
      deliver(custom.detail);
    } else {
      getLogos()
        .then((logos) => {
          if (active) deliver(logos);
        })
        .catch(() => {});
    }
  };

  window.addEventListener(LOGOS_EVENT, handleUpdate);

  return () => {
    active = false;
    window.removeEventListener(LOGOS_EVENT, handleUpdate);
  };
}

// ── Write (Protected by server HttpOnly Admin Session) ─

export async function createLogo(data: LogoInput): Promise<string> {
  const res = await fetch("/api/logos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "create", data }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Logo eklenemedi.");
  }

  if (Array.isArray(json.logos)) {
    emitLogosUpdated(json.logos);
  }
  return json.id as string;
}

export async function seedInitialLogos(): Promise<void> {
  const res = await fetch("/api/logos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "seed" }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Başlangıç logoları yüklenemedi.");
  }

  if (Array.isArray(json.logos)) {
    emitLogosUpdated(json.logos);
  }
}

export async function updateLogo(
  id: string,
  data: Partial<LogoInput>
): Promise<void> {
  const res = await fetch("/api/logos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "update", id, data }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Logo güncellenemedi.");
  }

  if (Array.isArray(json.logos)) {
    emitLogosUpdated(json.logos);
  }
}

export async function deleteLogo(id: string): Promise<void> {
  const res = await fetch("/api/logos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "delete", id }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Logo silinemedi.");
  }

  if (Array.isArray(json.logos)) {
    emitLogosUpdated(json.logos);
  }
}

export async function reorderLogos(orderedIds: string[]): Promise<void> {
  const res = await fetch("/api/logos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "reorder", orderedIds }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Logo sıralaması kaydedilemedi.");
  }

  if (Array.isArray(json.logos)) {
    emitLogosUpdated(json.logos);
  }
}
