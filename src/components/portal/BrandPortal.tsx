"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Logo, subscribeToLogos, DEFAULT_LOGOS } from "@/lib/logos";
import {
  PortalSettings,
  DEFAULT_PORTAL_SETTINGS,
  subscribeToPortalSettings,
} from "@/lib/portal";
import { initAnalytics } from "@/lib/analytics";
import LogoCard from "./LogoCard";

interface BrandPortalProps {
  initialLogos?: Logo[];
  initialSettings?: PortalSettings;
}

export default function BrandPortal({
  initialLogos,
  initialSettings,
}: BrandPortalProps) {
  const [logos, setLogos] = useState<Logo[]>(
    initialLogos && initialLogos.length > 0 ? initialLogos : DEFAULT_LOGOS
  );
  const [settings, setSettings] = useState<PortalSettings>(
    initialSettings || DEFAULT_PORTAL_SETTINGS
  );

  // Initialize analytics safely
  useEffect(() => {
    initAnalytics();
  }, []);

  // Subscribe to live logos from Firestore API
  useEffect(() => {
    const unsub = subscribeToLogos((data) => {
      if (data && data.length > 0) {
        setLogos(data);
      }
    }, true);
    return unsub;
  }, []);

  // Subscribe to live portal settings from Firestore API
  useEffect(() => {
    const unsub = subscribeToPortalSettings((s) => {
      if (s) setSettings(s);
    });
    return unsub;
  }, []);

  // 1 Featured Logo (KEHF GROUP) & Remaining Brand Logos (memoized)
  const { featuredLogo, secondaryLogos, topRowLogos, bottomRowLogos } = useMemo(() => {
    const featured =
      logos.find((l) => l.isFeatured) || (logos.length > 0 ? logos[0] : null);
    const secondary = featured
      ? logos.filter((l) => l.id !== featured.id)
      : logos.slice(1);

    let top: Logo[] = [];
    let bottom: Logo[] = [];

    if (secondary.length >= 7) {
      top = secondary.slice(0, 3);
      bottom = secondary.slice(3);
    } else if (secondary.length === 6) {
      top = secondary.slice(0, 3);
      bottom = secondary.slice(3, 6);
    } else if (secondary.length === 5) {
      top = secondary.slice(0, 3);
      bottom = secondary.slice(3, 5);
    } else {
      top = secondary;
      bottom = [];
    }

    return {
      featuredLogo: featured,
      secondaryLogos: secondary,
      topRowLogos: top,
      bottomRowLogos: bottom,
    };
  }, [logos]);

  // Animation timing calculation
  const animMultiplier =
    settings.animationIntensity === "none"
      ? 0
      : settings.animationIntensity === "low"
      ? 0.5
      : settings.animationIntensity === "high"
      ? 1.4
      : 1;
  const STAGGER_INTERVAL = Math.round(70 * animMultiplier);
  const BASE_DELAY = Math.round(40 * animMultiplier);
  const featuredDelay =
    animMultiplier === 0
      ? 0
      : BASE_DELAY + secondaryLogos.length * STAGGER_INTERVAL + 100;

  return (
    <main className="relative flex-1 w-full bg-[#000000] text-white flex flex-col justify-between items-center px-4 sm:px-8 md:px-12 py-8 sm:py-12 selection:bg-amber-500/30 selection:text-white overflow-x-hidden">
      <h1 className="sr-only">
        {settings.siteTitle || "KEHF Group — Kurumsal Marka Portalı"}
      </h1>
      {/* Optional Background Image Layer */}
      {settings.backgroundType === "image" && settings.backgroundImageUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
            style={{ backgroundImage: `url(${settings.backgroundImageUrl})` }}
          />
          <div
            className="absolute inset-0 bg-black pointer-events-none"
            style={{ opacity: settings.backgroundOverlay }}
          />
        </>
      )}

      {/* Ambient background glows */}
      {settings.backgroundType !== "solid" && (
        <>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-amber-600/[0.04] blur-[160px] pointer-events-none rounded-full" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[600px] h-[300px] bg-blue-900/[0.03] blur-[150px] pointer-events-none rounded-full" />
        </>
      )}

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-[1240px] mx-auto flex flex-col items-center justify-center my-auto space-y-6 sm:space-y-8">
        
        {/* 1. TOP SECTION: ANA BÜYÜK LOGO (KEHF GROUP) */}
        {featuredLogo && (
          <div className="w-full flex justify-center">
            <LogoCard
              logo={featuredLogo}
              isFeatured={true}
              animationDelay={featuredDelay}
            />
          </div>
        )}

        {/* Golden Horizontal Divider Line */}
        <div className="w-full max-w-5xl h-[1.5px] bg-gradient-to-r from-transparent via-amber-600/40 to-transparent my-1 sm:my-2" />

        {/* 2. ROW 1: ÜST MARKA LOGOLARI (3 KOLON + DİKEY ÇİZGİLER) */}
        {topRowLogos.length > 0 && (
          <div className="w-full max-w-5xl mx-auto">
            <div
              className={`grid items-center justify-center ${
                topRowLogos.length === 3
                  ? "grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-amber-600/25"
                  : topRowLogos.length === 2
                  ? "grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-amber-600/25"
                  : "grid-cols-1"
              }`}
            >
              {topRowLogos.map((logo, index) => (
                <div key={logo.id} className="px-3 sm:px-6 py-2 flex items-center justify-center">
                  <LogoCard
                    logo={logo}
                    isFeatured={false}
                    animationDelay={BASE_DELAY + index * STAGGER_INTERVAL}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. ROW 2: ALT MARKA LOGOLARI (4 KOLON + DİKEY ÇİZGİLER) */}
        {bottomRowLogos.length > 0 && (
          <div className="w-full max-w-6xl mx-auto pt-2 sm:pt-4">
            <div
              className={`grid items-center justify-center ${
                bottomRowLogos.length === 4
                  ? "grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-amber-600/25"
                  : bottomRowLogos.length === 3
                  ? "grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-amber-600/25"
                  : "grid-cols-2 divide-x divide-amber-600/25"
              }`}
            >
              {bottomRowLogos.map((logo, index) => (
                <div key={logo.id} className="px-3 sm:px-5 py-2 flex items-center justify-center">
                  <LogoCard
                    logo={logo}
                    isFeatured={false}
                    animationDelay={
                      BASE_DELAY + (topRowLogos.length + index) * STAGGER_INTERVAL
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Discreet admin link dot for quick management */}
      <Link
        href="/admin/logolar"
        title="Yönetim Paneli"
        aria-label="Yönetim Paneli"
        className="fixed bottom-4 right-4 w-3 h-3 rounded-full bg-white/[0.04] hover:bg-white/40 border border-white/[0.08] transition-all z-50 shadow-lg"
      />
    </main>
  );
}

