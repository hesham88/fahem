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
  t,
}) => {
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }} className="grid-cols-1">
        {/* Core subjects progress cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {(dynamicSubjects && dynamicSubjects.length > 0
            ? dynamicSubjects.map((subj: any) => {
                const fallbackMeta =
                  subj._id === "subj_algebra_stats"
                    ? { nameEn: "Algebra & Statistics", nameAr: "الجبر والإحصاء", icon: "📊", progress: 65, color: "var(--primary)" }
                    : subj._id === "subj_biology"
                    ? { nameEn: "Biology", nameAr: "الأحياء", icon: "🧬", progress: 42, color: "#9c27b0" }
                    : subj._id === "subj_arabic_grammar"
                    ? { nameEn: "Arabic Grammar", nameAr: "النحو والصرف", icon: "📖", progress: 85, color: "#2e7d32" }
                    : { nameEn: subj.name, nameAr: subj.name_ar || subj.name, icon: subj.emoji || "📚", progress: 20, color: "#ef6c00" };

                return {
                  _id: subj._id,
                  nameEn: subj.name || fallbackMeta.nameEn,
                  nameAr: subj.name_ar || fallbackMeta.nameAr,
                  icon: subj.emoji || fallbackMeta.icon,
                  progress: fallbackMeta.progress,
                  color: fallbackMeta.color,
                };
              })
            : [
                { _id: "subj_algebra_stats", nameEn: "Pure Mathematics", nameAr: "الرياضيات العامة", icon: "📐", progress: 65, color: "var(--primary)" },
                { _id: "subj_biology", nameEn: "Physics & Chemistry", nameAr: "العلوم والفيزياء", icon: "🧪", progress: 42, color: "#9c27b0" },
                { _id: "subj_arabic_grammar", nameEn: "Arabic Grammar & Literature", nameAr: "اللغة العربية وآدابها", icon: "📚", progress: 85, color: "#2e7d32" },
                { _id: "subj_history_geo", nameEn: "World History", nameAr: "التاريخ والجغرافيا", icon: "🌍", progress: 20, color: "#ef6c00" },
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
                  <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden", marginBottom: "0.25rem" }}>
                    <div style={{ width: `${item.progress}%`, height: "100%", background: item.color, borderRadius: "3px" }}></div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#6a7c88", fontWeight: 700 }}>
                    {item.progress}% {language === "ar" ? "مكتمل" : "completed"}
                  </span>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(() => {
              const activeBook = dynamicBooks && dynamicBooks.find((b: any) => b.subject_id === selectedSubjectId);
              const modulesList =
                activeBook && activeBook.chapters && activeBook.chapters.length > 0
                  ? activeBook.chapters.map((ch: any) => ({
                      titleAr: ch.title_ar || ch.title,
                      titleEn: ch.title,
                      lessons: ch.concepts || [],
                    }))
                  : selectedSubjectId === "subj_algebra_stats"
                  ? [
                      {
                        titleAr: "الوحدة الأولى: الجبر والنسب المثلثية",
                        titleEn: "Module 1: Algebra & Trigonometry Trigonometric Functions",
                        lessons: ["المعادلات التربيعية", "المتطابقات المثلثية", "المصفوفات والمحددات"],
                      },
                      {
                        titleAr: "الوحدة الثانية: علم التفاضل والتكامل المبسط",
                        titleEn: "Module 2: Basics of Calculus & Limits",
                        lessons: ["النهايات والاتصال", "قواعد الاشتقاق وتطبيقاته", "المشتقات العليا"],
                      },
                      {
                        titleAr: "الوحدة الثالثة: الاحتمالات والإحصاء التطبيقي",
                        titleEn: "Module 3: Probability & Applied Statistics",
                        lessons: ["التوزيع الطبيعي المعتدل", "معامل الارتباط وبيرسون", "مبدأ العد والتباديل"],
                      },
                    ]
                  : selectedSubjectId === "subj_biology"
                  ? [
                      {
                        titleAr: "الوحدة الأولى: التغذية والعمليات الذاتية",
                        titleEn: "Module 1: Nutrition & Autotrophic Processes",
                        lessons: ["التغذية الذاتية والغير ذاتية", "البناء الضوئي وتفاعلاته", "حلقة كالفن وإنتاج الطاقة"],
                      },
                      {
                        titleAr: "الوحدة الثانية: النقل في الكائنات الحية",
                        titleEn: "Module 2: Transport in Living Organisms",
                        lessons: ["جهاز الدوران في الإنسان", "تركيب الدم والقلب والأوعية", "النظام الليمفاوي ومقاومة الأمراض"],
                      },
                    ]
                  : selectedSubjectId === "subj_arabic_grammar"
                  ? [
                      {
                        titleAr: "الوحدة الأولى: الأفعال الناسخة المقاربة والشروع",
                        titleEn: "Module 1: Dynamic Verbs (Kaada & her Sisters)",
                        lessons: ["اسم كاد وخبرها الجملة الفعلية", "شروط اقتران الخبر بأن", "الفروق الجوهرية بين كان وكاد"],
                      },
                      {
                        titleAr: "الوحدة الثانية: أسلوب الاستثناء وأدواته",
                        titleEn: "Module 2: Style of Exception (Al-Mustathna)",
                        lessons: ["أحكام المستثنى بعد إلا وغير وسوى", "الاستثناء التام والناقص المنفي", "أحكام الاستثناء بخلا وعدا وحاشا"],
                      },
                    ]
                  : [
                      {
                        titleAr: "الوحدة الأولى: المناهج العامة والدراسات",
                        titleEn: "Module 1: General Curriculum & Studies",
                        lessons: ["مراجعة عامة", "مفاهيم أساسية", "تدريبات وتطبيقات مخصصة"],
                      },
                    ];

              return modulesList.map((mod: any, index: number) => (
                <div
                  key={index}
                  style={{
                    border: "1px solid var(--card-border)",
                    borderRadius: "var(--border-radius-sm)",
                    background: "#ffffff",
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => setExpandedModule(expandedModule === index ? null : index)}
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
                    <span>{language === "ar" ? mod.titleAr : mod.titleEn}</span>
                    <span>{expandedModule === index ? "▼" : "▶"}</span>
                  </button>
                  {expandedModule === index && (
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
                      {mod.lessons.map((les: string, lessonIdx: number) => (
                        <div
                          key={lessonIdx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.5rem",
                            background: "#ffffff",
                            border: "1px solid rgba(0,0,0,0.03)",
                            borderRadius: "4px",
                          }}
                        >
                          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>📚 {les}</span>
                          <button
                            onClick={() =>
                              alert(
                                language === "ar"
                                  ? `جاري بدء الدرس التفاعلي الموثق بالصفحات الدراسية لـ: ${les}`
                                  : `Starting page-grounded interactive tutor lesson for: ${les}`
                              )
                            }
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              border: "none",
                              cursor: "pointer",
                              background: "var(--primary)",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            {language === "ar" ? "ابدأ الدرس" : "Study Lesson"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
