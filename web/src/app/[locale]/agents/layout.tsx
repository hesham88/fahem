import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const translations: Record<string, { title: string; description: string }> = {
    ar: {
      title: "الوكلاء الذكيون — منظومة الذكاء الاصطناعي التفاعلية",
      description: "اكتشف منظومة وكلاء فاهم الذكية: معالجة المناهج، الاستضافة التفاعلية، والزاحف الذكي الآمن، وكيفية ترابطهم لتوفير دعم تعليمي متكامل.",
    },
    en: {
      title: "AI Swarm Agents — Intelligent Ingestion, Execution & Web Discovery",
      description: "Explore Fahem's cooperative agent architecture. Learn how our ingestion, sandboxed execution, and robust web crawlers collaborate to enrich learning.",
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
          alt: "Fahem — AI Swarm Agents Architecture",
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

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
