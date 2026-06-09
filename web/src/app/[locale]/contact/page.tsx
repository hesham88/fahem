"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "../../../context/LanguageContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiMail, FiMessageSquare, FiUser, FiInfo, FiSend, FiCheckCircle, FiTerminal } from "react-icons/fi";
import DonationCard from "../../../components/DonationCard";
import { authedFetch } from "../../../lib/authedFetch";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export default function ContactPage() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const isAr = language === "ar";

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [agentResponse, setAgentResponse] = useState("");

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setEmail(user.email || "");
        setName(user.displayName || "");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const executeRecaptcha = (): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const grecaptcha = (window as any).grecaptcha;
        if (grecaptcha && grecaptcha.enterprise) {
          grecaptcha.enterprise.ready(async () => {
            try {
              const token = await grecaptcha.enterprise.execute('6LfT9wQtAAAAAFElDHZ9ddSZHbKzMZx2-IO7PLKV', { action: 'REPORT_SUBMIT' });
              console.log("[reCAPTCHA Enterprise] Token acquired for contact submission:", token);
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
        console.error("[reCAPTCHA Enterprise] Unexpected error:", err);
        resolve(null);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;

    setLoading(true);
    setSubmitted(false);
    setAgentResponse("");
    setLogs([isAr ? "جاري بدء اتصال آمن مع وكيل MongoDB..." : "Initiating secure stream to MongoDB agent..."]);

    const prompt = `
      Please record this Contact Us message inside the 'reports' collection within the 'fahem' database.
      Here are the fields to write:
      - name: "${name || 'Anonymous'}"
      - email: "${email}"
      - subject: "Contact Us: ${subject || 'General Inquiry'}"
      - description: "${message}"
      - timestamp: "${new Date().toISOString()}"

      Make sure to insert it into MongoDB using your insert-many/update-many tools and then respond in "${language}" with a short, extremely polite professional confirmation.
    `;

    try {
      console.log("[reCAPTCHA Enterprise] Securing contact us action...");
      const token = await executeRecaptcha();
      
      const response = await authedFetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          language,
          userEmail: currentUser?.email || email || "",
          userId: currentUser?.uid || "",
          recaptchaToken: token || undefined
        }),
      });

      if (!response.body) {
        throw new Error("ReadableStream not supported by browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedResult = "";

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          lines.forEach((line) => {
            if (line.trim()) {
              setLogs((prev) => [...prev, line]);
              if (!line.includes("[STDERR]") && !line.includes("[CLOSE]") && !line.includes("[Unknown]") && !line.includes("[Fahem Agent]") && !line.startsWith("[Sub-Agent:") && !line.startsWith("Loading local configuration") && !line.startsWith("Prompt:") && !line.startsWith("Starting Fahem") && !line.startsWith("Invoking agent")) {
                if (line !== "=== Agent Final Output ===" && line !== "==========================") {
                  accumulatedResult += line + "\n";
                }
              }
            }
          });
        }
      }

      const cleanResult = accumulatedResult
         .replace(/=== Agent Final Output ===/g, "")
         .replace(/==========================/g, "")
         .trim();

      setAgentResponse(cleanResult || (isAr ? "تم إرسال رسالتك بنجاح!" : "Message Sent Successfully!"));
      setSubmitted(true);
      setMessage(""); // Clear message field
    } catch (error: any) {
      setLogs((prev) => [...prev, (isAr ? "فشل الاتصال: " : "Stream failure: ") + error.message]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-container" dir={isAr ? "rtl" : "ltr"}>
      {/* Background ambient light */}
      <div className="ambient-background">
        <div className="sphere sphere-1"></div>
        <div className="sphere sphere-2"></div>
        <div className="sphere sphere-3"></div>
      </div>

      {/* Glassmorphic Navbar */}
      <nav className="glass-nav">
        <div className="glass-nav-logo" onClick={() => router.push(`/${language}`)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/brand/logo_compressed.png" alt="Fahem Logo" style={{ height: "2rem", width: "auto" }} />
          <span>{t("dashboard_title")}</span>
        </div>
        <button className="btn btn-secondary" onClick={() => router.push(`/${language}`)}>
          <FiArrowLeft style={{ fontSize: "1.2rem", transform: isAr ? "rotate(180deg)" : "none" }} />
          <span>{isAr ? "العودة" : "Back"}</span>
        </button>
      </nav>

      {/* Main Container */}
      <main className="glass-hero-section" style={{ padding: "4rem 1.5rem" }}>
        <div className="glass-card" style={{ maxWidth: "800px", width: "100%", margin: "0 auto", textAlign: "start" }}>
          
          <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
            <FiMail style={{ fontSize: "2rem", color: "#ffffff" }} />
          </div>

          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>
            {isAr ? "اتصل بنا" : "Contact Us"}
          </h1>
          <p style={{ color: "#6a7c88", fontSize: "1.1rem", marginBottom: "2rem" }}>
            {isAr 
              ? "لديك استفسار، اقتراح أو رغبة في التعاون؟ نحن هنا للاستماع إليك ومساعدتك في أي وقت." 
              : "Have a question, feedback, or custom feature suggestion? Drop us a line below."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {submitted ? (
              <div 
                style={{ 
                  background: "rgba(16, 185, 129, 0.1)", 
                  border: "1px solid rgba(16, 185, 129, 0.3)", 
                  borderRadius: "16px", 
                  padding: "2rem", 
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1rem",
                  margin: "1rem 0"
                }}
              >
                <FiCheckCircle style={{ width: "3rem", height: "3rem", color: "#10b981" }} />
                <h3 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                  {isAr ? "تم إرسال رسالتك بنجاح!" : "Message Sent Successfully!"}
                </h3>
                {agentResponse && (
                  <div style={{
                    background: "rgba(255, 255, 255, 0.4)",
                    border: "1px solid var(--card-border)",
                    borderRadius: "12px",
                    padding: "1rem 1.5rem",
                    textAlign: "start",
                    width: "100%",
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                    color: "var(--foreground)",
                    marginTop: "0.5rem"
                  }}>
                    <strong style={{ color: "var(--primary)", display: "block", marginBottom: "0.25rem" }}>
                      {isAr ? "تأكيد الوكيل الرقمي:" : "Agent Confirmation:"}
                    </strong>
                    {agentResponse}
                  </div>
                )}
                <p style={{ fontSize: "0.95rem", color: "var(--foreground-muted, #94a3b8)", margin: 0 }}>
                  {isAr 
                    ? "شكرًا لتواصلك معنا. سنقوم بمراجعة رسالتك والرد عليك في أقرب وقت ممكن." 
                    : "Thank you for reaching out. We will review your inquiry and get back to you shortly."}
                </p>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setSubmitted(false);
                    setLogs([]);
                  }}
                  style={{ marginTop: "1rem" }}
                >
                  {isAr ? "إرسال رسالة أخرى" : "Send Another Message"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                
                {/* Name */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label htmlFor="contact-name" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>
                    {isAr ? "الاسم الكامل" : "Your Name"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <FiUser style={{ position: "absolute", top: "50%", left: isAr ? "auto" : "12px", right: isAr ? "12px" : "auto", transform: "translateY(-50%)", color: "#64748b" }} />
                    <input
                      id="contact-name"
                      type="text"
                      required
                      placeholder={isAr ? "أدخل اسمك الكريم" : "John Doe"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading || !!currentUser}
                      style={{
                        width: "100%",
                        padding: isAr ? "0.75rem 2.5rem 0.75rem 1rem" : "0.75rem 1rem 0.75rem 2.5rem",
                        borderRadius: "12px",
                        border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
                        background: currentUser ? "rgba(226, 232, 240, 0.4)" : "var(--card-bg, rgba(30,41,59,0.3))",
                        color: currentUser ? "#64748b" : "var(--foreground)",
                        cursor: currentUser ? "not-allowed" : "text",
                        outline: "none",
                        fontSize: "0.95rem"
                      }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label htmlFor="contact-email" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>
                    {isAr ? "البريد الإلكتروني" : "Email Address"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <FiMail style={{ position: "absolute", top: "50%", left: isAr ? "auto" : "12px", right: isAr ? "12px" : "auto", transform: "translateY(-50%)", color: "#64748b" }} />
                    <input
                      id="contact-email"
                      type="email"
                      required
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading || !!currentUser}
                      style={{
                        width: "100%",
                        padding: isAr ? "0.75rem 2.5rem 0.75rem 1rem" : "0.75rem 1rem 0.75rem 2.5rem",
                        borderRadius: "12px",
                        border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
                        background: currentUser ? "rgba(226, 232, 240, 0.4)" : "var(--card-bg, rgba(30,41,59,0.3))",
                        color: currentUser ? "#64748b" : "var(--foreground)",
                        cursor: currentUser ? "not-allowed" : "text",
                        outline: "none",
                        fontSize: "0.95rem"
                      }}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label htmlFor="contact-subject" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>
                    {isAr ? "الموضوع" : "Subject"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <FiInfo style={{ position: "absolute", top: "50%", left: isAr ? "auto" : "12px", right: isAr ? "12px" : "auto", transform: "translateY(-50%)", color: "#64748b" }} />
                    <input
                      id="contact-subject"
                      type="text"
                      placeholder={isAr ? "ما هو موضوع رسالتك؟" : "Partnership opportunity, issue report..."}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={loading}
                      style={{
                        width: "100%",
                        padding: isAr ? "0.75rem 2.5rem 0.75rem 1rem" : "0.75rem 1rem 0.75rem 2.5rem",
                        borderRadius: "12px",
                        border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
                        background: "var(--card-bg, rgba(30,41,59,0.3))",
                        color: "var(--foreground)",
                        outline: "none",
                        fontSize: "0.95rem"
                      }}
                    />
                  </div>
                </div>

                {/* Message */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label htmlFor="contact-message" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>
                    {isAr ? "الرسالة" : "Your Message"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <FiMessageSquare style={{ position: "absolute", top: "15px", left: isAr ? "auto" : "12px", right: isAr ? "12px" : "auto", color: "#64748b" }} />
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      placeholder={isAr ? "اكتب استفسارك بالتفصيل هنا..." : "Type your message details here..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={loading}
                      style={{
                        width: "100%",
                        padding: isAr ? "0.75rem 2.5rem 0.75rem 1rem" : "0.75rem 1rem 0.75rem 2.5rem",
                        borderRadius: "12px",
                        border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
                        background: "var(--card-bg, rgba(30,41,59,0.3))",
                        color: "var(--foreground)",
                        outline: "none",
                        fontSize: "0.95rem",
                        resize: "vertical"
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !email.trim() || !message.trim()}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "12px",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                    cursor: loading ? "not-allowed" : "pointer"
                  }}
                >
                  <span>{loading ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إرسال الرسالة" : "Send Message")}</span>
                  <FiSend style={{ transform: isAr ? "scaleX(-1)" : "none" }} />
                </button>
              </form>
            )}

            {/* Real-time Ingestion Stream Logs */}
            {logs.length > 0 && (
              <div style={{ marginTop: "1rem", borderTop: "1px dashed var(--card-border)", paddingTop: "1.5rem" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "1rem", color: "var(--foreground)" }}>
                  <FiTerminal /> {isAr ? "بث الاتصال بـ MongoDB MCP:" : "MongoDB MCP Agent Ingestion Stream:"}
                </h3>
                
                <div className="logs-console" style={{ maxHeight: "200px" }}>
                  {logs.map((log, idx) => {
                    let styleClass = "log-info";
                    if (log.startsWith("[SYSTEM]")) styleClass = "log-success";
                    else if (log.startsWith("[STDERR]") || log.startsWith("[ERROR]")) styleClass = "log-error";
                    else if (log.includes("Tool Call:") || log.includes("requesting Tool")) styleClass = "log-tool";
                    
                    return (
                      <div key={idx} className={`log-entry ${styleClass}`}>
                        {log}
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}

            {/* Compact Donation Card inside the Contact page card */}
            <DonationCard variant="compact" />
          </div>
        </div>
      </main>

      <footer className="metadata-footer" style={{ zIndex: 2, paddingBottom: "2rem" }}>
        <p>{t("footer_landing")}</p>
      </footer>
    </div>
  );
}
