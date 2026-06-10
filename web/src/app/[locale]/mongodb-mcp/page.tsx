"use client";

import { useTranslation } from "../../../context/LanguageContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiDatabase, FiGrid, FiList, FiTrendingUp, FiCheckCircle, FiSearch } from "react-icons/fi";
import DonationCard from "../../../components/DonationCard";

export default function MongoDBMCPPage() {
  const { t, language } = useTranslation();
  const router = useRouter();

  const isAr = language === "ar";

  return (
    <div className="glass-container" dir={isAr ? "rtl" : "ltr"}>
      {/* Background ambient light */}
      <div className="ambient-background">
        <div className="sphere sphere-1" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0) 70%)" }}></div>
        <div className="sphere sphere-2" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.1) 0%, rgba(6,182,212,0) 70%)" }}></div>
        <div className="sphere sphere-3" style={{ background: "radial-gradient(circle, rgba(37,99,235,0.1) 0%, rgba(37,99,235,0) 70%)" }}></div>
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
            <div className="glow-effect" style={{ position: "absolute", top: "-50%", left: "-50%", right: "-50%", bottom: "-50%", background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 60%)", pointerEvents: "none" }}></div>
            
            <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, #10b981, #059669)", margin: "0 auto 1.5rem auto", display: "flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "16px", boxShadow: "0 8px 20px rgba(16,185,129,0.2)" }}>
              <FiDatabase style={{ fontSize: "2rem", color: "#ffffff" }} />
            </div>

            <h1 style={{ fontSize: "2.8rem", marginBottom: "1rem", fontFamily: "var(--font-display)", fontWeight: 800, background: "linear-gradient(135deg, var(--foreground), #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {isAr ? "تكامل MongoDB MCP والبحث الدلالي" : "MongoDB MCP & Vector Infrastructure"}
            </h1>
            <p style={{ color: "var(--foreground)", opacity: 0.8, fontSize: "1.2rem", maxWidth: "700px", margin: "0 auto", lineHeight: "1.6" }}>
              {isAr 
                ? "قوة تشغيلية متكاملة لربط النماذج الذكية بقواعد بيانات الطلاب والمناهج مباشرة بشكل آمن، بالاعتماد على البحث المتجهي الفوري وأنابيب التجميع المتقدمة."
                : "A state-of-the-art data orchestration layer linking AI models to student profiles and textbook corpora using Model Context Protocol and Atlas Vector Search."}
            </p>
          </div>

          {/* Grid Layout for details */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1-fraction))", gap: "2rem", marginBottom: "3rem" }}>
            
            {/* Feature 1: Model Context Protocol (MCP) */}
            <div className="glass-card" style={{ transition: "transform 0.3s ease, box-shadow 0.3s ease" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.4rem", color: "#10b981", marginBottom: "1rem" }}>
                <FiGrid /> {isAr ? "بروتوكول سياق النموذج (MCP)" : "Model Context Protocol"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "0.95rem" }}>
                {isAr
                  ? "قمنا ببناء وتخصيص خوادم MCP موحدة تتيح للنماذج اللغوية الكبيرة الاستعلام المباشر والآمن من قاعدة بيانات MongoDB دون المساس بخصوصية المستخدم أو تخزين مفاتيح الاتصال."
                  : "We engineered custom MCP servers giving LLM agents standardized, secure, real-time access to select collections on MongoDB Atlas, ensuring precise actions and sandboxed data loops."}
              </p>
            </div>

            {/* Feature 2: Vector Search & Embeddings */}
            <div className="glass-card" style={{ transition: "transform 0.3s ease, box-shadow 0.3s ease" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.4rem", color: "#059669", marginBottom: "1rem" }}>
                <FiSearch /> {isAr ? "البحث المتجهي الدلالي" : "Atlas Vector Search"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "0.95rem" }}>
                {isAr
                  ? "يتم تكسير وتشفير المقررات والكتب الدراسية إلى متجهات نصية (Embeddings) مخزنة في قواعد البيانات. بفضل الفهارس المتجهية المخصصة، يسترجع المساعد فوراً الشرح المتطابق دلالياً مع تساؤل الطالب."
                  : "By converting complex curricular texts and text books into multi-dimensional vector embeddings, we execute semantic cosine-similarity lookups on Atlas to fetch high-context references instantly."}
              </p>
            </div>

            {/* Feature 3: Complex Aggregations */}
            <div className="glass-card" style={{ transition: "transform 0.3s ease, box-shadow 0.3s ease" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.4rem", color: "#3b82f6", marginBottom: "1rem" }}>
                <FiTrendingUp /> {isAr ? "أنابيب التجميع والتحليل" : "Analytics Aggregations"}
              </h3>
              <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", fontSize: "0.95rem" }}>
                {isAr
                  ? "نوظف أنابيب تجميع البيانات (Aggregation Pipelines) المتطورة في MongoDB لإعداد إحصائيات الطلاب وجداول الأداء ومعدلات الفهم فورياً وتحويل السجلات المشتتة لرسوم تخطيطية واضحة."
                  : "Leveraging MongoDB's powerful aggregation pipelines, we compute real-time student performance matrices, lesson completion statistics, and cognitive progression rates directly in-db."}
              </p>
            </div>

          </div>

          {/* Premium Technical Flow Section */}
          <div className="glass-card" style={{ padding: "3rem 2rem", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", color: "#10b981" }}>
              <FiList /> {isAr ? "الاستفادة من البداية: كيف تخدمنا قاعدة البيانات؟" : "Engineered from Day One: Our Database Journey"}
            </h2>
            <p style={{ color: "var(--foreground)", opacity: 0.85, lineHeight: "1.7", marginBottom: "1.5rem" }}>
              {isAr
                ? "منذ الخطوة الأولى لتطوير 'فاهم'، أدركنا أن التعليم المخصص يتطلب مرونة فائقة في معالجة الهياكل البيانية المتغيرة. لهذا اخترنا نوى مستندات MongoDB المفتوحة لتتيح لنا:"
                : "From the very beginning of the Fahem journey, personalized education demanded highly dynamic schemas. Documents in MongoDB provided the foundation for our cognitive maps, enabling:"}
            </p>

            <ul style={{ listStyleType: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
              <li style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <FiCheckCircle style={{ color: "#10b981", flexShrink: 0 }} />
                <span>{isAr ? "تخزين شجرة المنهج الدراسي المرنة دون تقيد بجداول جامدة" : "Storing modular curriculum outlines as flexible, nested documents"}</span>
              </li>
              <li style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <FiCheckCircle style={{ color: "#10b981", flexShrink: 0 }} />
                <span>{isAr ? "تتبع وحفظ سجل المحادثات الطويل وجلسات الصوت الفورية" : "Capturing extensive conversation context and audio streaming metadata seamlessly"}</span>
              </li>
              <li style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <FiCheckCircle style={{ color: "#10b981", flexShrink: 0 }} />
                <span>{isAr ? "الربط الفوري بين تقييم المعلمين للحلول وخرائط الفهم المعرفي" : "Instantly binding teacher evaluation criteria with student cognitive matrices"}</span>
              </li>
            </ul>
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
