import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

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

export const metadata: Metadata = {
  title: "Gym Tracker MVP",
  description: "Mobile-first workout logging",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Gym Tracker MVP",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon",
    apple: "/icon",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <main className="flex-1 pb-2">{children}</main>
        <AppNav />
      </body>
    </html>
  );
}
