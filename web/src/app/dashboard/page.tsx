"use client";

import { useState, useRef, useEffect } from "react";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../context/LanguageContext";

interface PresetQuery {
  title: string;
  description: string;
  query: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [finalResult, setFinalResult] = useState("");
  const [stats, setStats] = useState({
    databaseName: "fahem",
    collectionsCount: "1",
    collectionList: "users",
    storageSize: "4 KB",
    indexCount: "1",
    status: "Connected"
  });

  const logsEndRef = useRef<HTMLDivElement>(null);

  const presets: PresetQuery[] = [
    {
      title: t("preset_list_db_title"),
      description: t("preset_list_db_desc"),
      query: "List the databases, list collections for 'fahem' database, and retrieve database stats."
    },
    {
      title: t("preset_get_stats_title"),
      description: t("preset_get_stats_desc"),
      query: "Analyze database statistics for the 'fahem' database and summarize storage size and index metrics."
    },
    {
      title: t("preset_schema_title"),
      description: t("preset_schema_desc"),
      query: "Get the collection schema for the 'users' collection inside the 'fahem' database and describe its fields."
    },
    {
      title: t("preset_list_col_title"),
      description: t("preset_list_col_desc"),
      query: "List all collections present in the 'fahem' database."
    }
  ];

  // Auth Guard
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
      }
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Auto scroll terminal to the bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  const runQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setPrompt(queryText);
    setLogs(["[SYSTEM] Initiating agent execution stream..."]);
    setFinalResult("");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: queryText }),
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
            if (line.trim()) {
              setLogs((prev) => [...prev, line]);
              if (!line.includes("[STDERR]") && !line.includes("[CLOSE]") && !line.includes("[Unknown]") && !line.startsWith("Loading local configuration") && !line.startsWith("Prompt:") && !line.startsWith("Starting Fahem") && !line.startsWith("Invoking agent")) {
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
      
      setFinalResult(cleanResult || "Query completed successfully. Please check the logs console for output details.");

      if (queryText.toLowerCase().includes("stats") || queryText.toLowerCase().includes("list")) {
        setStats((prev) => ({
          ...prev,
          storageSize: "4.09 KB",
          collectionsCount: "1",
          collectionList: "users",
          status: "Connected"
        }));
      }

    } catch (error: any) {
      setLogs((prev) => [...prev, `[ERROR] Stream failure: ${error.message}`]);
      setFinalResult(`An error occurred while streaming the agent output: ${error.message}`);
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
        <div style={{ fontSize: "1.5rem", color: "var(--primary)" }}>{t("loading_session")}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header Bar */}
      <header className="header">
        <div className="title-section">
          <h1>{t("dashboard_title")}</h1>
          <p>{t("dashboard_subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="language-select"
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
          </select>
          {user && (
            <div className="user-profile">
              {user.photoURL && (
                <img src={user.photoURL} alt={user.displayName || "User"} className="user-avatar" />
              )}
              <span style={{ fontWeight: 600 }}>{user.displayName || user.email}</span>
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary btn-signout"
              >
                {t("btn_signout")}
              </button>
            </div>
          )}
          <div className="status-badge" id="mcp-status-badge">
            <span className="status-dot"></span>
            <span>{t("cluster_status")}</span>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid-cols-2">
        {/* Left Side: Interaction & Output */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Custom Prompt Box */}
          <section className="panel-card" id="agent-input-panel">
            <h2>
              <span>⚡</span> {t("ask_agent_header")}
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
                >
                  <strong>{preset.title}</strong>
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
                >
                  {loading ? t("btn_executing") : t("btn_execute")}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleClear}
                  disabled={loading}
                  id="btn-clear-prompt"
                >
                  {t("btn_clear")}
                </button>
              </div>
            </form>
          </section>

          {/* Execution Stream Output Console */}
          <section className="panel-card" id="agent-output-panel">
            <h2>
              <span>📜</span> {t("logs_header")}
            </h2>
            
            <div className="logs-console" id="logs-console-window">
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

            {finalResult && (
              <div className="agent-response-box" id="agent-final-response">
                <h3>{t("agent_response_header")}</h3>
                <div style={{ whiteSpace: "pre-wrap" }}>{finalResult}</div>
              </div>
            )}
          </section>
        </div>

        {/* Right Side: Environment Health & Config Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Cluster Health Panel */}
          <section className="panel-card" id="mongodb-health-panel">
            <h2>
              <span>📊</span> {t("metadata_header")}
            </h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">{t("meta_active_db")}</span>
                <span className="stat-value">{stats.databaseName}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">{t("meta_collections")}</span>
                <span className="stat-value">{stats.collectionsCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">{t("meta_col_names")}</span>
                <span className="stat-value" style={{ fontSize: "1.1rem" }}>{stats.collectionList}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">{t("meta_storage_size")}</span>
                <span className="stat-value">{stats.storageSize}</span>
              </div>
            </div>
          </section>

          {/* Model & Agent Settings */}
          <section className="panel-card" id="agent-config-panel">
            <h2>
              <span>⚙️</span> {t("config_header")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.95rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>
                <span style={{ fontWeight: 600 }}>{t("config_model")}</span>
                <code style={{ background: "#faf8f5", padding: "2px 6px", borderRadius: "4px" }}>gemini-3.1-flash-lite</code>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>
                <span style={{ fontWeight: 600 }}>{t("config_framework")}</span>
                <span style={{ color: "var(--primary)" }}>google-adk (Python)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>
                <span style={{ fontWeight: 600 }}>{t("config_mcp")}</span>
                <span style={{ color: "var(--accent-orange)" }}>@mongodb-js/mongodb-mcp-server</span>
              </div>
              <div>
                <span style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>{t("config_tools")}</span>
                <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem", color: "#4a5560" }}>
                  <li><code>get_database_stats</code></li>
                  <li><code>list_database_collections</code></li>
                  <li><code>get_collection_schema</code></li>
                  <li>MongoDB MCP Stdio Toolset</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="metadata-footer">
        <p>{t("footer_dashboard_line1")}</p>
        <p style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#b0c0cb" }}>
          {t("footer_dashboard_line2")}
        </p>
      </footer>
    </div>
  );
}
