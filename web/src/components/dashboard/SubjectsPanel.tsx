"use client";

import React, { useState } from "react";

interface Subject {
  _id: string;
  name: string;
  name_ar?: string;
  emoji?: string;
}

interface Book {
  _id?: string;
  id?: string;
  title: string;
  subject_id?: string;
  chapters?: any[];
}

interface SubjectsPanelProps {
  language: string;
  dynamicSubjects: Subject[];
  dynamicBooks: Book[];
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  handleStartStudy: (book: any, pageNum?: number) => void;
  t: (key: string) => string;
}

/**
 * SubjectsPanel component presents school curriculum subjects.
 * Provides custom visual styling and progress bars for subjects.
 * Renders accordion sections for chapters and conceptual subtopics with direct study landing options.
 */
export const SubjectsPanel: React.FC<SubjectsPanelProps> = ({
  language,
  dynamicSubjects,
  dynamicBooks,
  selectedSubjectId,
  setSelectedSubjectId,
  handleStartStudy,
  t,
}) => {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }} className="grid-cols-1">
        {/* Core subjects progress cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {(dynamicSubjects && dynamicSubjects.length > 0
            ? dynamicSubjects.map((subj: any) => {
                const fallbackMeta =
                  subj._id === "subj_algebra_stats"
                    ? { nameEn: "Algebra & Statistics", nameAr: "الجبر والإحصاء", icon: "📊", color: "var(--primary)" }
                    : subj._id === "subj_biology"
                    ? { nameEn: "Biology", nameAr: "الأحياء", icon: "🧬", color: "#9c27b0" }
                    : subj._id === "subj_arabic_grammar"
                    ? { nameEn: "Arabic Grammar", nameAr: "النحو والصرف", icon: "📖", color: "#2e7d32" }
                    : { nameEn: subj.name, nameAr: subj.name_ar || subj.name, icon: subj.emoji || "📚", color: "#ef6c00" };

                return {
                  _id: subj._id,
                  nameEn: subj.name || fallbackMeta.nameEn,
                  nameAr: subj.name_ar || fallbackMeta.nameAr,
                  icon: subj.emoji || fallbackMeta.icon,
                  color: fallbackMeta.color,
                };
              })
            : [
                { _id: "subj_algebra_stats", nameEn: "Pure Mathematics", nameAr: "الرياضيات العامة", icon: "📐", color: "var(--primary)" },
                { _id: "subj_biology", nameEn: "Physics & Chemistry", nameAr: "العلوم والفيزياء", icon: "🧪", color: "#9c27b0" },
                { _id: "subj_arabic_grammar", nameEn: "Arabic Grammar & Literature", nameAr: "اللغة العربية وآدابها", icon: "📚", color: "#2e7d32" },
                { _id: "subj_history_geo", nameEn: "World History", nameAr: "التاريخ والجغرافيا", icon: "🌍", color: "#ef6c00" },
              ]
          ).map((item, idx) => {
            const isSelected = selectedSubjectId === item._id;
            return (
              <div
                key={idx}
                className="panel-card"
                onClick={() => setSelectedSubjectId(item._id)}
                style={{
                  padding: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  cursor: "pointer",
                  border: isSelected ? `2px solid ${item.color}` : "1px solid var(--card-border)",
                  transform: isSelected ? "scale(1.02)" : "scale(1)",
                  boxShadow: isSelected ? "0 8px 16px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.25s ease-in-out",
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = item.color;
                    e.currentTarget.style.transform = "scale(1.01)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "var(--card-border)";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                <div style={{ fontSize: "2rem" }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.25rem 0", fontFamily: "var(--font-sans)" }}>
                    {language === "ar" ? item.nameAr : item.nameEn}
                  </h3>
                  {(() => {
                    const booksCount = dynamicBooks ? dynamicBooks.filter((b: any) => b.subject_id === item._id).length : 0;
                    return (
                      <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700, background: "rgba(16, 107, 163, 0.06)", padding: "4px 10px", borderRadius: "10px", display: "inline-block", marginTop: "0.25rem" }}>
                        {language === "ar"
                          ? `📚 ${booksCount} من الكتب`
                          : `📚 ${booksCount} ${booksCount === 1 ? 'Book' : 'Books'}`}
                      </span>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Module Accordion Workspace */}
        <div className="panel-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.5rem", marginBottom: "1rem", fontWeight: 800 }}>
            {language === "ar" ? "تفاصيل الوحدات والدروس التفاعلية" : "Interactive Curriculum Modules"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {(() => {
              const subjectBooks = dynamicBooks ? dynamicBooks.filter((b: any) => b.subject_id === selectedSubjectId) : [];
              if (subjectBooks.length === 0) {
                return (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem", textAlign: "center", gap: "1rem" }}>
                    <span style={{ fontSize: "3rem" }}>📚</span>
                    <span style={{ fontWeight: 700, color: "#6a7c88", fontSize: "0.95rem" }}>
                      {language === "ar" ? "لا توجد كتب دراسية مخصصة لهذه المادة بعد" : "No textbooks linked to this subject yet"}
                    </span>
                  </div>
                );
              }

              return subjectBooks.map((book: any, bIdx: number) => {
                const chapters = book.chapters || [];
                return (
                  <div key={bIdx} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderBottom: bIdx < subjectBooks.length - 1 ? "1px dashed rgba(0, 0, 0, 0.05)" : "none", paddingBottom: bIdx < subjectBooks.length - 1 ? "1.5rem" : "0" }}>
                    {/* Book Subtitle */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(16, 107, 163, 0.04)", padding: "0.5rem 1rem", borderRadius: "10px", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>📖</span>
                      <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--foreground)" }}>
                        {language === "ar" ? (book.titleAr || book.title) : (book.titleEn || book.title)}
                      </span>
                    </div>

                    {chapters.length === 0 ? (
                      <div style={{ padding: "1rem", fontStyle: "italic", fontSize: "0.85rem", color: "#6a7c88", textAlign: "center" }}>
                        {language === "ar" ? "لا توجد فصول دراسية مدخلة بعد" : "No chapters available yet"}
                      </div>
                    ) : (
                      chapters.map((ch: any, cIdx: number) => {
                        const chapterKey = `${book._id || bIdx}-${cIdx}`;
                        const isExpanded = expandedModule === chapterKey;
                        const chapterTitle = language === "ar" 
                          ? (ch.title_ar || ch.titleAr || ch.title || `الفصل ${cIdx + 1}`)
                          : (ch.titleEn || ch.title || `Chapter ${cIdx + 1}`);
                        const topics = ch.topics || [];

                        return (
                          <div
                            key={cIdx}
                            style={{
                              border: "1px solid var(--card-border)",
                              borderRadius: "var(--border-radius-sm)",
                              background: "#ffffff",
                              overflow: "hidden",
                            }}
                          >
                            <button
                              onClick={() => setExpandedModule(isExpanded ? null : chapterKey)}
                              style={{
                                width: "100%",
                                padding: "1rem",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontWeight: 700,
                                color: "var(--primary)",
                                fontFamily: "var(--font-sans)",
                                fontSize: "0.9rem",
                              }}
                            >
                              <span>{chapterTitle}</span>
                              <span>{isExpanded ? "▼" : "▶"}</span>
                            </button>
                            {isExpanded && (
                              <div
                                style={{
                                  padding: "0.5rem 1rem 1rem 1rem",
                                  borderTop: "1px solid rgba(0,0,0,0.04)",
                                  background: "rgba(16, 107, 163, 0.01)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.5rem",
                                }}
                              >
                                {topics.length === 0 ? (
                                  <div style={{ fontSize: "0.82rem", color: "#6a7c88", padding: "0.5rem", textAlign: "center" }}>
                                    {language === "ar" ? "لا توجد موضوعات مضافة" : "No topics added"}
                                  </div>
                                ) : (
                                  topics.map((top: any, tIdx: number) => {
                                    const topicTitle = language === "ar"
                                      ? (top.titleAr || top.title_ar || top.title || `موضوع ${tIdx + 1}`)
                                      : (top.titleEn || top.title || `Topic ${tIdx + 1}`);
                                    const pageNum = top.pageNum || top.page_number || top.pageNumber || 1;

                                    return (
                                      <div
                                        key={tIdx}
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          padding: "0.5rem 0.75rem",
                                          background: "#ffffff",
                                          border: "1px solid rgba(0,0,0,0.03)",
                                          borderRadius: "8px",
                                          boxShadow: "0 1px 2px rgba(0,0,0,0.01)",
                                        }}
                                      >
                                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>📚 {topicTitle}</span>
                                        <button
                                          onClick={() => handleStartStudy(book, pageNum)}
                                          style={{
                                            padding: "4px 12px",
                                            borderRadius: "6px",
                                            border: "none",
                                            cursor: "pointer",
                                            background: "var(--primary)",
                                            color: "#ffffff",
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            boxShadow: "0 2px 4px rgba(16, 107, 163, 0.15)",
                                            transition: "all 0.2s",
                                          }}
                                          onMouseOver={(e) => {
                                            e.currentTarget.style.opacity = "0.9";
                                          }}
                                          onMouseOut={(e) => {
                                            e.currentTarget.style.opacity = "1";
                                          }}
                                        >
                                          {language === "ar" ? "ابدأ الدرس" : "Study Lesson"}
                                        </button>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
