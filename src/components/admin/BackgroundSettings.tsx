"use client";

import { useState, useEffect } from "react";
import {
  PortalSettings,
  subscribeToPortalSettings,
  updatePortalSettings,
} from "@/lib/portal";
import { uploadBlobImage, deleteBlobImage, isBlobUrl } from "@/lib/blob/upload";
import ImageUploader from "./ImageUploader";

export default function BackgroundSettings() {
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [localTitle, setLocalTitle] = useState("");
  const [localDesc, setLocalDesc] = useState("");
  const [localBgType, setLocalBgType] = useState<PortalSettings["backgroundType"]>("gradient");
  const [localOverlay, setLocalOverlay] = useState(0.5);
  const [localLayout, setLocalLayout] = useState<PortalSettings["layout"]>("grid");
  const [localAnimation, setLocalAnimation] = useState<PortalSettings["animationIntensity"]>("medium");

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToPortalSettings((s) => {
      setSettings(s);
      setLocalTitle(s.siteTitle);
      setLocalDesc(s.siteDescription);
      setLocalBgType(s.backgroundType);
      setLocalOverlay(s.backgroundOverlay);
      setLocalLayout(s.layout);
      setLocalAnimation(s.animationIntensity);
    });
    return unsub;
  }, []);

  async function save(extra: Partial<PortalSettings> = {}) {
    setSaving(true);
    setSaveError(null);
    try {
      await updatePortalSettings({
        siteTitle: localTitle,
        siteDescription: localDesc,
        backgroundType: localBgType,
        backgroundOverlay: localOverlay,
        layout: localLayout,
        animationIntensity: localAnimation,
        ...extra,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Ayarlar kaydedilirken hata oluştu."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm">
          🎨
        </span>
        Portal Ayarları
      </h3>

      <div className="grid gap-5">
        {/* Site Title */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
            Site Başlığı
          </label>
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>

        {/* Site Description */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
            Site Açıklaması
          </label>
          <input
            type="text"
            value={localDesc}
            onChange={(e) => setLocalDesc(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>

        {/* Background Type */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
            Arka Plan Türü
          </label>
          <div className="flex gap-2">
            {(["gradient", "solid", "image"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setLocalBgType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  localBgType === type
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.06]"
                }`}
              >
                {type === "gradient" ? "Gradyan" : type === "solid" ? "Düz Renk" : "Görsel"}
              </button>
            ))}
          </div>
        </div>

        {/* Background Image */}
        <ImageUploader
          currentUrl={settings.backgroundImageUrl}
          onUpload={async (file) => {
            const oldUrl = settings.backgroundImageUrl;
            // 1. Upload new image first to Vercel Blob
            const result = await uploadBlobImage(file, "background");
            try {
              // 2. Update database record
              await updatePortalSettings({
                backgroundImageUrl: result.url,
                backgroundType: "image",
              });
              // 3. If DB update succeeds, check and delete old Blob if it was a Blob URL
              if (oldUrl && isBlobUrl(oldUrl) && oldUrl !== result.url) {
                deleteBlobImage(oldUrl).catch((err) => {
                  console.warn("Eski arka plan Blob silme hatası (kayıt korundu):", err);
                });
              }
              return result.url;
            } catch (err) {
              // 4. If DB update fails, cleanup the new orphan blob
              deleteBlobImage(result.url).catch((cleanupErr) => {
                console.warn("Orphan arka plan Blob temizleme hatası:", cleanupErr);
              });
              throw err;
            }
          }}
          label="Arka Plan Görseli"
        />

        {/* Overlay */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
            Overlay Opaklığı: {Math.round(localOverlay * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={localOverlay}
            onChange={(e) => setLocalOverlay(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>

        {/* Layout */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
            Düzen
          </label>
          <div className="flex gap-2">
            {(["grid", "flex", "masonry"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocalLayout(l)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  localLayout === l
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.06]"
                }`}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Animation Intensity */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
            Animasyon Yoğunluğu
          </label>
          <div className="flex gap-2">
            {(["none", "low", "medium", "high"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setLocalAnimation(a)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  localAnimation === a
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.06]"
                }`}
              >
                {a === "none" ? "Yok" : a === "low" ? "Düşük" : a === "medium" ? "Orta" : "Yüksek"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => save()}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 transition-all duration-300 shadow-lg shadow-purple-500/20 cursor-pointer"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Kaydediliyor…
            </span>
          ) : (
            "Ayarları Kaydet"
          )}
        </button>
        {savedSuccess && (
          <span className="text-emerald-400 text-sm font-semibold flex items-center gap-1.5 animate-fade-in">
            ✅ Ayarlar başarıyla kaydedildi
          </span>
        )}
        {saveError && (
          <span className="text-red-400 text-sm font-semibold">
            ❌ {saveError}
          </span>
        )}
      </div>
    </div>
  );
}
