"use client";

import React from "react";

interface StudyPlanPanelProps {
  language: string;
  t: (key: string) => string;
}

/**
 * StudyPlanPanel component renders the student weekly planner and study targets.
 * Offers options to generate smart customized academic schedule blueprints.
 */
export const StudyPlanPanel: React.FC<StudyPlanPanelProps> = ({
  language,
  t,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }} className="grid-cols-1">
        {/* Custom planner checklist */}
        <div className="panel-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.5rem", marginBottom: "1rem", fontWeight: 800 }}>
            {language === "ar" ? "خطة الدراسة ومتابعة المهام الأسبوعية" : "My Weekly Academic Plan & Tasks"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { textAr: "دراسة درس المتطابقات المثلثية وحل 10 مسائل", textEn: "Study Trigonometric Functions and solve 10 exercises", checked: true, dayAr: "السبت", dayEn: "Sat" },
              { textAr: "مراجعة قواعد كتابة الهمزة المتوسطة وحل الكراسة", textEn: "Review Arabic spelling rules and complete exercises", checked: true, dayAr: "الأحد", dayEn: "Sun" },
              { textAr: "تجربة اختبار معمل الكيمياء عن التفاعلات الطاردة للحرارة", textEn: "Perform chemistry virtual experiment on exothermic reactions", checked: false, dayAr: "الإثنين", dayEn: "Mon" },
              { textAr: "تلخيص الفصل الرابع من تاريخ الشرق الأوسط عبر الزتونة", textEn: "Summarize Chapter 4 of Middle East History via Zatona AI", checked: false, dayAr: "الثلاثاء", dayEn: "Tue" },
              { textAr: "التحضير لاختبار مادة العلوم القصير والتدرب على الفلاش كارد", textEn: "Prepare for Science mock assessment and practice flashcards", checked: false, dayAr: "الأربعاء", dayEn: "Wed" }
            ].map((task, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid rgba(0,0,0,0.03)", background: "#ffffff", transition: "all 0.15s" }}>
                <input
                  type="checkbox"
                  defaultChecked={task.checked}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--primary)" }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: task.checked ? "#6a7c88" : "var(--foreground)", textDecoration: task.checked ? "line-through" : "none" }}>
                    {language === "ar" ? task.textAr : task.textEn}
                  </span>
                </div>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, background: "rgba(16, 107, 163, 0.06)", color: "var(--primary)", padding: "2px 8px", borderRadius: "10px" }}>
                  {language === "ar" ? task.dayAr : task.dayEn}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Study goal statistics */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="panel-card" style={{ padding: "1.5rem", textAlign: "center", background: "linear-gradient(135deg, rgba(16, 107, 163, 0.05), rgba(212, 175, 55, 0.05))" }}>
            <span style={{ fontSize: "2.5rem" }}>🏆</span>
            <h3 style={{ fontSize: "1rem", margin: "0.5rem 0 0.25rem 0", fontWeight: 800 }}>{language === "ar" ? "أداء الأسبوع" : "Weekly Target Metric"}</h3>
            <p style={{ fontSize: "0.8rem", color: "#6a7c88", margin: "0 0 1rem 0" }}>{language === "ar" ? "لقد أنجزت 2 من أصل 5 مهام دراسية مقررين." : "You have achieved 2 of 5 scheduled goals."}</p>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>40%</div>
          </div>

          <button
            onClick={() => alert(language === "ar" ? "جاري إنشاء خطة دراسية مخصصة بواسطة الذكاء الاصطناعي لتغطية المنهج الدراسي بالكامل..." : "Generating custom AI-designed study blueprint to cover your full curriculum...")}
            style={{
              padding: "1rem", borderRadius: "var(--border-radius-md)", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#ffffff",
              fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
            }}
          >
            <span>✨ {language === "ar" ? "توليد خطة دراسية ذكية" : "AI Custom Blueprint"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
