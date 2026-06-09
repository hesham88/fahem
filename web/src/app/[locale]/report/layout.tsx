import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const translations: Record<string, { title: string; description: string }> = {
    ar: {
      title: "الإبلاغ عن المشكلات — مركز التقارير الموحد لـ فاهم",
      description: "أبلغ عن أي مشكلات فنية أو أمنية أو ثغرات في منصة فاهم للمساعدة في الحفاظ على سلامة وكفاءة البيئة التعليمية.",
    },
    en: {
      title: "Report Issues — Unified Security & Tech Inbox | Fahem",
      description: "Report any technical, security, or data issues directly to the Fahem security and engineering team to keep our educational space safe.",
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

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
