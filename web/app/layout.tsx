import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { EthereumProvider } from "@/lib/ethereum";
import { RegisterProvider } from "@/components/RegisterModal";
import { PwaRegister } from "@/components/PwaRegister";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrueKeate — Mercado Web3 & Trueke RWA",
  description: "Intercambio seguro de tokens, bienes físicos y servicios entre pares",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TrueKeate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#FAF8F5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-20 md:pb-0`}
      >
        <PwaRegister />
        <EthereumProvider>
          <RegisterProvider>
            <Header />
            <main className="min-h-[calc(100vh-4rem)] safe-area-pt">
              {children}
            </main>
            <PwaInstallBanner />
            <BottomNav />
          </RegisterProvider>
        </EthereumProvider>
      </body>
    </html>
  );
}
