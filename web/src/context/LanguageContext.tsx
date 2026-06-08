"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export type Language = "en" | "ar";

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

import en from "../dictionaries/en.json";
import ar from "../dictionaries/ar.json";

const translations: Record<Language, any> = {
  en,
  ar
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children, locale }: { children: React.ReactNode; locale?: Language }) {
  const [language, setLanguageState] = useState<Language>(locale || "en");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (locale && translations[locale] && locale !== language) {
      setLanguageState(locale);
    } else {
      const savedLang = localStorage.getItem("fahem_language") as Language;
      if (savedLang && translations[savedLang]) {
        setLanguageState(savedLang);
      }
    }
  }, [locale]);

  const setLanguage = (lang: Language) => {
    if (translations[lang]) {
      setLanguageState(lang);
      localStorage.setItem("fahem_language", lang);
      document.cookie = `fahem_language=${lang}; path=/; max-age=31536000; SameSite=Lax`;
      
      // Navigate to the new URL with the new locale segment
      const segments = pathname.split("/");
      if (segments.length > 1) {
        const firstSegment = segments[1];
        if (translations[firstSegment as Language]) {
          segments[1] = lang;
          router.push(segments.join("/"));
        } else {
          router.push(`/${lang}${pathname}`);
        }
      } else {
        router.push(`/${lang}`);
      }
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations["en"]?.[key] || key;
  };

  const dir = language === "ar" ? "rtl" : "ltr";

  // Enforce HTML attributes dynamically when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
