import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; username: string }> }): Promise<Metadata> {
  const { locale, username } = await params;

  // Capitalize the first letter for a cleaner look if it's alphanumeric
  const cleanUsername = username ? username.charAt(0).toUpperCase() + username.slice(1) : "User";

  const translations: Record<string, { title: string; description: string }> = {
    ar: {
      title: `الملف الشخصي لـ ${cleanUsername} — المساحة الأكاديمية على فاهم`,
      description: `شاهد الملف التعليمي العام والمساحة الأكاديمية لـ ${cleanUsername} على منصة فاهم، رفيق الدراسة الذكي ومكتبة المناهج بالذكاء الاصطناعي.`,
    },
    en: {
      title: `${cleanUsername}'s Public Profile — Academic Space | Fahem`,
      description: `View ${cleanUsername}'s public educational profile and academic workspace on Fahem, the AI study companion and curriculum library.`,
    },
  };

  const t = translations[locale] || translations.en;

  return {
    title: t.title,
    description: t.description,
    openGraph: {
      title: t.title,
      description: t.description,
      type: "profile",
      username: username,
      images: [
        {
          url: "/brand/og_image.png",
          width: 1200,
          height: 630,
          alt: `${cleanUsername}'s Academic Space on Fahem`,
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

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
