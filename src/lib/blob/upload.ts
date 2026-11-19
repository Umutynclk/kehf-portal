/**
 * Client-side Vercel Blob upload/delete helpers.
 *
 * SECURITY:
 * - No tokens are read from localStorage or sent in request bodies.
 * - Authentication relies strictly on the server-verified HttpOnly session cookie.
 */

export interface BlobUploadResult {
  url: string;
  pathname: string;
}

/**
 * Upload an image file to Vercel Blob via protected server API.
 */
export async function uploadBlobImage(
  file: File,
  key: string
): Promise<BlobUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("key", key);

  const res = await fetch("/api/blob/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Fotoğraf yüklenirken bir hata oluştu.");
  }

  return { url: data.url, pathname: data.pathname };
}

/**
 * Delete a blob from Vercel Blob storage via protected server API.
 */
export async function deleteBlobImage(url: string): Promise<void> {
  if (!url || !isBlobUrl(url)) {
    return;
  }

  const res = await fetch("/api/blob/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ url }),
  });

  const data = await res.json().catch(() => ({}));

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
