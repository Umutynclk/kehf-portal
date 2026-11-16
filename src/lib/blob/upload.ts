/**
 * Client-side Vercel Blob upload/delete helpers.
 *
 * SECURITY NOTE:
 * - VERCEL_OIDC_TOKEN is NEVER sent to the browser.
 * - All Blob operations go through server-side API routes (/api/blob/*).
 * - Each request is authorized with a cryptographically verified admin session token.
 */

import { getStoredAdminToken, getStoredAdminUser } from "@/lib/auth";

// ── Get Admin Token for authenticated requests ─────────────────────
function getAuthToken(): string {
  const user = getStoredAdminUser();
  const token = getStoredAdminToken();

  if (!user || !token) {
    throw new Error(
      "Fotoğraf yüklemek için admin girişi yapmanız gerekiyor. " +
      "Lütfen admin paneline giriş yapın."
    );
  }
  return token;
}

// ── Types ──────────────────────────────────────────────────────────
export interface BlobUploadResult {
  url: string;
  pathname: string;
}

/**
 * Upload an image file to Vercel Blob.
 *
 * @param file - The File object to upload (JPG, PNG, WEBP — max 10 MB).
 * @param key  - A logical key used in the blob pathname (e.g. "logo-kehf", "gallery-1").
 * @returns    - The public URL and pathname of the uploaded blob.
 */
export async function uploadBlobImage(
  file: File,
  key: string
): Promise<BlobUploadResult> {
  const adminToken = getAuthToken();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("key", key);
  formData.append("adminToken", adminToken);

  const res = await fetch("/api/blob/upload", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${adminToken}`,
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Fotoğraf yüklenirken bir hata oluştu.");
  }

  return { url: data.url, pathname: data.pathname };
}

/**
 * Delete a blob from Vercel Blob storage.
 *
 * @param url - The full public URL of the blob to delete.
 */
export async function deleteBlobImage(url: string): Promise<void> {
  if (!url || !isBlobUrl(url)) {
    return;
  }
  const adminToken = getAuthToken();

  const res = await fetch("/api/blob/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ url, adminToken }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Fotoğraf silinirken bir hata oluştu.");
  }
}

/**
 * Check if a URL is a Vercel Blob URL
 */
export function isBlobUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return (
    url.includes(".public.blob.vercel-storage.com") ||
    url.includes(".blob.vercel-storage.com")
  );
}
