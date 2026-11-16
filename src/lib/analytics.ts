/**
 * SSR-safe, lightweight analytics logger.
 * Does not require external tracking libraries.
 */

export async function initAnalytics(): Promise<void> {
  // No external initialization required
}

/**
 * Log a logo click event.
 */
export async function logLogoClick(logoId: string, targetType: string): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Analytics] Logo clicked: ${logoId} (${targetType})`);
  }
}
