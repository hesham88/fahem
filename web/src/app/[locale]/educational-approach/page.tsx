"use client";

import { useTranslation } from "../../../context/LanguageContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiBookOpen, FiCompass, FiAward, FiCpu, FiTrendingUp, FiActivity } from "react-icons/fi";
import DonationCard from "../../../components/DonationCard";

export default function EducationalApproachPage() {
  const { t, language } = useTranslation();
  const router = useRouter();

  const isAr = language === "ar";

  return (
    <div className="glass-container" dir={isAr ? "rtl" : "ltr"}>
      {/* Background ambient light */}
      <div className="ambient-background">
        <div className="sphere sphere-1" style={{ background: "radial-gradient(circle, rgba(217,119,6,0.15) 0%, rgba(217,119,6,0) 70%)" }}></div>
        <div className="sphere sphere-2" style={{ background: "radial-gradient(circle, rgba(13,148,136,0.15) 0%, rgba(13,148,136,0) 70%)" }}></div>
        <div className="sphere sphere-3" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)" }}></div>
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
            <div className="glow-effect" style={{ position: "absolute", top: "-50%", left: "-50%", right: "-50%", bottom: "-50%", background: "radial-gradient(circle, rgba(217,119,6,0.1) 0%, transparent 60%)", pointerEvents: "none" }}></div>
            
            <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, #d97706, #0d9488)", margin: "0 auto 1.5rem auto", display: "flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "16px", boxShadow: "0 8px 20px rgba(217,119,6,0.2)" }}>
              <FiBookOpen style={{ fontSize: "2rem", color: "#ffffff" }} />
            </div>

            <h1 style={{ fontSize: "2.8rem", marginBottom: "1rem", fontFamily: "var(--font-display)", fontWeight: 800, background: "linear-gradient(135deg, var(--foreground), #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {isAr ? "النهج التربوي والمنهجية التعليمية" : "Our Educational Philosophy"}
            </h1>
            <p style={{ color: "var(--foreground)", opacity: 0.8, fontSize: "1.2rem", maxWidth: "700px", margin: "0 auto", lineHeight: "1.6" }}>
              {isAr 
                ? "كيف نحول التعليم التلقيني التقليدي إلى تجربة استكشاف وتعلم ذاتي مبتكرة؟ اكتشف الركائز الأكاديمية العميقة التي تقود محادثات الذكاء الاصطناعي في فاهم."
                : "Transforming standard passive instruction into active, student-led inquiry. Explore the academic scaffolding principles guiding Fahem's tutoring conversations."}
            </p>
          </div>

          {/* Core Pillars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem", marginBottom: "3rem" }}>
            
            {/* Pillar 1: Autodidactive Heutagogy */}
            <div className="glass-card" style={{ padding: "2.5rem" }}>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#d97706", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <FiCompass /> {isAr ? "الهيوتغوجيا والتعلم الذاتي المستقل (Autodidactive Heutagogy)" : "Autodidactive Heutagogy"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "1rem" }}>
                {isAr
                  ? "على عكس البيداغوجيا (Pedagogy) الكلاسيكية التي تقيد المتعلم بتوجيهات ثابتة، نتبنى منهج الهيوتغوجيا (Heutagogy). نحن نضع الطالب في موضع القيادة ليرسم معالمه التعليمية بنفسه، ويقيم تقدمه الشخصي، بينما يتراجع دور المعلم الذكي ليكون مسهلاً ومحفزاً للفضول العلمي بدلاً من التلقين."
                  : "Moving beyond passive pedagogy, we champion Autodidactive Heutagogy. We place students firmly in the pilot seat of their learning journey, prompting them to negotiate goals, self-reflect, and solve tasks independently, while the AI shifts from an authoritative lecturer to an expert-level facilitator."}
              </p>
            </div>

            {/* Pillar 2: OEPA Framework */}
            <div className="glass-card" style={{ padding: "2.5rem" }}>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0d9488", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <FiActivity /> {isAr ? "إطار التدرج والتواجد OEPA" : "The OEPA Framework"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "1rem", marginBottom: "1.5rem" }}>
                {isAr
                  ? "لربط مسارات التعلم بنظام تدريجي، يسير كل موضوع عبر أربع مراحل متوازية:"
                  : "To design cohesive digital learning loops, every curriculum unit is structured around four progressive phases:"}
              </p>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div style={{ padding: "1rem", background: "var(--card-background)", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                  <div style={{ fontWeight: 700, color: "#d97706" }}>O — Onboarding</div>
                  <p style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: "0.25rem" }}>{isAr ? "تحديد مستوى الطالب المعرفي واحتياجه الفردي" : "Mapping initial knowledge boundary and learning pace"}</p>
                </div>
                <div style={{ padding: "1rem", background: "var(--card-background)", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                  <div style={{ fontWeight: 700, color: "#0d9488" }}>E — Exploring</div>
                  <p style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: "0.25rem" }}>{isAr ? "التفاعل التجريبي وطرح الفرضيات وصياغة التساؤلات" : "Engaging with challenges, asking questions and testing models"}</p>
                </div>
                <div style={{ padding: "1rem", background: "var(--card-background)", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                  <div style={{ fontWeight: 700, color: "#6366f1" }}>P — Path-finding</div>
                  <p style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: "0.25rem" }}>{isAr ? "تجاوز الثغرات المعرفية عبر تكييف السياق" : "Filling conceptual gaps dynamically through responsive paths"}</p>
                </div>
                <div style={{ padding: "1rem", background: "var(--card-background)", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                  <div style={{ fontWeight: 700, color: "#10b981" }}>A — Arrival</div>
                  <p style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: "0.25rem" }}>{isAr ? "تأكيد الإتقان وإظهار حلول مركبة وفريدة" : "Consolidating mastery and graduating to high-level concept domains"}</p>
                </div>
              </div>
            </div>

            {/* Pillar 3: CCRII Learning Principles */}
            <div className="glass-card" style={{ padding: "2.5rem" }}>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#6366f1", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <FiAward /> {isAr ? "مبادئ التعلم المعرفية CCRII" : "The CCRII Principles"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "1rem", marginBottom: "1.5rem" }}>
                {isAr
                  ? "تسير رحلتنا بالتوازي مع مبادئ التعلم البنائي النشط (CCRII):"
                  : "We coordinate with the Five Pillars of Active Constructive Learning (CCRII):"}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ fontSize: "0.95rem" }}><strong>C — Constructive (البنائي):</strong> {isAr ? "البناء المنظم على خبرات الطالب ومعلوماته السابقة." : "Constructing new schema based on pre-existing student links."}</div>
                <div style={{ fontSize: "0.95rem" }}><strong>C — Collaborative (التعاوني):</strong> {isAr ? "التفاعل التعاوني بين الطالب والمساعد لبلوغ الهدف." : "Co-constructing knowledge through natural tutoring dialogue."}</div>
                <div style={{ fontSize: "0.95rem" }}><strong>R — Reflective (التأملي):</strong> {isAr ? "تحفيز الطالب على مراجعة طريقة تفكيره وتدارك الثغرات." : "Encouraging regular metacognitive self-evaluation cycles."}</div>
                <div style={{ fontSize: "0.95rem" }}><strong>I — Integrative (التكاملي):</strong> {isAr ? "ربط العلوم ببعضها بدلاً من الجزر المنعزلة." : "Synthesizing cross-disciplinary concepts rather than isolated topics."}</div>
                <div style={{ fontSize: "0.95rem" }}><strong>I — Inquiry-based (الاستقصائي):</strong> {isAr ? "الانطلاق من التساؤل المثير للفضول بدلاً من مجرد التلقي." : "Rooting learning within curiosity-driven, open-ended inquiry."}</div>
              </div>
            </div>

            {/* Pillar 4: Cognitive Load Integration */}
            <div className="glass-card" style={{ padding: "2.5rem" }}>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#14b8a6", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <FiCpu /> {isAr ? "إدارة وتقليل العبء المعرفي (Cognitive Load Integration)" : "Cognitive Load Shielding"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "1rem" }}>
                {isAr
                  ? "نولي في منصتنا اهتماماً بالغاً لنظرية الحمل المعرفي (Cognitive Load Theory). نعمل جاهدين على تقليل العبء المعرفي الدخيل (Extraneous Load) الناتج عن تعقيد الواجهات، بينما نقوم بسقالة ودعم الذاكرة العاملة (Scaffolding Working Memory) للطالب عبر إمداده بتلميحات متكيفة وتدريجية، وشرح متدرج ومجزء يمنع التشتت ويضاعف الكفاءة الفهمية."
                  : "We systematically insulate students against extraneous cognitive load (distracting visual interfaces or convoluted instructions) while actively supporting working memory. By implementing adaptive scaffolding (step-by-step guidance, micro-feedback, and progressive hint disclosures), we maximize germane learning load for deep integration."}
              </p>
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
