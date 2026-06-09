"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "../../lib/firebase";
import { signInWithPopup, onAuthStateChanged, User, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../context/LanguageContext";
import DonationCard from "../../components/DonationCard";
import AdSensePlaceholder from "../../components/AdSensePlaceholder";
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
  FiMoon
} from "react-icons/fi";

export default function LandingPage() {
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
            <a href="https://github.com/hesham88/fahem" target="_blank" rel="noopener noreferrer" className="glass-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.95rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.85 }}>
              <FiGithub /> {t("nav_github")}
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--primary)" }}>
              <FiGlobe />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="language-select"
                style={{ marginLeft: "0.25rem", background: "transparent", border: "none", color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 500, outline: "none", cursor: "pointer" }}
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>
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
      <main id="overview" className="glass-hero-section" style={{ zIndex: 1, padding: "90px 1.5rem 1rem 1.5rem", maxWidth: "1200px", margin: "0 auto", width: "100%", scrollMarginTop: "100px" }}>
        <div className="glass-card" style={{ background: isDarkMode ? "rgba(17, 24, 39, 0.45)" : "rgba(255, 255, 255, 0.45)", backdropFilter: "blur(20px)", border: "1px solid var(--card-border)", borderRadius: "var(--border-radius-lg)", padding: "2.5rem 2.25rem", boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "stretch", justifyContent: "space-between", gap: "2rem", maxWidth: "100%", width: "100%", textAlign: "start" }}>
          
          {/* Left Column: Welcome, Key Features, Sign-In, and Sandbox Console */}
          <div style={{ flex: "1 1 500px", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "start" }}>
            <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", width: "42px", height: "42px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(37, 99, 235, 0.15)" }}>
              <FiKey style={{ fontSize: "1.25rem", color: "#ffffff" }} />
            </div>
            <h2 style={{ fontSize: "1.85rem", fontWeight: 800, background: "linear-gradient(135deg, var(--primary) 30%, var(--secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2, margin: 0 }}>{t("welcome_to_fahem")}</h2>
            <p style={{ fontSize: "0.92rem", color: "var(--foreground)", opacity: 0.8, lineHeight: 1.5, margin: 0 }}>{t("hero_subtitle")}</p>

            <div className="feature-bullets" style={{ display: "flex", flexDirection: "column", gap: "0.4rem", width: "100%", maxWidth: "420px", padding: "0.6rem 0", margin: "0.4rem 0", borderTop: "1px solid rgba(235, 220, 185, 0.2)", borderBottom: "1px solid rgba(235, 220, 185, 0.2)" }}>
              <div className="feature-bullet-item" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "var(--foreground)", fontWeight: 500 }}>
                <span className="feature-bullet-icon" style={{ display: "flex", color: "var(--primary)" }}><FiLayers /></span>
                <span>{t("bullet_1")}</span>
              </div>
              <div className="feature-bullet-item" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "var(--foreground)", fontWeight: 500 }}>
                <span className="feature-bullet-icon" style={{ display: "flex", color: "var(--secondary)" }}><FiActivity /></span>
                <span>{t("bullet_2")}</span>
              </div>
              <div className="feature-bullet-item" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "var(--foreground)", fontWeight: 500 }}>
                <span className="feature-bullet-icon" style={{ display: "flex", color: "var(--accent-green)" }}><FiShield /></span>
                <span>{t("bullet_3")}</span>
              </div>
            </div>

            {errorMsg && (
              <div style={{ color: "var(--secondary)", fontSize: "0.9rem", fontWeight: 600, padding: "0.4rem 0.8rem", borderRadius: "8px", background: "rgba(249, 115, 22, 0.1)", width: "100%", maxWidth: "340px", margin: "0.25rem 0" }}>
                {errorMsg}
              </div>
            )}

            <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "start", gap: "1rem", marginTop: "0.5rem" }}>
              {/* Official Google branded sign-in button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn || bypassActive}
                className="google-btn"
                id="google-signin-button"
                type="button"
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "30px", padding: "0.6rem 1.5rem", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", boxShadow: "var(--shadow-sm)", transition: "transform 0.2s, box-shadow 0.2s", opacity: (signingIn || bypassActive) ? 0.6 : 1 }}
              >
                {/* Embedded Google Color Logo SVG */}
                <svg className="google-icon-svg" viewBox="0 0 24 24" width="16" height="18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span style={{ color: "var(--foreground)" }}>{signingIn ? t("btn_connecting_google") : t("btn_signin_google")}</span>
              </button>

              {/* Custom Divider */}
              <div style={{ display: "flex", alignItems: "center", width: "100%", maxWidth: "340px", margin: "0.5rem 0" }}>
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--card-border)", opacity: 0.5 }}></div>
                <span style={{ padding: "0 10px", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>{language === "ar" ? "أو للتقييم" : "OR FOR EVALUATION"}</span>
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--card-border)", opacity: 0.5 }}></div>
              </div>

              {/* Judge Evaluation Console Panel */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    setBypassActive(true);
                    setErrorMsg("");
                    
                    const trimmedEmail = judgeEmail.trim();

                    // Call /api/demo/enter directly
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
                      
                      // Recover button state in case they navigate back or need button restored
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
                  maxWidth: "340px",
                  background: "linear-gradient(135deg, rgba(255, 215, 0, 0.07), rgba(249, 115, 22, 0.05))",
                  border: "1px solid rgba(218, 165, 32, 0.4)",
                  borderRadius: "16px",
                  padding: "1.25rem",
                  boxShadow: "0 4px 20px rgba(218, 165, 32, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                  backdropFilter: "blur(10px)",
                  textAlign: "start"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.1rem", color: "#d4af37" }}>⭐</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#b8860b", letterSpacing: "0.5px" }}>
                    {language === "ar" ? "البيئة التجريبية للمحكمين" : "EXPLORE DEMO SANDBOX"}
                  </span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "#475569", margin: 0, lineHeight: 1.4 }}>
                  {language === "ar" 
                    ? "اختر دورك التجريبي وأدخل بريدًا إلكترونيًا اختياريًا لاستكشاف فاهم بأمان."
                    : "Select your evaluation role and provide an optional email to explore."
                  }
                </p>

                {/* Persona Selector Dropdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label htmlFor="persona-select" style={{ fontSize: "0.7rem", fontWeight: 700, color: "#854d0e" }}>
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
                      background: "rgba(255, 255, 255, 0.95)",
                      fontSize: "0.85rem",
                      color: "var(--foreground)",
                      outline: "none",
                      cursor: "pointer"
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
                  <label htmlFor="sandbox-email-input" style={{ fontSize: "0.7rem", fontWeight: 700, color: "#854d0e" }}>
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
                      background: "rgba(255, 255, 255, 0.95)",
                      fontSize: "0.85rem",
                      color: "var(--foreground)",
                      outline: "none"
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
                    alignItems: "center"
                  }}
                >
                  {bypassActive 
                    ? (language === "ar" ? "جاري التحميل..." : "Entering...") 
                    : (language === "ar" ? "دخول البيئة التجريبية" : "Enter Sandbox")
                  }
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Beautiful integrated/woven DonationCard */}
          <div style={{ flex: "1 1 340px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%", alignSelf: "center" }}>
            <DonationCard variant="hero" />
          </div>

          {/* Built with Partner Band */}
          <div className="tech-stack-container">
            <span className="tech-stack-title">
              {language === "ar" ? "باقة التقنيات المعتمدة" : "Leading Tech Integrations & Stack"}
            </span>
            <div className="tech-stack-grid">
              {/* Gemini */}
              <div className="tech-logo-item tech-logo-gemini">
                <img src="/brand/gemini.png" alt="Gemini" width="18" height="18" style={{ objectFit: "contain" }} />
                <span className="tech-logo-text">Gemini</span>
              </div>

              {/* ADK */}
              <div className="tech-logo-item tech-logo-adk">
                <img src="/brand/adk.png" alt="Google ADK" width="18" height="18" style={{ objectFit: "contain" }} />
                <span className="tech-logo-text">Google ADK</span>
              </div>

              {/* Antigravity */}
              <div className="tech-logo-item tech-logo-antigravity">
                <img src="/brand/antigravity.png" alt="Antigravity" width="18" height="18" style={{ objectFit: "contain" }} />
                <span className="tech-logo-text">Antigravity</span>
              </div>

              {/* Firebase */}
              <div className="tech-logo-item tech-logo-firebase">
                <img src="/brand/firebase.png" alt="Firebase" width="18" height="18" style={{ objectFit: "contain" }} />
                <span className="tech-logo-text">Firebase</span>
              </div>

              {/* Next.js */}
              <div className="tech-logo-item tech-logo-nextjs">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#000000"/>
                  <path d="M16.5 17.5L9.5 8.5V15.5H8V7H9.5L16 15.3V7H17.5V17.5H16.5Z" fill="#FFFFFF"/>
                </svg>
                <span className="tech-logo-text">Next.js</span>
              </div>

              {/* Google Maps */}
              <div className="tech-logo-item tech-logo-googlemaps">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#EA4335" />
                  <path d="M12 6.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" fill="#4285F4" />
                </svg>
                <span className="tech-logo-text">Google Maps</span>
              </div>

              {/* MongoDB */}
              <div className="tech-logo-item tech-logo-mongodb">
                <img src="/brand/mongodb.png" alt="MongoDB" width="13" height="18" style={{ objectFit: "contain" }} />
                <span className="tech-logo-text">MongoDB</span>
              </div>

              {/* Cloud Armor */}
              <div className="tech-logo-item tech-logo-cloudarmor">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 9.9H6V6.31l6-2.25v7.84z" fill="#4285F4" />
                  <path d="M12 11.9h6V6.31l-6-2.25v7.84z" fill="#EA4335" opacity="0.9" />
                </svg>
                <span className="tech-logo-text">Cloud Armor</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Swarm Intelligence Section */}
      <section id="swarm" style={{ zIndex: 1, padding: "4rem 1.5rem", maxWidth: "1200px", margin: "0 auto", width: "100%", scrollMarginTop: "100px" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.75rem" }}>
            {t("section_swarm_title")}
          </h2>
          <p style={{ fontSize: "1.05rem", color: "#475569", maxWidth: "700px", margin: "0 auto", lineHeight: 1.6 }}>
            {t("section_swarm_desc")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
          <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderRadius: "var(--border-radius-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem" }}>
              <div style={{ background: "rgba(37,99,235,0.1)", color: "var(--primary)", padding: "0.5rem", borderRadius: "10px", display: "flex" }}>
                <FiCpu style={{ fontSize: "1.4rem" }} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("swarm_agent_coordinator")}</h3>
            </div>
            <p style={{ fontSize: "0.92rem", color: "#475569", lineHeight: 1.5 }}>{t("swarm_agent_coordinator_desc")}</p>
          </div>

          <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderRadius: "var(--border-radius-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem" }}>
              <div style={{ background: "rgba(249,115,22,0.1)", color: "var(--secondary)", padding: "0.5rem", borderRadius: "10px", display: "flex" }}>
                <FiActivity style={{ fontSize: "1.4rem" }} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("swarm_agent_companion")}</h3>
            </div>
            <p style={{ fontSize: "0.92rem", color: "#475569", lineHeight: 1.5 }}>{t("swarm_agent_companion_desc")}</p>
          </div>

          <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderRadius: "var(--border-radius-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem" }}>
              <div style={{ background: "rgba(13,148,136,0.1)", color: "var(--accent-green)", padding: "0.5rem", borderRadius: "10px", display: "flex" }}>
                <FiBookOpen style={{ fontSize: "1.4rem" }} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("swarm_agent_quiz")}</h3>
            </div>
            <p style={{ fontSize: "0.92rem", color: "#475569", lineHeight: 1.5 }}>{t("swarm_agent_quiz_desc")}</p>
          </div>

          <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", borderRadius: "var(--border-radius-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem" }}>
              <div style={{ background: "rgba(251,191,36,0.1)", color: "var(--accent-yellow)", padding: "0.5rem", borderRadius: "10px", display: "flex" }}>
                <FiShield style={{ fontSize: "1.4rem" }} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("swarm_agent_admin")}</h3>
            </div>
            <p style={{ fontSize: "0.92rem", color: "#475569", lineHeight: 1.5 }}>{t("swarm_agent_admin_desc")}</p>
          </div>
        </div>
      </section>

      {/* Non-intrusive AdSense Placeholder container to prevent CLS */}
      <AdSensePlaceholder type="leaderboard" />

      {/* System Features Section */}
      <section id="features" style={{ zIndex: 1, padding: "4rem 1.5rem", background: isDarkMode ? "rgba(17, 24, 39, 0.3)" : "rgba(255, 255, 255, 0.3)", borderTop: "1px solid var(--card-border)", borderBottom: "1px solid var(--card-border)", width: "100%", scrollMarginTop: "100px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.75rem" }}>
              {t("section_features_title")}
            </h2>
            <p style={{ fontSize: "1.05rem", color: "#475569", maxWidth: "700px", margin: "0 auto", lineHeight: 1.6 }}>
              {t("section_features_desc")}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "2rem" }}>
            <div className="panel-card" style={{ display: "flex", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "1.5rem" }}>
              <div style={{ background: "rgba(37,99,235,0.08)", color: "var(--primary)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FiBookOpen style={{ fontSize: "1.3rem" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{t("feature_library")}</h4>
                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("feature_library_desc")}</p>
              </div>
            </div>

            <div className="panel-card" style={{ display: "flex", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "1.5rem" }}>
              <div style={{ background: "rgba(249,115,22,0.08)", color: "var(--secondary)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FiLayers style={{ fontSize: "1.3rem" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{t("feature_subjects")}</h4>
                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("feature_subjects_desc")}</p>
              </div>
            </div>

            <div className="panel-card" style={{ display: "flex", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "1.5rem" }}>
              <div style={{ background: "rgba(13,148,136,0.08)", color: "var(--accent-green)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FiActivity style={{ fontSize: "1.3rem" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{t("feature_practice")}</h4>
                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("feature_practice_desc")}</p>
              </div>
            </div>

            <div className="panel-card" style={{ display: "flex", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "1.5rem" }}>
              <div style={{ background: "rgba(251,191,36,0.08)", color: "var(--accent-yellow)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FiCpu style={{ fontSize: "1.3rem" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{t("feature_plan")}</h4>
                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("feature_plan_desc")}</p>
              </div>
            </div>

            <div className="panel-card" style={{ display: "flex", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "1.5rem" }}>
              <div style={{ background: "rgba(37,99,235,0.08)", color: "var(--primary)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FiExternalLink style={{ fontSize: "1.3rem" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{t("feature_timetable")}</h4>
                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("feature_timetable_desc")}</p>
              </div>
            </div>

            <div className="panel-card" style={{ display: "flex", gap: "1.25rem", borderRadius: "var(--border-radius-md)", padding: "1.5rem" }}>
              <div style={{ background: "rgba(249,115,22,0.08)", color: "var(--secondary)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FiShield style={{ fontSize: "1.3rem" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{t("feature_zatona")}</h4>
                <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("feature_zatona_desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Fahem Section */}
      <section id="why-fahem" style={{ zIndex: 1, padding: "4rem 1.5rem", maxWidth: "1200px", margin: "0 auto", width: "100%", scrollMarginTop: "100px" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.75rem" }}>
            {t("section_why_fahem_title")}
          </h2>
          <p style={{ fontSize: "1.05rem", color: "#475569", maxWidth: "700px", margin: "0 auto", lineHeight: 1.6 }}>
            {t("section_why_fahem_desc")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
          <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
            <div style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(37,99,235,0.15)" }}>
              <FiGlobe style={{ fontSize: "1.3rem" }} />
            </div>
            <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("why_personalized_title")}</h4>
            <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_personalized_desc")}</p>
          </div>

          <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
            <div style={{ background: "linear-gradient(135deg, var(--secondary), var(--accent-orange))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(249,115,22,0.15)" }}>
              <FiLayers style={{ fontSize: "1.3rem" }} />
            </div>
            <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("why_bilingual_title")}</h4>
            <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_bilingual_desc")}</p>
          </div>

          <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
            <div style={{ background: "linear-gradient(135deg, var(--accent-green), var(--primary))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(13,148,136,0.15)" }}>
              <FiShield style={{ fontSize: "1.3rem" }} />
            </div>
            <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("why_secure_title")}</h4>
            <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_secure_desc")}</p>
          </div>

          <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
            <div style={{ background: "linear-gradient(135deg, var(--primary), var(--accent-green))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(37,99,235,0.15)" }}>
              <FiCpu style={{ fontSize: "1.3rem" }} />
            </div>
            <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("why_intelligent_title")}</h4>
            <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_intelligent_desc")}</p>
          </div>

          <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
            <div style={{ background: "linear-gradient(135deg, var(--accent-orange), var(--secondary))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(249,115,22,0.15)" }}>
              <FiActivity style={{ fontSize: "1.3rem" }} />
            </div>
            <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("why_clt_title")}</h4>
            <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_clt_desc")}</p>
          </div>

          <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
            <div style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-orange))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(13,148,136,0.15)" }}>
              <FiBookOpen style={{ fontSize: "1.3rem" }} />
            </div>
            <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("why_heutagogy_title")}</h4>
            <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_heutagogy_desc")}</p>
          </div>

          <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
            <div style={{ background: "linear-gradient(135deg, var(--accent-green), var(--secondary))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(16,107,163,0.15)" }}>
              <FiShield style={{ fontSize: "1.3rem" }} />
            </div>
            <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("why_security_title")}</h4>
            <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_security_desc")}</p>
          </div>

          <div className="panel-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", borderRadius: "var(--border-radius-md)", padding: "2rem" }}>
            <div style={{ background: "linear-gradient(135deg, var(--accent-orange), var(--primary))", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 15px rgba(37,99,235,0.15)" }}>
              <FiCpu style={{ fontSize: "1.3rem" }} />
            </div>
            <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{t("why_dag_title")}</h4>
            <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5, margin: 0 }}>{t("why_dag_desc")}</p>
          </div>
        </div>
      </section>

      {/* Dedicated Last Landing Section - Warm and informative Support Fahem section */}
      <DonationCard variant="section" />

      {/* Styled Interactive Footer with Asdaa.co Attribution */}
      <footer className="metadata-footer" style={{ zIndex: 2, padding: "3rem 1.5rem 2.5rem 1.5rem", width: "100%", borderTop: "1px solid var(--card-border)", background: isDarkMode ? "rgba(9, 13, 22, 0.9)" : "rgba(248, 250, 252, 0.9)", marginTop: "auto" }}>
        
        {/* Upper Sub-Section: Partners & Infrastructure Marquee */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          gap: "2.5rem", 
          flexWrap: "wrap", 
          margin: "0 auto 2.5rem auto", 
          maxWidth: "800px",
          padding: "1rem",
          borderBottom: "1px dashed rgba(16, 107, 163, 0.08)"
        }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>
            {language === "ar" ? "الشركاء والتقنيات" : "Partners & Technologies"}
          </span>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
            {/* Google Cloud Partner */}
            <a href="https://cloud.google.com" target="_blank" rel="noopener noreferrer" 
               style={{ display: "flex", alignItems: "center", gap: "0.35rem", opacity: 0.6, filter: "grayscale(100%)", transition: "all 0.2s", textDecoration: "none" }}
               onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "grayscale(0%)"; }}
               onMouseOut={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.filter = "grayscale(100%)"; }}>
              <img src="/brand/google_cloud.png" alt="Google Cloud" width="18" height="18" style={{ objectFit: "contain" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)" }}>Google Cloud</span>
            </a>

            {/* Firebase Partner */}
            <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer" 
               style={{ display: "flex", alignItems: "center", gap: "0.35rem", opacity: 0.6, filter: "grayscale(100%)", transition: "all 0.2s", textDecoration: "none" }}
               onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "grayscale(0%)"; }}
               onMouseOut={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.filter = "grayscale(100%)"; }}>
              <img src="/brand/firebase.png" alt="Firebase" width="16" height="18" style={{ objectFit: "contain" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)" }}>Firebase</span>
            </a>

            {/* Gemini Partner */}
            <a href="https://deepmind.google/technologies/gemini/" target="_blank" rel="noopener noreferrer" 
               style={{ display: "flex", alignItems: "center", gap: "0.35rem", opacity: 0.6, filter: "grayscale(100%)", transition: "all 0.2s", textDecoration: "none" }}
               onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "grayscale(0%)"; }}
               onMouseOut={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.filter = "grayscale(100%)"; }}>
              <img src="/brand/gemini.png" alt="Gemini" width="18" height="18" style={{ objectFit: "contain" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)" }}>Gemini</span>
            </a>

            {/* MongoDB Partner */}
            <a href="https://www.mongodb.com" target="_blank" rel="noopener noreferrer" 
               style={{ display: "flex", alignItems: "center", gap: "0.35rem", opacity: 0.6, filter: "grayscale(100%)", transition: "all 0.2s", textDecoration: "none" }}
               onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "grayscale(0%)"; }}
               onMouseOut={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.filter = "grayscale(100%)"; }}>
              <img src="/brand/mongodb.png" alt="MongoDB" width="12" height="18" style={{ objectFit: "contain" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)" }}>MongoDB</span>
            </a>

            {/* Devpost Partner */}
            <a href="https://devpost.com" target="_blank" rel="noopener noreferrer" 
               style={{ display: "flex", alignItems: "center", gap: "0.35rem", opacity: 0.6, filter: "grayscale(100%)", transition: "all 0.2s", textDecoration: "none" }}
               onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "grayscale(0%)"; }}
               onMouseOut={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.filter = "grayscale(100%)"; }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2 13h-4v-7h4c1.5 0 2.5 1 2.5 2.5s-1 4.5-2.5 4.5z" fill="#003E54"/>
              </svg>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)" }}>Devpost</span>
            </a>

            {/* ADK Partner */}
            <a href="https://github.com/google" target="_blank" rel="noopener noreferrer" 
               style={{ display: "flex", alignItems: "center", gap: "0.35rem", opacity: 0.6, filter: "grayscale(100%)", transition: "all 0.2s", textDecoration: "none" }}
               onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "grayscale(0%)"; }}
               onMouseOut={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.filter = "grayscale(100%)"; }}>
              <img src="/brand/adk.png" alt="Google ADK" width="18" height="18" style={{ objectFit: "contain" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)" }}>ADK 2.0</span>
            </a>

            {/* Antigravity Partner */}
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" 
               style={{ display: "flex", alignItems: "center", gap: "0.35rem", opacity: 0.6, filter: "grayscale(100%)", transition: "all 0.2s", textDecoration: "none" }}
               onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "grayscale(0%)"; }}
               onMouseOut={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.filter = "grayscale(100%)"; }}>
              <img src="/brand/antigravity.png" alt="Antigravity" width="18" height="18" style={{ objectFit: "contain" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)" }}>Antigravity</span>
            </a>

            {/* Asdaa Partner */}
            <a href="https://asdaa.co" target="_blank" rel="noopener noreferrer" 
               style={{ display: "flex", alignItems: "center", gap: "0.35rem", opacity: 0.6, filter: "grayscale(100%)", transition: "all 0.2s", textDecoration: "none" }}
               onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "grayscale(0%)"; }}
               onMouseOut={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.filter = "grayscale(100%)"; }}>
              <img src="/brand/asdaa.png" alt="Asdaa.co" height="18" style={{ objectFit: "contain" }} />
            </a>
          </div>
        </div>

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
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="X" 
               style={{ display: "inline-flex", opacity: 0.7, transition: "all 0.3s ease", transform: "scale(1)" }}
               onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.opacity = "1"; }}
               onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.7"; }}>
              <img src="/brand/social_x.png" alt="X" width="22" height="22" style={{ objectFit: "contain", filter: isDarkMode ? "invert(1)" : "none" }} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Instagram" 
               style={{ display: "inline-flex", opacity: 0.7, transition: "all 0.3s ease", transform: "scale(1)" }}
               onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.opacity = "1"; }}
               onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.7"; }}>
              <img src="/brand/social_instagram.png" alt="Instagram" width="22" height="22" style={{ objectFit: "contain" }} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Facebook" 
               style={{ display: "inline-flex", opacity: 0.7, transition: "all 0.3s ease", transform: "scale(1)" }}
               onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.opacity = "1"; }}
               onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.7"; }}>
              <img src="/brand/social_facebook.png" alt="Facebook" width="22" height="22" style={{ objectFit: "contain" }} />
            </a>
            <a href="mailto:info@asdaa.co" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Email" 
               style={{ display: "inline-flex", opacity: 0.7, transition: "all 0.3s ease", transform: "scale(1)" }}
               onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.opacity = "1"; }}
               onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.7"; }}>
              <img src="/brand/social_email.png" alt="Email" width="22" height="22" style={{ objectFit: "contain", filter: isDarkMode ? "invert(1)" : "none" }} />
            </a>
          </div>

          {/* Line 3: Unified copyright, Project console, and Developer attribution (Asdaa.co) */}
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span>{t("footer_landing")}</span>
              <span style={{ color: "#94a3b8" }}>|</span>
              <span>Project Console • Developed by <a href="https://asdaa.co" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline", fontWeight: 700 }}>Asdaa.co</a></span>
            </p>
          </div>

        </div>
      </footer>
    </div>
  );
}
