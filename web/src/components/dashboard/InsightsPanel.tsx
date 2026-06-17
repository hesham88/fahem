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
  const [tokenStats, setTokenStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const fetchFn = propAuthedFetch || authedFetch;
        const res = await fetchFn("/api/user/token-stats");
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            setTokenStats(data);
          }
        }
      } catch (err) {
        console.error("Error fetching token stats in InsightsPanel:", err);
      } finally {
        setIsLoadingStats(false);
      }
    }
    fetchStats();
  }, [propAuthedFetch]);

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

        // 2. FC9.14: weak topics / performance trend / misconception matrix come from the
        // dedicated, email-keyed practice_history store (persistent, never crowded/reset).
        const activityRes = await fetchFn("/api/practice-history?limit=300");
        if (activityRes && activityRes.ok) {
          const activityData = await activityRes.json();
          if (activityData && activityData.records) {
            // Normalize to the {action,status,details,timestamp} shape the analytics expect.
            const fetchedActivities = (activityData.records || []).map((r: any) => ({
              ...r,
              action: r.action || "practice_session",
              timestamp: r.timestamp || r.createdAt,
            }));
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
            const topic = details.subtopic || details.topic || details.subject || details.chapter || "General Practice";
            const isCorrect = run.status === "correct" || run.status === "success" || !!details.isCorrect || !!details.correct || (typeof details.score === "number" && details.score >= 70);
            
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

          // Extract scores over time — FC9.15: label each bar by SESSION (#n) + the real concept
          // + date/time, so the trend isn't an indistinguishable row of same-day bars.
          const trend = practiceRuns.slice(0, 6).reverse().map((run: any, i: number) => {
            const details = run.details || {};
            const ts = run.timestamp || run.createdAt || Date.now();
            return {
              session: i + 1,
              date: new Date(ts).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }),
              time: new Date(ts).toLocaleTimeString(language === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }),
              score: typeof details.score === "number" ? details.score : (details.isCorrect || details.correct ? 100 : 0),
              concept: details.concept || details.subtopic || details.subject || details.bookTitle || (language === "ar" ? "تدريب" : "Practice")
            };
          });
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
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  • {isRtl ? `المستوى الأكاديمي ${activeLevel}` : `Academic Level ${activeLevel}`}
                </span>
              </div>
            </div>
          </div>

          {/* Core Gamification Stats */}
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <div style={{ textAlign: "center", background: "var(--card-bg)", padding: "0.5rem 1.25rem", borderRadius: "12px", border: "1px solid var(--card-border)", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: "1.3rem", color: "#e65100", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", fontWeight: 800 }}>
                <FiZap style={{ fill: "#ff9100", stroke: "#e65100" }} /> {activeStreak}
              </div>
              <span style={{ fontSize: "0.75rem", color: "#8fa0ac", fontWeight: 700 }}>
                {isRtl ? "سلسلة الأيام" : "Day Streak"}
              </span>
            </div>

            <div style={{ textAlign: "center", background: "var(--card-bg)", padding: "0.5rem 1.25rem", borderRadius: "12px", border: "1px solid var(--card-border)", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)" }}>
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
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
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
                      background: "var(--card-bg)",
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
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
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
                    <div
                      key={idx}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: "0.4rem" }}
                      title={`${isRtl ? "الجلسة" : "Session"} #${run.session} • ${run.concept} • ${run.date} ${run.time || ""} • ${run.score}%`}
                    >
                      <div style={{ fontSize: "0.7rem", fontWeight: 800, color: run.score >= 80 ? "#2e7d32" : run.score >= 50 ? "#ef6c00" : "#c62828" }}>
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
                      {/* FC9.15: identify the session — number + concept + date, not just the day */}
                      <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "var(--primary)" }}>
                        #{run.session}
                      </span>
                      <span style={{ fontSize: "0.58rem", color: "#8fa0ac", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "60px", textAlign: "center" }} title={run.concept}>
                        {run.concept}
                      </span>
                      <span style={{ fontSize: "0.55rem", color: "#b0bcc5", whiteSpace: "nowrap" }}>
                        {run.date}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
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
              <span style={{ color: "var(--text-muted)" }}>{isRtl ? "معدل استهلاك التوكن الأسبوعي" : "Weekly Token Resource Meter"}</span>
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
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
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
                        background: "var(--card-bg)",
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
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)" }}>
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
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
                          <FiClock />
                          <span>{isRtl ? `${minutes} دقيقة قراءة` : `${minutes} mins reading`}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
                          🏆
                          <span>{isRtl ? `${session.tokens_spent || 0} توكن مستهلك` : `${session.tokens_spent || 0} CLT spent`}</span>
                        </div>
                      </div>

                      {/* Detail interactive metrics */}
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <span title="Audio TTS plays" style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "2px" }}>
                          🔊 {actions.audio || 0}
                        </span>
                        <span title="Translations" style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "2px" }}>
                          🌐 {actions.translate || 0}
                        </span>
                        <span title="AI explanations" style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "2px" }}>
                          💡 {actions.explain || 0}
                        </span>
                        <span title="Questions answered" style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "2px" }}>
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

      {/* Gamification & Swarm Telemetry Section */}
      <section
        className="panel-card"
        style={{
          padding: "2rem",
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(16, 107, 163, 0.1)",
          borderRadius: "20px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.03)",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.4rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            borderBottom: "1px dashed rgba(16, 107, 163, 0.15)",
            paddingBottom: "1rem",
            marginBottom: "0.5rem",
            fontWeight: 800,
            color: "var(--primary)",
          }}
        >
          <FiActivity style={{ animation: "pulse 2s infinite" }} />
          <span>{language === "ar" ? "تحليلات السرب والألعاب الأكاديمية" : "Swarm Analytics & Academic Gamification"}</span>
        </h2>

        <p style={{ fontSize: "0.9rem", color: "#5a6a75", lineHeight: "1.5", margin: 0 }}>
          {language === "ar"
            ? "يستخدم وكيل التحليلات (Insights Agent) تجميعات قواعد بيانات MongoDB Atlas لتتبع الجوانب التعليمية الأربعة ومستويات الفهم لديك. يتم رصد نشاط السرب والتعلم الذاتي تلقائياً هنا."
            : "Our specialized Insights Agent utilizes database-side MongoDB Atlas Aggregation Pipelines to monitor your cognitive achievements, active streaks, and misconception risk matrices in real-time."}
        </p>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="grid-cols-1">
          
          {/* Level & Streak Card */}
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(16, 107, 163, 0.05), rgba(212, 175, 55, 0.05))",
              border: "1px solid rgba(16, 107, 163, 0.08)",
              textAlign: "start",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--primary)" }}>
                🏆 {language === "ar" ? "المستوى الدراسي الحالي" : "Active Academic Level"}
              </span>
              <span
                style={{
                  background: "rgba(212, 175, 55, 0.15)",
                  color: "var(--accent)",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  padding: "4px 8px",
                  borderRadius: "8px",
                }}
              >
                {getLevelBadgeText()}
              </span>
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.25rem" }}>
              {language === "ar" ? `المستوى ${activeLevel}` : `Level ${activeLevel}`}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
              🔥 {language === "ar" ? `سلسلة المذاكرة: ${activeStreak} أيام متتالية` : `Current Daily Streak: ${activeStreak} Days Active`}
            </div>

            {/* Progress Bar */}
            <div style={{ width: "100%", height: "8px", background: "rgba(16, 107, 163, 0.08)", borderRadius: "10px", overflow: "hidden", marginBottom: "0.5rem" }}>
              <div style={{ width: `${xpProgressPercent}%`, height: "100%", background: "linear-gradient(90deg, var(--primary), var(--secondary))", borderRadius: "10px" }}></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
              <span>{activeXp.toLocaleString()} XP</span>
              <span>
                {nextLevelXp.toLocaleString()} XP ({language === "ar" ? "المستوى التالي" : "Next Level"})
              </span>
            </div>
          </div>

          {/* Cognitive Tokens Card - Dynamic Private Student Quota Meter */}
          <div
            style={{
              padding: "1.5rem",
              borderRadius: "20px",
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.03), rgba(16, 107, 163, 0.04))",
              border: "1px solid rgba(16, 107, 163, 0.12)",
              textAlign: "start",
              boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.04)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background glowing indicator */}
            <div 
              style={{
                position: "absolute",
                top: "-10%",
                right: "-10%",
                width: "150px",
                height: "150px",
                background: "radial-gradient(circle, rgba(13, 148, 136, 0.08) 0%, rgba(13, 148, 136, 0) 70%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <span style={{ fontWeight: 850, fontSize: "0.95rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                🧠 {language === "ar" ? "مؤشرات استهلاك الرموز المعرفية (CLT)" : "Cognitive Token Quotas (CLT)"}
              </span>
              
              {isLoadingStats ? (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  {language === "ar" ? "جاري التحميل..." : "Loading stats..."}
                </span>
              ) : tokenStats?.enabled === false ? (
                <span
                  style={{
                    background: "rgba(212, 175, 55, 0.15)",
                    border: "1px solid rgba(212, 175, 55, 0.3)",
                    color: "#b45309",
                    fontSize: "0.7rem",
                    fontWeight: 900,
                    padding: "4px 10px",
                    borderRadius: "20px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    boxShadow: "0 2px 10px rgba(212, 175, 55, 0.1)",
                    animation: "pulse 2s infinite",
                  }}
                >
                  👑 {language === "ar" ? "غير محدود (حساب محكم/VIP)" : "Override Active (Unlimited)"}
                </span>
              ) : (
                <span
                  style={{
                    background: "rgba(13, 148, 136, 0.12)",
                    border: "1px solid rgba(13, 148, 136, 0.2)",
                    color: "var(--accent-green)",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: "20px",
                  }}
                >
                  ⚡ {language === "ar" ? "نظام الحماية المعرفية نشط" : "Cognitive Safety Shield Active"}
                </span>
              )}
            </div>

            {isLoadingStats ? (
              /* Pulse skeleton loader for limits card */
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.4rem", animation: "pulse 1.5s infinite" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ width: "80px", height: "12px", background: "rgba(0,0,0,0.06)", borderRadius: "4px" }}></div>
                      <div style={{ width: "40px", height: "12px", background: "rgba(0,0,0,0.06)", borderRadius: "4px" }}></div>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "rgba(0,0,0,0.04)", borderRadius: "10px" }}></div>
                  </div>
                ))}
              </div>
            ) : (
              /* Full Localized Premium Bar Graphs */
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                
                {/* 1. Daily usage metric */}
                {(() => {
                  const dailyUsed = tokenStats?.used?.daily ?? 0;
                  const dailyLimit = Math.round((tokenStats?.limit?.weekly ?? 250000) / 7);
                  const dailyPct = Math.min(100, Math.round((dailyUsed / Math.max(1, dailyLimit)) * 100));
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                        <span style={{ color: "var(--foreground)" }}>
                          🌅 {language === "ar" ? "البصمة المعرفية اليومية" : "Daily Cognitive Footprint"}
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {dailyUsed.toLocaleString()} <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>/ {dailyLimit.toLocaleString()} CLT</span>
                        </span>
                      </div>
                      
                      {/* Bar */}
                      <div style={{ width: "100%", height: "8px", background: "rgba(13, 148, 136, 0.08)", borderRadius: "10px", overflow: "hidden", position: "relative" }}>
                        <div 
                          style={{ 
                            width: `${dailyPct}%`, 
                            height: "100%", 
                            background: "linear-gradient(90deg, #10b981, #0d9488)", 
                            borderRadius: "10px",
                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                          }} 
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#82939e", fontWeight: 600 }}>
                        <span>{language === "ar" ? `مستهلك: ${dailyPct}%` : `Daily Consumption: ${dailyPct}%`}</span>
                        <span>{language === "ar" ? "إعادة التعيين عند منتصف الليل" : "Resets at midnight"}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Weekly quota metric */}
                {(() => {
                  const weeklyUsed = tokenStats?.used?.weekly ?? 0;
                  const weeklyLimit = tokenStats?.limit?.weekly ?? 250000;
                  const weeklyPct = Math.min(100, Math.round((weeklyUsed / Math.max(1, weeklyLimit)) * 100));
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                        <span style={{ color: "var(--foreground)" }}>
                          📅 {language === "ar" ? "الحصة المعرفية الأسبوعية" : "Weekly Cognitive Quota"}
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {weeklyUsed.toLocaleString()} <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>/ {weeklyLimit.toLocaleString()} CLT</span>
                        </span>
                      </div>
                      
                      {/* Bar */}
                      <div style={{ width: "100%", height: "8px", background: "rgba(13, 148, 136, 0.08)", borderRadius: "10px", overflow: "hidden" }}>
                        <div 
                          style={{ 
                            width: `${weeklyPct}%`, 
                            height: "100%", 
                            background: "linear-gradient(90deg, #0d9488, #106ba3)", 
                            borderRadius: "10px",
                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                          }} 
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#82939e", fontWeight: 600 }}>
                        <span>{language === "ar" ? `نسبة الاستهلاك: ${weeklyPct}%` : `Weekly Quota Spent: ${weeklyPct}%`}</span>
                        <span>
                          {language === "ar" ? `${(weeklyLimit - weeklyUsed).toLocaleString()} رمز متبقي` : `${(weeklyLimit - weeklyUsed).toLocaleString()} CLT remaining`}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Monthly quota metric */}
                {(() => {
                  const monthlyUsed = tokenStats?.used?.monthly ?? 0;
                  const monthlyLimit = tokenStats?.limit?.monthly ?? 1000000;
                  const monthlyPct = Math.min(100, Math.round((monthlyUsed / Math.max(1, monthlyLimit)) * 100));
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                        <span style={{ color: "var(--foreground)" }}>
                          🌌 {language === "ar" ? "الحجم المعرفي الشهري الكلي" : "Monthly Cognitive Volume"}
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {monthlyUsed.toLocaleString()} <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>/ {monthlyLimit.toLocaleString()} CLT</span>
                        </span>
                      </div>
                      
                      {/* Bar */}
                      <div style={{ width: "100%", height: "8px", background: "rgba(13, 148, 136, 0.08)", borderRadius: "10px", overflow: "hidden" }}>
                        <div 
                          style={{ 
                            width: `${monthlyPct}%`, 
                            height: "100%", 
                            background: "linear-gradient(90deg, #106ba3, #4f46e5)", 
                            borderRadius: "10px",
                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                          }} 
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#82939e", fontWeight: 600 }}>
                        <span>{language === "ar" ? `مستهلك موازنة الشهر: ${monthlyPct}%` : `Monthly Volume Spent: ${monthlyPct}%`}</span>
                        <span>
                          {language === "ar" ? `${(monthlyLimit - monthlyUsed).toLocaleString()} رمز متبقي` : `${(monthlyLimit - monthlyUsed).toLocaleString()} CLT remaining`}
                        </span>
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}
          </div>
        </div>

        {/* Misconception Risk Matrix */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "start" }}>
          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--foreground)" }}>
            🎯 {language === "ar" ? "مصفوفة فجوات الفهم المعرفي وحالة المواضيع" : "Concept Misconception Risk Matrix (MongoDB Analytics)"}
          </span>

          {weakTopics.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
              {language === "ar"
                ? "لا توجد بيانات كافية لاستخراج مصفوفة المفاهيم بعد. أكمل بعض التدريبات أو جلسات الزتونة."
                : "Not enough activity yet to build your concept matrix. Complete a few practice or zatona sessions."}
            </p>
          ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            {/* FC9.15: real per-concept risk derived from the user's own activity aggregation
                (same source as Weak Topics), not hardcoded subjects. */}
            {weakTopics.slice(0, 6).map((c: any, i: number) => {
              const acc = typeof c.accuracy === "number" ? c.accuracy : 0;
              const sessions = Math.max(1, Math.round((c.totalQuestions || 5) / 5));
              const risk = acc >= 80 ? "low" : acc >= 60 ? "moderate" : "high";
              const riskBg = risk === "low" ? "rgba(34, 197, 94, 0.12)" : risk === "moderate" ? "rgba(234, 179, 8, 0.12)" : "rgba(220, 38, 38, 0.12)";
              const riskColor = risk === "low" ? "#16a34a" : risk === "moderate" ? "#ca8a04" : "#dc2626";
              const riskLabel = risk === "low" ? (language === "ar" ? "آمن" : "Low Risk") : risk === "moderate" ? (language === "ar" ? "متوسط" : "Moderate Risk") : (language === "ar" ? "مرتفع" : "High Risk");
              const blurb = risk === "low"
                ? (language === "ar" ? "إتقان جيد لهذا المفهوم." : "Solid mastery of this concept.")
                : risk === "moderate"
                ? (language === "ar" ? "فجوة بسيطة تحتاج مراجعة." : "Minor gap — worth a review pass.")
                : (language === "ar" ? "ثغرة واضحة تحتاج تدريباً مركزاً." : "Clear weakness — needs focused practice.");
              return (
                <div
                  key={i}
                  style={{
                    padding: "1rem",
                    borderRadius: "14px",
                    background: "var(--surface-translucent)",
                    border: "1px solid rgba(16, 107, 163, 0.06)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--primary)" }}>
                      🎯 {c.name}
                      {c.bookId && (
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600, marginInlineStart: "0.35rem" }}>
                          {getBookTitle(c.bookId)}
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: "0.7rem", fontWeight: 800, background: riskBg, color: riskColor, padding: "2px 6px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                      {riskLabel}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {blurb}
                  </span>
                  <div style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                    <span>{language === "ar" ? "دقة الإجابة:" : "Avg Accuracy:"} {acc}%</span>
                    <span>{sessions} {language === "ar" ? "محاولة" : sessions === 1 ? "Session" : "Sessions"}</span>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Swarm Real-Time Telemetry console */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", textAlign: "start" }}>
          <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span className="pulse-icon" style={{ fontSize: "0.6rem" }}>🟢</span>
            {language === "ar" ? "سجل تحليلات ومحاكاة السرب النشط (MongoDB Aggregate Pipe):" : "Active Swarm Network Telemetry Trace (MongoDB Aggregations):"}
          </span>

          <div
            style={{
              padding: "0.85rem 1.1rem",
              borderRadius: "12px",
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(16, 107, 163, 0.2)",
              fontFamily: "monospace",
              fontSize: "0.75rem",
              color: "#38bdf8",
              maxHeight: "135px",
              overflowY: "auto",
              lineHeight: "1.4",
              boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)",
            }}
            className="custom-scrollbar"
          >
            {/* FC9.15: honest trace built from the user's REAL fetched activities — no fabricated metrics. */}
            {(() => {
              const acts = activities || [];
              const practice = acts.filter((a: any) => a.action === "practice_session" || a.action === "practice_attempt").length;
              const zatona = acts.filter((a: any) => String(a.action || "").startsWith("zatona") || a.action === "summary").length;
              const weakest = weakTopics[0];
              const uidShort = (user?.uid || "anon").slice(0, 8);
              const lines: { c: string; t: string }[] = [];
              lines.push({ c: "#a7f3d0", t: `[MONGODB] $match { userId: "${uidShort}…" } → ${acts.length} activity docs` });
              lines.push({ c: "#fef08a", t: `[INSIGHTS_AGENT] aggregated ${practice} practice + ${zatona} zatona sessions` });
              if (weakest) lines.push({ c: "#fca5a5", t: `[RISK] weakest concept "${weakest.name}" @ ${weakest.accuracy}% accuracy` });
              lines.push({ c: "#38bdf8", t: `[TOKENS] ${consumedClt}/${totalAllocatedClt} CLT consumed this window` });
              lines.push({ c: "#94a3b8", t: acts.length === 0 ? "[SYSTEM] no activity yet — telemetry idle" : "[SYSTEM] telemetry synchronized over real user_activities" });
              return lines.map((l, i) => (<div key={i} style={{ color: l.c }}>{l.t}</div>));
            })()}
          </div>
        </div>
      </section>

    </div>
  );
};
