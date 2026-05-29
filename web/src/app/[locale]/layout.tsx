import type { Metadata } from "next";
import { Outfit, Cairo, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { LanguageProvider, Language } from "../../context/LanguageContext";
import StickyChat from "../../components/StickyChat";
import React from "react";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const cairo = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
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

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const translations: Record<string, { title: string; description: string }> = {
    ar: {
      title: "فاهم - لوحة تحكم مساعد شريك MongoDB",
      description: "فاهم هو مساعد ذكاء اصطناعي تفاعلي مدعوم برمجياً بحزمة تطوير الوكيل من جوجل (ADK) وأدوات بروتوكول سياق نموذج MongoDB (MCP)."
    },
    en: {
      title: "Fahem - MongoDB Partner Agent Dashboard",
      description: "Fahem is an intelligent AI assistant programmatically powered by Google Agent Development Kit (ADK) and the MongoDB Model Context Protocol (MCP) server."
    },
    es: {
      title: "Fahem - Panel de control del asistente de socios de MongoDB",
      description: "Fahem es un asistente de IA inteligente desarrollado mediante Google ADK y el servidor MCP de MongoDB."
    },
    fr: {
      title: "Fahem - Tableau de bord de l'assistant partenaire MongoDB",
      description: "Fahem est un assistant IA intelligent optimisé par Google ADK et le serveur MCP MongoDB."
    },
    de: {
      title: "Fahem - MongoDB Partner-Assistenten-Dashboard",
      description: "Fahem ist ein intelligenter KI-Assistent, der mit Google ADK und dem MongoDB MCP-Server betrieben wird."
    },
    it: {
      title: "Fahem - Dashboard dell'assistente partner MongoDB",
      description: "Fahem è un assistente IA intelligente basato su Google ADK e sul server MCP di MongoDB."
    },
    zh: {
      title: "Fahem - MongoDB 合作伙伴代理仪表板",
      description: "Fahem 是一个智能 AI 助手，由 Google 代理开发套件 (ADK) 和 MongoDB 模型上下文协议 (MCP) 服务器提供支持。"
    }
  };

  const t = translations[locale] || translations.en;

  return {
    title: t.title,
    description: t.description,
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" }
      ],
      shortcut: "/favicon.svg",
      apple: "/favicon.svg",
    }
  };
}

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
    <html lang={locale} className={`${plusJakarta.variable} ${outfit.variable} ${cairo.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <LanguageProvider locale={locale as Language}>
          {children}
          <StickyChat />
        </LanguageProvider>
      </body>
    </html>
  );
}
