import type { Metadata } from "next";
import { Outfit, Cairo, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { LanguageProvider, Language } from "../../context/LanguageContext";
import StickyChat from "../../components/StickyChat";
import AnalyticsProvider from "../../components/AnalyticsProvider";

import React from "react";
import Script from "next/script";

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
      title: "فاهم — رفيق الدراسة الذكي ومكتبة المناهج الرقمية · مدعوم من MongoDB وجوجل ADK",
      description: "فاهم هو رفيق دراسة ذكي ومكتبة مناهج تفاعلية: تعلم من الكتب المدرسية مع إجابات موثقة بالصفحات، وتدريبات ذكية، وخطط مخصصة، وملخصات، ومساحات عمل جماعية.",
      ogTitle: "فاهم — رفيق الدراسة الذكي ومكتبة المناهج الرقمية",
      ogDescription: "تعلم من الكتب المدرسية مع إجابات موثقة بالصفحات، وتدريبات ذكية، وخطط مخصصة، وملخصات، والمزيد.",
      keywords: "ذكاء اصطناعي, رفيق الدراسة, وكيل تعليمي, شريك MongoDB, بروتوكول MCP, حزمة تطوير الوكيل من جوجل, مناهج تعليمية, امتحانات, تلخيص"
    },
    en: {
      title: "Fahem — AI Study Companion & Curriculum Library · Built on MongoDB & Google ADK",
      description: "Fahem is a multilingual AI tutor and academic workspace: study real curriculum textbooks with page-cited answers, smart practice, summaries, study plans, and group assignments.",
      ogTitle: "Fahem — AI Study Companion & Curriculum Library",
      ogDescription: "Study real curriculum textbooks with page-cited answers, smart practice, personalized study plans, summaries, and group assignments.",
      keywords: "AI tutor, study companion, MongoDB Partner, Model Context Protocol, MCP, Google ADK, learning workspace, curriculum library, quiz practice"
    },
    es: {
      title: "Fahem — Compañero de estudio de IA y biblioteca de currículos · Desarrollado con MongoDB y Google ADK",
      description: "Fahem es un tutor de IA multilingüe y espacio de trabajo académico: estudie libros de texto curriculares reales con respuestas citadas por página, práctica inteligente y resúmenes.",
      ogTitle: "Fahem — Compañero de estudio de IA y biblioteca de currículos",
      ogDescription: "Estudie libros de texto con respuestas citadas por página, práctica inteligente, planes de estudio personalizados y resúmenes.",
      keywords: "tutor de IA, compañero de estudio, socio de MongoDB, MCP, Google ADK, espacio de aprendizaje, biblioteca de currículos"
    },
    fr: {
      title: "Fahem — Compagnon d'étude IA & Bibliothèque de programmes · Propulsé par MongoDB & Google ADK",
      description: "Fahem est un tuteur IA multilingue et un espace de travail académique : étudiez de vrais manuels scolaires avec des réponses citées par page, des exercices intelligents et des résumés.",
      ogTitle: "Fahem — Compagnon d'étude IA & Bibliothèque de programmes",
      ogDescription: "Étudiez de vrais manuels scolaires avec des réponses citées par page, des exercices intelligents, des plans d'étude et des résumés.",
      keywords: "tuteur IA, compagnon d'étude, partenaire MongoDB, MCP, Google ADK, espace d'apprentissage, bibliothèque de programmes"
    },
    de: {
      title: "Fahem — KI-Lernbegleiter & Lehrplanbibliothek · Erstellt mit MongoDB & Google ADK",
      description: "Fahem ist ein mehrsprachiger KI-Tutor und akademischer Arbeitsbereich: Lernen Sie echte Lehrbücher mit seitenbezogenen Antworten, intelligenten Übungen und Zusammenfassungen.",
      ogTitle: "Fahem — KI-Lernbegleiter & Lehrplanbibliothek",
      ogDescription: "Lernen Sie echte Lehrbücher mit seitenbezogenen Antworten, intelligenten Übungen, personalisierten Studienplänen und Zusammenfassungen.",
      keywords: "KI-Tutor, Lernbegleiter, MongoDB-Partner, MCP, Google ADK, Lernarbeitsbereich, Lehrplanbibliothek"
    },
    it: {
      title: "Fahem — Compagno di studio IA & Libreria di programmi · Creato con MongoDB & Google ADK",
      description: "Fahem è un tutor IA multilingue e uno spazio di lavoro accademico: studia veri libri di testo con risposte citate per pagina, esercitazioni intelligenti e riassunti.",
      ogTitle: "Fahem — Compagno di studio IA & Libreria di programmi",
      ogDescription: "Studia veri libri di testo con risposte citate per pagina, esercitazioni intelligenti, piani di studio personalizzati e riassunti.",
      keywords: "tutor IA, compagno di studio, partner MongoDB, MCP, Google ADK, spazio di apprendimento, libreria curriculare"
    },
    zh: {
      title: "Fahem — AI 学习伙伴与课程图书馆 · 基于 MongoDB 和 Google ADK 构建",
      description: "Fahem 是一个多语言 AI 导师和学术工作空间：通过引用页面的答案、智能练习和摘要学习真实的课程教科书。",
      ogTitle: "Fahem — AI 学习伙伴与课程图书馆",
      ogDescription: "通过引用页面的答案、智能练习、个性化学习计划和摘要学习真实的课程教科书。",
      keywords: "AI 导师, 学习伙伴, MongoDB 合作伙伴, MCP, Google ADK, 学习工作区, 课程图书馆"
    }
  };
  
  const t = translations[locale] || translations.en;

  return {
    title: t.title,
    description: t.description,
    keywords: t.keywords,
    metadataBase: new URL("https://fahem.pro"),
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
        "x-default": "/en",
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
          url: "/brand/og_image.png",
          width: 1200,
          height: 630,
          alt: "Fahem — AI Study Companion",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t.ogTitle,
      description: t.ogDescription,
      images: ["/brand/og_image.png"],
    },
    icons: {
      icon: [
        { url: "/brand/logo_compressed.png", type: "image/png" }
      ],
      shortcut: "/brand/logo_compressed.png",
      apple: "/brand/logo_compressed.png",
    }
  };
}

