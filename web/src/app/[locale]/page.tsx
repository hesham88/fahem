"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "../../lib/firebase";
import { signInWithPopup, onAuthStateChanged, User, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "../../context/LanguageContext";
import DonationCard from "../../components/DonationCard";

import { 
  FiGithub,
  FiGlobe,
  FiTwitter, 
  FiMail,
  FiInstagram,
  FiFacebook,
  FiBookOpen, 
  FiLock, 
  FiActivity, 
  FiCpu, 
  FiKey, 
  FiLayers, 
  FiShield, 
  FiExternalLink,
  FiPhone,
  FiCheck,
  FiArrowLeft,
  FiSend,
  FiArrowRight,
  FiCheckCircle,
  FiSettings,
  FiCode,
  FiZap,
  FiGitCommit,
  FiTerminal,
  FiDatabase,
  FiSun,
  FiMoon,
  FiHeart,
  FiChevronDown,
  FiCloud,
  FiUsers,
  FiSliders
} from "react-icons/fi";

export default function LandingPage() {
  const cleanBullet = (txt: string) => {
    if (!txt) return "";
    return txt.replace(/^[🚀💬🎯🔒✨⭐💡🔥📍👤✔️⚡️\s]+/u, "").trim();
  };

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"google" | "phone">("google");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<any>(null);
  const [judgeEmail, setJudgeEmail] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<"student" | "teacher" | "admin">("student");
  const [bypassActive, setBypassActive] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();
  const pathname = usePathname();


  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("fahem_theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (typeof window !== "undefined") {
      localStorage.setItem("fahem_theme", nextDark ? "dark" : "light");
      if (nextDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  useEffect(() => {
    // 1. One-time boot purge of legacy bypass flags
    if (typeof window !== "undefined") {
      const bypassSessionKey = ["judge", "bypass", "session"].join("_");
      const bypassEmailKey = ["judge", "bypass", "email"].join("_");
      if (localStorage.getItem(bypassSessionKey) === "true") {
        localStorage.removeItem(bypassSessionKey);
        localStorage.removeItem(bypassEmailKey);
        localStorage.removeItem("app_mode");
        localStorage.removeItem("demo_auth_token");
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const isDemoMode = typeof window !== "undefined" && localStorage.getItem("app_mode") === "demo" && !!localStorage.getItem("demo_auth_token");
      setIsDemo(isDemoMode);
      
      if (currentUser) {
        setUser(currentUser);
        // Real Firebase user wins: clean up demo mode and any bypass flags
        localStorage.removeItem("app_mode");
        localStorage.removeItem("demo_auth_token");
        localStorage.removeItem("judge_bypass_session");
        localStorage.removeItem("judge_bypass_email");
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("judge_selected_persona");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, language]);

  // Dynamic verifier cleanup to handle failures or navigation resets without leaking widget memory
  useEffect(() => {
    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          console.warn("[reCAPTCHA] Cleanup failed:", e);
        }
      }
    };
  }, [recaptchaVerifier]);

  const setupRecaptcha = (containerId: string) => {
    if (typeof window === "undefined") return null;
    try {
      const container = document.getElementById(containerId);
      if (!container) return null;
      container.innerHTML = '<div id="recaptcha-widget"></div>';

      const verifier = new RecaptchaVerifier(auth, "recaptcha-widget", {
        size: "normal",
        callback: (response: any) => {
          console.log("[reCAPTCHA] Resolved successfully");
        },
        "expired-callback": () => {
          console.log("[reCAPTCHA] Expired");
        }
      });
      return verifier;
    } catch (error) {
      console.error("[reCAPTCHA] Failed to initialize:", error);
      return null;
    }
  };

  const cleanupRecaptcha = () => {
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch (e) {
        console.warn("[reCAPTCHA] Error clearing verifier:", e);
      }
      setRecaptchaVerifier(null);
    }
  };

  const handleSignOut = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("app_mode");
        localStorage.removeItem("demo_auth_token");
        localStorage.removeItem("judge_bypass_email");
        sessionStorage.removeItem("judge_selected_persona");
      }
      setIsDemo(false);
      await auth.signOut();
      setUser(null);
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setErrorMsg(t("phone_empty"));
      return;
    }
    setSendingCode(true);
    setErrorMsg("");

    try {
      console.log("[Phone Auth] Checking server-side SMS rate limits for:", phoneNumber);
      const rateLimitRes = await fetch("/api/user/sms-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber.trim() })
      });
      
      const rateLimitData = await rateLimitRes.json();
      if (!rateLimitRes.ok || !rateLimitData.success || !rateLimitData.allowed) {
        const isAr = language === "ar";
        const customError = isAr 
          ? (rateLimitData.errorAr || rateLimitData.error || "تم الوصول إلى الحد الأقصى لرسائل التحقق.") 
          : (rateLimitData.error || "Verification rate limit exceeded.");
        throw new Error(customError);
      }

      cleanupRecaptcha();
      
      const verifier = setupRecaptcha("recaptcha-container");
      if (!verifier) {
        throw new Error("reCAPTCHA failed to initialize");
      }
      setRecaptchaVerifier(verifier);
      
      await verifier.render();

      console.log("[Phone Auth] Attempting signInWithPhoneNumber for:", phoneNumber);
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(confirmation);
      console.log("[Phone Auth] SMS sent successfully");
    } catch (error: any) {
      console.error("[Phone Auth] Error sending SMS:", error);
      setErrorMsg(error.message || t("phone_send_failed"));
      cleanupRecaptcha();
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setErrorMsg(t("code_empty"));
      return;
    }
    if (!confirmationResult) {
      setErrorMsg(t("session_expired"));
      return;
    }
    setVerifyingCode(true);
    setErrorMsg("");

    try {
      console.log("[Phone Auth] Verifying SMS code:", verificationCode);
      const result = await confirmationResult.confirm(verificationCode);
      if (result.user) {
        console.log("[Phone Auth] Successfully logged in:", result.user.phoneNumber);
        router.push(`/${language}/home`);
      }
    } catch (error: any) {
      console.error("[Phone Auth] Verification failed:", error);
      setErrorMsg(error.message || t("code_verify_failed"));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResetPhoneAuth = () => {
    setConfirmationResult(null);
    setVerificationCode("");
    setErrorMsg("");
    cleanupRecaptcha();
  };

  const executeRecaptcha = (): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const grecaptcha = (window as any).grecaptcha;
        if (grecaptcha && grecaptcha.enterprise) {
          grecaptcha.enterprise.ready(async () => {
            try {
              const token = await grecaptcha.enterprise.execute('6LfT9wQtAAAAAFElDHZ9ddSZHbKzMZx2-IO7PLKV', { action: 'LOGIN' });
              console.log("[reCAPTCHA Enterprise] Token acquired successfully:", token);
              resolve(token);
            } catch (err) {
              console.error("[reCAPTCHA Enterprise] Execution error:", err);
              resolve(null);
            }
          });
        } else {
          console.warn("[reCAPTCHA Enterprise] SDK not loaded on window. Proceeding without token.");
          resolve(null);
        }
      } catch (err) {
        console.error("[reCAPTCHA Enterprise] Unexpected error during verification:", err);
        resolve(null);
      }
    });
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setErrorMsg("");
    try {
      console.log("[reCAPTCHA Enterprise] Securing authentication request...");
      const token = await executeRecaptcha();
      if (token) {
        console.log("[reCAPTCHA Enterprise] Authentication secured. Proceeding to Firebase login.");
      } else {
        console.log("[reCAPTCHA Enterprise] SDK load failure or bypassed. Continuing login (Fail-Open).");
      }

      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        router.push(`/${language}/home`);
      }
    } catch (error: any) {
      console.error("Google sign in failed", error);
      setErrorMsg(error.message || t("auth_failed"));
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--background)", fontFamily: "var(--font-display)", position: "relative", overflow: "hidden" }}>
        {/* Animated ambient background spheres for the loading state to create immersive depth */}
        <div className="ambient-background" style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}>
          <div className="sphere sphere-1" style={{ top: "-10%", left: "-10%", background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0) 70%)", width: "600px", height: "600px", position: "absolute", filter: "blur(80px)" }}></div>
          <div className="sphere sphere-2" style={{ bottom: "-10%", right: "-10%", background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0) 70%)", width: "600px", height: "600px", position: "absolute", filter: "blur(80px)" }}></div>
          <div className="sphere sphere-3" style={{ top: "40%", left: "40%", background: "radial-gradient(circle, rgba(13,148,136,0.1) 0%, rgba(13,148,136,0) 70%)", width: "500px", height: "500px", position: "absolute", filter: "blur(80px)" }}></div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", zIndex: 1, position: "relative" }}>
          {/* Concentric circular glassmorphic spinner */}
          <div className="loader-container">
            <div className="loader-ring loader-ring-outer"></div>
            <div className="loader-ring loader-ring-middle"></div>
            <div className="loader-ring loader-ring-inner"></div>
            <div className="loader-center">
              <FiCpu className="loader-cpu-icon" />
            </div>
          </div>
          <div className="loader-text-glow" style={{ fontSize: "1.2rem", color: "var(--primary)", fontWeight: 600, letterSpacing: "1px" }}>
            {t("loading_ambient")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-container" dir={language === "ar" ? "rtl" : "ltr"} style={{ display: "flex", flexDirection: "column", minHeight: "100vh", position: "relative" }}>
      {/* Dynamic blurred environment spheres */}
      <div className="ambient-background" style={{ position: "fixed", width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none" }}>
        <div className="sphere sphere-1" style={{ top: "-10%", left: "-10%", background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0) 70%)", width: "600px", height: "600px", position: "absolute", filter: "blur(80px)" }}></div>
        <div className="sphere sphere-2" style={{ bottom: "-10%", right: "-10%", background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0) 70%)", width: "600px", height: "600px", position: "absolute", filter: "blur(80px)" }}></div>
        <div className="sphere sphere-3" style={{ top: "40%", left: "40%", background: "radial-gradient(circle, rgba(13,148,136,0.1) 0%, rgba(13,148,136,0) 70%)", width: "500px", height: "500px", position: "absolute", filter: "blur(80px)" }}></div>
      </div>

      {/* Glassmorphic Navbar */}
      <nav className="glass-nav" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, backdropFilter: "blur(20px)", borderBottom: "1px solid var(--card-border)", background: isDarkMode ? "rgba(17, 24, 39, 0.75)" : "rgba(248, 250, 252, 0.75)" }}>
        <div className="glass-nav-logo" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/brand/logo_compressed.png" alt="Fahem Logo" style={{ height: "2.2rem", width: "auto" }} />
          <span style={{ fontWeight: 800, letterSpacing: "0.5px", background: "linear-gradient(135deg, var(--primary), var(--secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t("dashboard_title")}</span>
        </div>
        <ul className="glass-nav-links" style={{ display: "flex", alignItems: "center", gap: "1.75rem", listStyle: "none" }}>
          <li>
            <a href="#overview" className="glass-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.95rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.85 }}>
              <FiLayers /> {t("nav_overview")}
            </a>
          </li>
          <li>
            <a href="#swarm" className="glass-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.95rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.85 }}>
              <FiActivity /> {t("nav_swarm")}
            </a>
          </li>
          <li>
            <a href="#features" className="glass-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.95rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.85 }}>
              <FiBookOpen /> {t("nav_features")}
            </a>
          </li>
          <li>
            <a href="#why-fahem" className="glass-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.95rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.85 }}>
              <FiShield /> {t("nav_why_fahem")}
            </a>
          </li>
          <li>
            <a href="#tech-stack" className="glass-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.95rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.85 }}>
              <FiCpu /> {language === "ar" ? "البنية التقنية" : "Tech Stack"}
            </a>
          </li>
          <li className="glass-nav-dropdown-wrapper">
            <div className="glass-nav-link glass-nav-dropdown-trigger" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.95rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.85 }}>
              <FiLayers /> {language === "ar" ? "النواة" : "Core"} <FiChevronDown style={{ fontSize: "0.8rem", transition: "transform 0.2s" }} className="chevron-icon" />
            </div>
            <ul className="glass-nav-dropdown-menu">
              <li>
                <a href={`/${language}/gcp-infrastructure`}>
                  <FiCloud className="menu-item-icon" style={{ color: "#2563eb" }} />
                  <div className="menu-item-text">
                    <span className="menu-item-title">{language === "ar" ? "البنية التحتية لـ GCP" : "GCP Infrastructure"}</span>
                    <span className="menu-item-desc">{language === "ar" ? "بنية سحابية وحماية متقدمة" : "Cloud compute & secure armor"}</span>
                  </div>
                </a>
              </li>
              <li>
                <a href={`/${language}/agents`}>
                  <FiUsers className="menu-item-icon" style={{ color: "#a855f7" }} />
                  <div className="menu-item-text">
                    <span className="menu-item-title">{language === "ar" ? "الوكلاء الذكيون" : "Agents"}</span>
                    <span className="menu-item-desc">{language === "ar" ? "ترابط وتحليل البيانات الفوري" : "Topology & relationship mapping"}</span>
                  </div>
                </a>
              </li>
              <li>
                <a href={`/${language}/mongodb-mcp`}>
                  <FiDatabase className="menu-item-icon" style={{ color: "#10b981" }} />
                  <div className="menu-item-text">
                    <span className="menu-item-title">{language === "ar" ? "خادم MongoDB MCP" : "MongoDB MCP"}</span>
                    <span className="menu-item-desc">{language === "ar" ? "البحث الدلالي وأنابيب التجميع" : "Semantic search & aggregations"}</span>
                  </div>
                </a>
              </li>
              <li>
                <a href={`/${language}/features-depth`}>
                  <FiSliders className="menu-item-icon" style={{ color: "#f43f5e" }} />
                  <div className="menu-item-text">
                    <span className="menu-item-title">{language === "ar" ? "الميزات بالتفصيل" : "Features"}</span>
                    <span className="menu-item-desc">{language === "ar" ? "الاختبار التلقائي والصوت الفوري" : "Automated testing, voice & memory"}</span>
                  </div>
                </a>
              </li>
              <li>
                <a href={`/${language}/educational-approach`}>
                  <FiBookOpen className="menu-item-icon" style={{ color: "#d97706" }} />
                  <div className="menu-item-text">
                    <span className="menu-item-title">{language === "ar" ? "المنهج التعليمي" : "Educational Approach"}</span>
                    <span className="menu-item-desc">{language === "ar" ? "التعلم الذاتي والعبء المعرفي" : "Heutagogy, OEPA & CCRII paths"}</span>
                  </div>
                </a>
              </li>
            </ul>
          </li>
          <li>
            <a href="#donation-section" className="glass-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.95rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.85 }}>
              <FiHeart style={{ color: "#ef4444" }} /> <span className="nav-text-responsive">{language === "ar" ? "ادعم مسيرتنا" : "Support Us"}</span>
            </a>
          </li>
          <li>
            <a href="https://github.com/hesham88/fahem" target="_blank" rel="noopener noreferrer" className="glass-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.95rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.85 }}>
              <FiGithub /> <span className="nav-text-responsive">{t("nav_github")}</span>
            </a>
          </li>
          <li>
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--foreground)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.35rem",
                borderRadius: "50%",
                fontSize: "1.2rem",
                transition: "all 0.2s ease",
                opacity: 0.85
              }}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <FiSun style={{ color: "var(--accent-yellow)" }} /> : <FiMoon style={{ color: "var(--primary)" }} />}
            </button>
          </li>
          <li>
            <button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              className="glass-nav-link language-toggle-btn"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--foreground)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                opacity: 0.85,
                transition: "all 0.2s ease"
              }}
              title={language === "en" ? "تبديل إلى العربية" : "Switch to English"}
            >
              <FiGlobe style={{ color: "var(--primary)" }} />
              <span>{language === "en" ? "EN" : "ع"}</span>
            </button>
          </li>
          <li>
            {(user || isDemo) ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  onClick={() => router.push(`/${language}/home`)}
                  className="btn btn-primary"
                  style={{ padding: "0.5rem 1.25rem", borderRadius: "30px", fontSize: "0.9rem", fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s", background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#ffffff" }}
                >
                  {t("go_to_dashboard")}
                </button>
                <button
                  onClick={handleSignOut}
                  className="btn"
                  style={{ padding: "0.5rem 1.25rem", borderRadius: "30px", fontSize: "0.9rem", fontWeight: 600, border: "1px solid var(--card-border)", cursor: "pointer", transition: "all 0.2s", background: "transparent", color: "var(--foreground)" }}
                >
                  {t("btn_signout")}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="btn btn-primary btn-nav-signin"
                style={{ padding: "0.5rem 1.25rem", borderRadius: "30px", fontSize: "0.9rem", fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s" }}
              >
                {signingIn ? t("nav_signing_in") : t("nav_signin")}
              </button>
            )}
          </li>
        </ul>
      </nav>

      {/* Hero Section */}
      <main id="overview" className="glass-hero-section" style={{ zIndex: 1, padding: "90px 1.5rem 1.5rem 1.5rem", maxWidth: "1000px", margin: "0 auto", width: "100%" }}>
        <div 
          className="glass-card" 
          style={{ 
            background: isDarkMode ? "rgba(11, 17, 32, 0.7)" : "rgba(255, 255, 255, 0.7)", 
            backdropFilter: "blur(30px) saturate(190%)", 
            border: "1px solid var(--card-border)", 
            borderRadius: "var(--border-radius-lg)", 
            padding: "3.5rem 1.5rem", 
            boxShadow: isDarkMode ? "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)" : "0 20px 40px -15px rgba(37, 99, 235, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)", 
            width: "100%", 
            maxWidth: "100%", 
            position: "relative",
            overflow: "hidden",
            transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          {/* Subtle decorative internal blur elements inside the card itself for extra depth */}
          <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "200px", height: "200px", background: "rgba(37, 99, 235, 0.06)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }}></div>
          <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "200px", height: "200px", background: "rgba(249, 115, 22, 0.04)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }}></div>

          <div style={{ 
            display: "flex", 
            flexDirection: "row", 
            flexWrap: "wrap", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: "1.25rem",
            width: "100%",
            position: "relative",
            zIndex: 1
          }}>
            
            {/* Left Column: Title, Subtitle, Bullet Points, and Sign In with Google */}
            {(() => {
              const renderBulletText = (txt: string) => {
                const cleaned = cleanBullet(txt);
                const colonIndex = cleaned.indexOf(":");
                if (colonIndex === -1) {
                  return (
                    <span style={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: "1.5", flex: 1 }}>
                      {cleaned}
                    </span>
                  );
                }
                const title = cleaned.slice(0, colonIndex).trim();
                const desc = cleaned.slice(colonIndex + 1).trim();
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", textAlign: "start", flex: 1 }}>
                    <strong style={{ fontWeight: 700, fontSize: "0.98rem", color: "var(--foreground)", lineHeight: "1.3" }}>
                      {title}
                    </strong>
                    <span style={{ fontWeight: 400, fontSize: "0.85rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: "1.45" }}>
                      {desc}
                    </span>
                  </div>
                );
              };

              return (
                <div style={{ flex: "1.2 1 420px", maxWidth: "560px", display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: "280px", alignItems: "start", textAlign: "start" }}>
                  {/* Premium Glowing Pill Badge */}
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: isDarkMode ? "rgba(59, 130, 246, 0.12)" : "rgba(37, 99, 235, 0.06)",
                    border: "1px solid rgba(59, 130, 246, 0.25)",
                    padding: "0.35rem 1rem",
                    borderRadius: "100px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "var(--primary)",
                    letterSpacing: "0.5px",
                    marginBottom: "0.1rem",
                    alignSelf: "start",
                    boxShadow: "0 2px 10px rgba(37, 99, 235, 0.04)"
                  }}>
                    <span style={{ display: "flex", animation: "pulse 2s infinite" }}>✨</span>
                    <span>{language === "ar" ? "نظام تعليمي متكامل بالذكاء الاصطناعي" : "NEXT-GEN AI TUTORING SWARM"}</span>
                  </div>

                  <h1 style={{ fontSize: "2.3rem", fontWeight: 850, background: "linear-gradient(135deg, var(--primary) 30%, var(--secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.25, margin: 0, letterSpacing: "-0.02em" }}>
                    {t("welcome_to_fahem")}
                  </h1>
                  <p style={{ fontSize: "1rem", color: isDarkMode ? "#cbd5e1" : "#475569", opacity: 0.9, lineHeight: 1.65, margin: 0 }}>
                    {t("hero_subtitle")}
                  </p>

                  {/* Organized bullet points with perfect alignment as beautiful glass list-panels */}
                  <div className="feature-bullets" style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", padding: "1rem 0", margin: "0.25rem 0" }}>
                    <div className="premium-hero-bullet-item" style={{ display: "flex", alignItems: "center", gap: "1.15rem", width: "100%" }}>
                      <span className="feature-bullet-icon" style={{ 
                        display: "flex", 
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--primary)", 
                        background: isDarkMode ? "rgba(59, 130, 246, 0.12)" : "rgba(37, 99, 235, 0.08)", 
                        border: isDarkMode ? "1px solid rgba(59, 130, 246, 0.25)" : "1px solid rgba(37, 99, 235, 0.15)",
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        flexShrink: 0,
                        transition: "all 0.3s ease"
                      }}>
                        <FiLayers style={{ fontSize: "1.2rem" }} />
                      </span>
                      {renderBulletText(t("bullet_1"))}
                    </div>

                    <div className="premium-hero-bullet-item" style={{ display: "flex", alignItems: "center", gap: "1.15rem", width: "100%" }}>
                      <span className="feature-bullet-icon" style={{ 
                        display: "flex", 
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--secondary)", 
                        background: isDarkMode ? "rgba(249, 115, 22, 0.12)" : "rgba(249, 115, 22, 0.08)", 
                        border: isDarkMode ? "1px solid rgba(249, 115, 22, 0.25)" : "1px solid rgba(249, 115, 22, 0.15)",
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        flexShrink: 0,
                        transition: "all 0.3s ease"
                      }}>
                        <FiActivity style={{ fontSize: "1.2rem" }} />
                      </span>
                      {renderBulletText(t("bullet_2"))}
                    </div>

                    <div className="premium-hero-bullet-item" style={{ display: "flex", alignItems: "center", gap: "1.15rem", width: "100%" }}>
                      <span className="feature-bullet-icon" style={{ 
                        display: "flex", 
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent-green)", 
                        background: isDarkMode ? "rgba(13, 148, 136, 0.12)" : "rgba(13, 148, 136, 0.08)", 
                        border: isDarkMode ? "1px solid rgba(13, 148, 136, 0.25)" : "1px solid rgba(13, 148, 136, 0.15)",
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        flexShrink: 0,
                        transition: "all 0.3s ease"
                      }}>
                        <FiShield style={{ fontSize: "1.2rem" }} />
                      </span>
                      {renderBulletText(t("bullet_3"))}
                    </div>
                  </div>

                  {errorMsg && (
                    <div style={{ color: "var(--secondary)", fontSize: "0.9rem", fontWeight: 600, padding: "0.6rem 1rem", borderRadius: "10px", background: "rgba(249, 115, 22, 0.1)", width: "100%", margin: "0.25rem 0" }}>
                      {errorMsg}
                    </div>
                  )}

                  {/* Sign In with Google */}
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "1px" }}>
                      {language === "ar" ? "ابدأ رحلتك التعليمية" : "GET STARTED NOW"}
                    </span>
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={signingIn || bypassActive}
                      className="premium-google-btn"
                      id="google-signin-button"
                      type="button"
                    >
                      <svg className="google-icon-svg" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <span>{signingIn ? t("btn_connecting_google") : t("btn_signin_google")}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Right Column: EXPLORE DEMO SANDBOX panel and below it Support Fahem's Servers boxes */}
            <div style={{ flex: "1 1 360px", maxWidth: "380px", display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: "280px", alignItems: "center" }}>
              
              {/* Premium Centered/Aligned Compressed Logo */}
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                justifyContent: "center", 
                alignItems: "center", 
                padding: "0.5rem", 
                position: "relative",
                width: "100%"
              }}>
                <div style={{
                  position: "absolute",
                  width: "220px",
                  height: "220px",
                  background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
                  opacity: isDarkMode ? 0.25 : 0.06,
                  zIndex: 0,
                  pointerEvents: "none",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)"
                }}></div>
                <img 
                  src="/brand/logo_compressed.png" 
                  alt="Fahem Brand Symbol" 
                  style={{ 
                    height: "200px", 
                    width: "auto", 
                    objectFit: "contain",
                    zIndex: 1,
                    filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.18))",
                    animation: "float-logo 6s infinite ease-in-out alternate"
                  }} 
                />
              </div>
              
              {/* EXPLORE DEMO SANDBOX panel */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    setBypassActive(true);
                    setErrorMsg("");
                    
                    const trimmedEmail = judgeEmail.trim();

                    const response = await fetch("/api/demo/enter", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email: trimmedEmail,
                        persona: selectedPersona
                      })
                    });
                    const data = await response.json();
                    
                    if (response.ok && data.success) {
                      const cleanToken = data.token.startsWith("demo-token:") 
                        ? data.token.slice("demo-token:".length) 
                        : data.token;
                      
                      localStorage.setItem("app_mode", "demo");
                      localStorage.setItem("demo_auth_token", cleanToken);
                      localStorage.setItem("judge_bypass_email", trimmedEmail);
                      sessionStorage.setItem("judge_selected_persona", selectedPersona);
                      setIsDemo(true);
                      
                      setTimeout(() => {
                        setBypassActive(false);
                      }, 5000);

                      router.push(`/${language}/home`);
                    } else {
                      setErrorMsg(data.error || (language === "ar" ? "فشل دخول البيئة التجريبية." : "Failed to enter sandbox mode."));
                      setBypassActive(false);
                    }
                  } catch (err) {
                    setErrorMsg(language === "ar" ? "حدث خطأ في الاتصال بالخادم." : "Connection error occurred.");
                    setBypassActive(false);
                  }
                }}
                style={{
                  width: "100%",
                  background: isDarkMode ? "rgba(30, 41, 59, 0.4)" : "linear-gradient(135deg, rgba(255, 215, 0, 0.07), rgba(249, 115, 22, 0.05))",
                  border: "1px solid rgba(218, 165, 32, 0.4)",
                  borderRadius: "20px",
                  padding: "1.5rem",
                  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                  backdropFilter: "blur(12px)",
                  textAlign: "start",
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.2rem", color: "#d4af37" }}>⭐</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isDarkMode ? "#fbbf24" : "#b8860b", letterSpacing: "0.5px" }}>
                    {language === "ar" ? "البيئة التجريبية للمحكمين" : "EXPLORE DEMO SANDBOX"}
                  </span>
                </div>
                <p style={{ fontSize: "0.75rem", color: isDarkMode ? "#cbd5e1" : "#475569", margin: 0, lineHeight: 1.45, opacity: 0.9 }}>
                  {language === "ar" 
                    ? "اختر دورك التجريبي وأدخل بريدًا إلكترونيًا اختياريًا لاستكشاف فاهم بأمان."
                    : "Select your evaluation role and provide an optional email to explore."
                  }
                </p>

                {/* Persona Selector Dropdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label htmlFor="persona-select" style={{ fontSize: "0.7rem", fontWeight: 700, color: isDarkMode ? "#fbbf24" : "#854d0e" }}>
                    {language === "ar" ? "الدور / الشخصية" : "CHOOSE PERSONA"}
                  </label>
                  <select
                    id="persona-select"
                    value={selectedPersona}
                    onChange={(e) => setSelectedPersona(e.target.value as any)}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(218, 165, 32, 0.4)",
                      background: isDarkMode ? "#1e293b" : "rgba(255, 255, 255, 0.95)",
                      fontSize: "0.85rem",
                      color: "var(--foreground)",
                      outline: "none",
                      cursor: "pointer",
                      width: "100%"
                    }}
                  >
                    <option value="student">
                      {language === "ar" ? "طالب (مساعد أكاديمي)" : "Student Persona"}
                    </option>
                    <option value="teacher">
                      {language === "ar" ? "معلم (أدوات المدرسين)" : "Teacher Persona"}
                    </option>
                    <option value="admin">
                      {language === "ar" ? "مدير (لوحة التحكم)" : "Admin Preview Persona"}
                    </option>
                  </select>
                </div>

                {/* Optional Email Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label htmlFor="sandbox-email-input" style={{ fontSize: "0.7rem", fontWeight: 700, color: isDarkMode ? "#fbbf24" : "#854d0e" }}>
                    {language === "ar" ? "البريد الإلكتروني (اختياري)" : "EMAIL ADDRESS (OPTIONAL)"}
                  </label>
                  <input
                    id="sandbox-email-input"
                    type="email"
                    placeholder="your.email@example.com"
                    value={judgeEmail}
                    onChange={(e) => setJudgeEmail(e.target.value)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(218, 165, 32, 0.4)",
                      background: isDarkMode ? "#1e293b" : "rgba(255, 255, 255, 0.95)",
                      fontSize: "0.85rem",
                      color: "var(--foreground)",
                      outline: "none",
                      width: "100%"
                    }}
                  />
                </div>

                <button
                  id="sandbox-submit-button"
                  type="submit"
                  disabled={bypassActive}
                  style={{
                    padding: "0.6rem 1rem",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #ffd700, #ffa500)",
                    color: "#5c4033",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(255, 215, 0, 0.3)",
                    transition: "all 0.15s",
                    marginTop: "0.25rem",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%"
                  }}
                >
                  {bypassActive 
                    ? (language === "ar" ? "جاري التحميل..." : "Entering...") 
                    : (language === "ar" ? "دخول البيئة التجريبية" : "Enter Sandbox")
                  }
                </button>
              </form>

              {/* Support Fahem's Servers boxes */}
              <div style={{ width: "100%" }}>
                <DonationCard variant="hero" isDarkMode={isDarkMode} />
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Shared section wrapper styles mapping DonationCard's layout for full-width dark backdrop matching */}
      {(() => {
        const sectionStyle = {
          zIndex: 1,
          padding: "5rem 1.5rem",
          background: "var(--card-bg)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid var(--card-border)",
          borderBottom: "1px solid var(--card-border)",
          position: "relative" as const,
          overflow: "hidden" as const,
          width: "100%",
          scrollMarginTop: "100px"
        };

        return (
          <>
            {/* Swarm Intelligence Section */}
            <section id="swarm" style={sectionStyle}>
              {/* Decorative Blur Spheres */}
              <div style={{ position: "absolute", top: "10%", left: "-10%", width: "300px", height: "300px", background: "rgba(37, 99, 235, 0.05)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "250px", height: "250px", background: "rgba(249, 115, 22, 0.03)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />

              <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 2 }}>
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                  <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.75rem" }}>
                    {t("section_swarm_title")}
                  </h2>
                  <p style={{ fontSize: "1.05rem", color: isDarkMode ? "#cbd5e1" : "#475569", maxWidth: "700px", margin: "0 auto", lineHeight: 1.6 }}>
                    {t("section_swarm_desc")}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
                  <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderRadius: "var(--border-radius-md)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem" }}>
                      <div style={{ background: "rgba(37,99,235,0.1)", color: "var(--primary)", padding: "0.5rem", borderRadius: "10px", display: "flex" }}>
                        <FiCpu style={{ fontSize: "1.4rem" }} />
                      </div>
                      <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("swarm_agent_coordinator")}</h3>
                    </div>
                    <p style={{ fontSize: "0.92rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("swarm_agent_coordinator_desc")}</p>
                  </div>

                  <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderRadius: "var(--border-radius-md)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem" }}>
                      <div style={{ background: "rgba(249,115,22,0.1)", color: "var(--secondary)", padding: "0.5rem", borderRadius: "10px", display: "flex" }}>
                        <FiActivity style={{ fontSize: "1.4rem" }} />
                      </div>
                      <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("swarm_agent_companion")}</h3>
                    </div>
                    <p style={{ fontSize: "0.92rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("swarm_agent_companion_desc")}</p>
                  </div>

                  <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderRadius: "var(--border-radius-md)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem" }}>
                      <div style={{ background: "rgba(13,148,136,0.1)", color: "var(--accent-green)", padding: "0.5rem", borderRadius: "10px", display: "flex" }}>
                        <FiBookOpen style={{ fontSize: "1.4rem" }} />
                      </div>
                      <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("swarm_agent_quiz")}</h3>
                    </div>
                    <p style={{ fontSize: "0.92rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("swarm_agent_quiz_desc")}</p>
                  </div>

                  <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderRadius: "var(--border-radius-md)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem" }}>
                      <div style={{ background: "rgba(251,191,36,0.1)", color: "var(--accent-yellow)", padding: "0.5rem", borderRadius: "10px", display: "flex" }}>
                        <FiShield style={{ fontSize: "1.4rem" }} />
                      </div>
                      <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("swarm_agent_admin")}</h3>
                    </div>
                    <p style={{ fontSize: "0.92rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("swarm_agent_admin_desc")}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* System Features Section */}
            <section id="features" style={sectionStyle}>
              {/* Decorative Blur Spheres */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "400px", height: "400px", background: "rgba(13, 148, 136, 0.04)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />

              <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 2 }}>
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                  <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.75rem" }}>
                    {t("section_features_title")}
                  </h2>
                  <p style={{ fontSize: "1.05rem", color: isDarkMode ? "#cbd5e1" : "#475569", maxWidth: "700px", margin: "0 auto", lineHeight: 1.6 }}>
                    {t("section_features_desc")}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "2rem" }}>
                  <div className="panel-card" style={{ display: "flex", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "1.5rem" }}>
                    <div style={{ background: "rgba(37,99,235,0.08)", color: "var(--primary)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FiBookOpen style={{ fontSize: "1.3rem" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("feature_library")}</h4>
                      <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("feature_library_desc")}</p>
                    </div>
                  </div>

                  <div className="panel-card" style={{ display: "flex", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "1.5rem" }}>
                    <div style={{ background: "rgba(249,115,22,0.08)", color: "var(--secondary)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FiLayers style={{ fontSize: "1.3rem" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("feature_subjects")}</h4>
                      <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("feature_subjects_desc")}</p>
                    </div>
                  </div>

                  <div className="panel-card" style={{ display: "flex", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "1.5rem" }}>
                    <div style={{ background: "rgba(13,148,136,0.08)", color: "var(--accent-green)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FiActivity style={{ fontSize: "1.3rem" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("feature_practice")}</h4>
                      <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("feature_practice_desc")}</p>
                    </div>
                  </div>

                  <div className="panel-card" style={{ display: "flex", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "1.5rem" }}>
                    <div style={{ background: "rgba(251,191,36,0.08)", color: "var(--accent-yellow)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FiCpu style={{ fontSize: "1.3rem" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("feature_plan")}</h4>
                      <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("feature_plan_desc")}</p>
                    </div>
                  </div>

                  <div className="panel-card" style={{ display: "flex", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "1.5rem" }}>
                    <div style={{ background: "rgba(37,99,235,0.08)", color: "var(--primary)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FiExternalLink style={{ fontSize: "1.3rem" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("feature_timetable")}</h4>
                      <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("feature_timetable_desc")}</p>
                    </div>
                  </div>

                  <div className="panel-card" style={{ display: "flex", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "1.5rem" }}>
                    <div style={{ background: "rgba(249,115,22,0.08)", color: "var(--secondary)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FiShield style={{ fontSize: "1.3rem" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("feature_zatona")}</h4>
                      <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("feature_zatona_desc")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Why Choose Fahem Section */}
            <section id="why-fahem" style={sectionStyle}>
              {/* Decorative Blur Spheres */}
              <div style={{ position: "absolute", top: "-10%", right: "-10%", width: "300px", height: "300px", background: "rgba(37, 99, 235, 0.04)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: "10%", left: "-10%", width: "250px", height: "250px", background: "rgba(249, 115, 22, 0.03)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />

              <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 2 }}>
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                  <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.75rem" }}>
                    {t("section_why_fahem_title")}
                  </h2>
                  <p style={{ fontSize: "1.05rem", color: isDarkMode ? "#cbd5e1" : "#475569", maxWidth: "700px", margin: "0 auto", lineHeight: 1.6 }}>
                    {t("section_why_fahem_desc")}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
                  <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
                    <div style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(37,99,235,0.15)" }}>
                      <FiGlobe style={{ fontSize: "1.3rem" }} />
                    </div>
                    <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("why_personalized_title")}</h4>
                    <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_personalized_desc")}</p>
                  </div>

                  <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
                    <div style={{ background: "linear-gradient(135deg, var(--secondary), var(--accent-orange))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(249,115,22,0.15)" }}>
                      <FiLayers style={{ fontSize: "1.3rem" }} />
                    </div>
                    <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("why_bilingual_title")}</h4>
                    <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_bilingual_desc")}</p>
                  </div>

                  <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
                    <div style={{ background: "linear-gradient(135deg, var(--accent-green), var(--primary))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(13,148,136,0.15)" }}>
                      <FiShield style={{ fontSize: "1.3rem" }} />
                    </div>
                    <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("why_secure_title")}</h4>
                    <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_secure_desc")}</p>
                  </div>

                  <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
                    <div style={{ background: "linear-gradient(135deg, var(--primary), var(--accent-green))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(37,99,235,0.15)" }}>
                      <FiCpu style={{ fontSize: "1.3rem" }} />
                    </div>
                    <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("why_intelligent_title")}</h4>
                    <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_intelligent_desc")}</p>
                  </div>

                  <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
                    <div style={{ background: "linear-gradient(135deg, var(--accent-orange), var(--secondary))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(249,115,22,0.15)" }}>
                      <FiActivity style={{ fontSize: "1.3rem" }} />
                    </div>
                    <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("why_clt_title")}</h4>
                    <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_clt_desc")}</p>
                  </div>

                  <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
                    <div style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-orange))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(13,148,136,0.15)" }}>
                      <FiBookOpen style={{ fontSize: "1.3rem" }} />
                    </div>
                    <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("why_heutagogy_title")}</h4>
                    <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_heutagogy_desc")}</p>
                  </div>

                  <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
                    <div style={{ background: "linear-gradient(135deg, var(--accent-green), var(--secondary))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(16,107,163,0.15)" }}>
                      <FiShield style={{ fontSize: "1.3rem" }} />
                    </div>
                    <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("why_security_title")}</h4>
                    <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_security_desc")}</p>
                  </div>

                  <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
                    <div style={{ background: "linear-gradient(135deg, var(--accent-orange), var(--primary))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(37,99,235,0.15)" }}>
                      <FiCpu style={{ fontSize: "1.3rem" }} />
                    </div>
                    <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{t("why_dag_title")}</h4>
                    <p style={{ fontSize: "0.9rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_dag_desc")}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Leading Tech Integrations & Stack Section */}
            <section id="tech-stack" style={sectionStyle}>
              {/* Decorative Blur Spheres */}
              <div style={{ position: "absolute", top: "20%", left: "-10%", width: "350px", height: "350px", background: "rgba(59, 130, 246, 0.05)", borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "300px", height: "300px", background: "rgba(249, 115, 22, 0.04)", borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none" }} />

              <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 2 }}>
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                  <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.75rem" }}>
                    {language === "ar" ? "تكامل التقنيات والشركاء الرائدين" : "Leading Tech Integrations & Stack"}
                  </h2>
                  <p style={{ fontSize: "1.05rem", color: isDarkMode ? "#cbd5e1" : "#475569", maxWidth: "700px", margin: "0 auto", lineHeight: 1.6 }}>
                    {language === "ar" 
                      ? "بُنيت منصة فاهم بالاعتماد على بنية تحتية سحابية قوية ومؤمنة بالكامل بالتعاون مع أفضل مزودي التقنية سحابياً."
                      : "Fahem is built on top of a highly resilient, enterprise-grade cloud architecture integrated with world-leading technology partners."}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                  
                  {/* Google Gemini Card */}
                  <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "2rem", height: "100%", transition: "all 0.3s ease" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem" }}>
                        <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "0.5rem", borderRadius: "12px", display: "flex", flexShrink: 0 }}>
                           <img src="/brand/gemini.png" alt="Google Gemini" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                        </div>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                          {language === "ar" ? "جوجل جيميناي AI" : "Google Gemini AI"}
                        </h3>
                      </div>
                      <p style={{ fontSize: "0.92rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>
                        {language === "ar" 
                          ? "تحليل متقدم للمناهج الدراسية مع فهم سياقي فائق للصور والنصوص والكتب التفاعلية."
                          : "Advanced natural language reasoning and contextual multi-modal textbook analysis."}
                      </p>
                    </div>
                  </a>

                  {/* Google ADK 2.0 Card */}
                  <a href="https://adk.dev/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "2rem", height: "100%", transition: "all 0.3s ease" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem" }}>
                        <div style={{ background: "rgba(249, 115, 22, 0.1)", padding: "0.5rem", borderRadius: "12px", display: "flex", flexShrink: 0 }}>
                           <img src="/brand/adk.png" alt="Google ADK" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                        </div>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                          {language === "ar" ? "جوجل ADK 2.0" : "Google ADK 2.0"}
                        </h3>
                      </div>
                      <p style={{ fontSize: "0.92rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>
                        {language === "ar" 
                          ? "توليف صوتي فائق الدقة ومزامنة فورية للحديث الصوتي الطبيعي للمعلمين لتفادي استخدام الردود الصامتة."
                          : "Advanced audio speech synthesis and local hardware coordination for natural voice tutoring."}
                      </p>
                    </div>
                  </a>

                  {/* Antigravity Card */}
                  <a href="https://antigravity.google/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "2rem", height: "100%", transition: "all 0.3s ease" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem" }}>
                        <div style={{ background: "rgba(13, 148, 136, 0.1)", padding: "0.5rem", borderRadius: "12px", display: "flex", flexShrink: 0 }}>
                           <img src="/brand/antigravity.png" alt="Antigravity" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                        </div>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                          {language === "ar" ? "أنتي-جرافيتي CLI" : "Antigravity CLI"}
                        </h3>
                      </div>
                      <p style={{ fontSize: "0.92rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>
                        {language === "ar" 
                          ? "عميل التطوير الذاتي للأكواد البرمجية البرمجية، تشغيل لوحة التحكم، وتأمين بيئة الـ runtime البرمجية."
                          : "Autonomous developer execution agent, dashboard control console, and secure prompt runtime environments."}
                      </p>
                    </div>
                  </a>

                  {/* Firebase Card */}
                  <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "2rem", height: "100%", transition: "all 0.3s ease" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem" }}>
                        <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "0.5rem", borderRadius: "12px", display: "flex", flexShrink: 0 }}>
                           <img src="/brand/firebase.png" alt="Firebase" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                        </div>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                          {language === "ar" ? "جوجل فيربيز" : "Google Firebase"}
                        </h3>
                      </div>
                      <p style={{ fontSize: "0.92rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>
                        {language === "ar" 
                          ? "إدارة التحقق من الهوية الشخصية للمستخدمين وتأمين الجلسات واستضافة التطبيق على خوادم فائقة السرعة."
                          : "Secure global database synchronization, cloud hosting, and robust user session authentication."}
                      </p>
                    </div>
                  </a>

                  {/* Next.js Card */}
                  <a href="https://nextjs.org/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "2rem", height: "100%", transition: "all 0.3s ease" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem" }}>
                        <div style={{ background: isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.08)", padding: "0.5rem", borderRadius: "12px", display: "flex", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                          <img src="/logos/tech_photo_12.png" alt="Next.js" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                        </div>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                          {language === "ar" ? "نيكست جي إس" : "Next.js"}
                        </h3>
                      </div>
                      <p style={{ fontSize: "0.92rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>
                        {language === "ar" 
                          ? "الإطار البرمجي الرائد لتطوير واجهات المستخدم المذهلة، والمعالجة فائقة السرعة على الخادم (SSR)، وضمان تهيئة مثالية لمحركات البحث (SEO)."
                          : "The gold-standard framework for building blazing fast user interfaces, seamless server-side rendering (SSR), and state-of-the-art SEO web performance."}
                      </p>
                    </div>
                  </a>

                  {/* Google Maps Card */}
                  <a href="https://mapsplatform.google.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "2rem", height: "100%", transition: "all 0.3s ease" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem" }}>
                        <div style={{ background: isDarkMode ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)", padding: "0.5rem", borderRadius: "12px", display: "flex", flexShrink: 0, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.1)" }}>
                          <img src="/logos/Untitled design (21).png" alt="Google Maps" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                        </div>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                          {language === "ar" ? "خرائط جوجل" : "Google Maps"}
                        </h3>
                      </div>
                      <p style={{ fontSize: "0.92rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>
                        {language === "ar" 
                          ? "توجيه جغرافي متطور ورسم خرائط المدارس القريبة وتوفير توجيهات جغرافية تفاعلية للمستخدمين لتسهيل العثور على المراكز الأكاديمية."
                          : "Dynamic visual geospatial APIs, interactive school mapping, and intelligent regional routing to discover educational support centers near you."}
                      </p>
                    </div>
                  </a>

                  {/* MongoDB Card */}
                  <a href="https://www.mongodb.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "2rem", height: "100%", transition: "all 0.3s ease" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem" }}>
                        <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "0.5rem", borderRadius: "12px", display: "flex", flexShrink: 0 }}>
                           <img src="/brand/mongodb.png" alt="MongoDB Atlas" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                        </div>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                          {language === "ar" ? "مونجو دي بي أطلس" : "MongoDB Atlas"}
                        </h3>
                      </div>
                      <p style={{ fontSize: "0.92rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>
                        {language === "ar" 
                          ? "قاعدة بيانات سحابية موزعة للبحث الدلالي الفوري بالمؤشرات المتجهة (Vector Indexes) واسترجاع الدروس ذكياً."
                          : "Distributed cloud database, vectors index search, and semantic lesson retrieval via custom MCP servers."}
                      </p>
                    </div>
                  </a>

                  {/* Google Cloud Card */}
                  <a href="https://cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "2rem", height: "100%", transition: "all 0.3s ease" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem" }}>
                        <div style={{ background: isDarkMode ? "rgba(59, 130, 246, 0.18)" : "rgba(37, 99, 235, 0.1)", padding: "0.5rem", borderRadius: "12px", display: "flex", flexShrink: 0, boxShadow: "0 4px 12px rgba(37, 99, 235, 0.1)" }}>
                          <img src="/logos/google_cloud.png" alt="Google Cloud" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                        </div>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                          {language === "ar" ? "جوجل كلاود" : "Google Cloud"}
                        </h3>
                      </div>
                      <p style={{ fontSize: "0.92rem", color: isDarkMode ? "#cbd5e1" : "#475569", lineHeight: 1.5, margin: 0 }}>
                        {language === "ar" 
                          ? "بنية تحتية سحابية آمنة وعالمية مع حوسبة فائقة الأداء، ونظام حماية النماذج (Model Armor)، وخوادم سريعة الاستجابة لضمان تشغيل خدمات فاهم على مدار الساعة."
                          : "Secure enterprise cloud computing, high-performance VM hosting, Model Armor, and Vertex AI nodes to power Fahem's interactive tutoring services globally."}
                      </p>
                    </div>
                  </a>

                </div>
              </div>
            </section>
          </>
        );
      })()}

      {/* Dedicated Last Landing Section - Warm and informative Support Fahem section */}
      <DonationCard variant="section" isDarkMode={isDarkMode} />

      {/* Styled Interactive Footer with Asdaa.co Attribution */}
      <footer className="metadata-footer" style={{ zIndex: 2, padding: "3rem 1.5rem 2.5rem 1.5rem", width: "100%", borderTop: "1px solid var(--card-border)", background: isDarkMode ? "rgba(9, 13, 22, 0.9)" : "rgba(248, 250, 252, 0.9)", marginTop: "auto" }}>
        
        {/* Elegant exactly 3-line Footer Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
          
          {/* Line 1: Navigational Links (Terms • Privacy • Contact Us) */}
          <div style={{ display: "flex", justifyContent: "center", gap: "2rem", flexWrap: "wrap", alignItems: "center" }}>
            <a href={`/${language}/terms`} className="footer-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.8 }}>
              <FiBookOpen /> {t("nav_terms")}
            </a>
            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>•</span>
            <a href={`/${language}/privacy`} className="footer-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.8 }}>
              <FiLock /> {t("nav_privacy")}
            </a>
            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>•</span>
            <a href={`/${language}/contact`} className="footer-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.8 }}>
              <FiMail /> {language === "ar" ? "اتصل بنا" : "Contact Us"}
            </a>
          </div>

          {/* Line 2: Premium Social Icons (X, Instagram, Facebook, Email) */}
          <div style={{ display: "flex", justifyContent: "center", gap: "1.75rem", alignItems: "center" }}>
            <a href="https://x.com/fahempro" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="X" 
               style={{ display: "inline-flex", opacity: 0.7, transition: "all 0.3s ease", transform: "scale(1)" }}
               onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.opacity = "1"; }}
               onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.7"; }}>
              <img src="/brand/social_x.png" alt="X" width="22" height="22" style={{ objectFit: "contain", filter: isDarkMode ? "invert(1)" : "none" }} />
            </a>
            <a href="https://www.instagram.com/fahem.pro/" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Instagram" 
               style={{ display: "inline-flex", opacity: 0.7, transition: "all 0.3s ease", transform: "scale(1)" }}
               onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.opacity = "1"; }}
               onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.7"; }}>
              <img src="/brand/social_instagram.png" alt="Instagram" width="22" height="22" style={{ objectFit: "contain" }} />
            </a>
            <a href="https://www.facebook.com/ai.fahem.pro/" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Facebook" 
               style={{ display: "inline-flex", opacity: 0.7, transition: "all 0.3s ease", transform: "scale(1)" }}
               onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.opacity = "1"; }}
               onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.7"; }}>
              <img src="/brand/social_facebook.png" alt="Facebook" width="22" height="22" style={{ objectFit: "contain" }} />
            </a>
            <a href="mailto:contact@fahem.pro" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Email" 
               style={{ display: "inline-flex", opacity: 0.7, transition: "all 0.3s ease", transform: "scale(1)" }}
               onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.opacity = "1"; }}
               onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.7"; }}>
              <img src="/brand/social_email.png" alt="Email" width="22" height="22" style={{ objectFit: "contain", filter: isDarkMode ? "invert(1)" : "none" }} />
            </a>
          </div>

          {/* Line 3: Unified copyright and attribution line */}
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              {language === "ar" ? (
                <>
                  صُنع بكل حب ❤️ جميع الحقوق محفوظة لـ <a href="https://asdaa.co" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline", fontWeight: 700 }}>Asdaa</a> وفريق فاهم
                </>
              ) : (
                <>
                  Made with love ❤️ All rights reserved to <a href="https://asdaa.co" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline", fontWeight: 700 }}>Asdaa</a> and Fahem Team
                </>
              )}
            </p>
          </div>

        </div>
      </footer>
    </div>
  );
}
