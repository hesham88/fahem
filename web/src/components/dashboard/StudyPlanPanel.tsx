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

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }} className="grid-cols-1">
        
        {/* Left Column: AI Study Blueprint Customization */}
        <div className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.5rem", margin: 0, fontWeight: 800 }}>
            {language === "ar" ? "تخصيص خطة المذاكرة بالذكاء الاصطناعي" : "AI Study Blueprint Customization"}
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#4f6371", margin: 0, lineHeight: "1.6" }}>
            {language === "ar"
              ? "قم بتحديد النطاق الدراسي وسيقوم محرك الذكاء الاصطناعي بإنشاء جدول زمني أسبوعي مخصص، غني بالأهداف والمهام والملخصات لمساعدتك على التفوق."
              : "Specify your academic scope. Our AI engine will compose a structured week-by-week timetable loaded with daily targets and revision tasks."}
          </p>

          {/* Scope Selector: Subject vs Book */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setScopeType("subject")}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                background: scopeType === "subject" ? "var(--primary)" : "#f0f4f8",
                color: scopeType === "subject" ? "#ffffff" : "var(--foreground)",
                border: "1px solid " + (scopeType === "subject" ? "var(--primary)" : "var(--card-border)"),
                transition: "all 0.2s",
              }}
            >
              {language === "ar" ? "مادة دراسية عامة" : "Umbrella Subject"}
            </button>
            <button
              onClick={() => {
                setScopeType("book");
                if (dynamicBooks.length > 0 && !selectedBookId) {
                  setSelectedBookId(dynamicBooks[0]._id || dynamicBooks[0].id || "");
                }
              }}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                background: scopeType === "book" ? "var(--primary)" : "#f0f4f8",
                color: scopeType === "book" ? "#ffffff" : "var(--foreground)",
                border: "1px solid " + (scopeType === "book" ? "var(--primary)" : "var(--card-border)"),
                transition: "all 0.2s",
              }}
            >
              {language === "ar" ? "كتاب مدرسي محدد" : "Specific Textbook"}
            </button>
          </div>

          {/* Dynamic Selection Dropdowns */}
          {scopeType === "subject" ? (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.85rem", background: "#ffffff", fontWeight: 700, outline: "none" }}
            >
              <option value="Math">{language === "ar" ? "الرياضيات" : "Mathematics"}</option>
              <option value="Science">{language === "ar" ? "العلوم والفيزياء" : "Science & Physics"}</option>
              <option value="Arabic">{language === "ar" ? "اللغة العربية" : "Arabic Linguistics"}</option>
              <option value="General">{language === "ar" ? "ثقافة عامة" : "General Knowledge"}</option>
            </select>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <select
                value={selectedBookId}
                onChange={(e) => {
                  setSelectedBookId(e.target.value);
                  setSelectedChapters([]);
                }}
                style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.85rem", background: "#ffffff", fontWeight: 700, outline: "none" }}
              >
                {dynamicBooks.length > 0 ? (
                  dynamicBooks.map((b: any) => (
                    <option key={b._id || b.id} value={b._id || b.id}>
                      {language === "ar" ? b.titleAr || b.title : b.titleEn || b.title}
                    </option>
                  ))
                ) : (
                  <option value="">{language === "ar" ? "لا توجد كتب مضافة بعد" : "No textbooks ingested yet"}</option>
                )}
              </select>

              {/* Multiple Chapter Selection list */}
              {selectedBookId && (
                (() => {
                  const activeBook = dynamicBooks.find((b: any) => (b._id || b.id) === selectedBookId);
                  const chapters = activeBook?.chapters || [];
                  return (
                    <div style={{
                      marginTop: "0.25rem",
                      padding: "1rem",
                      borderRadius: "8px",
                      background: "rgba(16, 107, 163, 0.03)",
                      border: "1px solid rgba(16, 107, 163, 0.08)"
                    }}>
                      <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--foreground)", display: "block", marginBottom: "0.5rem" }}>
                        {language === "ar" ? "📍 حدد فصول الكتاب المستهدفة (خيارات متعددة):" : "📍 Select Target Chapters (Multiple Selection):"}
                      </label>
                      {chapters.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }} className="custom-scrollbar">
                          {chapters.map((ch: any, idx: number) => {
                            const chTitle = language === "ar" ? (ch.title_ar || ch.title) : (ch.title || ch.title_ar);
                            const isChecked = selectedChapters.includes(ch.title);
                            return (
                              <label key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", cursor: "pointer", fontWeight: 600 }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedChapters(selectedChapters.filter(t => t !== ch.title));
                                    } else {
                                      setSelectedChapters([...selectedChapters, ch.title]);
                                    }
                                  }}
                                  style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                                />
                                <span>{chTitle}</span>
                                <span style={{ fontSize: "0.7rem", color: "rgba(0,0,0,0.4)" }}>
                                  ({language === "ar" ? `الصفحات: ${ch.start_page}-${ch.end_page}` : `Pages: ${ch.start_page}-${ch.end_page}`})
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.5)" }}>
                          {language === "ar" ? "لا توجد فصول مسجلة لهذا الكتاب، سيتم تخطيط كامل المنهج." : "No structured chapters recorded. Full textbook will be targeted."}
                        </div>
                      )}

                      {/* Focus Concepts focus input */}
                      <div style={{ marginTop: "0.8rem", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "0.8rem" }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--foreground)", display: "block", marginBottom: "0.3rem" }}>
                          {language === "ar" ? "🏷️ أدخل مفاهيم معينة لتركيز خطة المذاكرة عليها:" : "🏷️ Focus on specific concepts or topics:"}
                        </label>
                        <input
                          type="text"
                          value={customConcepts}
                          onChange={(e) => setCustomConcepts(e.target.value)}
                          placeholder={language === "ar" ? "اكتب المفاهيم هنا (مثال: اللوغاريتمات)..." : "Type custom concepts separated by commas..."}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid var(--card-border)",
                            fontSize: "0.8rem",
                            outline: "none",
                            background: "#ffffff"
                          }}
                        />
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* Goals / Study horizon customized instructions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 800 }}>
              {language === "ar" ? "✍️ توجيهات أو أهداف خاصة لتصميم الخطة (اختياري):" : "✍️ Custom Planner Instructions / Target Horizon (Optional):"}
            </label>
            <textarea
              id="planner-instructions-input"
              value={planPrompt}
              onChange={(e) => setPlanPrompt(e.target.value)}
              placeholder={
                language === "ar"
                  ? "مثال: مراجعة مكثفة لمدة أسبوعين استعداداً للاختبار النهائي، مع التركيز على المسائل الأكثر صعوبة..."
                  : "E.g., Intensive 2-week schedule preparing for the midterms, allocating extra time for active recall..."
              }
              style={{
                width: "100%",
                height: "80px",
                padding: "0.75rem",
                borderRadius: "var(--border-radius-sm)",
                border: "1px solid var(--card-border)",
                outline: "none",
                fontSize: "0.85rem",
                fontFamily: "var(--font-sans)",
                resize: "none"
              }}
            />
          </div>

          <button
            disabled={planLoading}
            onClick={handleGeneratePlan}
            className="btn btn-primary"
            style={{ padding: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            {planLoading ? (
              <>
                <FiRefreshCw className="spinning-icon" />
                <span>{language === "ar" ? "جاري رسم وتصميم الخطة..." : "Designing your study plan..."}</span>
              </>
            ) : (
              <>
                <span>✨ {language === "ar" ? "توليد الخطة الدراسية الذكية" : "AI Custom Blueprint"}</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Interactive Blueprint Presentation Viewer */}
        <div className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800 }}>
            {language === "ar" ? "الخطة الدراسية المستخرجة" : "AI Custom Timetable & Goals"}
          </h3>
          <div
            style={{
              flex: 1,
              padding: "1rem",
              borderRadius: "6px",
              border: "1px dashed var(--primary)",
              background: "#ffffff",
              overflowY: "auto",
              minHeight: "350px",
            }}
            className="custom-scrollbar"
          >
            {planResult ? (
              <div style={{ fontSize: "0.85rem", lineHeight: "1.6", fontFamily: "var(--font-sans)" }}>
                {renderPremiumContent(planResult)}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", color: "#6a7c88", fontSize: "0.85rem", gap: "0.5rem", padding: "2rem", textAlign: "center" }}>
                <span style={{ fontSize: "2.5rem" }}>📅</span>
                <span>
                  {language === "ar"
                    ? "اختر النطاق التعليمي واضغط على زر توليد الخطة لعرض الخارطة الأكاديمية المصممة لك"
                    : "Select your academic focus on the left and tap generate to paint your custom timeline map"}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Persistent History Panel */}
      <div className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800, borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.5rem" }}>
          {language === "ar" ? "🗂️ خطط المذاكرة السابقة" : "🗂️ Study Blueprint History"}
        </h3>

        {historyLoading && planHistoryList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1rem" }}>
            <FiRefreshCw className="spinning-icon" style={{ fontSize: "1.5rem", color: "var(--primary)" }} />
          </div>
        ) : planHistoryList.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "#6a7c88", margin: 0 }}>
            {language === "ar" ? "لا توجد خطط مذاكرة محفوظة حالياً." : "No previously saved study blueprints found."}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="grid-cols-1">
            {planHistoryList.map((run, index) => {
              const details = run.details || {};
              const formattedDate = new Date(run.timestamp || Date.now()).toLocaleDateString(
                language === "ar" ? "ar-EG" : "en-US",
                { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
              );
              return (
                <div
                  key={run._id || index}
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    border: "1px solid var(--card-border)",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    transition: "all 0.15s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)", background: "rgba(16, 107, 163, 0.05)", padding: "2px 8px", borderRadius: "10px" }}>
                        {details.scopeType === "book" ? (language === "ar" ? "كتاب مدرسي" : "Book Blueprint") : (language === "ar" ? "مادة عامة" : "Subject Blueprint")}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#8fa0ac" }}>{formattedDate}</span>
                    </div>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0.25rem 0" }}>
                      {language === "ar" ? details.materialDescAr : details.materialDescEn}
                    </h4>
                    {details.prompt && (
                      <p style={{ fontSize: "0.8rem", color: "#6a7c88", margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        "{details.prompt}"
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleOpenPreviousPlan(run)}
                    className="btn btn-outline"
                    style={{ padding: "5px 10px", fontSize: "0.8rem", fontWeight: 700, alignSelf: "flex-end" }}
                  >
                    {language === "ar" ? "📂 عرض واستعادة الخطة" : "📂 Open Blueprint"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Workspace Activity logs */}
      {renderSpaceHistory()}
    </div>
  );
};
