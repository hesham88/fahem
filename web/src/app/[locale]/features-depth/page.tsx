"use client";

import { useTranslation } from "../../../context/LanguageContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiSliders, FiCheckSquare, FiMic, FiBookmark, FiCpu, FiClock } from "react-icons/fi";
import DonationCard from "../../../components/DonationCard";

export default function FeaturesDepthPage() {
  const { t, language } = useTranslation();
  const router = useRouter();

  const isAr = language === "ar";

  return (
    <div className="glass-container" dir={isAr ? "rtl" : "ltr"}>
      {/* Background ambient light */}
      <div className="ambient-background">
        <div className="sphere sphere-1" style={{ background: "radial-gradient(circle, rgba(244,63,94,0.15) 0%, rgba(244,63,94,0) 70%)" }}></div>
        <div className="sphere sphere-2" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0) 70%)" }}></div>
        <div className="sphere sphere-3" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0) 70%)" }}></div>
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
            <div className="glow-effect" style={{ position: "absolute", top: "-50%", left: "-50%", right: "-50%", bottom: "-50%", background: "radial-gradient(circle, rgba(244,63,94,0.1) 0%, transparent 60%)", pointerEvents: "none" }}></div>
            
            <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, #f43f5e, #ec4899)", margin: "0 auto 1.5rem auto", display: "flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "16px", boxShadow: "0 8px 20px rgba(244,63,94,0.2)" }}>
              <FiSliders style={{ fontSize: "2rem", color: "#ffffff" }} />
            </div>

            <h1 style={{ fontSize: "2.8rem", marginBottom: "1rem", fontFamily: "var(--font-display)", fontWeight: 800, background: "linear-gradient(135deg, var(--foreground), #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {isAr ? "الميزات والابتكارات بالتفصيل" : "Advanced Platform Features"}
            </h1>
            <p style={{ color: "var(--foreground)", opacity: 0.8, fontSize: "1.2rem", maxWidth: "700px", margin: "0 auto", lineHeight: "1.6" }}>
              {isAr 
                ? "نذهب في 'فاهم' إلى أبعد من المساعد العادي لنقدم منظومة اختبار ذكية، ومحادثة صوتية تحاكي البشر، وتتبعاً حياً لجلسات الطالب بأعلى درجات الكفاءة."
                : "Fahem exceeds ordinary chatbot boundaries, offering deep-dive features built with testing rigor, real-time speech, and robust persistent memory."}
            </p>
          </div>

          {/* Core Features Depth Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem", marginBottom: "3rem" }}>
            
            {/* Feature 1: Automated Testing Suite */}
            <div className="glass-card" style={{ padding: "2.5rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.5rem", color: "#f43f5e", marginBottom: "1rem", fontWeight: 700 }}>
                <FiCheckSquare /> {isAr ? "نظام الاختبار التلقائي ومحاكاة الطالب (Automated Testing Suite)" : "Automated Testing & Simulation"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "1rem", marginBottom: "1.5rem" }}>
                {isAr
                  ? "لضمان أقصى درجات الموثوقية وتجنب تشتت النماذج، قمنا بتدشين بيئة اختبار كاملة ومحاكاة حية للطلاب. نتحقق من جاهزية النظام باستخدام الفحص التلقائي guard.bat sweep-full للتأكد من سلامة الواجهة، البرمجة، والتقييم قبل دمج أي ميزات إضافية للمستخدمين."
                  : "To guarantee peak performance and regression-free updates, we deploy rigorous simulated testing scripts. The integrated guard.bat system verifies front-to-back code structure, typing correctness, and client UI endpoints under varied simulated student profiles before any production push."}
              </p>
              <div style={{ background: "rgba(0,0,0,0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)", fontSize: "0.85rem", fontFamily: "monospace" }}>
                <code>[SWEEP] 13/13 Checks Completed — 0 Failed. Calibration OK.</code>
              </div>
            </div>

            {/* Feature 2: Real-time Voice Chat */}
            <div className="glass-card" style={{ padding: "2.5rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.5rem", color: "#f97316", marginBottom: "1rem", fontWeight: 700 }}>
                <FiMic /> {isAr ? "المحادثة الصوتية التفاعلية الفورية (Real-Time Voice)" : "Real-Time Localized Voice Chat"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "1rem", marginBottom: "1.5rem" }}>
                {isAr
                  ? "يتيح خيار الصوت التفاعلي للطلاب التحدث مع مساعدهم الذكي مباشرة بأقل معدل تأخير (Latency). يساعد هذا في تدريب الطلاب على المهارات اللفظية، وحل المسائل عبر الشرح المسموع، مع معالجة وتحويل مخارج الحروف العربية والإنجليزية بشكل مذهل."
                  : "We offer immediate, low-latency, speech-to-speech audio tutoring. Students can engage vocally, asking questions aloud and receiving naturally spoken scaffolded hints, supporting linguistic clarity and auditory learning cycles."}
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <span style={{ display: "inline-block", background: "rgba(249,115,22,0.1)", color: "#f97316", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600 }}>
                  {isAr ? "معالجة وتحويل فوري للصوت" : "Speech-to-Speech Streaming"}
                </span>
                <span style={{ display: "inline-block", background: "rgba(249,115,22,0.1)", color: "#f97316", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600 }}>
                  {isAr ? "تقليل العبء البصري" : "Minimal Cognitive Overhead"}
                </span>
              </div>
            </div>

            {/* Feature 3: Context-Aware Session Tracking */}
            <div className="glass-card" style={{ padding: "2.5rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.5rem", color: "#8b5cf6", marginBottom: "1rem", fontWeight: 700 }}>
                <FiBookmark /> {isAr ? "تتبع وحفظ جلسات المعرفة (Session Tracking)" : "Context-Aware Session Tracking"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "1rem", marginBottom: "1.5rem" }}>
                {isAr
                  ? "لا يتعلم الطلاب في مسار واحد مستقيم. لهذا نقوم بتثبيت ومتابعة الجلسات وتخزين سياق الطالب عبر قواعد البيانات. يتذكر 'فاهم' أين وقف الطالب في المحادثة السابقة، وما هي التحديات التي واجهته، لتجنب إعادة الشرح والحفاظ على تطوره المعرفي."
                  : "We secure full conversation state mapping inside our Atlas cluster. This absolute memory mapping prevents repetitive instructions. The tutor intelligently recalls where the student paused, what milestones they cleared, and their individual progression rate across sessions."}
              </p>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", opacity: 0.7, fontSize: "0.85rem" }}>
                <FiClock />
                <span>{isAr ? "تحديث تلقائي وفوري للسجلات المعرفية" : "Auto-updates cognitive milestones in real-time"}</span>
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
