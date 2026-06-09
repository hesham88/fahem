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

  const className = type === "leaderboard" ? "ads-leaderboard" : "ads-rectangle";

  return (
    <>
      {/* Load AdSense Head Script scoped strictly to this public page/placeholder */}
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3411086593254662"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .ads-leaderboard {
          width: 728px;
          height: 90px;
        }
        .ads-rectangle {
          width: 336px;
          height: 280px;
        }
        @media (max-width: 767px) {
          .ads-leaderboard {
            width: 320px !important;
            height: 50px !important;
          }
          .ads-rectangle {
            width: 300px !important;
            height: 250px !important;
          }
        }
      `}} />

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
          className={className}
          style={{
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
