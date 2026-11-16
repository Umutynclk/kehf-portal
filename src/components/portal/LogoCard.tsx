"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/lib/logos";
import { logLogoClick } from "@/lib/analytics";

interface LogoCardProps {
  logo: Logo;
  isFeatured?: boolean;
  animationDelay?: number;
}

export default function LogoCard({
  logo,
  isFeatured = false,
  animationDelay = 0,
}: LogoCardProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  const hasTargetUrl = Boolean(logo.targetUrl && logo.targetUrl.trim().length > 0);

  function handleClick(e: React.MouseEvent) {
    if (!hasTargetUrl) {
      return;
    }

    logLogoClick(logo.id, logo.targetType);

    if (logo.targetType === "internal") {
      e.preventDefault();
      router.push(logo.targetUrl);
    } else if (logo.openInNewTab) {
      // native link handles _blank
    } else {
      e.preventDefault();
      window.location.href = logo.targetUrl;
    }
  }

  const animStyle = {
    animationDelay: `${animationDelay}ms`,
  };

  // ────────────────────────────────────────────────────────
  // 1. ANA BÜYÜK LOGO (KEHF GROUP HERO LOGO)
  // ────────────────────────────────────────────────────────
  if (isFeatured) {
    const CardElement = hasTargetUrl ? "a" : "div";
    const linkProps = hasTargetUrl
      ? {
          href: logo.targetUrl,
          target: logo.openInNewTab ? "_blank" : "_self",
          rel: "noopener noreferrer",
        }
      : {};

    return (
      <CardElement
        {...linkProps}
        onClick={handleClick}
        style={animStyle}
        className={`group relative flex flex-col items-center justify-center w-full max-w-2xl px-6 py-4 transition-all duration-500 focus:outline-none animate-hero-pop ${
          hasTargetUrl ? "cursor-pointer" : "cursor-default select-none"
        }`}
      >
        {/* Soft Ambient Gold Glow Behind Hero Logo */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.07] via-amber-600/[0.03] to-transparent blur-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-full scale-125" />

        {/* Hero Logo Image */}
        <div className="relative w-full h-40 sm:h-52 md:h-64 flex items-center justify-center z-10">
          {logo.imageUrl && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo.imageUrl}
              alt={logo.title || "KEHF GROUP"}
              onError={() => setImageError(true)}
              className="max-w-full max-h-full object-contain filter drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)] transition-transform duration-500 group-hover:scale-105"
              loading="eager"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-3xl sm:text-5xl font-extrabold tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
                {logo.title || "KEHF GROUP"}
              </span>
              {logo.subtitle && (
                <span className="text-xs sm:text-sm text-amber-200/50 uppercase tracking-[0.3em] mt-2">
                  {logo.subtitle}
                </span>
              )}
            </div>
          )}
        </div>
      </CardElement>
    );
  }

  // ────────────────────────────────────────────────────────
  // 2. MARKA LOGOLARI (ŞIK KURUMSAL FORMAT)
  // ────────────────────────────────────────────────────────
  const CardElement = hasTargetUrl ? "a" : "div";
  const linkProps = hasTargetUrl
    ? {
        href: logo.targetUrl,
        target: logo.openInNewTab ? "_blank" : "_self",
        rel: "noopener noreferrer",
      }
    : {};

  return (
    <CardElement
      {...linkProps}
      onClick={handleClick}
      style={animStyle}
      className={`group relative flex flex-col items-center justify-center w-full h-full min-h-[140px] sm:min-h-[160px] md:min-h-[180px] p-3 sm:p-4 rounded-2xl hover:bg-white/[0.02] transition-all duration-300 focus:outline-none animate-logo-pop ${
        hasTargetUrl
          ? "cursor-pointer hover:scale-105"
          : "cursor-default select-none"
      }`}
    >
      {/* Subtle Glow on hover */}
      <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 rounded-2xl blur-xl transition-opacity duration-300 pointer-events-none" />

      {/* Clean Logo Image Display */}
      <div className="relative w-full h-24 sm:h-28 md:h-32 flex items-center justify-center p-2 z-10">
        {logo.imageUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo.imageUrl}
            alt={logo.title}
            onError={() => setImageError(true)}
            className="max-w-full max-h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] transition-all duration-300 group-hover:drop-shadow-[0_12px_24px_rgba(255,255,255,0.12)]"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <span className="text-base sm:text-lg font-bold text-white/90 tracking-wider">
              {logo.title}
            </span>
            {logo.subtitle && (
              <span className="text-[10px] text-white/40 tracking-wide mt-1">
                {logo.subtitle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Optional Website Link Tag if provided */}
      {logo.displayUrl && (
        <span className="mt-1 text-[10px] sm:text-[11px] text-white/30 group-hover:text-amber-400/80 font-mono tracking-wide transition-colors duration-200 truncate max-w-full z-10">
          {logo.displayUrl}
        </span>
      )}
    </CardElement>
  );
}

