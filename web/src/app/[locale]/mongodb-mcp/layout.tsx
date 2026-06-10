import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const translations: Record<string, { title: string; description: string }> = {
    ar: {
      title: "خادم MongoDB MCP — محرك البحث الدلالي وحساب الإحصائيات",
      description: "تعرف على كيفية توظيف فاهم لقدرات خوادم MongoDB MCP والبحث المتجهي وأنابيب التجميع المعقدة لإحداث قفزة نوعية في دقة وتفاعل التعليم الذكي.",
    },
    en: {
      title: "MongoDB MCP Server — Vector Embeddings & Complex Aggregations",
      description: "Discover how Fahem utilizes custom MongoDB Model Context Protocol (MCP) servers, semantic vector searches, and complex analytics pipelines to drive tutoring.",
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
          alt: "Fahem — MongoDB MCP Integration",
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

export default function MongoDBMCPLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
