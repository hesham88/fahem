import React, { useState, useEffect } from "react";
import { useTranslation } from "../context/LanguageContext";
import { authedFetch } from "../lib/authedFetch";

interface DemoTourGuideProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: "en" | "ar" | string;
}

export const DemoTourGuide: React.FC<DemoTourGuideProps> = ({
  activeTab,
  setActiveTab,
  language
}) => {
  const isAr = language === "ar";
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isMinimized, setIsVisibleMinimized] = useState<boolean>(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  // Initialize: Check localStorage and fetch/sync state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const appMode = localStorage.getItem("app_mode");
    if (appMode !== "demo") {
      setIsVisible(false);
      return;
    }

    const skipped = localStorage.getItem("demo_tutorial_skipped") === "true";
    const savedStep = localStorage.getItem("demo_tutorial_step");

    if (skipped) {
      setIsVisible(false);
      return;
    }

    if (savedStep) {
      setCurrentStep(parseInt(savedStep, 10) || 1);
    }
    
    // Auto-open if we are in demo mode and haven't skipped yet
    setIsVisible(true);
  }, []);

  // Synchronize active tab & companion chat drawer based on step changes
  useEffect(() => {
    if (!isVisible) return;
    
    switch (currentStep) {
      case 2:
      case 3:
        if (activeTab !== "library") setActiveTab("library");
        break;
      case 4:
      case 5:
        // Force expand the companion chat drawer
        window.dispatchEvent(new CustomEvent("fahem_chat_open"));
        break;
      case 6:
        if (activeTab !== "practice") setActiveTab("practice");
        // Force-close the companion chat drawer to prevent overlap with the Planner
        window.dispatchEvent(new CustomEvent("fahem_chat_close"));
        break;
      case 7:
        if (activeTab !== "social") setActiveTab("social");
        window.dispatchEvent(new CustomEvent("fahem_chat_close"));
        break;
      case 8:
        if (activeTab !== "insights") setActiveTab("insights");
        window.dispatchEvent(new CustomEvent("fahem_chat_close"));
        break;
      default:
        break;
    }
    
    // Save locally
    localStorage.setItem("demo_tutorial_step", currentStep.toString());

    // Sync to backend telemetry/demo session
    authedFetch("/api/demo/tutorial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tutorial_shown: true,
        tutorial_skipped: false,
        tutorial_step_reached: currentStep
      })
    }).catch(err => console.error("[Tour] Telemetry sync error:", err));

  }, [currentStep, isVisible]);

  // Track coordinates of the current step's highlighted element
  useEffect(() => {
    if (!isVisible) {
      setSpotlightRect(null);
      return;
    }

    let selector = "";
    switch (currentStep) {
      case 4:
      case 5:
        // Companion & Command input box in StickyChat
        selector = "#sticky-chat-input";
        break;
      case 6:
        // Planning text area input in StudyPlanPanel
        selector = "#planner-instructions-input";
        break;
      case 7:
        // Social chat message input in SocialPanel
        selector = "#social-chat-input";
        break;
      default:
        break;
    }

    if (!selector) {
      setSpotlightRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(selector);
      if (el) {
        setSpotlightRect(el.getBoundingClientRect());
      } else {
        setSpotlightRect(null);
      }
    };

    // Delay first measurement slightly to allow Next.js tab transition and slide rendering
    const timer = setTimeout(updateRect, 300);

    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    const intervalMs = isMobile ? 1000 : 150; // Throttle on mobile to eliminate continuous getBoundingClientRect layout thrashing/jank
    const interval = setInterval(updateRect, intervalMs);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [currentStep, isVisible, activeTab]);

  const handleNext = () => {
    if (currentStep < 8) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("demo_tutorial_skipped", "true");
    }
    setIsVisible(false);

    authedFetch("/api/demo/tutorial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tutorial_shown: true,
        tutorial_skipped: true,
        tutorial_step_reached: currentStep
      })
    }).catch(err => console.error("[Tour] Telemetry skip error:", err));
  };

  const handleComplete = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("demo_tutorial_skipped", "true");
    }
    setIsVisible(false);
  };

  const handleRestart = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("demo_tutorial_skipped");
    }
    setCurrentStep(1);
    setIsVisible(true);
    setIsVisibleMinimized(false);
  };

  if (typeof window !== "undefined" && localStorage.getItem("app_mode") !== "demo") {
    return null;
  }

  // If skipped or fully completed, show a small Floating Action Button to restart the tour anytime
  if (!isVisible) {
    return (
      <button
        onClick={handleRestart}
        title={isAr ? "دليل الجولة التفاعلية" : "Interactive Tour Guide"}
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: isAr ? "1.5rem" : "auto",
          right: isAr ? "auto" : "1.5rem",
          zIndex: 10000,
          background: "linear-gradient(135deg, #106ba3, #0d5482)",
          color: "#ffffff",
          border: "none",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 15px rgba(16, 107, 163, 0.4)",
          transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          fontSize: "1.2rem",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15) rotate(15deg)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
      >
        🎓
      </button>
    );
  }

  const stepsContent = [
    {
      titleEn: "Welcome to Fahem Sandbox!",
      titleAr: "مرحباً بك في بيئة فاهم التجريبية!",
      descEn: "Fahem is powered by a coordinated swarm of advanced AI agents. Select Student or Teacher views inside your dashboard and see how the platform adapts to different workflows with real RAG-grounded responses.",
      descAr: "فاهم منصة ذكية مدعومة بمجموعة من الوكلاء البرمجيين والتربويين المتكاملين. تصفح لوحة التحكم كطالب أو مدرس واكتشف كيف تتكيف المنصة مع مختلف المهام والسيناريوهات الحقيقية.",
      badge: "⭐ Welcome",
      badgeAr: "⭐ ترحيب"
    },
    {
      titleEn: "Explore the Knowledge Library",
      titleAr: "استكشف المكتبة التعليمية الرقمية",
      descEn: "Browse through fully ingested textbooks, official curriculum scopes, and documents. Try selecting a specific book from the shelf to open up the interactive textbook reader.",
      descAr: "تصفح الكتب والمناهج المجهزة بالكامل بدقة متناهية. جرب تحديد أي كتاب من الرف لفتحه في قارئ المناهج الذكي لبدء الدراسة.",
      badge: "📚 Library",
      badgeAr: "📚 المكتبة"
    },
    {
      titleEn: "Interactive Smart Reader",
      titleAr: "قارئ المناهج الذكي والتفاعلي",
      descEn: "Once a book is open, use our rich gesture-enabled reader. Highlights and selected text unlock lazy translations, conceptual checks, and premium Text-to-Speech (TTS) narration directly aligned to the original text.",
      descAr: "عند فتح أي كتاب، ستستمتع بقارئ تفاعلي غني بالإيماءات. تظليل أي جملة يفتح لك على الفور خيارات الترجمة اللحظية، والتدقيق المفهومي، والاستماع إلى التلاوة الصوتية فائقة الدقة.",
      badge: "🎧 Multi-modal Reader",
      badgeAr: "🎧 القارئ متعدد الوسائط"
    },
    {
      titleEn: "Intelligent AI Companion",
      titleAr: "الرفيق التعليمي الذكي",
      descEn: "Look at the AI Companion chat window at the bottom right. Ask any academic question—it performs deep agentic RAG searches against your open book and provides exact page citations [p1, p2] that you can click to navigate directly.",
      descAr: "ألق نظرة على نافذة الرفيق التعليمي في الأسفل. اسأله عن أي جزء دراسي؛ سيقوم بعملية بحث عميقة وموثوقة (RAG) في ثنايا الكتاب، وسيرد عليك مع اقتباسات دقيقة لصفحات الكتاب [ص١، ص٢] قابلة للضغط والذهاب المباشر.",
      badge: "🤖 Companion Core",
      badgeAr: "🤖 الرفيق الذكي"
    },
    {
      titleEn: "Advanced Command Orchestration",
      titleAr: "توجيه الوكلاء عبر الأوامر",
      descEn: "Type '/' or '@' in the Companion chatbox to unlock special command shortcuts. Target specific subjects with '@subject', look inside a book with '#book', or trigger active study plans and worksheets on the fly.",
      descAr: "اكتب الرمز '/' أو '@' في صندوق محادثة الرفيق الذكي لاستدعاء أوامر تفاعلية فورية. يمكنك تركيز انتباه الوكيل على مادة معينة بـ '@مادة' أو كتاب محدد بـ '#كتاب'، أو توليد ممارسات نشطة فوراً.",
      badge: "⚡ Command Console",
      badgeAr: "⚡ موجه الأوامر"
    },
    {
      titleEn: "Academic Workspaces & Vision",
      titleAr: "مساحات العمل والتصوير الذكي",
      descEn: "Check out the Active Recall Practice and Personalized Planner workstation panels. Use real Gemini Vision to capture and analyze complex questions from physical worksheets, and build active recovery study paths.",
      descAr: "استخدم لوحة الممارسة الذكية وخطط المذاكرة التفاعلية. يمكنك استخدام رؤية Gemini الحقيقية لالتقاط وحل الأسئلة الصعبة والمسائل الرياضية من الأوراق المطبوعة والكتب الخارجية ومراجعتها.",
      badge: "📝 Workstations & Vision",
      badgeAr: "📝 الممارسة النشطة"
    },
    {
      titleEn: "Social Network & Interactive Chat",
      titleAr: "شبكة التواصل الاجتماعي والدردشة التفاعلية",
      descEn: "Connect and debate with peers, teachers, and study groups in real-time. Use the secure messenger input highlighted here to ask questions, solve challenges together, and share custom study worksheets.",
      descAr: "تواصل وتناقش مع زملائك، معلميك، ومجموعات الدراسة في الوقت الفعلي. استخدم صندوق الرسائل الآمن المظلل هنا لإرسال الأسئلة، ومشاركة أوراق العمل وحل التحديات معاً.",
      badge: "💬 Social Core",
      badgeAr: "💬 منتدى التواصل"
    },
    {
      titleEn: "Insights, Gamification & Live Signup",
      titleAr: "لوحة التحصيل العلمي والاشتراك",
      descEn: "Watch your knowledge grow! Earn experience points (XP), collect learning streak badges, and map out your academic proficiency. Sign up for a free personal account anytime to load your own custom books!",
      descAr: "راقب نمو تحصيلك الدراسي خطوة بخطوة! احصل على نقاط الخبرة (XP) وشارات التميز الأكاديمي وصمم خارطة تفوقك. يمكنك تسجيل حساب شخصي مجاناً في أي وقت لرفع مناهجك الخاصة المخصصة!",
      badge: "🏆 Insights & CTA",
      badgeAr: "🏆 التحصيل العلمي"
    }
  ];

  const currentContent = stepsContent[currentStep - 1];

  return (
    <>
      <style>{`
        @keyframes tourPulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(16, 107, 163, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(16, 107, 163, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 107, 163, 0); }
        }
        @keyframes tourFadeInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tourSpotlightPulse {
          0% {
            border-color: #00f0ff;
            box-shadow: 0 0 12px rgba(0, 240, 255, 0.55), inset 0 0 6px rgba(0, 240, 255, 0.3);
          }
          100% {
            border-color: #106ba3;
            box-shadow: 0 0 25px rgba(16, 107, 163, 0.8), inset 0 0 12px rgba(16, 107, 163, 0.55);
          }
        }
        .tour-glass-card {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: rgba(18, 30, 49, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1);
          animation: tourFadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          color: #ffffff;
        }
        .tour-badge {
          background: linear-gradient(135deg, #106ba3, #0aa3b8);
          font-family: 'Outfit', 'Inter', sans-serif;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .tour-progress-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }
        .tour-progress-dot.active {
          background: #106ba3;
          width: 24px;
          border-radius: 4px;
        }
      `}</style>

      {/* Dynamic Interactive Spotlight Overlay */}
      {isVisible && spotlightRect && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            pointerEvents: "none",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          {/* Backdrop SVG containing the mask cutout */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none"
            }}
          >
            <defs>
              <mask id="tour-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spotlightRect.left - 8}
                  y={spotlightRect.top - 8}
                  width={spotlightRect.width + 16}
                  height={spotlightRect.height + 16}
                  rx={12}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(8, 15, 28, 0.65)"
              mask="url(#tour-spotlight-mask)"
              style={{ pointerEvents: "auto" }}
            />
          </svg>

          {/* Glowing neon pulse outline around the targeted input */}
          <div
            style={{
              position: "fixed",
              top: spotlightRect.top - 8,
              left: spotlightRect.left - 8,
              width: spotlightRect.width + 16,
              height: spotlightRect.height + 16,
              borderRadius: "12px",
              border: "2px solid #00f0ff",
              pointerEvents: "none",
              boxShadow: "0 0 15px rgba(0, 240, 255, 0.6), inset 0 0 8px rgba(0, 240, 255, 0.4)",
              animation: "tourSpotlightPulse 1.5s infinite alternate ease-in-out"
            }}
          />
        </div>
      )}

      {/* Main Guided Card Panel */}
      <div
        className="tour-glass-card"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: isAr ? "1.5rem" : "auto",
          right: isAr ? "auto" : "1.5rem",
          width: "calc(100vw - 3rem)",
          maxWidth: "460px",
          borderRadius: "1.25rem",
          padding: "1.5rem",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          direction: isAr ? "rtl" : "ltr",
          boxSizing: "border-box"
        }}
      >
        {/* Header containing Badge & Skip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            className="tour-badge"
            style={{
              fontSize: "0.75rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "50px",
              color: "#ffffff"
            }}
          >
            {isAr ? currentContent.badgeAr : currentContent.badge}
          </span>
          <button
            onClick={handleSkip}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "0.8rem",
              cursor: "pointer",
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              transition: "color 0.2s ease"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)")}
          >
            {isAr ? "تخطي الدليل ✕" : "Skip Guide ✕"}
          </button>
        </div>

        {/* Step Content Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <h3
            style={{
              margin: 0,
              fontSize: "1.2rem",
              fontWeight: 800,
              background: "linear-gradient(120deg, #ffffff, #a5d3f5)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            {isAr ? currentContent.titleAr : currentContent.titleEn}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              lineHeight: "1.5",
              color: "rgba(255, 255, 255, 0.85)",
              fontWeight: 400
            }}
          >
            {isAr ? currentContent.descAr : currentContent.descEn}
          </p>
        </div>

        {/* Step Indicator and Controls Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "0.4rem",
            gap: "1rem"
          }}
        >
          {/* Progress Indicator dots */}
          <div style={{ display: "flex", gap: "5px" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <div
                key={s}
                className={`tour-progress-dot ${s === currentStep ? "active" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setCurrentStep(s)}
              />
            ))}
          </div>

          {/* Navigation Action Buttons */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  padding: "0.45rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                }}
              >
                {isAr ? "السابق" : "Back"}
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                background: "linear-gradient(135deg, #106ba3, #0d5482)",
                border: "none",
                color: "#ffffff",
                padding: "0.45rem 1.15rem",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(16, 107, 163, 0.25)",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 12px rgba(16, 107, 163, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(16, 107, 163, 0.25)";
              }}
            >
              {currentStep === 8 ? (isAr ? "إنهاء الدليل" : "Finish") : (isAr ? "التالي" : "Next")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
