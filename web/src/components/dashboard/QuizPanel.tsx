"use client";

import React from "react";

/**
 * Props for the QuizPanel component.
 */
interface QuizPanelProps {
  language: "ar" | "en";
  quizQuestionIndex: number;
  setQuizQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
  quizAnswers: Record<number, number>;
  setQuizAnswers: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  quizFinished: boolean;
  setQuizFinished: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * QuizPanel: A component representing the "Assessment & Quiz Arena".
 * It displays interactive multi-stage quizzes, handles navigation, and calculates
 * the score upon completion with immediate feedback.
 */
export const QuizPanel: React.FC<QuizPanelProps> = ({
  language,
  quizQuestionIndex,
  setQuizQuestionIndex,
  quizAnswers,
  setQuizAnswers,
  quizFinished,
  setQuizFinished,
}) => {
  const modelAnswers = [1, 1, 0]; // Index of correct answers for each question

  // Questions database
  const questionsAr = [
    "ما هي ناتج عملية تكامل السينوس (sin(x) dx)؟",
    "أي الكواكب التالية يلقب بالكوكب الأحمر نظراً لنسبة أكسيد الحديد العالية؟",
    "ما هي عاصمة جمهورية مصر العربية؟"
  ];

  const questionsEn = [
    "What is the integral of sin(x) dx?",
    "Which planet in our solar system is known as the Red Planet?",
    "What is the capital city of Egypt?"
  ];

  // Options database
  const options = [
    [
      { textAr: "cos(x) + C", textEn: "cos(x) + C", isCorrect: false },
      { textAr: "-cos(x) + C", textEn: "-cos(x) + C", isCorrect: true },
      { textAr: "sin(x) + C", textEn: "sin(x) + C", isCorrect: false },
      { textAr: "tan(x) + C", textEn: "tan(x) + C", isCorrect: false }
    ],
    [
      { textAr: "المشتري", textEn: "Jupiter", isCorrect: false },
      { textAr: "المريخ", textEn: "Mars", isCorrect: true },
      { textAr: "الزهرة", textEn: "Venus", isCorrect: false },
      { textAr: "عطارد", textEn: "Mercury", isCorrect: false }
    ],
    [
      { textAr: "القاهرة", textEn: "Cairo", isCorrect: true },
      { textAr: "الإسكندرية", textEn: "Alexandria", isCorrect: false },
      { textAr: "الجيزة", textEn: "Giza", isCorrect: false },
      { textAr: "الأقصر", textEn: "Luxor", isCorrect: false }
    ]
  ];

  // Current question and options based on current index
  const currentQuestion = language === "ar" ? questionsAr[quizQuestionIndex] : questionsEn[quizQuestionIndex];
  const currentOptions = options[quizQuestionIndex];

  // Calculate final score
  const calculateScore = () => {
    let score = 0;
    if (quizAnswers[0] === modelAnswers[0]) score += 1;
    if (quizAnswers[1] === modelAnswers[1]) score += 1;
    if (quizAnswers[2] === modelAnswers[2]) score += 1;
    return score;
  };

  const finalScore = calculateScore();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section className="panel-card" style={{ padding: "2rem" }}>
        {!quizFinished ? (
          <div>
            {/* Header section with question progress */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px dashed rgba(235, 220, 185, 0.4)",
                paddingBottom: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800 }}>
                {language === "ar" ? "مقياس التحصيل والأداء النهائي" : "Knowledge Assessment Workstation"}
              </h3>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  background: "rgba(16, 107, 163, 0.08)",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  color: "var(--primary)",
                }}
              >
                {language === "ar"
                  ? `السؤال ${quizQuestionIndex + 1} من 3`
                  : `Question ${quizQuestionIndex + 1} of 3`}
              </span>
            </div>

            {/* Question Title */}
            <h4
              style={{
                fontSize: "1.1rem",
                color: "var(--primary)",
                margin: "0 0 1.25rem 0",
                fontWeight: 800,
                fontFamily: "var(--font-sans)",
              }}
            >
              {currentQuestion}
            </h4>

