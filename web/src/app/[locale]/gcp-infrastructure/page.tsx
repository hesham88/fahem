"use client";

import { useTranslation } from "../../../context/LanguageContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCloud, FiCpu, FiShield, FiServer, FiLock, FiActivity, FiGlobe } from "react-icons/fi";
import DonationCard from "../../../components/DonationCard";

export default function GCPInfrastructurePage() {
  const { t, language } = useTranslation();
  const router = useRouter();

  const isAr = language === "ar";

  return (
    <div className="glass-container" dir={isAr ? "rtl" : "ltr"}>
      {/* Background ambient light */}
      <div className="ambient-background">
        <div className="sphere sphere-1" style={{ background: "radial-gradient(circle, rgba(37,99,235,0.2) 0%, rgba(37,99,235,0) 70%)" }}></div>
        <div className="sphere sphere-2" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0) 70%)" }}></div>
        <div className="sphere sphere-3" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0) 70%)" }}></div>
      </div>

      {/* Glassmorphic Navbar */}
      <nav className="glass-nav">
        <div className="glass-nav-logo" onClick={() => router.push(`/${language}`)} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <img src="/brand/logo_compressed.png" alt="Fahem Logo" style={{ height: "2rem", width: "auto" }} />
          <span>{t("dashboard_title")}</span>
        </div>
        <button className="btn btn-secondary" onClick={() => router.push(`/${language}`)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiArrowLeft style={{ fontSize: "1.2rem", transform: isAr ? "rotate(180deg)" : "none" }} />
          <span>{isAr ? "العودة للرئيسية" : "Back to Home"}</span>
        </button>
      </nav>

      {/* Main Container */}
      <main className="glass-hero-section" style={{ padding: "5rem 1.5rem", position: "relative", zIndex: 10 }}>
        <div style={{ maxWidth: "1000px", width: "100%", margin: "0 auto" }}>
          
          {/* Header Banner */}
          <div className="glass-card" style={{ textAlign: "center", marginBottom: "3rem", padding: "3rem 2rem", position: "relative", overflow: "hidden" }}>
            <div className="glow-effect" style={{ position: "absolute", top: "-50%", left: "-50%", right: "-50%", bottom: "-50%", background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 60%)", pointerEvents: "none" }}></div>
            
            <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, #2563eb, #06b6d4)", margin: "0 auto 1.5rem auto", display: "flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "16px", boxShadow: "0 8px 20px rgba(37,99,235,0.2)" }}>
              <FiCloud style={{ fontSize: "2rem", color: "#ffffff" }} />
            </div>

            <h1 style={{ fontSize: "2.8rem", marginBottom: "1rem", fontFamily: "var(--font-display)", fontWeight: 800, background: "linear-gradient(135deg, var(--foreground), #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {isAr ? "البنية التحتية لـ GCP" : "GCP Cloud Infrastructure"}
            </h1>
            <p style={{ color: "var(--foreground)", opacity: 0.8, fontSize: "1.2rem", maxWidth: "700px", margin: "0 auto", lineHeight: "1.6" }}>
              {isAr 
                ? "بنية سحابية فائقة الأمان والمرونة والجاهزية، مبنية على بنية Google Cloud الأساسية لضمان أداء مستقر ومعالجة لحظية للبيانات التعليمية."
                : "A secure, highly resilient, and auto-scaling cloud environment engineered entirely on Google Cloud Platform for low-latency delivery and premium safety."}
            </p>
          </div>

          {/* Grid Layout for details */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1-fraction))", gap: "2rem", marginBottom: "3rem" }}>
            
            {/* Card 1: Cloud Compute & Scaling */}
            <div className="glass-card" style={{ transition: "transform 0.3s ease, box-shadow 0.3s ease" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.4rem", color: "#2563eb", marginBottom: "1rem" }}>
                <FiCpu /> {isAr ? "التوسع السحابي المرن" : "Resilient Compute"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "0.95rem" }}>
                {isAr
                  ? "نوظف تقنيات الحوسبة الموزعة في سحابة Google لتشغيل نماذج الاستدلال ووكلاء المعالجة. تتوسع الخوادم تلقائياً تماشياً مع أعداد الطلبات المتزايدة للطلاب دون أي انقطاع أو تباطؤ في الخدمة."
                  : "We harness distributed microservices inside Google Cloud to run high-throughput intelligence engines. Application containers dynamically scale horizontally in response to real-time student activity bursts, maintaining a flawless 100% uptime."}
              </p>
              <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }}></span>
                <span style={{ fontSize: "0.8rem", color: "var(--foreground)", opacity: 0.6 }}>{isAr ? "نشط: توسع تلقائي مرن" : "Active: Auto-scaling active"}</span>
              </div>
            </div>

            {/* Card 2: Security Shields & Armor */}
            <div className="glass-card" style={{ transition: "transform 0.3s ease, box-shadow 0.3s ease" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.4rem", color: "#a855f7", marginBottom: "1rem" }}>
                <FiShield /> {isAr ? "دروع الحماية المتكاملة" : "Advanced Shielding"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "0.95rem" }}>
                {isAr
                  ? "نستخدم نظام Google Cloud Armor مدمجاً بمرشحات الأمان المتقدمة Model Armor لحماية تدفق البيانات من أي اختراقات أو هجمات حرمان الخدمة (DDoS). نقوم بتصفية المدخلات لحماية الطلاب من المحتوى الضار."
                  : "We leverage Google Cloud Armor fully integrated with Model Armor security filters to block potential threats, DDoS vectors, and data exfiltration. Robust ingress pipelines filter untrusted queries, protecting the platform and our users."}
              </p>
              <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }}></span>
                <span style={{ fontSize: "0.8rem", color: "var(--foreground)", opacity: 0.6 }}>{isAr ? "نشط: دروع حماية الويب والنموذج" : "Active: Web & Model Armor shields"}</span>
              </div>
            </div>

            {/* Card 3: Encrypted Secrets & Nodes */}
            <div className="glass-card" style={{ transition: "transform 0.3s ease, box-shadow 0.3s ease" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.4rem", color: "#06b6d4", marginBottom: "1rem" }}>
                <FiLock /> {isAr ? "تشفير البيانات وإدارة المفاتيح" : "Zero-Trust Integrity"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "0.95rem" }}>
                {isAr
                  ? "جميع مفاتيح الربط والاتصال بقواعد بيانات الطلاب مخزنة بشكل آمن ومشفر داخل Google Secret Manager. لا يملك أي موظف وصولاً مباشراً للمفاتيح الحساسة، ويتم تشفير البيانات أثناء النقل والراحة بتشفير AES-256."
                  : "All API tokens, databases strings, and credential mappings are tightly sealed and decrypted dynamically using Google Secret Manager. Strict zero-trust configurations prevent human access, encrypting student data both in transit and at rest with AES-256."}
              </p>
              <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }}></span>
                <span style={{ fontSize: "0.8rem", color: "var(--foreground)", opacity: 0.6 }}>{isAr ? "نشط: Secret Manager & AES-256" : "Active: Secret Manager & AES-256"}</span>
              </div>
            </div>

          </div>

          {/* Premium Technical Flow Section */}
          <div className="glass-card" style={{ padding: "3rem 2rem", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--primary)" }}>
              <FiServer /> {isAr ? "هيكلية تدفق البيانات السحابية" : "Cloud Data Architecture Flow"}
            </h2>
            <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", marginBottom: "2rem" }}>
              {isAr
                ? "عندما يطلب الطالب شرحاً أو يرسل استفساراً، يمر الطلب أولاً عبر خادم موازنة الحمل المتعدد الأقاليم في Google Cloud، والذي يوجهه فوراً إلى أقرب حاوية تشغيل في وضع جهوزية كامل. تمر البيانات تالياً بمرشحات الحماية ثم تتجه لقاعدة البيانات الموزعة Atlas لإحضار السياقات بسرعة متناهية."
                : "When a student initiates an interactive learning loop, our secure DNS pre-warms connections. Global Load Balancers forward the query into nearest Cloud Run compute nodes. Data is parsed, evaluated by security filters, and cross-referenced with distributed MongoDB Atlas context vectors instantly."}
            </p>

            <div style={{ background: "rgba(0,0,0,0.03)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--card-border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ flex: "1 1 200px", padding: "1rem", background: "var(--card-background)", borderRadius: "8px", border: "1px solid var(--card-border)", textAlign: "center" }}>
                  <div style={{ fontWeight: 700, color: "#2563eb", marginBottom: "0.5rem" }}>1. CDN & Ingress</div>
                  <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>{isAr ? "تصفية وتوجيه ذكي وفحص أمني" : "Cloud Armor filtering, DDOS mitigation, global routing"}</div>
                </div>
                <div style={{ flex: "1 1 200px", padding: "1rem", background: "var(--card-background)", borderRadius: "8px", border: "1px solid var(--card-border)", textAlign: "center" }}>
                  <div style={{ fontWeight: 700, color: "#a855f7", marginBottom: "0.5rem" }}>2. Cloud Run Node</div>
                  <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>{isAr ? "معالجة سريعة واستدعاء الوكلاء" : "Microservices execution, model orchestration"}</div>
                </div>
                <div style={{ flex: "1 1 200px", padding: "1rem", background: "var(--card-background)", borderRadius: "8px", border: "1px solid var(--card-border)", textAlign: "center" }}>
                  <div style={{ fontWeight: 700, color: "#06b6d4", marginBottom: "0.5rem" }}>3. Atlas Cluster</div>
                  <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>{isAr ? "بحث دلالي فوري واسترجاع السياق" : "Semantic vector recall, context injections"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer donation strip */}
          <DonationCard variant="compact" />

        </div>
      </main>

      <footer className="metadata-footer" style={{ zIndex: 2, padding: "2rem 0" }}>
        <p>{t("footer_landing")}</p>
      </footer>
    </div>
  );
}
