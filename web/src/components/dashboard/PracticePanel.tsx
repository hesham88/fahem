"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { FiCpu, FiClock, FiRefreshCw } from "react-icons/fi";
import { authedFetch } from "../../lib/authedFetch";
import { stopAllAudio, registerActiveAudio } from "../../lib/ttsBus";

const SUBTOPIC_REGISTRY: { [subject: string]: string[] } = {
  Math: ["Matrices", "Determinants", "Cramer's Rule", "Probability", "Statistics", "Linear Algebra"],
  Science: ["Ideal Gas Law", "Boyle's Law", "Charles's Law", "Kinetic Theory", "Thermodynamics", "Internal Energy"],
  Arabic: ["Sentence Parsing", "Arabic Grammar", "Poetry Meters", "Verb States"],
  General: ["Ancient Civilizations", "Modern Era", "General Knowledge"]
};

const determineSubtopic = (questionText: string, subject: string): string => {
  const text = (questionText || "").toLowerCase();
  const sub = (subject || "").toLowerCase();

  if (sub.includes("math")) {
    if (text.includes("matrix") || text.includes("matrices")) return "Matrices";
    if (text.includes("determinant")) return "Determinants";
    if (text.includes("cramer")) return "Cramer's Rule";
    if (text.includes("probabilit")) return "Probability";
    if (text.includes("statistic")) return "Statistics";
    return "Linear Algebra";
  }
  if (sub.includes("science")) {
    if (text.includes("ideal gas") || text.includes("pv = nrt")) return "Ideal Gas Law";
    if (text.includes("boyle")) return "Boyle's Law";
    if (text.includes("charles")) return "Charles's Law";
    if (text.includes("kinetic")) return "Kinetic Theory";
    if (text.includes("thermodynamic")) return "Thermodynamics";
    if (text.includes("internal energy") || text.includes("heat") || text.includes("work")) return "Internal Energy";
    return "Thermodynamics";
  }
  if (sub.includes("arabic") || sub.includes("عربي")) {
    if (text.includes("إعراب") || text.includes("اعراب") || text.includes("parse") || text.includes("parsing")) return "Sentence Parsing";
    if (text.includes("شعر") || text.includes("poetry") || text.includes("بحور")) return "Poetry Meters";
    if (text.includes("فعل") || text.includes("فاعل") || text.includes("verb")) return "Verb States";
    return "Arabic Grammar";
  }
  // Default/General
  if (text.includes("ancient") || text.includes("history") || text.includes("pharaoh") || text.includes("romans")) return "Ancient Civilizations";
  if (text.includes("modern") || text.includes("war") || text.includes("century")) return "Modern Era";
  return "General Knowledge";
};

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

interface PracticePanelProps {
  language: string;
  dynamicBooks: Book[];
  dynamicSubjects?: any[];
  renderSpaceSelectorBar: (tab: "practice" | "plan" | "timetable" | "zatona") => React.ReactNode;
  renderSpaceHistory: () => React.ReactNode;
  addSpaceHistory: (actionEn: string, actionAr: string) => void;
  renderPremiumContent: (markdownText: string) => React.ReactNode;
  t: (key: string) => string;
  user: any;
  userProfile: any;
}

/**
 * PracticePanel component implements the Active Recall Quest Station.
 * Features customizable MCQ, Written, and Oral gamified evaluation spaces with XP level progression.
 */
