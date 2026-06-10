"use client";

import { useTranslation } from "../../../context/LanguageContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiUsers, FiLayers, FiPlay, FiSearch, FiGitMerge, FiDatabase } from "react-icons/fi";
import DonationCard from "../../../components/DonationCard";

export default function AgentsPage() {
  const { t, language } = useTranslation();
  const router = useRouter();

  const isAr = language === "ar";

  return (
    <div className="glass-container" dir={isAr ? "rtl" : "ltr"}>
      {/* Background ambient light */}
      <div className="ambient-background">
        <div className="sphere sphere-1" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0) 70%)" }}></div>
        <div className="sphere sphere-2" style={{ background: "radial-gradient(circle, rgba(236,72,153,0.15) 0%, rgba(236,72,153,0) 70%)" }}></div>
        <div className="sphere sphere-3" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0) 70%)" }}></div>
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
            <div className="glow-effect" style={{ position: "absolute", top: "-50%", left: "-50%", right: "-50%", bottom: "-50%", background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 60%)", pointerEvents: "none" }}></div>
            
            <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", margin: "0 auto 1.5rem auto", display: "flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "16px", boxShadow: "0 8px 20px rgba(168,85,247,0.2)" }}>
              <FiUsers style={{ fontSize: "2rem", color: "#ffffff" }} />
            </div>

            <h1 style={{ fontSize: "2.8rem", marginBottom: "1rem", fontFamily: "var(--font-display)", fontWeight: 800, background: "linear-gradient(135deg, var(--foreground), #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {isAr ? "الوكلاء المتكاملون في المنصة" : "Cooperative Swarm Agents"}
            </h1>
            <p style={{ color: "var(--foreground)", opacity: 0.8, fontSize: "1.2rem", maxWidth: "700px", margin: "0 auto", lineHeight: "1.6" }}>
              {isAr 
                ? "تتفاعل في منصتنا منظومة متكاملة من الوكلاء البرمجيين المتخصصين لتسهيل وهيكلة العملية التعليمية واستخلاص المعرفة تلقائياً وبأقصى درجات الأمان."
                : "Our platform coordinates an interactive swarm of specialized software agents that autonomously structure, validate, and enrich the entire student journey."}
            </p>
          </div>

          {/* Core Agents Showcase Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem", marginBottom: "3rem" }}>
            
            {/* Agent 1: Ingestion Agent */}
            <div className="glass-card" style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap", padding: "2.5rem" }}>
              <div style={{ background: "rgba(168,85,247,0.1)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(168,85,247,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FiLayers style={{ fontSize: "2.5rem", color: "#a855f7" }} />
              </div>
              <div style={{ flex: "1 1 500px" }}>
                <h3 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.5rem" }}>
                  {isAr ? "1. وكيل استيعاب المعرفة وهيكلتها (Ingestion Agent)" : "1. Ingestion & Curricular Agent"}
                </h3>
                <span style={{ display: "inline-block", background: "rgba(168,85,247,0.1)", color: "#a855f7", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "1rem" }}>
                  {isAr ? "المهمة: تفكيك وهيكلة المقررات" : "Primary: Structural Parsing & Knowledge Graphs"}
                </span>
                <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "1rem" }}>
                  {isAr
                    ? "يقوم هذا الوكيل بقراءة المناهج الدراسية، الكتب النصية، والمستندات التعليمية. يحلل البنية اللغوية ويربط المفاهيم التعليمية ببعضها البعض، وينشئ خرائط معرفية تلقائية تقسم المنهج إلى وحدات تعلم صغيرة تتوافق مع قدرات الطالب الاستيعابية."
                    : "This agent ingests textbook corpora, syllabi, and administrative curricular guidelines. It constructs complex semantic knowledge graphs, breaking monolithic subjects into atomic, structured learning targets tailored specifically for individual student progression paths."}
                </p>
              </div>
            </div>

            {/* Agent 2: Execution Agent */}
            <div className="glass-card" style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap", padding: "2.5rem" }}>
              <div style={{ background: "rgba(236,72,153,0.1)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(236,72,153,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FiPlay style={{ fontSize: "2.5rem", color: "#ec4899" }} />
              </div>
              <div style={{ flex: "1 1 500px" }}>
                <h3 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.5rem" }}>
                  {isAr ? "2. وكيل محاكاة التنفيذ والتقييم (Execution Agent)" : "2. Executing & Sandboxed Sandbox Agent"}
                </h3>
                <span style={{ display: "inline-block", background: "rgba(236,72,153,0.1)", color: "#ec4899", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "1rem" }}>
                  {isAr ? "المهمة: تقييم البرمجيات وحل المسائل البرمجية" : "Primary: Secure Sandbox Run & Validation"}
                </span>
                <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "1rem" }}>
                  {isAr
                    ? "يقوم وكيل التنفيذ بفتح بيئات برمجية معزولة وآمنة بالكامل (Sandboxed Runtime) لتجربة واختبار الحلول البرمجية التي يقدمها الطالب، أو لحساب وتأكيد صحة المعادلات الرياضية والفيزيائية المعقدة قبل عرض الشرح للطلاب."
                    : "Operating inside completely safe, micro-virtualized sandboxed containers, the Execution Agent compiles and executes student-submitted code or evaluates mathematically intense science vectors. This ensures absolute correctness and safe feedback cycles."}
                </p>
              </div>
            </div>

            {/* Agent 3: Web-Crawler Agent */}
            <div className="glass-card" style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap", padding: "2.5rem" }}>
              <div style={{ background: "rgba(59,130,246,0.1)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FiSearch style={{ fontSize: "2.5rem", color: "#3b82f6" }} />
              </div>
              <div style={{ flex: "1 1 500px" }}>
                <h3 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.5rem" }}>
                  {isAr ? "3. وكيل الاستكشاف والزحف الذكي (Web-Crawler Agent)" : "3. In-Depth Web Discovery & Crawler Agent"}
                </h3>
                <span style={{ display: "inline-block", background: "rgba(59,130,246,0.1)", color: "#3b82f6", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "1rem" }}>
                  {isAr ? "المهمة: جلب مصادر خارجية معتمدة" : "Primary: Safe Real-Time Content Scraping"}
                </span>
                <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "1rem" }}>
                  {isAr
                    ? "بدلاً من الأنظمة القديمة المقيدة، قمنا بتطوير زاحف ويب فائق الذكاء ومطابق لأدق المعايير الأمنية. يقوم بالبحث والزحف في مواقع الويب الرسمية والموسوعات العلمية الموثوقة لتأكيد الحقائق وجلب روابط إثرائية وصور توضيحية تدعم سياق التعلم فوراً."
                    : "Replacing deprecated libraries, our native async web crawler scans authorized scientific indexes and high-quality educational portals in real-time. It retrieves vetted definitions, verified citations, and media assets to enrich tutoring conversations safely."}
                </p>
              </div>
            </div>

          </div>

          {/* Collaborative Interaction Topology Card */}
          <div className="glass-card" style={{ padding: "3rem 2rem", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--primary)" }}>
              <FiGitMerge /> {isAr ? "ترابط وعلاقات منظومة الوكلاء" : "Agent Interaction Topology"}
            </h2>
            <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", marginBottom: "2rem" }}>
              {isAr
                ? "لا يعمل وكلاؤنا في صمت منعزل، بل يتشاطرون المعلومات والمهام عبر بروتوكول اتصال موحد. يقوم وكيل الاستيعاب بإرشاد المعلم للثغرات المعرفية، بينما يستدعي المعلم وكيل التنفيذ لتصميم تحدي برمجي عملي، ويقوم وكيل الزحف بتوسيع آفاق الإجابة بمصادر ومراجع حية."
                : "Our agents communicate within a secure workspace network. The Ingestion Agent designs structural curriculum milestones, which then triggers the Execution Agent to forge code/logic challenges, while the Web-Crawler Agent appends live references to solidify comprehension."}
            </p>

            <div style={{ background: "rgba(0,0,0,0.03)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--card-border)", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#a855f7" }}>Ingestion</div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{isAr ? "تخطيط المنهج وتكامل قاعدة البيانات" : "Lays Curriculum Anchors"}</div>
                </div>
                <div style={{ fontSize: "1.5rem", opacity: 0.5 }}>⇄</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#ec4899" }}>Execution</div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{isAr ? "تقييم واختبار الحلول في بيئة معزولة" : "Sandboxes & Validates"}</div>
                </div>
                <div style={{ fontSize: "1.5rem", opacity: 0.5 }}>⇄</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#3b82f6" }}>Crawler</div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{isAr ? "جلب مصادر وتوثيق مراجع حية" : "Injects Real-world Data"}</div>
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
