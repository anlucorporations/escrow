import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { EthereumProvider } from "@/lib/ethereum";
import { SesionProvider } from "@/lib/sesion";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrueKeate — El Universo del Intercambio Descentralizado",
  description:
    "TrueKeate: plataforma Web3 de trueque de bienes, servicios y criptos con custodia atómica, reputación comunitaria y meta-transacciones sin gas.",
  icons: { icon: "/brand/TrueKeate_logo.ico" },
  manifest: "/manifest.json", // PWA instalable (D40)
  themeColor: "#1a2b4c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <EthereumProvider>
          <SesionProvider>{children}</SesionProvider>
        </EthereumProvider>
      </body>
    </html>
  );
}
