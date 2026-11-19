import type { NextConfig } from "next";

const EXPECTED_PROJECT_ID = "kehf-d1b3a";

function resolvePublicFirebaseApiKey(): string {
  const explicitKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (explicitKey) {
    return explicitKey;
  }

  // Firebase App Hosting injects FIREBASE_WEBAPP_CONFIG at build/runtime
  const webAppConfigRaw = process.env.FIREBASE_WEBAPP_CONFIG;
  if (webAppConfigRaw) {
    try {
      const parsed = JSON.parse(webAppConfigRaw) as {
        apiKey?: string;
        projectId?: string;
      };
      if (
        parsed.projectId === EXPECTED_PROJECT_ID &&
        typeof parsed.apiKey === "string" &&
        parsed.apiKey.trim()
      ) {
        return parsed.apiKey.trim();
      }
    } catch {
      // Ignore invalid JSON; runtime validation will report missing key cleanly
    }
  }

  return "";
}

const resolvedApiKey = resolvePublicFirebaseApiKey();

const nextConfig: NextConfig = {
  env: {
    ...(resolvedApiKey ? { NEXT_PUBLIC_FIREBASE_API_KEY: resolvedApiKey } : {}),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
