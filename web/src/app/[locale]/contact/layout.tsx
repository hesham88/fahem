import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const translations: Record<string, { title: string; description: string }> = {
    ar: {
      title: "اتصل بنا — تواصل مع فريق فاهم ومساعد الذكاء الاصطناعي",
      description: "هل لديك استفسارات أو ملاحظات؟ اتصل بنا للتواصل مع فريق الدعم ومساعد الذكاء الاصطناعي لـ فاهم والحصول على مساعدة فورية.",
    },
    en: {
      title: "Contact Us — Connect with Fahem Team & AI Companion",
      description: "Have questions, feedback, or suggestions? Reach out to Fahem support team and our intelligent AI companion for real-time assistance.",
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

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
