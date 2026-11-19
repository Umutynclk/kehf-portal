export default function SiteFooter() {
  return (
    <footer
      role="contentinfo"
      className="relative w-full bg-[#050508] text-white/60 border-t border-white/[0.06] mt-auto"
    >
      {/* Subtle KEHF Group gold top hairline */}
      <div
        aria-hidden="true"
        className="w-full h-px bg-gradient-to-r from-transparent via-amber-500/35 to-transparent"
      />

      <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-8 md:px-12 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-center sm:text-left">
        <small className="text-xs sm:text-[13px] tracking-wide text-white/65 font-normal">
          © 2026{" "}
          <span className="text-amber-400/90 font-medium tracking-wider">
            KEHF Group
          </span>
          . Tüm hakları saklıdır.
        </small>

        <small className="text-xs sm:text-[13px] tracking-wide text-white/45 font-normal">
          Geliştirici:{" "}
          <span className="text-white/75 font-medium">Umut Yoncalık</span>
        </small>
      </div>
    </footer>
  );
}
