"use client";

import { useTranslation } from "../../../context/LanguageContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiLock, FiEye, FiDatabase, FiUserCheck } from "react-icons/fi";

export default function PrivacyPage() {
  const { t, language } = useTranslation();
  const router = useRouter();

  return (
    <div className="glass-container">
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
          <FiArrowLeft style={{ fontSize: "1.2rem" }} />
          <span>{language === "ar" ? "العودة" : "Back"}</span>
        </button>
      </nav>

      {/* Main Container */}
      <main className="glass-hero-section" style={{ padding: "4rem 1.5rem" }}>
        <div className="glass-card" style={{ maxWidth: "850px", width: "100%", margin: "0 auto", textAlign: "left" }}>
          <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
            <FiLock style={{ fontSize: "2rem", color: "#ffffff" }} />
          </div>

          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>{t("privacy_title")}</h1>
          <p style={{ color: "#6a7c88", fontSize: "1.1rem", marginBottom: "2rem" }}>{t("privacy_subtitle")}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }} className="privacy-content">
            
            {/* Section 1: Information Gathering */}
            <section style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "1.5rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.3rem", color: "var(--primary)", marginBottom: "1rem" }}>
                <FiEye /> {language === "ar" ? "1. البيانات التي نجمعها" : "1. Data Collection & Gathering"}
              </h3>
              <p style={{ color: "var(--foreground)", fontSize: "1rem", lineHeight: "1.7" }}>
                {language === "ar" 
                  ? "نحن نجمع فقط البيانات اللازمة لتوفير وخدمة لوحة تحكم الوكيل والمساعد الذكي، بما في ذلك البريد الإلكتروني الخاص بك عند تسجيل الدخول عبر Google، ومعلومات تعريف قاعدة البيانات للاتصال بـ Atlas."
                  : "We only collect data necessary to provide the AI Assistant Dashboard services. This includes your email and avatar when signing in through Google, and cluster metadata required to safely connect with your MongoDB Atlas database."}
              </p>
            </section>

            {/* Section 2: Database Safeguards */}
            <section style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "1.5rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.3rem", color: "var(--primary)", marginBottom: "1rem" }}>
                <FiDatabase /> {language === "ar" ? "2. حماية قواعد البيانات" : "2. Database Safekeeping & Processing"}
              </h3>
              <p style={{ color: "var(--foreground)", fontSize: "1rem", lineHeight: "1.7" }}>
                {language === "ar"
                  ? "يتم حماية بيانات الاتصال الخاصة بقواعد البيانات وسلاسل الاتصال الخاصة بك بشكل كامل وتشفيرها، ويتم تمريرها محلياً فقط لطلب خادم بروتوكول سياق نموذج (MCP). لا يتم تخزين تفاصيل قاعدة البيانات الخاصة بك بشكل دائم على خوادمنا."
                  : "Your MongoDB connection strings and credentials are treated with the highest security priority. They are encrypted and used solely to establish real-time sessions with the MongoDB MCP server. We do not permanently store or cache your database credentials."}
              </p>
            </section>

            {/* Section 3: User Rights */}
            <section style={{ paddingBottom: "1rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.3rem", color: "var(--primary)", marginBottom: "1rem" }}>
                <FiUserCheck /> {language === "ar" ? "3. حقوق المستخدم" : "3. User Data Rights & Control"}
              </h3>
              <p style={{ color: "var(--foreground)", fontSize: "1rem", lineHeight: "1.7" }}>
                {language === "ar"
                  ? "لديك الحق في طلب حذف حسابك وبيانات جلسة العمل الخاصة بك في أي وقت. يمكنك تسجيل الخروج وإلغاء ارتباط حساب Google وسلسلة الاتصال الخاصة بك على الفور وبشكل آمن."
                  : "You maintain full ownership and control over your session logs. You can delete your session logs, log out, and disconnect your Google account or connection string at any time. We support compliance with standard privacy regulations."}
              </p>
            </section>

          </div>
        </div>
      </main>

      <footer className="metadata-footer" style={{ zIndex: 2, paddingBottom: "2rem" }}>
        <p>{t("footer_landing")}</p>
      </footer>
    </div>
  );
}
