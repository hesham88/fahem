"use client";

import React, { useState, useEffect } from "react";
import { FiRefreshCw, FiCalendar, FiBookOpen, FiCompass, FiLayers } from "react-icons/fi";
import { authedFetch } from "../../lib/authedFetch";

interface Book {
  _id?: string;
  id?: string;
  title: string;
  title_ar?: string;
  titleEn?: string;
  titleAr?: string;
  subject?: string;
  chapters?: any[];
}

interface StudyPlanPanelProps {
  language: string;
  dynamicBooks: Book[];
  renderSpaceSelectorBar: (tab: "practice" | "plan" | "timetable" | "zatona") => React.ReactNode;
  renderSpaceHistory: () => React.ReactNode;
  addSpaceHistory: (actionEn: string, actionAr: string) => void;
  renderPremiumContent: (markdownText: string) => React.ReactNode;
  t: (key: string) => string;
  user: any;
}

/**
 * StudyPlanPanel component renders the student weekly planner, study targets,
 * and handles smart customized AI academic schedule blueprint generation with persistent history.
 */
export const StudyPlanPanel: React.FC<StudyPlanPanelProps> = ({
  language,
  dynamicBooks,
  renderSpaceSelectorBar,
  renderSpaceHistory,
  addSpaceHistory,
  renderPremiumContent,
  t,
  user,
}) => {
  // Plan Selector States
  const [scopeType, setScopeType] = useState<"subject" | "book">("subject");
  const [selectedSubject, setSelectedSubject] = useState<string>("Math");
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [customConcepts, setCustomConcepts] = useState<string>("");
  const [planPrompt, setPlanPrompt] = useState<string>("");

  // Result & Loading States
  const [planResult, setPlanResult] = useState<string>("");
  const [planLoading, setPlanLoading] = useState<boolean>(false);

  // History States
  const [planHistoryList, setPlanHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Initialize selectedBookId when dynamicBooks load
  useEffect(() => {
    if (dynamicBooks && dynamicBooks.length > 0 && !selectedBookId) {
      setSelectedBookId(dynamicBooks[0]._id || dynamicBooks[0].id || "");
    }
  }, [dynamicBooks, selectedBookId]);

  // Fetch persistent history
  const fetchPlanHistory = async () => {
    if (!user?.uid) return;
    setHistoryLoading(true);
    try {
      const res = await authedFetch(`/api/activity?userId=${encodeURIComponent(user.uid)}`);
      if (res.ok) {
        const data = await res.json();
        const activities = data.activities || [];
        const planRuns = activities.filter((act: any) => act.action === "plan_session");
        setPlanHistoryList(planRuns);
      }
    } catch (err) {
      console.error("Failed to fetch plan history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanHistory();
  }, [user]);

  // Handle plan generation
  const handleGeneratePlan = async () => {
    if (planLoading) return;
    setPlanLoading(true);
    setPlanResult("");

    try {
      const payload = {
        scopeType,
        subject: selectedSubject,
        bookId: scopeType === "book" ? selectedBookId : "",
        chapters: scopeType === "book" ? selectedChapters : [],
        concepts: scopeType === "book" ? customConcepts : "",
        prompt: planPrompt,
        language
      };

      const res = await authedFetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.plan) {
          setPlanResult(data.plan);

          // Save run to persistent user activities collection (fail-safe database-backed history)
          const materialDescEn = scopeType === "book" 
            ? `Textbook (${dynamicBooks.find(b => (b._id || b.id) === selectedBookId)?.title || "Selected Book"})`
            : `General Subject (${selectedSubject})`;
          const materialDescAr = scopeType === "book"
            ? `كتاب مدرسي (${dynamicBooks.find(b => (b._id || b.id) === selectedBookId)?.titleAr || "الكتاب المحدد"})`
            : `مادة عامة (${selectedSubject})`;

          await authedFetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "plan_session",
              status: "success",
              details: {
                scopeType,
                subject: selectedSubject,
                bookId: selectedBookId,
                chapters: selectedChapters,
                concepts: customConcepts,
                prompt: planPrompt,
                result: data.plan,
                materialDescEn,
                materialDescAr,
                timestamp: new Date().toISOString()
              }
            })
          });

          // Refresh history and add to workspace audit log
          fetchPlanHistory();
          addSpaceHistory(
            `Generated custom AI study blueprint for ${materialDescEn}`,
            `تم توليد خطة دراسية ذكية مخصصة لـ ${materialDescAr}`
          );
        } else {
          setPlanResult(
            language === "ar" ? "⚠️ حدث خطأ أثناء توليد الخطة الدراسية." : "⚠️ Error generating study blueprint."
          );
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setPlanResult(
          language === "ar" 
            ? `⚠️ فشل الاتصال بالخادم الذكي: ${errJson.error || "خطأ غير معروف"}` 
            : `⚠️ Server connection failed: ${errJson.error || "Unknown error"}`
        );
      }
    } catch (err) {
      console.error("Plan generate error:", err);
      setPlanResult(
        language === "ar" ? "⚠️ خطأ غير متوقع أثناء الاتصال بالخادم." : "⚠️ Unexpected error occurred."
      );
    } finally {
      setPlanLoading(false);
    }
  };

  // Open/Resume previous saved plan
  const handleOpenPreviousPlan = (run: any) => {
    const details = run.details || {};
    setPlanResult(details.result || "");
    setScopeType(details.scopeType || "subject");
    if (details.scopeType === "book") {
      setSelectedBookId(details.bookId || "");
      setSelectedChapters(details.chapters || []);
      setCustomConcepts(details.concepts || "");
    } else {
      setSelectedSubject(details.subject || "Math");
    }
    setPlanPrompt(details.prompt || "");

    // Add activity trace to local workspace audit log
    const descEn = details.materialDescEn || "Previous Blueprint";
    const descAr = details.materialDescAr || "خطة دراسية سابقة";
    addSpaceHistory(`Opened study blueprint for ${descEn}`, `تم فتح الخطة الدراسية لـ ${descAr}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Space Bar Swapper */}
      {renderSpaceSelectorBar("plan")}

      <section 
        className="panel-card" 
        style={{ 
          padding: "3rem 2rem", 
          textAlign: "center",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(247, 243, 230, 0.5))",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          borderRadius: "var(--border-radius-lg)",
          boxShadow: "0 10px 30px -10px rgba(16, 107, 163, 0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Subtle decorative gold/blue glowing blur circles */}
        <div style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "150px",
          height: "150px",
          background: "radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0) 70%)",
          pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute",
          bottom: "-50px",
          left: "-50px",
          width: "150px",
          height: "150px",
          background: "radial-gradient(circle, rgba(16, 107, 163, 0.1) 0%, rgba(16, 107, 163, 0) 70%)",
          pointerEvents: "none"
        }} />

        <div style={{
          fontSize: "4rem",
          animation: "float 4s ease-in-out infinite",
          display: "inline-block",
          filter: "drop-shadow(0 10px 15px rgba(212, 175, 55, 0.2))"
        }}>
          ⏳
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "600px" }}>
          <h3 style={{ 
            fontSize: "1.6rem", 
            margin: 0, 
            fontWeight: 900, 
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em"
          }}>
            {language === "ar" ? "قريباً: مخطط الدراسة الذكي بالذكاء الاصطناعي" : "Coming Soon: Intelligent AI Study Planner"}
          </h3>
          <p style={{ 
            fontSize: "0.95rem", 
            color: "#5c6e7a", 
            margin: 0, 
            lineHeight: "1.7",
            fontWeight: 500
          }}>
            {language === "ar" 
              ? "نحن نعمل حالياً على صياغة نظام تخطيط دراسي مخصص بالكامل لدمجه مع مساعد فاهم الذكي. هذا النظام سيتيح لك توليد خطط دراسية ذكية مبنية على أدائك وأهدافك الأكاديمية اليومية."
              : "We are actively crafting a fully-automated customized study planning system integrated directly with the Fahem Companion. It will feature dynamic curriculum progress tracking, automated revision milestones, and personalized blueprints built on your daily academic journey."}
          </p>
        </div>

        {/* Dynamic decorative timeline elements to show high design quality */}
        <div style={{ 
          display: "flex", 
          gap: "1.5rem", 
          marginTop: "1rem", 
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "500px"
        }}>
          {[
            { labelAr: "ذكاء التخطيط", labelEn: "AI Scheduling", icon: "🧠" },
            { labelAr: "تذكيرات فورية", labelEn: "Instant Alerts", icon: "🔔" },
            { labelAr: "تكامل التقويم", labelEn: "Calendar Sync", icon: "📅" }
          ].map((feature, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#ffffff",
              padding: "0.5rem 1rem",
              borderRadius: "50px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
              border: "1px solid rgba(16, 107, 163, 0.05)",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "var(--foreground)"
            }}>
              <span>{feature.icon}</span>
              <span>{language === "ar" ? feature.labelAr : feature.labelEn}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Workspace Activity logs */}
      {renderSpaceHistory()}
    </div>
  );
};
