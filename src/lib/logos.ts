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

export const DEFAULT_LOGOS: LogoInput[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];

// ── Storage Keys & Event Names ─────────────────────────

const LOCAL_STORAGE_KEY = "kehf_portal_logos_v3";
const LOGOS_EVENT = "kehf_logos_updated";

function getStoredLogos(): Logo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Local storage parse error:", e);
  }
  return [];
}

function setStoredLogos(logos: Logo[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logos));
    window.dispatchEvent(new CustomEvent(LOGOS_EVENT, { detail: logos }));
  } catch (e) {
    console.warn("Local storage write error:", e);
  }
}

// ── Read ───────────────────────────────────────────────

export async function getLogos(): Promise<Logo[]> {
  const local = getStoredLogos();
  if (local.length > 0) return local;

  const initial: Logo[] = DEFAULT_LOGOS.map((item, i) => ({
    ...item,
    id: `logo_${i + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  setStoredLogos(initial);
  return initial;
}

export function subscribeToLogos(
  callback: (logos: Logo[]) => void,
  activeOnly = false
): () => void {
  const update = () => {
    let list = getStoredLogos();
    if (list.length === 0) {
      list = DEFAULT_LOGOS.map((item, i) => ({
        ...item,
        id: `logo_${i + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setStoredLogos(list);
    }
    const filtered = activeOnly ? list.filter((l) => l.active) : list;
    const sorted = [...filtered].sort((a, b) => a.order - b.order);
    callback(sorted);
  };

  // Initial call
  update();

  if (typeof window === "undefined") return () => {};

  const handleUpdate = () => update();
  window.addEventListener(LOGOS_EVENT, handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener(LOGOS_EVENT, handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

// ── Write ──────────────────────────────────────────────

export async function createLogo(data: LogoInput): Promise<string> {
  const newId = `logo_${Date.now()}`;
  const now = new Date().toISOString();
  const newLogo: Logo = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  const existing = getStoredLogos();
  const updatedList = data.isFeatured
    ? existing.map((l) => ({ ...l, isFeatured: false }))
    : [...existing];
  updatedList.push(newLogo);
  setStoredLogos(updatedList);

  return newId;
}

export async function seedInitialLogos(): Promise<void> {
  const initial: Logo[] = DEFAULT_LOGOS.map((item, i) => ({
    ...item,
    id: `logo_${i + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  setStoredLogos(initial);
}

export async function updateLogo(id: string, data: Partial<LogoInput>): Promise<void> {
  const existing = getStoredLogos();
  const now = new Date().toISOString();
  const updatedList = existing.map((l) => {
    if (l.id === id) {
      return { ...l, ...data, updatedAt: now };
    }
    if (data.isFeatured && l.id !== id) {
      return { ...l, isFeatured: false };
    }
    return l;
  });
  setStoredLogos(updatedList);
}

export async function deleteLogo(id: string): Promise<void> {
  const existing = getStoredLogos();
  const filtered = existing.filter((l) => l.id !== id);
  setStoredLogos(filtered);
}

export async function reorderLogos(orderedIds: string[]): Promise<void> {
  const existing = getStoredLogos();
  const map = new Map(existing.map((l) => [l.id, l]));
  const now = new Date().toISOString();
  const reordered: Logo[] = [];
  
  orderedIds.forEach((id, index) => {
    const item = map.get(id);
    if (item) {
      reordered.push({ ...item, order: index, updatedAt: now });
    }
  });
  setStoredLogos(reordered);
}
