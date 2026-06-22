import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, IBM_Plex_Mono } from "next/font/google";

import { AppNav } from "@/components/AppNav";

import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gym Tracker",
  description: "Mobile-first workout logging",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Gym Tracker",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon",
    apple: "/icon",
  },
};

export const viewport: Viewport = {
  themeColor: "#c9733d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
        <main className="mx-auto w-full max-w-[430px] flex-1 pb-2 sm:max-w-4xl md:max-w-6xl">
          {children}
        </main>
        <AppNav />
      </body>
    </html>
  );
}
