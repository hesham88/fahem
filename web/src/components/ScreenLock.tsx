"use client";

import React, { useState, useEffect } from "react";
import { FiMonitor, FiSmartphone, FiLock } from "react-icons/fi";
import { useTranslation } from "../context/LanguageContext";

export default function ScreenLock({ children }: { children: React.ReactNode }) {
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const { language } = useTranslation();

  useEffect(() => {
    const handleResize = () => {
      // Threshold: 1024px to lock for mobile and small portrait tablets, allowing only PC/tablet landscape viewports (>=1024px)
      setIsSmallScreen(window.innerWidth < 1024);
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isSmallScreen) {
    const isAr = language === "ar";
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 font-sans">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0f172a] via-[#1e1b4b] to-[#020617] -z-10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#1e96a0]/10 rounded-full blur-[120px]" />

        {/* Card Container */}
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
          {/* Icons with Pulse Animation */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-slate-800/80 border border-slate-700/50 p-5 rounded-2xl flex items-center justify-center">
              <FiSmartphone className="w-12 h-12 text-slate-400 animate-bounce" />
              <FiLock className="w-5 h-5 text-indigo-400 absolute top-2 right-2 animate-pulse" />
            </div>
          </div>

          {/* Texts */}
          <div className="space-y-3">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
              {isAr ? "منصة فاهم التعليمية" : "Fahem Educational Platform"}
            </h1>
            <p className="text-indigo-400 font-semibold text-sm uppercase tracking-wider">
              {isAr ? "الهواتف الذكية قريباً" : "Mobile View Coming Soon"}
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              {isAr
                ? "نحن حالياً ندعم أجهزة الكمبيوتر والأجهزة اللوحية (التابلت) بوضوح كامل لضمان أفضل تجربة تعليمية تفاعلية وقراءة مدعومة بالذكاء الاصطناعي. ترقبوا إطلاق نسخة الهواتف المحمولة قريباً!"
                : "To ensure the absolute best reading and interactive AI learning experience, Fahem is currently optimized for PC, desktop, and tablet screens. Stay tuned for our mobile application release soon!"}
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

          {/* Bottom Badge */}
          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/40 px-4 py-2 rounded-full border border-slate-800">
            <FiMonitor className="w-4 h-4 text-[#1e96a0]" />
            <span>
              {isAr
                ? "يرجى فتح المنصة من جهاز لوحي أو كمبيوتر"
                : "Please open Fahem on a Tablet or Desktop"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
