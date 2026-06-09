import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const translations: Record<string, { title: string; description: string }> = {
    ar: {
      title: "شروط الخدمة — شروط الاستخدام لمنصة فاهم",
      description: "اقرأ شروط الخدمة والسياسات المنظمة لاستخدام منصة ومساعد فاهم التعليمي للطلاب والمعلمين.",
    },
    en: {
      title: "Terms of Service — Usage Guidelines for Fahem",
      description: "Read the terms of service, guidelines, and user policies governing the use of Fahem's AI educational workspace and platform.",
    },
  };

  const t = translations[locale] || translations.en;

  return {
    title: t.title,
    description: t.description,
    openGraph: {
      title: t.title,
      description: t.description,
      type: "website",
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
      title: t.title,
      description: t.description,
      images: ["/brand/og_image.png"],
    },
  };
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
