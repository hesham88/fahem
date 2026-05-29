"use client";

import { useState, useRef, useEffect } from "react";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../../context/LanguageContext";
import AdminSecurityDashboard from "../../../components/AdminSecurityDashboard";
import { 
  FiCpu, 
  FiTerminal, 
  FiSettings, 
  FiLayers, 
  FiDatabase, 
  FiGlobe, 
  FiActivity, 
  FiShield, 
  FiLogOut, 
  FiCheckCircle, 
  FiRefreshCw, 
  FiPlus, 
  FiLink, 
  FiClock, 
  FiBookOpen, 
  FiLock, 
  FiTwitter, 
  FiLinkedin,
  FiGithub,
  FiFileText,
  FiTrash2,
  FiAlertTriangle,
  FiServer
} from "react-icons/fi";

interface PresetQuery {
  title: string;
  description: string;
  query: string;
}

const telemetryTranslations = {
  en: {
    telemetryTitle: "Sub-Agent Execution Telemetry",
    activeAgent: "Active Agent:",
    guardrailName: "Guardrail Audit",
    dbEngineName: "Database Engine",
    orchestratorName: "Orchestrator",
    groundedTitle: "Grounded Multi-Agent Telemetry",
    groundedSearchName: "Grounded Search",
    stylizerName: "Stylizer",
    statusAuditing: "Auditing...",
    statusQuerying: "Querying...",
    statusFormatting: "Formatting...",
    statusSearching: "Searching...",
    statusStylizing: "Stylizing...",
    statusCompleted: "Passed",
    statusExecuted: "Executed",
    statusStructured: "Structured",
    statusFound: "Sourced",
    statusStylized: "Stylized",
    statusIdle: "Idle",
    unitMs: "ms",
    unitSec: "s"
  },
  ar: {
    telemetryTitle: "مؤشرات تشغيل الوكلاء الفرعيين",
    activeAgent: "الوكيل النشط حالياً:",
    guardrailName: "مراجعة الحماية والأمان",
    dbEngineName: "محرك الاستعلام وقاعدة البيانات",
    orchestratorName: "منسق المخرجات والعرض",
    groundedTitle: "تتبع البحث الموثق متعدد الوكلاء",
    groundedSearchName: "محرك البحث والتقصي",
    stylizerName: "منسق الأسلوب والصياغة",
    statusAuditing: "جاري التدقيق والأمان...",
    statusQuerying: "جاري استعلام البيانات...",
    statusFormatting: "جاري تنظيم وهيكلة البيانات...",
    statusSearching: "جاري البحث والتقصي...",
    statusStylizing: "جاري صياغة وتنسيق الأسلوب...",
    statusCompleted: "تم التدقيق بنجاح",
    statusExecuted: "تم الاستعلام بنجاح",
    statusStructured: "تمت الهيكلة بنجاح",
    statusFound: "تم العثور والمطابقة",
    statusStylized: "تم التنسيق النهائي",
    statusIdle: "في الانتظار",
    unitMs: "ملي ثانية",
    unitSec: "ثانية"
  }
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();

  const getTelemetryT = (key: keyof typeof telemetryTranslations.en) => {
    const lang = (language as keyof typeof telemetryTranslations) || "en";
    const dictionary = telemetryTranslations[lang] || telemetryTranslations.en;
    return dictionary[key] || telemetryTranslations.en[key];
  };

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [finalResult, setFinalResult] = useState("");
  
  // Superadmin status
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"agent" | "admin">("agent");

  // Grounded Multi-Agent Test Bench State
  const [groundedPrompt, setGroundedPrompt] = useState("");
  const [groundedInput, setGroundedInput] = useState("");
  const [groundedLoading, setGroundedLoading] = useState(false);
  const [groundedLogs, setGroundedLogs] = useState<string[]>([]);
  const [groundedResult, setGroundedResult] = useState("");
  const groundedLogsEndRef = useRef<HTMLDivElement>(null);

  // Real-time Multi-Agent Telemetry State (MongoDB Engine)
  const [activeDbAgent, setActiveDbAgent] = useState<string>("idle");
  const [dbGuardTime, setDbGuardTime] = useState<string>("");
  const [dbEngineTime, setDbEngineTime] = useState<string>("");
  const [dbOrchTime, setDbOrchTime] = useState<string>("");

  // Real-time Multi-Agent Telemetry State (Grounded Search Engine)
  const [activeGroundedAgent, setActiveGroundedAgent] = useState<string>("idle");
  const [groundedSearchTime, setGroundedSearchTime] = useState<string>("");
  const [stylizerTime, setStylizerTime] = useState<string>("");

  const [stats, setStats] = useState({
    databaseName: "...",
    collectionsCount: "...",
    collectionList: "...",
    storageSize: "...",
    indexCount: "...",
    status: "Connecting..."
  });

  const logsEndRef = useRef<HTMLDivElement>(null);

  const presets: PresetQuery[] = [
    {
      title: t("preset_list_db_title"),
      description: t("preset_list_db_desc"),
      query: t("preset_list_db_query")
    },
    {
      title: t("preset_get_stats_title"),
      description: t("preset_get_stats_desc"),
      query: t("preset_get_stats_query")
    },
    {
      title: t("preset_schema_title"),
      description: t("preset_schema_desc"),
      query: t("preset_schema_query")
    },
    {
      title: t("preset_list_col_title"),
      description: t("preset_list_col_desc"),
      query: t("preset_list_col_query")
    }
  ];

  const fetchMetadata = async (emailParam?: string) => {
    try {
      const activeEmail = emailParam || user?.email;
      if (!activeEmail) return;
      const response = await fetch(`/api/db-metadata?email=${encodeURIComponent(activeEmail)}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        setStats((prev) => ({ ...prev, status: "Error fetching metadata" }));
      }
    } catch (error) {
      setStats((prev) => ({ ...prev, status: "Disconnected" }));
    }
  };

  // Auth Guard & Initial Load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push(`/${language}`);
      } else {
        setUser(currentUser);
        fetchMetadata(currentUser.email || undefined); // Fetch live database metadata on mount
        
        // Verify superadmin status
        if (currentUser.email) {
          fetch(`/api/admin/check?email=${encodeURIComponent(currentUser.email)}`)
            .then((res) => res.json())
            .then((data) => setIsAdmin(data.isAdmin))
            .catch(() => setIsAdmin(false));
        }
      }
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, [router, language]);

  // Auto scroll terminal to the bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Auto scroll grounded terminal to the bottom when new grounded logs arrive
  useEffect(() => {
    if (groundedLogsEndRef.current) {
      groundedLogsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [groundedLogs]);

  const runGroundedWorkflow = async (promptText: string) => {
    if (!promptText.trim()) return;
    setGroundedLoading(true);
    setGroundedPrompt(promptText);
    setGroundedLogs(["[System] Connecting to Grounded Orchestrator..."]);
    setGroundedResult("");
    
    // Reset telemetry metrics
    setActiveGroundedAgent("Grounded Search");
    setGroundedSearchTime("");
    setStylizerTime("");

    try {
      const response = await fetch("/api/agent/grounded", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptText,
          language,
          userEmail: user?.email || "",
          userId: user?.uid || ""
        }),
      });

      if (!response.body) {
        throw new Error("ReadableStream is not supported by the response.");
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
            const trimmedLine = line.trim();
            if (trimmedLine) {
              // Parse metadata lines
              if (trimmedLine.startsWith("[METADATA]")) {
                const content = trimmedLine.replace("[METADATA] ", "").replace("[METADATA]", "").trim();
                if (content.startsWith("ActiveAgent:")) {
                  const agentName = content.replace("ActiveAgent:", "").trim();
                  setActiveGroundedAgent(agentName);
                } else if (content.startsWith("Duration:")) {
                  const parts = content.replace("Duration:", "").trim().split(":");
                  const metricName = parts[0]?.trim();
                  const durationValue = parts[1]?.trim();
                  if (metricName === "Grounded Search") {
                    setGroundedSearchTime(durationValue);
                  } else if (metricName === "Stylizer") {
                    setStylizerTime(durationValue);
                  }
                }
                return; // Do NOT add metadata line to visible terminal logs
              }

              setGroundedLogs((prev) => [...prev, line]);
              if (!line.startsWith("[System]") && !line.startsWith("[Sub-Agent:") && !line.includes("[CLOSE]") && !line.includes("[ERROR]") && !line.startsWith("Prompt:")) {
                if (line !== "=== Agent Final Output === " && line !== "=== Agent Final Output ===" && line !== "==========================") {
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
      
      setGroundedResult(cleanResult || "Grounded execution complete!");

    } catch (error: any) {
      setGroundedLogs((prev) => [...prev, `[ERROR] Workflow execution failed: ${error.message}`]);
    } finally {
      setGroundedLoading(false);
    }
  };

  const handleClearGrounded = () => {
    setGroundedInput("");
    setGroundedPrompt("");
    setGroundedLogs([]);
    setGroundedResult("");
  };

  const renderPremiumContent = (markdownText: string) => {
    if (!markdownText) return null;

    const lines = markdownText.split("\n");
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const elements: React.ReactNode[] = [];

    const parseInlineMarkdown = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/);
      return parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index} style={{ color: "var(--primary)", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }
        const subParts = part.split(/(\*.*?\*)/);
        return subParts.map((subPart, subIndex) => {
          if (subPart.startsWith("*") && subPart.endsWith("*")) {
            return <em key={subIndex} style={{ fontStyle: "italic", color: "var(--foreground)" }}>{subPart.slice(1, -1)}</em>;
          }
          const codeParts = subPart.split(/(`.*?`)/);
          return codeParts.map((codePart, codeIndex) => {
            if (codePart.startsWith("`") && codePart.endsWith("`")) {
              return (
                <code key={codeIndex} style={{ 
                  background: "rgba(16, 107, 163, 0.08)", 
                  padding: "2px 6px", 
                  borderRadius: "4px", 
                  fontFamily: "var(--font-mono)", 
                  fontSize: "0.85rem",
                  color: "var(--primary)"
                }}>
                  {codePart.slice(1, -1)}
                </code>
              );
            }
            return codePart;
          });
        });
      });
    };

    const flushTable = (key: number) => {
      if (tableHeaders.length > 0 || tableRows.length > 0) {
        elements.push(
          <div key={`table-${key}`} style={{ overflowX: "auto", margin: "1.5rem 0", borderRadius: "var(--border-radius-md)", border: "1px solid var(--card-border)", boxShadow: "var(--shadow-sm)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", textAlign: "left", background: "#ffffff" }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg, rgba(16, 107, 163, 0.05), rgba(212, 175, 55, 0.05))", borderBottom: "2px solid var(--card-border)" }}>
                  {tableHeaders.map((h, i) => (
                    <th key={i} style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--primary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ borderBottom: rowIndex === tableRows.length - 1 ? "none" : "1px solid var(--card-border)" }}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} style={{ padding: "0.75rem 1rem", color: "var(--foreground)" }}>{parseInlineMarkdown(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableHeaders = [];
        tableRows = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("|")) {
        inTable = true;
        const cells = line.split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (cells.every(c => c.startsWith("-"))) {
          continue;
        }
        if (tableHeaders.length === 0) {
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        continue;
      } else if (inTable) {
        flushTable(i);
      }

      if (line.startsWith("###")) {
        elements.push(
          <h4 key={i} style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "1.5rem", marginBottom: "0.5rem", color: "var(--primary)", fontFamily: "var(--font-display)" }}>
            {parseInlineMarkdown(line.replace("###", "").trim())}
          </h4>
        );
      } else if (line.startsWith("##")) {
        elements.push(
          <h3 key={i} style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: "1.75rem", marginBottom: "0.75rem", color: "var(--foreground)", fontFamily: "var(--font-display)", borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.25rem" }}>
            {parseInlineMarkdown(line.replace("##", "").trim())}
          </h3>
        );
      } else if (line.startsWith("#")) {
        elements.push(
          <h2 key={i} style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "2rem", marginBottom: "1rem", color: "var(--foreground)", fontFamily: "var(--font-display)" }}>
            {parseInlineMarkdown(line.replace("#", "").trim())}
          </h2>
        );
      } else if (line.startsWith("* ") || line.startsWith("- ")) {
        elements.push(
          <div key={i} style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem", marginBottom: "0.35rem" }}>
            <span style={{ color: "var(--secondary)", fontSize: "1.1rem", lineHeight: "1.2" }}>•</span>
            <div style={{ fontSize: "0.95rem", color: "var(--foreground)" }}>{parseInlineMarkdown(line.slice(2))}</div>
          </div>
        );
      } else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)/);
        if (match) {
          elements.push(
            <div key={i} style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem", marginBottom: "0.35rem" }}>
              <span style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.95rem" }}>{match[1]}.</span>
              <div style={{ fontSize: "0.95rem", color: "var(--foreground)" }}>{parseInlineMarkdown(match[2])}</div>
            </div>
          );
        }
      } else if (line === "") {
        elements.push(<div key={i} style={{ height: "0.5rem" }} />);
      } else {
        elements.push(
          <p key={i} style={{ fontSize: "0.95rem", lineHeight: "1.7", color: "var(--foreground)", marginBottom: "0.5rem" }}>
            {parseInlineMarkdown(line)}
          </p>
        );
      }
    }

    if (inTable) {
      flushTable(lines.length);
    }

    return <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>{elements}</div>;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push(`/${language}`);
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  const runQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setPrompt(queryText);
    setLogs([t("initiating_stream")]);
    setFinalResult("");

    // Reset telemetry metrics
    setActiveDbAgent("Guardrail Audit");
    setDbGuardTime("");
    setDbEngineTime("");
    setDbOrchTime("");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: queryText,
          language,
          userEmail: user?.email || "",
          userId: user?.uid || ""
        }),
      });

      if (!response.body) {
        throw new Error("ReadableStream is not supported by the browser/server response.");
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
            const trimmedLine = line.trim();
            if (trimmedLine) {
              // Parse metadata lines
              if (trimmedLine.startsWith("[METADATA]")) {
                const content = trimmedLine.replace("[METADATA] ", "").replace("[METADATA]", "").trim();
                if (content.startsWith("ActiveAgent:")) {
                  const agentName = content.replace("ActiveAgent:", "").trim();
                  setActiveDbAgent(agentName);
                } else if (content.startsWith("Duration:")) {
                  const parts = content.replace("Duration:", "").trim().split(":");
                  const metricName = parts[0]?.trim();
                  const durationValue = parts[1]?.trim();
                  if (metricName === "Guardrail Audit") {
                    setDbGuardTime(durationValue);
                  } else if (metricName === "Database Engine") {
                    setDbEngineTime(durationValue);
                  } else if (metricName === "Orchestrator") {
                    setDbOrchTime(durationValue);
                  }
                }
                return; // Do NOT add metadata line to visible terminal logs
              }

              setLogs((prev) => [...prev, line]);
              if (!line.includes("[STDERR]") && !line.includes("[CLOSE]") && !line.includes("[Unknown]") && !line.includes("[Fahem Agent]") && !line.startsWith("[Sub-Agent:") && !line.startsWith("Loading local configuration") && !line.startsWith("Prompt:") && !line.startsWith("Starting Fahem") && !line.startsWith("Invoking agent")) {
                if (line !== "=== Agent Final Output === " && line !== "=== Agent Final Output ===" && line !== "==========================") {
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
      
      setFinalResult(cleanResult || t("query_completed_success"));

      // Retrieve fresh live database stats after query execution completes
      await fetchMetadata();

    } catch (error: any) {
      setLogs((prev) => [...prev, t("stream_failure") + error.message]);
      setFinalResult(t("stream_error_occurred") + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPrompt("");
    setLogs([]);
    setFinalResult("");
  };

  if (loadingUser) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--background)", fontFamily: "var(--font-display)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <FiCpu className="spinning-icon" style={{ fontSize: "3rem", color: "var(--primary)" }} />
          <div style={{ fontSize: "1.2rem", color: "var(--primary)", fontWeight: 500 }}>{t("loading_session")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout" style={{ direction: language === "ar" ? "rtl" : "ltr" }}>
      {/* Background ambient light */}
      <div className="ambient-background" style={{ zIndex: 1 }}>
        <div className="sphere sphere-1"></div>
        <div className="sphere sphere-2"></div>
        <div className="sphere sphere-3"></div>
      </div>

      {/* Modern Sidebar Panel */}
      <aside className="sidebar">
        <div className="sidebar-top">
          {/* Logo Section */}
          <div className="sidebar-logo" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", padding: "0.5rem", borderRadius: "var(--border-radius-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
              <FiCpu className="pulse-icon" style={{ fontSize: "1.4rem" }} />
            </div>
            <span style={{ fontWeight: 800, letterSpacing: "0.5px" }}>{t("dashboard_title")}</span>
          </div>

          {/* Connection Status */}
          <div className="sidebar-status">
            <div className="status-badge" id="mcp-status-badge" style={{ background: "rgba(255,255,255,0.75)", border: "1px solid var(--card-border)", display: "flex", width: "100%", justifyContent: "center" }}>
              <span className="status-dot"></span>
              <FiServer style={{ color: "var(--accent-green)", fontSize: "0.95rem" }} />
              <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{t("cluster_status")}</span>
            </div>
          </div>

          {/* Navigation Items (Toolkit & Admin) */}
          <nav className="sidebar-nav">
            <button
              onClick={() => setActiveTab("agent")}
              className={`sidebar-nav-btn ${activeTab === "agent" ? "active" : ""}`}
              type="button"
            >
              <FiActivity />
              <span>{t("nav_toolkit")}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`sidebar-nav-btn ${activeTab === "admin" ? "active" : ""}`}
                type="button"
              >
                <FiShield />
                <span>{t("nav_admin")}</span>
              </button>
            )}

            {/* GitHub Repo link */}
            <a 
              href="https://github.com/hesham88/fahem" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="sidebar-nav-btn"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <FiGithub />
              <span>{t("nav_github")}</span>
            </a>
          </nav>
        </div>

        {/* Sidebar Footer (Language + Profile + Sign Out) */}
        <div className="sidebar-footer">
          {/* Language Swapper */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#6a7c88", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <FiGlobe /> <span>{language === "ar" ? "اللغة" : "Language"}</span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="sidebar-language-select"
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

          {/* Profile Card */}
          {user && (
            <div className="sidebar-user-card">
              <div className="sidebar-user-avatar-wrapper">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="sidebar-user-avatar" />
                ) : (
                  <div className="sidebar-user-avatar" style={{ background: "var(--primary)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.2rem" }}>
                    {user.email ? user.email[0].toUpperCase() : "U"}
                  </div>
                )}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name" title={user.displayName || user.email || ""}>
                  {user.displayName || (user.email ? user.email.split("@")[0] : "User")}
                </span>
                <span className="sidebar-user-email" title={user.email || ""}>
                  {user.email}
                </span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button 
            onClick={handleLogout} 
            className="btn btn-secondary btn-signout"
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", borderRadius: "var(--border-radius-md)" }}
          >
            <FiLogOut />
            <span>{t("btn_signout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" style={{ position: "relative", zIndex: 2 }}>
        {/* Page Title Section */}
        <header className="page-title-section">
          <h1>{activeTab === "agent" ? t("dashboard_title") : (language === "ar" ? "لوحة التحكم الأمنية للمشرف" : "Superadmin Security & Telemetry")}</h1>
          <p>{activeTab === "agent" ? t("dashboard_subtitle") : (language === "ar" ? "مراقبة إعدادات الأمان ومكافحة الانتهاكات وسجلات التدقيق المباشرة لوكلاء فاهم." : "Audit active safety guardrails, GCP Model Armor policies, and secure real-time system logs.")}</p>
        </header>

        {activeTab === "agent" ? (
          /* Main Grid Layout for MongoDB Agent */
          <div className="grid-cols-2">
            {/* Left Side: Interaction & Output */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              
              {/* Custom Prompt Box */}
              <section className="panel-card" id="agent-input-panel">
                <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FiCpu className="pulse-icon" style={{ color: "var(--primary)" }} />
                  <span>{t("ask_agent_header")}</span>
                </h2>
                
                {/* Presets Row */}
                <div className="preset-grid">
                  {presets.map((preset, index) => (
                    <button
                      key={index}
                      className="preset-card"
                      onClick={() => runQuery(preset.query)}
                      disabled={loading}
                      type="button"
                      style={{ padding: "1rem" }}
                    >
                      <strong style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <FiLayers style={{ fontSize: "0.95rem" }} />
                        {preset.title}
                      </strong>
                      <span>{preset.description}</span>
                    </button>
                  ))}
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    runQuery(prompt);
                  }}
                  className="console-form"
                >
                  <div className="textarea-wrapper">
                    <textarea
                      className="prompt-textarea"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t("input_placeholder")}
                      disabled={loading}
                    />
                  </div>
                  <div className="buttons-row">
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={loading || !prompt.trim()}
                      id="btn-submit-prompt"
                      style={{ minWidth: "160px" }}
                    >
                      {loading ? <FiRefreshCw className="spinning-icon" /> : <FiActivity />}
                      <span>{loading ? t("btn_executing") : t("btn_execute")}</span>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={handleClear}
                      disabled={loading}
                      id="btn-clear-prompt"
                    >
                      <FiTrash2 />
                      <span>{t("btn_clear")}</span>
                    </button>
                  </div>
                </form>
              </section>

              {/* Execution Stream Output Console */}
              <section className="panel-card" id="agent-output-panel">
                <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FiTerminal style={{ color: "var(--secondary)" }} />
                  <span>{t("logs_header")}</span>
                </h2>
                
                <div className="logs-console" id="logs-console-window" style={{ maxHeight: "350px" }}>
                  {logs.length === 0 ? (
                    <span style={{ color: "#6a7c88" }}>{t("logs_idle")}</span>
                  ) : (
                    logs.map((log, idx) => {
                      let styleClass = "log-info";
                      if (log.startsWith("[SYSTEM]")) styleClass = "log-success";
                      else if (log.startsWith("[STDERR]") || log.startsWith("[ERROR]")) styleClass = "log-error";
                      else if (log.includes("Tool Call:") || log.includes("requesting Tool")) styleClass = "log-tool";
                      
                      return (
                        <div key={idx} className={`log-entry ${styleClass}`}>
                          {log}
                        </div>
                      );
                    })
                  )}
                  <div ref={logsEndRef} />
                </div>

                {/* Real-time Multi-Agent Telemetry Grid */}
                {(activeDbAgent !== "idle" || dbGuardTime || dbEngineTime || dbOrchTime) && (
                  <div style={{
                    marginTop: "1.25rem",
                    marginBottom: "1.25rem",
                    padding: "1.25rem",
                    background: "rgba(255, 255, 255, 0.5)",
                    borderRadius: "var(--border-radius-md)",
                    border: "1px solid var(--card-border)",
                    boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.4)",
                    backdropFilter: "blur(10px)",
                    transition: "all 0.3s ease"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                      <h3 style={{ fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, color: "var(--foreground)" }}>
                        <FiCpu style={{ color: "var(--primary)", animation: activeDbAgent !== "idle" ? "spin 4s linear infinite" : "none" }} />
                        <span>{getTelemetryT("telemetryTitle")}</span>
                      </h3>
                      {activeDbAgent !== "idle" && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.3rem 0.75rem",
                          borderRadius: "50px",
                          background: "rgba(16, 107, 163, 0.08)",
                          color: "var(--primary)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          border: "1px solid rgba(16, 107, 163, 0.15)",
                        }}>
                          <span style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "var(--primary)",
                            display: "inline-block",
                            animation: "pulse 2s infinite"
                          }} />
                          <span>{getTelemetryT("activeAgent")} {
                            activeDbAgent === "Guardrail Audit" ? getTelemetryT("guardrailName") :
                            activeDbAgent === "Database Engine" ? getTelemetryT("dbEngineName") :
                            activeDbAgent === "Orchestrator" ? getTelemetryT("orchestratorName") :
                            activeDbAgent
                          }</span>
                        </span>
                      )}
                    </div>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "0.75rem"
                    }}>
                      {/* Guardrail Card */}
                      <div style={{
                        padding: "1rem",
                        borderRadius: "var(--border-radius-sm)",
                        background: activeDbAgent === "Guardrail Audit" ? "rgba(16, 107, 163, 0.06)" : "rgba(255, 255, 255, 0.3)",
                        border: activeDbAgent === "Guardrail Audit" ? "1px solid var(--primary)" : "1px solid var(--card-border)",
                        boxShadow: activeDbAgent === "Guardrail Audit" ? "0 4px 12px rgba(16, 107, 163, 0.08)" : "none",
                        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", color: "#6a7c88", fontWeight: 600 }}>
                            {getTelemetryT("guardrailName")}
                          </span>
                          <FiShield style={{ fontSize: "0.95rem", color: activeDbAgent === "Guardrail Audit" ? "var(--primary)" : "#8a9ca8" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginTop: "0.25rem" }}>
                          {dbGuardTime ? (
                            <>
                              <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                                {dbGuardTime.replace("ms", "").replace("s", "").trim()}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "#6a7c88", fontWeight: 500 }}>
                                {dbGuardTime.includes("s") && !dbGuardTime.includes("ms") ? getTelemetryT("unitSec") : getTelemetryT("unitMs")}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: "1.3rem", fontWeight: 700, color: activeDbAgent === "Guardrail Audit" ? "var(--primary)" : "#b0c0cb" }}>
                              {activeDbAgent === "Guardrail Audit" ? "..." : "-"}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.5rem" }}>
                          {activeDbAgent === "Guardrail Audit" ? (
                            <span style={{ color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <FiRefreshCw className="spinning-icon" style={{ fontSize: "0.75rem" }} />
                              {getTelemetryT("statusAuditing")}
                            </span>
                          ) : dbGuardTime ? (
                            <span style={{ color: "var(--accent-green)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <FiCheckCircle style={{ fontSize: "0.8rem" }} />
                              {getTelemetryT("statusCompleted")}
                            </span>
                          ) : (
                            <span style={{ color: "#8a9ca8" }}>{getTelemetryT("statusIdle")}</span>
                          )}
                        </div>
                      </div>

                      {/* DB Engine Card */}
                      <div style={{
                        padding: "1rem",
                        borderRadius: "var(--border-radius-sm)",
                        background: activeDbAgent === "Database Engine" ? "rgba(16, 107, 163, 0.06)" : "rgba(255, 255, 255, 0.3)",
                        border: activeDbAgent === "Database Engine" ? "1px solid var(--primary)" : "1px solid var(--card-border)",
                        boxShadow: activeDbAgent === "Database Engine" ? "0 4px 12px rgba(16, 107, 163, 0.08)" : "none",
                        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", color: "#6a7c88", fontWeight: 600 }}>
                            {getTelemetryT("dbEngineName")}
                          </span>
                          <FiDatabase style={{ fontSize: "0.95rem", color: activeDbAgent === "Database Engine" ? "var(--primary)" : "#8a9ca8" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginTop: "0.25rem" }}>
                          {dbEngineTime ? (
                            <>
                              <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                                {dbEngineTime.replace("ms", "").replace("s", "").trim()}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "#6a7c88", fontWeight: 500 }}>
                                {dbEngineTime.includes("s") && !dbEngineTime.includes("ms") ? getTelemetryT("unitSec") : getTelemetryT("unitMs")}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: "1.3rem", fontWeight: 700, color: activeDbAgent === "Database Engine" ? "var(--primary)" : "#b0c0cb" }}>
                              {activeDbAgent === "Database Engine" ? "..." : "-"}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.5rem" }}>
                          {activeDbAgent === "Database Engine" ? (
                            <span style={{ color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <FiRefreshCw className="spinning-icon" style={{ fontSize: "0.75rem" }} />
                              {getTelemetryT("statusQuerying")}
                            </span>
                          ) : dbEngineTime ? (
                            <span style={{ color: "var(--accent-green)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <FiCheckCircle style={{ fontSize: "0.8rem" }} />
                              {getTelemetryT("statusExecuted")}
                            </span>
                          ) : (
                            <span style={{ color: "#8a9ca8" }}>{getTelemetryT("statusIdle")}</span>
                          )}
                        </div>
                      </div>

                      {/* Orchestrator Card */}
                      <div style={{
                        padding: "1rem",
                        borderRadius: "var(--border-radius-sm)",
                        background: activeDbAgent === "Orchestrator" ? "rgba(16, 107, 163, 0.06)" : "rgba(255, 255, 255, 0.3)",
                        border: activeDbAgent === "Orchestrator" ? "1px solid var(--primary)" : "1px solid var(--card-border)",
                        boxShadow: activeDbAgent === "Orchestrator" ? "0 4px 12px rgba(16, 107, 163, 0.08)" : "none",
                        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", color: "#6a7c88", fontWeight: 600 }}>
                            {getTelemetryT("orchestratorName")}
                          </span>
                          <FiLayers style={{ fontSize: "0.95rem", color: activeDbAgent === "Orchestrator" ? "var(--primary)" : "#8a9ca8" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginTop: "0.25rem" }}>
                          {dbOrchTime ? (
                            <>
                              <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                                {dbOrchTime.replace("ms", "").replace("s", "").trim()}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "#6a7c88", fontWeight: 500 }}>
                                {dbOrchTime.includes("s") && !dbOrchTime.includes("ms") ? getTelemetryT("unitSec") : getTelemetryT("unitMs")}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: "1.3rem", fontWeight: 700, color: activeDbAgent === "Orchestrator" ? "var(--primary)" : "#b0c0cb" }}>
                              {activeDbAgent === "Orchestrator" ? "..." : "-"}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.5rem" }}>
                          {activeDbAgent === "Orchestrator" ? (
                            <span style={{ color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <FiRefreshCw className="spinning-icon" style={{ fontSize: "0.75rem" }} />
                              {getTelemetryT("statusFormatting")}
                            </span>
                          ) : dbOrchTime ? (
                            <span style={{ color: "var(--accent-green)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <FiCheckCircle style={{ fontSize: "0.8rem" }} />
                              {getTelemetryT("statusStructured")}
                            </span>
                          ) : (
                            <span style={{ color: "#8a9ca8" }}>{getTelemetryT("statusIdle")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {finalResult && (
                  <div className="agent-response-box" id="agent-final-response" style={{ borderRadius: "var(--border-radius-md)", borderLeftWidth: "4px" }}>
                    <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <FiCheckCircle style={{ color: "var(--primary)" }} />
                      <span>{t("agent_response_header")}</span>
                    </h3>
                    <div style={{ whiteSpace: "pre-wrap", color: "var(--foreground)", fontSize: "0.95rem", lineHeight: "1.7" }}>{finalResult}</div>
                  </div>
                )}
              </section>
            </div>

            {/* Right Side: Environment Health & Config Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              
              {/* Cluster Health Panel */}
              <section className="panel-card" id="mongodb-health-panel">
                <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FiLayers style={{ color: "var(--primary)" }} />
                  <span>{t("metadata_header")}</span>
                </h2>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">{t("meta_active_db")}</span>
                    <span className="stat-value" style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "1.3rem" }}>
                      <FiDatabase style={{ color: "var(--primary)", fontSize: "1.1rem" }} />
                      {stats.databaseName}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">{t("meta_collections")}</span>
                    <span className="stat-value">{stats.collectionsCount}</span>
                  </div>
                  <div className="stat-item" style={{ gridColumn: "span 2" }}>
                    <span className="stat-label">{t("meta_col_names")}</span>
                    <span className="stat-value" style={{ fontSize: "1.05rem", color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                      {stats.collectionList}
                    </span>
                  </div>
                  <div className="stat-item" style={{ gridColumn: "span 2" }}>
                    <span className="stat-label">{t("meta_storage_size")}</span>
                    <span className="stat-value" style={{ fontSize: "1.2rem" }}>{stats.storageSize}</span>
                  </div>
                </div>
              </section>

              {/* Model & Agent Settings */}
              <section className="panel-card" id="agent-config-panel">
                <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FiSettings style={{ color: "var(--accent-orange)" }} />
                  <span>{t("config_header")}</span>
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.95rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}><FiCpu /> {t("config_model")}</span>
                    <code style={{ background: "rgba(255,255,255,0.7)", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--card-border)" }}>gemini-3.1-flash-lite</code>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}><FiActivity /> {t("config_framework")}</span>
                    <span style={{ color: "var(--primary)", fontWeight: 500 }}>google-adk (Python)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}><FiServer /> {t("config_mcp")}</span>
                    <span style={{ color: "var(--accent-orange)", fontWeight: 500 }}>@mongodb-js/mongodb-mcp-server</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>{t("config_tools")}</span>
                    <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem", color: "#4a5560" }}>
                      <li><code>get_database_stats</code></li>
                      <li><code>list_database_collections</code></li>
                      <li><code>get_collection_schema</code></li>
                      <li style={{ color: "var(--primary)" }}>{t("config_tools_list")}</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : (
          /* Admin Security & Sourcing View */
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* Visual Security Configurations & Workflow Pipeline DAG */}
            <AdminSecurityDashboard language={language} email={user?.email || undefined} />

            {/* Admin Sourcing Engine Tab View */}
            <div className="grid-cols-2">
            {/* Left Side: Create/Configure Source Feed */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              <section className="panel-card" id="sourcing-pipeline-config">
                <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FiCpu className="pulse-icon" style={{ color: "var(--primary)" }} />
                  <span>{t("sourcing_engine_title")}</span>
                </h2>
                <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
                  {t("sourcing_engine_subtitle")}
                </p>

                <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("lbl_pipeline_name")}</label>
                    <input 
                      type="text" 
                      placeholder={t("pipeline_name_placeholder")}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "var(--border-radius-md)",
                        border: "1px solid var(--card-border)",
                        outline: "none",
                        fontFamily: "var(--font-sans)",
                        background: "#ffffff"
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("lbl_ingestion_url")}</label>
                    <input 
                      type="text" 
                      placeholder={t("ingestion_url_placeholder")}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "var(--border-radius-md)",
                        border: "1px solid var(--card-border)",
                        outline: "none",
                        fontFamily: "var(--font-sans)",
                        background: "#ffffff"
                      }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("lbl_target_collection")}</label>
                      <select
                        style={{
                          padding: "0.75rem",
                          borderRadius: "var(--border-radius-md)",
                          border: "1px solid var(--card-border)",
                          outline: "none",
                          fontFamily: "var(--font-sans)",
                          background: "#ffffff"
                        }}
                      >
                        <option value="users">users</option>
                        <option value="sourcing_logs">sourcing_logs</option>
                        <option value="new">{t("create_new_collection")}</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("lbl_pipeline_schedule")}</label>
                      <select
                        style={{
                          padding: "0.75rem",
                          borderRadius: "var(--border-radius-md)",
                          border: "1px solid var(--card-border)",
                          outline: "none",
                          fontFamily: "var(--font-sans)",
                          background: "#ffffff"
                        }}
                      >
                        <option value="realtime">{t("schedule_realtime")}</option>
                        <option value="hourly">{t("schedule_hourly")}</option>
                        <option value="daily">{t("schedule_daily")}</option>
                        <option value="manual">{t("schedule_manual")}</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
                    <button type="button" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <FiPlus />
                      <span>{t("btn_create_pipeline")}</span>
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <FiLink />
                      <span>{t("btn_test_connection")}</span>
                    </button>
                  </div>
                </form>
              </section>

              {/* Grounded Multi-Agent Test Bench Card */}
              <section className="panel-card" style={{ marginTop: "2rem" }}>
                <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FiGlobe className={groundedLoading ? "pulse-icon" : ""} style={{ color: "var(--primary)" }} />
                  <span>{language === "ar" ? "منصة اختبار البحث الموثق" : "Grounded Multi-Agent Test Bench"}</span>
                </h2>
                <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
                  {language === "ar" 
                    ? "تفاعل مع عملاء البحث الموثق والتنسيق المتقدم للحصول على نتائج دقيقة ومنسقة في الوقت الفعلي."
                    : "Test dynamic handoffs between the Grounded Search agent (with web search grounding) and the Stylizer agent."}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {language === "ar" ? "استعلام البحث الموثق" : "Grounded Prompt Query"}
                    </label>
                    <textarea 
                      value={groundedInput}
                      onChange={(e) => setGroundedInput(e.target.value)}
                      placeholder={language === "ar" ? "مثال: ما هو سعر سهم أبل اليوم وأهم الأخبار؟" : "e.g., What is the current price of Bitcoin today and latest news?"}
                      rows={3}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "var(--border-radius-md)",
                        border: "1px solid var(--card-border)",
                        outline: "none",
                        fontFamily: "var(--font-sans)",
                        background: "#ffffff",
                        resize: "vertical"
                      }}
                    />
                  </div>

                  {/* Preset Queries for Grounded Search */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    {[
                      { en: "Bitcoin Price Today", ar: "سعر البيتكوين اليوم" },
                      { en: "Google Stock Valuation", ar: "سهم جوجل والتقييم المالي" },
                      { en: "Weather in Paris & Tokyo", ar: "حالة الطقس في باريس وطوكيو" }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setGroundedInput(language === "ar" ? preset.ar : preset.en)}
                        style={{
                          padding: "0.35rem 0.75rem",
                          fontSize: "0.8rem",
                          borderRadius: "20px",
                          border: "1px solid var(--card-border)",
                          background: "var(--cream-bg)",
                          color: "var(--text-color)",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {language === "ar" ? preset.ar : preset.en}
                      </button>
                    ))}
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-primary"
                    disabled={groundedLoading}
                    onClick={() => runGroundedWorkflow(groundedInput)}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", alignSelf: "flex-start" }}
                  >
                    {groundedLoading ? <FiRefreshCw className="pulse-icon" /> : <FiLayers />}
                    <span>
                      {groundedLoading 
                        ? (language === "ar" ? "جاري تشغيل الوكلاء..." : "Running Agents...") 
                        : (language === "ar" ? "تشغيل دورة الوكلاء الموثقة" : "Run Grounded Workflow")}
                    </span>
                  </button>
                </div>
              </section>
            </div>

            {/* Right Side: Active pipelines & health metrics */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              <section className="panel-card" id="sourcing-pipeline-list">
                <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FiDatabase style={{ color: "var(--primary)" }} />
                  <span>{t("active_feeds_title")}</span>
                </h2>
                
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--card-border)" }}>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>{t("tbl_feed_name")}</th>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>{t("tbl_target_col")}</th>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>{t("tbl_schedule")}</th>
                        <th style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>{t("tbl_status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                        <td style={{ padding: "0.75rem 0.5rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <FiLink style={{ color: "var(--primary)" }} />
                          {t("feed_user_activity")}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem" }}><code style={{ background: "rgba(255,255,255,0.7)", padding: "2px 6px", borderRadius: "4px" }}>users</code></td>
                        <td style={{ padding: "0.75rem 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <FiClock />
                          {t("schedule_realtime")}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "0.75rem", background: "rgba(46, 125, 50, 0.1)", color: "var(--accent-green)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            <FiCheckCircle />
                            {t("status_active")}
                          </span>
                        </td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                        <td style={{ padding: "0.75rem 0.5rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <FiLink style={{ color: "var(--primary)" }} />
                          {t("feed_partner_sync")}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem" }}><code style={{ background: "rgba(255,255,255,0.7)", padding: "2px 6px", borderRadius: "4px" }}>fahem</code></td>
                        <td style={{ padding: "0.75rem 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <FiClock />
                          {t("schedule_hourly")}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "0.75rem", background: "rgba(212, 175, 55, 0.1)", color: "var(--secondary-hover)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            <FiAlertTriangle />
                            {t("status_idle")}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Grounded Execution Console & Stylized Output Card */}
              <section className="panel-card" id="grounded-terminal-panel">
                <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FiTerminal style={{ color: "var(--secondary)" }} />
                  <span>{language === "ar" ? "منصة تشغيل ومخرجات البحث الموثق" : "Grounded Execution Console & Output"}</span>
                </h2>
                
                <div className="logs-console" id="grounded-logs-console" style={{ maxHeight: "250px", marginBottom: "1.5rem" }}>
                  {groundedLogs.length === 0 ? (
                    <span style={{ color: "#6a7c88" }}>
                      {language === "ar" ? "بانتظار تشغيل استعلام البحث الموثق..." : "Waiting for grounded search query..."}
                    </span>
                  ) : (
                    groundedLogs.map((log, idx) => {
                      let styleClass = "log-info";
                      if (log.startsWith("[System]")) styleClass = "log-success";
                      else if (log.startsWith("[Sub-Agent: Grounded Search]")) styleClass = "log-tool";
                      else if (log.startsWith("[Sub-Agent: Stylizer]")) styleClass = "log-success";
                      else if (log.startsWith("[ERROR]")) styleClass = "log-error";
                      
                      return (
                        <div key={idx} className={`log-entry ${styleClass}`}>
                          {log}
                        </div>
                      );
                    })
                  )}
                  <div ref={groundedLogsEndRef} />
                </div>

                {/* Grounded Search Multi-Agent Telemetry Grid */}
                {(activeGroundedAgent !== "idle" || groundedSearchTime || stylizerTime) && (
                  <div style={{
                    marginTop: "1.25rem",
                    marginBottom: "1.25rem",
                    padding: "1.25rem",
                    background: "rgba(255, 255, 255, 0.5)",
                    borderRadius: "var(--border-radius-md)",
                    border: "1px solid var(--card-border)",
                    boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.4)",
                    backdropFilter: "blur(10px)",
                    transition: "all 0.3s ease"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                      <h3 style={{ fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, color: "var(--foreground)" }}>
                        <FiCpu style={{ color: "var(--primary)", animation: activeGroundedAgent !== "idle" ? "spin 4s linear infinite" : "none" }} />
                        <span>{getTelemetryT("groundedTitle")}</span>
                      </h3>
                      {activeGroundedAgent !== "idle" && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.3rem 0.75rem",
                          borderRadius: "50px",
                          background: "rgba(16, 107, 163, 0.08)",
                          color: "var(--primary)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          border: "1px solid rgba(16, 107, 163, 0.15)",
                        }}>
                          <span style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "var(--primary)",
                            display: "inline-block",
                            animation: "pulse 2s infinite"
                          }} />
                          <span>{getTelemetryT("activeAgent")} {
                            activeGroundedAgent === "Grounded Search" ? getTelemetryT("groundedSearchName") :
                            activeGroundedAgent === "Stylizer" ? getTelemetryT("stylizerName") :
                            activeGroundedAgent
                          }</span>
                        </span>
                      )}
                    </div>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "0.75rem"
                    }}>
                      {/* Grounded Search Sub-Agent */}
                      <div style={{
                        padding: "1rem",
                        borderRadius: "var(--border-radius-sm)",
                        background: activeGroundedAgent === "Grounded Search" ? "rgba(16, 107, 163, 0.06)" : "rgba(255, 255, 255, 0.3)",
                        border: activeGroundedAgent === "Grounded Search" ? "1px solid var(--primary)" : "1px solid var(--card-border)",
                        boxShadow: activeGroundedAgent === "Grounded Search" ? "0 4px 12px rgba(16, 107, 163, 0.08)" : "none",
                        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", color: "#6a7c88", fontWeight: 600 }}>
                            {getTelemetryT("groundedSearchName")}
                          </span>
                          <FiGlobe style={{ fontSize: "0.95rem", color: activeGroundedAgent === "Grounded Search" ? "var(--primary)" : "#8a9ca8" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginTop: "0.25rem" }}>
                          {groundedSearchTime ? (
                            <>
                              <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                                {groundedSearchTime.replace("ms", "").replace("s", "").trim()}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "#6a7c88", fontWeight: 500 }}>
                                {groundedSearchTime.includes("s") && !groundedSearchTime.includes("ms") ? getTelemetryT("unitSec") : getTelemetryT("unitMs")}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: "1.3rem", fontWeight: 700, color: activeGroundedAgent === "Grounded Search" ? "var(--primary)" : "#b0c0cb" }}>
                              {activeGroundedAgent === "Grounded Search" ? "..." : "-"}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.5rem" }}>
                          {activeGroundedAgent === "Grounded Search" ? (
                            <span style={{ color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <FiRefreshCw className="spinning-icon" style={{ fontSize: "0.75rem" }} />
                              {getTelemetryT("statusSearching")}
                            </span>
                          ) : groundedSearchTime ? (
                            <span style={{ color: "var(--accent-green)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <FiCheckCircle style={{ fontSize: "0.8rem" }} />
                              {getTelemetryT("statusFound")}
                            </span>
                          ) : (
                            <span style={{ color: "#8a9ca8" }}>{getTelemetryT("statusIdle")}</span>
                          )}
                        </div>
                      </div>

                      {/* Stylizer Sub-Agent */}
                      <div style={{
                        padding: "1rem",
                        borderRadius: "var(--border-radius-sm)",
                        background: activeGroundedAgent === "Stylizer" ? "rgba(16, 107, 163, 0.06)" : "rgba(255, 255, 255, 0.3)",
                        border: activeGroundedAgent === "Stylizer" ? "1px solid var(--primary)" : "1px solid var(--card-border)",
                        boxShadow: activeGroundedAgent === "Stylizer" ? "0 4px 12px rgba(16, 107, 163, 0.08)" : "none",
                        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", color: "#6a7c88", fontWeight: 600 }}>
                            {getTelemetryT("stylizerName")}
                          </span>
                          <FiLayers style={{ fontSize: "0.95rem", color: activeGroundedAgent === "Stylizer" ? "var(--primary)" : "#8a9ca8" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginTop: "0.25rem" }}>
                          {stylizerTime ? (
                            <>
                              <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                                {stylizerTime.replace("ms", "").replace("s", "").trim()}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "#6a7c88", fontWeight: 500 }}>
                                {stylizerTime.includes("s") && !stylizerTime.includes("ms") ? getTelemetryT("unitSec") : getTelemetryT("unitMs")}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: "1.3rem", fontWeight: 700, color: activeGroundedAgent === "Stylizer" ? "var(--primary)" : "#b0c0cb" }}>
                              {activeGroundedAgent === "Stylizer" ? "..." : "-"}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.5rem" }}>
                          {activeGroundedAgent === "Stylizer" ? (
                            <span style={{ color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <FiRefreshCw className="spinning-icon" style={{ fontSize: "0.75rem" }} />
                              {getTelemetryT("statusStylizing")}
                            </span>
                          ) : stylizerTime ? (
                            <span style={{ color: "var(--accent-green)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <FiCheckCircle style={{ fontSize: "0.8rem" }} />
                              {getTelemetryT("statusStylized")}
                            </span>
                          ) : (
                            <span style={{ color: "#8a9ca8" }}>{getTelemetryT("statusIdle")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {groundedResult && (
                  <div className="agent-response-box" id="grounded-final-response" style={{ borderRadius: "var(--border-radius-md)", borderLeftWidth: "4px", borderLeftColor: "var(--primary)", background: "var(--background)", padding: "1.5rem", marginTop: "1rem", border: "1px solid var(--card-border)" }}>
                    <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "var(--primary)" }}>
                      <FiCheckCircle style={{ color: "var(--primary)" }} />
                      <span>{language === "ar" ? "المخرجات المنسقة للوكيل" : "Stylized Agent Presentation"}</span>
                    </h3>
                    <div style={{ color: "var(--foreground)", fontSize: "0.95rem", lineHeight: "1.7" }}>
                      {renderPremiumContent(groundedResult)}
                    </div>
                  </div>
                )}

                {(groundedLogs.length > 0 || groundedResult) && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleClearGrounded}
                    disabled={groundedLoading}
                    style={{ marginTop: "1rem" }}
                  >
                    <FiTrash2 />
                    <span>{language === "ar" ? "مسح السجلات" : "Clear Console"}</span>
                  </button>
                )}
              </section>
            </div>
          </div>
          </div>
        )}

        {/* Styled Interactive Footer */}
        <footer className="metadata-footer" style={{ marginTop: "4rem", padding: "3rem 1.5rem 2.5rem 1.5rem", width: "100%", borderTop: "1px solid var(--card-border)" }}>
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

          <p>{t("footer_dashboard_line1")}</p>
          <p style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "#b0c0cb" }}>
            {t("footer_dashboard_line2")}
          </p>
        </footer>
      </main>
    </div>
  );
}
