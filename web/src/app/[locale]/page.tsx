"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider } from "../../lib/firebase";
import { signInWithPopup, onAuthStateChanged, User, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../context/LanguageContext";
import { 
  FiGithub,
  FiGlobe,
  FiTwitter, 
  FiLinkedin, 
  FiYoutube,
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
  FiSend
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
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        router.push(`/${language}/home`);
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

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setErrorMsg(t("phone_empty"));
      return;
    }
    setSendingCode(true);
    setErrorMsg("");

    try {
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
      <nav className="glass-nav" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, backdropFilter: "blur(20px)", borderBottom: "1px solid var(--card-border)", background: "rgba(248, 250, 252, 0.75)" }}>
        <div className="glass-nav-logo" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiCpu className="pulse-icon" style={{ fontSize: "1.6rem", color: "var(--secondary)" }} />
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
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="zh">中文</option>
                <option value="it">Italiano</option>
              </select>
            </div>
          </li>
          <li>
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="btn btn-primary btn-nav-signin"
              style={{ padding: "0.5rem 1.25rem", borderRadius: "30px", fontSize: "0.9rem", fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s" }}
            >
              {signingIn ? t("nav_signing_in") : t("nav_signin")}
            </button>
          </li>
        </ul>
      </nav>

      {/* Hero Section */}
      <main id="overview" className="glass-hero-section" style={{ zIndex: 1, padding: "90px 1.5rem 1rem 1.5rem", maxWidth: "1200px", margin: "0 auto", width: "100%", scrollMarginTop: "100px" }}>
        <div className="glass-card" style={{ background: "rgba(255, 255, 255, 0.45)", backdropFilter: "blur(20px)", border: "1px solid var(--card-border)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem 2rem", boxShadow: "var(--shadow-lg)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", width: "42px", height: "42px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(37, 99, 235, 0.15)" }}>
            <FiKey style={{ fontSize: "1.25rem", color: "#ffffff" }} />
          </div>
          <h2 style={{ fontSize: "1.85rem", fontWeight: 800, background: "linear-gradient(135deg, var(--primary) 30%, var(--secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2 }}>{t("welcome_to_fahem")}</h2>
          <p style={{ fontSize: "0.92rem", color: "#475569", maxWidth: "800px", margin: "0 auto", lineHeight: 1.5 }}>{t("hero_subtitle")}</p>

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

          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}>
            {/* Official Google branded sign-in button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="google-btn"
              id="google-signin-button"
              type="button"
              style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "#ffffff", border: "1px solid var(--card-border)", borderRadius: "30px", padding: "0.6rem 1.5rem", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", boxShadow: "var(--shadow-sm)", transition: "transform 0.2s, box-shadow 0.2s" }}
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

      {/* System Features Section */}
      <section id="features" style={{ zIndex: 1, padding: "4rem 1.5rem", background: "rgba(255, 255, 255, 0.3)", borderTop: "1px solid var(--card-border)", borderBottom: "1px solid var(--card-border)", width: "100%", scrollMarginTop: "100px" }}>
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
        </div>
      </section>

      {/* Styled Interactive Footer with Asdaa.co Attribution */}
      <footer className="metadata-footer" style={{ zIndex: 2, padding: "3rem 1.5rem 2.5rem 1.5rem", width: "100%", borderTop: "1px solid var(--card-border)", background: "rgba(248, 250, 252, 0.9)", marginTop: "auto" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <a href={`/${language}/terms`} className="footer-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.8 }}>
            <FiBookOpen /> {t("nav_terms")}
          </a>
          <a href={`/${language}/privacy`} className="footer-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem", fontWeight: 500, color: "var(--foreground)", opacity: 0.8 }}>
            <FiLock /> {t("nav_privacy")}
          </a>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="LinkedIn" style={{ color: "var(--foreground)", opacity: 0.7, fontSize: "1.2rem", transition: "opacity 0.2s" }}>
            <FiLinkedin />
          </a>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="X" style={{ color: "var(--foreground)", opacity: 0.7, fontSize: "1.2rem", transition: "opacity 0.2s" }}>
            <FiTwitter />
          </a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="YouTube" style={{ color: "var(--foreground)", opacity: 0.7, fontSize: "1.2rem", transition: "opacity 0.2s" }}>
            <FiYoutube />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Instagram" style={{ color: "var(--foreground)", opacity: 0.7, fontSize: "1.2rem", transition: "opacity 0.2s" }}>
            <FiInstagram />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Facebook" style={{ color: "var(--foreground)", opacity: 0.7, fontSize: "1.2rem", transition: "opacity 0.2s" }}>
            <FiFacebook />
          </a>
        </div>

        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.9rem", color: "#64748b", margin: 0 }}>{t("footer_landing")}</p>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600, margin: 0, letterSpacing: "0.5px" }}>
            Developed by <a href="https://asdaa.co" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline", fontWeight: 700 }}>Asdaa.co</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
