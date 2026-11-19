import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import SiteFooter from "@/components/layout/SiteFooter";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://kehf.com.tr"),
  title: {
    default: "KEHF Group — Kurumsal Marka Portalı",
    template: "%s | KEHF Group",
  },
  description:
    "KEHF Group ve grup bünyesindeki markaların resmi kurumsal portalı.",
  applicationName: "KEHF Group",
  authors: [{ name: "KEHF Group" }],
  creator: "Umut Yoncalık",
  publisher: "KEHF Group",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "KEHF Group",
    title: "KEHF Group — Kurumsal Marka Portalı",
    description:
      "KEHF Group ve grup bünyesindeki markaların resmi kurumsal portalı.",
    images: [
      {
        url: "/logos/kehf.png",
        alt: "KEHF Group Kurumsal Logosu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KEHF Group — Kurumsal Marka Portalı",
    description:
      "KEHF Group ve grup bünyesindeki markaların resmi kurumsal portalı.",
    images: ["/logos/kehf.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-screen flex flex-col font-sans bg-[#000000] text-white">
        <div className="flex-1 flex flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
