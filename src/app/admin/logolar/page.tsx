"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Logo,
  LogoInput,
  subscribeToLogos,
  createLogo,
  updateLogo,
  deleteLogo,
  reorderLogos,
  seedInitialLogos,
  DEFAULT_LOGOS,
} from "@/lib/logos";
import { deleteBlobImage, isBlobUrl } from "@/lib/blob/upload";
import LogoEditor from "@/components/admin/LogoEditor";
import BackgroundSettings from "@/components/admin/BackgroundSettings";

export default function AdminLogolarPage() {
  const [logos, setLogos] = useState<Logo[]>(DEFAULT_LOGOS);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLogo, setEditingLogo] = useState<Logo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tab, setTab] = useState<"logos" | "settings">("logos");
  const [seeding, setSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Realtime listener for logos state
  useEffect(() => {
    const unsub = subscribeToLogos((data) => {
      if (data && data.length > 0) {
        setLogos(data);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Handlers ──

  const handleCreate = useCallback(async (data: LogoInput) => {
    showStatus("⏳ Logo ekleniyor...");
    try {
      await createLogo(data);
      showStatus("✅ Yeni logo Firestore'a kaydedildi");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Logo eklenemedi";
      showStatus(`❌ ${msg}`);
      throw e;
    }
  }, []);

  const handleUpdate = useCallback(
    async (data: LogoInput) => {
      if (!editingLogo) return;
      const targetId = editingLogo.id;
      showStatus("⏳ Kaydediliyor...");
      try {
        await updateLogo(targetId, data);
        showStatus("✅ Logo güncellendi");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Logo güncellenemedi";
        showStatus(`❌ ${msg}`);
        throw e;
      }
    },
    [editingLogo]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const prevLogos = logos;
      const targetLogo = logos.find((l) => l.id === id);
      setLogos((prev) => prev.filter((l) => l.id !== id));
      setDeleteConfirm(null);
      try {
        await deleteLogo(id);
        showStatus("🗑️ Logo silindi");
        if (targetLogo?.imageUrl && isBlobUrl(targetLogo.imageUrl)) {
          deleteBlobImage(targetLogo.imageUrl).catch((err) => {
            console.warn("Logo Blob silme hatası (kayıt silindi):", err);
          });
        }
      } catch (e) {
        setLogos(prevLogos);
        const msg = e instanceof Error ? e.message : "Logo silinemedi";
        showStatus(`❌ ${msg}`);
      }
    },
    [logos]
  );

  const handleToggleActive = useCallback(async (logo: Logo) => {
    const newStatus = !logo.active;
    setLogos((prev) =>
      prev.map((l) => (l.id === logo.id ? { ...l, active: newStatus } : l))
    );
    try {
      await updateLogo(logo.id, { active: newStatus });
    } catch (e) {
      setLogos((prev) =>
        prev.map((l) => (l.id === logo.id ? { ...l, active: logo.active } : l))
      );
      const msg = e instanceof Error ? e.message : "Durum güncellenemedi";
      showStatus(`❌ ${msg}`);
    }
  }, []);

  const handleToggleFeatured = useCallback(
    async (logo: Logo) => {
      const prevLogos = logos;
      const newStatus = !logo.isFeatured;
      setLogos((prev) =>
        prev.map((l) =>
          l.id === logo.id
            ? { ...l, isFeatured: newStatus }
            : newStatus
            ? { ...l, isFeatured: false }
            : l
        )
      );
      try {
        await updateLogo(logo.id, { isFeatured: newStatus });
        showStatus(
          newStatus ? "⭐ Ana Büyük Logo yapıldı" : "⭐ Logo normale çevrildi"
        );
      } catch (e) {
        setLogos(prevLogos);
        const msg = e instanceof Error ? e.message : "Öne çıkan güncellenemedi";
        showStatus(`❌ ${msg}`);
      }
    },
    [logos]
  );

  const handleMoveUp = useCallback(
    async (index: number) => {
      if (index <= 0) return;
      const prevLogos = logos;
      const newLogos = [...logos];
      [newLogos[index - 1], newLogos[index]] = [newLogos[index], newLogos[index - 1]];
      setLogos(newLogos);
      try {
        const ids = newLogos.map((l) => l.id);
        await reorderLogos(ids);
      } catch (e) {
        setLogos(prevLogos);
        const msg = e instanceof Error ? e.message : "Sıralama kaydedilemedi";
        showStatus(`❌ ${msg}`);
      }
    },
    [logos]
  );

  const handleMoveDown = useCallback(
    async (index: number) => {
      if (index >= logos.length - 1) return;
      const prevLogos = logos;
      const newLogos = [...logos];
      [newLogos[index], newLogos[index + 1]] = [newLogos[index + 1], newLogos[index]];
      setLogos(newLogos);
      try {
        const ids = newLogos.map((l) => l.id);
        await reorderLogos(ids);
      } catch (e) {
        setLogos(prevLogos);
        const msg = e instanceof Error ? e.message : "Sıralama kaydedilemedi";
        showStatus(`❌ ${msg}`);
      }
    },
    [logos]
  );

  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      await seedInitialLogos();
      showStatus("⚡ Başlangıç logoları yüklendi");
    } catch (e) {
      console.error("Seed error:", e);
      const msg = e instanceof Error ? e.message : "Logolar yüklenemedi";
      showStatus(`❌ ${msg}`);
    } finally {
      setSeeding(false);
    }
  }, []);

  // ── Render ───────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto relative">
      {/* Toast Notification Banner */}
      {statusMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs shadow-2xl animate-bounce flex items-center gap-2">
          {statusMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Logo & Portal Yönetimi
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-mono font-medium border border-purple-500/30">
              {logos.length} Logo
            </span>
          </div>
          <p className="text-white/40 text-sm mt-1">
            Görsel URL veya Vercel Blob yükleme ile 1 Büyük + Diğer logoları yönetin.
          </p>
        </div>

        {tab === "logos" && (
          <div className="flex items-center gap-2.5">
            {logos.length === 0 && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/80 text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
              >
                {seeding ? "Oluşturuluyor..." : "⚡ Örnek Logoları Yükle"}
              </button>
            )}

            <button
              onClick={() => {
                setEditingLogo(null);
                setEditorOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all duration-200 shadow-lg shadow-white/10 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Yeni Logo Ekle
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-2xl border border-white/[0.08] mb-8 w-fit">
        {(["logos", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              tab === t
                ? "bg-white text-black shadow-md"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t === "logos" ? "✨ Logolar" : "⚙️ Portal Ayarları"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "settings" ? (
        <div className="backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] rounded-3xl p-8">
          <BackgroundSettings />
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : logos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white/[0.01] border border-white/[0.06] rounded-3xl p-12">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4 text-3xl">
            ✨
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Henüz kayıtlı logo bulunamadı
          </h3>
          <p className="text-white/40 text-sm max-w-md mb-8">
            İsterseniz tek tıkla örnek logoları yükleyebilir veya kendiniz yeni logo ekleyebilirsiniz.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-6 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all shadow-lg cursor-pointer"
            >
              {seeding ? "Yükleniyor..." : "⚡ Örnek Logoları Ekle"}
            </button>
            <button
              onClick={() => {
                setEditingLogo(null);
                setEditorOpen(true);
              }}
              className="px-6 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold text-sm border border-white/[0.1] transition-all cursor-pointer"
            >
              + Manuel Ekle
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {logos.map((logo, index) => {
            const isFirstOrFeatured = logo.isFeatured || index === 0;
            return (
              <div
                key={logo.id}
                className={`group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                  isFirstOrFeatured
                    ? "bg-amber-950/10 border-amber-500/30 hover:border-amber-500/50"
                    : logo.active
                    ? "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15]"
                    : "bg-white/[0.01] border-white/[0.04] opacity-50"
                }`}
              >
                {/* Order Controls */}
                <div className="hidden sm:flex flex-col items-center gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    ▲
                  </button>
                  <span className="text-xs text-white/50 text-center font-mono font-bold">
                    #{index + 1}
                  </span>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === logos.length - 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    ▼
                  </button>
                </div>

                {/* Thumbnail Preview */}
                <div className="w-20 h-20 rounded-2xl bg-black border border-white/[0.1] flex items-center justify-center overflow-hidden flex-shrink-0 p-2 relative">
                  {logo.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo.imageUrl}
                      alt={logo.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-2xl text-white/20">✨</span>
                  )}
                  {isFirstOrFeatured && (
                    <span className="absolute bottom-1 right-1 bg-amber-400 text-black text-[9px] font-extrabold px-1 rounded">
                      BÜYÜK
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-white truncate">
                      {logo.title}
                    </h3>
                    {isFirstOrFeatured && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                        ⭐ ANA BÜYÜK LOGO
                      </span>
                    )}
                  </div>

                  {/* Under-logo website domain */}
                  <div className="flex flex-wrap items-center gap-2.5 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-mono bg-emerald-950/30 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                      🔗 {logo.displayUrl || logo.targetUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                    <span className="text-xs text-white/30 truncate max-w-xs font-mono">
                      ➜ {logo.targetUrl}
                    </span>
                  </div>

                  {logo.subtitle && (
                    <p className="text-xs text-white/40 mt-1 truncate">{logo.subtitle}</p>
                  )}
                </div>

                {/* Featured Star Toggle */}
                <button
                  onClick={() => handleToggleFeatured(logo)}
                  title={logo.isFeatured ? "Büyük Ana Logo Yapıldı" : "Büyük Ana Logo Yap"}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    logo.isFeatured
                      ? "text-amber-400 bg-amber-400/10 border border-amber-400/30"
                      : "text-white/20 hover:text-white/60 hover:bg-white/[0.05]"
                  }`}
                >
                  ⭐
                </button>

                {/* Active Toggle */}
                <button
                  onClick={() => handleToggleActive(logo)}
                  className={`w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0 cursor-pointer ${
                    logo.active ? "bg-emerald-500" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      logo.active ? "translate-x-5" : ""
                    }`}
                  />
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                  <button
                    onClick={() => {
                      setEditingLogo(logo);
                      setEditorOpen(true);
                    }}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-white/70 hover:text-white text-sm transition-all cursor-pointer"
                    title="Düzenle"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(logo.id)}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-red-500/20 text-white/40 hover:text-red-400 text-sm transition-all cursor-pointer"
                    title="Sil"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Logo Editor Modal */}
      {editorOpen && (
        <LogoEditor
          logo={editingLogo}
          nextOrder={logos.length}
          onSave={editingLogo ? handleUpdate : handleCreate}
          onClose={() => {
            setEditorOpen(false);
            setEditingLogo(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-[#0e0e14] border border-white/[0.12] rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Logoyu Sil
            </h3>
            <p className="text-white/40 text-sm mb-6">
              Bu logo kalıcı olarak silinecek. Varsa Vercel Blob görseli de temizlenecektir. Emin misiniz?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.1] text-white/60 text-sm font-medium hover:bg-white/[0.05] transition-all cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
