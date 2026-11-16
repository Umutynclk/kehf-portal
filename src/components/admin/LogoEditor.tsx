"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { Logo, LogoInput } from "@/lib/logos";
import { uploadBlobImage, deleteBlobImage, isBlobUrl } from "@/lib/blob/upload";

// Preset logo images available in public/logos/
const PRESET_LOGOS = [
  { name: "KEHF GROUP", path: "/logos/kehf.png" },
  { name: "VOKS", path: "/logos/voks.png" },
  { name: "KALİPORT", path: "/logos/kaliport.png" },
  { name: "KUTEMS", path: "/logos/kutems.png" },
  { name: "SMYLE", path: "/logos/smyle.png" },
  { name: "GÜLÜMSE", path: "/logos/gulumse.png" },
  { name: "SONRAKAM", path: "/logos/sonrakam.png" },
  { name: "COMBİ M", path: "/logos/combi.png" },
];

const DANGEROUS_PROTOCOLS = ["javascript:", "data:", "vbscript:"];

function validateUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  for (const proto of DANGEROUS_PROTOCOLS) {
    if (lower.startsWith(proto)) return `"${proto}" URL'lerine izin verilmiyor.`;
  }
  return null;
}

interface LogoEditorProps {
  logo?: Logo | null;
  nextOrder: number;
  onSave: (data: LogoInput) => Promise<void>;
  onClose: () => void;
}

