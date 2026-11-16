"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo, subscribeToLogos, DEFAULT_LOGOS } from "@/lib/logos";
import { initAnalytics } from "@/lib/analytics";
import LogoCard from "./LogoCard";

const INITIAL_LOGOS: Logo[] = DEFAULT_LOGOS.map((item, i) => ({
  ...item,
  id: `default_${i}`,
  createdAt: null,
  updatedAt: null,
}));

export default function BrandPortal() {
  const [logos, setLogos] = useState<Logo[]>(INITIAL_LOGOS);

  // Initialize analytics safely
  useEffect(() => {
    initAnalytics();
  }, []);

  // Subscribe to live logos (updates state from localStorage or Firestore)
  useEffect(() => {
    const unsub = subscribeToLogos((data) => {
      if (data && data.length > 0) {
        setLogos(data);
      }
    }, true);
    return unsub;
  }, []);

  // 1 Featured Logo (KEHF GROUP) & Remaining Brand Logos
  const featuredLogo =
    logos.find((l) => l.isFeatured) || (logos.length > 0 ? logos[0] : null);

  const secondaryLogos = featuredLogo
    ? logos.filter((l) => l.id !== featuredLogo.id)
    : logos.slice(1);

  // Layout splitting:
  // Default matching image: 3 logos in Top Row (VOKS, KALİPORT, KUTEMS) + 4 logos in Bottom Row (SMYLE, GÜLÜMSE, SONRAKAM, COMBİ M)
  let topRowLogos: Logo[] = [];
  let bottomRowLogos: Logo[] = [];

  if (secondaryLogos.length >= 7) {
    topRowLogos = secondaryLogos.slice(0, 3);
    bottomRowLogos = secondaryLogos.slice(3, 7);
  } else if (secondaryLogos.length === 6) {
    topRowLogos = secondaryLogos.slice(0, 3);
    bottomRowLogos = secondaryLogos.slice(3, 6);
  } else if (secondaryLogos.length === 5) {
    topRowLogos = secondaryLogos.slice(0, 3);
    bottomRowLogos = secondaryLogos.slice(3, 5);
  } else {
    topRowLogos = secondaryLogos;
    bottomRowLogos = [];
  }

  // Animation timing calculation
  const STAGGER_INTERVAL = 70;
  const BASE_DELAY = 40;
  const featuredDelay = BASE_DELAY + secondaryLogos.length * STAGGER_INTERVAL + 100;

  return (
    <div className="relative min-h-screen w-full bg-[#000000] text-white flex flex-col justify-between items-center px-4 sm:px-8 md:px-12 py-8 sm:py-14 selection:bg-amber-500/30 selection:text-white overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-amber-600/[0.04] blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[600px] h-[300px] bg-blue-900/[0.03] blur-[150px] pointer-events-none rounded-full" />

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
        title="Yönetim"
        className="fixed bottom-4 right-4 w-3 h-3 rounded-full bg-white/[0.04] hover:bg-white/40 border border-white/[0.08] transition-all z-50 shadow-lg"
      />
    </div>
  );
}

