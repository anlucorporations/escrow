import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { EthereumProvider } from "@/lib/ethereum";
import { RegisterProvider } from "@/components/RegisterModal";
import { PwaRegister } from "@/components/PwaRegister";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrueKeat — Mercado Web3, Custodia Atómica & Trueke RWA",
  description: "Intercambio seguro y descentralizado de tokens, bienes físicos RWA y servicios certificados entre pares",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TrueKeat",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#F8F9FA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} ${montserrat.variable} bg-[#F8F9FA] text-[#1A2B4C] antialiased pb-20 md:pb-0 font-sans`}
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
