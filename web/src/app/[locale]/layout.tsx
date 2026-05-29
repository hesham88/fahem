import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { LanguageProvider, Language } from "../../context/LanguageContext";
import React from "react";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fahem - MongoDB Partner Agent Dashboard",
  description: "Fahem is an intelligent AI assistant programmatically powered by Google Agent Development Kit (ADK) and the MongoDB Model Context Protocol (MCP) server.",
  icons: {
    icon: "/favicon.ico",
  },
};

export function generateStaticParams() {
  return [
    { locale: "en" },
    { locale: "ar" },
    { locale: "es" },
    { locale: "fr" },
    { locale: "de" },
    { locale: "zh" },
    { locale: "it" },
  ];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <html lang={locale} className={`${plusJakarta.variable} ${playfair.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <LanguageProvider locale={locale as Language}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