            {/* Options Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {currentOptions.map((opt, optIdx) => {
                const isSelected = quizAnswers[quizQuestionIndex] === optIdx;
                return (
                  <button
                    key={optIdx}
                    onClick={() => setQuizAnswers((prev) => ({ ...prev, [quizQuestionIndex]: optIdx }))}
                    style={{
                      padding: "0.85rem 1.25rem",
                      borderRadius: "var(--border-radius-sm)",
                      border: "1px solid",
                      textAlign: language === "ar" ? "right" : "left",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      transition: "all 0.15s",
                      borderColor: isSelected ? "var(--primary)" : "var(--card-border)",
                      background: isSelected ? "rgba(16, 107, 163, 0.05)" : "#ffffff",
                      color: isSelected ? "var(--primary)" : "var(--foreground)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    <span
                      style={{
                        marginRight: language === "ar" ? "0" : "0.5rem",
                        marginLeft: language === "ar" ? "0.5rem" : "0",
                      }}
                    >
                      {["A", "B", "C", "D"][optIdx]}.
                    </span>
                    {language === "ar" ? opt.textAr : opt.textEn}
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                disabled={quizQuestionIndex === 0}
                onClick={() => setQuizQuestionIndex((prev) => prev - 1)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid var(--card-border)",
                  background: "#ffffff",
                  cursor: quizQuestionIndex === 0 ? "not-allowed" : "pointer",
                  opacity: quizQuestionIndex === 0 ? 0.5 : 1,
                  fontWeight: 700,
                }}
              >
                {language === "ar" ? "السابق" : "Back"}
              </button>
              {quizQuestionIndex === 2 ? (
                <button
                  onClick={() => setQuizFinished(true)}
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", fontWeight: 700 }}
                >
                  {language === "ar" ? "إنهاء وتصحيح الاختبار" : "Submit Quiz"}
                </button>
              ) : (
                <button
                  disabled={quizAnswers[quizQuestionIndex] === undefined}
                  onClick={() => setQuizQuestionIndex((prev) => prev + 1)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid var(--primary)",
                    background: "var(--primary)",
                    color: "#ffffff",
                    cursor: quizAnswers[quizQuestionIndex] === undefined ? "not-allowed" : "pointer",
                    opacity: quizAnswers[quizQuestionIndex] === undefined ? 0.5 : 1,
                    fontWeight: 700,
                  }}
                >
                  {language === "ar" ? "التالي" : "Next Question"}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Quiz Finished Certificate Display */
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              alignItems: "center",
              padding: "1rem",
            }}
          >
            <span style={{ fontSize: "3.5rem" }}>🎉</span>
            <h3 style={{ fontSize: "1.4rem", margin: 0, fontWeight: 800 }}>
              {language === "ar" ? "اكتمل الاختبار بنجاح!" : "Assessment Complete!"}
            </h3>

            {/* Score Calculation Output */}
            <div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", margin: "0.5rem 0" }}>
                {finalScore} / 3
              </div>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "#4f6371",
                  maxWidth: "450px",
                  margin: "0 auto 1.5rem auto",
                  lineHeight: "1.6",
                }}
              >
                {finalScore === 3
                  ? language === "ar"
                    ? "عمل رائع ومثالي! لقد أجبت على كافة الأسئلة بشكل صحيح مذهل."
                    : "Perfect score! Outstanding academic achievement."
                  : language === "ar"
                  ? "عمل جيد! يمكنك مراجعة الوحدات الدراسية وإعادة الاختبار لتحقيق الدرجة الكاملة."
                  : "Good attempt! Review course materials and try again to master this subject."}
              </p>
            </div>

            <button
              onClick={() => {
                setQuizQuestionIndex(0);
                setQuizAnswers({});
                setQuizFinished(false);
              }}
              className="btn btn-secondary"
              style={{ padding: "8px 16px", fontWeight: 700 }}
            >
              🔄 {language === "ar" ? "إعادة المحاولة" : "Retake Assessment"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
