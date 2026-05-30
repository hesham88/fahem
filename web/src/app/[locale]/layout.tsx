import type { Metadata } from "next";
import { Outfit, Cairo, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { LanguageProvider, Language } from "../../context/LanguageContext";
import StickyChat from "../../components/StickyChat";
import AnalyticsProvider from "../../components/AnalyticsProvider";
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
  
  const translations: Record<string, { title: string; description: string; ogTitle: string; ogDescription: string; keywords: string }> = {
    ar: {
      title: "فاهم - الرئيسية مساعد شريك MongoDB",
      description: "فاهم هو مساعد ذكاء اصطناعي تفاعلي مدعوم برمجياً بحزمة تطوير الوكيل من جوجل (ADK) وأدوات بروتوكول سياق نموذج MongoDB (MCP).",
      ogTitle: "فاهم - وكيل قاعدة بيانات ذكي مع MongoDB MCP",
      ogDescription: "لوحة تحكم ذكاء اصطناعي متطورة للتفاعل الفوري مع قواعد بيانات MongoDB Atlas وإدارتها برمجياً.",
      keywords: "ذكاء اصطناعي, وكيل قاعدة بيانات, شريك MongoDB, بروتوكول MCP, حزمة تطوير الوكيل من جوجل, Next.js, Firebase, الرئيسية"
    },
    en: {
      title: "Fahem - MongoDB Partner Agent Home",
      description: "Fahem is an intelligent AI assistant programmatically powered by Google Agent Development Kit (ADK) and the MongoDB Model Context Protocol (MCP) server.",
      ogTitle: "Fahem - Intelligent Database Agent with MongoDB MCP",
      ogDescription: "An advanced, elegant AI dashboard to programmatically analyze, query, and manage MongoDB Atlas database clusters in real-time.",
      keywords: "AI Assistant, Database Agent, MongoDB Partner, Model Context Protocol, MCP, Google ADK, Next.js, Firebase, Home"
    },
    es: {
      title: "Fahem - Panel de control del asistente de socios de MongoDB",
      description: "Fahem es un asistente de IA inteligente desarrollado mediante Google ADK y el servidor MCP de MongoDB.",
      ogTitle: "Fahem - Agente de Base de Datos Inteligente con MongoDB MCP",
      ogDescription: "Un panel de IA avanzado y elegante para analizar, consultar y gestionar clústeres de bases de datos MongoDB Atlas en tiempo real.",
      keywords: "Asistente de IA, Agente de Base de Datos, Socio de MongoDB, Protocolo de Contexto de Modelo, MCP, Google ADK, Next.js, Firebase, Panel"
    },
    fr: {
      title: "Fahem - Tableau de bord de l'assistant partenaire MongoDB",
      description: "Fahem est un assistant IA intelligent optimisé par Google ADK et le serveur MCP MongoDB.",
      ogTitle: "Fahem - Agent de Base de Données Intelligent avec MongoDB MCP",
      ogDescription: "Un tableau de bord IA avancé et élégant pour analyser, interroger et gérer des clusters de bases de données MongoDB Atlas en réel.",
      keywords: "Assistant IA, Agent de Base de Données, Partenaire MongoDB, Protocole de Contexte de Modèle, MCP, Google ADK, Next.js, Firebase, Tableau de bord"
    },
    de: {
      title: "Fahem - MongoDB Partner-Assistenten-Dashboard",
      description: "Fahem ist ein intelligenter KI-Assistent, der mit Google ADK und dem MongoDB MCP-Server betrieben wird.",
      ogTitle: "Fahem - Intelligenter Datenbank-Agent mit MongoDB MCP",
      ogDescription: "Ein fortschrittliches, elegantes KI-Dashboard zur programmgesteuerten Echtzeit-Analyse, Abfrage und Verwaltung von MongoDB Atlas-Datenbankclustern.",
      keywords: "KI-Assistent, Datenbank-Agent, MongoDB-Partner, Modellkontextprotokoll, MCP, Google ADK, Next.js, Firebase, Dashboard"
    },
    it: {
      title: "Fahem - Dashboard dell'assistente partner MongoDB",
      description: "Fahem è un assistente IA intelligente basato su Google ADK e sul server MCP di MongoDB.",
      ogTitle: "Fahem - Agente di Database Intelligente con MongoDB MCP",
      ogDescription: "Una dashboard IA avanzata ed elegante per analizzare, interrogare e gestire i cluster di database MongoDB Atlas in tempo reale.",
      keywords: "Assistente IA, Agente di Database, Partner MongoDB, Protocollo del Contesto del Modello, MCP, Google ADK, Next.js, Firebase, Dashboard"
    },
    zh: {
      title: "Fahem - MongoDB 合作伙伴代理仪表板",
      description: "Fahem 是一个智能 AI 助手，由 Google 代理开发套件 (ADK) 和 MongoDB 模型上下文协议 (MCP) 服务器提供支持。",
      ogTitle: "Fahem - 基于 MongoDB MCP 的智能数据库代理",
      ogDescription: "一个先进且优雅的 AI 仪表板，能够以编程方式实时分析、查询和管理 MongoDB Atlas 数据库集群。",
      keywords: "AI 助手, 数据库代理, MongoDB 合作伙伴, 模型上下文协议, MCP, Google ADK, Next.js, Firebase, 仪表板"
    }
  };
  
  const t = translations[locale] || translations.en;

  return {
    title: t.title,
    description: t.description,
    keywords: t.keywords,
    metadataBase: new URL("https://fahem-88d40.web.app"),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ar: "/ar",
        en: "/en",
        es: "/es",
        fr: "/fr",
        de: "/de",
        it: "/it",
        zh: "/zh",
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "ar" ? "ar_AR" : "en_US",
      url: `/${locale}`,
      title: t.ogTitle,
      description: t.ogDescription,
      siteName: "Fahem",
      images: [
        {
          url: "/favicon.svg",
          width: 512,
          height: 512,
          alt: "Fahem Logo",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: t.ogTitle,
      description: t.ogDescription,
      images: ["/favicon.svg"],
    },
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

  const translations: Record<string, { description: string }> = {
    ar: { description: "فاهم هو مساعد ذكاء اصطناعي تفاعلي مدعوم برمجياً بحزمة تطوير الوكيل من جوجل (ADK) وأدوات بروتوكول سياق نموذج MongoDB (MCP)." },
    en: { description: "Fahem is an intelligent AI assistant programmatically powered by Google Agent Development Kit (ADK) and the MongoDB Model Context Protocol (MCP) server." },
    es: { description: "Fahem es un asistente de IA inteligente desarrollado mediante Google ADK y el servidor MCP de MongoDB." },
    fr: { description: "Fahem est un assistant IA intelligent optimisé par Google ADK et le serveur MCP MongoDB." },
    de: { description: "Fahem ist ein intelligenter KI-Assistent, der mit Google ADK und dem MongoDB MCP-Server betrieben wird." },
    it: { description: "Fahem è un assistente IA intelligente basato su Google ADK e sul server MCP di MongoDB." },
    zh: { description: "Fahem 是一个智能 AI 助手，由 Google 代理开发套件 (ADK) 和 MongoDB 模型上下文协议 (MCP) 服务器提供支持。" }
  };

  const activeDescription = translations[locale]?.description || translations.en.description;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": locale === "ar" ? "فاهم" : "Fahem",
    "url": `https://fahem-88d40.web.app/${locale}`,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All",
    "description": activeDescription,
    "creator": {
      "@type": "Organization",
      "name": "Fahem Team",
      "url": "https://github.com/hesham88/fahem"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${plusJakarta.variable} ${outfit.variable} ${cairo.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" type="image/svg+xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <LanguageProvider locale={locale as Language}>
          <AnalyticsProvider>
            {children}
            <StickyChat />
          </AnalyticsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