export default function LogoEditor({
  logo,
  nextOrder,
  onSave,
  onClose,
}: LogoEditorProps) {
  const isEdit = Boolean(logo);
  const originalImageUrl = logo?.imageUrl ?? "";

  const [title, setTitle] = useState(logo?.title ?? "");
  const [subtitle, setSubtitle] = useState(logo?.subtitle ?? "");
  const [imageUrl, setImageUrl] = useState(logo?.imageUrl ?? "");
  const [targetUrl, setTargetUrl] = useState(logo?.targetUrl ?? "");
  const [displayUrl, setDisplayUrl] = useState(logo?.displayUrl ?? "");
  const [targetType, setTargetType] = useState<"internal" | "external">(
    logo?.targetType ?? "external"
  );
  const [openInNewTab, setOpenInNewTab] = useState(logo?.openInNewTab ?? true);
  const [isFeatured, setIsFeatured] = useState(logo?.isFeatured ?? false);
  const [active, setActive] = useState(logo?.active ?? true);
  const [order, setOrder] = useState(logo?.order ?? nextOrder);

  const [formError, setFormError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Track any blob uploaded during this editing session that hasn't been saved yet
  const [newlyUploadedBlobUrl, setNewlyUploadedBlobUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!displayUrl && targetUrl) {
      setDisplayUrl(targetUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""));
    }
  }, [targetUrl, displayUrl]);

  // Handle safe cancel/close: Clean up any uncommitted newly uploaded blob
  const handleCancel = () => {
    if (
      newlyUploadedBlobUrl &&
      newlyUploadedBlobUrl !== originalImageUrl &&
      isBlobUrl(newlyUploadedBlobUrl)
    ) {
      deleteBlobImage(newlyUploadedBlobUrl).catch((err) => {
        console.warn("Vazgeçilen geçici Blob silinemedi:", err);
      });
    }
    onClose();
  };

  // Handle file upload to Vercel Blob via server-side API
  async function handleFileUpload(file: File) {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setFormError("Lütfen geçerli bir görsel dosyası seçin (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError("Dosya çok büyük. Maksimum dosya boyutu 10 MB.");
      return;
    }
    setUploading(true);
    setFormError("");

    // Build a logo key from title or filename
    const rawKey = (title || file.name.split(".")[0])
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40) || "logo";

    try {
      // 1. Upload new image to Vercel Blob first
      const result = await uploadBlobImage(file, rawKey);

      // If user uploaded a previous file in this same session that was not saved, clean it up
      if (
        newlyUploadedBlobUrl &&
        newlyUploadedBlobUrl !== originalImageUrl &&
        isBlobUrl(newlyUploadedBlobUrl)
      ) {
        deleteBlobImage(newlyUploadedBlobUrl).catch((err) => {
          console.warn("Önceki geçici Blob temizlenemedi:", err);
        });
      }

      // 2. Get new Blob URL and update state
      setNewlyUploadedBlobUrl(result.url);
      setImageUrl(result.url);

      if (!title) {
        const nameWithoutExt = file.name.split(".")[0].toUpperCase();
        setTitle(nameWithoutExt);
      }
      setFormError("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fotoğraf yüklenirken bir hata oluştu.";
      console.error("Blob upload error:", err);
      setFormError(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!imageUrl.trim()) {
      setFormError("Lütfen bir logo görseli seçin veya URL girin.");
      return;
    }
    if (!title.trim()) {
      setFormError("Lütfen Marka Adı alanını doldurun.");
      return;
    }

    const err = validateUrl(targetUrl);
    if (err) {
      setUrlError(err);
      return;
    }

    setUrlError("");
    setSaving(true);

    const newUrl = imageUrl.trim();

    try {
      // 3. Update database record with new URL
      await onSave({
        title: title.trim(),
        subtitle: subtitle.trim(),
        imageUrl: newUrl,
        targetUrl: targetUrl.trim(),
        displayUrl: displayUrl.trim() || (targetUrl ? targetUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") : ""),
        targetType,
        openInNewTab,
        isFeatured,
        order,
        active,
      });

      // 4. Database update succeeded! Now check if old URL was a Vercel Blob URL
      // 5. If old URL is Blob URL and changed, delete old Blob
      // 6. If old URL is local /public, external URL, isBlobUrl() will safely return false
      if (
        originalImageUrl &&
        originalImageUrl !== newUrl &&
        isBlobUrl(originalImageUrl)
      ) {
        // As per requirements: if delete fails, do not revert new logo save; log error instead.
        deleteBlobImage(originalImageUrl).catch((deleteErr) => {
          console.warn("Eski Blob silme işlemi başarısız oldu (kayıt korundu):", deleteErr);
        });
      }

      // Reset session tracking and close modal
      setNewlyUploadedBlobUrl(null);
      onClose();
    } catch (error: any) {
      console.error("Save error:", error);

      // 7. If new upload succeeded but database update failed, delete the newly created Blob to prevent orphans
      if (
        newlyUploadedBlobUrl &&
        newlyUploadedBlobUrl === newUrl &&
        isBlobUrl(newlyUploadedBlobUrl) &&
        newlyUploadedBlobUrl !== originalImageUrl
      ) {
        deleteBlobImage(newlyUploadedBlobUrl).catch((cleanupErr) => {
          console.warn("Orphan Blob temizlenirken hata oluştu:", cleanupErr);
        });
        setNewlyUploadedBlobUrl(null);
      }

      setFormError(error?.message || "Kaydederken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleCancel} />

      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-[#0d0d12] border border-white/[0.12] rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0d0d12]/95 backdrop-blur-xl">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isEdit ? "Logo Düzenle" : "Yeni Logo Ekle"}
            </h2>
            <p className="text-xs text-white/40">Görsel seçin veya yükleyin, marka bilgilerini girin</p>
          </div>
          <button
            onClick={handleCancel}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Banner */}
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Featured Toggle */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
            <div>
              <span className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
                ⭐ Ana Logo Yap
              </span>
              <p className="text-xs text-white/50 mt-0.5">
                Sayfanın en üstünde en belirgin büyük logo olarak gösterilir
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFeatured(!isFeatured)}
              className={`w-12 h-7 rounded-full transition-all relative flex-shrink-0 ${
                isFeatured ? "bg-amber-500" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  isFeatured ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Logo Selection / Upload Section */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider">
              Logo Görseli Seç veya Yükle
            </label>

            {/* Quick Preset Selector */}
            <div>
              <span className="text-[11px] text-white/40 mb-2 block">
                📁 public/logos/ klasöründeki mevcut logolar:
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {PRESET_LOGOS.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      setImageUrl(item.path);
                      if (!title) setTitle(item.name);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      imageUrl === item.path
                        ? "bg-purple-500/20 border-purple-500 text-white"
                        : "bg-white/[0.02] border-white/[0.08] hover:border-white/30 text-white/60"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.path} alt={item.name} className="h-6 w-full object-contain" />
                    <span className="text-[9px] font-bold truncate max-w-full">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* File Upload Button & Drag Area */}
            <div className="flex gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Dosya Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    <span>Bilgisayardan Yeni Görsel Yükle</span>
                  </>
                )}
              </button>
            </div>

            {/* Manual Image Path Input */}
            <div>
              <span className="text-[11px] text-white/40 block mb-1">veya Dosya Yolu / URL:</span>
              <input
                type="text"
                required
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/20 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="/logos/kehf.png veya https://..."
              />
            </div>

            {/* Preview Box */}
            {imageUrl && (
              <div className="w-full h-24 rounded-xl bg-black border border-white/[0.08] flex items-center justify-center p-3 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Önizleme"
                  className="max-h-full max-w-full object-contain filter drop-shadow"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wider">
              Marka Adı <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              placeholder="Örn: KEHF, SMYLE, VOKS"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wider">
              Açıklama / Slogan (Opsiyonel)
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              placeholder="Örn: Ağız & Diş Sağlığı"
            />
          </div>

          {/* Target URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                Tıklanınca Gidecek Adres (URL)
              </label>
              <span className="text-[11px] text-white/30">Opsiyonel</span>
            </div>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => {
                setTargetUrl(e.target.value);
                setUrlError("");
              }}
              className={`w-full px-4 py-3 rounded-xl bg-white/[0.04] border text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
                urlError ? "border-red-500/50" : "border-white/[0.1]"
              }`}
              placeholder="https://smyle.tr"
            />
            {urlError && <p className="mt-1 text-xs text-red-400">{urlError}</p>}
          </div>

          {/* Display URL (Shown under logo on main page) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                Logonun Altında Görünecek Web Adresi
              </label>
              <span className="text-[11px] text-white/30">Opsiyonel</span>
            </div>
            <input
              type="text"
              value={displayUrl}
              onChange={(e) => setDisplayUrl(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/20 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              placeholder="www.smyle.tr"
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs text-white/70">Yeni Sekmede Aç</span>
              <button
                type="button"
                onClick={() => setOpenInNewTab(!openInNewTab)}
                className={`w-10 h-6 rounded-full transition-all relative ${
                  openInNewTab ? "bg-purple-500" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    openInNewTab ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs text-white/70">Aktif Göster</span>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`w-10 h-6 rounded-full transition-all relative ${
                  active ? "bg-emerald-500" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    active ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-3 rounded-xl border border-white/[0.1] text-white/60 text-sm font-medium hover:bg-white/[0.05] transition-all"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-50 transition-all shadow-lg shadow-white/10"
            >
              {saving ? "Kaydediliyor..." : isEdit ? "Kaydet" : "Logoyu Ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
