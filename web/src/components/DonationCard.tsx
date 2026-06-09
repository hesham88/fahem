"use client";

import React from "react";
import { FiCoffee, FiHeart, FiGift, FiArrowUpRight } from "react-icons/fi";
import { useTranslation } from "../context/LanguageContext";

interface DonationCardProps {
  variant?: "hero" | "section" | "compact";
}

export default function DonationCard({ variant = "section" }: DonationCardProps) {
  const { language } = useTranslation();
  const isAr = language === "ar";

  const t = {
    heroTitle: isAr ? "ادعم استمرارية فاهم" : "Support Fahem's Servers",
    heroDesc: isAr 
      ? "تساهم تبرعاتك البسيطة في إبقاء خوادم الذكاء الاصطناعي نشطة مجاناً للجميع." 
      : "Your micro-donations keep our AI tutors active and free for everyone.",
    sectionTitle: isAr ? "ادعم مسيرة فاهم التعليمية" : "Support Fahem's Journey",
    sectionDesc: isAr
      ? "فاهم هو مشروع مستقل بُني بكل حب لتبسيط التعليم التفاعلي بالذكاء الاصطناعي. دعمك يساهم مباشرة في تغطية تكاليف تشغيل الخوادم، واستدعاء واجهات البرمجة (جوجل جيميناي، ومونجو دي بي Atlas)، ومساعدتنا على التطوير المستمر."
      : "Fahem is an independent, non-profit-driven tool built to democratize interactive AI learning. Your contributions directly cover real-time server computations, vector index searches, and API endpoints.",
    coffeeLabel: isAr ? "فنجان قهوة" : "Buy me a coffee",
    mealLabel: isAr ? "وجبة غداء" : "Invite me for a meal",
    surpriseLabel: isAr ? "مفاجأة مميزة" : "Surprise me",
    coffeePrice: "$5",
    mealPrice: "$29",
    surprisePrice: "Custom",
    whyDonate: isAr ? "لماذا دعم فاهم؟" : "Why support Fahem?",
    trustBadge: isAr ? "أمن وسريع عبر PayPal" : "Secure one-click PayPal checkout",
    compactText: isAr 
      ? "هل أعجبك فاهم؟ ساعدنا في إبقاء خوادمه نشطة بتبرع بسيط:" 
      : "Love Fahem? Help keep it running with a quick contribution:"
  };

  const paypalLinks = {
    coffee: "https://www.paypal.com/ncp/payment/FKBWYZGBNDKU4",
    meal: "https://www.paypal.com/ncp/payment/D5RHBB8M694MN",
    surprise: "https://www.paypal.com/ncp/payment/QE894AKFVYLZS"
  };

  if (variant === "hero") {
    return (
      <div 
        className="donation-hero-card"
        style={{
          background: "rgba(30, 41, 59, 0.4)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          padding: "1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxWidth: "480px",
          width: "100%",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)",
          transition: "all 0.3s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiHeart style={{ color: "#ef4444", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-yellow)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t.heroTitle}
          </span>
        </div>
        
        <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted, #94a3b8)", margin: 0, lineHeight: "1.4" }}>
          {t.heroDesc}
        </p>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a
            href={paypalLinks.coffee}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: "1 1 0px",
              minWidth: "110px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              background: "rgba(251, 191, 36, 0.15)",
              border: "1px solid rgba(251, 191, 36, 0.3)",
              color: "#fbbf24",
              borderRadius: "10px",
              padding: "0.4rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(251, 191, 36, 0.25)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(251, 191, 36, 0.15)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <FiCoffee /> {t.coffeeLabel} ({t.coffeePrice})
          </a>

          <a
            href={paypalLinks.meal}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: "1 1 0px",
              minWidth: "110px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              borderRadius: "10px",
              padding: "0.4rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <FiHeart /> {t.mealLabel} ({t.mealPrice})
          </a>

          <a
            href={paypalLinks.surprise}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: "1 1 0px",
              minWidth: "110px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              background: "rgba(168, 85, 247, 0.15)",
              border: "1px solid rgba(168, 85, 247, 0.3)",
              color: "#c084fc",
              borderRadius: "10px",
              padding: "0.4rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(168, 85, 247, 0.25)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(168, 85, 247, 0.15)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <FiGift /> {t.surpriseLabel}
          </a>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div 
        className="donation-compact-strip"
        style={{
          background: "var(--card-bg, rgba(30, 41, 59, 0.2))",
          backdropFilter: "blur(8px)",
          border: "1px solid var(--card-border, rgba(255, 255, 255, 0.05))",
          borderRadius: "16px",
          padding: "0.75rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          width: "100%",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          margin: "1rem 0"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiCoffee style={{ color: "#fbbf24", animation: "pulse 3s infinite" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--foreground)" }}>
            {t.compactText}
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a
            href={paypalLinks.coffee}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              background: "rgba(251, 191, 36, 0.1)",
              border: "1px solid rgba(251, 191, 36, 0.2)",
              color: "#fbbf24",
              borderRadius: "8px",
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(251, 191, 36, 0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(251, 191, 36, 0.1)"; }}
          >
            {t.coffeeLabel} ({t.coffeePrice})
          </a>

          <a
            href={paypalLinks.meal}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#f87171",
              borderRadius: "8px",
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"; }}
          >
            {t.mealLabel} ({t.mealPrice})
          </a>

          <a
            href={paypalLinks.surprise}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              background: "rgba(168, 85, 247, 0.1)",
              border: "1px solid rgba(168, 85, 247, 0.2)",
              color: "#c084fc",
              borderRadius: "8px",
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(168, 85, 247, 0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(168, 85, 247, 0.1)"; }}
          >
            {t.surpriseLabel}
          </a>
        </div>
      </div>
    );
  }

  // Default: section
  return (
    <section 
      id="donation-section"
      style={{
        padding: "5rem 2rem",
        background: "var(--card-bg, rgba(15, 23, 42, 0.4))",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid var(--card-border, rgba(255, 255, 255, 0.05))",
        borderBottom: "1px solid var(--card-border, rgba(255, 255, 255, 0.05))",
        position: "relative",
        overflow: "hidden",
        width: "100%"
      }}
    >
      {/* Decorative Blur Spheres */}
      <div style={{ position: "absolute", top: "50%", left: "10%", width: "300px", height: "300px", background: "rgba(168, 85, 247, 0.05)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "15%", width: "250px", height: "300px", background: "rgba(59, 130, 246, 0.05)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "3rem" }}>
        
        {/* Header Title Block */}
        <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "inline-flex", alignSelf: "center", alignItems: "center", gap: "0.5rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#f87171", padding: "0.35rem 1rem", borderRadius: "100px", fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <FiHeart style={{ animation: "pulse 1.5s infinite" }} />
            <span>{t.whyDonate}</span>
          </div>

          <h2 style={{ fontSize: "2.25rem", fontWeight: 800, margin: 0, letterSpacing: "-0.025em", color: "var(--foreground)" }}>
            {t.sectionTitle}
          </h2>

          <p style={{ fontSize: "1.05rem", lineHeight: "1.6", color: "var(--foreground-muted, #94a3b8)", margin: 0 }}>
            {t.sectionDesc}
          </p>
        </div>

        {/* Options Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", width: "100%" }}>
          
          {/* Coffee Card */}
          <div 
            style={{
              background: "var(--card-bg, rgba(30, 41, 59, 0.3))",
              border: "1px solid var(--card-border, rgba(255, 255, 255, 0.05))",
              borderRadius: "24px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "1.25rem",
              transition: "transform 0.3s, border-color 0.3s",
              boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.1)"
            }}
            className="donation-card-item"
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "var(--card-border, rgba(255, 255, 255, 0.05))"; }}
          >
            <div style={{ background: "rgba(251, 191, 36, 0.1)", borderRadius: "20px", display: "flex", padding: "1rem" }}>
              <FiCoffee style={{ width: "2rem", height: "2rem", color: "#fbbf24" }} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--foreground)" }}>{t.coffeeLabel}</h3>
              <p style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, color: "#fbbf24" }}>{t.coffeePrice}</p>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted, #94a3b8)", margin: 0, lineHeight: "1.5" }}>
              {isAr ? "دعم سريع يعادل قيمة كوب قهوة واحد لمساعدتنا على البقاء نشطين." : "A quick, warm micro-donation equivalent to a single coffee cup to keep our APIs fueled."}
            </p>
            <a 
              href={paypalLinks.coffee} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                marginTop: "auto",
                width: "100%",
                background: "linear-gradient(135deg, #fbbf24, #d97706)",
                color: "#000000",
                border: "none",
                borderRadius: "14px",
                padding: "0.8rem 1.5rem",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "box-shadow 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(251, 191, 36, 0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
            >
              {isAr ? "تبرع الآن" : "Donate Now"} <FiArrowUpRight />
            </a>
          </div>

          {/* Meal Card */}
          <div 
            style={{
              background: "var(--card-bg, rgba(30, 41, 59, 0.3))",
              border: "1px solid var(--card-border, rgba(255, 255, 255, 0.05))",
              borderRadius: "24px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "1.25rem",
              position: "relative",
              transition: "transform 0.3s, border-color 0.3s",
              boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.1)"
            }}
            className="donation-card-item"
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "var(--card-border, rgba(255, 255, 255, 0.05))"; }}
          >
            {/* Highly Recommended Badge */}
            <div style={{ position: "absolute", top: "-12px", background: "linear-gradient(135deg, #ef4444, #b91c1c)", color: "#ffffff", fontSize: "0.7rem", fontWeight: 800, padding: "0.3rem 1rem", borderRadius: "50px", textTransform: "uppercase", letterSpacing: "0.05em", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)" }}>
              {isAr ? "الأكثر تأثيراً" : "Most Impactful"}
            </div>

            <div style={{ background: "rgba(239, 68, 68, 0.1)", borderRadius: "20px", display: "flex", padding: "1rem" }}>
              <FiHeart style={{ width: "2rem", height: "2rem", color: "#f87171" }} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--foreground)" }}>{t.mealLabel}</h3>
              <p style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, color: "#f87171" }}>{t.mealPrice}</p>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted, #94a3b8)", margin: 0, lineHeight: "1.5" }}>
              {isAr ? "دعم سخي يغطي حوسبة ليلة كاملة واستدعاءات نماذج التفسير البصري للكتب." : "Sponsors a full week of heavy Vector search computation and AI translation runs."}
            </p>
            <a 
              href={paypalLinks.meal} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                marginTop: "auto",
                width: "100%",
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                color: "#ffffff",
                border: "none",
                borderRadius: "14px",
                padding: "0.8rem 1.5rem",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "box-shadow 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(239, 68, 68, 0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
            >
              {isAr ? "ادعم الآن" : "Support Now"} <FiArrowUpRight />
            </a>
          </div>

          {/* Surprise Card */}
          <div 
            style={{
              background: "var(--card-bg, rgba(30, 41, 59, 0.3))",
              border: "1px solid var(--card-border, rgba(255, 255, 255, 0.05))",
              borderRadius: "24px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "1.25rem",
              transition: "transform 0.3s, border-color 0.3s",
              boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.1)"
            }}
            className="donation-card-item"
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "var(--card-border, rgba(255, 255, 255, 0.05))"; }}
          >
            <div style={{ background: "rgba(168, 85, 247, 0.1)", borderRadius: "20px", display: "flex", padding: "1rem" }}>
              <FiGift style={{ width: "2rem", height: "2rem", color: "#c084fc" }} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--foreground)" }}>{t.surpriseLabel}</h3>
              <p style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, color: "#c084fc" }}>{t.surprisePrice}</p>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted, #94a3b8)", margin: 0, lineHeight: "1.5" }}>
              {isAr ? "اختر مبلغا مخصصاً يناسب رغبتك في دعم وتطوير المنصة مستقبلاً." : "Specify a customized amount on PayPal to fuel Fahem's future features and maintenance."}
            </p>
            <a 
              href={paypalLinks.surprise} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                marginTop: "auto",
                width: "100%",
                background: "linear-gradient(135deg, #a855f7, #7e22ce)",
                color: "#ffffff",
                border: "none",
                borderRadius: "14px",
                padding: "0.8rem 1.5rem",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "box-shadow 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(168, 85, 247, 0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
            >
              {isAr ? "تبرع بقيمة مخصصة" : "Surprise Us"} <FiArrowUpRight />
            </a>
          </div>

        </div>

        {/* Footer Note */}
        <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--foreground-muted, #64748b)" }}>
          {t.trustBadge}
        </div>

      </div>
    </section>
  );
}
