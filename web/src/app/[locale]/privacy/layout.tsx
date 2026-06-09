import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const translations: Record<string, { title: string; description: string }> = {
    ar: {
      title: "سياسة الخصوصية — التزام فاهم بحماية بياناتك",
      description: "تعرف على كيفية حماية وتأمين بيانات الطلاب، المعلمين، وأولياء الأمور في منصة فاهم التعليمية للذكاء الاصطناعي.",
    },
    en: {
      title: "Privacy Policy — Fahem's Commitment to Data Protection",
      description: "Learn how Fahem secures and respects the privacy of students, teachers, and parents within our AI-powered educational platform.",
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

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
