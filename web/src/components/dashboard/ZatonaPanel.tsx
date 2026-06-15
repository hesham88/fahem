"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FiRefreshCw, FiBookOpen, FiActivity, FiFolder } from "react-icons/fi";
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

interface ZatonaPanelProps {
  language: "ar" | "en";
  zatonaPrompt: string;
  setZatonaPrompt: (val: string) => void;
  zatonaResult: string;
  setZatonaResult: (val: string) => void;
  zatonaLoading: boolean;
  setZatonaLoading: (val: boolean) => void;
  dynamicBooks: Book[];
  renderSpaceSelectorBar: (tab: "practice" | "plan" | "timetable" | "zatona") => React.ReactNode;
  renderSpaceHistory: () => React.ReactNode;
  addSpaceHistory: (actionEn: string, actionAr: string) => void;
  renderPremiumContent: (text: string) => React.ReactNode;
  user: any;
}

/**
 * ZatonaPanel: A component representing the "Zatona AI Summary & Research Hub".
 * This is an AI summary engine that processes custom textbook excerpts, general topics, or specific books,
 * and extracts concise, high-yield digests with persistent history.
 */
export const ZatonaPanel: React.FC<ZatonaPanelProps> = ({
  language,
  zatonaPrompt,
  setZatonaPrompt,
  zatonaResult,
  setZatonaResult,
  zatonaLoading,
  setZatonaLoading,
  dynamicBooks,
  renderSpaceSelectorBar,
  renderSpaceHistory,
  addSpaceHistory,
  renderPremiumContent,
  user,
}) => {
  // Zatona Selector States
  const [scopeType, setScopeType] = useState<"text" | "subject" | "book">("text");
  const [selectedSubject, setSelectedSubject] = useState<string>("Math");
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [customConcepts, setCustomConcepts] = useState<string>("");

  // History States
  const [zatonaHistoryList, setZatonaHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Local Presentation Result State (prevents stale text display on submit)
  const [localResult, setLocalResult] = useState<string>("");

  useEffect(() => {
    setLocalResult(zatonaResult || "");
  }, [zatonaResult]);

  // Initialize selectedBookId when dynamicBooks load
  useEffect(() => {
    if (dynamicBooks && dynamicBooks.length > 0 && !selectedBookId) {
      setSelectedBookId(dynamicBooks[0]._id || dynamicBooks[0].id || "");
    }
  }, [dynamicBooks, selectedBookId]);

  // Fetch persistent history
  const fetchZatonaHistory = async () => {
    if (!user?.uid) return;
    setHistoryLoading(true);
    try {
      const res = await authedFetch("/api/activity");
      if (res.ok) {
        const data = await res.json();
        const activities = data.activities || [];
        const zatonaRuns = activities.filter((act: any) => act.action === "zatona_session");
        setZatonaHistoryList(zatonaRuns);
      }
    } catch (err) {
      console.error("Failed to fetch zatona history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchZatonaHistory();
  }, [user]);

  // Listen for custom launch Zatona event from companion agent
  useEffect(() => {
    const handleLaunchZatona = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.data) {
        const { report, concept } = customEvent.detail.data;
        if (report) {
          setZatonaResult(report);
        }
        if (concept) {
          setZatonaPrompt(concept);
        }
        // Force text scope so it matches what we pasted/created
        setScopeType("text");
        // Re-fetch the history so the new run appears in the list
        fetchZatonaHistory();
      }
    };

    window.addEventListener("fahemLaunchZatona", handleLaunchZatona);
    return () => window.removeEventListener("fahemLaunchZatona", handleLaunchZatona);
  }, [setZatonaResult, setZatonaPrompt]);

  /**
   * Triggers the server endpoint to digest and summarize the user-provided textbook topic or textbook scope.
   */
  const handleExportZatonaPdf = () => {
    const node = document.getElementById("zatona-result-content");
    if (!node) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const dir = language === "ar" ? "rtl" : "ltr";
    win.document.write(`<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"><title>Fahem — Zatona Summary</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:28px;line-height:1.7;color:#111}h1,h2,h3{color:#106ba3}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:start}code{background:#f3f4f6;padding:2px 5px;border-radius:4px;font-family:monospace}blockquote{border-inline-start:4px solid #106ba3;margin:0;padding-inline-start:12px;color:#374151}</style></head><body>${node.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { try { win.print(); } catch (e) {} }, 350);
  };

  const handleDigestEssence = useCallback(async (overrideParams?: {
    scopeType?: "text" | "subject" | "book";
    subject?: string;
    bookId?: string;
    chapters?: string[];
    customConcepts?: string;
    prompt?: string;
  }) => {
    if (zatonaLoading) return;

    const finalScopeType = overrideParams?.scopeType ?? scopeType;
    const finalSubject = overrideParams?.subject ?? selectedSubject;
    const finalBookId = overrideParams?.bookId ?? selectedBookId;
    const finalChapters = overrideParams?.chapters ?? selectedChapters;
    const finalCustomConcepts = overrideParams?.customConcepts ?? customConcepts;
    const finalPrompt = overrideParams?.prompt ?? zatonaPrompt;

    // Compose custom concept prompt depending on target scope
    let conceptQuery = "";
    let materialDescEn = "";
    let materialDescAr = "";

    if (finalScopeType === "text") {
      if (!finalPrompt.trim()) return;
      conceptQuery = finalPrompt;
      materialDescEn = "Pasted Custom Excerpt";
      materialDescAr = "مقتطف دراسي مخصص";
    } else if (finalScopeType === "subject") {
      conceptQuery = `General academic subject: ${finalSubject}. ${finalPrompt ? `Focus on: ${finalPrompt}` : ""}`;
      materialDescEn = `General Subject (${finalSubject})`;
      materialDescAr = `مادة عامة (${finalSubject})`;
    } else if (finalScopeType === "book") {
      const activeBook = dynamicBooks?.find(b => (b._id || b.id) === finalBookId);
      const bookTitleEn = activeBook?.title || "Selected Book";
      const bookTitleAr = activeBook?.titleAr || "الكتاب المحدد";
      const chsStr = finalChapters.length > 0 ? ` chapters: ${finalChapters.join(", ")}` : "all chapters";
      conceptQuery = `Textbook "${bookTitleEn}" (${chsStr}). ${finalCustomConcepts ? `Concepts to focus: ${finalCustomConcepts}.` : ""} ${finalPrompt ? `Instructions: ${finalPrompt}` : ""}`;
      materialDescEn = `Textbook: ${bookTitleEn} (${finalChapters.length > 0 ? finalChapters.length + " chs" : "Full Book"})`;
      materialDescAr = `كتاب: ${bookTitleAr} (${finalChapters.length > 0 ? finalChapters.length + " فصول" : "الكتاب كاملاً"})`;
    }

    setLocalResult("");
    setZatonaLoading(true);
    setZatonaResult("");

    try {
      const res = await authedFetch("/api/zatona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: conceptQuery, language }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.report) {
          setZatonaResult(data.report);

          // Persist the run in user activity history (fail-safe database-backed history)
          await authedFetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "zatona_session",
              status: "success",
              details: {
                scopeType: finalScopeType,
                subject: finalSubject,
                bookId: finalBookId,
                chapters: finalChapters,
                concepts: finalCustomConcepts,
                prompt: finalPrompt,
                result: data.report,
                materialDescEn,
                materialDescAr,
                timestamp: new Date().toISOString()
              }
            })
          });

          // Refresh history and add to workspace audit log
          fetchZatonaHistory();
          addSpaceHistory(
            `Digested high-yield Zatona summary for ${materialDescEn}`,
            `تم عصر ملخص الزتونة لـ ${materialDescAr}`
          );
        } else {
          setZatonaResult(
            language === "ar" ? "⚠️ حدث خطأ أثناء عصر الزتونة." : "⚠️ Error digesting textbook essence."
          );
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setZatonaResult(
          language === "ar" 
            ? `⚠️ فشل الاتصال بالخادم الذكي: ${errJson.error || "خطأ غير معروف"}` 
            : `⚠️ Server connection failed: ${errJson.error || "Unknown error"}`
        );
      }
    } catch (err) {
      console.error("Zatona digest error:", err);
      setZatonaResult(
        language === "ar" ? "⚠️ خطأ غير متوقع." : "⚠️ Unexpected error occurred."
      );
    } finally {
      setZatonaLoading(false);
    }
  }, [
    scopeType,
    selectedSubject,
    selectedBookId,
    selectedChapters,
    customConcepts,
    zatonaPrompt,
    zatonaLoading,
    dynamicBooks,
    language,
    setZatonaLoading,
    setZatonaResult,
    addSpaceHistory
  ]);

  // Listen for custom fill and launch Zatona event
  useEffect(() => {
    const handleFillAndLaunch = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const {
          scopeType: incomingScope,
          subject,
          bookId,
          chapters,
          customConcepts: incomingConcepts,
          prompt
        } = customEvent.detail;

        if (incomingScope) setScopeType(incomingScope);
        if (subject) setSelectedSubject(subject);
        if (bookId) setSelectedBookId(bookId);
        if (chapters) setSelectedChapters(chapters);
        if (incomingConcepts !== undefined) setCustomConcepts(incomingConcepts);
        if (prompt !== undefined) setZatonaPrompt(prompt);

        // Auto-fire digest!
        handleDigestEssence({
          scopeType: incomingScope,
          subject,
          bookId,
          chapters,
          customConcepts: incomingConcepts,
          prompt
        });
      }
    };

    window.addEventListener("fahemFillAndLaunchZatona", handleFillAndLaunch);
    return () => window.removeEventListener("fahemFillAndLaunchZatona", handleFillAndLaunch);
  }, [handleDigestEssence]);

  // Open/Resume previous saved summary
  const handleOpenPreviousSummary = (run: any) => {
    const details = run.details || {};
    setZatonaResult(details.result || "");
    setScopeType(details.scopeType || "text");
    if (details.scopeType === "book") {
      setSelectedBookId(details.bookId || "");
      setSelectedChapters(details.chapters || []);
      setCustomConcepts(details.concepts || "");
    } else if (details.scopeType === "subject") {
      setSelectedSubject(details.subject || "Math");
    }
    setZatonaPrompt(details.prompt || "");

    // Add activity trace to local workspace audit log
    const descEn = details.materialDescEn || "Previous Summary";
    const descAr = details.materialDescAr || "ملخص زتونة سابق";
    addSpaceHistory(`Opened previous Zatona summary for ${descEn}`, `تم فتح ملخص الزتونة لـ ${descAr}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Space Bar Swapper */}
      {renderSpaceSelectorBar("zatona")}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }} className="grid-cols-1">
        
        {/* Left Side: Summary prompt generator & Material selectors */}
        <div
          className="panel-card"
          style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <h3
            style={{
              fontSize: "1.1rem",
              margin: 0,
              fontWeight: 800,
              borderBottom: "1px dashed rgba(235, 220, 185, 0.4)",
              paddingBottom: "0.5rem",
            }}
          >
            {language === "ar" ? "الزتونة: مركز التلخيص واستخراج الجوهر" : "Zatona: High-Yield AI Summary Engine"}
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#4f6371", margin: 0, lineHeight: "1.6" }}>
            {language === "ar"
              ? "اكتب فكرة، أو الصق مقتطفاً من كتابك، أو اختر كتاباً دراسياً كاملاً لتلخيصه. سيقوم عميل فاهم الذكي باستخراج الجوهر الصافي والدراسة المفيدة فوراً."
              : "Paste text, choose a subject, or select a textbook scope. Our AI will digest, extract, and present a warm, concise report containing only the pure essence and academic value."}
          </p>

          {/* Scope Selector Row: Text vs Subject vs Book */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setScopeType("text")}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                minWidth: "100px",
                background: scopeType === "text" ? "var(--primary)" : "#f0f4f8",
                color: scopeType === "text" ? "#ffffff" : "var(--foreground)",
                border: "1px solid " + (scopeType === "text" ? "var(--primary)" : "var(--card-border)"),
                transition: "all 0.2s",
              }}
            >
              {language === "ar" ? "نص ملصق مخصص" : "Pasted Text"}
            </button>
            <button
              onClick={() => setScopeType("subject")}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                minWidth: "100px",
                background: scopeType === "subject" ? "var(--primary)" : "#f0f4f8",
                color: scopeType === "subject" ? "#ffffff" : "var(--foreground)",
                border: "1px solid " + (scopeType === "subject" ? "var(--primary)" : "var(--card-border)"),
                transition: "all 0.2s",
              }}
            >
              {language === "ar" ? "مادة عامة" : "Umbrella Subject"}
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
                minWidth: "100px",
                background: scopeType === "book" ? "var(--primary)" : "#f0f4f8",
                color: scopeType === "book" ? "#ffffff" : "var(--foreground)",
                border: "1px solid " + (scopeType === "book" ? "var(--primary)" : "var(--card-border)"),
                transition: "all 0.2s",
              }}
            >
              {language === "ar" ? "كتاب مدرسي محدد" : "Specific Book"}
            </button>
          </div>

          {/* Dynamic Selection Dropdowns */}
          {scopeType === "subject" && (
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
          )}

          {scopeType === "book" && (
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
                        {language === "ar" ? "📍 حدد فصول الكتاب المستهدفة للتلخيص (خيارات متعددة):" : "📍 Select Target Chapters (Multiple Selection):"}
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
                          {language === "ar" ? "لا توجد فصول مسجلة لهذا الكتاب، سيتم تلخيص الكتاب كاملاً." : "No structured chapters recorded. Full textbook will be targeted."}
                        </div>
                      )}

                      {/* Focus Concepts focus input */}
                      <div style={{ marginTop: "0.8rem", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "0.8rem" }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--foreground)", display: "block", marginBottom: "0.3rem" }}>
                          {language === "ar" ? "🏷️ أدخل مفاهيم دراسية محددة لتركيز التلخيص عليها:" : "🏷️ Focus on specific concepts, titles, or tags:"}
                        </label>
                        <input
                          type="text"
                          value={customConcepts}
                          onChange={(e) => setCustomConcepts(e.target.value)}
                          placeholder={language === "ar" ? "اكتب المواضيع هنا تفصلها فواصل (مثال: الهضم)..." : "Type custom concepts separated by commas..."}
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

          {/* Text Prompt input */}
          <textarea
            value={zatonaPrompt}
            onChange={(e) => setZatonaPrompt(e.target.value)}
            placeholder={
              scopeType === "text"
                ? (language === "ar" ? "الصق النص أو المقتطف الدراسي هنا ليقوم المحرك بعصره واستخراج خلاصته الصافية..." : "Paste the custom textbook excerpt or text here to squeeze its essence...")
                : (language === "ar" ? "اكتب توجيهات إضافية لتركيز ملخص الزتونة (اختياري)..." : "Type additional directions to guide your Zatona summary (optional)...")
            }
            style={{
              width: "100%",
              height: "120px",
              padding: "0.75rem",
              borderRadius: "var(--border-radius-sm)",
              border: "1px solid var(--card-border)",
              outline: "none",
              fontSize: "0.85rem",
              fontFamily: "var(--font-sans)",
              resize: "none",
            }}
          />

          <button
            disabled={zatonaLoading || (scopeType === "text" && !zatonaPrompt.trim())}
            onClick={() => handleDigestEssence()}
            className="btn btn-primary"
            style={{ padding: "10px", fontWeight: 700 }}
          >
            {zatonaLoading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <FiRefreshCw className="spinning-icon" />
                <span>{language === "ar" ? "جاري عصر واستخراج الزتونة..." : "Digesting textbook essence..."}</span>
              </span>
            ) : (
              <span>✨ {language === "ar" ? "عصر واستخراج الزتونة الذكية" : "Digest Textbook Essence"}</span>
            )}
          </button>
        </div>

        {/* Right Side: Report Presentation Viewer */}
        <div
          className="panel-card"
          style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800 }}>
            {language === "ar" ? "تقرير التلخيص المستخرج" : "Zatona AI Presentation"}
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
            {zatonaLoading ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  minHeight: "310px",
                  color: "var(--primary)",
                  fontSize: "0.9rem",
                  gap: "0.75rem",
                  padding: "2rem",
                  textAlign: "center"
                }}
              >
                <FiRefreshCw className="spinning-icon" style={{ fontSize: "2rem", animation: "spin 2s linear infinite" }} />
                <span style={{ fontWeight: 700 }}>
                  {language === "ar" ? "جاري عصر واستخراج الزتونة..." : "Digesting textbook essence..."}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                  {language === "ar" ? "المحرك الذكي يقوم بتحليل المحتوى وتكثيفه" : "Smart engine is analyzing and condensing the content"}
                </span>
              </div>
            ) : localResult ? (
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={handleExportZatonaPdf}
                    style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", fontWeight: 700, padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--primary)", cursor: "pointer" }}
                  >
                    📄 {language === "ar" ? "تصدير PDF" : "Export PDF"}
                  </button>
                </div>
                <div id="zatona-result-content" style={{ fontSize: "0.85rem", lineHeight: "1.6", fontFamily: "var(--font-sans)" }}>
                  {renderPremiumContent(localResult)}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  minHeight: "310px",
                  color: "#6a7c88",
                  fontSize: "0.85rem",
                  gap: "0.5rem",
                  padding: "2rem",
                  textAlign: "center"
                }}
              >
                <span>🍋</span>
                <span>
                  {language === "ar"
                    ? "اختر النطاق التعليمي واضغط على زر عصر الزتونة الذكية لعرض الخلاصة"
                    : "Select your study focus on the left and tap digest to squeeze its pure essence"}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Persistent History Panel */}
      <div className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800, borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.5rem" }}>
          {language === "ar" ? "🗂️ ملخصات الزتونة السابقة" : "🗂️ Zatona Summary History"}
        </h3>

        {historyLoading && zatonaHistoryList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1rem" }}>
            <FiRefreshCw className="spinning-icon" style={{ fontSize: "1.5rem", color: "var(--primary)" }} />
          </div>
        ) : zatonaHistoryList.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "#6a7c88", margin: 0 }}>
            {language === "ar" ? "لا توجد ملخصات زتونة محفوظة حالياً." : "No previously squeezed summaries found."}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="grid-cols-1">
            {zatonaHistoryList.map((run, index) => {
              const details = run.details || {};
              const formattedDate = run.timestamp
                ? new Date(run.timestamp).toLocaleDateString(
                    language === "ar" ? "ar-EG" : "en-US",
                    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                  )
                : "";
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
                        {details.scopeType === "book" ? (language === "ar" ? "كتاب مدرسي" : "Book Digest") : (details.scopeType === "subject" ? (language === "ar" ? "مادة عامة" : "Subject Digest") : (language === "ar" ? "نص ملصق" : "Pasted Text"))}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#8fa0ac" }}>{formattedDate}</span>
                    </div>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0.25rem 0" }}>
                      {language === "ar" ? details.materialDescAr : details.materialDescEn}
                    </h4>
                    {details.prompt && (
                      <p style={{ fontSize: "0.8rem", color: "#6a7c88", margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        &quot;{details.prompt}&quot;
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleOpenPreviousSummary(run)}
                    className="btn btn-outline"
                    style={{ padding: "5px 10px", fontSize: "0.8rem", fontWeight: 700, alignSelf: "flex-end" }}
                  >
                    {language === "ar" ? "📂 عرض واستعادة الخلاصة" : "📂 Open Summary"}
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
