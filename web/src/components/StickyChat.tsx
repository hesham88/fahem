"use client";

import React, { useState, useEffect, useRef } from "react";
import { auth, storage } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useTranslation } from "../context/LanguageContext";
import { 
  FiMessageSquare, 
  FiX, 
  FiSend, 
  FiCpu, 
  FiShield, 
  FiLayers, 
  FiInfo, 
  FiZap,
  FiTerminal,
  FiCornerDownRight,
  FiCompass,
  FiGlobe,
  FiClock,
  FiPlus,
  FiTrash2,
  FiRefreshCw,
  FiFileText,
  FiMaximize2,
  FiSidebar,
  FiMinimize2
} from "react-icons/fi";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  activeAgent?: string;
}

export default function StickyChat() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [useGrounded, setUseGrounded] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string>("");
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  // Layout & Context States
  const [layoutMode, setLayoutMode] = useState<"compact" | "side" | "fullscreen">("compact");
  const [bookContext, setBookContext] = useState<any>(null);

  // Mentions Dropdown States
  const [mentionType, setMentionType] = useState<"subject" | "book" | "command" | null>(null);
  const [mentionSearch, setMentionQuery] = useState<string>("");
  const [showMentionsDropdown, setShowMentionsDropdown] = useState<boolean>(false);

  // Saved Chats States
  const [sessions, setSessions] = useState<any[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);

  const { language, dir, t } = useTranslation();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatLogsEndRef = useRef<HTMLDivElement>(null);
  const sendMessageRef = useRef<((text?: string) => Promise<void>) | undefined>(undefined);

  // Initialize welcome message based on language
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          text: language === "ar" 
            ? "مرحباً بك في فاهم! 🧠 شبكة معلميك الخبراء بالذكاء الاصطناعي في جيبك. أنا جاهز لمساعدتك في مذاكرة كتبك ومصادرك الدراسية، الإجابة عن أسئلتك مع توثيق الصفحة الدقيقة، وضع جداول دراسية ذكية، خوض اختبارات تفاعلية، والممارسة الشفهية! ما المادة أو الكتاب الذي تود مذاكرته اليوم؟" 
            : "Welcome to Fahem! 🧠 Your Swarm of AI Tutors, in your pocket. I am ready to help you study your books and learning resources, get page-cited answers, build dynamic study schedules, take adaptive quizzes, and practice orally! Which subject or book are we studying today?",
          timestamp: new Date()
        }
      ]);
    }
  }, [language, messages.length]);

  // Sync authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Saved Chats on Open
  useEffect(() => {
    if (user && isOpen) {
      fetchSessions(user.uid);
    }
  }, [user, isOpen]);

  // Listen to custom textbook context changes from page.tsx
  useEffect(() => {
    const handleContextChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setBookContext(detail);
        setIsOpen(true);
        setLayoutMode("side"); // Auto-expand to premium side-by-side mode!
        
        if (detail.autoExplainText) {
          const autoExplainPrompt = language === "ar"
            ? `اشرح لي هذا الجزء بالتفصيل وبأسلوب مبسط: "${detail.autoExplainText}"`
            : `Please explain this excerpt in detail and in simple terms: "${detail.autoExplainText}"`;
          setTimeout(() => {
            if (sendMessageRef.current) {
              sendMessageRef.current(autoExplainPrompt);
            }
          }, 400);
        }
      } else {
        setBookContext(null);
        setLayoutMode("compact"); // Revert back to compact when leaving reader
      }
    };
    window.addEventListener("fahemBookContext", handleContextChange);
    return () => window.removeEventListener("fahemBookContext", handleContextChange);
  }, [language]);

  // Manage layout class on body for side-panel push effect
  useEffect(() => {
    if (isOpen && layoutMode === "side") {
      document.body.classList.add("companion-side-open");
    } else {
      document.body.classList.remove("companion-side-open");
    }
    return () => {
      document.body.classList.remove("companion-side-open");
    };
  }, [isOpen, layoutMode]);

  // Scroll messages to bottom on change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeAgent]);

  // Scroll logs to bottom on change
  useEffect(() => {
    if (chatLogsEndRef.current) {
      chatLogsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [sessionLogs]);

  async function fetchSessions(userIdVal?: string) {
    const activeUserId = userIdVal || user?.uid;
    if (!activeUserId) return;
    setIsSessionsLoading(true);
    try {
      const response = await fetch(`/api/history?userId=${encodeURIComponent(activeUserId)}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Error fetching sessions in companion:", err);
    } finally {
      setIsSessionsLoading(false);
    }
  }

  async function loadSession(sessionIdVal: string) {
    if (!sessionIdVal) return;
    setIsSessionsLoading(true);
    try {
      const response = await fetch(`/api/history/detail?sessionId=${encodeURIComponent(sessionIdVal)}`);
      if (response.ok) {
        const data = await response.json();
        const sess = data.session;
        if (sess) {
          setCurrentSessionId(sess.sessionId);
          // Map session messages to Message interface
          const mappedMsgs: Message[] = (sess.messages || []).map((m: any, index: number) => ({
            id: `msg-${index}-${Date.now()}`,
            role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
            text: m.content || m.text || "",
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          }));
          setMessages(mappedMsgs.length > 0 ? mappedMsgs : [
            {
              id: "welcome",
              role: "assistant",
              text: language === "ar"
                ? "مرحباً بك مجدداً في هذه المحادثة! كيف يمكنني مساعدتك أكثر؟"
                : "Welcome back to this conversation! How can I assist you further?",
              timestamp: new Date()
            }
          ]);
          setShowHistory(false); // Close history drawer
        }
      }
    } catch (err) {
      console.error("Error loading session in companion:", err);
    } finally {
      setIsSessionsLoading(false);
    }
  }

  async function deleteSession(sessionIdVal: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!sessionIdVal) return;
    const confirmMsg = language === "ar" 
      ? "هل أنت متأكد من حذف هذه المحادثة؟" 
      : "Are you sure you want to delete this chat session?";
    if (!confirm(confirmMsg)) {
      return;
    }
    try {
      const response = await fetch(`/api/history?sessionId=${encodeURIComponent(sessionIdVal)}`, {
        method: "DELETE"
      });
      if (response.ok) {
        if (currentSessionId === sessionIdVal) {
          startNewChat();
        }
        await fetchSessions();
      }
    } catch (err) {
      console.error("Error deleting session in companion:", err);
    }
  }

  const startNewChat = () => {
    setCurrentSessionId("");
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        text: language === "ar" 
          ? "مرحباً بك في فاهم! 🧠 شبكة معلميك الخبراء بالذكاء الاصطناعي في جيبك. أنا جاهز لمساعدتك في مذاكرة كتبك ومصادرك الدراسية، الإجابة عن أسئلتك مع توثيق الصفحة الدقيقة، وضع جداول دراسية ذكية، خوض اختبارات تفاعلية، والممارسة الشفهية! ما المادة أو الكتاب الذي تود مذاكرته اليوم؟" 
          : "Welcome to Fahem! 🧠 Your Swarm of AI Tutors, in your pocket. I am ready to help you study your books and learning resources, get page-cited answers, build dynamic study schedules, take adaptive quizzes, and practice orally! Which subject or book are we studying today?",
        timestamp: new Date()
      }
    ]);
    setSessionLogs([]);
    setShowHistory(false);
  };

  const getMentionOptions = () => {
    if (mentionType === "subject") {
      const opts = [
        { id: "@math", label: language === "ar" ? "➕ الرياضيات" : "📊 Math", desc: language === "ar" ? "مواضيع الجبر والإحصاء" : "Algebra & Statistics" },
        { id: "@science", label: language === "ar" ? "🧪 العلوم" : "🧬 Science", desc: language === "ar" ? "الأحياء والفيزياء والكيمياء" : "Biology, Physics, Chem" },
        { id: "@arabic", label: language === "ar" ? "📖 اللغة العربية" : "✍️ Arabic", desc: language === "ar" ? "قواعد النحو واللغة" : "Arabic Linguistics & Grammar" },
        { id: "@history", label: language === "ar" ? "🌍 التاريخ" : "🏛️ History", desc: language === "ar" ? "الدراسات الاجتماعية والتاريخية" : "Modern History & Social Studies" }
      ];
      return opts.filter(o => o.id.toLowerCase().includes(mentionSearch.toLowerCase()));
    }
    if (mentionType === "book") {
      const opts = [
        { id: "#college-algebra", label: "📚 College Algebra 2e", desc: language === "ar" ? "مرجع الجبر من OpenStax" : "OpenStax Algebra Textbook" },
        { id: "#chemistry-handbook", label: "🧪 Chemistry 2e", desc: language === "ar" ? "مرجع الكيمياء العامة" : "OpenStax Chemistry Volume" },
        { id: "#arabic-grammar", label: "✍️ كتاب النحو المبسط", desc: language === "ar" ? "كتاب شرح قواعد اللغة" : "Simplified Arabic Grammar Rules" },
        { id: "#middleeast-history", label: "🌍 Middle East History", desc: language === "ar" ? "مرجع التاريخ الحديث والمعاصر" : "Modern Middle East History Guide" }
      ];
      return opts.filter(o => o.id.toLowerCase().includes(mentionSearch.toLowerCase()));
    }
    if (mentionType === "command") {
      const opts = [
        { id: "/explain", label: "💡 Explain Step-by-Step", desc: language === "ar" ? "شرح وافٍ ومفصل خطوة بخطوة" : "Detailed pedagogical explanation" },
        { id: "/summary", label: "📝 Generate Summary", desc: language === "ar" ? "تخليص عالي الكثافة (الخلاصة والزتونة)" : "High-density concepts & formulas sheet" },
        { id: "/practice", label: "✍️ Active Recall Challenge", desc: language === "ar" ? "سؤال تفاعلي يشجع المذاكرة النشطة" : "Generate interactive question to solve" },
        { id: "/quiz", label: "⚡ Quick Mastery Quiz", desc: language === "ar" ? "اختبار قصير من 3 أسئلة مفاهيمية" : "Generate 3-question conceptual quiz" }
      ];
      return opts.filter(o => o.id.toLowerCase().includes(mentionSearch.toLowerCase()));
    }
    return [];
  };

  const handleSelectMention = (optionId: string) => {
    const words = inputValue.split(/\s+/);
    words[words.length - 1] = optionId;
    setInputValue(words.join(" ") + " ");
    setShowMentionsDropdown(false);
    setMentionType(null);
    setMentionQuery("");
  };

  const parseInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx} style={{ color: "var(--primary)", fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={pIdx} style={{ background: "rgba(16, 107, 163, 0.08)", padding: "1px 4px", borderRadius: "4px", fontSize: "0.9em", color: "var(--primary)", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const formatMessageText = (txt: string) => {
    if (!txt) return "";
    
    const lines = txt.split("\n");
    return lines.map((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={lineIdx} style={{ height: "0.5rem" }} />;
      }

      if (trimmed.startsWith("###")) {
        return <h4 key={lineIdx} style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.5rem", marginBottom: "0.25rem", textAlign: "start" }}>{trimmed.slice(3).trim()}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={lineIdx} style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.75rem", marginBottom: "0.35rem", textAlign: "start" }}>{trimmed.slice(2).trim()}</h3>;
      }

      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const rest = trimmed.substring(2);
        return (
          <ul key={lineIdx} style={{ margin: "0.25rem 0 0.25rem 1.25rem", padding: 0, listStyleType: "disc", textAlign: "start" }}>
            <li style={{ fontSize: "0.85rem", color: "inherit", lineHeight: "1.5" }}>
              {parseInlineMarkdown(rest)}
            </li>
          </ul>
        );
      }

      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        const rest = numMatch[2];
        return (
          <ol key={lineIdx} style={{ margin: "0.25rem 0 0.25rem 1.25rem", padding: 0, listStyleType: "decimal", textAlign: "start" }}>
            <li style={{ fontSize: "0.85rem", color: "inherit", lineHeight: "1.5" }}>
              {parseInlineMarkdown(rest)}
            </li>
          </ol>
        );
      }

      if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
        const rest = trimmed.slice(1, -1);
        return (
          <div key={lineIdx} style={{ margin: "0.4rem 0", padding: "0.4rem 0.6rem", borderRadius: "8px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)", fontFamily: "monospace", fontSize: "0.8rem", color: "var(--primary)", overflowX: "auto", textAlign: "start" }}>
            {rest}
          </div>
        );
      }

      return (
        <p key={lineIdx} style={{ margin: "0.25rem 0", fontSize: "0.85rem", lineHeight: "1.5", textAlign: "start" }}>
          {parseInlineMarkdown(trimmed)}
        </p>
      );
    });
  };

  useEffect(() => {
    sendMessageRef.current = handleSendMessage;
  });

  if (!user) return null; // Only show after successful sign-in

  async function handleSendMessage(textToSend?: string) {
    const activeUser = user;
    if (!activeUser) return;
    const queryText = (textToSend || inputValue).trim();
    if (!queryText || isSending) return;

    if (!textToSend) {
      setInputValue("");
    }

    const userMsgId = `msg-${Date.now()}-user`;
    const assistantMsgId = `msg-${Date.now()}-assistant`;

    // Add User Message
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: queryText, timestamp: new Date() }
    ]);

    setIsSending(true);
    setActiveAgent("Guardrail Audit");
    setSessionLogs((prev) => [...prev, `[System] Initiating chat with Fahem Agent (Grounded: ${useGrounded ? "YES" : "NO"})`]);

    // Create a temporary streaming message block
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", text: "", timestamp: new Date(), activeAgent: "Guardrail Audit" }
    ]);

    // Construct Context-Enriched Prompt Payload for RAG Grounding
    let promptPayload = queryText;
    if (bookContext) {
      const isArabic = language === "ar";
      const title = isArabic ? (bookContext.book?.titleAr || bookContext.book?.title) : (bookContext.book?.titleEn || bookContext.book?.title);
      const chapter = isArabic ? bookContext.chapterTitleAr : bookContext.chapterTitleEn;
      const pageTitle = isArabic ? bookContext.titleAr : bookContext.titleEn;
      const content = isArabic ? (bookContext.contentAr || bookContext.contentEn) : (bookContext.contentEn || bookContext.contentAr);
      
      promptPayload = `[Context Reference: Textbook: "${title}", Chapter: "${chapter}", Section: "${pageTitle}", Page: ${bookContext.currentPage}] 

Page Content:
"""
${content}
"""

User Question: ${queryText}`;
      
      setSessionLogs((prev) => [...prev, `[RAG Grounding] Grounded directly in textbook: "${title}" - Page ${bookContext.currentPage}`]);
    }

    try {
      const endpoint = useGrounded ? "/api/agent/grounded" : "/api/agent";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptPayload,
          language,
          userEmail: activeUser.email || "",
          userId: activeUser.uid || "",
          sessionId: currentSessionId || undefined
        }),
      });

      if (!response.body) {
        throw new Error("No readable stream in response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";
      let chunkBuffer = "";
      let inFinalOutput = false;

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        let chunk = "";
        if (value) {
          chunk = decoder.decode(value, { stream: true });
        } else if (done) {
          chunk = decoder.decode();
        }
        chunkBuffer += chunk;

        let processed = true;
        while (processed && chunkBuffer.length > 0) {
          processed = false;

          if (!inFinalOutput) {
            const nlIdx = chunkBuffer.indexOf("\n");
            if (nlIdx !== -1) {
              const line = chunkBuffer.substring(0, nlIdx);
              chunkBuffer = chunkBuffer.substring(nlIdx + 1);
              processed = true;

              const trimmedLine = line.trim();
              if (trimmedLine) {
                if (trimmedLine.includes("=== Agent Final Output ===")) {
                  inFinalOutput = true;
                } else if (trimmedLine.startsWith("[METADATA]")) {
                  const metaContent = trimmedLine.replace("[METADATA] ", "").replace("[METADATA]", "").trim();
                  if (metaContent.startsWith("ActiveAgent:")) {
                    const currentAgent = metaContent.replace("ActiveAgent:", "").trim();
                    setActiveAgent(currentAgent);
                    setMessages((prev) => 
                      prev.map((msg) => 
                        msg.id === assistantMsgId ? { ...msg, activeAgent: currentAgent } : msg
                      )
                    );
                  } else if (metaContent.startsWith("SessionId:")) {
                    const activeSessId = metaContent.replace("SessionId:", "").trim();
                    setCurrentSessionId(activeSessId);
                  } else if (metaContent.startsWith("Duration:")) {
                    setSessionLogs((prev) => [...prev, `[Telemetry] ${metaContent}`]);
                  } else if (metaContent.startsWith("Credits:")) {
                    const val = parseInt(metaContent.replace("Credits:", "").trim(), 10);
                    if (!isNaN(val)) {
                      setCredits(val);
                    }
                  }
                } else if (
                  trimmedLine.startsWith("[Unknown]") ||
                  trimmedLine.startsWith("[Fahem Agent]") ||
                  trimmedLine.startsWith("[Sub-Agent:") ||
                  trimmedLine.includes("[SYSTEM LOG]")
                ) {
                  setSessionLogs((prev) => [...prev, trimmedLine]);
                }
              }
            }
          } else {
            // In final output mode
            const boundaryIdx = chunkBuffer.indexOf("==========================");
            if (boundaryIdx !== -1) {
              const textBefore = chunkBuffer.substring(0, boundaryIdx);
              chunkBuffer = chunkBuffer.substring(boundaryIdx + "==========================".length);
              inFinalOutput = false;
              processed = true;

              if (textBefore) {
                accumulatedText += textBefore;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId ? { ...msg, text: accumulatedText.trim() } : msg
                  )
                );
              }
            } else if (chunkBuffer.length > 30) {
              // Safe to output characters up to length - 30 to prevent leaking prefix of boundary marker
              const safeLen = chunkBuffer.length - 30;
              const safeText = chunkBuffer.substring(0, safeLen);
              chunkBuffer = chunkBuffer.substring(safeLen);
              processed = true;

              accumulatedText += safeText;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId ? { ...msg, text: accumulatedText.trim() } : msg
                )
              );
            }
          }
        }

        if (done && chunkBuffer.length > 0) {
          if (inFinalOutput) {
            let cleanText = chunkBuffer;
            const bIdx = cleanText.indexOf("==========================");
            if (bIdx !== -1) {
              cleanText = cleanText.substring(0, bIdx);
            }
            if (cleanText) {
              accumulatedText += cleanText;
            }
          } else {
            const trimmedLine = chunkBuffer.trim();
            if (trimmedLine && !trimmedLine.includes("==========================") && !trimmedLine.includes("[CLOSE]")) {
              if (!trimmedLine.startsWith("[METADATA]") &&
                  !trimmedLine.startsWith("[Unknown]") &&
                  !trimmedLine.startsWith("[Fahem Agent]") &&
                  !trimmedLine.startsWith("[Sub-Agent:") &&
                  !trimmedLine.startsWith("Prompt:")) {
                accumulatedText += chunkBuffer + "\n";
              }
            }
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, text: accumulatedText.trim() } : msg
            )
          );
          chunkBuffer = "";
        }
      }

      setSessionLogs((prev) => [...prev, "[System] Streaming complete successfully."]);
      await fetchSessions(); // Refresh list to catch updated or new chats
    } catch (err: any) {
      console.error("[sticky-chat] Stream retrieval failed:", err);
      setSessionLogs((prev) => [...prev, `[Error] ${err.message}`]);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, text: `Sorry, an error occurred: ${err.message}` }
            : msg
        )
      );
    } finally {
      setIsSending(false);
      setActiveAgent("");
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, activeAgent: undefined } : msg
        )
      );
    }
  };

  const presetQueries = [
    { 
      label: language === "ar" ? "تدريب مصفوفات (ص١٤)" : "Matrix Practice (p.14)", 
      query: language === "ar" 
        ? "أعطني سؤالاً تدريبياً على معكوس المصفوفة من كتاب الجبر صفحة 14." 
        : "Give me a practice question on Matrix Inversion from Algebra on page 14." 
    },
    { 
      label: language === "ar" ? "دورة كالفن (الأحياء)" : "Calvin Cycle (Biology)", 
      query: language === "ar" 
        ? "اشرح لي دورة كالفن في الأحياء وما هي الأطوال الموجية الأقل امتصاصاً." 
        : "Explain the Calvin Cycle in Biology and what wavelengths chlorophyll absorbs least." 
    },
    { 
      label: language === "ar" ? "أفعال الشروع (النحو)" : "Inchoative Verbs (Grammar)", 
      query: language === "ar" 
        ? "اشرح لي قاعدة كاد وأخواتها ومتى يمتنع اقتران خبرها بـ 'أن'." 
        : "Explain Kaada and her Sisters and when its predicate must not be associated with 'An'." 
    }
  ];

  return (
    <>
      {/* Floating Sparkle Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: "2rem",
          [dir === "rtl" ? "left" : "right"]: "2rem",
          width: "3.5rem",
          height: "3.5rem",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--primary), var(--secondary))",
          color: "#ffffff",
          border: "2px solid #ffffff",
          boxShadow: "0 8px 32px rgba(16, 107, 163, 0.3), 0 0 15px rgba(212, 175, 55, 0.2)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          zIndex: 9999,
          transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          outline: "none"
        }}
        className="floating-chat-trigger"
        title={language === "ar" ? "تحدث مع فاهم" : "Talk with Fahem AI"}
      >
        {isOpen ? (
          <FiX style={{ fontSize: "1.5rem", transition: "transform 0.3s ease" }} />
        ) : (
          <div style={{ position: "relative" }}>
            <FiMessageSquare style={{ fontSize: "1.5rem" }} />
            <span style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "var(--accent-orange)",
              border: "1.5px solid #ffffff",
              boxShadow: "0 0 5px var(--accent-orange)"
            }} className="status-dot"></span>
          </div>
        )}
      </button>

      {/* Slide-out Premium Chat Panel */}
      <div
        style={{
          position: "fixed",
          top: layoutMode === "compact" ? "1.5rem" : "0",
          bottom: layoutMode === "compact" ? "1.5rem" : "0",
          [dir === "rtl" ? "left" : "right"]: isOpen 
            ? (layoutMode === "compact" ? "1.5rem" : "0") 
            : (layoutMode === "fullscreen" ? "-100vw" : layoutMode === "side" ? "-540px" : "-460px"),
          width: layoutMode === "fullscreen" ? "100vw" : layoutMode === "side" ? "480px" : "400px",
          maxWidth: layoutMode === "fullscreen" ? "100%" : "calc(100vw - 1rem)",
          height: layoutMode === "compact" ? "calc(100vh - 3rem)" : "100vh",
          backgroundColor: "rgba(253, 251, 247, 0.95)",
          backdropFilter: "blur(24px) saturate(190%)",
          WebkitBackdropFilter: "blur(24px) saturate(190%)",
          border: layoutMode === "compact" ? "1px solid rgba(212, 175, 55, 0.35)" : "none",
          borderLeft: (layoutMode === "side" && dir !== "rtl") ? "1px solid rgba(212, 175, 55, 0.35)" : "none",
          borderRight: (layoutMode === "side" && dir === "rtl") ? "1px solid rgba(212, 175, 55, 0.35)" : "none",
          borderRadius: layoutMode === "compact" ? "var(--border-radius-lg)" : "0",
          boxShadow: layoutMode === "fullscreen" ? "none" : (dir === "rtl" 
            ? "10px 15px 50px rgba(16, 107, 163, 0.15), -2px 0px 10px rgba(255, 255, 255, 0.5)" 
            : "-10px 15px 50px rgba(16, 107, 163, 0.15), 2px 0px 10px rgba(255, 255, 255, 0.5)"),
          zIndex: 9998,
          display: "flex",
          flexDirection: "column",
          transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden"
        }}
        dir={dir}
      >
        {/* Header Design */}
        <div
          style={{
            padding: "1.25rem",
            borderBottom: "1px dashed var(--card-border)",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0.1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(16, 107, 163, 0.1), rgba(212, 175, 55, 0.15))",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                border: "1px solid var(--card-border)"
              }}
            >
              <FiCpu style={{ color: "var(--primary)", fontSize: "1.2rem" }} className="pulse-icon" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", margin: 0, fontFamily: "var(--font-display)", fontWeight: 700 }}>
                {language === "ar" ? "رفيق فاهم الذكي" : "Fahem Companion"}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--accent-green)" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--accent-green)" }}></span>
                <span>{language === "ar" ? "الذكاء الاصطناعي المسؤول نشط" : "Responsible AI Active"}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            
            {/* Interactive Layout Mode Selectors */}
            <div style={{ display: "flex", background: "rgba(0,0,0,0.04)", padding: "2px", borderRadius: "10px", marginRight: "0.25rem" }}>
              <button
                onClick={() => setLayoutMode("compact")}
                style={{
                  background: layoutMode === "compact" ? "#ffffff" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  color: layoutMode === "compact" ? "var(--primary)" : "#5a6e7c",
                  display: "flex",
                  alignItems: "center"
                }}
                title={language === "ar" ? "عائم مصغر" : "Compact Overlay"}
              >
                <FiMinimize2 />
              </button>
              <button
                onClick={() => setLayoutMode("side")}
                style={{
                  background: layoutMode === "side" ? "#ffffff" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  color: layoutMode === "side" ? "var(--primary)" : "#5a6e7c",
                  display: "flex",
                  alignItems: "center"
                }}
                title={language === "ar" ? "لوحة جانبية" : "Side Panel"}
              >
                <FiSidebar />
              </button>
              <button
                onClick={() => setLayoutMode("fullscreen")}
                style={{
                  background: layoutMode === "fullscreen" ? "#ffffff" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  color: layoutMode === "fullscreen" ? "var(--primary)" : "#5a6e7c",
                  display: "flex",
                  alignItems: "center"
                }}
                title={language === "ar" ? "ملء الشاشة" : "Full Screen"}
              >
                <FiMaximize2 />
              </button>
            </div>

            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                background: "none",
                border: "none",
                color: showHistory ? "var(--primary)" : "var(--foreground)",
                opacity: showHistory ? 1 : 0.6,
                cursor: "pointer",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                transition: "all 0.2s"
              }}
              title={language === "ar" ? "سجل المحادثات" : "Chat History"}
            >
              <FiClock style={{ fontSize: "1.2rem" }} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--foreground)",
                opacity: 0.6,
                cursor: "pointer",
                padding: "0.25rem"
              }}
            >
              <FiX style={{ fontSize: "1.2rem" }} />
            </button>
          </div>
        </div>

        {/* User Context & Guardrail Badge */}
        <div
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "rgba(16, 107, 163, 0.05)",
            borderBottom: "1px solid rgba(16, 107, 163, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.7rem",
            color: "#5a6e7c"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <FiShield style={{ color: "var(--primary)" }} />
            <span>ID: <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem" }}>{user.uid.substring(0, 8)}...</code></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>{language === "ar" ? "الحساب:" : "Email:"} <strong style={{ color: "var(--foreground)" }}>{user.email}</strong></span>
            {credits !== null && (
              <span style={{
                background: credits > 20 ? "rgba(46, 125, 50, 0.15)" : "rgba(198, 40, 40, 0.15)",
                color: credits > 20 ? "#2e7d32" : "#c62828",
                padding: "1px 6px",
                borderRadius: "4px",
                fontWeight: "bold",
                display: "inline-flex",
                alignItems: "center",
                gap: "2px"
              }}>
                <FiZap style={{ fontSize: "0.6rem" }} />
                {credits} CR
              </span>
            )}
          </div>
        </div>

        {/* Sliding History Panel */}
        <div
          style={{
            position: "absolute",
            top: "5rem", // Below the header
            bottom: 0,
            left: dir === "rtl" ? (showHistory ? 0 : "-100%") : "auto",
            right: dir === "rtl" ? "auto" : (showHistory ? 0 : "-100%"),
            width: "100%",
            backgroundColor: "rgba(253, 251, 247, 0.96)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            padding: "1.25rem",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            opacity: showHistory ? 1 : 0,
            pointerEvents: showHistory ? "all" : "none"
          }}
        >
          {/* Header of History Panel */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem"
          }}>
            <h4 style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 800,
              color: "var(--primary)",
              fontFamily: "var(--font-display)"
            }}>
              {language === "ar" ? "المحادثات المحفوظة" : "Saved Chats"}
            </h4>
            <span style={{
              fontSize: "0.75rem",
              background: "rgba(16, 107, 163, 0.08)",
              color: "var(--primary)",
              padding: "2px 8px",
              borderRadius: "10px",
              fontWeight: 700
            }}>
              {sessions.length}
            </span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={startNewChat}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "0.65rem",
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              color: "#ffffff",
              border: "none",
              borderRadius: "var(--border-radius-md)",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
              transition: "all 0.25s",
              marginBottom: "1rem"
            }}
          >
            <FiPlus style={{ fontSize: "1rem" }} />
            <span>{language === "ar" ? "محادثة جديدة" : "New Chat"}</span>
          </button>

          {/* Scrollable Saved Sessions */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              minHeight: 0
            }}
            className="custom-scrollbar"
          >
            {isSessionsLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", color: "#8a9ca8" }}>
                <FiRefreshCw className="spin-icon" style={{ marginRight: "0.5rem", animation: "spin 2s linear infinite" }} />
                <span style={{ fontSize: "0.8rem" }}>{language === "ar" ? "جاري تحميل المحادثات..." : "Loading chats..."}</span>
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem", color: "#8a9ca8", textAlign: "center" }}>
                <FiFileText style={{ fontSize: "2rem", opacity: 0.3, marginBottom: "0.5rem" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{language === "ar" ? "لا توجد محادثات محفوظة بعد" : "No saved chats yet"}</span>
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = currentSessionId === sess.sessionId;
                return (
                  <div
                    key={sess.sessionId}
                    onClick={() => loadSession(sess.sessionId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "var(--border-radius-md)",
                      background: isActive ? "rgba(16, 107, 163, 0.08)" : "rgba(255, 255, 255, 0.6)",
                      border: `1px solid ${isActive ? "rgba(16, 107, 163, 0.25)" : "rgba(235, 220, 185, 0.25)"}`,
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      gap: "0.5rem"
                    }}
                    className="history-session-item"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden", flex: 1 }}>
                      <FiFileText style={{ color: isActive ? "var(--primary)" : "#8a9ca8", flexShrink: 0, fontSize: "1rem" }} />
                      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
                        <span style={{
                          fontSize: "0.85rem",
                          fontWeight: isActive ? 700 : 600,
                          color: isActive ? "var(--primary)" : "var(--foreground)",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden"
                        }} title={sess.title || "Untitled Chat"}>
                          {sess.title || (language === "ar" ? "محادثة بدون عنوان" : "Untitled Chat")}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "#8a9ca8" }}>
                          {sess.messageCount} {language === "ar" ? "رسائل" : "messages"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => deleteSession(sess.sessionId, e)}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: "6px",
                        cursor: "pointer",
                        color: "#8a9ca8",
                        borderRadius: "var(--border-radius-sm)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s"
                      }}
                      className="delete-session-btn"
                    >
                      <FiTrash2 style={{ fontSize: "0.9rem" }} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Context Bar */}
        {bookContext && (
          <div style={{
            background: "rgba(16, 107, 163, 0.08)",
            padding: "0.5rem 1rem",
            fontSize: "0.75rem",
            color: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px dashed rgba(16, 107, 163, 0.15)",
            animation: "pulse-kf 2s infinite"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>📖</span>
              <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px" }}>
                {language === "ar" 
                  ? (bookContext.book?.titleAr || bookContext.book?.title) 
                  : (bookContext.book?.titleEn || bookContext.book?.title)}
              </strong>
            </div>
            <span>
              {language === "ar" ? `الصفحة ${bookContext.currentPage}` : `Page ${bookContext.currentPage}`}
            </span>
          </div>
        )}

        {/* Messages Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            maxHeight: layoutMode === "fullscreen" 
              ? "calc(100vh - 12rem)" 
              : layoutMode === "side" 
                ? "calc(100vh - 10rem)" 
                : "calc(100vh - 15rem)"
          }}
          className="custom-scrollbar"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                width: "100%"
              }}
            >
              {/* Message Bubble */}
              <div
                style={{
                  maxWidth: "85%",
                  padding: "0.85rem 1rem",
                  borderRadius: msg.role === "user" 
                    ? (dir === "rtl" ? "16px 16px 16px 0" : "16px 16px 0 16px") 
                    : (dir === "rtl" ? "16px 16px 0 16px" : "16px 16px 16px 0"),
                  backgroundColor: msg.role === "user" ? "var(--primary)" : "rgba(255, 255, 255, 0.85)",
                  color: msg.role === "user" ? "#ffffff" : "var(--foreground)",
                  border: msg.role === "user" ? "none" : "1px solid var(--card-border)",
                  boxShadow: msg.role === "user" ? "0 4px 12px rgba(16,107,163,0.15)" : "var(--shadow-sm)",
                  fontSize: "0.9rem",
                  lineHeight: "1.5",
                  wordBreak: "normal",
                  overflowWrap: "break-word",
                  whiteSpace: "pre-wrap"
                }}
              >
                {msg.role === "user" ? (
                  <p style={{ margin: 0 }}>{msg.text}</p>
                ) : (
                  msg.text ? formatMessageText(msg.text) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="dot-typing"></span>
                      <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>
                        {language === "ar" ? "جاري التفكير وسحب المعرفة..." : "Thinking & fetching knowledge..."}
                      </span>
                    </div>
                  )
                )}
              </div>

              {/* Message Metadata / Active Agent State */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginTop: "0.35rem",
                  fontSize: "0.75rem",
                  color: "#8fa1ad"
                }}
              >
                <span>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {msg.activeAgent && (
                  <>
                    <span>•</span>
                    <span style={{ color: "var(--accent-orange)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.15rem" }}>
                      <FiZap className="spinning-icon" /> {msg.activeAgent}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {!isSending && messages.length <= 2 && (
          <div
            style={{
              padding: "0.25rem 1.25rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginBottom: "0.5rem"
            }}
          >
            {presetQueries.map((preset, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(preset.query)}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "14px",
                  border: "1px solid var(--card-border)",
                  backgroundColor: "rgba(255,255,255,0.6)",
                  color: "var(--primary)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  transition: "all 0.2s"
                }}
                className="chip-btn"
              >
                <FiCompass style={{ fontSize: "0.8rem" }} />
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {/* Interactive Option Toggles (Google Grounding, Session Logs) */}
        <div
          style={{
            padding: "0.5rem 1.25rem",
            borderTop: "1px solid rgba(235, 220, 185, 0.25)",
            backgroundColor: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.75rem"
          }}
        >
          {/* Grounding Switch */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={useGrounded}
              onChange={(e) => setUseGrounded(e.target.checked)}
              disabled={isSending}
              style={{
                accentColor: "var(--primary)",
                width: "14px",
                height: "14px",
                cursor: "pointer"
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: useGrounded ? "var(--primary)" : "#5a6e7c", fontWeight: useGrounded ? 600 : 400 }}>
              <FiGlobe />
              <span>{language === "ar" ? "البحث في جوجل" : "Ground with Google Search"}</span>
            </div>
          </label>

          {/* Session Logs Toggle */}
          <button
            onClick={() => setShowLogs(!showLogs)}
            style={{
              border: "none",
              background: "none",
              color: showLogs ? "var(--accent-orange)" : "#5a6e7c",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.75rem"
            }}
          >
            <FiTerminal />
            <span>{language === "ar" ? "السجلات" : "Logs"} ({sessionLogs.length})</span>
          </button>
        </div>

        {/* Collapsible Session Console Log View */}
        {showLogs && (
          <div
            style={{
              maxHeight: "100px",
              backgroundColor: "#1c2226",
              borderTop: "1px solid rgba(235, 220, 185, 0.4)",
              padding: "0.5rem",
              overflowY: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              color: "#a4b3c0"
            }}
          >
            {sessionLogs.length === 0 ? (
              <div style={{ color: "#6a7c88", fontStyle: "italic" }}>
                {language === "ar" ? "لا توجد سجلات تشغيل بعد." : "No runtime execution logs yet."}
              </div>
            ) : (
              sessionLogs.map((log, i) => (
                <div key={i} style={{ marginBottom: "0.2rem", display: "flex", gap: "0.25rem" }} dir="ltr">
                  <span style={{ color: "var(--secondary)" }}><FiCornerDownRight style={{ display: "inline" }} /></span>
                  <span style={{
                    color: log.includes("[Error]") ? "#f44336" : log.includes("[Telemetry]") ? "var(--secondary)" : "#a4b3c0"
                  }}>{log}</span>
                </div>
              ))
            )}
            <div ref={chatLogsEndRef} />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{
            padding: "1rem",
            paddingInlineEnd: layoutMode === "fullscreen" ? "6.5rem" : "5.5rem",
            borderTop: "1px dashed var(--card-border)",
            backgroundColor: "rgba(255,255,255,0.45)",
            display: "flex",
            gap: "0.5rem",
            position: "relative"
          }}
        >
          {/* Mentions Dropdown Popover */}
          {showMentionsDropdown && getMentionOptions().length > 0 && (
            <div style={{
              position: "absolute",
              bottom: "100%",
              left: "1rem",
              right: "1rem",
              zIndex: 10000,
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(16, 107, 163, 0.15)",
              borderRadius: "16px",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
              marginBottom: "0.5rem",
              padding: "0.5rem",
              maxHeight: "180px",
              overflowY: "auto"
            }} className="custom-scrollbar">
              {getMentionOptions().map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => handleSelectMention(opt.id)}
                  style={{
                    padding: "0.6rem 1rem",
                    borderRadius: "10px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background 0.2s",
                    textAlign: "start"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "rgba(16, 107, 163, 0.08)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--primary)" }}>{opt.id}</span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)" }}>{opt.label}</span>
                    <span style={{ fontSize: "0.7rem", color: "#6a7c88" }}>{opt.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value;
              setInputValue(val);
              const words = val.split(/\s+/);
              const lastWord = words[words.length - 1];
              if (lastWord && lastWord.startsWith("@")) {
                setMentionType("subject");
                setMentionQuery(lastWord.slice(1));
                setShowMentionsDropdown(true);
              } else if (lastWord && lastWord.startsWith("#")) {
                setMentionType("book");
                setMentionQuery(lastWord.slice(1));
                setShowMentionsDropdown(true);
              } else if (lastWord && lastWord.startsWith("/")) {
                setMentionType("command");
                setMentionQuery(lastWord.slice(1));
                setShowMentionsDropdown(true);
              } else {
                setShowMentionsDropdown(false);
                setMentionType(null);
                setMentionQuery("");
              }
            }}
            disabled={isSending}
            placeholder={language === "ar" ? "اسأل رفيقك الدراسي الذكي عن محتوى الصفحة (اكتب @ أو # أو /)..." : "Ask your AI tutor companion (type @, #, or /)..."}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              border: "1px solid var(--card-border)",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontFamily: "var(--font-sans)",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              outline: "none"
            }}
          />
          <button
            type="submit"
            disabled={isSending || !inputValue.trim()}
            style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "50%",
              backgroundColor: isSending || !inputValue.trim() ? "#e2decb" : "var(--primary)",
              color: "#ffffff",
              border: "none",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: isSending || !inputValue.trim() ? "not-allowed" : "pointer",
              boxShadow: isSending || !inputValue.trim() ? "none" : "0 4px 10px rgba(16, 107, 163, 0.15)",
              transition: "all 0.2s"
            }}
          >
            <FiSend style={{ fontSize: "1rem", transform: dir === "rtl" ? "scaleX(-1)" : "none" }} />
          </button>
        </form>
      </div>

      <style jsx global>{`
        .spinning-icon {
          animation: spin-kf 3s linear infinite;
        }
        @keyframes spin-kf {
          100% { transform: rotate(360deg); }
        }
        .pulse-icon {
          animation: pulse-kf 2s infinite;
        }
        @keyframes pulse-kf {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .dot-typing {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--primary);
          animation: dot-typing-kf 1s infinite alternate;
        }
        @keyframes dot-typing-kf {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.2); opacity: 1; }
        }
        .chip-btn:hover {
          background-color: var(--primary) !important;
          color: #ffffff !important;
          border-color: var(--primary) !important;
          transform: translateY(-1px);
        }
        .floating-chat-trigger:hover {
          transform: scale(1.1) translateY(-2px);
          box-shadow: 0 12px 40px rgba(16, 107, 163, 0.4), 0 0 20px rgba(212, 175, 55, 0.3) !important;
        }
        .delete-session-btn:hover {
          color: var(--accent-red) !important;
          background-color: rgba(235, 87, 87, 0.1) !important;
        }
        .history-session-item:hover {
          background-color: rgba(16, 107, 163, 0.04) !important;
          border-color: rgba(16, 107, 163, 0.12) !important;
        }
      `}</style>
    </>
  );
}
