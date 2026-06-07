"use client";

import React, { useState, useEffect } from "react";
import { FiRefreshCw, FiBook, FiAward, FiZap, FiClock, FiCpu, FiMessageSquare, FiActivity } from "react-icons/fi";

import { authedFetch } from "../../lib/authedFetch";

interface Book {
  _id?: string;
  id?: string;
  title: string;
  subject_id?: string;
}

interface InsightsPanelProps {
  language: string;
  dynamicBooks: Book[];
  user: any;
  getLevelBadgeText: () => string;
  activeLevel: number;
  activeStreak: number;
  xpProgressPercent: number;
  activeXp: number;
  nextLevelXp: number;
  consumedClt: number;
  totalAllocatedClt: number;
  tokenProgressPercent: number;
  t: (key: string) => string;
  authedFetch?: any;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  language,
  dynamicBooks,
  user,
  getLevelBadgeText,
  activeLevel,
  activeStreak,
  xpProgressPercent,
  activeXp,
  nextLevelXp,
  consumedClt,
  totalAllocatedClt,
  tokenProgressPercent,
  t,
  authedFetch: propAuthedFetch,
}) => {
  const remainingClt = totalAllocatedClt - consumedClt;
  const [readingSessions, setReadingSessions] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weakTopics, setWeakTopics] = useState<any[]>([]);
  const [scoresTrend, setScoresTrend] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const fetchFn = propAuthedFetch || authedFetch;

        // 1. Fetch reading sessions
        const readingRes = await fetchFn("/api/reading-session");
        if (readingRes && readingRes.ok) {
          const readingData = await readingRes.json();
          if (readingData && readingData.sessions) {
            setReadingSessions(readingData.sessions);
          }
        }

        // 2. Fetch user activities (for weak topics / test history)
        const activityRes = await fetchFn("/api/activity");
        if (activityRes && activityRes.ok) {
          const activityData = await activityRes.json();
          if (activityData && activityData.activities) {
            const fetchedActivities = activityData.activities;
            setActivities(fetchedActivities);

          // Parse activities to extract weak topics & scores
          // e.g., filter practice_session or check_question activities
          const practiceRuns = fetchedActivities.filter((act: any) => 
            act.action === "practice_session" || act.action === "question_checked"
          );

          // Build topics map
          const topicMap: { [key: string]: { correct: number; total: number; bookId?: string } } = {};
          practiceRuns.forEach((run: any) => {
            const details = run.details || {};
            const topic = details.topic || details.chapter || "General Practice";
            const isCorrect = run.status === "success" || details.score >= 70 || details.correct;
            
            if (!topicMap[topic]) {
              topicMap[topic] = { correct: 0, total: 0, bookId: details.bookId || details.book_id };
            }
            topicMap[topic].total += 1;
            if (isCorrect) {
              topicMap[topic].correct += 1;
            }
          });

          // Compute weak topics (accuracy < 70%) and strong ones
          const computedTopics = Object.entries(topicMap).map(([name, stats]) => {
            const accuracy = Math.round((stats.correct / stats.total) * 100);
            return {
              name,
              accuracy,
              totalQuestions: stats.total * 5, // typical practice count
              bookId: stats.bookId,
              status: accuracy >= 80 ? "excellent" : accuracy >= 60 ? "review" : "critical"
            };
          });

          // Sort so critical topics are first
          computedTopics.sort((a, b) => a.accuracy - b.accuracy);
          setWeakTopics(computedTopics);

          // Extract scores over time
          const trend = practiceRuns.map((run: any) => {
            const details = run.details || {};
            return {
              date: new Date(run.timestamp).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }),
              score: details.score !== undefined ? details.score : (details.correct ? Math.round((details.correct / (details.total || 5)) * 100) : 75),
              topic: details.topic || details.chapter || "Quiz"
            };
          }).slice(0, 6).reverse(); // Keep last 6 runs
          setScoresTrend(trend);
        }
      }
    } catch (err) {
        console.error("[InsightsPanel] Error fetching metrics:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [authedFetch, language]);

  // Translate helper for book titles
  const getBookTitle = (bookId: string) => {
    const book = dynamicBooks.find((b) => b._id === bookId || b.id === bookId);
    return book ? book.title : bookId;
  };

  const isRtl = language === "ar";

  // Beautiful badges list
  const badges = [
    { id: "streak_3", labelAr: "مواظب متواصل (٣ أيام)", labelEn: "3-Day Streak", icon: "🔥", active: activeStreak >= 3 },
    { id: "streak_7", labelAr: "بطل الاستمرارية (٧ أيام)", labelEn: "7-Day Warrior", icon: "⚡", active: activeStreak >= 7 },
    { id: "level_5", labelAr: "القمة الأكاديمية (مستوى ٥)", labelEn: "Apex Student (Lvl 5)", icon: "🏆", active: activeLevel >= 5 },
    { id: "tokens_100", labelAr: "مستكشف المعرفة (١٠٠+ توكن)", labelEn: "Token Explorer", icon: "💎", active: consumedClt >= 100 },
    { id: "read_3", labelAr: "قارئ نهم (٣ كتب)", labelEn: "Avid Reader (3 Books)", icon: "📚", active: readingSessions.length >= 3 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Gamification Profile Header Card */}
      <div 
        className="panel-card" 
        style={{ 
          padding: "1.75rem", 
          background: "linear-gradient(135deg, rgba(16, 107, 163, 0.05), rgba(235, 220, 185, 0.15))", 
          border: "1px solid rgba(16, 107, 163, 0.15)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ 
              width: "64px", 
              height: "64px", 
              borderRadius: "50%", 
              background: "linear-gradient(135deg, var(--primary), var(--secondary))", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              fontSize: "1.8rem",
              boxShadow: "0 4px 10px rgba(16, 107, 163, 0.2)"
            }}>
              {user?.email?.startsWith("teacher") ? "👨‍🏫" : "🎓"}
            </div>
            <div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                {user?.displayName || user?.email?.split("@")[0] || (isRtl ? "طالب فاهم" : "Fahem Student")}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                <span style={{ 
                  fontSize: "0.8rem", 
                  fontWeight: 800, 
                  color: "var(--primary)", 
                  background: "rgba(16, 107, 163, 0.08)", 
                  padding: "2px 10px", 
                  borderRadius: "12px",
                  border: "1px solid rgba(16, 107, 163, 0.1)"
                }}>
                  {getLevelBadgeText()}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>
                  • {isRtl ? `المستوى الأكاديمي ${activeLevel}` : `Academic Level ${activeLevel}`}
                </span>
              </div>
            </div>
          </div>

          {/* Core Gamification Stats */}
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <div style={{ textAlign: "center", background: "#ffffff", padding: "0.5rem 1.25rem", borderRadius: "12px", border: "1px solid var(--card-border)", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: "1.3rem", color: "#e65100", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", fontWeight: 800 }}>
                <FiZap style={{ fill: "#ff9100", stroke: "#e65100" }} /> {activeStreak}
              </div>
              <span style={{ fontSize: "0.75rem", color: "#8fa0ac", fontWeight: 700 }}>
                {isRtl ? "سلسلة الأيام" : "Day Streak"}
              </span>
            </div>

            <div style={{ textAlign: "center", background: "#ffffff", padding: "0.5rem 1.25rem", borderRadius: "12px", border: "1px solid var(--card-border)", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: "1.3rem", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", fontWeight: 800 }}>
                🏆 {activeXp}
              </div>
              <span style={{ fontSize: "0.75rem", color: "#8fa0ac", fontWeight: 700 }}>
                {isRtl ? "نقاط الخبرة XP" : "Total XP"}
              </span>
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#6a7c88" }}>
            <span>{isRtl ? `المستوى ${activeLevel}` : `Level ${activeLevel}`}</span>
            <span>{activeXp} / {nextLevelXp} XP</span>
            <span>{isRtl ? `المستوى ${activeLevel + 1}` : `Level ${activeLevel + 1}`}</span>
          </div>
          <div style={{ height: "10px", width: "100%", background: "rgba(0,0,0,0.05)", borderRadius: "5px", overflow: "hidden" }}>
            <div 
              style={{ 
                height: "100%", 
                width: `${xpProgressPercent}%`, 
                background: "linear-gradient(90deg, var(--primary), var(--secondary))", 
                borderRadius: "5px",
                transition: "width 0.5s ease-out"
              }} 
            />
          </div>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#8fa0ac", textAlign: isRtl ? "right" : "left" }}>
            {isRtl 
              ? `متبقي ${nextLevelXp - activeXp} نقطة خبرة للصعود للمستوى التالي. واصل القراءة والممارسة!` 
              : `Only ${nextLevelXp - activeXp} XP left to level up. Keep reading & practicing!`}
          </p>
        </div>
      </div>

      {/* Main Grid: Weak Topics & Reading Telemetry */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "1.5rem" }} className="grid-cols-1">
        
        {/* Left: Weak Topics & Weakness Explainer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Weak Topics Analysis */}
          <div className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800, color: "var(--foreground)" }}>
              🎯 {isRtl ? "تحليل نقاط الضعف والمواضيع الشائكة" : "Weak Topics & Concept Metrics"}
            </h3>
            
            {loading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <FiRefreshCw className="spinning-icon" style={{ fontSize: "1.5rem", color: "var(--primary)" }} />
              </div>
            ) : weakTopics.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#6a7c88" }}>
                <span style={{ fontSize: "2rem" }}>📊</span>
                <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                  {isRtl 
                    ? "لا توجد بيانات كافية لتحليل المهارات حالياً. قم بحل بعض التدريبات والممارسات في ركن التدريب!" 
                    : "Not enough training telemetry to analyze your weaknesses yet. Complete a few practice sessions!"}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {weakTopics.map((topic, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: "0.85rem", 
                      borderRadius: "8px", 
                      border: "1px solid var(--card-border)", 
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem"
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{topic.name}</span>
                        {topic.bookId && (
                          <span style={{ fontSize: "0.7rem", color: "#8fa0ac", background: "rgba(0,0,0,0.03)", padding: "1px 6px", borderRadius: "4px" }}>
                            {getBookTitle(topic.bookId)}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#8fa0ac" }}>
                        {isRtl ? `معدل دقة الإجابات: ${topic.accuracy}%` : `Accurate Answers Rate: ${topic.accuracy}%`}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ 
                        fontSize: "0.75rem", 
                        fontWeight: 800, 
                        padding: "2px 8px", 
                        borderRadius: "10px",
                        background: topic.status === "excellent" ? "rgba(46, 125, 50, 0.08)" : topic.status === "review" ? "rgba(239, 108, 0, 0.08)" : "rgba(198, 40, 40, 0.08)",
                        color: topic.status === "excellent" ? "#2e7d32" : topic.status === "review" ? "#ef6c00" : "#c62828",
                        border: `1px solid ${topic.status === "excellent" ? "rgba(46,125,50,0.15)" : topic.status === "review" ? "rgba(239,108,0,0.15)" : "rgba(198,40,40,0.15)"}`
                      }}>
                        {topic.status === "excellent" ? (isRtl ? "مكتمل الممتاز" : "Mastered") : topic.status === "review" ? (isRtl ? "يحتاج مراجعة" : "Needs Review") : (isRtl ? "حرج جداً" : "Critical Focus")}
                      </span>
                    </div>
                  </div>
                ))}

                {/* AI Interactive Suggestion */}
                <div 
                  style={{ 
                    marginTop: "0.5rem", 
                    padding: "1rem", 
                    borderRadius: "10px", 
                    background: "rgba(16, 107, 163, 0.04)", 
                    border: "1px dashed var(--primary)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                  }}
                >
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--foreground)", fontWeight: 700 }}>
                    💡 {isRtl ? "توصية رفيق المذاكرة الذكي:" : "AI Learning Assistant Suggestion:"}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#6a7c88", lineHeight: "1.4" }}>
                    {isRtl 
                      ? "نقوم برصد فجواتك المعرفية لنسلّط الضوء عليها. اضغط على الزر أدناه ليقوم الرفيق بجدولة خطة استرجاع فوري وسؤال تفاعلي دقيق حول نقاط ضعفك الحالية."
                      : "We found concept gaps in your performance. Click below to launch the Companion to generate an instant review blueprint and targeted practice for your weak areas."}
                  </p>
                  <button
                    onClick={() => {
                      // Navigate to companion or pre-fill chat input
                      const customInput = isRtl
                        ? `مرحباً رفيقي، أنا ضعيف في موضوع "${weakTopics[0]?.name || "الرياضيات"}". أريد خطة مذاكرة وتدريب تفاعلي فوراً.`
                        : `Hi, I am weak in "${weakTopics[0]?.name || "Math"}" topic. Please help me with a custom plan and interactive practice.`;
                      
                      // Custom event to trigger companion panel text
                      const event = new CustomEvent("companion-suggest-prompt", { detail: { text: customInput } });
                      window.dispatchEvent(event);
                      
                      // Also focus active tab to companion (which is persistent overlay FAB or chat tab if exists)
                      alert(isRtl ? "تم إرسال الموضوع لرفيق المذاكرة الذكي! افتح محادثة الرفيق (FAB) للبدء." : "Topic sent to AI Companion! Tap the Chat FAB icon to begin your review session.");
                    }}
                    className="btn btn-primary"
                    style={{ padding: "6px 12px", fontSize: "0.8rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", alignSelf: "flex-start", marginTop: "0.25rem" }}
                  >
                    <span>⚡ {isRtl ? "توليد تدريب تفاعلي للموضوع الأضعف" : "Launch Weakness Review Practice"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scores Trend Panel */}
          <div className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800, color: "var(--foreground)" }}>
              📈 {isRtl ? "منحنى التحصيل والأداء" : "Academic Performance Trend"}
            </h3>
            {scoresTrend.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#8fa0ac", margin: 0 }}>
                {isRtl ? "لا توجد نتائج اختبارات دراسية لعرض منحنى الأداء." : "No assessment results available to chart your scores."}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "120px", padding: "10px 0", borderBottom: "2px solid var(--card-border)" }}>
                  {scoresTrend.map((run, idx) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: "0.5rem" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 800, color: run.score >= 80 ? "#2e7d32" : run.score >= 50 ? "#ef6c00" : "#c62828" }}>
                        {run.score}%
                      </div>
                      <div 
                        style={{ 
                          width: "16px", 
                          height: `${run.score}px`, 
                          maxHeight: "80px",
                          background: run.score >= 80 ? "linear-gradient(to top, #2e7d32, #81c784)" : run.score >= 50 ? "linear-gradient(to top, #ef6c00, #ffb74d)" : "linear-gradient(to top, #c62828, #e57373)", 
                          borderRadius: "4px 4px 0 0",
                          transition: "height 0.4s ease-out"
                        }} 
                      />
                      <span style={{ fontSize: "0.65rem", color: "#8fa0ac", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%", textAlign: "center" }}>
                        {run.date}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6a7c88", display: "flex", justifyContent: "space-between" }}>
                  <span>📉 {isRtl ? "الاختبارات الـ ٦ الأخيرة" : "Last 6 quizzes"}</span>
                  <span style={{ fontWeight: 700 }}>
                    {isRtl ? "متوسط الدقة العام:" : "Average Accuracy:"} {Math.round(scoresTrend.reduce((acc, curr) => acc + curr.score, 0) / scoresTrend.length)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Private Reading History & Token Spend metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Token Ledger Usage */}
          <div className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800, color: "var(--foreground)" }}>
              💎 {isRtl ? "عداد التوكينات والترشيد الذكي" : "Credit Meter & Token Allocations"}
            </h3>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700 }}>
              <span style={{ color: "#6a7c88" }}>{isRtl ? "معدل استهلاك التوكن الأسبوعي" : "Weekly Token Resource Meter"}</span>
              <span style={{ color: "var(--primary)" }}>{consumedClt} / {totalAllocatedClt} CLT</span>
            </div>
            <div style={{ height: "14px", width: "100%", background: "rgba(0,0,0,0.05)", borderRadius: "7px", overflow: "hidden", border: "1px solid var(--card-border)" }}>
              <div 
                style={{ 
                  height: "100%", 
                  width: `${Math.min(tokenProgressPercent, 100)}%`, 
                  background: "linear-gradient(90deg, #106ba3, #0288d1)", 
                  borderRadius: "7px",
                  transition: "width 0.4s ease"
                }} 
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#8fa0ac" }}>
              <span>{isRtl ? `المستهلك: ${consumedClt} توكن` : `Consumed: ${consumedClt} CLT`}</span>
              <span style={{ fontWeight: 700, color: remainingClt < 15 ? "#c62828" : "#2e7d32" }}>
                {isRtl ? `المتبقي الآمن: ${remainingClt} توكن` : `Safe Remaining: ${remainingClt} CLT`}
              </span>
            </div>
          </div>

          {/* Private Reading History */}
          <div className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800, color: "var(--foreground)" }}>
              📖 {isRtl ? "مذكراتي وسجل القراءة الخاص" : "My Private Reading Logs & Telemetry"}
            </h3>
            
            {loading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <FiRefreshCw className="spinning-icon" style={{ fontSize: "1.5rem", color: "var(--primary)" }} />
              </div>
            ) : readingSessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#6a7c88" }}>
                <span style={{ fontSize: "2rem" }}>📖</span>
                <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                  {isRtl 
                    ? "لم يتم رصد قراءات حالياً. تصفح الكتب المتاحة في المكتبة لتبدأ التعلم!" 
                    : "No reading history logs yet. Open school textbooks from Knowledge Library to begin!"}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {readingSessions.map((session, idx) => {
                  const minutes = Math.floor((session.duration_seconds || 0) / 60);
                  const actions = session.action_counts || { audio: 0, translate: 0, explain: 0, question: 0 };
                  const formattedDate = new Date(session.last_active_at || Date.now()).toLocaleDateString(
                    language === "ar" ? "ar-EG" : "en-US",
                    { month: "short", day: "numeric" }
                  );
                  return (
                    <div 
                      key={session._id || idx} 
                      style={{ 
                        padding: "1rem", 
                        borderRadius: "10px", 
                        border: "1px solid var(--card-border)", 
                        background: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.01)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <h4 style={{ fontSize: "0.85rem", fontWeight: 800, margin: 0 }}>
                            {getBookTitle(session.book_id)}
                          </h4>
                          <span style={{ fontSize: "0.7rem", color: "#8fa0ac" }}>
                            {isRtl ? `آخر قراءة: ${formattedDate}` : `Last Active: ${formattedDate}`}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", background: "rgba(16, 107, 163, 0.05)", padding: "2px 8px", borderRadius: "10px" }}>
                          {isRtl ? `صفحة ${session.last_page}` : `Pg ${session.last_page}`}
                        </span>
                      </div>

                      {/* Visited / Max Page Progress Bar */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#6a7c88" }}>
                          <span>{isRtl ? "مؤشر التقدّم" : "Textbook Progress"}</span>
                          <span>{isRtl ? `أقصى صفحة وصلتها: ${session.max_page || session.last_page}` : `Max Pg Reached: ${session.max_page || session.last_page}`}</span>
                        </div>
                      </div>

                      {/* Actions & Token Usage Grid */}
                      <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "1fr 1fr", 
                        gap: "0.5rem", 
                        background: "rgba(0,0,0,0.02)", 
                        padding: "0.75rem", 
                        borderRadius: "8px",
                        fontSize: "0.75rem"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6a7c88" }}>
                          <FiClock />
                          <span>{isRtl ? `${minutes} دقيقة قراءة` : `${minutes} mins reading`}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6a7c88" }}>
                          🏆
                          <span>{isRtl ? `${session.tokens_spent || 0} توكن مستهلك` : `${session.tokens_spent || 0} CLT spent`}</span>
                        </div>
                      </div>

                      {/* Detail interactive metrics */}
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <span title="Audio TTS plays" style={{ fontSize: "0.7rem", color: "#6a7c88", display: "flex", alignItems: "center", gap: "2px" }}>
                          🔊 {actions.audio || 0}
                        </span>
                        <span title="Translations" style={{ fontSize: "0.7rem", color: "#6a7c88", display: "flex", alignItems: "center", gap: "2px" }}>
                          🌐 {actions.translate || 0}
                        </span>
                        <span title="AI explanations" style={{ fontSize: "0.7rem", color: "#6a7c88", display: "flex", alignItems: "center", gap: "2px" }}>
                          💡 {actions.explain || 0}
                        </span>
                        <span title="Questions answered" style={{ fontSize: "0.7rem", color: "#6a7c88", display: "flex", alignItems: "center", gap: "2px" }}>
                          ❓ {actions.question || 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Badges and Gamified Achievements Panel */}
      <div className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800, color: "var(--foreground)", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.5rem" }}>
          🏅 {isRtl ? "ميداليات الإنجاز وصندوق الأوسمة" : "Scholastic Badges & Achievements Cabinet"}
        </h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
          {badges.map((badge, idx) => (
            <div 
              key={idx}
              style={{
                padding: "1rem 0.75rem",
                borderRadius: "12px",
                border: badge.active ? "1px solid rgba(16, 107, 163, 0.25)" : "1px solid var(--card-border)",
                background: badge.active ? "linear-gradient(135deg, rgba(16, 107, 163, 0.02), rgba(235, 220, 185, 0.05))" : "#fafbfc",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                textAlign: "center",
                opacity: badge.active ? 1 : 0.45,
                transition: "all 0.2s"
              }}
            >
              <span style={{ fontSize: "2rem", filter: badge.active ? "none" : "grayscale(100%)" }}>{badge.icon}</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: badge.active ? "var(--foreground)" : "#8fa0ac" }}>
                {isRtl ? badge.labelAr : badge.labelEn}
              </span>
              <span style={{ fontSize: "0.65rem", color: badge.active ? "#2e7d32" : "#8fa0ac", fontWeight: 700 }}>
                {badge.active ? (isRtl ? "🏆 تم الاكتساب!" : "🏆 Unlocked!") : (isRtl ? "🔒 مغلق حالياً" : "🔒 Locked")}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