export function generateStaticParams() {
  return [
    { locale: "en" },
    { locale: "ar" },
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
    ar: { description: "فاهم هو رفيق دراسة ذكي ومكتبة مناهج تفاعلية: تعلم من الكتب المدرسية مع إجابات موثقة بالصفحات، وتدريبات ذكية، وخطط مخصصة، وملخصات، ومساحات عمل جماعية." },
    en: { description: "Fahem is a multilingual AI tutor and academic workspace: study real curriculum textbooks with page-cited answers, smart practice, summaries, study plans, and group assignments." },
    es: { description: "Fahem es un compañero de estudio de IA y biblioteca de currículos: estudie libros de texto con respuestas citadas por página, práctica inteligente y resúmenes." },
    fr: { description: "Fahem est un compagnon d'étude IA et une bibliothèque de programmes : étudiez des manuels scolaires avec des réponses citées, des exercices intelligents et des résumés." },
    de: { description: "Fahem ist ein lizenziertes KI-Lernbegleiter- und Lehrplanarchiv: Lernen Sie echte Lehrbücher mit seitenbezogenen Antworten und intelligenten Übungen." },
    it: { description: "Fahem è un compagno di studio IA e una libreria curriculare: studia veri libri di testo con risposte citate per pagina ed esercitazioni intelligenti." },
    zh: { description: "Fahem 是一个多语言 AI 学习伙伴与课程图书馆：通过引用页面的答案、智能练习和摘要学习真实的课程教科书。" }
  };

  const activeDescription = translations[locale]?.description || translations.en.description;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": locale === "ar" ? "فاهم" : "Fahem",
    "url": `https://fahem.pro/${locale}`,
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
        <link rel="icon" href="/brand/logo_compressed.png" type="image/png" />
        <link rel="shortcut icon" href="/brand/logo_compressed.png" type="image/png" />
        <link rel="apple-touch-icon" href="/brand/logo_compressed.png" type="image/png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3411086593254662"
          crossOrigin="anonymous"
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
