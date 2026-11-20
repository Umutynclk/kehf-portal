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

      <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-8 md:px-12 py-5 sm:py-6 flex flex-col gap-4">
        {/* Corporate Contact Information */}
        <address className="not-italic flex flex-wrap items-center justify-center sm:justify-between gap-x-6 gap-y-2.5 text-xs sm:text-[13px] text-white/65">
          <a
            href="mailto:info@kehfgroup.tr"
            className="inline-flex items-center gap-2 hover:text-amber-400 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/60 rounded-sm"
          >
            <svg
              aria-hidden="true"
              className="w-3.5 h-3.5 text-amber-500/75 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
            <span>info@kehfgroup.tr</span>
          </a>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5">
            <a
              href="tel:+903324212421"
              className="inline-flex items-center gap-2 hover:text-amber-400 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/60 rounded-sm"
            >
              <svg
                aria-hidden="true"
                className="w-3.5 h-3.5 text-amber-500/75 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                />
              </svg>
              <span>0 332 421 2 421</span>
            </a>

            <a
              href="https://wa.me/905321549277"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp ile iletişime geç: 0 532 154 92 77"
              className="inline-flex items-center gap-2 hover:text-amber-400 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/60 rounded-sm"
            >
              <svg
                aria-hidden="true"
                className="w-3.5 h-3.5 text-emerald-400/80 shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12.031 2c-5.518 0-9.998 4.48-9.998 9.998 0 1.763.461 3.485 1.337 5.002L2 22l5.134-1.347a9.95 9.95 0 0 0 4.897 1.281h.004c5.517 0 9.997-4.48 9.997-9.998A9.93 9.93 0 0 0 19.104 4.93 9.927 9.927 0 0 0 12.031 2Zm5.822 14.236c-.245.69-1.434 1.32-1.99 1.404-.508.076-1.168.108-1.884-.118-.435-.138-.993-.322-1.708-.63-3.005-1.298-4.968-4.327-5.118-4.527-.15-.2-1.222-1.627-1.222-3.103 0-1.477.773-2.203 1.048-2.503.275-.3.6-.375.8-.375.2 0 .4.002.575.011.184.009.431-.07.674.514.25.601.85 2.077.925 2.227.075.15.125.325.025.525-.1.2-.15.325-.3.5-.15.175-.315.39-.45.525-.15.15-.306.313-.131.613.175.3.778 1.283 1.67 2.078 1.147 1.023 2.114 1.34 2.414 1.49.3.15.475.125.65-.075.175-.2.75-.875.95-1.175.2-.3.4-.25.675-.15.275.1 1.75.825 2.05.975.3.15.5.225.575.35.075.125.075.725-.17 1.415Z" />
              </svg>
              <span>WhatsApp: 0 532 154 92 77</span>
            </a>
          </div>
        </address>

        {/* Bottom Copyright & Developer Credit Row */}
        <div className="pt-3.5 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-center sm:text-left">
          <small className="text-xs sm:text-[13px] tracking-wide text-white/65 font-normal">
            © 2026{" "}
            <span className="text-amber-400/90 font-medium tracking-wider">
              KEHF Group
            </span>
            . Tüm hakları saklıdır.
          </small>

          <small className="text-xs sm:text-[13px] tracking-wide text-white/45 font-normal">
            Geliştirici:{" "}
            <a
              href="https://www.instagram.com/umutynclk/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/75 font-medium hover:text-amber-400 transition-colors duration-200 underline decoration-white/20 hover:decoration-amber-400/60 underline-offset-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/60 rounded-sm"
            >
              umutynclk
            </a>
          </small>
        </div>
      </div>
    </footer>
  );
}
