import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { EthereumProvider } from "@/lib/ethereum";
import { RegisterProvider } from "@/components/RegisterModal";
import { PwaRegister } from "@/components/PwaRegister";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrueKeate — Escrow & Exchange",
  description: "Intercambio seguro de tokens, bienes y servicios entre pares",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaRegister />
        <EthereumProvider>
          <RegisterProvider>
            <Header />
            {children}
          </RegisterProvider>
        </EthereumProvider>
      </body>
    </html>
  );
}
