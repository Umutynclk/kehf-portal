"use client";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AdminGuard from "@/components/admin/AdminGuard";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const nav = [
    { href: "/admin/logolar", label: "Logo Yönetimi", icon: "✨" },
    { href: "/", label: "Canlı Portal", icon: "🌐" },
  ];

  async function handleSignOut() {
    await logout();
    router.replace("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-[#050508] text-white">
      {/* ─── Desktop Sidebar ───────────────────────────── */}
      <aside className="hidden md:flex w-64 border-r border-white/[0.08] bg-[#09090e]/80 backdrop-blur-xl flex-col shrink-0">
        {/* Brand */}
        <div className="p-6 border-b border-white/[0.08]">
          <Link href="/admin/logolar" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold text-sm shadow-md">
              K
            </div>
            <div>
              <span className="text-white font-bold text-sm tracking-tight block">KEHF PORTAL</span>
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
                Yönetim Paneli
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-white text-black font-semibold shadow-lg shadow-white/5"
                    : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Storage Info + Logout */}
        <div className="p-4 border-t border-white/[0.08] space-y-3">
          <div className="px-3 py-2 bg-white/[0.03] rounded-xl border border-white/[0.05]">
            <p className="text-[11px] text-white/40">Görsel Depolama</p>
            <p className="text-xs text-white/80 font-mono font-medium">Vercel Blob (Public)</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <span>↩</span> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* ─── Page wrapper ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Top Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#09090e]/90 backdrop-blur-xl">
          <Link href="/admin/logolar" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs shadow-md">
              K
            </div>
            <span className="text-white font-bold text-sm tracking-tight">KEHF PORTAL</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/[0.08] cursor-pointer"
          >
            ↩ Çıkış
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-[#000000] pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center bg-[#09090e]/95 backdrop-blur-xl border-t border-white/[0.08] z-50">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-all ${
                  active ? "text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Do not wrap login page in AdminGuard or AdminShell!
  if (pathname === "/admin/login") {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <AuthProvider>
      <AdminGuard>
        <AdminShell>{children}</AdminShell>
      </AdminGuard>
    </AuthProvider>
  );
}