export const PracticePanel: React.FC<PracticePanelProps> = ({
  language,
  dynamicBooks,
  dynamicSubjects,
  renderSpaceSelectorBar,
  renderSpaceHistory,
  addSpaceHistory,
  renderPremiumContent,
  t,
  user,
  userProfile,
}) => {
  // Practice Specific States (fully encapsulated)
  const [practiceGameState, setPracticeGameState] = useState<"setup" | "active" | "victory">("setup");
  const [practiceScopeType, setPracticeScopeType] = useState<"subject" | "book">("subject");
  const [practiceSelectedBookId, setPracticeSelectedBookId] = useState<string>("");
  const [practiceSelectedChapters, setPracticeSelectedChapters] = useState<string[]>([]);
  const [practiceCustomConcepts, setPracticeCustomConcepts] = useState<string>("");
  const [practiceSubject, setPracticeSubject] = useState<string>("Math");
  // FC9.2: when real Course Subjects are available, default the scope to the first
  // real subject (the hardcoded "Math" default would otherwise not match any option).
  useEffect(() => {
    if (dynamicSubjects && dynamicSubjects.length > 0) {
      const names = dynamicSubjects.map((s: any) => s.name || s.name_en || s.name_ar).filter(Boolean);
      if (!names.includes(practiceSubject)) {
        setPracticeSubject(names[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicSubjects]);
  const [practiceMode, setPracticeMode] = useState<"mcq" | "text" | "oral">("mcq");
  const [practiceSessionType, setPracticeSessionType] = useState<"infinite" | "quiz">("infinite");
  const [practiceQuizQuestionsCount, setPracticeQuizQuestionsCount] = useState<number>(5);
  const [practiceQuizDurationLimit, setPracticeQuizDurationLimit] = useState<number>(120); // 120s default
  const [practiceQuizTimeLeft, setPracticeQuizTimeLeft] = useState<number>(120);

  // Real cumulative gamification — derived from the durable activity log (see the
  // effect below), not hardcoded demo values, so XP/level actually persist and count.
  const [practiceXP, setPracticeXP] = useState<number>(0);
  const [practiceLevel, setPracticeLevel] = useState<number>(1);
  const [practiceStreak, setPracticeStreak] = useState<number>(0);

  // Practice History List & Fetching States
  const [practiceHistoryList, setPracticeHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Heatmap filtering and activities states
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [heatmapSubjectFilter, setHeatmapSubjectFilter] = useState<string>("All");

  useEffect(() => {
    const toggleLock = async () => {
      const isActive = practiceGameState === "active";
      try {
        await authedFetch("/api/practice/lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: isActive })
        });
      } catch (err) {
        console.error("Failed to toggle practice lock:", err);
      }
    };
    toggleLock();

    // Clean up when unmounting
    return () => {
      const disableLockOnUnmount = async () => {
        try {
          await authedFetch("/api/practice/lock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: false })
          });
        } catch (err) {
          console.error("Failed to disable practice lock on unmount:", err);
        }
      };
      disableLockOnUnmount();
    };
  }, [practiceGameState]);

  const fetchPracticeHistory = async () => {
    if (!user?.uid) return;
    setHistoryLoading(true);
    try {
      // FC9.14: read from the dedicated, email-keyed persistent stores (practice_history +
      // zatona_history) instead of the shared, uid-keyed, agent-query-crowded user_activities.
      // History now follows the user across sign-in identities and is never reset/crowded.
      const [pRes, zRes] = await Promise.all([
        authedFetch("/api/practice-history?limit=300"),
        authedFetch("/api/zatona-history?limit=200"),
      ]);
      const pRecords = pRes.ok ? ((await pRes.json()).records || []).map((r: any) => ({ ...r, action: r.action || "practice_session" })) : [];
      const zRecords = zRes.ok ? ((await zRes.json()).records || []).map((r: any) => ({ ...r, action: r.action || "zatona_session" })) : [];
      // allActivities feeds the heatmap (practice + zatona); practiceHistoryList is the practice log.
      setAllActivities([...pRecords, ...zRecords]);
      setPracticeHistoryList(pRecords);
    } catch (err) {
      console.error("Failed to fetch practice history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchPracticeHistory();
  }, [user]);

  // Derive real cumulative XP & level from the activity log so gamification counts
  // properly across sessions instead of resetting to a hardcoded value.
  useEffect(() => {
    if (!allActivities || allActivities.length === 0) return;
    const totalXp = allActivities.reduce((sum: number, act: any) => {
      if (act.action === "practice_session") {
        return sum + (Number(act.details?.xpGained) || 0);
      }
      return sum;
    }, 0);
    setPracticeLevel(Math.floor(totalXp / 100) + 1);
    setPracticeXP(totalXp % 100);
  }, [allActivities]);

  // Aggregate user practice achievements dynamically into the mastery heatmap list
  const subtopicMastery = useMemo(() => {
    const registry: { [subtopic: string]: { correct: number; total: number; subject: string } } = {};

    // FC9.13: seed the heatmap from the REAL system structure — every Course Subject →
    // its books → chapters → topics — instead of a hardcoded Math/Science/Arabic/General
    // registry of fake topics. Each topic (or a chapter with no topics) becomes a node,
    // grouped under its real subject name.
    const subjectNameById: { [id: string]: string } = {};
    (dynamicSubjects || []).forEach((s: any) => {
      subjectNameById[s._id] = s.name || s.name_en || s.name_ar || "";
    });

    let seededFromReal = false;
    (dynamicBooks || []).forEach((book: any) => {
      const subjectName = subjectNameById[book.subject_id] || book.subject || "General";
      const chapters = book.chapters || [];
      chapters.forEach((ch: any, ci: number) => {
        const topics = ch.topics || [];
        if (topics.length === 0) {
          const chTitle = (language === "ar"
            ? (ch.titleAr || ch.title_ar || ch.title)
            : (ch.titleEn || ch.title)) || `Chapter ${ci + 1}`;
          if (!registry[chTitle]) registry[chTitle] = { correct: 0, total: 0, subject: subjectName };
          seededFromReal = true;
        } else {
          topics.forEach((top: any, ti: number) => {
            const tTitle = (language === "ar"
              ? (top.titleAr || top.title_ar || top.title)
              : (top.titleEn || top.title)) || `Topic ${ti + 1}`;
            if (!registry[tTitle]) registry[tTitle] = { correct: 0, total: 0, subject: subjectName };
            seededFromReal = true;
          });
        }
      });
    });

    // Fallback only if no real ingested structure exists yet, so the panel is never empty.
    if (!seededFromReal) {
      Object.entries(SUBTOPIC_REGISTRY).forEach(([subject, subtopics]) => {
        subtopics.forEach((subtopic) => {
          registry[subtopic] = { correct: 0, total: 0, subject };
        });
      });
    }

    // FC9.13: aggregate BOTH practice and zatona activity onto the real subject/chapter/topic
    // nodes. Practice contributes correct/total accuracy; zatona contributes engagement (and a
    // comprehension signal when present) so a topic the user only did zatona on is no longer
    // shown as "Unattempted".
    const PRACTICE = new Set(["practice_session", "practice_attempt"]);
    const ZATONA = new Set(["zatona_session", "zatona", "summary", "summary_session"]);
    allActivities.forEach((act: any) => {
      const isPractice = PRACTICE.has(act.action);
      const isZatona = ZATONA.has(act.action);
      if (!isPractice && !isZatona) return;

      const d = act.details || {};
      const givenSubject = d.subject || "General";
      // FC9.13/9.15: resolve the node by the most specific real anchor available —
      // subtopic/concept → topic → chapter — before falling back to a heuristic from the question.
      let node = d.subtopic || d.concept || d.topic || d.chapter;
      if (!node) node = determineSubtopic(d.question || "", givenSubject);

      // FC9.15: map the activity onto an EXISTING seeded topic cell when the concept matches it
      // (case-insensitive equals or substring either way), so practice/zatona lights up the real
      // book topic instead of spawning a parallel bucket. Only fall back to a new node otherwise.
      if (!registry[node]) {
        const nl = String(node).toLowerCase().trim();
        const match = Object.keys(registry).find((k) => {
          const kl = k.toLowerCase().trim();
          return kl === nl || (nl.length >= 4 && (kl.includes(nl) || nl.includes(kl)));
        });
        if (match) node = match;
      }

      // Practice has an explicit correctness; zatona counts as engagement, and as "correct"
      // only when it carries a positive comprehension/score signal.
      const isCorrect = isPractice
        ? !!(d.isCorrect || act.status === "correct")
        : (d.isCorrect === true || act.status === "correct" || (typeof d.score === "number" && d.score >= 70));

      if (!registry[node]) {
        registry[node] = { correct: 0, total: 0, subject: givenSubject };
      }
      registry[node].total += 1;
      if (isCorrect) registry[node].correct += 1;
    });

    // Convert registry back into an array for easy rendering
    return Object.entries(registry).map(([subtopic, data]) => {
      const ratio = data.total > 0 ? data.correct / data.total : null;
      let status: "green" | "yellow" | "red" | "neutral" = "neutral";
      if (data.total > 0) {
        if (ratio !== null) {
          if (ratio >= 0.70) status = "green";
          else if (ratio >= 0.40) status = "yellow";
          else status = "red";
        }
      }
      return {
        subtopic,
        subject: data.subject,
        correct: data.correct,
        total: data.total,
        ratio,
        status
      };
    });
  }, [allActivities, dynamicBooks, dynamicSubjects, language]);

  const filteredHeatmapData = useMemo(() => {
    if (heatmapSubjectFilter === "All") {
      return subtopicMastery;
    }
    return subtopicMastery.filter(item => item.subject.toLowerCase() === heatmapSubjectFilter.toLowerCase());
  }, [subtopicMastery, heatmapSubjectFilter]);

  // FC9.13: the filter chips are the REAL subjects present in the heatmap, not a hardcoded
  // Math/Science/Arabic/General list.
  const heatmapSubjects = useMemo(() => {
    const names: string[] = [];
    subtopicMastery.forEach((i) => {
      if (i.subject && !names.includes(i.subject)) names.push(i.subject);
    });
    return ["All", ...names];
  }, [subtopicMastery]);

  const [practiceLoading, setPracticeLoading] = useState<boolean>(false);
  const [practiceCurrentQuestion, setPracticeCurrentQuestion] = useState<any>(null);
  const [practiceAnswer, setPracticeAnswer] = useState<string>("");
  const [practiceSelectedOptionStr, setPracticeSelectedOptionStr] = useState<string>("");
  const [practiceHasAnswered, setPracticeHasAnswered] = useState<boolean>(false);
  const [practiceFeedback, setPracticeFeedback] = useState<any>(null);
  const [practiceShowHint, setPracticeShowHint] = useState<boolean>(false);

  // Web Speech API / Oral specific states
  const [isListening, setIsListening] = useState<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const [interimSpeechText, setInterimSpeechText] = useState<string>("");

  const [micError, setMicError] = useState<string>("");
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);

  // Multimodal TTS states & helpers
  const [speakingType, setSpeakingElement] = useState<string | null>(null);
  const speakingTypeRef = useRef<string | null>(null);

  const [autoPlayVoice, setAutoPlayVoice] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fahem_auto_play_voice") !== "false";
    }
    return true;
  });

  const handleAutoPlayVoiceChange = (val: boolean) => {
    setAutoPlayVoice(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("fahem_auto_play_voice", String(val));
    }
  };

  const practiceModeRef = useRef<string>("mcq");
  useEffect(() => {
    practiceModeRef.current = practiceMode;
  }, [practiceMode]);

  const autoPlayVoiceRef = useRef<boolean>(true);
  useEffect(() => {
    autoPlayVoiceRef.current = autoPlayVoice;
  }, [autoPlayVoice]);

  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fahem_tts_voice") || "Aoede";
    }
    return "Aoede";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("fahem_tts_voice");
      if (stored && stored !== selectedVoice) {
        setSelectedVoice(stored);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [selectedVoice]);

  const startQuest = useCallback(async (overrideParams?: {
    scopeType?: "subject" | "book";
    bookId?: string;
    chapters?: string[];
    customConcepts?: string;
    subject?: string;
    mode?: "mcq" | "text" | "oral";
    format?: "infinite" | "quiz";
    questionCount?: number;
    durationSeconds?: number;
  }) => {
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

    const finalScopeType = overrideParams?.scopeType ?? practiceScopeType;
    const finalBookId = overrideParams?.bookId ?? practiceSelectedBookId;
    const finalChapters = overrideParams?.chapters ?? practiceSelectedChapters;
    const finalCustomConcepts = overrideParams?.customConcepts ?? practiceCustomConcepts;
    const finalSubject = overrideParams?.subject ?? practiceSubject;
    const finalMode = overrideParams?.mode ?? practiceMode;
    const finalFormat = overrideParams?.format ?? practiceSessionType;

    // FC7.12b: apply companion-provided question count + per-quiz timer (0 = No Limit). Use the
    // override directly for the initial countdown to avoid setState latency on auto-launch.
    if (overrideParams?.questionCount !== undefined && overrideParams.questionCount !== null && !isNaN(Number(overrideParams.questionCount))) {
      setPracticeQuizQuestionsCount(Math.max(1, Number(overrideParams.questionCount)));
    }
    const finalDuration = (overrideParams?.durationSeconds !== undefined && overrideParams.durationSeconds !== null && !isNaN(Number(overrideParams.durationSeconds)))
      ? Number(overrideParams.durationSeconds)
      : practiceQuizDurationLimit;
    if (overrideParams?.durationSeconds !== undefined && overrideParams.durationSeconds !== null && !isNaN(Number(overrideParams.durationSeconds))) {
      setPracticeQuizDurationLimit(finalDuration);
    }

    setPracticeQuizTimeLeft(finalDuration);

    try {
      const targetSubject =
        finalScopeType === "book"
          ? dynamicBooks?.find((b: any) => (b._id || b.id) === finalBookId)?.subject || "General"
          : finalSubject;

      addSpaceHistory(
        `Launched ${finalMode.toUpperCase()} Active Recall Quest for subject: ${targetSubject}`,
        `تم إطلاق غارة المراجعة النشطة (${finalMode.toUpperCase()}) لمادة: ${targetSubject}`
      );

      const res = await authedFetch("/api/practice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: targetSubject,
          bookId: finalScopeType === "book" ? finalBookId : "",
          selectedChapters: finalChapters,
          customConcepts: finalCustomConcepts,
          mode: finalMode,
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
  }, [
    practiceScopeType,
    practiceSelectedBookId,
    practiceSelectedChapters,
    practiceCustomConcepts,
    practiceSubject,
    practiceMode,
    practiceSessionType,
    practiceQuizDurationLimit,
    dynamicBooks,
    language,
    addSpaceHistory
  ]);

  // Listen for custom launch practice event from companion agent
  useEffect(() => {
    const handleLaunchPractice = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.data) {
        const questionData = customEvent.detail.data;
        
        // Reset feedback and states
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

        // Set subject and mode if provided, else keep defaults
        if (questionData.subject) {
          setPracticeSubject(questionData.subject);
        }
        if (questionData.mode) {
          setPracticeMode(questionData.mode);
        }

        // Set the newly generated question and activate game state!
        setPracticeCurrentQuestion(questionData);
        setPracticeGameState("active");
        
        addSpaceHistory(
          `Launched agent-generated ${(questionData.mode || "MCQ").toUpperCase()} practice session`,
          `تم إطلاق ممارسة مولدة تلقائياً (${(questionData.mode || "MCQ").toUpperCase()}) بواسطة العميل الذكي`
        );
      }
    };

    window.addEventListener("fahemLaunchPractice", handleLaunchPractice);
    return () => window.removeEventListener("fahemLaunchPractice", handleLaunchPractice);
  }, [practiceQuizDurationLimit, addSpaceHistory]);

  // Listen for custom fill and launch practice event
  useEffect(() => {
    const handleFillAndLaunch = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const {
          scopeType,
          bookId,
          chapters,
          customConcepts,
          subject,
          mode,
          format,
          questionCount,
          durationSeconds
        } = customEvent.detail;

        if (scopeType) setPracticeScopeType(scopeType);
        if (bookId) setPracticeSelectedBookId(bookId);
        if (chapters) setPracticeSelectedChapters(chapters);
        if (customConcepts !== undefined) setPracticeCustomConcepts(customConcepts);
        if (subject) setPracticeSubject(subject);
        if (mode) setPracticeMode(mode);
        if (format) setPracticeSessionType(format);

        // Auto-fire the quest with the incoming params to avoid state sync latency
        startQuest({
          scopeType,
          bookId,
          chapters,
          customConcepts,
          subject,
          mode,
          format,
          questionCount,
          durationSeconds
        });
      }
    };

    window.addEventListener("fahemFillAndLaunchPractice", handleFillAndLaunch);
    return () => window.removeEventListener("fahemFillAndLaunchPractice", handleFillAndLaunch);
  }, [startQuest]);

  const speakPracticeText = async (text: string, type: string) => {
    if (speakingType === type) {
      if ((window as any)._activeAudioPractice) {
        (window as any)._activeAudioPractice.pause();
        (window as any)._activeAudioPractice = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeakingElement(null);
      speakingTypeRef.current = null;
      return;
    }

    // FC9.8: stop any other playback (page read / companion / other question)
    // before starting this one — guarantees no two voices overlap.
    stopAllAudio();

    const cleanText = text
      .replace(/\*\*|__/g, "")
      .replace(/\*|_/g, "")
      .replace(/`.*?`/g, "")
      .trim();

    if (!cleanText) return;

    setSpeakingElement(type);
    speakingTypeRef.current = type;

    const runWebSpeechFallback = (txt: string) => {
      if (speakingTypeRef.current !== type) {
        return; // Stopped or switched type
      }

      const utterance = new SpeechSynthesisUtterance(txt);
      (window as any)._activeUtterance = utterance;
      const hasArabicChars = /[\u0600-\u06FF]/.test(txt);
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
        if (speakingTypeRef.current === type) {
          setSpeakingElement(null);
          speakingTypeRef.current = null;
        }
        if (type === "question" && practiceModeRef.current === "oral" && autoPlayVoiceRef.current) {
          startSpeechRecognition();
        }
      };

      utterance.onerror = (err) => {
        console.error("Practice Speech Synthesis Error:", err);
        if (speakingTypeRef.current === type) {
          setSpeakingElement(null);
          speakingTypeRef.current = null;
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    try {
      const hasArabicChars = /[\u0600-\u06FF]/.test(cleanText);
      const reqLang = hasArabicChars ? "ar" : (language || "en");

      const res = await authedFetch("/api/audio/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText,
          language: reqLang,
          voice: selectedVoice // use user's selected voice dynamically!
        })
      });

      if (speakingTypeRef.current !== type) {
        return; // Stale fetch response
      }

      if (res.ok) {
        const data = await res.json();
        
        if (speakingTypeRef.current !== type) {
          return; // Stale data response
        }

        if (data.success && data.audioContent) {
          const audioUrl = `data:${data.mimeType || "audio/wav"};base64,${data.audioContent}`;
          const audio = new Audio(audioUrl);
          (window as any)._activeAudioPractice = audio;
          registerActiveAudio(audio); // FC9.8

          audio.onended = () => {
            if (speakingTypeRef.current === type) {
              setSpeakingElement(null);
              speakingTypeRef.current = null;
            }
            if ((window as any)._activeAudioPractice === audio) {
              (window as any)._activeAudioPractice = null;
            }
            if (type === "question" && practiceModeRef.current === "oral" && autoPlayVoiceRef.current) {
              startSpeechRecognition();
            }
          };

          audio.onerror = (e) => {
            if (speakingTypeRef.current !== type) {
              return;
            }
            console.error("Premium audio error, falling back to Web Speech:", e);
            runWebSpeechFallback(cleanText);
          };

          await audio.play();
          return;
        }
      }

      if (speakingTypeRef.current === type) {
        console.warn("Premium TTS unsuccessful, falling back to Web Speech");
        runWebSpeechFallback(cleanText);
      }

    } catch (err) {
      if (speakingTypeRef.current === type) {
        console.error("Failed premium TTS in practice:", err);
        runWebSpeechFallback(cleanText);
      }
    }
  };

  useEffect(() => {
    if ((window as any)._activeAudioPractice) {
      (window as any)._activeAudioPractice.pause();
      (window as any)._activeAudioPractice = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingElement(null);
    if (speechRecognition) {
      try {
        speechRecognition.stop();
      } catch (e) {}
    }
    setIsListening(false);
  }, [practiceCurrentQuestion, practiceFeedback, speechRecognition]);

  // Auto-play question TTS in oral mode
  useEffect(() => {
    if (
      practiceGameState === "active" &&
      practiceMode === "oral" &&
      practiceCurrentQuestion &&
      practiceCurrentQuestion.question &&
      !practiceFeedback &&
      autoPlayVoice
    ) {
      const timer = setTimeout(() => {
        speakPracticeText(practiceCurrentQuestion.question, "question");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [practiceCurrentQuestion, practiceGameState, practiceMode, practiceFeedback, autoPlayVoice]);



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
            setInterimSpeechText("");
          } else {
            setInterimSpeechText(interimText);
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
          setInterimSpeechText("");
        };

        rec.onend = () => {
          setIsListening(false);
          setInterimSpeechText("");
        };

        setSpeechRecognition(rec);
      }
    }
  }, [language]);

  const startSpeechRecognition = () => {
    if (!speechRecognition) return;
    if (isListeningRef.current) return;
    setMicError("");
    setInterimSpeechText("");
    try {
      speechRecognition.start();
      setIsListening(true);
    } catch (err) {
      console.warn("Speech recognition auto-start warning:", err);
    }
  };

  const toggleListening = () => {
    if (!speechRecognition) {
      alert(language === "ar" ? "التعرف على الصوت غير مدعوم في متصفحك" : "Web Speech recognition is not supported in this browser");
      return;
    }

    // Interrupt any active question/feedback TTS reading if mic is clicked to dictate
    if (speakingType) {
      if ((window as any)._activeAudioPractice) {
        try {
          (window as any)._activeAudioPractice.pause();
        } catch (e) {}
          (window as any)._activeAudioPractice = null;
      }
      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
      setSpeakingElement(null);
      speakingTypeRef.current = null;
    }

    if (isListening) {
      speechRecognition.stop();
      setIsListening(false);
      setInterimSpeechText("");
    } else {
      setMicError("");
      setInterimSpeechText("");
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

  // Close the mic the moment the oral answer is submitted — never leave the connection open
  // after the user has finished recording.
  useEffect(() => {
    if (practiceHasAnswered && speechRecognition) {
      try {
        speechRecognition.stop();
      } catch (e) {}
      setIsListening(false);
      setInterimSpeechText("");
    }
  }, [practiceHasAnswered]);

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
                  style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.85rem", background: "var(--card-bg)", fontWeight: 700 }}
                >
                  {/* FC9.2: read the user's real Course Subjects (same source as SubjectsPanel),
                      not a hardcoded Math/Science/Arabic/General list. The value is the subject
                      name itself — a strictly better grounding string for the generator (which
                      keys on text). Falls back to the generic list only if no real subjects. */}
                  {dynamicSubjects && dynamicSubjects.length > 0 ? (
                    dynamicSubjects.map((s: any) => {
                      const label = language === "ar" ? (s.name_ar || s.name || s.name_en) : (s.name || s.name_en || s.name_ar);
                      return (
                        <option key={s._id || label} value={s.name || s.name_en || label}>{label}</option>
                      );
                    })
                  ) : (
                    <>
                      <option value="Math">{language === "ar" ? "الرياضيات" : "Mathematics"}</option>
                      <option value="Science">{language === "ar" ? "العلوم والفيزياء" : "Science & Physics"}</option>
                      <option value="Arabic">{language === "ar" ? "اللغة العربية" : "Arabic Linguistics"}</option>
                      <option value="General">{language === "ar" ? "ثقافة عامة" : "General Knowledge"}</option>
                    </>
                  )}
                </select>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <select
                    value={practiceSelectedBookId}
                    onChange={(e) => {
                      setPracticeSelectedBookId(e.target.value);
                      setPracticeSelectedChapters([]);
                    }}
                    style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.85rem", background: "var(--card-bg)", fontWeight: 700 }}
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

                  {/* 📚 Multiple Chapter Selection list */}
                  {practiceSelectedBookId && (
                    (() => {
                      const activeBook = dynamicBooks.find((b: any) => (b._id || b.id) === practiceSelectedBookId);
                      const chapters = activeBook?.chapters || [];
                      return (
                        <div style={{
                          marginTop: "0.5rem",
                          padding: "1rem",
                          borderRadius: "8px",
                          background: "rgba(16, 107, 163, 0.03)",
                          border: "1px solid rgba(16, 107, 163, 0.08)"
                        }}>
                          <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--foreground)", display: "block", marginBottom: "0.5rem" }}>
                            {language === "ar" ? "📍 حدد فصول الكتاب المستهدفة (خيارات متعددة):" : "📍 Select Target Chapters (Multiple Selection):"}
                          </label>
                          {chapters.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
                              {chapters.map((ch: any, idx: number) => {
                                const chTitle = language === "ar" ? (ch.title_ar || ch.title) : (ch.title || ch.title_ar);
                                const isChecked = practiceSelectedChapters.includes(ch.title);
                                return (
                                  <label key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", cursor: "pointer", fontWeight: 600 }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setPracticeSelectedChapters(practiceSelectedChapters.filter(t => t !== ch.title));
                                        } else {
                                          setPracticeSelectedChapters([...practiceSelectedChapters, ch.title]);
                                        }
                                      }}
                                      style={{ cursor: "pointer" }}
                                    />
                                    <span>{chTitle}</span>
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                      ({language === "ar" ? `الصفحات: ${ch.start_page}-${ch.end_page}` : `Pages: ${ch.start_page}-${ch.end_page}`})
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {language === "ar" ? "لا توجد فصول مسجلة لهذا الكتاب، سيتم التدريب على الكتاب كاملاً." : "No structured chapters recorded. Full textbook will be targeted."}
                            </div>
                          )}

                          {/* 🏷️ Target Titles / Concepts input */}
                          <div style={{ marginTop: "0.8rem", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "0.8rem" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--foreground)", display: "block", marginBottom: "0.3rem" }}>
                              {language === "ar" ? "🏷️ أدخل مفاهيم أو مواضيع معينة لتركيز التدريب عليها (مثال: الخلايا، الجبر):" : "🏷️ Focus on specific concepts, titles, or tags (e.g. matrix, cell division):"}
                            </label>
                            <input
                              type="text"
                              value={practiceCustomConcepts}
                              onChange={(e) => setPracticeCustomConcepts(e.target.value)}
                              placeholder={language === "ar" ? "اكتب المواضيع هنا تفصلها فواصل..." : "Type custom concepts separated by commas..."}
                              style={{
                                width: "100%",
                                padding: "6px 10px",
                                borderRadius: "6px",
                                border: "1px solid var(--card-border)",
                                fontSize: "0.8rem",
                                outline: "none",
                                background: "var(--card-bg)"
                              }}
                            />
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
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
              onClick={() => startQuest()}
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
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  {language === "ar" ? "المستوى الحالي" : "Tutor Class Level"}
                </span>
                <h2 style={{ fontSize: "2.25rem", margin: "0.25rem 0", color: "var(--primary)", fontWeight: 800 }}>
                  {language === "ar" ? `مستوى ${practiceLevel}` : `Level ${practiceLevel}`}
                </h2>
              </div>

              {/* XP Progress */}
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
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
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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

            {/* Student Vulnerability Heatmap */}
            <div className="panel-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span>🎯</span>
                  <span>{language === "ar" ? "خريطة تحصيل وثغرات الطالب" : "Student Vulnerability Heatmap"}</span>
                </h4>
                {/* Dynamic Status Indicator */}
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  <span className="pulsing-dot-green" title="Mastered (>=70%)" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4caf50" }} />
                  <span className="pulsing-dot-yellow" title="Warning (40%-69%)" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff9800" }} />
                  <span className="pulsing-dot-red" title="Vulnerable (<40%)" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f44336" }} />
                </div>
              </div>

              {/* Subject Category Selectors — FC9.13: real subjects from the user's structure */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {heatmapSubjects.map((sub) => {
                  const isActive = heatmapSubjectFilter === sub;
                  return (
                    <button
                      key={sub}
                      onClick={() => setHeatmapSubjectFilter(sub)}
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        border: "1px solid " + (isActive ? "var(--primary)" : "var(--card-border)"),
                        borderRadius: "20px",
                        background: isActive ? "var(--primary)" : "#ffffff",
                        color: isActive ? "#ffffff" : "var(--foreground)",
                        cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    >
                      {sub === "All" ? (language === "ar" ? "الكل" : "All") : sub}
                    </button>
                  );
                })}
              </div>

              {/* Heatmap Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                  gap: "0.6rem",
                  maxHeight: "260px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}
              >
                {filteredHeatmapData.map((item) => {
                  let statusBg = "rgba(106, 124, 136, 0.05)";
                  let statusColor = "#6a7c88";
                  let statusTextEn = "Unattempted";
                  let statusTextAr = "غير مجرب";
                  let pulseColor = "transparent";

                  if (item.status === "green") {
                    statusBg = "rgba(76, 175, 80, 0.1)";
                    statusColor = "#2e7d32";
                    statusTextEn = "Mastered";
                    statusTextAr = "متقن";
                    pulseColor = "#4caf50";
                  } else if (item.status === "yellow") {
                    statusBg = "rgba(255, 152, 0, 0.1)";
                    statusColor = "#e65100";
                    statusTextEn = "Warning";
                    statusTextAr = "تحذير";
                    pulseColor = "#ff9800";
                  } else if (item.status === "red") {
                    statusBg = "rgba(244, 67, 54, 0.1)";
                    statusColor = "#c62828";
                    statusTextEn = "Vulnerable";
                    statusTextAr = "ثغرة حرجة";
                    pulseColor = "#f44336";
                  }

                  return (
                    <div
                      key={item.subtopic}
                      className="heatmap-cell"
                      style={{
                        padding: "0.6rem",
                        borderRadius: "8px",
                        background: statusBg,
                        border: `1px solid ${statusColor}1c`,
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.3rem",
                        position: "relative",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        cursor: "pointer",
                      }}
                      title={`${item.subtopic}: ${item.correct}/${item.total} Correct (${item.ratio !== null ? Math.round(item.ratio * 100) : 0}%)`}
                    >
                      {/* Pulse Indicator */}
                      {item.status !== "neutral" && (
                        <div
                          className="pulse-indicator"
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: pulseColor,
                            position: "absolute",
                            top: "6px",
                            right: "6px",
                            boxShadow: `0 0 0 0 ${pulseColor}`,
                          }}
                        />
                      )}

                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          color: "var(--foreground)",
                          lineHeight: 1.2,
                          paddingRight: item.status !== "neutral" ? "8px" : "0",
                        }}
                      >
                        {item.subtopic}
                      </span>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                        <span style={{ fontSize: "0.6rem", color: statusColor, fontWeight: 700 }}>
                          {language === "ar" ? statusTextAr : statusTextEn}
                        </span>
                        {item.total > 0 && (
                          <span style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>
                            {item.correct}/{item.total} {language === "ar" ? "صحيحة" : "Correct"}
                          </span>
                        )}
                      </div>

                      {/* Small Progress Bar */}
                      {item.total > 0 && (
                        <div style={{ width: "100%", height: "3px", background: "rgba(0,0,0,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${(item.ratio || 0) * 100}%`,
                              height: "100%",
                              background: statusColor,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <style>{`
              .heatmap-cell:hover {
                transform: translateY(-2px) scale(1.02);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                border-color: rgba(16, 107, 163, 0.2) !important;
              }
              @keyframes cellPulseGreen {
                0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
                70% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
                100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
              }
              @keyframes cellPulseYellow {
                0% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4); }
                70% { box-shadow: 0 0 0 6px rgba(255, 152, 0, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0); }
              }
              @keyframes cellPulseRed {
                0% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); }
                70% { box-shadow: 0 0 0 6px rgba(244, 67, 54, 0); }
                100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
              }
              .pulsing-dot-green {
                animation: cellPulseGreen 2s infinite;
              }
              .pulsing-dot-yellow {
                animation: cellPulseYellow 2s infinite;
              }
              .pulsing-dot-red {
                animation: cellPulseRed 2s infinite;
              }
              .pulse-indicator {
                animation: cellPulseGreen 2s infinite;
              }
            `}</style>
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

          {/* FC7.13: surface the chosen practice specs (Scope / Mode / Session Format & Arena / Focus)
              so the user sees exactly what was created — whether they set it or the companion did. */}
          {(() => {
            const modeLabel = practiceMode === "oral" ? (language === "ar" ? "شفهي" : "Oral")
              : practiceMode === "text" ? (language === "ar" ? "كتابي" : "Written") : "MCQ";
            const scopeBook = practiceScopeType === "book"
              ? (dynamicBooks?.find((b: any) => (b._id || b.id) === practiceSelectedBookId)) : null;
            const scopeLabel = scopeBook
              ? (language === "ar" ? (scopeBook.titleAr || scopeBook.title || scopeBook.titleEn) : (scopeBook.titleEn || scopeBook.title || scopeBook.titleAr))
              : (practiceSubject || (language === "ar" ? "عام" : "General"));
            const chip = (icon: string, label: string, val: string) => (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 700, padding: "4px 10px", borderRadius: "20px", background: "var(--surface-translucent)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}>
                <span style={{ opacity: 0.7 }}>{icon} {label}:</span> <strong style={{ color: "var(--primary)" }}>{val}</strong>
              </span>
            );
            const formatVal = practiceSessionType === "quiz"
              ? (language === "ar" ? `اختبار مؤقت (${practiceQuizQuestionsCount} أسئلة)` : `Quiz Arena (${practiceQuizQuestionsCount}Q)`)
              : (language === "ar" ? "تدريب لا نهائي" : "Infinite");
            return (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                {chip("📚", language === "ar" ? "النطاق" : "Scope", String(scopeLabel))}
                {chip("🎯", language === "ar" ? "النمط" : "Mode", modeLabel)}
                {chip(practiceSessionType === "quiz" ? "🏆" : "♾️", language === "ar" ? "الصيغة" : "Format", formatVal)}
                {practiceCustomConcepts ? chip("🏷️", language === "ar" ? "التركيز" : "Focus", String(practiceCustomConcepts)) : null}
              </div>
            );
          })()}

          {/* Main Challenge Card */}
          <div className="panel-card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>
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
                        {language === "ar" ? "🎙️ منصة التسميع الشفوي والكتابة بالصوت" : "🎙️ AI Oral Recitation & Voice Dictation"}
                      </h4>
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {language === "ar"
                          ? "تحدث لإملاء إجابتك مباشرة، حيث يقوم النظام بتحويل صوتك لنص مكتوب في الحال."
                          : "Speak to dictate your answer. System transcribes your Egyptian Arabic or English speech to text live."}
                      </p>
                    </div>

                    {/* Auto-Play & Auto-Dictation Toggle */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "-0.5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          checked={autoPlayVoice}
                          onChange={(e) => handleAutoPlayVoiceChange(e.target.checked)}
                          style={{
                            accentColor: "var(--primary)",
                            width: "14px",
                            height: "14px",
                            cursor: "pointer"
                          }}
                        />
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)" }}>
                          {language === "ar" ? "تشغيل التسميع الشفوي وفتح الميكروفون للإملاء تلقائياً" : "Auto-read question & open dictation mic"}
                        </span>
                      </label>
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
                            ? "✍️ جاري تحويل صوتك إلى نص مكتوب..."
                            : "✍️ Transcribing your speech to text live..."
                          : language === "ar"
                          ? "اضغط على الميكروفون لبدء الإملاء بالصوت"
                          : "Click microphone to start voice dictation"}
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
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {language === "ar" ? "(يمكنك التعديل اليدوي قبل التأكيد)" : "(Feel free to edit text if needed)"}
                        </span>
                      </div>
                      <textarea
                        value={isListening && interimSpeechText ? (practiceAnswer ? practiceAnswer + " " + interimSpeechText : interimSpeechText) : practiceAnswer}
                        onChange={(e) => {
                          setPracticeAnswer(e.target.value);
                          if (interimSpeechText) {
                            setInterimSpeechText("");
                          }
                        }}
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
                    background: "var(--card-bg)",
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
                    background: "var(--card-bg)",
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
                      const res = await authedFetch("/api/practice/evaluate", {
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
                            addSpaceHistory(
                              `Answered Quest Challenge: Correct (+${computedXp} XP)`,
                              `أجاب على تحدي الممارسة بشكل صحيح (+${computedXp} XP)`
                            );
                          } else {
                            setPracticeStreak(0);
                            addSpaceHistory(
                              `Answered Quest Challenge: Incorrect`,
                              `أجاب على تحدي الممارسة بشكل خاطئ`
                            );
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

                          // Save to persistent database
                          if (user) {
                            const bookObj: any = dynamicBooks.find((b: any) => (b._id || b.id) === practiceSelectedBookId);
                            const targetSubject = practiceScopeType === "book"
                              ? (bookObj?.subject || bookObj?.subjectName || "General")
                              : practiceSubject;
                            const bookTitle = bookObj ? (bookObj.title || bookObj.titleEn || bookObj.title_en || bookObj.name_en || bookObj.name || "") : "";
                            // FC9.15: a MEANINGFUL aggregation key (never the old "General Knowledge").
                            // Priority: explicit focus concept > the selected chapter(s) > a non-generic
                            // heuristic > book title > subject — so the heatmap/insights pinpoint the
                            // exact chapter/concept the user actually practiced.
                            const focus = (practiceCustomConcepts || "").trim();
                            const chapters = Array.isArray(practiceSelectedChapters) ? practiceSelectedChapters.filter(Boolean) : [];
                            const heuristic = determineSubtopic(practiceCurrentQuestion.question, targetSubject);
                            const concept = focus
                              || (chapters.length ? chapters.join(", ") : "")
                              || (heuristic && heuristic !== "General Knowledge" && heuristic !== "General Practice" ? heuristic : "")
                              || bookTitle
                              || targetSubject;
                            // Real numeric score (rubric score if graded, else 100/0) → real trend.
                            const score = (data.rubric && typeof data.rubric.score === "number")
                              ? Math.round(data.rubric.score)
                              : (data.isCorrect ? 100 : 0);

                            // FC9.14/9.15: persist to the dedicated, email-keyed practice_history with
                            // FULL trackable metadata (subject/book/concept + the exact question the AI
                            // asked, what the user wrote, and the AI's evaluation) and a meaningful
                            // aggregation key + real score so the analytics are insightful.
                            authedFetch("/api/practice-history", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "practice_session",
                                status: data.isCorrect ? "correct" : "incorrect",
                                xpGained: computedXp,
                                details: {
                                  question: practiceCurrentQuestion.question,
                                  mode: practiceMode,
                                  userAnswer: answerStr,
                                  isCorrect: data.isCorrect,
                                  score,
                                  xpGained: computedXp,
                                  subject: targetSubject,
                                  bookId: practiceSelectedBookId || null,
                                  bookTitle,
                                  scopeType: practiceScopeType,
                                  concept,
                                  subtopic: concept,
                                  chapters,
                                  focus: focus || null,
                                  feedback: data.feedback,
                                  explanation: data.correctExplanation || "",
                                  rubric: data.rubric || null
                                }
                              })
                            }).then(() => {
                              // Reload history from the persistent store
                              fetchPracticeHistory();
                            }).catch(err => console.error("Failed to save practice session:", err));
                          }
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

                      const res = await authedFetch("/api/practice/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          subject: targetSubject,
                          bookId: practiceScopeType === "book" ? practiceSelectedBookId : "",
                          selectedChapters: practiceSelectedChapters,
                          customConcepts: practiceCustomConcepts,
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
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)" }}>{language === "ar" ? "الخبرة المكتسبة" : "Reward"}</span>
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
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
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
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>
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
                              background: "var(--card-bg)",
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
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
              {language === "ar" ? "لقد أكملت جميع المتطلبات وأحرزت تقدماً ملحوظاً!" : "You have achieved your academic milestones!"}
            </p>
          </div>

          {/* Stats Breakdown Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", width: "100%", maxWidth: "450px", margin: "1rem 0" }}>
            <div style={{ padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "10px", border: "1px solid var(--card-border)" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>{language === "ar" ? "إجمالي الخبرة" : "XP Gained"}</span>
              <h3 style={{ fontSize: "1.5rem", margin: "0.25rem 0 0 0", fontWeight: 800, color: "var(--primary)" }}>+{practiceSessionXpGained} XP</h3>
            </div>
            <div style={{ padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "10px", border: "1px solid var(--card-border)" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>{language === "ar" ? "الدقة" : "Accuracy"}</span>
              <h3 style={{ fontSize: "1.5rem", margin: "0.25rem 0 0 0", fontWeight: 800, color: "#2e7d32" }}>
                {practiceSessionTotalQuestions > 0 ? Math.round((practiceSessionCorrectAnswers / practiceSessionTotalQuestions) * 100) : 0}%
              </h3>
            </div>
            <div style={{ padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "10px", border: "1px solid var(--card-border)" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>{language === "ar" ? "الإجابات" : "Correct"}</span>
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

                  const res = await authedFetch("/api/practice/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      subject: targetSubject,
                      bookId: practiceScopeType === "book" ? practiceSelectedBookId : "",
                      selectedChapters: practiceSelectedChapters,
                      customConcepts: practiceCustomConcepts,
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
                background: "var(--card-bg)",
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

      {/* 📜 Practice Sessions History & Audit Trail */}
      <div style={{
        marginTop: "2.5rem",
        background: "var(--surface-translucent)",
        backdropFilter: "blur(12px)",
        borderRadius: "16px",
        padding: "2rem",
        border: "1px solid var(--card-border)",
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.05)",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          borderBottom: "2px solid rgba(0, 0, 0, 0.05)",
          paddingBottom: "1rem"
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "var(--foreground)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              📜 {language === "ar" ? "سجل غارات الممارسة وتحديات الأسئلة" : "Practice Sessions History & Challenges"}
            </h3>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {language === "ar" ? "شاهد أسئلتك وإجاباتك والتقييمات التفصيلية لكل تحدٍ قمت به" : "View your past questions, answers, and full evaluations with tutor-provided explanations"}
            </p>
          </div>
          <button
            onClick={fetchPracticeHistory}
            style={{
              padding: "6px 12px",
              borderRadius: "20px",
              background: "rgba(16, 107, 163, 0.08)",
              color: "var(--primary)",
              border: "1px solid rgba(16, 107, 163, 0.15)",
              fontWeight: 700,
              fontSize: "0.75rem",
              cursor: "pointer"
            }}
          >
            {historyLoading ? "🔄..." : (language === "ar" ? "تحديث" : "Refresh")}
          </button>
        </div>

        {historyLoading && practiceHistoryList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div className="animate-spin" style={{ display: "inline-block", width: "2rem", height: "2rem", border: "4px solid rgba(0,0,0,0.1)", borderLeftColor: "var(--primary)", borderRadius: "50%" }}></div>
            <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--foreground)" }}>
              {language === "ar" ? "جاري تحميل السجل..." : "Loading practice history..."}
            </p>
          </div>
        ) : practiceHistoryList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", background: "rgba(0,0,0,0.02)", borderRadius: "12px", border: "1px dashed rgba(0,0,0,0.1)" }}>
            <span style={{ fontSize: "2.5rem" }}>🎯</span>
            <h4 style={{ margin: "1rem 0 0.25rem 0", fontWeight: 700 }}>
              {language === "ar" ? "لا توجد غارات مسجلة بعد" : "No practice history recorded yet"}
            </h4>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {language === "ar" ? "ابدأ غارة مراجعة نشطة في الأعلى وسجل إجابتك ليتم حفظ تقدمك هنا!" : "Launch an Active Recall Quest above and evaluate your response to start recording achievements here."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {practiceHistoryList.map((run: any, idx: number) => {
              const details = run.details || {};
              const isCorrect = details.isCorrect === true || run.status === "correct";
              const keyId = run._id || `run-${idx}`;
              return (
                <div key={keyId} style={{
                  background: "var(--card-bg)",
                  borderRadius: "12px",
                  border: "1px solid " + (isCorrect ? "rgba(76, 175, 80, 0.15)" : "rgba(244, 67, 54, 0.15)"),
                  padding: "1.25rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  transition: "all 0.2s"
                }}>
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem", borderBottom: "1px solid rgba(0,0,0,0.03)", paddingBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "12px",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        background: isCorrect ? "rgba(76, 175, 80, 0.1)" : "rgba(244, 67, 54, 0.1)",
                        color: isCorrect ? "#2e7d32" : "#d32f2f"
                      }}>
                        {isCorrect ? (language === "ar" ? "صحيح" : "Correct") : (language === "ar" ? "يحتاج مراجعة" : "Incorrect")}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {details.mode ? `• Mode: ${details.mode.toUpperCase()}` : ""}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        • {new Date(run.createdAt || Date.now()).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {details.xpGained > 0 && (
                        <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#e65100", background: "rgba(255, 152, 0, 0.1)", padding: "2px 8px", borderRadius: "10px" }}>
                          🔥 +{details.xpGained} XP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question */}
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.5rem" }}>
                    Q: {details.question}
                  </div>

                  {/* User's Answer */}
                  <div style={{
                    fontSize: "0.85rem",
                    padding: "8px 12px",
                    background: "rgba(0,0,0,0.02)",
                    borderRadius: "6px",
                    color: "var(--foreground)",
                    borderLeft: "3px solid " + (isCorrect ? "#4caf50" : "#f44336"),
                    marginBottom: "0.75rem"
                  }}>
                    <strong>{language === "ar" ? "إجابتك:" : "Your Answer:"}</strong> {details.userAnswer || "N/A"}
                  </div>

                  {/* Oral Practice Assessment Rubric (Saved in History) */}
                  {details.mode === "oral" && details.rubric && (
                    <div style={{
                      padding: "1rem",
                      background: "linear-gradient(135deg, rgba(212, 175, 55, 0.03), rgba(16, 107, 163, 0.03))",
                      border: "1px solid #d4af37",
                      borderRadius: "10px",
                      marginBottom: "0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <span style={{ fontSize: "1.1rem" }}>📊</span>
                          <strong style={{ fontSize: "0.85rem", color: "var(--foreground)" }}>
                            {language === "ar" ? "تقييم الأداء النطقي" : "Oral Rubric Evaluation"}
                          </strong>
                        </div>
                        {details.rubric.accentNormalizationApplied && (
                          <span style={{
                            background: "rgba(39, 174, 96, 0.08)",
                            color: "#27ae60",
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "10px",
                            border: "1px solid rgba(39,174,96,0.15)"
                          }}>
                            ✨ {language === "ar" ? "تسامح لهجي مصري" : "Egyptian Accent Normalization"}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", alignItems: "center" }} className="grid-cols-1">
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0.5rem", background: "rgba(0,0,0,0.015)", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.03)" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)" }}>
                            {language === "ar" ? "الدرجة الكلية" : "Overall"}
                          </span>
                          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#d4af37" }}>
                            {details.rubric.overall}%
                          </div>
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: details.rubric.overall >= 60 ? "#27ae60" : "#d32f2f" }}>
                            {details.rubric.overall >= 60 
                              ? (language === "ar" ? "اجتياز 🛡️" : "PASS 🛡️") 
                              : (language === "ar" ? "مراجعة ⚠️" : "REVIEW ⚠️")}
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                          {[
                            { key: "pronunciation", labelAr: "النطق", labelEn: "Pronunciation", val: details.rubric.pronunciation, icon: "🗣️", color: "#106ba3" },
                            { key: "confidence", labelAr: "الطلاقة", labelEn: "Fluency", val: details.rubric.confidence, icon: "⚡", color: "#f39c12" },
                            { key: "accuracy", labelAr: "الدقة", labelEn: "Accuracy", val: details.rubric.accuracy, icon: "🎯", color: "#27ae60" },
                            { key: "structure", labelAr: "الصياغة", labelEn: "Structure", val: details.rubric.structure, icon: "🧱", color: "#9b59b6" },
                          ].map((metric) => (
                            <div key={metric.key} style={{ padding: "0.4rem 0.5rem", background: "var(--card-bg)", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.05)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem" }}>
                                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#4f6371" }}>
                                  {metric.icon} {language === "ar" ? metric.labelAr : metric.labelEn}
                                </span>
                                <strong style={{ fontSize: "0.75rem", color: metric.color }}>{metric.val}%</strong>
                              </div>
                              <div style={{ width: "100%", height: "4px", background: "rgba(0,0,0,0.04)", borderRadius: "2px", overflow: "hidden" }}>
                                <div style={{ width: `${metric.val}%`, height: "100%", background: metric.color, borderRadius: "2px" }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {details.rubric.feedbackDetails && (
                        <div style={{ fontSize: "0.7rem", padding: "0.5rem", background: "rgba(0,0,0,0.015)", borderRadius: "6px", color: "var(--foreground)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }} className="grid-cols-1">
                            {details.rubric.feedbackDetails.pronunciationFeedback && (
                              <div>
                                <strong>🗣️ {language === "ar" ? "مخارج الحروف:" : "Pronunciation:"}</strong> {details.rubric.feedbackDetails.pronunciationFeedback}
                              </div>
                            )}
                            {details.rubric.feedbackDetails.confidenceFeedback && (
                              <div>
                                <strong>⚡ {language === "ar" ? "الطلاقة والثقة:" : "Fluency:"}</strong> {details.rubric.feedbackDetails.confidenceFeedback}
                              </div>
                            )}
                            {details.rubric.feedbackDetails.accuracyFeedback && (
                              <div>
                                <strong>🎯 {language === "ar" ? "الدقة العلمية:" : "Accuracy:"}</strong> {details.rubric.feedbackDetails.accuracyFeedback}
                              </div>
                            )}
                            {details.rubric.feedbackDetails.structureFeedback && (
                              <div>
                                <strong>🧱 {language === "ar" ? "الصياغة والترتيب:" : "Structure:"}</strong> {details.rubric.feedbackDetails.structureFeedback}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tutor Explanation & Feedback */}
                  {details.explanation && (
                    <div style={{
                      background: "rgba(16, 107, 163, 0.03)",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px dashed rgba(16, 107, 163, 0.15)",
                      fontSize: "0.85rem",
                      color: "var(--foreground)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <strong style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                          💡 {language === "ar" ? "شرح وتوضيح المعلم:" : "Tutor Explanation:"}
                        </strong>
                        <button
                          onClick={() => speakPracticeText(details.explanation, keyId)}
                          style={{
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: speakingType === keyId ? "rgba(244, 67, 54, 0.1)" : "rgba(16, 107, 163, 0.1)",
                            color: speakingType === keyId ? "#f44336" : "var(--primary)",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: "3px"
                          }}
                        >
                          {speakingType === keyId ? "🛑 Stop" : "🔊 Listen"}
                        </button>
                      </div>
                      <div style={{ lineHeight: 1.5 }}>
                        {details.explanation}
                      </div>
                      {details.feedback && (
                        <div style={{ marginTop: "0.5rem", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          💬 {details.feedback}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {renderSpaceHistory()}
    </div>
  );
};
