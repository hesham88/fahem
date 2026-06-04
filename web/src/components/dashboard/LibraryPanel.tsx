"use client";

import React, { useState } from "react";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../../lib/firebase";

interface Book {
  _id?: string;
  id?: string;
  title: string;
  title_ar?: string;
  titleEn?: string;
  titleAr?: string;
  subject?: string;
  subject_id?: string;
  size?: string;
  format?: string;
  downloads?: string;
  isMoeIngested?: boolean;
  isUserUpload?: boolean;
  chapters?: any[];
}

interface LibraryPanelProps {
  language: string;
  user: any;
  selectedBookReader: Book | null;
  setSelectedBookReader: (b: Book | null) => void;
  loadedBookPages: any[];
  setLoadedBookPages: (pages: any[]) => void;
  loadingBookPages: boolean;
  readerCurrentPage: number;
  setReaderCurrentPage: (p: number) => void;
  selectedText: string;
  setSelectedText: (t: string) => void;
  bubbleCoords: { x: number; y: number } | null;
  setBubbleCoords: (coords: { x: number; y: number } | null) => void;
  getAllPages: (book: Book, pages: any[]) => any[];
  moeIngestedBooks: any[];
  dynamicBooks: any[];
  librarySearch: string;
  setLibrarySearch: (val: string) => void;
  librarySubject: string;
  setLibrarySubject: (val: string) => void;
  customUploadedBooks: any[];
  setCustomUploadedBooks: React.Dispatch<React.SetStateAction<any[]>>;
  dynamicMaxUploadSize: number;
  handleStartStudy: (item: any) => void;
  t: (key: string) => string;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  language,
  user,
  selectedBookReader,
  setSelectedBookReader,
  loadedBookPages,
  loadingBookPages,
  readerCurrentPage,
  setReaderCurrentPage,
  setSelectedText,
  bubbleCoords,
  setBubbleCoords,
  getAllPages,
  moeIngestedBooks,
  dynamicBooks,
  librarySearch,
  setLibrarySearch,
  librarySubject,
  setLibrarySubject,
  customUploadedBooks,
  setCustomUploadedBooks,
  dynamicMaxUploadSize,
  handleStartStudy,
  t
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifierLog, setVerifierLog] = useState<string[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectedInfo, setRejectedInfo] = useState<any>(null);

  const runVerifierAgent = async (file: File, storagePath: string, downloadURL: string) => {
    setIsVerifying(true);
    setVerifierLog([
      language === "ar" ? "🕵️‍♂️ بدء وكيل التحقق الأكاديمي لـ فهم..." : "🕵️‍♂️ Starting Fahem Academic Verifier Agent...",
    ]);

    const addLogWithDelay = (msg: string, delay: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setVerifierLog((prev) => [...prev, msg]);
          resolve();
        }, delay);
      });
    };

    await addLogWithDelay(
      language === "ar" 
        ? `📂 تحليل خصائص الملف: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
        : `📂 Analyzing file properties: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      400
    );

    await addLogWithDelay(
      language === "ar"
        ? `🔒 استخراج التوقيع الرقمي وصيغة الملف: ${file.name.split('.').pop()?.toUpperCase()}`
        : `🔒 Extracting digital signature and format: ${file.name.split('.').pop()?.toUpperCase()}`,
      500
    );

    await addLogWithDelay(
      language === "ar"
        ? "🧠 تشغيل نموذج الذكاء الاصطناعي لفحص المحتوى والملاءمة التعليمية..."
        : "🧠 Calling AI model to evaluate content & educational relevance...",
      600
    );

    try {
      const response = await fetch("/api/books/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileFormat: file.name.split('.').pop() || "",
          downloadUrl: downloadURL,
          userId: user?.uid,
        }),
      });

      const data = await response.json();
      if (data.success && data.verdict) {
        const verdict = data.verdict;
        if (verdict.isAcademic) {
          await addLogWithDelay(
            language === "ar"
              ? `✅ تم التحقق بنجاح! التصنيف: ${verdict.category} (الثقة: ${verdict.confidence}%)`
              : `✅ Verification Successful! Category: ${verdict.category} (Confidence: ${verdict.confidence}%)`,
            400
          );

          // Trigger ingestion in /api/books
          await fetch("/api/books", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: file.name.replace(/\.[^/.]+$/, ""),
              userId: user?.uid,
              storagePath: storagePath,
              downloadUrl: downloadURL,
              sizeBytes: file.size,
              format: file.name.split('.').pop()?.toUpperCase() || "PDF"
            })
          });

          const categoryToSubject: Record<string, string> = {
            "Mathematics": "Math",
            "Science": "Science",
            "History": "History",
            "Language": "Arabic",
            "Computer Science": "Science",
            "Engineering": "Science",
            "General Education": "Science"
          };
          const detectedSubject = categoryToSubject[verdict.category] || "Science";

          const newBook = {
            titleEn: file.name.replace(/\.[^/.]+$/, ""),
            titleAr: file.name.replace(/\.[^/.]+$/, ""),
            subject: detectedSubject,
            size: (file.size / (1024 * 1024)).toFixed(1) + " MB",
            format: file.name.split('.').pop()?.toUpperCase() || "PDF",
            downloads: "0",
            isUserUpload: true
          };

          setCustomUploadedBooks(prev => [newBook, ...prev]);
        } else {
          // Rejecting
          await addLogWithDelay(
            language === "ar" ? "❌ فشل التحقق! الملف لا يحتوي على مواد أكاديمية أو تعليمية." : "❌ Verification Failed! Non-academic content detected.",
            400
          );

          // Delete from storage
          const storageRef = ref(storage, storagePath);
          await deleteObject(storageRef);

          setRejectedInfo({
            fileName: file.name,
            confidence: verdict.confidence,
            category: verdict.category,
            rationaleEn: verdict.rationaleEn,
            rationaleAr: verdict.rationaleAr,
          });
          setShowRejectModal(true);
        }
      } else {
        throw new Error("Invalid response structure from verifier API.");
      }
    } catch (err) {
      console.error("Verification system error:", err);
      alert(language === "ar" ? "حدث خطأ أثناء فحص الملف." : "An error occurred during file verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {selectedBookReader ? (
        /* Premium Dual-Panel Interactive Reader Layout */
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Reader Header Bar */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "rgba(255, 255, 255, 0.4)", backdropFilter: "blur(10px)",
            padding: "1rem 1.5rem", borderRadius: "16px", border: "1px solid rgba(16, 107, 163, 0.08)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button
                onClick={() => setSelectedBookReader(null)}
                style={{
                  padding: "8px 16px", borderRadius: "20px", border: "1px solid var(--card-border)",
                  background: "#ffffff", color: "var(--primary)", fontWeight: 700, fontSize: "0.85rem",
                  cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "0.4rem"
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(16, 107, 163, 0.05)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "#ffffff"; }}
              >
                ⬅️ {language === "ar" ? "المكتبة" : "Library"}
              </button>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                  {language === "ar" ? (selectedBookReader.titleAr || selectedBookReader.title) : (selectedBookReader.titleEn || selectedBookReader.title)}
                </h2>
                <p style={{ fontSize: "0.75rem", color: "#6a7c88", margin: 0 }}>
                  {language === "ar" ? "جلسة دراسة تفاعلية نشطة مع رفيق فهم" : "Active chapter-linked study companion session"}
                </p>
              </div>
            </div>
            <div style={{
              padding: "6px 14px", borderRadius: "20px", background: "rgba(16, 107, 163, 0.08)",
              color: "var(--primary)", fontWeight: 800, fontSize: "0.8rem"
            }}>
              🎓 {selectedBookReader.subject === "Math" ? (language === "ar" ? "رياضيات" : "Math") :
                  selectedBookReader.subject === "Science" ? (language === "ar" ? "علوم" : "Science") :
                  selectedBookReader.subject === "Arabic" ? (language === "ar" ? "عربي" : "Arabic") :
                  (language === "ar" ? "تاريخ" : "History")}
            </div>
          </div>

          {/* Reader Split Panels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }} className="grid-cols-1">
            {/* Textbook Viewer Panel */}
            {(() => {
              const allPages = getAllPages(selectedBookReader, loadedBookPages);
              const totalPagesCount = allPages.length || 1;
              const activePage = allPages[readerCurrentPage - 1] || allPages[0] || {
                pageNum: 1,
                titleEn: "Untitled Section",
                titleAr: "قسم غير معنون",
                contentEn: "",
                contentAr: ""
              };

              return (
                <div 
                  className="panel-card" 
                  onMouseUp={() => {
                    const selection = window.getSelection();
                    if (!selection) return;
                    const text = selection.toString().trim();
                    if (text.length > 5) {
                      const range = selection.getRangeAt(0);
                      const rect = range.getBoundingClientRect();
                      setBubbleCoords({
                        x: rect.left + rect.width / 2 + window.scrollX,
                        y: rect.top - 48 + window.scrollY
                      });
                      setSelectedText(text);
                    } else {
                      setBubbleCoords(null);
                      setSelectedText("");
                    }
                  }}
                  style={{
                    padding: "1.75rem", display: "flex", flexDirection: "column",
                    justifyContent: "space-between", minHeight: "550px", position: "relative",
                    background: "rgba(255, 255, 255, 0.75)", backdropFilter: "blur(14px)",
                    border: "1px solid rgba(16, 107, 163, 0.1)",
                    userSelect: "text"
                  }}
                >
                  <div>
                    {/* Page Navigation & Chapters */}
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      marginBottom: "1.5rem", borderBottom: "1px solid rgba(16, 107, 163, 0.08)",
                      paddingBottom: "0.75rem"
                    }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>
                        📖 {language === "ar" ? "الصفحة الحالية" : "Active Section"}: {readerCurrentPage} / {totalPagesCount}
                      </span>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          disabled={readerCurrentPage <= 1}
                          onClick={() => setReaderCurrentPage(Math.max(1, readerCurrentPage - 1))}
                          className="btn btn-secondary"
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        >
                          {language === "ar" ? "السابق" : "Prev"}
                        </button>
                        <button
                          disabled={readerCurrentPage >= totalPagesCount}
                          onClick={() => setReaderCurrentPage(Math.min(totalPagesCount, readerCurrentPage + 1))}
                          className="btn btn-secondary"
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        >
                          {language === "ar" ? "التالي" : "Next"}
                        </button>
                      </div>
                    </div>

                    {loadingBookPages ? (
                      <div style={{ padding: "4rem", textAlign: "center" }}>
                        <div className="pulse-icon" style={{ fontSize: "2rem", marginBottom: "1rem" }}>📖</div>
                        <p style={{ color: "#6a7c88", fontSize: "0.9rem" }}>
                          {language === "ar" ? "جاري استرجاع وفهرسة صفحات الكتاب دراسياً..." : "Retrieving and indexing book pages..."}
                        </p>
                      </div>
                    ) : (
                      <article style={{ lineHeight: "1.8", color: "var(--foreground)", fontFamily: "var(--font-sans)" }}>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px dashed rgba(16, 107, 163, 0.1)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
                          {language === "ar" ? (activePage.titleAr || activePage.titleEn) : (activePage.titleEn || activePage.titleAr)}
                        </h3>
                        <div style={{ fontSize: "1rem", whiteSpace: "pre-line", marginBottom: "1.5rem" }}>
                          {language === "ar" ? activePage.contentAr : activePage.contentEn}
                        </div>

                        {/* Equations / Formulas Area if any */}
                        {activePage.formulas && activePage.formulas.length > 0 && (
                          <div style={{
                            margin: "1.5rem 0", padding: "1rem", borderRadius: "10px",
                            background: "rgba(212, 175, 55, 0.04)", borderLeft: "4px solid var(--secondary)",
                            fontFamily: "monospace", fontSize: "0.95rem"
                          }}>
                            <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#b45309", marginBottom: "0.3rem" }}>
                              📐 {language === "ar" ? "الصيغ والرموز الرياضية المرتبطة" : "Formulas & Equations"}
                            </span>
                            {activePage.formulas.map((form: string, fIdx: number) => (
                              <div key={fIdx}>{form}</div>
                            ))}
                          </div>
                        )}

                        {/* Interactive tips */}
                        {activePage.tipEn && (
                          <div style={{
                            marginTop: "1.5rem", padding: "0.75rem 1rem", borderRadius: "8px",
                            background: "rgba(16, 107, 163, 0.04)", border: "1px solid rgba(16, 107, 163, 0.1)",
                            fontSize: "0.8rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem"
                          }}>
                            <span>💡</span>
                            <span>{language === "ar" ? activePage.tipAr : activePage.tipEn}</span>
                          </div>
                        )}
                      </article>
                    )}
                  </div>

                  {/* Bubble popup actions */}
                  {bubbleCoords && (
                    <div style={{
                      position: "absolute", top: `${bubbleCoords.y}px`, left: `${bubbleCoords.x}px`,
                      transform: "translateX(-50%)", background: "var(--foreground)", color: "var(--background)",
                      padding: "4px 8px", borderRadius: "20px", display: "flex", gap: "0.5rem",
                      zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", whiteSpace: "nowrap"
                    }}>
                      <button
                        onClick={() => {
                          const customEvent = new CustomEvent("fahemAskCompanion", { detail: { text: `Explain this section: "${window.getSelection()?.toString()}"` } });
                          window.dispatchEvent(customEvent);
                          setBubbleCoords(null);
                        }}
                        style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}
                      >
                        🧠 Explain
                      </button>
                      <button
                        onClick={() => {
                          const customEvent = new CustomEvent("fahemAskCompanion", { detail: { text: `Translate or summarize this: "${window.getSelection()?.toString()}"` } });
                          window.dispatchEvent(customEvent);
                          setBubbleCoords(null);
                        }}
                        style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}
                      >
                        📝 Summarize
                      </button>
                    </div>
                  )}

                  {/* Pagination Footer */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "1rem", marginTop: "1rem"
                  }}>
                    <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                      {language === "ar" ? "اضغط واسحب لتحديد أي نص لمناقشته فوراً مع رفيق فهم" : "Highlight any text on the page to ask your companion"}
                    </span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)" }}>
                      {readerCurrentPage} / {totalPagesCount}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* Regular Library List & Personal Vault Layout */
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Header search controls */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: "1rem", background: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(10px)", padding: "1rem", borderRadius: "16px",
            border: "1px solid rgba(16, 107, 163, 0.08)"
          }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["all", "Math", "Science", "Arabic", "History"].map((subject) => (
                <button
                  key={subject}
                  onClick={() => setLibrarySubject(subject)}
                  style={{
                    padding: "6px 14px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 700,
                    cursor: "pointer", border: librarySubject === subject ? "none" : "1px solid var(--card-border)",
                    background: librarySubject === subject ? "linear-gradient(135deg, var(--primary), var(--secondary))" : "#ffffff",
                    color: librarySubject === subject ? "#ffffff" : "#475569", transition: "all 0.2s"
                  }}
                >
                  {subject === "all" ? (language === "ar" ? "الكل" : "All Subjects") :
                   subject === "Math" ? (language === "ar" ? "الرياضيات" : "Mathematics") :
                   subject === "Science" ? (language === "ar" ? "العلوم والفيزياء" : "Science & Chemistry") :
                   subject === "Arabic" ? (language === "ar" ? "اللغة العربية" : "Arabic Grammar") :
                   (language === "ar" ? "التاريخ الاجتماعي" : "History & Humanities")}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder={language === "ar" ? "ابحث عن كتاب دراسي..." : "Search course textbooks..."}
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              style={{
                padding: "0.5rem 1rem", borderRadius: "10px", border: "1px solid var(--card-border)",
                fontSize: "0.85rem", width: "100%", maxWidth: "250px", outline: "none", fontFamily: "var(--font-sans)"
              }}
            />
          </div>

          {/* Book Catalog Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {((() => {
              const dynamicList = [
                ...(moeIngestedBooks && moeIngestedBooks.length > 0 ? moeIngestedBooks.map((b: any) => ({
                  titleEn: b.titleEn,
                  titleAr: b.titleAr,
                  subject: b.subject,
                  size: b.size,
                  format: b.format,
                  downloads: b.downloads,
                  isMoeIngested: true,
                  _id: b._id || b.id
                })) : []),
                ...(dynamicBooks && dynamicBooks.length > 0 ? dynamicBooks.map((b: any) => ({
                  titleEn: b.title,
                  titleAr: b.title_ar || b.title,
                  subject: b.subject_id === "subj_algebra_stats" ? "Math" : b.subject_id === "subj_biology" ? "Science" : b.subject_id === "subj_arabic_grammar" ? "Arabic" : "History",
                  size: "15.0 MB",
                  format: "PDF",
                  downloads: "1,450",
                  _id: b._id || b.id,
                  chapters: b.chapters
                })) : [])
              ];
              if (dynamicList.length > 0) {
                return dynamicList;
              }
              return [
                { _id: "book_algebra_stats_1", titleEn: "Advanced Mathematics Grade 9", titleAr: "الرياضيات المتقدمة - الصف التاسع", subject: "Math", size: "14.5 MB", format: "PDF", downloads: "1,240" },
                { _id: "book_biology_1", titleEn: "Comprehensive Chemistry Handbook", titleAr: "كتاب الكيمياء الشامل والمبسط", subject: "Science", size: "18.2 MB", format: "PDF", downloads: "854" },
                { _id: "book_arabic_1", titleEn: "Arabic Literature and Poetry Anthology", titleAr: "روائع الأدب العربي والشعر", subject: "Arabic", size: "9.1 MB", format: "EPUB", downloads: "2,105" },
                { _id: "book_history_1", titleEn: "Modern History of the Middle East", titleAr: "التاريخ الحديث للشرق الأوسط", subject: "History", size: "12.4 MB", format: "PDF", downloads: "412" }
              ];
            })() as any[])
              .filter(item => {
                const s = librarySearch.toLowerCase();
                const titleMatch = (item.titleEn || "").toLowerCase().includes(s) || (item.titleAr || "").includes(s);
                const matchesSub = librarySubject === "all" || item.subject === librarySubject;
                return titleMatch && matchesSub;
              })
              .map((item, idx) => (
                <div key={idx} className="panel-card" style={{
                  padding: "1.25rem", display: "flex", flexDirection: "column",
                  justifyContent: "space-between", height: "190px", position: "relative", transition: "all 0.2s"
                }} onMouseOver={(e)=>{e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.borderColor="var(--primary)"}} onMouseLeave={(e)=>{e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="var(--card-border)"}}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.3rem" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", background: "rgba(16, 107, 163, 0.08)", color: "var(--primary)", padding: "2px 8px", borderRadius: "10px", display: "inline-block" }}>
                        {item.subject === "Math" ? (language === "ar" ? "رياضيات" : "Math") :
                         item.subject === "Science" ? (language === "ar" ? "علوم" : "Science") :
                         item.subject === "Arabic" ? (language === "ar" ? "عربي" : "Arabic") :
                         (language === "ar" ? "تاريخ" : "History")}
                      </span>
                      {item.isMoeIngested && (
                        <span style={{ fontSize: "0.65rem", fontWeight: 800, background: "rgba(46, 125, 50, 0.12)", color: "var(--accent-green)", padding: "2px 6px", borderRadius: "8px", display: "inline-block" }}>
                          🏛️ {language === "ar" ? "منهج رسمي معتمد" : "MOE Official"}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--foreground)", fontFamily: "var(--font-sans)" }}>
                      {language === "ar" ? item.titleAr : item.titleEn}
                    </h3>
                    <p style={{ fontSize: "0.75rem", color: "#6a7c88", margin: 0 }}>💾 {item.format} | 📦 {item.size}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "#4f6371" }}>📥 {item.downloads} {language === "ar" ? "تحميل" : "downloads"}</span>
                      <div style={{ display: "flex", gap: "0.3rem" }}>
                        <button
                          onClick={() => alert(language === "ar" ? `جاري تحميل ملف: ${item.titleAr}` : `Downloading textbook: ${item.titleEn}`)}
                          style={{
                            padding: "4px 8px", borderRadius: "20px", border: "1px solid rgba(16, 107, 163, 0.15)", cursor: "pointer",
                            background: "#ffffff", color: "var(--primary)",
                            fontSize: "0.75rem", fontWeight: 700
                          }}
                        >
                          📥
                        </button>
                        <button
                          onClick={() => handleStartStudy(item)}
                          style={{
                            padding: "4px 10px", borderRadius: "20px", border: "none", cursor: "pointer",
                            background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#ffffff",
                            fontSize: "0.75rem", fontWeight: 700
                          }}
                        >
                          📖 {language === "ar" ? "دراسة وتفاعل" : "Study"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Study Vault - User Personal Uploads Section */}
          <div style={{
            marginTop: "2.5rem", padding: "1.75rem", borderRadius: "20px",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.65), rgba(212, 175, 55, 0.05))",
            border: "1px solid rgba(212, 175, 55, 0.15)", backdropFilter: "blur(12px)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--foreground)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  🔒 {language === "ar" ? "خزنة دراستي الخاصة (تحميل آمن)" : "My Study Vault (Secure Ingestion)"}
                </h3>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#6a7c88" }}>
                  {language === "ar" 
                    ? `قم بتحميل وثائقك وأبحاثك الشخصية لدراستها ومذاكرتها بشكل تفاعلي مع رفيق فهم (بحد أقصى ${dynamicMaxUploadSize} ميجابايت).`
                    : `Upload personal notes or guides to study interactively with your companion (strict ${dynamicMaxUploadSize}MB limit).`}
                </p>
              </div>

              <label style={{
                padding: "0.75rem 1.25rem", fontSize: "0.85rem", fontWeight: 700, borderRadius: "12px",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#ffffff",
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem", transition: "all 0.2s"
              }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "none"; }}>
                <span>📁 {language === "ar" ? "تحميل مستند دراسي" : "Upload Document"}</span>
                <input
                  type="file"
                  accept=".pdf,.docx,image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > dynamicMaxUploadSize * 1024 * 1024) {
                        alert(language === "ar" 
                          ? `خطأ: حجم الملف يتجاوز الحد الأقصى (${dynamicMaxUploadSize} ميجابايت) للمستندات الخاصة.` 
                          : `Error: Study document exceeds the strict ${dynamicMaxUploadSize}MB upload limit.`);
                        e.target.value = "";
                        return;
                      }
                      const storagePath = "user_uploads/" + user?.uid + "/" + Date.now() + "_" + file.name;
                      const storageRef = ref(storage, storagePath);
                      
                      setIsVerifying(true);
                      setVerifierLog([
                        language === "ar" ? "⏳ جاري رفع الملف إلى الخزنة السحابية الآمنة..." : "⏳ Uploading file to the secure cloud vault..."
                      ]);

                      uploadBytes(storageRef, file).then((snapshot) => {
                        getDownloadURL(snapshot.ref).then((downloadURL) => {
                          runVerifierAgent(file, storagePath, downloadURL);
                        });
                      }).catch((err) => {
                        console.error("Upload error:", err);
                        alert(language === "ar" ? "حدث خطأ أثناء تحميل الملف." : "An error occurred while uploading your document.");
                        setIsVerifying(false);
                      });
                    }
                  }}
                />
              </label>
            </div>

            {/* Render Vault File Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
              {customUploadedBooks.map((item, idx) => (
                <div key={idx} className="panel-card" style={{
                  padding: "1.15rem", display: "flex", flexDirection: "column",
                  justifyContent: "space-between", height: "140px", border: "1px dashed rgba(212,175,55,0.3)"
                }}>
                  <div>
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", background: "rgba(212,175,55,0.12)", color: "#b45309", padding: "2px 6px", borderRadius: "8px", display: "inline-block", marginBottom: "0.4rem" }}>
                      🔒 {language === "ar" ? "ملف دراسي خاص" : "Private Vault File"}
                    </span>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--foreground)" }}>
                      {language === "ar" ? item.titleAr : item.titleEn}
                    </h4>
                    <p style={{ fontSize: "0.72rem", color: "#6a7c88", margin: 0 }}>💾 {item.format} | 📦 {item.size}</p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => handleStartStudy(item)}
                      style={{
                        padding: "4px 10px", borderRadius: "12px", border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#ffffff",
                        fontSize: "0.75rem", fontWeight: 700
                      }}
                    >
                      📖 {language === "ar" ? "دراسة وتفاعل" : "Study & Interact"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Verification Loading Overlay */}
      {isVerifying && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(10, 25, 41, 0.75)", backdropFilter: "blur(12px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{
            background: "rgba(255, 255, 255, 0.95)", border: "1px solid rgba(16, 107, 163, 0.2)",
            borderRadius: "24px", padding: "2.5rem", width: "90%", maxWidth: "500px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)", textAlign: "center",
            display: "flex", flexDirection: "column", gap: "1.5rem"
          }}>
            <div className="spinner" style={{
              width: "60px", height: "60px", border: "5px solid rgba(16, 107, 163, 0.1)",
              borderTop: "5px solid var(--primary)", borderRadius: "50%", margin: "0 auto",
              animation: "spin 1s linear infinite"
            }} />
            <div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--foreground)", fontWeight: 800, fontSize: "1.3rem" }}>
                {language === "ar" ? "فحص المواد الدراسية" : "Auditing Academic Asset"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#6a7c88" }}>
                {language === "ar" ? "يقوم وكيل فهم الذكي بفحص الملف لضمان توافقه التعليمي..." : "Fahem Academic Verifier Agent is analyzing the file structure & context..."}
              </p>
            </div>
            <div style={{
              textAlign: "left", background: "#0f172a", color: "#38bdf8", fontFamily: "monospace",
              padding: "1rem", borderRadius: "12px", fontSize: "0.75rem", maxHeight: "160px",
              overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem",
              direction: "ltr", border: "1px solid rgba(56, 189, 248, 0.2)"
            }}>
              {verifierLog.map((log, idx) => (
                <div key={idx} style={{ animation: "fadeIn 0.2s ease-out" }}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Academic Rejection Modal */}
      {showRejectModal && rejectedInfo && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(10, 25, 41, 0.75)", backdropFilter: "blur(12px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <div style={{
            background: "#ffffff", border: "2px solid #ef4444",
            borderRadius: "24px", padding: "2.5rem", width: "90%", maxWidth: "550px",
            boxShadow: "0 0 24px rgba(239, 68, 68, 0.25)",
            display: "flex", flexDirection: "column", gap: "1.5rem", position: "relative"
          }}>
            <div style={{
              background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", width: "50px", height: "50px",
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.5rem", margin: "0 auto"
            }}>
              ⚠️
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#ef4444", fontWeight: 800, fontSize: "1.4rem" }}>
                {language === "ar" ? "عذرًا، تم رفض المستند الأكاديمي" : "Academic Document Ingestion Rejected"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#ef4444", fontWeight: 600 }}>
                {language === "ar" 
                  ? `اسم الملف: ${rejectedInfo.fileName}` 
                  : `File Name: ${rejectedInfo.fileName}`}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{
                background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px",
                padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem"
              }}>
                <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#991b1b", fontWeight: 700 }}>
                  English Audit Rationale (Confidence: {rejectedInfo.confidence}%):
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#7f1d1d", lineHeight: 1.4 }}>
                  {rejectedInfo.rationaleEn}
                </p>
              </div>

              <div style={{
                background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px",
                padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem", textAlign: "right"
              }}>
                <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#991b1b", fontWeight: 700 }}>
                  تقرير وكيل التدقيق الأكاديمي (مستوى الثقة: {rejectedInfo.confidence}%):
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#7f1d1d", lineHeight: 1.4 }}>
                  {rejectedInfo.rationaleAr}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowRejectModal(false);
                setRejectedInfo(null);
              }}
              style={{
                background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#ffffff",
                border: "none", borderRadius: "12px", padding: "0.75rem", fontSize: "0.9rem",
                fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = "none"; }}
            >
              {language === "ar" ? "مفهوم، سأقوم بتحميل ملف دراسي" : "Understood, let me upload academic material"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
