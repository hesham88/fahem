"use client";

import React, { useState, useEffect } from "react";
import { FiCpu, FiClock, FiRefreshCw } from "react-icons/fi";

interface Book {
  _id?: string;
  id?: string;
  title: string;
  title_ar?: string;
  titleEn?: string;
  titleAr?: string;
  subject?: string;
}

interface PracticePanelProps {
  language: string;
  dynamicBooks: Book[];
  renderSpaceSelectorBar: (tab: "practice" | "plan" | "timetable" | "zatona") => React.ReactNode;
  renderSpaceHistory: () => React.ReactNode;
  renderPremiumContent: (markdownText: string) => React.ReactNode;
  t: (key: string) => string;
}

/**
 * PracticePanel component implements the Active Recall Quest Station.
 * Features customizable MCQ, Written, and Oral gamified evaluation spaces with XP level progression.
 */
export const PracticePanel: React.FC<PracticePanelProps> = ({
  language,
  dynamicBooks,
  renderSpaceSelectorBar,
  renderSpaceHistory,
  renderPremiumContent,
  t,
}) => {
  // Practice Specific States (fully encapsulated)
  const [practiceGameState, setPracticeGameState] = useState<"setup" | "active" | "victory">("setup");
  const [practiceScopeType, setPracticeScopeType] = useState<"subject" | "book">("subject");
  const [practiceSelectedBookId, setPracticeSelectedBookId] = useState<string>("");
  const [practiceSubject, setPracticeSubject] = useState<string>("Math");
  const [practiceMode, setPracticeMode] = useState<"mcq" | "text" | "oral">("mcq");
  const [practiceSessionType, setPracticeSessionType] = useState<"infinite" | "quiz">("infinite");
  const [practiceQuizQuestionsCount, setPracticeQuizQuestionsCount] = useState<number>(5);
  const [practiceQuizDurationLimit, setPracticeQuizDurationLimit] = useState<number>(120); // 120s default
  const [practiceQuizTimeLeft, setPracticeQuizTimeLeft] = useState<number>(120);

  const [practiceXP, setPracticeXP] = useState<number>(35);
  const [practiceLevel, setPracticeLevel] = useState<number>(3);
  const [practiceStreak, setPracticeStreak] = useState<number>(4);

  const [practiceLoading, setPracticeLoading] = useState<boolean>(false);
  const [practiceCurrentQuestion, setPracticeCurrentQuestion] = useState<any>(null);
  const [practiceAnswer, setPracticeAnswer] = useState<string>("");
  const [practiceSelectedOptionStr, setPracticeSelectedOptionStr] = useState<string>("");
  const [practiceHasAnswered, setPracticeHasAnswered] = useState<boolean>(false);
  const [practiceFeedback, setPracticeFeedback] = useState<any>(null);
  const [practiceShowHint, setPracticeShowHint] = useState<boolean>(false);

  // Multimodal TTS states & helpers
  const [speakingType, setSpeakingElement] = useState<"question" | "feedback" | null>(null);

  const speakPracticeText = (text: string, type: "question" | "feedback") => {
    if (speakingType === type) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeakingElement(null);
      return;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const cleanText = text
      .replace(/\*\*|__/g, "")
      .replace(/\*|_/g, "")
      .replace(/`.*?`/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    (window as any)._activeUtterance = utterance;
    const hasArabicChars = /[\u0600-\u06FF]/.test(cleanText);
    const localeMap: Record<string, string> = {
      en: "en-US",
      ar: "ar-EG",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      zh: "zh-CN",
      it: "it-IT"
    };
    const activeLocale = hasArabicChars ? "ar-EG" : (localeMap[language] || "en-US");
    utterance.lang = activeLocale;

    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.lang.toLowerCase() === activeLocale.toLowerCase()) || 
                          voices.find(v => v.lang.toLowerCase().startsWith(activeLocale.split("-")[0].toLowerCase()));
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      setSpeakingElement(null);
    };

    utterance.onerror = (err) => {
      console.error("Practice Speech Synthesis Error:", err);
      setSpeakingElement(null);
    };

    setSpeakingElement(type);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingElement(null);
  }, [practiceCurrentQuestion, practiceFeedback]);

  // Web Speech API / Oral specific states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micError, setMicError] = useState<string>("");
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        const localeMap: Record<string, string> = {
          en: "en-US",
          ar: "ar-EG",
          es: "es-ES",
          fr: "fr-FR",
          de: "de-DE",
          zh: "zh-CN",
          it: "it-IT"
        };
        rec.lang = localeMap[language] || "en-US";

        rec.onresult = (event: any) => {
          let interimText = "";
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimText += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setPracticeAnswer((prev) => (prev ? prev + " " + finalTranscript : finalTranscript));
          }
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === "not-allowed") {
            setMicError(language === "ar" ? "وصول الميكروفون مرفوض" : "Microphone access denied");
          } else {
            setMicError(event.error);
          }
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setSpeechRecognition(rec);
      }
    }
  }, [language]);

  const toggleListening = () => {
    if (!speechRecognition) {
      alert(language === "ar" ? "التعرف على الصوت غير مدعوم في متصفحك" : "Web Speech recognition is not supported in this browser");
      return;
    }
    if (isListening) {
      speechRecognition.stop();
      setIsListening(false);
    } else {
      setMicError("");
      try {
        speechRecognition.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (speechRecognition) {
        try {
          speechRecognition.stop();
        } catch (e) {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speechRecognition]);

  // Session aggregate statistics
  const [practiceSessionXpGained, setPracticeSessionXpGained] = useState<number>(0);
  const [practiceSessionCorrectAnswers, setPracticeSessionCorrectAnswers] = useState<number>(0);
  const [practiceSessionTotalQuestions, setPracticeSessionTotalQuestions] = useState<number>(1);

  // Ticking visual timer for Quiz Mode
  useEffect(() => {
    let timer: any;
    if (practiceGameState === "active" && practiceSessionType === "quiz" && practiceQuizDurationLimit > 0) {
      timer = setInterval(() => {
        setPracticeQuizTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setPracticeGameState("victory");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [practiceGameState, practiceSessionType, practiceQuizDurationLimit]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {renderSpaceSelectorBar("practice")}

      {/* Gamified HUD 3-State Interactive Game Loop */}
      {practiceGameState === "setup" ? (
        /* State 1: Setup HUD */
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem" }} className="grid-cols-1">
          {/* Configuration Panel */}
          <div className="panel-card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FiCpu style={{ fontSize: "1.5rem", color: "var(--primary)" }} />
              <h3 style={{ fontSize: "1.25rem", margin: 0, fontWeight: 800 }}>
                {language === "ar" ? "إعداد مهمة التدريب النشط" : "Active Recall Quest Setup"}
              </h3>
            </div>

            {/* Scope Selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>
                {language === "ar" ? "١. حدد نطاق الأسئلة (Scope)" : "1. Select Practice Scope"}
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setPracticeScopeType("subject")}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "6px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    background: practiceScopeType === "subject" ? "var(--primary)" : "#f0f4f8",
                    color: practiceScopeType === "subject" ? "#ffffff" : "var(--foreground)",
                    border: "1px solid " + (practiceScopeType === "subject" ? "var(--primary)" : "var(--card-border)"),
                    transition: "all 0.2s",
                  }}
                >
                  {language === "ar" ? "مادة دراسية عامة" : "Umbrella Subject"}
                </button>
                <button
                  onClick={() => {
                    setPracticeScopeType("book");
                    if (dynamicBooks.length > 0 && !practiceSelectedBookId) {
                      setPracticeSelectedBookId(dynamicBooks[0]._id || dynamicBooks[0].id || "");
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "6px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    background: practiceScopeType === "book" ? "var(--primary)" : "#f0f4f8",
                    color: practiceScopeType === "book" ? "#ffffff" : "var(--foreground)",
                    border: "1px solid " + (practiceScopeType === "book" ? "var(--primary)" : "var(--card-border)"),
                    transition: "all 0.2s",
                  }}
                >
                  {language === "ar" ? "كتاب مدرسي محدد" : "Specific Textbook"}
                </button>
              </div>

              {practiceScopeType === "subject" ? (
                <select
                  value={practiceSubject}
                  onChange={(e) => setPracticeSubject(e.target.value)}
                  style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.85rem", background: "#ffffff", fontWeight: 700 }}
                >
                  <option value="Math">{language === "ar" ? "الرياضيات" : "Mathematics"}</option>
                  <option value="Science">{language === "ar" ? "العلوم والفيزياء" : "Science & Physics"}</option>
                  <option value="Arabic">{language === "ar" ? "اللغة العربية" : "Arabic Linguistics"}</option>
                  <option value="General">{language === "ar" ? "ثقافة عامة" : "General Knowledge"}</option>
                </select>
              ) : (
                <select
                  value={practiceSelectedBookId}
                  onChange={(e) => setPracticeSelectedBookId(e.target.value)}
                  style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.85rem", background: "#ffffff", fontWeight: 700 }}
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
              )}
            </div>

            {/* Mode Selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>
                {language === "ar" ? "٢. اختر نمط التقييم (Mode)" : "2. Choose Assessment Mode"}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                {[
                  { mode: "mcq", labelAr: "اختيار متعدد", labelEn: "MCQs", icon: "🎯" },
                  { mode: "text", labelAr: "صياغة نصية", labelEn: "Written Recall", icon: "✍️" },
                  { mode: "oral", labelAr: "تسميع شفوي", labelEn: "Oral Recitation", icon: "🎙️" },
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => setPracticeMode(item.mode as any)}
                    style={{
                      padding: "0.75rem 0.5rem",
                      borderRadius: "8px",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      background: practiceMode === item.mode ? "linear-gradient(135deg, var(--primary), var(--secondary))" : "#ffffff",
                      color: practiceMode === item.mode ? "#ffffff" : "var(--foreground)",
                      border: "1px solid " + (practiceMode === item.mode ? "var(--primary)" : "var(--card-border)"),
                      boxShadow: practiceMode === item.mode ? "0 4px 10px rgba(16, 107, 163, 0.2)" : "none",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem",
                      transition: "all 0.25s",
                    }}
                  >
                    <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
                    <span>{language === "ar" ? item.labelAr : item.labelEn}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Session Config */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>
                {language === "ar" ? "٣. نمط الجلسة الدراسية والتقييم:" : "3. Session Format & Arena:"}
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setPracticeSessionType("infinite")}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "6px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    background: practiceSessionType === "infinite" ? "var(--primary)" : "#f0f4f8",
                    color: practiceSessionType === "infinite" ? "#ffffff" : "var(--foreground)",
                    border: "1px solid " + (practiceSessionType === "infinite" ? "var(--primary)" : "var(--card-border)"),
                    transition: "all 0.2s",
                  }}
                >
                  {language === "ar" ? "ممارسة لانهائية ♾️" : "Infinite Practice ♾️"}
                </button>
                <button
                  type="button"
                  onClick={() => setPracticeSessionType("quiz")}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "6px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    background: practiceSessionType === "quiz" ? "var(--primary)" : "#f0f4f8",
                    color: practiceSessionType === "quiz" ? "#ffffff" : "var(--foreground)",
                    border: "1px solid " + (practiceSessionType === "quiz" ? "var(--primary)" : "var(--card-border)"),
                    transition: "all 0.2s",
                  }}
                >
                  {language === "ar" ? "اختبار التقييم والتقدير ⏱️" : "Quiz Assessment Arena ⏱️"}
                </button>
              </div>

              {practiceSessionType === "quiz" && (
                <div style={{
                  marginTop: "0.75rem",
                  padding: "1rem",
                  borderRadius: "10px",
                  background: "rgba(16, 107, 163, 0.03)",
                  border: "1px solid rgba(16, 107, 163, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem"
                }}>
                  {/* Questions Count Configurator */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--primary)" }}>
                      {language === "ar" ? "🎯 عدد أسئلة التحدي والتقييم:" : "🎯 Question Limit / Count:"}
                    </span>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {[3, 5, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPracticeQuizQuestionsCount(num)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "20px",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            cursor: "pointer",
                            transition: "all 0.15s",
                            background: practiceQuizQuestionsCount === num ? "var(--primary)" : "#ffffff",
                            color: practiceQuizQuestionsCount === num ? "#ffffff" : "var(--foreground)",
                            border: "1px solid " + (practiceQuizQuestionsCount === num ? "var(--primary)" : "var(--card-border)"),
                          }}
                        >
                          {language === "ar" ? `${num} أسئلة` : `${num} Questions`}
                        </button>
                      ))}
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={practiceQuizQuestionsCount}
                        onChange={(e) => setPracticeQuizQuestionsCount(Math.max(1, Number(e.target.value)))}
                        style={{
                          width: "70px",
                          padding: "4px 8px",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          border: "1px solid var(--card-border)",
                          textAlign: "center",
                          fontWeight: 800,
                        }}
                      />
                    </div>
                  </div>

                  {/* Time Limit Configurator */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--primary)" }}>
                      {language === "ar" ? "⏱️ مؤقت الاختبار والتقييم:" : "⏱️ Session Timer Limit:"}
                    </span>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {[
                        { val: 30, lblAr: "٣٠ ثانية (خاطف)", lblEn: "30s Blitz" },
                        { val: 60, lblAr: "دقيقة واحدة", lblEn: "1 Min" },
                        { val: 120, lblAr: "دقيقتين", lblEn: "2 Mins" },
                        { val: 300, lblAr: "٥ دقائق", lblEn: "5 Mins" },
                        { val: 600, lblAr: "١٠ دقائق", lblEn: "10 Mins" },
                        { val: 0, lblAr: "بدون مؤقت", lblEn: "No Limit" },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setPracticeQuizDurationLimit(item.val)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "20px",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            cursor: "pointer",
                            transition: "all 0.15s",
                            background: practiceQuizDurationLimit === item.val ? "var(--primary)" : "#ffffff",
                            color: practiceQuizDurationLimit === item.val ? "#ffffff" : "var(--foreground)",
                            border: "1px solid " + (practiceQuizDurationLimit === item.val ? "var(--primary)" : "var(--card-border)"),
                          }}
                        >
                          {language === "ar" ? item.lblAr : item.lblEn}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Start Quest Button */}
            <button
              onClick={async () => {
                setPracticeLoading(true);
                setPracticeFeedback(null);
                setPracticeHasAnswered(false);
                setPracticeAnswer("");
                setPracticeSelectedOptionStr("");
                setPracticeShowHint(false);

                // Reset session stats
                setPracticeSessionXpGained(0);
                setPracticeSessionCorrectAnswers(0);
                setPracticeSessionTotalQuestions(1);
                setPracticeQuizTimeLeft(practiceQuizDurationLimit);

                try {
                  const targetSubject =
                    practiceScopeType === "book"
                      ? dynamicBooks.find((b: any) => (b._id || b.id) === practiceSelectedBookId)?.subject || "General"
                      : practiceSubject;

                  const res = await fetch("/api/practice/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      subject: targetSubject,
                      bookId: practiceScopeType === "book" ? practiceSelectedBookId : "",
                      mode: practiceMode,
                      language: language,
                    }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                      setPracticeCurrentQuestion(data);
                      setPracticeGameState("active");
                    } else {
                      alert(language === "ar" ? "حدث خطأ أثناء توليد السؤال." : "Failed to generate question.");
                    }
                  } else {
                    alert(language === "ar" ? "خطأ في الاتصال بالخادم." : "Server connection failure.");
                  }
                } catch (err) {
                  console.error(err);
                  alert(language === "ar" ? "حدث خطأ غير متوقع." : "An unexpected error occurred.");
                } finally {
                  setPracticeLoading(false);
                }
              }}
              style={{
                padding: "0.85rem",
                borderRadius: "var(--border-radius-md)",
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: "0 6px 15px rgba(16, 107, 163, 0.25)",
                marginTop: "0.5rem",
              }}
              disabled={practiceLoading}
            >
              {practiceLoading ? <FiRefreshCw className="spinning-icon" /> : "🚀"}
              <span>{language === "ar" ? "ابدأ غارة المعرفة والتعلم" : "Launch Active Recall Quest"}</span>
            </button>
          </div>

          {/* Stats Dashboard */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              className="panel-card"
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
                background: "linear-gradient(135deg, rgba(16, 107, 163, 0.05), rgba(212, 175, 55, 0.05))",
                border: "1px solid var(--primary)",
              }}
            >
              <div style={{ fontSize: "3rem" }}>🏆</div>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "#6a7c88", fontWeight: 700, textTransform: "uppercase" }}>
                  {language === "ar" ? "المستوى الحالي" : "Tutor Class Level"}
                </span>
                <h2 style={{ fontSize: "2.25rem", margin: "0.25rem 0", color: "var(--primary)", fontWeight: 800 }}>
                  {language === "ar" ? `مستوى ${practiceLevel}` : `Level ${practiceLevel}`}
                </h2>
              </div>

              {/* XP Progress */}
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, color: "#6a7c88", marginBottom: "0.25rem" }}>
                  <span>{practiceXP} / 100 XP</span>
                  <span>{language === "ar" ? "للمستوى التالي" : "Next Level"}</span>
                </div>
                <div style={{ width: "100%", height: "10px", background: "rgba(0,0,0,0.06)", borderRadius: "10px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${practiceXP}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, var(--primary), var(--secondary))",
                      borderRadius: "10px",
                      transition: "all 0.5s ease",
                    }}
                  />
                </div>
              </div>

              {/* Active Streak */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "30px",
                  background: "rgba(212, 175, 55, 0.1)",
                  border: "1px solid rgba(212, 175, 55, 0.3)",
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>🔥</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#d4af37" }}>
                  {language === "ar" ? `سلسلة الانتصارات: ${practiceStreak}` : `Combo Streak: ${practiceStreak}`}
                </span>
              </div>
            </div>

            {/* Practice History Quick List */}
            <div className="panel-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>⏱️</span>
                <span>{language === "ar" ? "سجل النشاط الفوري" : "Live Session Log"}</span>
              </h4>
              <div style={{ fontSize: "0.8rem", color: "#6a7c88", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{language === "ar" ? "النمط المفضل:" : "Favorite Mode:"}</span>
                  <strong style={{ color: "var(--foreground)" }}>{practiceMode.toUpperCase()}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{language === "ar" ? "إجمالي الأسئلة المحلولة:" : "Total Solved:"}</span>
                  <strong style={{ color: "var(--foreground)" }}>{practiceSessionTotalQuestions}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : practiceGameState === "active" && practiceCurrentQuestion ? (
        /* State 2: Active Quest Board */
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* HUD Top Stats Ribbon */}
          <div
            className="panel-card"
            style={{
              padding: "0.85rem 1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(16, 107, 163, 0.04)",
              border: "1px solid rgba(16, 107, 163, 0.15)",
              borderRadius: "var(--border-radius-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                ⭐️ Lvl {practiceLevel}
              </span>
              <span style={{ width: "1px", height: "15px", background: "rgba(0,0,0,0.1)" }} />
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#d4af37", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                🔥 Combo x{practiceStreak}
              </span>
              <span style={{ width: "1px", height: "15px", background: "rgba(0,0,0,0.1)" }} />
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#4f6371" }}>
                📋 {language === "ar" ? `السؤال ${practiceSessionTotalQuestions}` : `Question ${practiceSessionTotalQuestions}`}
                {practiceSessionType === "quiz" ? ` / ${practiceQuizQuestionsCount}` : ""}
              </span>
            </div>

            {practiceSessionType === "quiz" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "4px 10px",
                  borderRadius: "15px",
                  background: practiceQuizDurationLimit === 0 ? "rgba(39, 174, 96, 0.08)" : practiceQuizTimeLeft < 30 ? "rgba(211, 47, 47, 0.1)" : "rgba(0,0,0,0.04)",
                  border: "1px solid " + (practiceQuizDurationLimit === 0 ? "rgba(39, 174, 96, 0.2)" : practiceQuizTimeLeft < 30 ? "rgba(211, 47, 47, 0.3)" : "rgba(0,0,0,0.08)"),
                }}
              >
                <FiClock style={{ color: practiceQuizDurationLimit === 0 ? "#27ae60" : practiceQuizTimeLeft < 30 ? "#d32f2f" : "var(--primary)" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: practiceQuizDurationLimit === 0 ? "#27ae60" : practiceQuizTimeLeft < 30 ? "#d32f2f" : "var(--foreground)" }}>
                  {practiceQuizDurationLimit === 0
                    ? language === "ar"
                      ? "بدون مؤقت"
                      : "Untimed"
                    : `${practiceQuizTimeLeft}s`}
                </span>
              </div>
            )}
          </div>

          {/* Main Challenge Card */}
          <div className="panel-card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#6a7c88", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>
                  {language === "ar" ? "الاستفسار / التحدي الحالي" : "Current AI Quest Objective"}
                </span>
                <h3 style={{ fontSize: "1.25rem", margin: "0.35rem 0 0 0", color: "var(--primary)", fontWeight: 800, lineHeight: "1.5", fontFamily: "var(--font-sans)" }}>
                  {practiceCurrentQuestion.question}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => speakPracticeText(practiceCurrentQuestion.question, "question")}
                style={{
                  background: speakingType === "question" ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 107, 163, 0.08)",
                  border: "none",
                  borderRadius: "12px",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "pointer",
                  color: speakingType === "question" ? "#ef4444" : "var(--primary)",
                  transition: "all 0.2s",
                  fontSize: "1.2rem"
                }}
                title={language === "ar" ? "استماع للسؤال" : "Listen to Question"}
              >
                {speakingType === "question" ? "🛑" : "🔊"}
              </button>
            </div>

            {/* Dynamic Answer Inputs */}
            {practiceMode === "mcq" ? (
              /* MCQ Mode */
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "0.5rem 0" }}>
                {practiceCurrentQuestion.options &&
                  practiceCurrentQuestion.options.map((opt: string, oIdx: number) => {
                    const isSelected = practiceSelectedOptionStr === opt;
                    const isCorrectOption = opt === practiceCurrentQuestion.correctOption;
                    let btnBg = "#ffffff";
                    let btnBorder = "var(--card-border)";
                    let btnColor = "var(--foreground)";

                    if (practiceHasAnswered) {
                      if (isCorrectOption) {
                        btnBg = "rgba(39, 174, 96, 0.1)";
                        btnBorder = "var(--accent-green)";
                        btnColor = "#27ae60";
                      } else if (isSelected) {
                        btnBg = "rgba(211, 47, 47, 0.08)";
                        btnBorder = "#d32f2f";
                        btnColor = "#d32f2f";
                      }
                    } else if (isSelected) {
                      btnBg = "rgba(16, 107, 163, 0.08)";
                      btnBorder = "var(--primary)";
                      btnColor = "var(--primary)";
                    }

                    return (
                      <button
                        key={oIdx}
                        onClick={() => {
                          if (!practiceHasAnswered) {
                            setPracticeSelectedOptionStr(opt);
                          }
                        }}
                        disabled={practiceHasAnswered}
                        style={{
                          width: "100%",
                          padding: "1rem",
                          borderRadius: "10px",
                          border: `2px solid ${btnBorder}`,
                          background: btnBg,
                          color: btnColor,
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          textAlign: language === "ar" ? "right" : "left",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          transition: "all 0.15s",
                          boxShadow: isSelected && !practiceHasAnswered ? "var(--shadow-sm)" : "none",
                        }}
                      >
                        <span
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: `1.5px solid ${btnColor}`,
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            flexShrink: 0,
                            background: isSelected ? btnColor : "transparent",
                            color: isSelected ? "#ffffff" : btnColor,
                          }}
                        >
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span style={{ flex: 1 }}>{opt}</span>
                        {practiceHasAnswered && isCorrectOption && <span>🎯</span>}
                      </button>
                    );
                  })}
              </div>
            ) : (
              /* Text & Oral recall modes */
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <style>{`
                  @keyframes bounceSoundWave {
                    0% { height: 4px; transform: scaleY(1); }
                    100% { height: 26px; transform: scaleY(1.3); }
                  }
                  @keyframes pulseGlow {
                    0% { box-shadow: 0 0 0 0 rgba(16, 107, 163, 0.4); }
                    70% { box-shadow: 0 0 0 12px rgba(16, 107, 163, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(16, 107, 163, 0); }
                  }
                  @keyframes recordPulse {
                    0% { transform: scale(1); opacity: 0.9; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.9; }
                  }
                `}</style>

                {practiceMode === "oral" ? (
                  /* Advanced Web Speech Console for Oral Practice */
                  <div
                    style={{
                      background: "rgba(16, 107, 163, 0.03)",
                      border: "1px dashed rgba(16, 107, 163, 0.3)",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "1rem",
                      position: "relative",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)" }}>
                        {language === "ar" ? "🎙️ استوديو التسميع الشفوي الذكي" : "🎙️ AI Oral Recitation Console"}
                      </h4>
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "#6a7c88" }}>
                        {language === "ar"
                          ? "تحدث بلغة فصيحة أو بلهجة مصرية، معيار التقييم يدمج التعرف التلقائي"
                          : "Speak clearly. System auto-normalizes Egyptian Arabic accents."}
                      </p>
                    </div>

                    {/* Microphone Action Button */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={practiceHasAnswered}
                      style={{
                        width: "70px",
                        height: "70px",
                        borderRadius: "50%",
                        border: "none",
                        background: isListening
                          ? "linear-gradient(135deg, #d32f2f, #f44336)"
                          : "linear-gradient(135deg, var(--primary), var(--secondary))",
                        color: "#ffffff",
                        fontSize: "2rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: practiceHasAnswered ? "not-allowed" : "pointer",
                        animation: isListening ? "pulseGlow 1.5s infinite" : "none",
                        opacity: practiceHasAnswered ? 0.6 : 1,
                        transition: "all 0.3s ease",
                        boxShadow: "0 6px 15px rgba(16, 107, 163, 0.3)",
                      }}
                    >
                      {isListening ? "⏹️" : "🎙️"}
                    </button>

                    {/* Status & Simulated/Live Sound Waves */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 800,
                          color: isListening ? "#d32f2f" : "var(--primary)",
                          textTransform: "uppercase",
                        }}
                      >
                        {isListening
                          ? language === "ar"
                            ? "🔴 جاري الاستماع لتسميعك..."
                            : "🔴 Recording recitation live..."
                          : language === "ar"
                          ? "اضغط على الميكروفون لبدء التسجيل"
                          : "Click microphone to start reciting"}
                      </span>

                      {/* Sound wave visualizer bars */}
                      <div style={{ display: "flex", gap: "4px", alignItems: "center", height: "30px", justifyContent: "center" }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                          <div
                            key={i}
                            style={{
                              width: "4px",
                              background: isListening
                                ? "linear-gradient(180deg, #d32f2f, #ff7961)"
                                : "linear-gradient(180deg, var(--secondary), var(--primary))",
                              borderRadius: "2px",
                              height: isListening ? `${10 + Math.random() * 20}px` : "5px",
                              animation: isListening ? `bounceSoundWave 0.5s ease-in-out infinite alternate ${i * 0.04}s` : "none",
                              transition: "height 0.2s ease",
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {micError && (
                      <div
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          background: "rgba(211, 47, 47, 0.1)",
                          color: "#d32f2f",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        ⚠️ {micError}
                      </div>
                    )}

                    {/* Live Dictation transcript box */}
                    <div style={{ width: "100%", marginTop: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#4f6371" }}>
                          {language === "ar" ? "نص التسميع المكتوب:" : "Captured Transcript Output:"}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#6a7c88" }}>
                          {language === "ar" ? "(يمكنك التعديل اليدوي قبل التأكيد)" : "(Feel free to edit text if needed)"}
                        </span>
                      </div>
                      <textarea
                        value={practiceAnswer}
                        onChange={(e) => setPracticeAnswer(e.target.value)}
                        disabled={practiceHasAnswered}
                        placeholder={
                          language === "ar"
                            ? "تحدث ليتم نسخ كلامك هنا تلقائياً، أو اكتب إجابتك مباشرة..."
                            : "Your spoken words will transcribe here automatically, or type your answer..."
                        }
                        style={{
                          width: "100%",
                          height: "100px",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          border: "1px solid var(--card-border)",
                          fontSize: "0.85rem",
                          resize: "none",
                          fontFamily: "var(--font-sans)",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  /* Standard Text Recall Mode */
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "#4f6371" }}>
                      {language === "ar"
                        ? "اكتب صياغة الإجابة الكاملة (النسخ واللصق معطل):"
                        : "Type your comprehensive recall response (paste is blocked):"}
                    </label>
                    <textarea
                      id="active-practice-textarea"
                      value={practiceAnswer}
                      onChange={(e) => {
                        if (!practiceHasAnswered) {
                          setPracticeAnswer(e.target.value);
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        alert(
                          language === "ar"
                            ? "تنبيه: تم تعطيل النسخ واللصق لتشجيع الفهم النشط والكتابة الذاتية!"
                            : "Notice: Copy-pasting is disabled to encourage active recall and typing your own answers!"
                        );
                      }}
                      disabled={practiceHasAnswered}
                      placeholder={
                        language === "ar"
                          ? "اكتب الإجابة التفصيلية هنا مستعيناً بذاكرتك الشخصية..."
                          : "Type your comprehensive, detailed response here based on your recall..."
                      }
                      style={{
                        width: "100%",
                        height: "110px",
                        padding: "0.85rem",
                        borderRadius: "8px",
                        border: "1px solid var(--card-border)",
                        outline: "none",
                        fontSize: "0.9rem",
                        fontFamily: "var(--font-sans)",
                        resize: "none",
                        transition: "border 0.2s",
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed rgba(0,0,0,0.06)", paddingTop: "1rem" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setPracticeShowHint(!practiceShowHint)}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid var(--card-border)",
                    borderRadius: "6px",
                    background: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  💡 {language === "ar" ? "عرض التلميح" : "Show Clue"}
                </button>

                <button
                  onClick={() => {
                    if (confirm(language === "ar" ? "هل أنت متأكد من إنهاء غارة التعلم الحالية والعودة للملف الإعدادي؟" : "Are you sure you want to abandon the current quest?")) {
                      setPracticeGameState("setup");
                      setPracticeCurrentQuestion(null);
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid rgba(211, 47, 47, 0.2)",
                    borderRadius: "6px",
                    background: "#ffffff",
                    color: "#d32f2f",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                  }}
                >
                  🛡️ {language === "ar" ? "انسحاب" : "Abandon"}
                </button>
              </div>

              {!practiceHasAnswered ? (
                <button
                  onClick={async () => {
                    const answerStr = practiceMode === "mcq" ? practiceSelectedOptionStr : practiceAnswer;
                    if (!answerStr.trim()) return;

                    setPracticeLoading(true);
                    try {
                      const res = await fetch("/api/practice/evaluate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          question: practiceCurrentQuestion.question,
                          mode: practiceMode,
                          userAnswer: answerStr,
                          correctOption: practiceCurrentQuestion.correctOption,
                          language: language,
                        }),
                      });

                      if (res.ok) {
                        const data = await res.json();
                        if (data.success) {
                          setPracticeFeedback(data);
                          setPracticeHasAnswered(true);

                          // Calculate dynamic XP
                          const computedXp = Math.round(data.xpGained * (1 + practiceStreak * 0.1));
                          setPracticeSessionXpGained((prev) => prev + computedXp);

                          // Add to stats
                          if (data.isCorrect) {
                            setPracticeStreak((prev) => prev + 1);
                            setPracticeSessionCorrectAnswers((prev) => prev + 1);
                          } else {
                            setPracticeStreak(0);
                          }

                          // Update level/XP
                          setPracticeXP((prev) => {
                            const newXP = prev + computedXp;
                            if (newXP >= 100) {
                              setPracticeLevel((l) => l + 1);
                              return newXP % 100;
                            }
                            return newXP;
                          });
                        } else {
                          alert(language === "ar" ? "حدث خطأ أثناء تقييم الإجابة." : "Failed to evaluate answer.");
                        }
                      } else {
                        alert(language === "ar" ? "خطأ في الاتصال بخادم التقييم." : "Connection failed.");
                      }
                    } catch (err) {
                      console.error(err);
                      alert(language === "ar" ? "حدث خطأ غير متوقع." : "Unexpected evaluation error.");
                    } finally {
                      setPracticeLoading(false);
                    }
                  }}
                  disabled={practiceLoading || (practiceMode === "mcq" ? !practiceSelectedOptionStr : !practiceAnswer.trim())}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    background: "var(--primary)",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {practiceLoading ? <FiRefreshCw className="spinning-icon" /> : "📝"}
                  <span>{language === "ar" ? "إرسال الإجابة للتقييم" : "Lock in Response"}</span>
                </button>
              ) : (
                /* Next Action Button */
                <button
                  onClick={async () => {
                    // Check if quiz completed
                    if (practiceSessionType === "quiz" && practiceSessionTotalQuestions >= practiceQuizQuestionsCount) {
                      setPracticeGameState("victory");
                      return;
                    }

                    setPracticeLoading(true);
                    setPracticeFeedback(null);
                    setPracticeHasAnswered(false);
                    setPracticeAnswer("");
                    setPracticeSelectedOptionStr("");
                    setPracticeShowHint(false);
                    setPracticeSessionTotalQuestions((prev) => prev + 1);

                    try {
                      const targetSubject =
                        practiceScopeType === "book"
                          ? dynamicBooks.find((b: any) => (b._id || b.id) === practiceSelectedBookId)?.subject || "General"
                          : practiceSubject;

                      const res = await fetch("/api/practice/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          subject: targetSubject,
                          bookId: practiceScopeType === "book" ? practiceSelectedBookId : "",
                          mode: practiceMode,
                          language: language,
                        }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data.success) {
                          setPracticeCurrentQuestion(data);
                        } else {
                          alert(language === "ar" ? "حدث خطأ أثناء الانتقال للسؤال التالي." : "Failed to load next challenge.");
                        }
                      } else {
                        alert(language === "ar" ? "خطأ في الاتصال بالخادم." : "Connection failed.");
                      }
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setPracticeLoading(false);
                    }
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                  disabled={practiceLoading}
                >
                  {practiceLoading ? <FiRefreshCw className="spinning-icon" /> : "🚀"}
                  <span>
                    {practiceSessionType === "quiz" && practiceSessionTotalQuestions >= practiceQuizQuestionsCount
                      ? language === "ar"
                        ? "إكمال المهمة والنتائج"
                        : "Finish Quest & Scoreboard"
                      : language === "ar"
                      ? "الانتقال للتحدي التالي"
                      : "Next Quest Objective"}
                  </span>
                </button>
              )}
            </div>

            {/* Hint Display */}
            {practiceShowHint && (
              <div
                style={{
                  padding: "0.85rem",
                  background: "rgba(212, 175, 55, 0.08)",
                  borderLeft: "3px solid #d4af37",
                  borderRight: language === "ar" ? "3px solid #d4af37" : "none",
                  borderRadius: "4px",
                }}
              >
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#b28900", textTransform: "uppercase" }}>
                  💡 {language === "ar" ? "تلميح مرشد التعلم الكوني:" : "Tutor Clue:"}
                </span>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", fontWeight: 700, color: "var(--foreground)" }}>{practiceCurrentQuestion.hint}</p>
              </div>
            )}

            {/* Evaluation Feedback */}
            {practiceHasAnswered && practiceFeedback && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
                {/* Verdict Banner */}
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    border: "1px solid " + (practiceFeedback.isCorrect ? "var(--accent-green)" : "#d32f2f"),
                    background: practiceFeedback.isCorrect ? "rgba(39, 174, 96, 0.06)" : "rgba(211, 47, 47, 0.04)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, color: practiceFeedback.isCorrect ? "#2e7d32" : "#c62828", textTransform: "uppercase" }}>
                        {language === "ar" ? "التقييم الفوري والقرار" : "AI Tutor Verdict"}
                      </span>
                      <h4 style={{ margin: "0.25rem 0 0 0", fontSize: "1rem", fontWeight: 800, color: practiceFeedback.isCorrect ? "#2e7d32" : "#c62828" }}>
                        {practiceFeedback.feedback}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakPracticeText(practiceFeedback.feedback, "feedback")}
                      style={{
                        background: speakingType === "feedback" ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 107, 163, 0.08)",
                        border: "none",
                        borderRadius: "8px",
                        width: "36px",
                        height: "36px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                        color: speakingType === "feedback" ? "#ef4444" : "var(--primary)",
                        transition: "all 0.2s",
                        fontSize: "1rem"
                      }}
                      title={language === "ar" ? "استماع للتقييم شفهياً" : "Listen to Verdict"}
                    >
                      {speakingType === "feedback" ? "🛑" : "🔊"}
                    </button>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6a7c88" }}>{language === "ar" ? "الخبرة المكتسبة" : "Reward"}</span>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)" }}>
                      +{Math.round(practiceFeedback.xpGained * (1 + practiceStreak * 0.1))} XP
                    </div>
                  </div>
                </div>

                {/* Oral Practice Assessment Rubric Dashboard */}
                {practiceMode === "oral" && practiceFeedback.rubric && (
                  <div
                    className="panel-card"
                    style={{
                      padding: "1.5rem",
                      background: "linear-gradient(135deg, rgba(212, 175, 55, 0.03), rgba(16, 107, 163, 0.03))",
                      border: "2px solid #d4af37",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed rgba(212,175,55,0.3)", paddingBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.5rem" }}>📊</span>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--foreground)" }}>
                            {language === "ar" ? "لوحة التقييم الشفوي النطقي" : "Oral Performance Assessment Rubric"}
                          </h4>
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "#6a7c88" }}>
                            {language === "ar" ? "تحليل النطق والطلاقة ودقة المحتوى الفني" : "Detailed metrics of pronunciation, speech fluency and content accuracy"}
                          </p>
                        </div>
                      </div>

                      {practiceFeedback.rubric.accentNormalizationApplied && (
                        <span
                          style={{
                            background: "rgba(39, 174, 96, 0.1)",
                            color: "#27ae60",
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            padding: "4px 8px",
                            borderRadius: "15px",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            border: "1px solid rgba(39,174,96,0.2)",
                          }}
                        >
                          ✨ {language === "ar" ? "تم تفعيل التسامح اللهجي المصري" : "Egyptian Accent Normalization applied"}
                        </span>
                      )}
                    </div>

                    {/* Overall Score Circle/Badge */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem", alignItems: "center" }} className="grid-cols-1">
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem", background: "rgba(0,0,0,0.02)", borderRadius: "10px", border: "1px solid var(--card-border)" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#6a7c88", textTransform: "uppercase" }}>
                          {language === "ar" ? "التقييم العام" : "Overall Score"}
                        </span>
                        <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#d4af37", margin: "0.25rem 0" }}>
                          {practiceFeedback.rubric.overall}%
                        </div>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: practiceFeedback.rubric.overall >= 60 ? "#27ae60" : "#d32f2f" }}>
                          {practiceFeedback.rubric.overall >= 60
                            ? language === "ar" ? "اجتياز مستحق 🛡️" : "PASS 🛡️"
                            : language === "ar" ? "بحاجة لمراجعة ⚠️" : "REVIEW ⚠️"}
                        </span>
                      </div>

                      {/* Sub-metrics cards */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        {[
                          { key: "pronunciation", labelAr: "مخارج الحروف والنطق", labelEn: "Pronunciation", val: practiceFeedback.rubric.pronunciation, icon: "🗣️", color: "#106ba3" },
                          { key: "confidence", labelAr: "الطلاقة والثقة بالنفس", labelEn: "Confidence / Fluency", val: practiceFeedback.rubric.confidence, icon: "⚡", color: "#f39c12" },
                          { key: "accuracy", labelAr: "الدقة العلمية للمحتوى", labelEn: "Scientific Accuracy", val: practiceFeedback.rubric.accuracy, icon: "🎯", color: "#27ae60" },
                          { key: "structure", labelAr: "ترتيب وصياغة الفكرة", labelEn: "Logical Structure", val: practiceFeedback.rubric.structure, icon: "🧱", color: "#9b59b6" },
                        ].map((metric) => (
                          <div
                            key={metric.key}
                            style={{
                              padding: "0.75rem",
                              background: "#ffffff",
                              borderRadius: "8px",
                              border: "1px solid var(--card-border)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.25rem",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#4f6371" }}>
                                {metric.icon} {language === "ar" ? metric.labelAr : metric.labelEn}
                              </span>
                              <strong style={{ fontSize: "0.85rem", color: metric.color }}>{metric.val}%</strong>
                            </div>
                            <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ width: `${metric.val}%`, height: "100%", background: metric.color, borderRadius: "3px" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Rubric Bullet Points */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.85rem", background: "rgba(0,0,0,0.02)", borderRadius: "8px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#4f6371" }}>
                        📌 {language === "ar" ? "الملاحظات الدقيقة لمقيم الأداء:" : "Detailed Feedback on Oral Rubric:"}
                      </span>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.75rem", color: "var(--foreground)" }} className="grid-cols-1">
                        {practiceFeedback.rubric.feedbackDetails && (
                          <>
                            <div>
                              <strong>🗣️ {language === "ar" ? "النطق ومخارج الحروف:" : "Pronunciation:"}</strong>{" "}
                              <span>{practiceFeedback.rubric.feedbackDetails.pronunciationFeedback}</span>
                            </div>
                            <div>
                              <strong>⚡ {language === "ar" ? "الطلاقة والثقة:" : "Confidence:"}</strong>{" "}
                              <span>{practiceFeedback.rubric.feedbackDetails.confidenceFeedback}</span>
                            </div>
                            <div>
                              <strong>🎯 {language === "ar" ? "الدقة الفنية:" : "Accuracy:"}</strong>{" "}
                              <span>{practiceFeedback.rubric.feedbackDetails.accuracyFeedback}</span>
                            </div>
                            <div>
                              <strong>🧱 {language === "ar" ? "الصياغة والترتيب:" : "Structure:"}</strong>{" "}
                              <span>{practiceFeedback.rubric.feedbackDetails.structureFeedback}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Rich Pedagogical Explanation */}
                <div style={{ padding: "1.25rem", background: "#f8fafd", border: "1px solid var(--card-border)", borderRadius: "10px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase" }}>
                    📖 {language === "ar" ? "الدليل التعليمي الشامل وتصحيح المفاهيم:" : "Comprehensive Academic Explanation:"}
                  </span>
                  <div style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "var(--foreground)", lineHeight: "1.6" }}>
                    {renderPremiumContent(practiceFeedback.correctExplanation)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* State 3: Victory Screen */
        <div
          className="panel-card"
          style={{
            padding: "2.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
            textAlign: "center",
            background: "radial-gradient(circle, rgba(16, 107, 163, 0.05), #ffffff)",
            border: "2px solid var(--primary)",
          }}
        >
          <span style={{ fontSize: "4.5rem" }}>🏆</span>

          <div>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "1px" }}>
              {language === "ar" ? "المهمة اكتملت!" : "Quest Completed Successfully!"}
            </span>
            <h2 style={{ fontSize: "2rem", margin: "0.5rem 0 0.25rem 0", fontWeight: 800, color: "var(--primary)" }}>
              {language === "ar" ? "الملخص الفني للأداء" : "Academic Quest Scoreboard"}
            </h2>
            <p style={{ fontSize: "0.9rem", color: "#6a7c88", margin: 0 }}>
              {language === "ar" ? "لقد أكملت جميع المتطلبات وأحرزت تقدماً ملحوظاً!" : "You have achieved your academic milestones!"}
            </p>
          </div>

          {/* Stats Breakdown Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", width: "100%", maxWidth: "450px", margin: "1rem 0" }}>
            <div style={{ padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "10px", border: "1px solid var(--card-border)" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6a7c88" }}>{language === "ar" ? "إجمالي الخبرة" : "XP Gained"}</span>
              <h3 style={{ fontSize: "1.5rem", margin: "0.25rem 0 0 0", fontWeight: 800, color: "var(--primary)" }}>+{practiceSessionXpGained} XP</h3>
            </div>
            <div style={{ padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "10px", border: "1px solid var(--card-border)" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6a7c88" }}>{language === "ar" ? "الدقة" : "Accuracy"}</span>
              <h3 style={{ fontSize: "1.5rem", margin: "0.25rem 0 0 0", fontWeight: 800, color: "#2e7d32" }}>
                {practiceSessionTotalQuestions > 0 ? Math.round((practiceSessionCorrectAnswers / practiceSessionTotalQuestions) * 100) : 0}%
              </h3>
            </div>
            <div style={{ padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "10px", border: "1px solid var(--card-border)" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6a7c88" }}>{language === "ar" ? "الإجابات" : "Correct"}</span>
              <h3 style={{ fontSize: "1.5rem", margin: "0.25rem 0 0 0", fontWeight: 800, color: "var(--foreground)" }}>
                {practiceSessionCorrectAnswers} / {practiceSessionTotalQuestions}
              </h3>
            </div>
          </div>

          {/* Post-game Actions */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={async () => {
                setPracticeLoading(true);
                setPracticeFeedback(null);
                setPracticeHasAnswered(false);
                setPracticeAnswer("");
                setPracticeSelectedOptionStr("");
                setPracticeShowHint(false);

                // Restart session with same config
                setPracticeSessionXpGained(0);
                setPracticeSessionCorrectAnswers(0);
                setPracticeSessionTotalQuestions(1);
                setPracticeQuizTimeLeft(practiceQuizDurationLimit);

                try {
                  const targetSubject =
                    practiceScopeType === "book"
                      ? dynamicBooks.find((b: any) => (b._id || b.id) === practiceSelectedBookId)?.subject || "General"
                      : practiceSubject;

                  const res = await fetch("/api/practice/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      subject: targetSubject,
                      bookId: practiceScopeType === "book" ? practiceSelectedBookId : "",
                      mode: practiceMode,
                      language: language,
                    }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                      setPracticeCurrentQuestion(data);
                      setPracticeGameState("active");
                    } else {
                      alert(language === "ar" ? "حدث خطأ أثناء إعادة توليد التحدي." : "Failed to restart.");
                    }
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setPracticeLoading(false);
                }
              }}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
              disabled={practiceLoading}
            >
              {practiceLoading ? <FiRefreshCw className="spinning-icon" /> : "🔁"}
              <span>{language === "ar" ? "إعادة التحدي" : "Replay Quest"}</span>
            </button>

            <button
              onClick={() => {
                setPracticeGameState("setup");
                setPracticeCurrentQuestion(null);
              }}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "1px solid var(--card-border)",
                background: "#ffffff",
                color: "var(--foreground)",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "0.85rem",
              }}
            >
              {language === "ar" ? "العودة لقائمة الإعداد" : "Tutor Setup Menu"}
            </button>
          </div>
        </div>
      )}

      {renderSpaceHistory()}
    </div>
  );
};
