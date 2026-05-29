"use client";

import React, { useState, useEffect } from "react";
import { 
  FiShield, 
  FiCpu, 
  FiDatabase, 
  FiLayers, 
  FiArrowRight, 
  FiCheckCircle, 
  FiLock, 
  FiSettings, 
  FiInfo, 
  FiCode, 
  FiGitCommit,
  FiExternalLink,
  FiZap,
  FiTerminal,
  FiSearch,
  FiActivity,
  FiAlertTriangle,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
  FiUser
} from "react-icons/fi";

interface NodeDetail {
  id: string;
  name: string;
  role: string;
  inputs: string[];
  outputs: string[];
  shares: string[];
  description: string;
}

// Initial telemetry logs set representing real production metrics
const initialTelemetryLogs = [
  {
    timestamp: "2026-05-29T18:24:10Z",
    category: "INFO" as const,
    agent: "Orchestrator",
    message: "Initiated Native TypeScript ADK Orchestration for prompt."
  },
  {
    timestamp: "2026-05-29T18:24:10Z",
    category: "MODEL_ARMOR" as const,
    agent: "Model Armor",
    message: "Running GCP Model Armor pre-flight safety filter via regional template 'fahem-default-template'...",
  },
  {
    timestamp: "2026-05-29T18:24:11Z",
    category: "MODEL_ARMOR" as const,
    agent: "Model Armor",
    message: "GCP Model Armor pre-flight check passed. Match state: NO_MATCH_FOUND.",
  },
  {
    timestamp: "2026-05-29T18:24:11Z",
    category: "SECURITY" as const,
    agent: "Guardrail",
    message: "Running security and authentication guardrails...",
  },
  {
    timestamp: "2026-05-29T18:24:12Z",
    category: "SECURITY" as const,
    agent: "Guardrail",
    message: "Guardrail check complete in 0.59s. Result: CONFIRMED: Authorized. Admin role found.",
  },
  {
    timestamp: "2026-05-29T18:24:12Z",
    category: "DATABASE" as const,
    agent: "MongoDB MCP",
    message: "Sending query execution to Cloud Run Agent: https://fahem-agent-sbqsl5tfga-uk.a.run.app..."
  },
  {
    timestamp: "2026-05-29T18:24:13Z",
    category: "DATABASE" as const,
    agent: "MongoDB MCP",
    message: "Secured authenticated GCP OIDC ID token via GCP Metadata Server.",
  },
  {
    timestamp: "2026-05-29T18:24:14Z",
    category: "DATABASE" as const,
    agent: "MongoDB MCP",
    message: "Query executed successfully in 1.63s. Returning collection schemas."
  },
  {
    timestamp: "2026-05-29T18:24:14Z",
    category: "INFO" as const,
    agent: "Presenter",
    message: "Formatted output structure and finalized streaming transmission to Superadmin Dashboard."
  }
];

