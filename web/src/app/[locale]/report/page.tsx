"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "../../../context/LanguageContext";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiAlertOctagon, FiSend, FiTerminal, FiCheckCircle } from "react-icons/fi";

export default function ReportPage() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Database Bug");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !description) return;

    setLoading(true);
    setSuccess(false);
    setAgentResponse("");
    setLogs([t("initiating_stream")]);

    // Constructing a specific, structured prompt that instructs our MongoDB ADK agent
    // to utilize the insert-many/update-many tools to record the user's report.
    const prompt = `
      Please record this user issue report inside the 'reports' collection within the 'fahem' database.
      Here are the fields to write:
      - name: "${name || 'Anonymous'}"
      - email: "${email}"
      - subject: "${subject}"
      - description: "${description}"
      - timestamp: "${new Date().toISOString()}"

      Make sure to insert it into MongoDB and then respond in "${language}" with a short professional confirmation.
    `;

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          language,
          userEmail: currentUser?.email || email || "",
          userId: currentUser?.uid || ""
        }),
      });

      if (!response.body) {
        throw new Error("ReadableStream not supported by the browser response.");
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

      setAgentResponse(cleanResult || t("report_success"));
      setSuccess(true);
      setDescription(""); // Clear description on success
    } catch (error: any) {
      setLogs((prev) => [...prev, t("stream_failure") + error.message]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-container">
      {/* Background ambient light */}
      <div className="ambient-background">
        <div className="sphere sphere-1"></div>
        <div className="sphere sphere-2"></div>
        <div className="sphere sphere-3"></div>
      </div>

      {/* Glassmorphic Navbar */}
      <nav className="glass-nav">
        <div className="glass-nav-logo" onClick={() => router.push(`/${language}`)}>
          <span>🧠</span> {t("dashboard_title")}
        </div>
        <button className="btn btn-secondary" onClick={() => router.push(`/${language}`)}>
          <FiArrowLeft style={{ fontSize: "1.2rem" }} />
          <span>{language === "ar" ? "العودة" : "Back"}</span>
        </button>
      </nav>

      {/* Main Container */}
      <main className="glass-hero-section" style={{ padding: "4rem 1.5rem" }}>
        <div className="glass-card" style={{ maxWidth: "750px", width: "100%", margin: "0 auto", textAlign: "left" }}>
          <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
            <FiAlertOctagon style={{ fontSize: "2rem", color: "#ffffff" }} />
          </div>

          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>{t("report_tool_title")}</h1>
          <p style={{ color: "#6a7c88", fontSize: "1.1rem", marginBottom: "2rem" }}>{t("report_tool_desc")}</p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("lbl_report_name")}</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  style={{
                    padding: "0.75rem",
                    borderRadius: "var(--border-radius-md)",
                    border: "1px solid var(--card-border)",
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                    background: "rgba(255,255,255,0.8)"
                  }}
                  disabled={loading}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("lbl_report_email")} *</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. email@domain.com"
                  style={{
                    padding: "0.75rem",
                    borderRadius: "var(--border-radius-md)",
                    border: "1px solid var(--card-border)",
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                    background: "rgba(255,255,255,0.8)"
                  }}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("lbl_report_subject")}</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "var(--border-radius-md)",
                  border: "1px solid var(--card-border)",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  background: "#ffffff"
                }}
                disabled={loading}
              >
                <option value="Database Bug">{language === "ar" ? "خلل في قاعدة البيانات" : "Database Bug"}</option>
                <option value="AI Recommendation Error">{language === "ar" ? "خطأ في توصيات الذكاء الاصطناعي" : "AI Recommendation Error"}</option>
                <option value="General Feedback">{language === "ar" ? "ملاحظات عامة" : "General Feedback"}</option>
                <option value="Security Vulnerability">{language === "ar" ? "ثغرة أمنية" : "Security Vulnerability"}</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("lbl_report_description")} *</label>
              <textarea 
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue or feedback in detail..."
                style={{
                  padding: "1rem",
                  minHeight: "120px",
                  borderRadius: "var(--border-radius-md)",
                  border: "1px solid var(--card-border)",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  background: "rgba(255,255,255,0.8)",
                  resize: "vertical"
                }}
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ padding: "0.85rem", alignSelf: "flex-start", minWidth: "180px" }}
              disabled={loading || !email.trim() || !description.trim()}
            >
              <FiSend />
              <span>{loading ? (language === "ar" ? "جاري الإرسال..." : "Submitting...") : t("btn_submit_report")}</span>
            </button>
          </form>

          {/* Real-time Ingestion Stream Logs */}
          {(logs.length > 0 || success) && (
            <div style={{ marginTop: "2.5rem", borderTop: "1px dashed var(--card-border)", paddingTop: "2rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "1rem", color: "var(--foreground)" }}>
                <FiTerminal /> {language === "ar" ? "بث الاتصال بـ MongoDB MCP:" : "MongoDB MCP Agent Ingestion Stream:"}
              </h3>
              
              <div className="logs-console" style={{ maxHeight: "250px" }}>
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

              {success && agentResponse && (
                <div className="agent-response-box" style={{ background: "rgba(46, 125, 50, 0.05)", borderColor: "var(--accent-green)" }}>
                  <h4 style={{ color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "1rem" }}>
                    <FiCheckCircle /> {language === "ar" ? "تأكيد الوكيل:" : "Agent Confirmation:"}
                  </h4>
                  <p style={{ marginTop: "0.5rem", color: "var(--foreground)", fontSize: "0.95rem" }}>
                    {agentResponse}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <footer className="metadata-footer" style={{ zIndex: 2, paddingBottom: "2rem" }}>
        <p>{t("footer_landing")}</p>
      </footer>
    </div>
  );
}
