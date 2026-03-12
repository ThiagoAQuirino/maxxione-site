import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import WhatsAppFloat from "@/components/WhatsAppFloat";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MaxxiOne | Fitness e Praia — Maringá-PR",
  description:
    "Loja de moda fitness e praia em Maringá-PR. Roupas fitness, biquínis, conjuntos e muito mais. Atendemos pelo WhatsApp e na loja física.",
  keywords: "moda fitness, moda praia, biquíni, legging, Maringá, MaxxiOne",
  openGraph: {
    title: "MaxxiOne | Fitness e Praia",
    description: "Moda fitness e praia em Maringá-PR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        {children}
        <WhatsAppFloat />
      </body>
    </html>
  );
}
