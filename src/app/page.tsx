import BrandPortal from "@/components/portal/BrandPortal";
import { DEFAULT_LOGOS, Logo } from "@/lib/logos";
import { DEFAULT_PORTAL_SETTINGS, PortalSettings } from "@/lib/portal";
import {
  fetchAllLogosFromFirestore,
  fetchPortalSettingsFromFirestore,
} from "@/lib/firebase/firestore-repo";

export const dynamic = "force-dynamic";

export default async function Home() {
  let initialLogos: Logo[] = DEFAULT_LOGOS;
  let initialSettings: PortalSettings = DEFAULT_PORTAL_SETTINGS;

  try {
    const [logos, settings] = await Promise.all([
      fetchAllLogosFromFirestore(),
      fetchPortalSettingsFromFirestore(),
    ]);
    const activeLogos = logos.filter((l) => l.active);
    if (activeLogos.length > 0) {
      initialLogos = activeLogos;
    }
    initialSettings = settings;
  } catch (err) {
    console.warn("SSR Firestore okuma yedeğe düştü:", err);
  }

  return (
    <BrandPortal
      initialLogos={initialLogos}
      initialSettings={initialSettings}
    />
  );
}
