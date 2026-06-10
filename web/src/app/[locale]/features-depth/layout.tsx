import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const translations: Record<string, { title: string; description: string }> = {
    ar: {
      title: "الميزات المتقدمة لفاهم — عمق تعليمي وتقني متطور",
      description: "اكتشف بالتفصيل ميزات منصة فاهم: من الاختبار التلقائي وحل المسائل البرمجية، إلى المحادثة الصوتية الفورية وتتبع جلسات الطلاب المعرفية.",
    },
    en: {
      title: "In-Depth Features — Automated Testing, Voice Chat & Context Retention",
      description: "Dive deep into Fahem's features: fully automated agent simulations, real-time localized audio chat, and absolute contextual session tracking.",
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
          alt: "Fahem — In-depth Platform Features",
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

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
