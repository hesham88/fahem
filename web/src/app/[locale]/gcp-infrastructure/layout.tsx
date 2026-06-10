import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const translations: Record<string, { title: string; description: string }> = {
    ar: {
      title: "البنية التحتية لـ GCP — حماية وبنية سحابية فائقة الأداء",
      description: "اكتشف كيف توظف منصة فاهم البنية السحابية لـ Google Cloud، والتوسع التلقائي المرن، وجدار الحماية Model Armor لحماية وتأمين بيئة التعلم.",
    },
    en: {
      title: "GCP Infrastructure — Resilient Cloud & Security Systems",
      description: "Explore how Fahem leverages Google Cloud Platform, auto-scaling compute clusters, and Google Cloud Armor to protect and power our learning environment.",
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
          alt: "Fahem — GCP Infrastructure Architecture",
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

export default function GCPInfrastructureLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
