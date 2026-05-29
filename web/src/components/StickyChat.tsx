"use client";

import React, { useState, useEffect, useRef } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
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
  FiGlobe
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I am Fahem, your Responsible AI Partner. How can I assist you with database operations, queries, or security configuration audits today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [useGrounded, setUseGrounded] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string>("");
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  const { language, dir, t } = useTranslation();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatLogsEndRef = useRef<HTMLDivElement>(null);

  // Sync authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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

  if (!user) return null; // Only show after successful sign-in

  const handleSendMessage = async (textToSend?: string) => {
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

    try {
      const endpoint = useGrounded ? "/api/agent/grounded" : "/api/agent";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: queryText,
          language,
          userEmail: user.email || "",
          userId: user.uid || ""
        }),
      });

      if (!response.body) {
        throw new Error("No readable stream in response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          lines.forEach((line) => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              // Extract metadata details
              if (trimmedLine.startsWith("[METADATA]")) {
                const metaContent = trimmedLine.replace("[METADATA] ", "").replace("[METADATA]", "").trim();
                if (metaContent.startsWith("ActiveAgent:")) {
                  const currentAgent = metaContent.replace("ActiveAgent:", "").trim();
                  setActiveAgent(currentAgent);
                  
                  // Update message status metadata
                  setMessages((prev) => 
                    prev.map((msg) => 
                      msg.id === assistantMsgId ? { ...msg, activeAgent: currentAgent } : msg
                    )
                  );
                } else if (metaContent.startsWith("Duration:")) {
                  setSessionLogs((prev) => [...prev, `[Telemetry] ${metaContent}`]);
                } else if (metaContent.startsWith("Credits:")) {
                  const val = parseInt(metaContent.replace("Credits:", "").trim(), 10);
                  if (!isNaN(val)) {
                    setCredits(val);
                  }
                }
                return;
              }

              // Append system logs
              if (trimmedLine.startsWith("[Unknown]") || trimmedLine.includes("[SYSTEM LOG]")) {
                setSessionLogs((prev) => [...prev, trimmedLine]);
                return;
              }

              // Append main text response
              if (
                !trimmedLine.includes("[STDERR]") &&
                !trimmedLine.includes("[CLOSE]") &&
                !trimmedLine.includes("[Unknown]") &&
                !trimmedLine.startsWith("Prompt:") &&
                trimmedLine !== "=== Agent Final Output ===" &&
                trimmedLine !== "=========================="
              ) {
                accumulatedText += line + "\n";
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, text: accumulatedText.trim() }
                      : msg
                  )
                );
              }
            }
          });
        }
      }

      setSessionLogs((prev) => [...prev, "[System] Streaming complete successfully."]);
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
    { label: "List collections", query: "Show me list of active collections in the database" },
    { label: "Check my configurations", query: "Show current configuration setup and active security guardrails" },
    { label: "Whitelisted DB Stats", query: "Retrieve only whitelisted db stats metrics" }
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
        title="Talk with Fahem AI"
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
          top: "1.5rem",
          bottom: "1.5rem",
          [dir === "rtl" ? "left" : "right"]: isOpen ? "1.5rem" : "-460px",
          width: "400px",
          maxWidth: "calc(100vw - 3rem)",
          height: "calc(100vh - 3rem)",
          backgroundColor: "rgba(253, 251, 247, 0.85)",
          backdropFilter: "blur(24px) saturate(190%)",
          WebkitBackdropFilter: "blur(24px) saturate(190%)",
          border: "1px solid rgba(212, 175, 55, 0.35)",
          borderRadius: "var(--border-radius-lg)",
          boxShadow: dir === "rtl" 
            ? "10px 15px 50px rgba(16, 107, 163, 0.15), -2px 0px 10px rgba(255, 255, 255, 0.5)" 
            : "-10px 15px 50px rgba(16, 107, 163, 0.15), 2px 0px 10px rgba(255, 255, 255, 0.5)",
          zIndex: 9998,
          display: "flex",
          flexDirection: "column",
          transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden"
        }}
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
                Fahem Companion
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--accent-green)" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--accent-green)" }}></span>
                <span>Responsible AI Active</span>
              </div>
            </div>
          </div>
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
            <span>Email: <strong style={{ color: "var(--foreground)" }}>{user.email}</strong></span>
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

        {/* Messages Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem"
          }}
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
                  borderRadius: msg.role === "user" ? "16px 16px 0 16px" : "16px 16px 16px 0",
                  backgroundColor: msg.role === "user" ? "var(--primary)" : "rgba(255, 255, 255, 0.8)",
                  color: msg.role === "user" ? "#ffffff" : "var(--foreground)",
                  border: msg.role === "user" ? "none" : "1px solid var(--card-border)",
                  boxShadow: msg.role === "user" ? "0 4px 12px rgba(16,107,163,0.15)" : "var(--shadow-sm)",
                  fontSize: "0.9rem",
                  lineHeight: "1.5",
                  whiteSpace: "pre-line",
                  wordBreak: "break-word"
                }}
              >
                {msg.text || (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="dot-typing"></span>
                    <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>Thinking...</span>
                  </div>
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
              <span>Ground with Google Search</span>
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
            <span>Logs ({sessionLogs.length})</span>
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
              <div style={{ color: "#6a7c88", fontStyle: "italic" }}>No runtime execution logs yet.</div>
            ) : (
              sessionLogs.map((log, i) => (
                <div key={i} style={{ marginBottom: "0.2rem", display: "flex", gap: "0.25rem" }}>
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

        {/* Input Form Footer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{
            padding: "1rem",
            borderTop: "1px dashed var(--card-border)",
            backgroundColor: "rgba(255,255,255,0.45)",
            display: "flex",
            gap: "0.5rem"
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSending}
            placeholder="Type your security check or query..."
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
            <FiSend style={{ fontSize: "1rem" }} />
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
      `}</style>
    </>
  );
}
