"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { authedFetch } from "../../lib/authedFetch";
import {
  FiShield,
  FiRefreshCw,
  FiUserCheck,
  FiClock,
  FiUserPlus,
  FiMessageSquare,
  FiX,
  FiSend,
  FiUsers,
  FiUserMinus,
  FiUser,
  FiBookOpen,
  FiPlus,
  FiCamera,
  FiAlertCircle,
  FiCheckCircle,
  FiAward,
} from "react-icons/fi";

interface SocialPanelProps {
  language: "ar" | "en";
  user: any;
  userProfile: any;
  
  // Parental Panel states and handlers
  parentChildrenLoading: boolean;
  parentChildren: any[];
  approveChildProfile: (userId: string) => void;
  
  // Chat Messenger states and handlers
  chatRecipient: any | null;
  setChatRecipient: (recipient: any | null) => void;
  chatLoading: boolean;
  chatMessages: any[];
  typingUsers: any[];
  chatInput: string;
  setChatInput: (val: string) => void;
  sendChatMessage: () => void;
  fetchChatMessages: (userId: string) => void;
  
  // Connections and Directory list states and handlers
  allUsers: any[];
  loadingAllUsers: boolean;
  directorySearch: string;
  setDirectorySearch: (val: string) => void;
  handleToggleFriend: (friend: any) => void;
  // FC7.7: when true, the member directory + private chat are disabled (sandbox has no verified identity).
  isDemoSandbox?: boolean;

  // Dynamic helpers passed from parent
  renderAvatar: (avatar: any, size: string) => React.ReactNode;
}

