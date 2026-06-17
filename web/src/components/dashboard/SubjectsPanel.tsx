"use client";

import React, { useState, useEffect } from "react";
import { authedFetch } from "../../lib/authedFetch";
import { Dropdown } from "../ui/Dropdown";

interface Subject {
  _id: string;
  name: string;
  name_ar?: string;
  emoji?: string;
  icon_emoji?: string;
  color?: string;
}

interface Book {
  _id?: string;
  id?: string;
  title: string;
  title_ar?: string;
  titleEn?: string;
  titleAr?: string;
  subject_id?: string;
  coverUrl?: string;
  coverThumbUrl?: string;
}

const SubjectsBookCover: React.FC<{
  src?: string;
  alt: string;
  subjectColor: string;
  subjectIcon: string;
}> = ({ src, alt, subjectColor, subjectIcon }) => {
  const [hasError, setHasError] = useState(!src);

  useEffect(() => {
    setHasError(!src);
  }, [src]);

  if (hasError) {
    return (
      <div style={{
        width: "24px",
        height: "36px",
        borderRadius: "4px",
        background: `linear-gradient(135deg, ${subjectColor}, color-mix(in srgb, ${subjectColor} 60%, #000))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        border: "1px solid rgba(255,255,255,0.1)",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Spine line */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: "2px",
          background: "rgba(0,0,0,0.2)"
        }} />
        <span style={{ fontSize: "0.85rem", zIndex: 1 }}>{subjectIcon || "📖"}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: "24px",
        height: "36px",
        borderRadius: "4px",
        objectFit: "cover",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        border: "1px solid rgba(0,0,0,0.08)",
        flexShrink: 0
      }}
      onError={() => setHasError(true)}
    />
  );
};

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
  // FC9.3: books and chapters are independently foldable. Each book is an umbrella that
  // folds/unfolds its chapters; each chapter folds/unfolds its topics. Both use a Set so
  // multiple can be open at once (the old single-open `expandedModule` allowed only one
  // chapter open and books were always expanded).
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const toggleBook = (key: string) => {
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const toggleChapter = (key: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const [modulesCollapsed, setModulesCollapsed] = useState<boolean>(false);
  const [curricula, setCurricula] = useState<any[]>([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>("");

  // FC9.3: when the selected subject changes, default the first book of that subject
  // open (and collapse chapters) so the user immediately sees something to fold.
  useEffect(() => {
    const books = dynamicBooks ? dynamicBooks.filter((b: any) => b.subject_id === selectedSubjectId) : [];
    if (books.length > 0) {
      const firstKey = String(books[0]._id || books[0].id || 0);
      setExpandedBooks(new Set([firstKey]));
    } else {
      setExpandedBooks(new Set());
    }
    setExpandedChapters(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId, dynamicBooks]);

  useEffect(() => {
    const fetchCurricula = async () => {
      try {
        const res = await authedFetch("/api/curricula");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.curricula) {
            setCurricula(data.curricula);
            const openstax = data.curricula.find((c: any) =>
              c.library_id === "lib_openstax" ||
              c._id === "openstax_all" ||
              (c.title && c.title.toLowerCase().includes("openstax"))
            );
            if (openstax) {
              setSelectedCurriculumId(openstax._id);
            } else if (data.curricula.length > 0) {
              setSelectedCurriculumId(data.curricula[0]._id);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching curricula:", err);
      }
    };
    fetchCurricula();
  }, []);

  const filteredSubjects = dynamicSubjects ? dynamicSubjects.filter((subj: any) => {
    if (!selectedCurriculumId) return true;
    return subj.curriculum_id === selectedCurriculumId;
  }) : [];

  // Auto-select first subject if selectedSubjectId is invalid or not in filteredSubjects
  useEffect(() => {
    if (filteredSubjects && filteredSubjects.length > 0) {
      const exists = filteredSubjects.some((s: any) => s._id === selectedSubjectId);
      if (!exists) {
        setSelectedSubjectId(filteredSubjects[0]._id);
      }
    }
  }, [filteredSubjects, selectedSubjectId, setSelectedSubjectId]);

  if (!dynamicSubjects || dynamicSubjects.length === 0) {
    return (
      <div
        className="panel-card"
        style={{
          padding: "3rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: "1.25rem",
          border: "1px dashed var(--card-border)",
          background: "rgba(255, 255, 255, 0.4)",
          borderRadius: "var(--border-radius-lg)",
        }}
      >
        <span style={{ fontSize: "3.5rem" }}>📚</span>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 0.5rem 0", color: "var(--foreground)" }}>
            {language === "ar" ? "لا توجد مواد دراسية متاحة" : "No Subjects Available"}
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", maxWidth: "400px", margin: "0 auto", lineHeight: 1.5 }}>
            {language === "ar"
              ? "يرجى تهيئة المناهج والمواد الدراسية في لوحة التحكم الإدارية أو مراجعة إعدادات الحساب."
              : "Please configure your curricula and subjects in the Admin Dashboard or update your Account Settings."}
          </p>
        </div>
      </div>
    );
  }

  const mappedSubjects = filteredSubjects.map((subj: any) => {
    const subjectColor = subj.color || "#ef6c00";
    const subjectIcon = subj.emoji || subj.icon_emoji || "📚";
    return {
      _id: subj._id,
      nameEn: subj.name || subj.name_en || "Unnamed Subject",
      nameAr: subj.name_ar || subj.name || "مادة غير مسمى",
      icon: subjectIcon,
      color: subjectColor,
    };
  });

  const selectedSubjectObj = mappedSubjects.find((s: any) => s._id === selectedSubjectId) || mappedSubjects[0];
  const activeSubjectColor = selectedSubjectObj?.color || "#ef6c00";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Curriculum Switcher Dropdown */}
      {curricula.length > 0 && (
        <div style={{ maxWidth: "400px", alignSelf: "flex-start", width: "100%" }}>
          <Dropdown
            label={language === "ar" ? "المنهج الدراسي" : "Select Curriculum"}
            value={selectedCurriculumId}
            onChange={(val) => setSelectedCurriculumId(val)}
            options={curricula.map((c) => ({
              value: c._id,
              label: c.title || c.grade || c._id,
              labelAr: c.title_ar || c.grade_ar || c.title || c._id,
            }))}
            language={language}
          />
        </div>
      )}

      {mappedSubjects.length === 0 ? (
        <div
          className="panel-card"
          style={{
            padding: "3rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: "1.25rem",
            border: "1px dashed var(--card-border)",
            background: "rgba(255, 255, 255, 0.4)",
            borderRadius: "var(--border-radius-lg)",
          }}
        >
          <span style={{ fontSize: "3.5rem" }}>📚</span>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 0.5rem 0", color: "var(--foreground)" }}>
              {language === "ar" ? "لا توجد مواد دراسية مخصصة لهذا المنهج" : "No Subjects for Selected Curriculum"}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", maxWidth: "400px", margin: "0 auto", lineHeight: 1.5 }}>
              {language === "ar"
                ? "لم يتم تعيين أي مواد دراسية لهذا المنهج بعد."
                : "No subjects have been assigned to this curriculum yet."}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }} className="grid-cols-1">
        
        {/* Core subjects list cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {mappedSubjects.map((item, idx) => {
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
                  border: isSelected ? `2px solid var(--subject-color)` : "1px solid var(--card-border)",
                  transform: isSelected ? "scale(1.02)" : "scale(1)",
                  boxShadow: isSelected ? "0 8px 16px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.25s ease-in-out",
                  "--subject-color": item.color,
                } as React.CSSProperties}
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
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: item.color,
                          fontWeight: 700,
                          background: `color-mix(in srgb, ${item.color} 8%, transparent)`,
                          padding: "4px 10px",
                          borderRadius: "10px",
                          display: "inline-block",
                          marginTop: "0.25rem",
                        }}
                      >
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
        <div
          className="panel-card"
          style={{
            padding: "1.5rem",
            borderTop: `4px solid var(--subject-color)`,
            "--subject-color": activeSubjectColor,
          } as React.CSSProperties}
        >
          <h3
            onClick={() => setModulesCollapsed((v) => !v)}
            style={{ fontSize: "1.1rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.5rem", marginBottom: "1rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", userSelect: "none" }}
            title={language === "ar" ? "طيّ/فتح" : "Collapse / expand"}
          >
            <span>{language === "ar" ? "تفاصيل الوحدات والدروس التفاعلية" : "Interactive Curriculum Modules"}</span>
            <span style={{ fontSize: "0.9rem", transition: "transform 0.2s", transform: modulesCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▾</span>
          </h3>
          <div style={{ display: modulesCollapsed ? "none" : "flex", flexDirection: "column", gap: "1rem" }}>
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
                const bookTitle = language === "ar"
                  ? (book.title_ar || book.titleAr || book.title)
                  : (book.title_en || book.titleEn || book.title);
                const bookKey = String(book._id || book.id || bIdx);
                const isBookExpanded = expandedBooks.has(bookKey);

                return (
                  <div
                    key={bIdx}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      borderBottom: bIdx < subjectBooks.length - 1 ? "1px dashed rgba(0, 0, 0, 0.05)" : "none",
                      paddingBottom: bIdx < subjectBooks.length - 1 ? "1.5rem" : "0",
                      "--subject-color": activeSubjectColor,
                    } as React.CSSProperties}
                  >
                    {/* FC9.3: Book umbrella header — click to fold/unfold its chapters */}
                    <button
                      type="button"
                      onClick={() => toggleBook(bookKey)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        width: "100%",
                        textAlign: language === "ar" ? "right" : "left",
                        cursor: "pointer",
                        border: "none",
                        background: `color-mix(in srgb, var(--subject-color) 8%, transparent)`,
                        borderInlineStart: "4px solid var(--subject-color)",
                        padding: "0.5rem 1rem",
                        borderRadius: "10px",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <SubjectsBookCover
                        src={book.coverThumbUrl || book.coverUrl}
                        alt={bookTitle}
                        subjectColor={activeSubjectColor}
                        subjectIcon={selectedSubjectObj?.icon || "📖"}
                      />
                      <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--foreground)", flex: 1 }}>
                        {bookTitle}
                      </span>
                      {chapters.length > 0 && (
                        <span style={{ fontSize: "0.7rem", color: "var(--subject-color)", fontWeight: 700 }}>
                          {chapters.length} {language === "ar" ? "فصل" : "ch."}
                        </span>
                      )}
                      <span style={{ fontSize: "0.8rem", color: "var(--subject-color)", transition: "transform 0.2s", transform: isBookExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}>▾</span>
                    </button>

                    {!isBookExpanded ? null : chapters.length === 0 ? (
                      <div style={{ padding: "1rem", fontStyle: "italic", fontSize: "0.85rem", color: "#6a7c88", textAlign: "center" }}>
                        {language === "ar" ? "لا توجد فصول دراسية مدخلة بعد" : "No chapters available yet"}
                      </div>
                    ) : (
                      <div style={{ maxHeight: "55vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem", paddingInlineEnd: "4px" }}>
                      {chapters.map((ch: any, cIdx: number) => {
                        const chapterKey = `${book._id || bIdx}-${cIdx}`;
                        const isExpanded = expandedChapters.has(chapterKey);
                        const chapterTitle = language === "ar" 
                          ? (ch.title_ar || ch.titleAr || ch.title || `الفصل ${cIdx + 1}`)
                          : (ch.titleEn || ch.title || `Chapter ${cIdx + 1}`);
                        const topics = ch.topics || [];

                        // Fallback for missing topics: render the chapter heading as a direct link option
                        if (topics.length === 0) {
                          const startPage = ch.start_page || ch.startPage || 1;
                          return (
                            <div
                              key={cIdx}
                              style={{
                                border: "1px solid var(--card-border)",
                                borderRadius: "var(--border-radius-sm)",
                                background: "var(--card-bg)",
                                overflow: "hidden",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "1rem",
                              }}
                            >
                              <span style={{ fontWeight: 700, color: "var(--subject-color)", fontSize: "0.9rem" }}>
                                {chapterTitle}
                              </span>
                              <button
                                onClick={() => handleStartStudy(book, startPage)}
                                style={{
                                  padding: "6px 14px",
                                  borderRadius: "6px",
                                  border: "none",
                                  cursor: "pointer",
                                  background: "var(--subject-color)",
                                  color: "#ffffff",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                                  transition: "all 0.2s",
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.opacity = "0.9";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.opacity = "1";
                                }}
                              >
                                {language === "ar" ? "ابدأ الفصل" : "Study Chapter"}
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={cIdx}
                            style={{
                              border: "1px solid var(--card-border)",
                              borderRadius: "var(--border-radius-sm)",
                              background: "var(--card-bg)",
                              overflow: "hidden",
                            }}
                          >
                            <button
                              onClick={() => toggleChapter(chapterKey)}
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
                                color: "var(--subject-color)",
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
                                {topics.map((top: any, tIdx: number) => {
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
                                        background: "var(--card-bg)",
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
                                          background: "var(--subject-color)",
                                          color: "#ffffff",
                                          fontSize: "0.75rem",
                                          fontWeight: 700,
                                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
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
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    )}
  </div>
);
};
