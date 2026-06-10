import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const translations: Record<string, { title: string; description: string }> = {
    ar: {
      title: "المنهج والنهج التعليمي لفاهم — التعلم الذاتي القوي",
      description: "تعرف على النهج التربوي لمنصة فاهم: الانتقال للتعلم الذاتي التام (Heutagogy)، إطار OEPA المتكامل، مبادئ CCRII المعرفية، وإدارة العبء الذهني.",
    },
    en: {
      title: "Educational Approach — Heutagogy, OEPA, CCRII & Cognitive Scaffolding",
      description: "Discover Fahem's pedagogy. Learn how we transform classical teaching into robust autodidactive heutagogy through the OEPA framework, CCRII principles, and cognitive load shielding.",
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
          alt: "Fahem — Educational Philosophy & Pedagogy",
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

export default function EducationalApproachLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