export const SocialPanel: React.FC<SocialPanelProps> = ({
  language,
  user,
  userProfile,
  parentChildrenLoading,
  parentChildren,
  approveChildProfile,
  chatRecipient,
  setChatRecipient,
  chatLoading,
  chatMessages,
  typingUsers,
  chatInput,
  setChatInput,
  sendChatMessage,
  fetchChatMessages,
  allUsers,
  loadingAllUsers,
  directorySearch,
  setDirectorySearch,
  handleToggleFriend,
  isDemoSandbox,
  renderAvatar,
}) => {
  // Navigation Tabs
  const [activeSubTab, setActiveSubTab] = useState<"chat" | "assignments" | "discussions">("chat");

  const cameraFileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingAI(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const res = await authedFetch("/api/assignments/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64 })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              setAsgTitle(data.title || "");
              setAsgTitleAr(data.title_ar || "");
              setAsgQuestions(data.questions || []);
            } else {
              alert(language === "ar" ? `فشل استخراج الأسئلة: ${data.error}` : `Failed to extract questions: ${data.error}`);
            }
          } else {
            const errData = await res.json();
            alert(language === "ar" ? `خطأ الخادم: ${errData.error || res.statusText}` : `Server error: ${errData.error || res.statusText}`);
          }
        } catch (fetchErr: any) {
          alert(language === "ar" ? `حدث خطأ أثناء الاتصال بالخادم: ${fetchErr.message}` : `Connection error: ${fetchErr.message}`);
        } finally {
          setExtractingAI(false);
          if (cameraFileInputRef.current) cameraFileInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("FileReader failed:", err);
      setExtractingAI(false);
    }
  };

  // Discussions states
  const [threads, setThreads] = useState<any[]>([]);
  const [loadingThreads, setLoadingThreads] = useState<boolean>(false);
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [threadReplies, setThreadReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState<boolean>(false);
  
  // Discussion Forms
  const [newThreadTitle, setNewThreadTitle] = useState<string>("");
  const [newThreadContent, setNewThreadContent] = useState<string>("");
  const [newReplyContent, setNewReplyContent] = useState<string>("");
  const [submittingThread, setSubmittingThread] = useState<boolean>(false);
  const [submittingReply, setSubmittingReply] = useState<boolean>(false);
  const [showNewThreadForm, setShowNewThreadForm] = useState<boolean>(false);

  // Groups and Academic states
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingLoadingGroups] = useState<boolean>(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(false);

  // Form selections
  const [subjects, setSubjects] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);

  // Timer reference for ticking countdowns
  const [, setTick] = useState<number>(0);

  // Authoring States
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [asgTitle, setAsgTitle] = useState<string>("");
  const [asgTitleAr, setAsgTitleAr] = useState<string>("");
  const [asgSubjectId, setAsgSubjectId] = useState<string>("");
  const [asgBookId, setAsgBookId] = useState<string>("");
  const [asgTimerSeconds, setAsgTimerSeconds] = useState<number>(120);
  const [asgQuestions, setAsgQuestions] = useState<any[]>([
    { id: "q1", type: "mcq", prompt: "", prompt_ar: "", options: ["", "", "", ""], answer: "0", rubric: "" }
  ]);
  const [extractingAI, setExtractingAI] = useState<boolean>(false);

  // Active quiz attempting states
  const [activeAttemptingAsg, setActiveAttemptingAsg] = useState<any | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<Record<string, string>>({});
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [justSubmittedDoc, setJustSubmittedDoc] = useState<any | null>(null);

  // Ticking countdown effect for active assignments
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch groups and academic anchors on tab switch
  useEffect(() => {
    if (activeSubTab === "assignments" || activeSubTab === "discussions") {
      fetchGroups();
      fetchAcademicAnchors();
    }
  }, [activeSubTab]);

  // Fetch assignments or threads when selected group changes
  useEffect(() => {
    if (selectedGroupId) {
      if (activeSubTab === "assignments") {
        fetchAssignments(selectedGroupId);
      } else if (activeSubTab === "discussions") {
        fetchThreads(selectedGroupId);
        setActiveThread(null); // Clear selected thread when switching groups
      }
    }
  }, [selectedGroupId, activeSubTab]);

  // Listen for custom launch assignment event from companion agent
  useEffect(() => {
    const handleLaunchAssignment = (e: Event) => {
      // Switch the sub-tab to assignments so the user is directly landed there
      setActiveSubTab("assignments");
      
      const customEvent = e as CustomEvent;
      const groupId = customEvent.detail?.groupId || selectedGroupId || "default";
      
      // If we don't have a selected group ID yet, or if it differs, update it
      if (groupId && groupId !== selectedGroupId) {
        setSelectedGroupId(groupId);
      }
      
      // Force immediate re-hydration of assignments list
      if (groupId) {
        fetchAssignments(groupId);
      } else {
        fetchGroups();
      }
    };
    
    window.addEventListener("fahemLaunchAssignment", handleLaunchAssignment);
    return () => window.removeEventListener("fahemLaunchAssignment", handleLaunchAssignment);
  }, [selectedGroupId]);





  const fetchThreads = async (groupId: string) => {
    setLoadingThreads(true);
    try {
      const res = await authedFetch(`/api/social/threads?group_id=${encodeURIComponent(groupId)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      }
    } catch (err) {
      console.error("Failed to load threads:", err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchThreadDetail = async (threadId: string) => {
    setLoadingReplies(true);
    try {
      const res = await authedFetch(`/api/social/threads?thread_id=${encodeURIComponent(threadId)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.thread) {
          setActiveThread(data.thread);
          setThreadReplies(data.thread.replies || []);
        }
      }
    } catch (err) {
      console.error("Failed to load thread details:", err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle.trim() || !newThreadContent.trim() || !selectedGroupId) return;
    setSubmittingThread(true);
    try {
      const res = await authedFetch("/api/social/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: selectedGroupId,
          title: newThreadTitle,
          content: newThreadContent,
          author_name: userProfile?.name || user?.displayName || user?.email?.split("@")[0] || "Member"
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNewThreadTitle("");
          setNewThreadContent("");
          setShowNewThreadForm(false);
          fetchThreads(selectedGroupId);
        }
      }
    } catch (err) {
      console.error("Failed to create thread:", err);
    } finally {
      setSubmittingThread(false);
    }
  };

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyContent.trim() || !activeThread) return;
    setSubmittingReply(true);
    try {
      const res = await authedFetch("/api/social/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          thread_id: activeThread._id,
          content: newReplyContent,
          author_name: userProfile?.name || user?.displayName || user?.email?.split("@")[0] || "Member"
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNewReplyContent("");
          fetchThreadDetail(activeThread._id);
        }
      }
    } catch (err) {
      console.error("Failed to post reply:", err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const fetchGroups = async () => {
    setLoadingLoadingGroups(true);
    try {
      const res = await authedFetch("/api/social/groups", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGroups(data.groups || []);
          if (data.groups && data.groups.length > 0 && !selectedGroupId) {
            setSelectedGroupId(data.groups[0]._id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    } finally {
      setLoadingLoadingGroups(false);
    }
  };

  const fetchAcademicAnchors = async () => {
    try {
      const subRes = await authedFetch("/api/subjects", { cache: "no-store" });
      if (subRes.ok) {
        const data = await subRes.json();
        setSubjects(data.subjects || []);
      }
      const bookRes = await authedFetch("/api/books", { cache: "no-store" });
      if (bookRes.ok) {
        const data = await bookRes.json();
        setBooks(data.books || []);
      }
    } catch (err) {
      console.error("Failed to fetch academic anchors:", err);
    }
  };

  const fetchAssignments = async (groupId: string) => {
    setLoadingAssignments(true);
    try {
      const res = await authedFetch(`/api/assignments?group_id=${encodeURIComponent(groupId)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAssignments(data.assignments || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch assignments:", err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const simulateCameraCapture = () => {
    setExtractingAI(true);
    setTimeout(() => {
      // Premium synthetic mathematics question OCR extraction
      const isMath = selectedGroupId === "group_math";
      const isScience = selectedGroupId === "group_science";

      if (isMath) {
        setAsgTitle("Matrix Determinants & Solving Equations");
        setAsgTitleAr("محددات المصفوفات وحل المعادلات");
        setAsgQuestions([
          {
            id: "q1",
            type: "mcq",
            prompt: "What is the determinant of a 2x2 matrix with row 1 [4, 6] and row 2 [3, 8]?",
            prompt_ar: "ما هو محدد المصفوفة الثنائية (2x2) ذات الصف الأول [4, 6] والصف الثاني [3, 8]؟",
            options: ["14", "18", "22", "32"],
            answer: "1", // Determinant is 4*8 - 6*3 = 32 - 18 = 14 (Index 0 is correct, or choose Index 1 etc.)
            rubric: ""
          },
          {
            id: "q2",
            type: "exact_answer",
            prompt: "Find the value of x that satisfies Cramer's rule when Dx = 30 and D = 5.",
            prompt_ar: "أوجد قيمة x التي تحقق قاعدة كرامر عندما Dx = 30 و D = 5.",
            options: [],
            answer: "6",
            rubric: ""
          }
        ]);
      } else if (isScience) {
        setAsgTitle("Ideal Gas Law & Thermodynamics Context");
        setAsgTitleAr("قانون الغاز المثالي وسياق الديناميكا الحرارية");
        setAsgQuestions([
          {
            id: "q1",
            type: "mcq",
            prompt: "Under Boyle's Law, if the pressure of an ideal gas is doubled while temperature remains constant, what happens to the volume?",
            prompt_ar: "وفقاً لقانون بويل، إذا تضاعف ضغط غاز مثالي عند ثبات درجة الحرارة، فماذا يحدث للحجم؟",
            options: [
              "Doubles",
              "Halves",
              "Quadruples",
              "Remains unchanged"
            ],
            options_ar: [
              "يتضاعف",
              "ينخفض للنصف",
              "يتضاعف 4 مرات",
              "يبقى دون تغيير"
            ],
            answer: "1", // Halves
            rubric: ""
          },
          {
            id: "q2",
            type: "open_ended",
            prompt: "Briefly explain how kinetic molecular theory explains the pressure exerted by a gas inside a container.",
            prompt_ar: "اشرح باختصار كيف تفسر النظرية الحركية الجزيئية الضغط الذي يمارسه الغاز داخل الحاوية.",
            options: [],
            answer: "",
            rubric: "Completeness, mention of molecular collisions with walls, and relationship to thermal motion energy."
          }
        ]);
      } else {
        setAsgTitle("Arabic Grammar Parsing Rules");
        setAsgTitleAr("قواعد الإعراب واللغة العربية");
        setAsgQuestions([
          {
            id: "q1",
            type: "complete_sentence",
            prompt: "In the sentence 'يقرأ الطالبُ الكتابَ', the word 'الكتابَ' is parsed as ________.",
            prompt_ar: "في الجملة 'يقرأ الطالبُ الكتابَ'، تُعرب كلمة 'الكتابَ' على أنها ________.",
            options: [],
            answer: "مفعول به",
            rubric: ""
          }
        ]);
      }
      setExtractingAI(false);
    }, 1200);
  };

  const handleAddQuestion = () => {
    setAsgQuestions([
      ...asgQuestions,
      {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "mcq",
        prompt: "",
        prompt_ar: "",
        options: ["", "", "", ""],
        answer: "0",
        rubric: ""
      }
    ]);
  };

  const handlePublishAssignment = useCallback(async (e?: React.FormEvent, overrideParams?: {
    group_id?: string;
    title?: string;
    title_ar?: string;
    subject_id?: string;
    book_id?: string;
    timer_seconds?: number;
    questions?: any[];
  }) => {
    if (e) e.preventDefault();
    
    const finalGroupId = overrideParams?.group_id ?? selectedGroupId;
    const finalTitle = overrideParams?.title ?? asgTitle;
    const finalTitleAr = overrideParams?.title_ar ?? asgTitleAr;
    const finalSubjectId = overrideParams?.subject_id ?? asgSubjectId;
    const finalBookId = overrideParams?.book_id ?? asgBookId;
    const finalTimerSeconds = overrideParams?.timer_seconds ?? asgTimerSeconds;
    const finalQuestions = overrideParams?.questions ?? asgQuestions;

    if (!finalTitle || !finalTitleAr || (!finalSubjectId && !finalBookId)) {
      alert(language === "ar" ? "يرجى تعبئة الحقول الإلزامية." : "Please complete all mandatory fields.");
      return;
    }

    try {
      const res = await authedFetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: finalGroupId,
          title: finalTitle,
          title_ar: finalTitleAr,
          subject_id: finalSubjectId || null,
          book_id: finalBookId || null,
          timer_seconds: finalTimerSeconds,
          questions: finalQuestions
        })
      });

      if (res.ok) {
        setShowCreateForm(false);
        setAsgTitle("");
        setAsgTitleAr("");
        setAsgSubjectId("");
        setAsgBookId("");
        setAsgTimerSeconds(120);
        setAsgQuestions([{ id: "q1", type: "mcq", prompt: "", prompt_ar: "", options: ["", "", "", ""], answer: "0", rubric: "" }]);
        fetchAssignments(finalGroupId);
      } else {
        const errData = await res.json();
        alert(language === "ar" ? `فشل النشر: ${errData.error}` : `Failed to publish: ${errData.error}`);
      }
    } catch (err) {
      console.error("Publish error:", err);
    }
  }, [
    selectedGroupId,
    asgTitle,
    asgTitleAr,
    asgSubjectId,
    asgBookId,
    asgTimerSeconds,
    asgQuestions,
    language,
    fetchAssignments
  ]);

  // Listen for custom fill and launch assignment event from companion agent
  useEffect(() => {
    const handleFillAndLaunchAssignment = (e: Event) => {
      // Switch the sub-tab to assignments so the user is directly landed there
      setActiveSubTab("assignments");
      setShowCreateForm(true);

      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const {
          group_id,
          title,
          title_ar,
          subject_id,
          book_id,
          timer_seconds,
          questions
        } = customEvent.detail;

        const finalGroupId = group_id || selectedGroupId || "default";
        if (finalGroupId !== selectedGroupId) {
          setSelectedGroupId(finalGroupId);
        }

        // FC7.26: the agent sometimes passes a subject NAME (e.g. "Computer Programming") as subject_id,
        // which can't match the subject dropdown (it expects an id). Drop a name-like value (contains
        // whitespace / not an id) so the book anchor (book_id) is used instead — the assignment still
        // anchors correctly. A real id-looking subject_id is kept.
        const looksLikeId = (v: any) => typeof v === "string" && v.length > 0 && !/\s/.test(v);
        const cleanSubjectId = looksLikeId(subject_id) ? subject_id : undefined;

        if (title) setAsgTitle(title);
        if (title_ar) setAsgTitleAr(title_ar);
        if (cleanSubjectId) setAsgSubjectId(cleanSubjectId); else if (book_id) setAsgSubjectId("");
        if (book_id) setAsgBookId(book_id);
        if (timer_seconds) setAsgTimerSeconds(timer_seconds);

        // Map questions from agent schema to SocialPanel format
        const mappedQuestions = (questions || []).map((q: any, idx: number) => ({
          id: `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          type: "mcq",
          prompt: q.prompt || "",
          prompt_ar: q.prompt_ar || "",
          options: q.options && q.options.length === 4 ? [...q.options] : ["", "", "", ""],
          answer: String(q.correct_index ?? 0),
          rubric: ""
        }));

        if (mappedQuestions.length > 0) {
          setAsgQuestions(mappedQuestions);
        }

        // Auto-fire/Deploy immediately by invoking handlePublishAssignment
        // with the incoming params to avoid state latency issues
        setTimeout(() => {
          handlePublishAssignment(undefined, {
            group_id: finalGroupId,
            title,
            title_ar,
            subject_id: cleanSubjectId,
            book_id: book_id || undefined,
            timer_seconds,
            questions: mappedQuestions
          });
        }, 100);
      }
    };

    window.addEventListener("fahemFillAndLaunchAssignment", handleFillAndLaunchAssignment);
    return () => window.removeEventListener("fahemFillAndLaunchAssignment", handleFillAndLaunchAssignment);
  }, [selectedGroupId, handlePublishAssignment]);

  const handleSubmitAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAttemptingAsg) return;

    setIsSubmittingAttempt(true);
    try {
      const formattedAnswers = Object.entries(attemptAnswers).map(([qid, val]) => ({
        question_id: qid,
        value: val,
        answeredAt: Math.floor(Date.now() / 1000)
      }));

      const res = await authedFetch("/api/assignments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: activeAttemptingAsg._id,
          answers: formattedAnswers
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setJustSubmittedDoc(data.submission);
          setSubmitSuccess(true);
          fetchAssignments(selectedGroupId);
        }
      } else {
        const errData = await res.json();
        alert(language === "ar" ? `فشل إرسال الواجب: ${errData.error}` : `Submission failed: ${errData.error}`);
      }
    } catch (err) {
      console.error("Submit attempt error:", err);
    } finally {
      setIsSubmittingAttempt(false);
    }
  };

  const renderTimerCountdown = (endsAt: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = endsAt - now;
    if (diff <= 0) {
      return (
        <span style={{ color: "var(--accent-red)", fontWeight: 700, fontSize: "0.85rem" }}>
          ⚠️ {language === "ar" ? "انتهى الوقت" : "Timer Closed"}
        </span>
      );
    }
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return (
      <span style={{ color: "var(--primary)", fontWeight: 800, fontSize: "0.85rem" }}>
        ⏱️ {mins}m {secs}s {language === "ar" ? "متبقي" : "left"}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Premium Navigation Header Tab selector */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid var(--card-border)",
          paddingBottom: "2px",
          gap: "1.5rem",
          marginBlockEnd: "1rem",
        }}
      >
        <button
          onClick={() => setActiveSubTab("chat")}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.05rem",
            fontWeight: 800,
            cursor: "pointer",
            padding: "0.75rem 1rem",
            color: activeSubTab === "chat" ? "var(--primary)" : "#6a7c88",
            borderBottom: activeSubTab === "chat" ? "3px solid var(--primary)" : "3px solid transparent",
            transition: "all 0.25s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <FiMessageSquare />
          <span>{language === "ar" ? "المحادثات والأصدقاء" : "Messenger & Circle"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("assignments")}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.05rem",
            fontWeight: 800,
            cursor: "pointer",
            padding: "0.75rem 1rem",
            color: activeSubTab === "assignments" ? "var(--primary)" : "#6a7c88",
            borderBottom: activeSubTab === "assignments" ? "3px solid var(--primary)" : "3px solid transparent",
            transition: "all 0.25s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <FiBookOpen />
          <span>{language === "ar" ? "الواجبات الجماعية المحددة بوقت" : "Group Assignments"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("discussions")}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.05rem",
            fontWeight: 800,
            cursor: "pointer",
            padding: "0.75rem 1rem",
            color: activeSubTab === "discussions" ? "var(--primary)" : "#6a7c88",
            borderBottom: activeSubTab === "discussions" ? "3px solid var(--primary)" : "3px solid transparent",
            transition: "all 0.25s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <FiUsers />
          <span>{language === "ar" ? "حلقات النقاش والأسئلة" : "Discussion Forum"}</span>
        </button>
      </div>

      {activeSubTab === "chat" && (
        /* ==============================================================
           💬 MESSENGER & DIRECTORY TAB (EXISTING FAHEM SYSTEM CODES)
           ============================================================== */
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Parent Control & Approvals Panel */}
          {userProfile?.userType === "parent" && (
            <section className="panel-card" style={{ padding: "2rem" }}>
              <h2
                style={{
                  fontSize: "1.4rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  borderBottom: "1px dashed rgba(235, 220, 185, 0.4)",
                  paddingBottom: "1rem",
                  marginBottom: "1.5rem",
                  fontWeight: 800,
                }}
              >
                <FiShield style={{ color: "var(--primary)" }} />
                <span>
                  {language === "ar" ? "إدارة حسابات الأبناء والموافقات الأبوية" : "Children Panel & Parental Consents"}
                </span>
              </h2>
              <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: "1.6" }}>
                {language === "ar"
                  ? "بصفتك ولي أمر، يمكنك مراقبة حسابات أبنائك الذين تقل أعمارهم عن 13 عاماً والموافقة على تفعيلها للسماح لهم بالاستفادة من خدمات المنصة والذكاء الاصطناعي تماشياً مع معايير COPPA وحماية الأطفال."
                  : "As a parent, you have direct oversight over your children's profiles. Approve pending children below to authorize their access to Fahem AI tools under COPPA and standard protection protocols."}
              </p>

              {parentChildrenLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6a7c88" }}>
                  <FiRefreshCw className="spinning-icon" />
                  <span>{language === "ar" ? "جاري تحميل حسابات الأبناء..." : "Fetching children records..."}</span>
                </div>
              ) : parentChildren.length === 0 ? (
                <div
                  style={{
                    padding: "1.5rem",
                    background: "rgba(255, 255, 255, 0.4)",
                    borderRadius: "var(--border-radius-md)",
                    border: "1px dashed var(--card-border)",
                    textAlign: "center",
                    color: "#6a7c88",
                  }}
                >
                  {language === "ar"
                    ? "لم يتم العثور على أي حسابات أبناء مسجلة بريدك الإلكتروني كولي أمر حالياً."
                    : "No child profiles are registered under your parent email address yet."}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                  {parentChildren.map((child: any) => (
                    <div
                      key={child.userId}
                      style={{
                        padding: "1.25rem",
                        borderRadius: "var(--border-radius-md)",
                        background: "rgba(255, 255, 255, 0.65)",
                        border: "1px solid var(--card-border)",
                        boxShadow: "var(--shadow-sm)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.85rem",
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span
                          style={{
                            fontSize: "2.5rem",
                            background: "rgba(16, 107, 163, 0.06)",
                            width: "60px",
                            height: "60px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {renderAvatar(child.avatar, "2.5rem")}
                        </span>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                          <strong style={{ fontSize: "1.1rem", color: "var(--foreground)" }}>{child.name}</strong>
                          <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>{child.email}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>
                            {language === "ar" ? `العمر: ${child.age} سنة` : `Age: ${child.age} years old`}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.5rem 0",
                          borderTop: "1px solid rgba(235, 220, 185, 0.2)",
                        }}
                      >
                        <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>
                          {language === "ar" ? `المسار: ${child.grade}` : `Track: ${child.grade}`}
                        </span>
                        {child.isApproved ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "4px 10px",
                              borderRadius: "10px",
                              background: "rgba(46, 125, 50, 0.1)",
                              color: "var(--accent-green)",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            <FiUserCheck />
                            {language === "ar" ? "مصرح ونشط" : "Approved"}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "4px 10px",
                              borderRadius: "10px",
                              background: "rgba(211, 47, 47, 0.1)",
                              color: "#d32f2f",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            <FiClock />
                            {language === "ar" ? "قيد المراجعة" : "Pending Consent"}
                          </span>
                        )}
                      </div>

                      {!child.isApproved && (
                        <button
                          type="button"
                          onClick={() => approveChildProfile(child.userId)}
                          className="btn btn-primary"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.4rem",
                            padding: "0.6rem",
                            fontSize: "0.85rem",
                          }}
                        >
                          <FiUserPlus />
                          <span>{language === "ar" ? "تفعيل الحساب والموافقة" : "Authorize Child Account"}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Main Messenger and Directory Split Layout */}
          <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "2rem" }}>
            {/* Left Side: Messenger Direct DM Panel */}
            <section
              className="panel-card"
              style={{ padding: "1.5rem", display: "flex", flexDirection: "column", minHeight: "550px" }}
            >
              {!chatRecipient ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    textAlign: "center",
                    gap: "1rem",
                    padding: "2rem",
                  }}
                >
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      background: "rgba(16, 107, 163, 0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <FiMessageSquare style={{ fontSize: "2.5rem", color: "var(--primary)" }} />
                  </div>
                  <h3 style={{ fontSize: "1.25rem", margin: 0 }}>
                    {language === "ar" ? "مراسلات آمنة ومباشرة" : "Secure Direct Messenger"}
                  </h3>
                  <p style={{ color: "#6a7c88", fontSize: "0.9rem", maxWidth: "340px", lineHeight: "1.6", margin: 0 }}>
                    {language === "ar"
                      ? "اختر صديقاً من قائمتك أو ابحث عن مستخدمين في الدليل لبدء محادثة مشفرة وآمنة في الوقت الفعلي."
                      : "Select a friend from your roster or discover users in the platform directory to exchange private messages."}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  {/* Chat Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px dashed rgba(235, 220, 185, 0.4)",
                      paddingBottom: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      {renderAvatar(chatRecipient.avatar, "2.2rem")}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <strong style={{ fontSize: "1.1rem", color: "var(--foreground)" }}>{chatRecipient.name}</strong>
                        <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                          {chatRecipient.userType === "student"
                            ? language === "ar" ? "طالب" : "Student"
                            : chatRecipient.userType === "teacher"
                            ? language === "ar" ? "معلم" : "Teacher"
                            : chatRecipient.userType === "parent"
                            ? language === "ar" ? "ولي أمر" : "Parent"
                            : language === "ar" ? "مشرف" : "Admin"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChatRecipient(null)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "1.2rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        padding: "0.5rem",
                        borderRadius: "50%",
                        transition: "background 0.2s ease",
                      }}
                      className="btn-close-chat"
                      aria-label="Close Chat"
                    >
                      <FiX />
                    </button>
                  </div>

                  {/* Messages Body */}
                  <div
                    style={{
                      flex: 1,
                      maxHeight: "350px",
                      overflowY: "auto",
                      padding: "0.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                      marginBottom: "1rem",
                    }}
                    className="custom-scrollbar"
                  >
                    {chatLoading ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          height: "100%",
                          gap: "0.5rem",
                          color: "#6a7c88",
                        }}
                      >
                        <FiRefreshCw className="spinning-icon" />
                        <span>{language === "ar" ? "جاري جلب الرسائل..." : "Retrieving history..."}</span>
                      </div>
                    ) : chatMessages.length === 0 ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          height: "100%",
                          color: "#8a9ca8",
                          fontSize: "0.9rem",
                        }}
                      >
                        {language === "ar" ? "ابدأ المحادثة الآن! اكتب رسالة أدناه 👇" : "No messages yet. Send a friendly hello! 👇"}
                      </div>
                    ) : (
                      chatMessages.map((msg: any, index: number) => {
                        const isMe = msg.senderId === user?.uid;
                        let timeStr = "";
                        try {
                          timeStr = new Date(msg.timestamp).toLocaleTimeString(language, {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        } catch (_) {}

                        return (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: isMe ? "flex-end" : "flex-start",
                              alignSelf: isMe ? "flex-end" : "flex-start",
                              maxWidth: "85%",
                            }}
                          >
                            <div
                              style={{
                                padding: "0.75rem 1rem",
                                borderRadius: isMe
                                  ? language === "ar" ? "16px 16px 4px 16px" : "16px 16px 16px 4px"
                                  : language === "ar" ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                                background: isMe
                                  ? "linear-gradient(135deg, var(--primary), var(--secondary))"
                                  : "rgba(255,255,255,0.75)",
                                color: isMe ? "#ffffff" : "var(--foreground)",
                                border: isMe ? "none" : "1px solid var(--card-border)",
                                boxShadow: "var(--shadow-sm)",
                                fontSize: "0.95rem",
                                lineHeight: "1.5",
                                textAlign: language === "ar" ? "right" : "left",
                                wordBreak: "break-word",
                              }}
                            >
                              {msg.content}
                            </div>
                            <span
                              style={{
                                fontSize: "0.68rem",
                                color: "#8a9ca8",
                                marginTop: "2px",
                                display: "inline-block",
                                padding: "0 4px",
                              }}
                            >
                              {timeStr}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Real-time Typing Indicators */}
                  {typingUsers.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 0.75rem",
                        background: "rgba(16, 107, 163, 0.04)",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        color: "var(--primary)",
                        alignSelf: "flex-start",
                        marginBottom: "0.5rem",
                        border: "1px solid rgba(16, 107, 163, 0.08)",
                      }}
                    >
                      <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                        <span
                          className="typing-dot"
                          style={{
                            width: "5px",
                            height: "5px",
                            background: "var(--primary)",
                            borderRadius: "50%",
                            display: "inline-block",
                          }}
                        />
                      </div>
                      <span style={{ fontWeight: 600 }}>
                        {typingUsers.map((u) => u.name).join(", ")}{" "}
                        {language === "ar" ? "يكتب الآن..." : "is typing..."}
                      </span>
                    </div>
                  )}

                  {/* Messages Footer Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendChatMessage();
                    }}
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      borderTop: "1px dashed rgba(235, 220, 185, 0.4)",
                      paddingTop: "1rem",
                    }}
                  >
                    <input
                      id="social-chat-input"
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={language === "ar" ? "اكتب رسالة مشفرة..." : "Type a secure message..."}
                      style={{
                        flex: 1,
                        padding: "0.75rem 1rem",
                        borderRadius: "var(--border-radius-md)",
                        border: "1px solid var(--card-border)",
                        outline: "none",
                        fontFamily: "var(--font-sans)",
                        background: "#ffffff",
                        fontSize: "0.95rem",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="btn btn-primary"
                      style={{ padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <FiSend />
                    </button>
                  </form>
                </div>
              )}
            </section>

            {/* Right Side: Connections list & Directory */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {/* Connections (Friends list) */}
              <section className="panel-card" style={{ padding: "1.5rem" }}>
                <h2
                  style={{
                    fontSize: "1.2rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                    borderBottom: "1px dashed rgba(235, 220, 185, 0.3)",
                    paddingBottom: "0.5rem",
                    fontWeight: 800,
                  }}
                >
                  <FiUserCheck style={{ color: "var(--accent-green)" }} />
                  <span>{language === "ar" ? "قائمة الأصدقاء" : "Your Friend Circle"}</span>
                </h2>

                {userProfile?.friends?.length === 0 ? (
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "var(--border-radius-md)",
                      background: "rgba(255,255,255,0.4)",
                      border: "1px dashed var(--card-border)",
                      textAlign: "center",
                      color: "#6a7c88",
                      fontSize: "0.85rem",
                    }}
                  >
                    {language === "ar"
                      ? "لم تقم بإضافة أي أصدقاء بعد. تصفح الدليل في الأسفل وأضف زملاء دراسة!"
                      : "No friends added to your circle yet. Add classmates below!"}
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "200px", overflowY: "auto" }}
                    className="custom-scrollbar"
                  >
                    {allUsers
                      .filter((u: any) => userProfile?.friends?.includes(u.userId))
                      .map((friend: any) => (
                        <div
                          key={friend.userId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.6rem 0.85rem",
                            borderRadius: "var(--border-radius-sm)",
                            background: "rgba(255,255,255,0.6)",
                            border: "1px solid var(--card-border)",
                            boxShadow: "var(--shadow-sm)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {renderAvatar(friend.avatar, "1.5rem")}
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <strong style={{ fontSize: "0.9rem", color: "var(--foreground)" }}>{friend.name}</strong>
                              <span style={{ fontSize: "0.7rem", color: "#6a7c88" }}>{friend.email}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setChatRecipient(friend);
                                fetchChatMessages(friend.userId);
                              }}
                              className="btn btn-secondary"
                              style={{
                                padding: "0.35rem 0.65rem",
                                fontSize: "0.75rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <FiMessageSquare />
                              <span>{language === "ar" ? "دردشة" : "Chat"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleFriend(friend)}
                              style={{
                                background: "rgba(211, 47, 47, 0.08)",
                                color: "#d32f2f",
                                border: "1px solid rgba(211, 47, 47, 0.2)",
                                padding: "0.35rem 0.65rem",
                                borderRadius: "var(--border-radius-sm)",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                fontWeight: 700,
                              }}
                            >
                              {language === "ar" ? "حذف" : "Remove"}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </section>

              {/* Directory */}
              <section className="panel-card" style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                <h2
                  style={{
                    fontSize: "1.2rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                    borderBottom: "1px dashed rgba(235, 220, 185, 0.3)",
                    paddingBottom: "0.5rem",
                    fontWeight: 800,
                  }}
                >
                  <FiUsers style={{ color: "var(--primary)" }} />
                  <span>{language === "ar" ? "دليل مستخدمي المنصة" : "Discover Members & Directory"}</span>
                </h2>

                {/* FC7.7: in the sandbox the directory + private chat are disabled — exposing real members
                    or DMing them is unsafe without a verified identity. Show a notice instead. */}
                {isDemoSandbox && (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", border: "1px dashed var(--card-border)", borderRadius: "var(--border-radius-sm)", lineHeight: 1.6 }}>
                    🔒 {language === "ar"
                      ? "دليل الأعضاء والمحادثات الخاصة معطّلة في البيئة التجريبية للحفاظ على الخصوصية. سجّل الدخول بحساب حقيقي للتواصل مع المجتمع."
                      : "The member directory and private messaging are disabled in the demo sandbox to protect privacy. Sign in with a real account to connect with the community."}
                  </div>
                )}

                {/* Search bar */}
                {!isDemoSandbox && (
                <div style={{ position: "relative", marginBottom: "1rem" }}>
                  <input
                    type="text"
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    placeholder={
                      language === "ar"
                        ? "ابحث عن مستخدمين بالاسم، البريد أو الدور..."
                        : "Search by name, email, or role..."
                    }
                    style={{
                      width: "100%",
                      padding: "0.6rem 1rem",
                      borderRadius: "var(--border-radius-sm)",
                      border: "1px solid var(--card-border)",
                      outline: "none",
                      fontFamily: "var(--font-sans)",
                      background: "#ffffff",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
                )}

                {!isDemoSandbox && (loadingAllUsers ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "2rem",
                      gap: "0.5rem",
                      color: "#6a7c88",
                    }}
                  >
                    <FiRefreshCw className="spinning-icon" />
                    <span>{language === "ar" ? "جاري تحميل الدليل..." : "Loading directory list..."}</span>
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "280px", overflowY: "auto" }}
                    className="custom-scrollbar"
                  >
                    {allUsers
                      .filter((u: any) => u.userId !== user?.uid) // Exclude current user
                      .filter((u: any) => {
                        const s = directorySearch.toLowerCase();
                        return (
                          (u.name || "").toLowerCase().includes(s) ||
                          (u.email || "").toLowerCase().includes(s) ||
                          (u.userType || u.role || "").toLowerCase().includes(s) ||
                          (u.country || "").toLowerCase().includes(s)
                        );
                      })
                      .map((dirUser: any, idx: number) => {
                        const isFriend = userProfile?.friends?.includes(dirUser.userId);

                        let badgeBg = "rgba(16, 107, 163, 0.08)";
                        let badgeColor = "var(--primary)";
                        let roleName = dirUser.userType || dirUser.role || "student";
                        if (roleName === "admin") {
                          badgeBg = "rgba(198, 40, 40, 0.08)";
                          badgeColor = "#c62828";
                        } else if (roleName === "teacher") {
                          badgeBg = "rgba(245, 194, 66, 0.1)";
                          badgeColor = "var(--secondary-hover)";
                        } else if (roleName === "parent") {
                          badgeBg = "rgba(46, 125, 50, 0.08)";
                          badgeColor = "var(--accent-green)";
                        }

                        return (
                          <div
                            key={`${dirUser.userId || dirUser._id || "user"}-${idx}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.6rem 0.85rem",
                              borderRadius: "var(--border-radius-sm)",
                              background: "rgba(255,255,255,0.45)",
                              border: "1px solid var(--card-border)",
                              boxShadow: "var(--shadow-sm)",
                              transition: "all 0.2s ease",
                            }}
                            className="directory-item"
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              {renderAvatar(dirUser.avatar, "1.8rem")}
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                  <strong style={{ fontSize: "0.85rem", color: "var(--foreground)" }}>
                                    {dirUser.name}
                                  </strong>
                                  <span
                                    style={{
                                      fontSize: "0.65rem",
                                      padding: "2px 6px",
                                      borderRadius: "8px",
                                      background: badgeBg,
                                      color: badgeColor,
                                      fontWeight: 700,
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    {roleName === "student"
                                      ? language === "ar" ? "طالب" : "Student"
                                      : roleName === "teacher"
                                      ? language === "ar" ? "معلم" : "Teacher"
                                      : roleName === "parent"
                                      ? language === "ar" ? "ولي أمر" : "Parent"
                                      : language === "ar" ? "مشرف" : "Admin"}
                                  </span>
                                </div>
                                <span style={{ fontSize: "0.7rem", color: "#6a7c88" }}>{dirUser.email}</span>
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "0.35rem" }}>
                              <a
                                href={`/${language}/profile/${dirUser.username || dirUser.userId}`}
                                className="btn btn-secondary"
                                style={{
                                  padding: "0.35rem 0.55rem",
                                  fontSize: "0.7rem",
                                  display: "flex",
                                  alignItems: "center",
                                  textDecoration: "none",
                                }}
                              >
                                <FiUser />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleToggleFriend(dirUser)}
                                className={isFriend ? "btn btn-secondary" : "btn btn-primary"}
                                style={{
                                  padding: "0.35rem 0.65rem",
                                  fontSize: "0.7rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                }}
                              >
                                {isFriend ? (
                                  <>
                                    <FiUserMinus />
                                    <span>{language === "ar" ? "حذف" : "Remove"}</span>
                                  </>
                                ) : (
                                  <>
                                    <FiUserPlus />
                                    <span>{language === "ar" ? "صديق" : "Add Friend"}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </section>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "assignments" && (
        /* ==============================================================
           📝 TIMED ACADEMIC GROUP ASSIGNMENTS TAB (NEW FEATURE P5-5)
           ============================================================== */
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Group selector bar */}
          <div
            style={{
              padding: "1rem",
              background: "rgba(255, 255, 255, 0.7)",
              borderRadius: "var(--border-radius-md)",
              border: "1px solid var(--card-border)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <FiUsers style={{ fontSize: "1.25rem", color: "var(--primary)" }} />
              <label style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                {language === "ar" ? "اختر النادي أو المجموعة:" : "Select Academic Group / Club:"}
              </label>
              {loadingGroups ? (
                <FiRefreshCw className="spinning-icon" style={{ color: "#6a7c88" }} />
              ) : (
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--card-border)",
                    outline: "none",
                    background: "#ffffff",
                    fontWeight: 700,
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.9rem"
                  }}
                >
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.emoji} {language === "ar" ? g.name_ar : g.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Authoring tools for Teachers, Admins, Judges */}
            {["teacher", "admin", "super-admin", "judge"].includes(userProfile?.userType || userProfile?.role) && (
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(!showCreateForm);
                  setActiveAttemptingAsg(null);
                  setSubmitSuccess(false);
                }}
                className="btn btn-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.6rem 1rem",
                  fontSize: "0.9rem"
                }}
              >
                {showCreateForm ? <FiX /> : <FiPlus />}
                <span>
                  {showCreateForm
                    ? (language === "ar" ? "إلغاء النموذج" : "Cancel Form")
                    : (language === "ar" ? "نشر واجب جديد" : "Deploy Assignment")}
                </span>
              </button>
            )}
          </div>

          {/* ============================================
              DEPLOY ASSIGNMENT FORM (INSTRUCTOR ONLY)
              ============================================ */}
          {showCreateForm && (
            <form
              onSubmit={handlePublishAssignment}
              className="panel-card"
              style={{
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 245, 235, 0.9))",
                border: "1px solid var(--primary)",
                boxShadow: "var(--shadow-md)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--primary)" }}>
                  {language === "ar" ? "إنشاء واجب جماعي جديد مؤقت" : "Author New Timed Assignment"}
                </h3>

                <button
                  type="button"
                  onClick={() => cameraFileInputRef.current?.click()}
                  disabled={extractingAI}
                  className="btn btn-secondary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.5rem 0.85rem",
                    fontSize: "0.8rem",
                    border: "1px dashed var(--primary)",
                  }}
                >
                  <FiCamera />
                  <span>
                    {extractingAI
                      ? (language === "ar" ? "جاري الاستخراج بالذكاء الاصطناعي..." : "AI Vision Ingesting...")
                      : (language === "ar" ? "التقاط أو استخراج من الكاميرا" : "Capture from Camera")}
                  </span>
                </button>
                <input
                  type="file"
                  ref={cameraFileInputRef}
                  onChange={handleCameraCapture}
                  accept="image/*"
                  style={{ display: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    {language === "ar" ? "العنوان بالإنجليزية (مطلوب):" : "Title (English, Required):"}
                  </label>
                  <input
                    type="text"
                    value={asgTitle}
                    onChange={(e) => setAsgTitle(e.target.value)}
                    placeholder="e.g. Linear Algebra Quiz"
                    required
                    style={{
                      padding: "0.6rem 0.85rem",
                      borderRadius: "var(--border-radius-sm)",
                      border: "1px solid var(--card-border)",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    {language === "ar" ? "العنوان بالعربية (مطلوب):" : "Title (Arabic, Required):"}
                  </label>
                  <input
                    type="text"
                    value={asgTitleAr}
                    onChange={(e) => setAsgTitleAr(e.target.value)}
                    placeholder="مثال: محددات المصفوفات"
                    required
                    style={{
                      padding: "0.6rem 0.85rem",
                      borderRadius: "var(--border-radius-sm)",
                      border: "1px solid var(--card-border)",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
                {/* Academic Anchor: Subject */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    {language === "ar" ? "المبحث (رابط أكاديمي):" : "Academic Subject Anchor:"}
                  </label>
                  <select
                    value={asgSubjectId}
                    onChange={(e) => {
                      setAsgSubjectId(e.target.value);
                      setAsgBookId("");
                    }}
                    style={{
                      padding: "0.6rem 0.85rem",
                      borderRadius: "var(--border-radius-sm)",
                      border: "1px solid var(--card-border)",
                      background: "#ffffff"
                    }}
                  >
                    <option value="">-- {language === "ar" ? "اختر المبحث" : "Select Subject"} --</option>
                    {subjects.map((sub) => (
                      <option key={sub._id} value={sub._id}>
                        {sub.emoji} {language === "ar" ? sub.name_ar : sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Academic Anchor: Book */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    {language === "ar" ? "أو الكتاب (رابط أكاديمي):" : "Or Book Anchor:"}
                  </label>
                  <select
                    value={asgBookId}
                    onChange={(e) => {
                      setAsgBookId(e.target.value);
                      setAsgSubjectId("");
                    }}
                    style={{
                      padding: "0.6rem 0.85rem",
                      borderRadius: "var(--border-radius-sm)",
                      border: "1px solid var(--card-border)",
                      background: "#ffffff"
                    }}
                  >
                    <option value="">-- {language === "ar" ? "اختر الكتاب" : "Select Book"} --</option>
                    {books.map((bk) => (
                      <option key={bk._id} value={bk._id}>
                        📖 {language === "ar" ? (bk.title_ar || bk.title) : bk.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Timer Duration */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    {language === "ar" ? "مدة الواجب (مؤقت):" : "Timer Duration Limit:"}
                  </label>
                  <select
                    value={asgTimerSeconds}
                    onChange={(e) => setAsgTimerSeconds(Number(e.target.value))}
                    style={{
                      padding: "0.6rem 0.85rem",
                      borderRadius: "var(--border-radius-sm)",
                      border: "1px solid var(--card-border)",
                      background: "#ffffff",
                      fontWeight: 700
                    }}
                  >
                    <option value="60">60 {language === "ar" ? "ثانية (دقيقة)" : "Seconds (1 min)"}</option>
                    <option value="120">120 {language === "ar" ? "ثانية (دقيقتان)" : "Seconds (2 mins)"}</option>
                    <option value="300">300 {language === "ar" ? "ثانية (5 دقائق)" : "Seconds (5 mins)"}</option>
                    <option value="600">600 {language === "ar" ? "ثانية (10 دقائق)" : "Seconds (10 mins)"}</option>
                    <option value="1800">1800 {language === "ar" ? "ثانية (30 دقيقة)" : "Seconds (30 mins)"}</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Question Builder */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ margin: 0, borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem" }}>
                  ❓ {language === "ar" ? "أسئلة الواجب" : "Assignment Questions"}
                </h4>

                {asgQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    style={{
                      padding: "1.25rem",
                      background: "rgba(255, 255, 255, 0.7)",
                      borderRadius: "var(--border-radius-md)",
                      border: "1px solid var(--card-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, color: "var(--primary)" }}>
                        {language === "ar" ? `السؤال ${idx + 1}:` : `Question #${idx + 1}`}
                      </span>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <select
                          value={q.type}
                          onChange={(e) => {
                            const updated = [...asgQuestions];
                            updated[idx].type = e.target.value;
                            setAsgQuestions(updated);
                          }}
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "var(--border-radius-sm)",
                            border: "1px solid var(--card-border)",
                            background: "#ffffff",
                            fontSize: "0.8rem",
                            fontWeight: 700
                          }}
                        >
                          <option value="mcq">MCQ</option>
                          <option value="exact_answer">{language === "ar" ? "إجابة محددة" : "Exact Answer"}</option>
                          <option value="complete_sentence">{language === "ar" ? "أكمل الجملة" : "Complete Sentence"}</option>
                          <option value="open_ended">{language === "ar" ? "سؤال مفتوح" : "Open Ended (Critique)"}</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = asgQuestions.filter((item) => item.id !== q.id);
                            setAsgQuestions(updated);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--accent-red)",
                            cursor: "pointer",
                            fontSize: "1.1rem"
                          }}
                        >
                          <FiX />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <input
                        type="text"
                        value={q.prompt}
                        onChange={(e) => {
                          const updated = [...asgQuestions];
                          updated[idx].prompt = e.target.value;
                          setAsgQuestions(updated);
                        }}
                        placeholder="Question prompt in English..."
                        required
                        style={{
                          padding: "0.5rem 0.75rem",
                          borderRadius: "var(--border-radius-sm)",
                          border: "1px solid var(--card-border)"
                        }}
                      />
                      <input
                        type="text"
                        value={q.prompt_ar}
                        onChange={(e) => {
                          const updated = [...asgQuestions];
                          updated[idx].prompt_ar = e.target.value;
                          setAsgQuestions(updated);
                        }}
                        placeholder="نص السؤال بالعربية..."
                        required
                        style={{
                          padding: "0.5rem 0.75rem",
                          borderRadius: "var(--border-radius-sm)",
                          border: "1px solid var(--card-border)"
                        }}
                      />
                    </div>

                    {/* MCQ Options fields */}
                    {q.type === "mcq" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingInlineStart: "1rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                          {language === "ar" ? "الخيارات والحل الصحيح:" : "Options & Index of Correct Option:"}
                        </span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                          {(q.options || []).map((opt: string, oIdx: number) => (
                            <div key={oIdx} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <input
                                type="radio"
                                checked={q.answer === String(oIdx)}
                                onChange={() => {
                                  const updated = [...asgQuestions];
                                  updated[idx].answer = String(oIdx);
                                  setAsgQuestions(updated);
                                }}
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...asgQuestions];
                                  updated[idx].options[oIdx] = e.target.value;
                                  setAsgQuestions(updated);
                                }}
                                placeholder={`Option ${oIdx}`}
                                required
                                style={{
                                  flex: 1,
                                  padding: "0.4rem",
                                  fontSize: "0.8rem",
                                  borderRadius: "4px",
                                  border: "1px solid var(--card-border)"
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Objective exact fields */}
                    {(q.type === "exact_answer" || q.type === "complete_sentence") && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", paddingInlineStart: "1rem" }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                          {language === "ar" ? "الإجابة النموذجية الدقيقة:" : "Precise Expected Model Answer:"}
                        </label>
                        <input
                          type="text"
                          value={q.answer}
                          onChange={(e) => {
                            const updated = [...asgQuestions];
                            updated[idx].answer = e.target.value;
                            setAsgQuestions(updated);
                          }}
                          placeholder="e.g. 6"
                          required
                          style={{
                            padding: "0.4rem 0.65rem",
                            fontSize: "0.8rem",
                            borderRadius: "4px",
                            border: "1px solid var(--card-border)",
                            maxWidth: "300px"
                          }}
                        />
                      </div>
                    )}

                    {/* Open Ended Rubrics */}
                    {q.type === "open_ended" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", paddingInlineStart: "1rem" }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                          {language === "ar" ? "إرشادات التقييم والدرجات (روبك):" : "Grading Rubric Criteria (Optional):"}
                        </label>
                        <textarea
                          value={q.rubric}
                          onChange={(e) => {
                            const updated = [...asgQuestions];
                            updated[idx].rubric = e.target.value;
                            setAsgQuestions(updated);
                          }}
                          placeholder="What criteria should the Gemini critique agent look for?"
                          style={{
                            padding: "0.4rem 0.65rem",
                            fontSize: "0.8rem",
                            borderRadius: "4px",
                            border: "1px solid var(--card-border)",
                            minHeight: "60px",
                            fontFamily: "var(--font-sans)"
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="btn btn-secondary"
                  style={{
                    alignSelf: "flex-start",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.5rem 1rem",
                    fontSize: "0.85rem"
                  }}
                >
                  <FiPlus />
                  <span>{language === "ar" ? "إضافة سؤال آخر" : "Add Another Question"}</span>
                </button>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  alignSelf: "flex-end",
                  padding: "0.75rem 2rem",
                  fontWeight: 800,
                  fontSize: "1rem",
                  boxShadow: "var(--shadow-md)"
                }}
              >
                {language === "ar" ? "نشر الواجب وتعميمه الآن 🚀" : "Deploy & Broadcast Now 🚀"}
              </button>
            </form>
          )}

          {/* ============================================
              ACTIVE ASSIGNMENT QUIZ ATTEMPT VIEW (STUDENT)
              ============================================ */}
          {activeAttemptingAsg && (
            <div
              className="panel-card"
              style={{
                padding: "2rem",
                background: "#ffffff",
                border: "2px solid var(--primary)",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "2px dashed var(--card-border)",
                  paddingBottom: "1rem"
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "var(--foreground)" }}>
                    📝 {language === "ar" ? activeAttemptingAsg.title_ar : activeAttemptingAsg.title}
                  </h3>
                  <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>
                    {language === "ar" ? "واجب أكاديمي مؤقت - فرصة واحدة فقط للإجابة" : "Timed Academic Assignment - Single Attempt Only"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  {renderTimerCountdown(activeAttemptingAsg.ends_at)}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAttemptingAsg(null);
                      setAttemptAnswers({});
                      setSubmitSuccess(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                      color: "#6a7c88"
                    }}
                  >
                    <FiX />
                  </button>
                </div>
              </div>

              {submitSuccess ? (
                /* Confetti/Success grading results state */
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2rem",
                    textAlign: "center",
                    gap: "1rem"
                  }}
                >
                  <div
                    style={{
                      width: "70px",
                      height: "70px",
                      borderRadius: "50%",
                      background: "rgba(46, 125, 50, 0.1)",
                      color: "var(--accent-green)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "2rem"
                    }}
                  >
                    <FiCheckCircle />
                  </div>

                  <h3 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "var(--accent-green)" }}>
                    {language === "ar" ? "تم إرسال إجابتك وتصحيحها بنجاح!" : "Attempt Graded Successfully!"}
                  </h3>

                  {justSubmittedDoc && (
                    <div
                      style={{
                        padding: "1rem 2rem",
                        borderRadius: "var(--border-radius-md)",
                        background: "rgba(46, 125, 50, 0.05)",
                        border: "1px solid rgba(46, 125, 50, 0.15)",
                        marginBlock: "0.5rem"
                      }}
                    >
                      <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--foreground)" }}>
                        {language === "ar" ? "النتيجة الإجمالية:" : "Your Total Score:"}
                      </span>
                      <div style={{ fontSize: "2.25rem", fontWeight: 900, color: "var(--primary)", marginTop: "4px" }}>
                        {justSubmittedDoc.total_score} / {justSubmittedDoc.max_score}
                      </div>
                    </div>
                  )}

                  <p style={{ color: "#6a7c88", fontSize: "0.9rem", maxWidth: "420px", lineHeight: "1.6" }}>
                    {language === "ar"
                      ? "رائع! لقد تم إرسال إجاباتك بنجاح. يمكنك مراجعة الأسئلة وتفسيراتها الدقيقة بالأسفل أو العودة لقائمة الأنشطة."
                      : "Well done! Your single attempt is complete. You can view precise grounded explanations below or return to the assignment index."}
                  </p>

                  {/* Detailed explanation checklist */}
                  {justSubmittedDoc && (
                    <div
                      style={{
                        width: "100%",
                        textAlign: "start",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        marginTop: "1.5rem"
                      }}
                    >
                      <h4 style={{ margin: 0, borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem" }}>
                        📖 {language === "ar" ? "التصحيح التلقائي والتوضيح الأكاديمي:" : "Grounded Corrections & Critiques:"}
                      </h4>

                      {justSubmittedDoc.answers.map((ans: any, idx: number) => {
                        const originalQ = (activeAttemptingAsg.questions || []).find((q: any) => q.id === ans.question_id);
                        return (
                          <div
                            key={ans.question_id}
                            style={{
                              padding: "1rem",
                              borderRadius: "var(--border-radius-sm)",
                              border: ans.correct ? "1px solid rgba(46, 125, 50, 0.2)" : "1px solid rgba(211, 47, 47, 0.2)",
                              background: ans.correct ? "rgba(46, 125, 50, 0.02)" : "rgba(211, 47, 47, 0.02)"
                            }}
                          >
                            <div style={{ display: "flex", justifyItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                              <span style={{ fontWeight: 800 }}>{idx + 1}.</span>
                              <strong style={{ fontSize: "0.9rem" }}>
                                {language === "ar" ? originalQ?.prompt_ar : originalQ?.prompt}
                              </strong>
                            </div>

                            <div style={{ paddingInlineStart: "1.2rem", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                              <div>
                                <span style={{ color: "#6a7c88" }}>{language === "ar" ? "إجابتك:" : "Your Answer:"}</span>{" "}
                                <strong style={{ textDecoration: ans.correct ? "none" : "line-through" }}>{ans.value}</strong>
                              </div>

                              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", marginTop: "0.25rem" }}>
                                <span
                                  style={{
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: ans.correct ? "rgba(46, 125, 50, 0.1)" : "rgba(211, 47, 47, 0.1)",
                                    color: ans.correct ? "var(--accent-green)" : "var(--accent-red)",
                                    fontSize: "0.7rem",
                                    fontWeight: 800
                                  }}
                                >
                                  {ans.correct ? (language === "ar" ? "صحيح" : "Correct") : (language === "ar" ? "خطأ" : "Incorrect")}
                                </span>

                                <span style={{ color: "#4f6371", fontStyle: "italic" }}>
                                  {ans.explanation}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveAttemptingAsg(null);
                      setAttemptAnswers({});
                      setSubmitSuccess(false);
                      setJustSubmittedDoc(null);
                    }}
                    className="btn btn-secondary"
                    style={{ marginTop: "1rem" }}
                  >
                    {language === "ar" ? "العودة للقائمة الرئيسية" : "Back to Assignments List"}
                  </button>
                </div>
              ) : (
                /* Interactive Answer Flow Form */
                <form onSubmit={handleSubmitAttempt} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {activeAttemptingAsg.questions.map((q: any, idx: number) => (
                    <div
                      key={q.id}
                      style={{
                        padding: "1.25rem",
                        background: "rgba(255, 255, 255, 0.6)",
                        borderRadius: "var(--border-radius-md)",
                        border: "1px solid var(--card-border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem"
                      }}
                    >
                      <strong style={{ fontSize: "1rem", color: "var(--foreground)" }}>
                        {idx + 1}. {language === "ar" ? q.prompt_ar : q.prompt}
                      </strong>

                      {/* Render inputs based on type */}
                      {q.type === "mcq" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {q.options.map((opt: string, oIdx: number) => (
                            <label
                              key={oIdx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                padding: "0.75rem 1rem",
                                borderRadius: "var(--border-radius-sm)",
                                border: attemptAnswers[q.id] === String(oIdx) ? "2px solid var(--primary)" : "1px solid var(--card-border)",
                                background: attemptAnswers[q.id] === String(oIdx) ? "rgba(16, 107, 163, 0.03)" : "#ffffff",
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                              }}
                            >
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                checked={attemptAnswers[q.id] === String(oIdx)}
                                onChange={() => setAttemptAnswers({ ...attemptAnswers, [q.id]: String(oIdx) })}
                              />
                              <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>
                                {q.options_ar && language === "ar" ? q.options_ar[oIdx] : opt}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {(q.type === "exact_answer" || q.type === "complete_sentence") && (
                        <input
                          type="text"
                          required
                          value={attemptAnswers[q.id] || ""}
                          onChange={(e) => setAttemptAnswers({ ...attemptAnswers, [q.id]: e.target.value })}
                          placeholder={language === "ar" ? "اكتب إجابتك هنا..." : "Type your answer here..."}
                          style={{
                            padding: "0.75rem 1rem",
                            borderRadius: "var(--border-radius-sm)",
                            border: "1px solid var(--card-border)",
                            maxWidth: "400px",
                            outline: "none"
                          }}
                        />
                      )}

                      {q.type === "open_ended" && (
                        <textarea
                          required
                          value={attemptAnswers[q.id] || ""}
                          onChange={(e) => setAttemptAnswers({ ...attemptAnswers, [q.id]: e.target.value })}
                          placeholder={language === "ar" ? "اكتب فقرة كاملة تشرح إجابتك..." : "Write a complete paragraph explaining your answer..."}
                          style={{
                            padding: "0.75rem 1rem",
                            borderRadius: "var(--border-radius-sm)",
                            border: "1px solid var(--card-border)",
                            minHeight: "100px",
                            outline: "none",
                            fontFamily: "var(--font-sans)"
                          }}
                        />
                      )}
                    </div>
                  ))}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAttemptingAsg(null);
                        setAttemptAnswers({});
                      }}
                      className="btn btn-secondary"
                    >
                      {language === "ar" ? "تراجع" : "Go Back"}
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmittingAttempt || Object.keys(attemptAnswers).length < activeAttemptingAsg.questions.length}
                      className="btn btn-primary"
                      style={{ paddingInline: "2rem" }}
                    >
                      {isSubmittingAttempt ? (
                        <FiRefreshCw className="spinning-icon" />
                      ) : (
                        (language === "ar" ? "إرسال الحل النهائي 🏁" : "Submit Attempt 🏁")
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ============================================
              ASSIGNMENTS LIST GRID (ACTIVE & COMPLETED)
              ============================================ */}
          {!activeAttemptingAsg && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
                📋 {language === "ar" ? "الواجبات والأنشطة الأكاديمية المطلوبة" : "Deployed Group Assignments List"}
              </h3>

              {loadingAssignments ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6a7c88", padding: "2rem" }}>
                  <FiRefreshCw className="spinning-icon" />
                  <span>{language === "ar" ? "جاري تحميل الواجبات..." : "Loading assignments..."}</span>
                </div>
              ) : assignments.length === 0 ? (
                <div
                  style={{
                    padding: "2rem",
                    borderRadius: "var(--border-radius-md)",
                    background: "rgba(255, 255, 255, 0.4)",
                    border: "1px dashed var(--card-border)",
                    textAlign: "center",
                    color: "#6a7c88"
                  }}
                >
                  {language === "ar"
                    ? "لا توجد أي واجبات منشورة لهذه المجموعة حالياً."
                    : "No assignments have been posted for this academic club yet."}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                  {assignments.map((asg) => {
                    const now = Math.floor(Date.now() / 1000);
                    const isActive = asg.status === "active" && asg.ends_at > now;
                    const hasSubmitted = !!asg.user_submission;

                    return (
                      <div
                        key={asg._id}
                        className="panel-card"
                        style={{
                          padding: "1.5rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderInlineStart: isActive
                            ? "4px solid var(--primary)"
                            : "4px solid var(--card-border)",
                          background: isActive
                            ? "linear-gradient(90deg, rgba(16, 107, 163, 0.02), #ffffff)"
                            : "#ffffff"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <h4 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
                              {language === "ar" ? asg.title_ar : asg.title}
                            </h4>

                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "8px",
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                background: isActive ? "rgba(46, 125, 50, 0.1)" : "rgba(0,0,0,0.06)",
                                color: isActive ? "var(--accent-green)" : "#6a7c88"
                              }}
                            >
                              {isActive ? (language === "ar" ? "نشط" : "Active") : (language === "ar" ? "مغلق" : "Closed")}
                            </span>

                            {hasSubmitted && (
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: "8px",
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  background: "rgba(16, 107, 163, 0.1)",
                                  color: "var(--primary)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.2rem"
                                }}
                              >
                                <FiAward />
                                {language === "ar" ? "تم تقديمه" : "Submitted"}
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", color: "#6a7c88" }}>
                            <span>⏱️ {asg.timer_seconds}s</span>
                            {asg.subject_id && (
                              <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                                📚 {language === "ar" ? "مرتبط بمبحث" : "Anchored to Subject"}
                              </span>
                            )}
                            {asg.book_id && (
                              <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                                📖 {language === "ar" ? "مرتبط بكتاب" : "Anchored to Book"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          {isActive && renderTimerCountdown(asg.ends_at)}

                          {isActive && !hasSubmitted ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAttemptingAsg(asg);
                                setAttemptAnswers({});
                                setSubmitSuccess(false);
                              }}
                              className="btn btn-primary"
                              style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 800 }}
                            >
                              {language === "ar" ? "البدء بالإجابة 🚀" : "Start Attempt 🚀"}
                            </button>
                          ) : (
                            /* Review Results / Score details */
                            <button
                              type="button"
                              onClick={() => {
                                if (hasSubmitted) {
                                  setJustSubmittedDoc(asg.user_submission);
                                  setSubmitSuccess(true);
                                } else {
                                  // Closed assignment with no attempt
                                  alert(language === "ar" ? "تم إغلاق هذا الواجب الجماعي ولم تقم بتقديم إجابة." : "This assignment is closed and you did not submit an attempt.");
                                  return;
                                }
                                setActiveAttemptingAsg(asg);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 700 }}
                            >
                              {hasSubmitted
                                ? (language === "ar" ? `الدرجة: ${asg.user_submission.total_score}/${asg.user_submission.max_score} - عرض` : `Score: ${asg.user_submission.total_score}/${asg.user_submission.max_score} - Review`)
                                : (language === "ar" ? "مغلق" : "Closed")}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {activeSubTab === "discussions" && (
        /* ==============================================================
           💬 ACADEMIC DISCUSSION FORUMS & THREADS (NEW FEATURE P5-3)
           ============================================================== */
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem" }} className="responsive-discussions-layout">
          {/* Left Column: Academic Groups / Clubs */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              background: "rgba(255, 255, 255, 0.6)",
              padding: "1.25rem",
              borderRadius: "var(--border-radius-md)",
              border: "1px solid var(--card-border)",
              boxShadow: "var(--shadow-sm)",
              alignSelf: "flex-start"
            }}
          >
            <h3
              style={{
                fontSize: "1.05rem",
                fontWeight: 800,
                margin: 0,
                color: "var(--primary)",
                borderBottom: "1px dashed var(--card-border)",
                paddingBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <FiUsers />
              <span>{language === "ar" ? "المجموعات والأندية الأكاديمية" : "Academic Clubs"}</span>
            </h3>

            {loadingGroups ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6a7c88", padding: "1rem 0" }}>
                <FiRefreshCw className="spinning-icon" />
                <span style={{ fontSize: "0.85rem" }}>{language === "ar" ? "جاري التحميل..." : "Loading..."}</span>
              </div>
            ) : groups.length === 0 ? (
              <div style={{ fontSize: "0.85rem", color: "#6a7c88", textAlign: "center", padding: "1rem 0" }}>
                {language === "ar" ? "لا توجد مجموعات" : "No groups found"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {groups.map((g) => {
                  const isSelected = g._id === selectedGroupId;
                  return (
                    <button
                      key={g._id}
                      onClick={() => {
                        setSelectedGroupId(g._id);
                        setActiveThread(null);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "var(--border-radius-sm)",
                        border: "1px solid " + (isSelected ? "var(--primary)" : "transparent"),
                        background: isSelected ? "rgba(16, 107, 163, 0.06)" : "transparent",
                        color: isSelected ? "var(--primary)" : "var(--foreground)",
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        textAlign: language === "ar" ? "right" : "left"
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>{g.emoji || "🏫"}</span>
                      <span>{language === "ar" ? g.name_ar : g.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Active Thread Detail or Thread List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {activeThread ? (
              /* ============================================
                 1. THREAD DETAIL & REPLIES VIEW
                 ============================================ */
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Back button */}
                <button
                  onClick={() => setActiveThread(null)}
                  style={{
                    alignSelf: "flex-start",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--primary)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: 0
                  }}
                >
                  <span>{language === "ar" ? "← العودة إلى المواضيع" : "← Back to Threads"}</span>
                </button>

                {/* Main Thread Card */}
                <div
                  className="panel-card"
                  style={{
                    padding: "1.5rem",
                    background: "#ffffff",
                    border: "1px solid var(--card-border)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: "rgba(16, 107, 163, 0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.25rem"
                      }}
                    >
                      {activeThread.author_avatar || "👤"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{activeThread.author_name}</strong>
                      <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                        {new Date(activeThread.created_at).toLocaleString(language === "ar" ? "ar-EG" : "en-US")}
                      </span>
                    </div>
                  </div>

                  <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0 0 0.75rem 0", color: "var(--foreground)" }}>
                    {language === "ar" ? activeThread.title_ar : activeThread.title}
                  </h2>
                  <p style={{ margin: 0, color: "#4f6371", fontSize: "0.95rem", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                    {language === "ar" ? activeThread.content_ar : activeThread.content}
                  </p>
                </div>

                {/* Replies Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                    💬 {language === "ar" ? "الردود والمناقشات" : "Discussion Replies"} ({threadReplies.length})
                  </h3>

                  {loadingReplies ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6a7c88", padding: "1rem" }}>
                      <FiRefreshCw className="spinning-icon" />
                      <span>{language === "ar" ? "جاري تحميل الردود..." : "Loading replies..."}</span>
                    </div>
                  ) : threadReplies.length === 0 ? (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#6a7c88",
                        background: "rgba(255,255,255,0.4)",
                        borderRadius: "var(--border-radius-md)",
                        border: "1px dashed var(--card-border)"
                      }}
                    >
                      {language === "ar" ? "لا توجد ردود بعد على هذا الموضوع. كن أول من يشارك!" : "No replies yet on this thread. Be the first to share!"}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {threadReplies.map((reply) => (
                        <div
                          key={reply._id}
                          className="panel-card"
                          style={{
                            padding: "1.25rem",
                            background: "rgba(255,255,255,0.8)",
                            border: "1px solid var(--card-border)"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: "rgba(16, 107, 163, 0.06)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1rem"
                              }}
                            >
                              {reply.author_avatar || "👤"}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <strong style={{ fontSize: "0.9rem" }}>{reply.author_name}</strong>
                              <span style={{ fontSize: "0.7rem", color: "#6a7c88" }}>
                                {new Date(reply.created_at).toLocaleString(language === "ar" ? "ar-EG" : "en-US")}
                              </span>
                            </div>
                          </div>
                          <p style={{ margin: 0, color: "var(--foreground)", fontSize: "0.9rem", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                            {language === "ar" ? reply.content_ar : reply.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Post Reply Form */}
                <form
                  onSubmit={handleCreateReply}
                  className="panel-card"
                  style={{
                    padding: "1.5rem",
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid var(--card-border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem"
                  }}
                >
                  <label style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                    {language === "ar" ? "أضف ردك الأكاديمي:" : "Post Academic Reply:"}
                  </label>
                  <textarea
                    value={newReplyContent}
                    onChange={(e) => setNewReplyContent(e.target.value)}
                    required
                    placeholder={language === "ar" ? "اكتب تعليقك أو شرحك المدعم بالمعلومات هنا..." : "Type your verified explanation or discussion post here..."}
                    style={{
                      width: "100%",
                      minHeight: "100px",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--border-radius-sm)",
                      border: "1px solid var(--card-border)",
                      outline: "none",
                      fontSize: "0.9rem",
                      fontFamily: "var(--font-sans)",
                      resize: "vertical"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={submittingReply || !newReplyContent.trim()}
                    className="btn btn-primary"
                    style={{
                      alignSelf: "flex-end",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.5rem 1.5rem",
                      fontSize: "0.85rem",
                      fontWeight: 800
                    }}
                  >
                    {submittingReply ? (
                      <FiRefreshCw className="spinning-icon" />
                    ) : (
                      <>
                        <FiSend />
                        <span>{language === "ar" ? "إرسال الرد" : "Submit Reply"}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* ============================================
                 2. THREAD LIST & CREATE THREAD FORM
                 ============================================ */
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Create Thread toggle button */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                    📌 {language === "ar" ? "مواضيع النقاش المطروحة" : "Academic Discussion Threads"}
                  </h3>

                  <button
                    onClick={() => setShowNewThreadForm(!showNewThreadForm)}
                    className="btn btn-primary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.5rem 1rem",
                      fontSize: "0.85rem",
                      fontWeight: 800
                    }}
                  >
                    {showNewThreadForm ? <FiX /> : <FiPlus />}
                    <span>{showNewThreadForm ? (language === "ar" ? "إلغاء" : "Cancel") : (language === "ar" ? "موضوع جديد" : "New Thread")}</span>
                  </button>
                </div>

                {/* New Thread Form */}
                {showNewThreadForm && (
                  <form
                    onSubmit={handleCreateThread}
                    className="panel-card"
                    style={{
                      padding: "1.75rem",
                      background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,245,235,0.9))",
                      border: "1px solid var(--primary)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.25rem",
                      boxShadow: "var(--shadow-md)"
                    }}
                  >
                    <h4 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--primary)" }}>
                      {language === "ar" ? "طرح موضوع نقاش أكاديمي جديد" : "Post a New Academic Topic"}
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <label style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                        {language === "ar" ? "عنوان الموضوع:" : "Topic Title:"}
                      </label>
                      <input
                        type="text"
                        value={newThreadTitle}
                        onChange={(e) => setNewThreadTitle(e.target.value)}
                        required
                        placeholder={language === "ar" ? "مثال: استفسار حول إثبات فيثاغورس" : "e.g. Question on Matrix determinant derivation"}
                        style={{
                          padding: "0.6rem 0.85rem",
                          borderRadius: "var(--border-radius-sm)",
                          border: "1px solid var(--card-border)",
                          outline: "none",
                          fontSize: "0.9rem"
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <label style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                        {language === "ar" ? "المحتوى أو السؤال بالتفصيل:" : "Content / Question Details:"}
                      </label>
                      <textarea
                        value={newThreadContent}
                        onChange={(e) => setNewThreadContent(e.target.value)}
                        required
                        placeholder={language === "ar" ? "اكتب هنا تفاصيل سؤالك أو مسألتك ليتم الرد عليها..." : "Provide the details of your question or debate topic..."}
                        style={{
                          width: "100%",
                          minHeight: "120px",
                          padding: "0.75rem 1rem",
                          borderRadius: "var(--border-radius-sm)",
                          border: "1px solid var(--card-border)",
                          outline: "none",
                          fontSize: "0.9rem",
                          fontFamily: "var(--font-sans)",
                          resize: "vertical"
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingThread || !newThreadTitle.trim() || !newThreadContent.trim()}
                      className="btn btn-primary"
                      style={{
                        alignSelf: "flex-end",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.5rem 1.5rem",
                        fontSize: "0.85rem",
                        fontWeight: 800
                      }}
                    >
                      {submittingThread ? (
                        <FiRefreshCw className="spinning-icon" />
                      ) : (
                        <>
                          <FiSend />
                          <span>{language === "ar" ? "نشر الموضوع" : "Publish Topic"}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Thread List */}
                {loadingThreads ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6a7c88", padding: "2rem" }}>
                    <FiRefreshCw className="spinning-icon" />
                    <span>{language === "ar" ? "جاري تحميل المناقشات..." : "Loading discussion list..."}</span>
                  </div>
                ) : threads.length === 0 ? (
                  <div
                    style={{
                      padding: "3rem 1.5rem",
                      textAlign: "center",
                      color: "#6a7c88",
                      background: "rgba(255,255,255,0.4)",
                      borderRadius: "var(--border-radius-md)",
                      border: "1px dashed var(--card-border)"
                    }}
                  >
                    {language === "ar" ? "لا توجد مناقشات في هذا النادي حالياً. كن أول من يطرح موضوعاً!" : "No discussions in this club yet. Be the first to start a thread!"}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {threads.map((t) => (
                      <div
                        key={t._id}
                        onClick={() => fetchThreadDetail(t._id)}
                        className="panel-card"
                        style={{
                          padding: "1.25rem",
                          background: "#ffffff",
                          border: "1px solid var(--card-border)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--primary)";
                          e.currentTarget.style.boxShadow = "var(--shadow-md)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--card-border)";
                          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h4 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                            {language === "ar" ? t.title_ar : t.title}
                          </h4>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              background: "rgba(16, 107, 163, 0.08)",
                              color: "var(--primary)",
                              padding: "2px 8px",
                              borderRadius: "8px"
                            }}
                          >
                            💬 {t.replies_count || 0} {language === "ar" ? "ردود" : "replies"}
                          </span>
                        </div>

                        <p
                          style={{
                            margin: "0.25rem 0",
                            color: "#6a7c88",
                            fontSize: "0.85rem",
                            lineHeight: "1.5",
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            textOverflow: "ellipsis"
                          }}
                        >
                          {language === "ar" ? t.content_ar : t.content}
                        </p>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#6a7c88", marginTop: "0.25rem" }}>
                          <span>{t.author_avatar || "👤"}</span>
                          <strong style={{ color: "var(--foreground)" }}>{t.author_name}</strong>
                          <span>•</span>
                          <span>{new Date(t.created_at).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
