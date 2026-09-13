import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { BottomNav } from "@/components/layout/BottomNav";
import { ProgressProvider } from "@/components/ProgressProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Camiño — Camino Inglés Companion",
    template: "%s · Camiño",
  },
  description:
    "An offline-ready pocket companion for the Camino Inglés from Ferrol to Santiago de Compostela — stages, sights, tips, and historical nuggets.",
  applicationName: "Camiño",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Camiño",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f3f45",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
      className={`${fraunces.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ProgressProvider>
          <ServiceWorkerRegister />
          <div className="flex min-h-dvh flex-col">{children}</div>
          <BottomNav />
        </ProgressProvider>
      </body>
    </html>
  );
}
