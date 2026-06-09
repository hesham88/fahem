"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";
import { useTranslation } from "../context/LanguageContext";

interface AdSensePlaceholderProps {
  type?: "leaderboard" | "rectangle";
}

export default function AdSensePlaceholder({ type = "leaderboard" }: AdSensePlaceholderProps) {
  const { language } = useTranslation();
  const isAr = language === "ar";
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Define sizes to completely prevent Content Layout Shift (CLS)
  const sizes = {
    leaderboard: {
      desktopWidth: "728px",
      desktopHeight: "90px",
      mobileWidth: "320px",
      mobileHeight: "50px",
    },
    rectangle: {
      desktopWidth: "336px",
      desktopHeight: "280px",
      mobileWidth: "300px",
      mobileHeight: "250px",
    }
  };

  const selected = sizes[type];
  const width = isMobile ? selected.mobileWidth : selected.desktopWidth;
  const height = isMobile ? selected.mobileHeight : selected.desktopHeight;

  return (
    <>
      {/* Load AdSense Head Script scoped strictly to this public page/placeholder */}
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3411086593254662"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

      <div 
        className="adsense-container"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          margin: "2rem auto",
          width: "100%",
          maxWidth: "100%",
          gap: "0.4rem",
          userSelect: "none"
        }}
      >
        <span 
          style={{
            fontSize: "0.65rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--foreground-muted, #64748b)",
            fontWeight: 700,
            opacity: 0.8
          }}
        >
          {isAr ? "إعلان" : "Advertisement"}
        </span>

        {/* Fixed aspect ratio/explicit dimension box to strictly prevent CLS */}
        <div
          style={{
            width: width,
            height: height,
            border: "1px dashed var(--card-border, rgba(255,255,255,0.1))",
            borderRadius: "12px",
            background: "var(--card-bg, rgba(30, 41, 59, 0.15))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.2s ease"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted, #64748b)", fontWeight: 500 }}>
              {isAr ? "مساحة إعلانية آمنة" : "Non-intrusive Ad Unit"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
