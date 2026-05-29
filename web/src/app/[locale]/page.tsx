"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider } from "../../lib/firebase";
import { signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../context/LanguageContext";
import { 
  FiGithub, 
  FiTwitter, 
  FiLinkedin, 
  FiGlobe, 
  FiBookOpen, 
  FiLock, 
  FiActivity, 
  FiCpu, 
  FiKey, 
  FiLayers, 
  FiShield, 
  FiExternalLink 
} from "react-icons/fi";

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        router.push(`/${language}/dashboard`);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, language]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setErrorMsg("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        router.push(`/${language}/dashboard`);
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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--background)", fontFamily: "var(--font-display)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <FiCpu className="spinning-icon" style={{ fontSize: "3rem", color: "var(--primary)" }} />
          <div style={{ fontSize: "1.2rem", color: "var(--primary)", fontWeight: 500 }}>{t("loading_ambient")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-container">
      {/* Dynamic blurred environment spheres */}
      <div className="ambient-background">
        <div className="sphere sphere-1"></div>
        <div className="sphere sphere-2"></div>
        <div className="sphere sphere-3"></div>
      </div>

      {/* Glassmorphic Navbar */}
      <nav className="glass-nav">
        <div className="glass-nav-logo" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiCpu className="pulse-icon" style={{ fontSize: "1.6rem", color: "var(--secondary)" }} />
          <span style={{ fontWeight: 700, letterSpacing: "1px" }}>{t("dashboard_title")}</span>
        </div>
        <ul className="glass-nav-links">
          <li>
            <a href="#overview" className="glass-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <FiLayers /> {t("nav_overview")}
            </a>
          </li>
          <li>
            <a href="#toolkit" className="glass-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <FiActivity /> {t("nav_toolkit")}
            </a>
          </li>
          <li>
            <a href="https://github.com/hesham88/fahem" target="_blank" rel="noopener noreferrer" className="glass-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
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
                style={{ marginLeft: "0.25rem" }}
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
            >
              {signingIn ? t("nav_signing_in") : t("nav_signin")}
            </button>
          </li>
        </ul>
      </nav>

      {/* Glassmorphic Hero section */}
      <main className="glass-hero-section">
        <div className="glass-card">
          <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
            <FiKey style={{ fontSize: "1.8rem", color: "#ffffff" }} />
          </div>
          <h2>{t("welcome_to_fahem")}</h2>
          <p>{t("hero_subtitle")}</p>

          <div className="feature-bullets">
            <div className="feature-bullet-item">
              <span className="feature-bullet-icon"><FiLayers /></span>
              <span>{t("bullet_1")}</span>
            </div>
            <div className="feature-bullet-item">
              <span className="feature-bullet-icon" style={{ color: "var(--accent-orange)" }}><FiActivity /></span>
              <span>{t("bullet_2")}</span>
            </div>
            <div className="feature-bullet-item">
              <span className="feature-bullet-icon" style={{ color: "var(--accent-green)" }}><FiShield /></span>
              <span>{t("bullet_3")}</span>
            </div>
          </div>

          {errorMsg && (
            <div style={{ color: "var(--accent-orange)", fontSize: "0.9rem", marginTop: "-0.5rem", fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}

          {/* Official Google branded sign-in button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="google-btn"
            id="google-signin-button"
            type="button"
          >
            {/* Embedded Google Color Logo SVG */}
            <svg className="google-icon-svg" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>{signingIn ? t("btn_connecting_google") : t("btn_signin_google")}</span>
          </button>
        </div>
      </main>

      {/* Styled Interactive Footer */}
      <footer className="metadata-footer" style={{ zIndex: 2, padding: "3rem 1.5rem 2.5rem 1.5rem", width: "100%", borderTop: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <a href={`/${language}/terms`} className="footer-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <FiBookOpen /> {t("nav_terms")}
          </a>
          <a href={`/${language}/privacy`} className="footer-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <FiLock /> {t("nav_privacy")}
          </a>
          <a href={`/${language}/report`} className="footer-nav-link" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <FiActivity /> {t("nav_report")}
          </a>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Twitter">
            <FiTwitter />
          </a>
          <a href="https://github.com/hesham88/fahem" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="GitHub">
            <FiGithub />
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="LinkedIn">
            <FiLinkedin />
          </a>
          <a href="https://fahem.app" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Website">
            <FiGlobe />
          </a>
        </div>

        <p>{t("footer_landing")}</p>
      </footer>
    </div>
  );
}