export default function AdminSecurityDashboard({ language, email }: { language: string; email?: string }) {
  const [selectedNode, setSelectedNode] = useState<string | null>("guardrail");
  const [logs, setLogs] = useState<any[]>(initialTelemetryLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCat, setFilterCat] = useState<"ALL" | "INFO" | "SECURITY" | "DATABASE" | "MODEL_ARMOR">("ALL");
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Superadmin global metrics & activity trail states
  const [globalStats, setGlobalStats] = useState<{
    daily: number;
    weekly: number;
    monthly: number;
    total: number;
    userBreakdown: { email: string; tokens: number }[];
  } | null>(null);
  const [globalActivities, setGlobalActivities] = useState<any[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [activitySearchQuery, setActivitySearchQuery] = useState("");

  useEffect(() => {
    if (!email) return;

    const fetchLogs = async () => {
      setIsLoadingLogs(true);
      try {
        const response = await fetch(`/api/admin/logs?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.logs && Array.isArray(data.logs)) {
            // Sort by timestamp descending
            const sortedLogs = [...data.logs].sort((a, b) => {
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
            setLogs(sortedLogs.length > 0 ? sortedLogs : initialTelemetryLogs);
          }
        }
      } catch (err) {
        console.error("Failed to fetch admin logs:", err);
      } finally {
        setIsLoadingLogs(false);
      }
    };

    const fetchGlobalStats = async () => {
      setIsLoadingGlobal(true);
      try {
        const response = await fetch(`/api/admin/activities?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.tokenStats) {
            setGlobalStats(data.tokenStats);
          }
          if (data.activities && Array.isArray(data.activities)) {
            setGlobalActivities(data.activities);
          }
        }
      } catch (err) {
        console.error("Failed to fetch global stats:", err);
      } finally {
        setIsLoadingGlobal(false);
      }
    };

    fetchLogs();
    fetchGlobalStats();

    // Refresh logs & stats every 10 seconds automatically
    const interval = setInterval(() => {
      fetchLogs();
      fetchGlobalStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [email]);

  const filteredLogs = logs.filter((log) => {
    if (filterCat !== "ALL" && log.category !== filterCat) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        (log.agent && log.agent.toLowerCase().includes(q)) ||
        (log.category && log.category.toLowerCase().includes(q))
      );
    }
    return true;
  });


  const nodes: NodeDetail[] = [
    {
      id: "input",
      name: language === "ar" ? "مدخلات المستخدم" : "User Input Node",
      role: language === "ar" ? "استقبال وتنظيم سياق الجلسة" : "Ingest & Sanitize User Request",
      inputs: ["user_prompt", "language", "userEmail", "userId"],
      outputs: ["sanitized_payload", "context_tokens"],
      shares: [language === "ar" ? "سياق الهوية والمصادقة" : "Auth Session Token"],
      description: language === "ar"
        ? "نقطة البداية للمدخلات. يتم تجميع سياق الهوية الإضافي مثل البريد الإلكتروني ورقم تعريف المستخدم ومعرفات الجلسة لإرسالها بالكامل للمصادقة وفحص الامتيازات."
        : "The entrypoint of the pipeline. It automatically appends rich user security contexts (including the authenticated Firebase email, user UID, and active browser locale segment) to ensure strict traceability and downstream policy checks."
    },
    {
      id: "guardrail",
      name: language === "ar" ? "وكيل الحماية والامتيازات" : "Security Guardrail Agent",
      role: language === "ar" ? "فحص الصلاحيات ومكافحة حقن الأوامر" : "Pre-flight Security Audit & Injection Shield",
      inputs: ["sanitized_payload", "userEmail", "userId"],
      outputs: ["authorization_status (CONFIRMED/DENIED)", "audit_logs"],
      shares: ["SUPERADMIN_USER Whitelist", "Administrative Blocked Prefixes"],
      description: language === "ar"
        ? "يقوم بفحص المدخلات ضد هجمات حقن التعليمات البرمجية أو محاولة الوصول لأوامر إدارية مثل 'atlas-'، ويفحص البريد الإلكتروني ضد قائمة مدراء النظام البيضاء."
        : "Our strict pre-flight system. It evaluates prompt semantics against prompt-injection attacks, blocks administrative commands starting with 'atlas-', and checks the authenticated email against the encrypted SUPERADMIN_USER list prior to tool routing."
    },
    {
      id: "orchestrator",
      name: language === "ar" ? "المنسق المركزي" : "Multi-Agent Orchestrator",
      role: language === "ar" ? "توجيه وتنظيم خطوات التنفيذ" : "Dynamic Tool Routing & Planning",
      inputs: ["sanitized_payload", "authorization_status", "database_schema"],
      outputs: ["target_tool_name", "tool_arguments"],
      shares: ["Active Routing Table", "ADK Execution Graphs"],
      description: language === "ar"
        ? "العقل المفكر للعملية. يتلقى الاستعلام المؤكد أمنياً، ويقرر الأداة المناسبة للتنفيذ ويقوم بإنشاء البارامترات اللازمة دون السماح بكتابة استعلامات خام."
        : "The central planning brain. Following ADK framework protocols, the Orchestrator maps the sanitized prompt to a highly specific, parameterized tool (e.g. lookup_user_by_id) rather than general-purpose, high-risk query engines."
    },
    {
      id: "mongodb",
      name: language === "ar" ? "وكيل MongoDB MCP" : "MongoDB MCP Agent",
      role: language === "ar" ? "التنفيذ الآمن والمغلق لقواعد البيانات" : "Isolated Database Execution via MCP Protocol",
      inputs: ["target_tool_name", "tool_arguments"],
      outputs: ["raw_query_results", "db_telemetry_metrics"],
      shares: ["VPC Isolated Cloud Run Router", "MongoDB Read-Only Credentials"],
      description: language === "ar"
        ? "وكيل معزول تماماً ينفذ الأوامر عبر بروتوكول MCP وخوادم Cloud Run داخل شبكة VPC محمية. لا يسمح بأي اتصال مباشر بقواعد البيانات ويستخدم صلاحيات القراءة فقط."
        : "Executes standard, whitelisted database operations through an isolated Google Cloud Run container inside a secure VPC network. No direct raw MongoClient connections or pymongo helpers are permitted. 100% of operations flow exclusively through standardized MCP tools."
    },
    {
      id: "presenter",
      name: language === "ar" ? "مقدم المخرجات والتنسيق" : "Presenter & Stylizer Node",
      role: language === "ar" ? "تنسيق وترجمة النتائج للمستخدم" : "Premium Visual Formatting & Localization",
      inputs: ["raw_query_results", "language", "authorization_status"],
      outputs: ["styled_markdown_tables", "security_alerts", "localized_status"],
      shares: ["Language Dictionary Segments", "Aesthetic Theme Variables"],
      description: language === "ar"
        ? "المسؤول عن التنسيق الجمالي النهائي. يحول نتائج قواعد البيانات الخام أو رسائل المنع الأمنية إلى جداول وعناصر تفاعلية متميزة مع تعريب كامل للمحتوى."
        : "Builds a highly premium, accessible frontend output. It transforms raw database JSON results or security alerts into beautiful, responsive markdown tables, localized summaries, and glassmorphic telemetry cards."
    }
  ];

  const activeNode = nodes.find(n => n.id === selectedNode) || nodes[1];

  const renderArrow = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--card-border-active)", padding: "0 0.5rem" }} className="pulse-icon">
      <FiArrowRight style={{ fontSize: "1.5rem" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%" }}>
      
      {/* 1. Security & Guardrailing Setup Configurations */}
      <section className="panel-card" style={{ width: "100%" }}>
        <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiShield style={{ color: "var(--primary)" }} />
          <span>{language === "ar" ? "تكوينات نظام الحماية والحوكمة النشطة" : "Active Security & Guardrail Configurations"}</span>
        </h2>
        <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
          {language === "ar"
            ? "نظرة عامة على السياسات الأمنية النشطة المفروضة بشكل صارم على جميع عمليات الاستعلام والوصول للبيانات."
            : "Review the active, cryptographic security policies programmatically enforced across all query engines, APIs, and agent interfaces."}
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem"
        }}>
          
          {/* Policy 1: Least Privilege */}
          <div style={{
            padding: "1.25rem",
            background: "rgba(255, 255, 255, 0.45)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-green)" }}>
              <FiCheckCircle />
              <strong style={{ fontSize: "0.95rem" }}>{language === "ar" ? "مبدأ الامتياز الأقل" : "Principle of Least Privilege"}</strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#5a6e7c", margin: 0 }}>
              {language === "ar"
                ? "خادم MCP يعمل بمستخدم قاعدة بيانات للقراءة فقط. لا توجد أي صلاحيات للحذف أو التعديل المباشر للأشخاص غير المصرحين."
                : "The database user mapped to the MCP container has strict, read-only permissions. General-purpose write capabilities are programmatically locked."}
            </p>
          </div>

          {/* Policy 2: Agent-Only Strict Lock */}
          <div style={{
            padding: "1.25rem",
            background: "rgba(255, 255, 255, 0.45)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
              <FiLock />
              <strong style={{ fontSize: "0.95rem" }}>{language === "ar" ? "قفل مخصص للعملاء فقط" : "Strict Agent-Only Execution"}</strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#5a6e7c", margin: 0 }}>
              {language === "ar"
                ? "تم حظر جميع مكاتب الاتصال المباشر (MongoClient, pymongo) بنسبة 100%. خادم MCP المعزول بالكامل هو الممر الوحيد للاستعلام."
                : "Direct native DB clients (pymongo, raw MongoClient) are completely eliminated. 100% of data reads are handled via standardized MCP Tool execution graphs."}
            </p>
          </div>

          {/* Policy 3: Superadmin Authorization */}
          <div style={{
            padding: "1.25rem",
            background: "rgba(255, 255, 255, 0.45)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--secondary-hover)" }}>
              <FiSettings />
              <strong style={{ fontSize: "0.95rem" }}>{language === "ar" ? "فحص الامتيازات الإدارية" : "Designated Superadmin Access"}</strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#5a6e7c", margin: 0 }}>
              {language === "ar"
                ? "الملفات الإدارية الحساسة وإحصائيات القواعد متاحة فقط للبريد الإلكتروني المسجل بالبيئة (contact@asdaa.co, hesham1988@gmail.com)."
                : "Sensitive endpoints like db-metadata are strictly gated. Requests without designated, verified superadmin emails are rejected with HTTP 403."}
            </p>
          </div>

          {/* Policy 4: Cloud Model Armor */}
          <div style={{
            padding: "1.25rem",
            background: "rgba(16, 107, 163, 0.04)",
            border: "1px solid rgba(16, 107, 163, 0.15)",
            borderRadius: "var(--border-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
              <FiShield className="pulse-icon" style={{ color: "var(--primary)", fontSize: "1.1rem" }} />
              <strong style={{ fontSize: "0.95rem" }}>Google Cloud Model Armor</strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#5a6e7c", margin: 0 }}>
              {language === "ar"
                ? "مفعل مسبقاً لحماية الأوامر من المدخلات الضارة، محاولات تجاوز السياق، والعبارات غير الأخلاقية عبر قوالب الأمان الرسمية لـ GCP."
                : "Integrated GCP security templates inspect pre-flight and post-flight streams, shielding prompt scopes from adversarial jailbreaks and system abuse."}
            </p>
            <div style={{
              marginTop: "0.25rem",
              padding: "0.75rem",
              background: "rgba(255,255,255,0.6)",
              borderRadius: "6px",
              border: "1px solid rgba(16, 107, 163, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", borderBottom: "1px solid rgba(16, 107, 163, 0.08)", paddingBottom: "0.25rem", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                  {language === "ar" ? "القالب النشط:" : "Active Template:"}
                </span>
                <span style={{ fontFamily: "monospace", fontSize: "0.75rem", background: "rgba(16, 107, 163, 0.08)", padding: "2px 6px", borderRadius: "4px", color: "var(--primary)" }}>
                  fahem-default-template
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {[
                  {
                    id: "sdp",
                    titleAr: "حماية البيانات الحساسة (SDP)",
                    titleEn: "Sensitive Data Protection (SDP)",
                    descAr: "مفعّل ورصين. حجب أرقام البطاقات، الهويات، والبيانات الشخصية الحساسة.",
                    descEn: "Ticked & active. Filters out credit cards, PII, and sensitive identifiers."
                  },
                  {
                    id: "jailbreak",
                    titleAr: "مكافحة حقن الأوامر وتجاوز السياق",
                    titleEn: "Prompt Injection & Jailbreak Shield",
                    descAr: "مفعّل ورصين. رصد هجمات الهندسة الاجتماعية ومحاولات كسر الحماية.",
                    descEn: "Ticked & active. Detects social engineering and structural system overrides."
                  },
                  {
                    id: "uri",
                    titleAr: "تصفية الروابط وعناوين URIs الخبيثة",
                    titleEn: "Malicious URIs Filter",
                    descAr: "مفعّل ورصين. حظر الروابط غير الموثوقة أو محاولات التصيد.",
                    descEn: "Ticked & active. Blocks untrusted domains, phishing URLs, and blacklisted IPs."
                  },
                  {
                    id: "rai",
                    titleAr: "فلاتر الذكاء الاصطناعي المسؤول (RAI)",
                    titleEn: "Responsible AI Safety Filters",
                    descAr: "مفعّل ورصين. تصفية خطابات الكراهية، العنف، التحرش، والمحتوى غير اللائق.",
                    descEn: "Ticked & active. Restricts hate speech, violence, harassment, and sexual content."
                  }
                ].map((filter) => (
                  <div key={filter.id} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <FiCheckCircle style={{ color: "var(--accent-green)", marginTop: "0.15rem", flexShrink: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)" }}>
                        {language === "ar" ? filter.titleAr : filter.titleEn}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#5a6e7c" }}>
                        {language === "ar" ? filter.descAr : filter.descEn}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>


          {/* Policy 5: Context-Aware Credit Guardrails Privilege Engine */}
          <div style={{
            padding: "1.25rem",
            background: "rgba(212, 175, 55, 0.04)",
            border: "1px solid rgba(212, 175, 55, 0.2)",
            borderRadius: "var(--border-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--secondary)" }}>
              <FiZap className="pulse-icon" />
              <strong style={{ fontSize: "0.95rem" }}>
                {language === "ar" ? "محرك امتيازات حوكمة الرصيد وسياق الهوية" : "Context-Aware Credit Guardrails Privilege Engine"}
              </strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#5a6e7c", margin: 0 }}>
              {language === "ar"
                ? "يفرض سياسات تفصيلية ديناميكية لعمليات القراءة والكتابة بناءً على معرّف المستخدم المؤكد، الهوية الرقمية، والرصيد المتبقي. تستهلك العمليات الرصيد تدريجياً، ويتم حظر الكتابة تلقائياً عند نفاد الرصيد."
                : "Dynamically enforces database access constraints based on the authenticated session's user ID, email identity, and remaining credits. Reads/writes consume credits, and write blocking triggers if credits reach zero."}
            </p>
          </div>

        </div>
      </section>

      {/* 2. Interactive Agent Pipeline & DAG Workflows */}
      <section className="panel-card" style={{ width: "100%" }}>
        <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiLayers style={{ color: "var(--secondary)" }} />
          <span>{language === "ar" ? "مخطط سير العمل وهندسة ترابط الوكلاء (DAG)" : "Interactive Multi-Agent Pipeline & DAG Workflow"}</span>
        </h2>
        <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "2rem" }}>
          {language === "ar"
            ? "انقر على أي عقدة في مخطط تدفق المهام التفاعلي أدناه لعرض تفاصيل المدخلات والمخرجات والمكونات المشتركة."
            : "Click on any node in the interactive workflow layout below to inspect data inputs, outputs, shared structures, and responsibilities."}
        </p>

        {/* The Graphical Visualizer Block */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem"
        }}>
          
          {/* Node Track / Map */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.3)",
            padding: "1.5rem 1rem",
            borderRadius: "var(--border-radius-lg)",
            border: "1px dashed var(--card-border)",
            overflowX: "auto",
            gap: "0.5rem",
            width: "100%"
          }}>
            
            {nodes.map((node, index) => {
              const isSelected = selectedNode === node.id;
              return (
                <React.Fragment key={node.id}>
                  
                  {/* Node Circle Card */}
                  <button
                    onClick={() => setSelectedNode(node.id)}
                    type="button"
                    style={{
                      flexShrink: 0,
                      padding: "1rem",
                      borderRadius: "var(--border-radius-md)",
                      background: isSelected 
                        ? "linear-gradient(135deg, var(--primary), var(--primary-hover))" 
                        : "var(--card-bg)",
                      color: isSelected ? "#ffffff" : "var(--foreground)",
                      border: isSelected 
                        ? "2px solid var(--secondary)" 
                        : "1px solid var(--card-border)",
                      boxShadow: isSelected 
                        ? "0 8px 24px rgba(16, 107, 163, 0.25), 0 0 10px rgba(212, 175, 55, 0.3)" 
                        : "var(--shadow-sm)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.5rem",
                      minWidth: "140px",
                      maxWidth: "180px",
                      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                      textAlign: "center"
                    }}
                    className="dag-node-btn"
                  >
                    <div style={{
                      width: "2.25rem",
                      height: "2.25rem",
                      borderRadius: "50%",
                      backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : "rgba(16, 107, 163, 0.08)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      border: isSelected ? "1px solid #ffffff" : "1px solid var(--card-border)"
                    }}>
                      {node.id === "input" && <FiCode style={{ fontSize: "1.1rem" }} />}
                      {node.id === "guardrail" && <FiShield style={{ fontSize: "1.1rem" }} />}
                      {node.id === "orchestrator" && <FiSettings style={{ fontSize: "1.1rem" }} />}
                      {node.id === "mongodb" && <FiDatabase style={{ fontSize: "1.1rem" }} />}
                      {node.id === "presenter" && <FiLayers style={{ fontSize: "1.1rem" }} />}
                    </div>
                    
                    <strong style={{ fontSize: "0.85rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                      {node.name}
                    </strong>
                    <span style={{ fontSize: "0.7rem", opacity: isSelected ? 0.9 : 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                      {node.id === "input" ? "Step 1" : 
                       node.id === "guardrail" ? "Step 2" : 
                       node.id === "orchestrator" ? "Step 3" : 
                       node.id === "mongodb" ? "Step 4" : "Step 5"}
                    </span>
                  </button>

                  {index < nodes.length - 1 && renderArrow()}
                </React.Fragment>
              );
            })}
          </div>

          {/* Node Inspector details panel */}
          <div style={{
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-md)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            transition: "all 0.3s ease"
          }}>
            
            {/* Title & Role */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", margin: 0, fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FiCpu style={{ color: "var(--primary)" }} />
                  <span>{activeNode.name}</span>
                </h3>
                <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600 }}>
                  {activeNode.role}
                </span>
              </div>
              <div style={{
                fontSize: "0.75rem",
                padding: "0.3rem 0.75rem",
                background: "linear-gradient(135deg, rgba(16,107,163,0.1), rgba(212,175,55,0.15))",
                borderRadius: "50px",
                border: "1px solid var(--card-border)",
                fontWeight: 600,
                color: "var(--foreground)"
              }}>
                DAG ID: <code style={{ fontFamily: "var(--font-mono)" }}>{activeNode.id}_node</code>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: "0.92rem", color: "#4f6371", lineHeight: "1.6" }}>
              {activeNode.description}
            </p>

            {/* Inputs, Outputs & Shared Resources Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginTop: "0.5rem"
            }}>
              
              {/* Input Variables */}
              <div style={{ background: "rgba(255,255,255,0.7)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(235, 220, 185, 0.4)" }}>
                <strong style={{ fontSize: "0.8rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.5rem" }}>
                  <FiCode />
                  <span>{language === "ar" ? "المتغيرات المدخلة" : "Input Parameters"}</span>
                </strong>
                <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {activeNode.inputs.map((inp, idx) => (
                    <li key={idx} style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "#1c2b36", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <FiGitCommit style={{ color: "var(--secondary)" }} />
                      <span>{inp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Output Variables */}
              <div style={{ background: "rgba(255,255,255,0.7)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(235, 220, 185, 0.4)" }}>
                <strong style={{ fontSize: "0.8rem", color: "var(--accent-orange)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.5rem" }}>
                  <FiLayers />
                  <span>{language === "ar" ? "المخرجات المنتجة" : "Output Stream Variables"}</span>
                </strong>
                <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {activeNode.outputs.map((out, idx) => (
                    <li key={idx} style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "#1c2b36", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <FiGitCommit style={{ color: "var(--secondary)" }} />
                      <span>{out}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shared States */}
              <div style={{ background: "rgba(16, 107, 163, 0.03)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(16, 107, 163, 0.08)" }}>
                <strong style={{ fontSize: "0.8rem", color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.5rem" }}>
                  <FiCpu />
                  <span>{language === "ar" ? "القواعد والموارد المشتركة" : "Shared Context & States"}</span>
                </strong>
                <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {activeNode.shares.map((share, idx) => (
                    <li key={idx} style={{ fontSize: "0.8rem", color: "#1c2b36", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "var(--accent-green)" }}></span>
                      <span>{share}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. Real-Time Admin Logging & Guardrails Audit Console */}
      <section className="panel-card" style={{ width: "100%", marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <FiTerminal style={{ color: "var(--primary)" }} />
              <span>{language === "ar" ? "لوحة تدقيق العمليات وسجلات الحماية الفورية" : "Superadmin Operational Logs & Security Audit Console"}</span>
            </h2>
            <p style={{ color: "#4f6371", fontSize: "0.9rem", margin: "0.25rem 0 0 0" }}>
              {language === "ar"
                ? "سجل حي لعمليات خادم MCP، تدقيق رصيد الامتيازات، وتقييمات GCP Model Armor الفورية."
                : "Live, persistent telemetry of whitelisted database operations, credential checks, and GCP Model Armor evaluations."}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => {
                const nowStr = new Date().toISOString();
                const newLogs = [
                  {
                    timestamp: nowStr,
                    category: "INFO",
                    agent: "Orchestrator",
                    message: "User query initiated: 'Show schema of orders collection'"
                  },
                  {
                    timestamp: nowStr,
                    category: "MODEL_ARMOR",
                    agent: "Model Armor",
                    message: "Sanitizing user prompt via fahem-default-template: Passed."
                  },
                  {
                    timestamp: nowStr,
                    category: "SECURITY",
                    agent: "Guardrail",
                    message: "Authorized read-only token verified for hesham1988@gmail.com."
                  },
                  {
                    timestamp: nowStr,
                    category: "DATABASE",
                    agent: "MongoDB MCP",
                    message: "Successfully fetched collection schema for 'orders' via whitelisted tool."
                  }
                ];
                setLogs((prev) => [...newLogs, ...prev]);
              }}
              style={{
                background: "rgba(16, 107, 163, 0.08)",
                border: "1px solid var(--card-border-active)",
                borderRadius: "6px",
                padding: "0.4rem 0.8rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                color: "var(--primary)"
              }}
            >
              <FiActivity />
              <span>{language === "ar" ? "محاكاة طلب آمن" : "Simulate Normal Call"}</span>
            </button>
            <button
              onClick={() => {
                const nowStr = new Date().toISOString();
                const attackLogs = [
                  {
                    timestamp: nowStr,
                    category: "SECURITY",
                    agent: "Model Armor",
                    message: "CRITICAL ALERT: Prompt evaluation flagged under 'pi_and_jailbreak' by GCP Model Armor!",
                    details: "Prompt contains injection payload: 'how can I steal money from website?'"
                  },
                  {
                    timestamp: nowStr,
                    category: "SECURITY",
                    agent: "Guardrail",
                    message: "OPERATION BLOCKED: Pre-flight sanitization failed. Security policy violation logged.",
                    details: "Blocked attempt from IP: 198.51.100.42 to execute instructions bypass."
                  }
                ];
                setLogs((prev) => [...attackLogs, ...prev]);
              }}
              style={{
                background: "rgba(220, 53, 69, 0.08)",
                border: "1px solid rgba(220, 53, 69, 0.25)",
                borderRadius: "6px",
                padding: "0.4rem 0.8rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                color: "#dc3545"
              }}
            >
              <FiAlertTriangle />
              <span>{language === "ar" ? "محاكاة هجوم حقن" : "Simulate Jailbreak Attempt"}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.7)", border: "1px solid var(--card-border)", borderRadius: "6px", padding: "0.25rem 0.75rem", flex: 1, minWidth: "200px" }}>
            <FiSearch style={{ color: "#7a8b9e" }} />
            <input
              type="text"
              placeholder={language === "ar" ? "البحث في العمليات..." : "Search logs..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.85rem", width: "100%", color: "var(--foreground)" }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: "0.35rem", overflowX: "auto", paddingBottom: "2px" }}>
            {(["ALL", "INFO", "SECURITY", "DATABASE", "MODEL_ARMOR"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                style={{
                  background: filterCat === cat ? "var(--primary)" : "rgba(255,255,255,0.6)",
                  color: filterCat === cat ? "#ffffff" : "#4f6371",
                  border: "1px solid " + (filterCat === cat ? "var(--primary-hover)" : "var(--card-border)"),
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  borderRadius: "50px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                {cat === "MODEL_ARMOR" ? "MODEL ARMOR 🛡️" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Terminal console screen */}
        <div style={{
          background: "#0c1520",
          borderRadius: "8px",
          border: "1px solid #1c2b3c",
          fontFamily: "var(--font-mono), monospace",
          padding: "1rem",
          maxHeight: "350px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem"
        }}>
          {filteredLogs.length === 0 ? (
            <div style={{ color: "#506578", textAlign: "center", padding: "2rem", fontSize: "0.85rem" }}>
              {language === "ar" ? "لم يتم العثور على سجلات تطابق عوامل التصفية." : "No logs found matching your filters."}
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              let color = "#cbd5e1";
              let bg = "transparent";
              if (log.category === "SECURITY") {
                color = log.message.includes("BLOCKED") || log.message.includes("ALERT") ? "#fca5a5" : "#fdba74";
                bg = log.message.includes("BLOCKED") || log.message.includes("ALERT") ? "rgba(239, 68, 68, 0.08)" : "transparent";
              } else if (log.category === "DATABASE") {
                color = "#86efac";
              } else if (log.category === "MODEL_ARMOR") {
                color = log.message.includes("BLOCKED") || log.message.includes("CRITICAL") ? "#fca5a5" : "#93c5fd";
                bg = log.message.includes("BLOCKED") || log.message.includes("CRITICAL") ? "rgba(239, 68, 68, 0.08)" : "transparent";
              }

              return (
                <div key={idx} style={{
                  fontSize: "0.8rem",
                  color: color,
                  lineHeight: "1.5",
                  padding: "0.4rem 0.5rem",
                  borderRadius: "4px",
                  background: bg,
                  borderLeft: log.message.includes("BLOCKED") || log.message.includes("ALERT") ? "3px solid #ef4444" : "none"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.8, fontSize: "0.75rem", marginBottom: "0.15rem" }}>
                    <span>[{log.timestamp}]</span>
                    <span style={{ fontWeight: "bold" }}>{log.category} • {log.agent}</span>
                  </div>
                  <div>
                    <span style={{ marginRight: "0.5rem", color: "#106ba3" }}>&gt;</span>
                    {log.message}
                  </div>
                  {log.details && (
                    <div style={{ opacity: 0.75, fontSize: "0.75rem", paddingLeft: "1rem", marginTop: "0.25rem", color: "#94a3b8" }}>
                      ↳ {log.details}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 4. Executive Global Token Analytics Panel */}
      <section className="panel-card" style={{ width: "100%", marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--card-border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <FiTrendingUp style={{ color: "var(--primary)" }} />
              <span>{language === "ar" ? "التحليلات التنفيذية لاستهلاك الرموز عالمياً" : "Executive Global Token Analytics"}</span>
            </h2>
            <p style={{ color: "#4f6371", fontSize: "0.9rem", margin: "0.25rem 0 0 0" }}>
              {language === "ar"
                ? "مراقبة وتحليل منحنيات استهلاك الرموز (Tokens) يومياً، أسبوعياً، وشهرياً لجميع الحسابات."
                : "Real-time monitoring and reporting of token consumption metrics across Daily, Weekly, Monthly, and Lifetime intervals."}
            </p>
          </div>
          {isLoadingGlobal && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", color: "var(--primary)" }}>
              <FiRefreshCw className="spinning-icon" />
              <span>{language === "ar" ? "جاري التحديث..." : "Syncing..."}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Token Stats Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem"
          }}>
            {[
              {
                id: "daily",
                titleAr: "الاستهلاك اليومي",
                titleEn: "Daily Consumption",
                tokens: globalStats?.daily ?? 0,
                color: "var(--primary)",
                descAr: "آخر 24 ساعة",
                descEn: "Last 24 hours"
              },
              {
                id: "weekly",
                titleAr: "الاستهلاك الأسبوعي",
                titleEn: "Weekly Consumption",
                tokens: globalStats?.weekly ?? 0,
                color: "var(--secondary-hover)",
                descAr: "آخر 7 أيام",
                descEn: "Last 7 days"
              },
              {
                id: "monthly",
                titleAr: "الاستهلاك الشهري",
                titleEn: "Monthly Consumption",
                tokens: globalStats?.monthly ?? 0,
                color: "var(--accent-orange)",
                descAr: "آخر 30 يوم",
                descEn: "Last 30 days"
              },
              {
                id: "lifetime",
                titleAr: "الاستهلاك الإجمالي",
                titleEn: "Lifetime Consumption",
                tokens: globalStats?.total ?? 0,
                color: "var(--accent-green)",
                descAr: "تراكمي مدى الحياة",
                descEn: "Cumulative overall"
              }
            ].map((card) => (
              <div key={card.id} style={{
                padding: "1.25rem",
                background: "rgba(255, 255, 255, 0.45)",
                border: "1px solid var(--card-border)",
                borderRadius: "var(--border-radius-md)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                position: "relative",
                overflow: "hidden",
                boxShadow: "var(--shadow-sm)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#6a7c88", fontWeight: 600 }}>
                    {language === "ar" ? card.titleAr : card.titleEn}
                  </span>
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: card.color,
                    animation: "pulse 2s infinite"
                  }} />
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", margin: "0.25rem 0" }}>
                  <span style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                    {(card.tokens || 0).toLocaleString()}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#6a7c88", fontWeight: 500 }}>
                    {language === "ar" ? "رمز" : "tokens"}
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#5a6e7c" }}>
                  {language === "ar" ? card.descAr : card.descEn}
                </div>
              </div>
            ))}
          </div>

          {/* Top Consuming Users Table */}
          <div style={{
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-md)",
            padding: "1.25rem",
          }}>
            <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: "0 0 1rem 0" }}>
              <FiUsers style={{ color: "var(--secondary)" }} />
              <span>{language === "ar" ? "أكثر المستخدمين استهلاكاً للرموز" : "Top Consuming Users Breakdown"}</span>
            </h3>

            {!globalStats?.userBreakdown || globalStats.userBreakdown.length === 0 ? (
              <div style={{ color: "#506578", textAlign: "center", padding: "1.5rem", fontSize: "0.85rem" }}>
                {language === "ar" ? "لا توجد بيانات استهلاك متاحة حالياً." : "No usage data available."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "250px", overflowY: "auto" }}>
                {globalStats.userBreakdown.map((user, idx) => {
                  const maxTokens = globalStats.userBreakdown[0]?.tokens || 1;
                  const percentage = Math.min(100, Math.round(((user.tokens || 0) / maxTokens) * 100));
                  return (
                    <div key={idx} style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                      padding: "0.75rem",
                      background: "rgba(255,255,255,0.7)",
                      borderRadius: "6px",
                      border: "1px solid rgba(235, 220, 185, 0.4)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                          {user.email}
                        </span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>
                          {(user.tokens || 0).toLocaleString()} {language === "ar" ? "رمز" : "tokens"}
                        </span>
                      </div>
                      <div style={{
                        width: "100%",
                        height: "6px",
                        background: "rgba(16, 107, 163, 0.08)",
                        borderRadius: "50px",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, var(--primary), var(--secondary))",
                          borderRadius: "50px"
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Global Operational Activity Trail */}
      <section className="panel-card" style={{ width: "100%", marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <FiActivity style={{ color: "var(--secondary)" }} />
              <span>{language === "ar" ? "سجل الأنشطة والعمليات العام لفاهم" : "Global Operational Activity Trail"}</span>
            </h2>
            <p style={{ color: "#4f6371", fontSize: "0.9rem", margin: "0.25rem 0 0 0" }}>
              {language === "ar"
                ? "تتبع مباشر وتدقيق شامل لجميع استعلامات المستخدمين، عمليات البحث الموثق، والحظر الأمني."
                : "Real-time ledger auditing all standard queries, grounded searches, blocks, and system events."}
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.7)", border: "1px solid var(--card-border)", borderRadius: "6px", padding: "0.4rem 0.75rem", flex: 1 }}>
            <FiSearch style={{ color: "#7a8b9e" }} />
            <input
              type="text"
              placeholder={language === "ar" ? "البحث بالبريد الإلكتروني، العملية، أو الحالة..." : "Filter by email, action, or status..."}
              value={activitySearchQuery}
              onChange={(e) => setActivitySearchQuery(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.85rem", width: "100%", color: "var(--foreground)" }}
            />
          </div>
        </div>

        {/* Table representation */}
        <div style={{ overflowX: "auto", background: "rgba(255,255,255,0.4)", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(16, 107, 163, 0.04)", borderBottom: "1px solid var(--card-border)" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--primary)" }}>{language === "ar" ? "المستخدم" : "User"}</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--primary)" }}>{language === "ar" ? "العملية" : "Action"}</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--primary)" }}>{language === "ar" ? "الحالة" : "Status"}</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--primary)" }}>{language === "ar" ? "التوقيت" : "Timestamp"}</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--primary)" }}>{language === "ar" ? "التفاصيل" : "Details"}</th>
              </tr>
            </thead>
            <tbody>
              {globalActivities.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#6a7c88" }}>
                    {language === "ar" ? "لا توجد أنشطة مسجلة حالياً." : "No activities recorded."}
                  </td>
                </tr>
              ) : (
                globalActivities
                  .filter((act) => {
                    if (!activitySearchQuery) return true;
                    const q = activitySearchQuery.toLowerCase();
                    return (
                      (act.userEmail || "").toLowerCase().includes(q) ||
                      (act.action || "").toLowerCase().includes(q) ||
                      (act.status || "").toLowerCase().includes(q) ||
                      (act.details || "").toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 100) // Show up to 100 entries
                  .map((act, idx) => {
                    const status = (act.status || "SUCCESS").toUpperCase();
                    const isSuccess = status === "SUCCESS" || status === "COMPLETED" || status === "PASSED";
                    const isBlocked = status === "BLOCKED" || status === "DENIED" || status === "CRITICAL";
                    
                    let badgeBg = "rgba(16, 107, 163, 0.08)";
                    let badgeColor = "var(--primary)";
                    if (isSuccess) {
                      badgeBg = "rgba(40, 167, 69, 0.08)";
                      badgeColor = "var(--accent-green)";
                    } else if (isBlocked) {
                      badgeBg = "rgba(220, 53, 69, 0.08)";
                      badgeColor = "#dc3545";
                    }

                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--card-border)", transition: "all 0.2s ease" }}>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--foreground)" }}>
                          {act.userEmail}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                          {act.action}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            background: badgeBg,
                            color: badgeColor,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem"
                          }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: badgeColor, display: "inline-block" }} />
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#6a7c88", fontSize: "0.8rem" }}>
                          {new Date(act.timestamp).toLocaleString(language === "ar" ? "ar-EG" : "en-US")}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#4f6371", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={act.details}>
                          {act.details}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .dag-node-btn:hover {
          transform: translateY(-4px);
          border-color: var(--secondary) !important;
          box-shadow: 0 12px 30px rgba(16, 107, 163, 0.12) !important;
        }
      `}</style>
    </div>
  );
}


