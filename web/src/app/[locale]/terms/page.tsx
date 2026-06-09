"use client";

import { useTranslation } from "../../../context/LanguageContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiFileText, FiAlertTriangle, FiCpu, FiShield } from "react-icons/fi";
import DonationCard from "../../../components/DonationCard";
import AdSensePlaceholder from "../../../components/AdSensePlaceholder";
import Link from "next/navigation";

export default function TermsPage() {
  const { t, language } = useTranslation();
  const router = useRouter();

  return (
    <div className="glass-container" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Background ambient light */}
      <div className="ambient-background">
        <div className="sphere sphere-1"></div>
        <div className="sphere sphere-2"></div>
        <div className="sphere sphere-3"></div>
      </div>

      {/* Glassmorphic Navbar */}
      <nav className="glass-nav">
        <div className="glass-nav-logo" onClick={() => router.push(`/${language}`)}>
          <span>🧠</span> {t("dashboard_title")}
        </div>
        <button className="btn btn-secondary" onClick={() => router.push(`/${language}`)}>
          <FiArrowLeft style={{ fontSize: "1.2rem", transform: language === "ar" ? "rotate(180deg)" : "none" }} />
          <span>{language === "ar" ? "العودة" : "Back"}</span>
        </button>
      </nav>

      {/* Main Container */}
      <main className="glass-hero-section" style={{ padding: "4rem 1.5rem" }}>
        <div className="glass-card" style={{ maxWidth: "850px", width: "100%", margin: "0 auto", textAlign: "start" }}>
          <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
            <FiFileText style={{ fontSize: "2rem", color: "#ffffff" }} />
          </div>

          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>{t("terms_title")}</h1>
          <p style={{ color: "#6a7c88", fontSize: "1.1rem", marginBottom: "2rem" }}>{t("terms_subtitle")}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }} className="terms-content">
            
            {/* Section 1: Introduction */}
            <section style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "1.5rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.3rem", color: "var(--primary)", marginBottom: "1rem" }}>
                <FiShield /> {language === "ar" ? "1. قبول الشروط" : "1. Acceptance of Terms"}
              </h3>
              <p style={{ color: "var(--foreground)", fontSize: "1rem", lineHeight: "1.7" }}>
                {language === "ar" 
                  ? "باستخدام منصة فاهم، فإنك توافق على الالتزام بشروط الخدمة هذه وجميع القوانين واللوائح المعمول بها. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام المنصة."
                  : "By accessing and using the Fahem platform, you agree to be bound by these terms of service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site."}
              </p>
            </section>

            {/* Section 2: AI Disclaimer */}
            <section style={{ 
              background: "rgba(243, 123, 29, 0.05)", 
              border: "1px solid var(--accent-orange)", 
              borderRadius: "var(--border-radius-md)", 
              padding: "1.5rem", 
              position: "relative" 
            }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.3rem", color: "var(--accent-orange)", marginBottom: "1rem" }}>
                <FiCpu style={{ animation: "pulse 3s infinite" }} /> {t("ai_disclaimer_title")}
              </h3>
              <p style={{ color: "var(--foreground)", fontSize: "0.95rem", lineHeight: "1.7", fontWeight: 500 }}>
                {t("ai_disclaimer_text")}
              </p>
            </section>

            {/* Section 3: Allowed Usage */}
            <section style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "1.5rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.3rem", color: "var(--primary)", marginBottom: "1rem" }}>
                <FiAlertTriangle /> {language === "ar" ? "3. شروط الترخيص والاستخدام" : "3. License & Usage Restrictions"}
              </h3>
              <p style={{ color: "var(--foreground)", fontSize: "1rem", lineHeight: "1.7" }}>
                {language === "ar"
                  ? "يُمنح المستخدم ترخيصاً مؤقتاً غير حصري للوصول إلى أدوات تحليل قاعدة البيانات. يُحظر استخدام المنصة في أي أنشطة خبيثة أو هجمات حقن الاستعلامات، أو محاولة استخراج بيانات حساسة غير مصرح بها."
                  : "Permission is granted to temporarily access the database diagnostics and AI assistance tools. You may not use this platform to execute malicious code, attempt SQL/NoSQL injections, or harvest unauthorized sensitive schemas."}
              </p>
            </section>

            {/* Section 4: Limitation of Liability */}
            <section style={{ paddingBottom: "1rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.3rem", color: "var(--primary)", marginBottom: "1rem" }}>
                ⚖️ {language === "ar" ? "4. حدود المسؤولية" : "4. Limitation of Liability"}
              </h3>
              <p style={{ color: "var(--foreground)", fontSize: "1rem", lineHeight: "1.7" }}>
                {language === "ar"
                  ? "في أي حال من الأحوال، لن تكون منصة فاهم أو مطوروها مسؤولين عن أي أضرار (بما في ذلك، دون حصر، الأضرار الناجمة عن فقدان البيانات أو الأرباح) الناتجة عن استخدام أو عدم القدرة على استخدام خدمات الذكاء الاصطناعي."
                  : "In no event shall Fahem or its developers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the AI assistant services."}
              </p>
            </section>

          </div>

          {/* Compact donation strip integrated at the footer of the document card */}
          <DonationCard variant="compact" />

          {/* Dedicated zero-CLS leaderboard ad unit */}
          <AdSensePlaceholder type="leaderboard" />
        </div>
      </main>

      <footer className="metadata-footer" style={{ zIndex: 2, paddingBottom: "2rem" }}>
        <p>{t("footer_landing")}</p>
      </footer>
    </div>
  );
}
