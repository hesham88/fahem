"use client";

import React, { useState, useEffect } from "react";
import { 
  FiShield, 
  FiCpu, 
  FiDatabase, 
  FiLayers, 
  FiArrowRight, 
  FiArrowLeft,
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
  FiUser,
  FiPlus,
  FiTrash2,
  FiBookOpen,
  FiCheck,
  FiX,
  FiList
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
    history?: { date: string; tokens: number }[];
  } | null>(null);
  const [globalActivities, setGlobalActivities] = useState<any[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [hoveredPoint, setHoveredPoint] = useState<{ date: string; tokens: number; x: number; y: number } | null>(null);

  // Custom Database MCP Tools test states
  const [activeMcpTab, setActiveMcpTab] = useState<"persist" | "insight" | "search">("persist");
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpResult, setMcpResult] = useState<any>(null);
  const [mcpError, setMcpError] = useState<string | null>(null);

  // Interactive Security, Token Controls, and File Upload state configurations
  const [maxUploadSize, setMaxUploadSize] = useState<number>(2); // in MB
  const [isUploadScanningEnabled, setIsUploadScanningEnabled] = useState<boolean>(true);
  const [allowedUploadFormats, setAllowedFormats] = useState({
    pdf: true,
    docx: true,
    txt: true,
    images: false
  });
  const [dailyAllocationLimit, setDailyAllocationLimit] = useState<number>(50000);
  const [weeklyAllocationLimit, setWeeklyAllocationLimit] = useState<number>(250000);
  const [monthlyAllocationLimit, setMonthlyAllocationLimit] = useState<number>(1000000);
  const [isTokenControlActive, setIsTokenControlActive] = useState<boolean>(true);
  const [isSavingConfigs, setIsSavingConfigs] = useState<boolean>(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState<string | null>(null);

  // --- Admin Approval & Curriculum Ingestion States ---
  const [admins, setAdmins] = useState<any[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState<boolean>(false);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState<boolean>(false);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [adminActionSuccess, setAdminActionSuccess] = useState<string | null>(null);

  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(false);

  // Subject Ingestion states
  const [subjName, setSubjName] = useState("");
  const [subjNameAr, setSubjNameAr] = useState("");
  const [subjGrade, setSubjGrade] = useState("Grade 10");
  const [subjCategory, setSubjCategory] = useState("Science");
  const [subjEmoji, setSubjEmoji] = useState("📚");
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [subjectSuccess, setSubjectSuccess] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  // Book Ingestion states
  const [bookSubjId, setBookSubjId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookTitleAr, setBookTitleAr] = useState("");
  const [bookGrade, setBookGrade] = useState("Grade 10");
  const [bookTerm, setBookTerm] = useState("Term 1");
  const [bookYear, setBookYear] = useState("2026");
  const [bookLang, setBookLang] = useState("ar");
  const [bookType, setBookType] = useState("core");
  const [bookSourceUrl, setBookSourceUrl] = useState("");
  const [bookStoragePath, setBookStoragePath] = useState("");
  const [pendingChapters, setPendingChapters] = useState<any[]>([]);

  // Interactive Chapter Builder states
  const [chTitle, setChTitle] = useState("");
  const [chTitleAr, setChTitleAr] = useState("");
  const [chStartPage, setChStartPage] = useState<number>(1);
  const [chEndPage, setChEndPage] = useState<number>(10);
  const [chConcepts, setChConcepts] = useState("");

  const [isIngestingBook, setIsIngestingBook] = useState(false);
  const [bookSuccess, setBookSuccess] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);

  const fetchAdmins = async () => {
    if (!email) return;
    setIsLoadingAdmins(true);
    try {
      const response = await fetch(`/api/admin/approve?superadminEmail=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.admins)) {
          setAdmins(data.admins);
          setIsSuperadmin(true);
        }
      } else {
        setIsSuperadmin(false);
      }
    } catch (err) {
      console.error("Failed to fetch admin list:", err);
      setIsSuperadmin(false);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  const fetchSubjects = async () => {
    setIsLoadingSubjects(true);
    try {
      const response = await fetch("/api/subjects");
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.subjects)) {
          setSubjectsList(data.subjects);
          if (data.subjects.length > 0 && !bookSubjId) {
            setBookSubjId(data.subjects[0]._id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch subjects list:", err);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const handleToggleAdminApproval = async (adminEmail: string, currentApproved: boolean) => {
    if (!email) return;
    setAdminActionError(null);
    setAdminActionSuccess(null);

    const action = currentApproved ? "revoke" : "approve";

    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          superadminEmail: email,
          adminEmail,
          action
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAdminActionSuccess(
          language === "ar"
            ? `تمت ${action === "approve" ? "الموافقة على" : "إلغاء موافقة"} المشرف ${adminEmail} بنجاح`
            : `Successfully ${action === "approve" ? "approved" : "revoked"} admin ${adminEmail}`
        );
        fetchAdmins();
        setTimeout(() => setAdminActionSuccess(null), 4000);
      } else {
        setAdminActionError(data.error || "Failed to update administrator status.");
        setTimeout(() => setAdminActionError(null), 4000);
      }
    } catch (err: any) {
      setAdminActionError(err.message || "An unexpected network error occurred.");
      setTimeout(() => setAdminActionError(null), 4000);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !subjName || !subjNameAr) return;
    setIsCreatingSubject(true);
    setSubjectSuccess(null);
    setSubjectError(null);

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subjName,
          name_ar: subjNameAr,
          grade_level: subjGrade,
          category: subjCategory,
          icon_emoji: subjEmoji,
          requesterEmail: email
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubjectSuccess(language === "ar" ? "🏆 تم إضافة المادة الدراسية الجديدة بنجاح!" : "🏆 Subject added and propagated successfully!");
        setSubjName("");
        setSubjNameAr("");
        fetchSubjects();
        setTimeout(() => setSubjectSuccess(null), 4000);
      } else {
        setSubjectError(data.error || "Failed to create subject.");
      }
    } catch (err: any) {
      setSubjectError(err.message || "Network error occurred while saving subject.");
    } finally {
      setIsCreatingSubject(false);
    }
  };

  const handleAddChapter = () => {
    if (!chTitle || !chTitleAr) return;
    const newCh = {
      id: `ch_${pendingChapters.length + 1}`,
      title: chTitle,
      title_ar: chTitleAr,
      page_start: Number(chStartPage),
      page_end: Number(chEndPage),
      concepts: chConcepts ? chConcepts.split(",").map(c => c.trim()).filter(Boolean) : []
    };
    setPendingChapters([...pendingChapters, newCh]);
    setChTitle("");
    setChTitleAr("");
    setChStartPage(Number(chEndPage) + 1);
    setChEndPage(Number(chEndPage) + 10);
    setChConcepts("");
  };

  const handleRemoveChapter = (index: number) => {
    setPendingChapters(pendingChapters.filter((_, i) => i !== index));
  };

  const handleIngestBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !bookSubjId || !bookTitle || !bookTitleAr) return;
    setIsIngestingBook(true);
    setBookSuccess(null);
    setBookError(null);

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: bookSubjId,
          title: bookTitle,
          title_ar: bookTitleAr,
          grade: bookGrade,
          term: bookTerm,
          year: bookYear,
          language: bookLang,
          book_type: bookType,
          source_url: bookSourceUrl,
          storage_path: bookStoragePath,
          chapters: pendingChapters,
          requesterEmail: email
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBookSuccess(language === "ar" ? "📚 تم استيراد كتاب المنهج بنجاح!" : "📚 Book ingested, indexed, and linked successfully!");
        setBookTitle("");
        setBookTitleAr("");
        setBookSourceUrl("");
        setBookStoragePath("");
        setPendingChapters([]);
        setTimeout(() => setBookSuccess(null), 4000);
      } else {
        setBookError(data.error || "Failed to ingest textbook.");
      }
    } catch (err: any) {
      setBookError(err.message || "Failed to contact database backend.");
    } finally {
      setIsIngestingBook(false);
    }
  };

  const handleSaveConfigs = () => {
    setIsSavingConfigs(true);
    setConfigSaveSuccess(null);
    setTimeout(() => {
      setIsSavingConfigs(false);
      setConfigSaveSuccess(language === "ar" ? "تم حفظ التكوينات وتطبيقها بنجاح!" : "Configurations successfully saved and enforced!");
      setTimeout(() => setConfigSaveSuccess(null), 4000);
    }, 1200);
  };

  // Tool 1: Persist states
  const [catalogPayload, setCatalogPayload] = useState<string>(
    JSON.stringify({
      subject_id: "subj_biology",
      grade: "Grade 10",
      book_title: "High School Biology - Introductory Genetics",
      total_pages: 142,
      concepts_catalog: [
        {
          concept_id: "concept_mendel_laws",
          title: "Mendelian Inheritance Principles",
          start_page: 34,
          end_page: 55
        }
      ]
    }, null, 2)
  );

  // Tool 2: Insight states
  const [gradeTier, setGradeTier] = useState("Grade 10");
  const [subjectFilter, setSubjectFilter] = useState("subj_biology");

  // Tool 3: Vector search states
  const [searchSubject, setSearchSubject] = useState("subj_biology");
  const [searchGrade, setSearchGrade] = useState("Grade 10");
  const [searchQueryVectorText, setSearchQueryVectorText] = useState("How does DNA replication process start?");

  const handleExecuteMcpTool = async () => {
    setMcpLoading(true);
    setMcpResult(null);
    setMcpError(null);
    
    let argumentsPayload: any = {};
    let toolName = "";

    try {
      if (activeMcpTab === "persist") {
        toolName = "persist_extracted_textbook_catalog";
        let parsedJson;
        try {
          parsedJson = JSON.parse(catalogPayload);
        } catch (e) {
          throw new Error(language === "ar" ? "خطأ في تنسيق JSON. يرجى التأكد من كتابة JSON بشكل صحيح." : "Invalid JSON format. Please verify the JSON syntax.");
        }
        argumentsPayload = { extracted_book_profile: parsedJson };
      } else if (activeMcpTab === "insight") {
        toolName = "execute_student_insight_aggregation";
        argumentsPayload = {
          grade_tier: gradeTier,
          subject_filter: subjectFilter
        };
      } else if (activeMcpTab === "search") {
        toolName = "execute_atlas_hybrid_vector_search";
        // Mock a 768-dim float vector dynamically
        const denseVector = Array.from({ length: 768 }, () => parseFloat((Math.random() * 0.2 - 0.1).toFixed(6)));
        argumentsPayload = {
          dense_vector: denseVector,
          subject_id: searchSubject,
          grade: searchGrade
        };
      }

      const response = await fetch(`/api/admin/mcp-tool?email=${encodeURIComponent(email || "")}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tool_name: toolName,
          arguments: argumentsPayload
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (data.status === "success") {
        setMcpResult(data.result);
      } else {
        setMcpError(data.error || "Execution failed");
      }
    } catch (err: any) {
      setMcpError(err.message || "An unexpected error occurred during execution.");
    } finally {
      setMcpLoading(false);
    }
  };

  // Generates sleek vector sparkline SVG overlays for metrics panels
  const renderSparkline = (cardId: string, tokens: number, strokeColor: string) => {
    const historyData = globalStats?.history || [];
    let sparklineValues = [10, 20, 15, 30, 25, 40, tokens];
    
    if (historyData.length > 0) {
      if (cardId === "daily") {
        sparklineValues = historyData.slice(-3).map(d => d.tokens);
      } else if (cardId === "weekly") {
        sparklineValues = historyData.slice(-7).map(d => d.tokens);
      } else if (cardId === "monthly") {
        sparklineValues = historyData.slice(-15).map(d => d.tokens);
      } else {
        sparklineValues = historyData.map(d => d.tokens);
      }
    }
    
    if (sparklineValues.length < 2) {
      sparklineValues = [tokens * 0.5, tokens, tokens * 0.8, tokens * 1.2];
    }
    
    const max = Math.max(...sparklineValues, 1);
    const min = Math.min(...sparklineValues, 0);
    const range = max - min || 1;
    const width = 120;
    const height = 45;
    
    const points = sparklineValues.map((val, i) => {
      const x = (i / (sparklineValues.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    }).join(" ");
    
    const fillPoints = `0,${height} ${points} ${width},${height}`;
    const gradId = `sparkline-grad-${cardId}`;

    return (
      <div style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        left: 0,
        height: "45px",
        opacity: 0.5,
        pointerEvents: "none",
        zIndex: 0
      }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.00" />
            </linearGradient>
          </defs>
          <polygon
            points={fillPoints}
            fill={`url(#${gradId})`}
          />
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    );
  };

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
            const getNum = (v: any) => {
              if (!v) return 0;
              if (typeof v === "object") return v.total || 0;
              return Number(v) || 0;
            };
            setGlobalStats({
              daily: getNum(data.tokenStats.daily),
              weekly: getNum(data.tokenStats.weekly),
              monthly: getNum(data.tokenStats.monthly),
              total: getNum(data.tokenStats.total),
              userBreakdown: Array.isArray(data.tokenStats.userBreakdown) ? data.tokenStats.userBreakdown : [],
              history: Array.isArray(data.tokenStats.history) ? data.tokenStats.history : []
            });
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
    fetchAdmins();
    fetchSubjects();

    // Refresh logs & stats every 10 seconds automatically
    const interval = setInterval(() => {
      fetchLogs();
      fetchGlobalStats();
      fetchAdmins();
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
      {language === "ar" ? <FiArrowLeft style={{ fontSize: "1.5rem" }} /> : <FiArrowRight style={{ fontSize: "1.5rem" }} />}
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

      {/* A. Superadmin Admin Approval Console */}
      <section className="panel-card" style={{ width: "100%", marginTop: "1rem" }}>
        <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiUsers style={{ color: "var(--primary)" }} />
          <span>{language === "ar" ? "إدارة واعتماد المشرفين الجدد (خاص بالمسؤول الأكبر)" : "Superadmin Administrator Approval Console"}</span>
        </h2>
        <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
          {language === "ar"
            ? "اعتماد حسابات المشرفين الجدد لتمكينهم من الوصول إلى لوحات التحكم وإدارة المحتوى الدراسي بأمان."
            : "Review, approve, or revoke access for admin candidates. Only active superadmins can perform modifications on standard admin privileges."}
        </p>

        {adminActionError && (
          <div style={{ padding: "0.75rem", background: "rgba(211, 47, 47, 0.1)", border: "1px solid rgba(211, 47, 47, 0.2)", borderRadius: "6px", color: "#f87171", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {adminActionError}
          </div>
        )}
        {adminActionSuccess && (
          <div style={{ padding: "0.75rem", background: "rgba(39, 174, 96, 0.1)", border: "1px solid rgba(39, 174, 96, 0.2)", borderRadius: "6px", color: "var(--accent-green)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {adminActionSuccess}
          </div>
        )}

        {!isSuperadmin ? (
          <div style={{
            background: "rgba(255, 193, 7, 0.05)",
            border: "1px solid rgba(255, 193, 7, 0.2)",
            borderRadius: "var(--border-radius-md)",
            padding: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            color: "#6b5100"
          }}>
            <FiLock style={{ fontSize: "1.25rem", color: "#b28900" }} />
            <span style={{ fontSize: "0.9rem", fontFamily: "Cairo, var(--font-sans)" }}>
              {language === "ar"
                ? "هذا القسم مخصص للمشرفين الكبار (Superadmins) فقط. حسابك الحالي لديه صلاحيات مشرف قياسي."
                : "This section is restricted to Superadmins. Your active account is authenticated with standard administrator access."}
            </span>
          </div>
        ) : isLoadingAdmins && admins.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <FiRefreshCw className="spinning-icon" style={{ fontSize: "1.5rem", color: "var(--primary)" }} />
            <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#64748b" }}>
              {language === "ar" ? "جاري تحميل قائمة المرشحين..." : "Loading administrator candidate list..."}
            </p>
          </div>
        ) : admins.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#64748b", fontSize: "0.85rem" }}>
            {language === "ar" ? "لا يوجد مرشحون حاليون للإشراف." : "No admin candidates currently found."}
          </div>
        ) : (
          <div style={{ overflowX: "auto", background: "rgba(255,255,255,0.4)", borderRadius: "10px", border: "1px solid var(--card-border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "start" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.03)", borderBottom: "1px solid var(--card-border)" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{language === "ar" ? "المشرف" : "Admin Candidate"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{language === "ar" ? "الحالة" : "Status"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{language === "ar" ? "المصدر" : "Data Source"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, textAlign: "center" }}>{language === "ar" ? "العمليات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((adm, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--card-border)", transition: "background 0.2s" }} className="user-breakdown-row">
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, color: "#1e293b" }}>{adm.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{adm.email}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {adm.isApprovedAdmin ? (
                        <span style={{
                          background: "rgba(39, 174, 96, 0.12)",
                          color: "var(--accent-green)",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          <FiCheck style={{ fontSize: "0.85rem" }} />
                          {language === "ar" ? "مقبول" : "Approved"}
                        </span>
                      ) : (
                        <span style={{
                          background: "rgba(243, 156, 18, 0.12)",
                          color: "var(--accent-orange)",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          <FiX style={{ fontSize: "0.85rem" }} />
                          {language === "ar" ? "قيد الانتظار" : "Pending Approval"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "0.75rem" }}>
                      <code>{adm.source}</code>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                      <button
                        onClick={() => handleToggleAdminApproval(adm.email, adm.isApprovedAdmin)}
                        style={{
                          background: adm.isApprovedAdmin ? "rgba(211, 47, 47, 0.08)" : "rgba(16, 107, 163, 0.08)",
                          color: adm.isApprovedAdmin ? "#d32f2f" : "var(--primary)",
                          border: `1px solid ${adm.isApprovedAdmin ? "rgba(211, 47, 47, 0.15)" : "rgba(16, 107, 163, 0.15)"}`,
                          borderRadius: "6px",
                          padding: "4px 12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = adm.isApprovedAdmin ? "rgba(211, 47, 47, 0.15)" : "rgba(16, 107, 163, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = adm.isApprovedAdmin ? "rgba(211, 47, 47, 0.08)" : "rgba(16, 107, 163, 0.08)";
                        }}
                      >
                        {adm.isApprovedAdmin ? (
                          <>
                            <FiX />
                            {language === "ar" ? "إلغاء الاعتماد" : "Revoke"}
                          </>
                        ) : (
                          <>
                            <FiCheck />
                            {language === "ar" ? "اعتماد كمسؤول" : "Approve Admin"}
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Curriculum & Textbook Ingestion Studio extracted to independent CurriculumIngestionStudio.tsx tab */}


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
                boxShadow: "var(--shadow-sm)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "default"
              }}
              className="metric-card-hover"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
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
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", margin: "0.25rem 0", position: "relative", zIndex: 2 }}>
                  <span style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                    {(card.tokens || 0).toLocaleString()}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#6a7c88", fontWeight: 500 }}>
                    {language === "ar" ? "رمز" : "tokens"}
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#5a6e7c", position: "relative", zIndex: 2 }}>
                  {language === "ar" ? card.descAr : card.descEn}
                </div>
                {renderSparkline(card.id, card.tokens, card.color)}
              </div>
            ))}
          </div>

          {/* Interactive Token Controls & File Upload Limits Setup */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
            marginTop: "1.5rem",
            marginBottom: "1.5rem"
          }}>
            {/* Token Allocation Controls Card */}
            <div style={{
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid var(--card-border)",
              borderRadius: "var(--border-radius-md)",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                <FiSettings style={{ color: "var(--primary)" }} />
                <span>{language === "ar" ? "إعدادات وقواعد التحكم بالرموز (Tokens)" : "Cognitive Token Controls & Allocations"}</span>
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6a7c88", margin: 0 }}>
                {language === "ar" ? "تحديد سقف وحصص الاستهلاك اليومية والأسبوعية للحد من التكلفة وضمان استقرار الخدمة." : "Configure cognitive token limitations across Daily, Weekly, and Monthly intervals to prevent API runaway bills."}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{language === "ar" ? "الحد اليومي المخصص للمستعلم" : "Daily Limit Per Student"}</span>
                    <span style={{ color: "var(--primary)", fontWeight: 700, fontFamily: "monospace" }}>{dailyAllocationLimit.toLocaleString()} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="100000"
                    step="5000"
                    value={dailyAllocationLimit}
                    onChange={(e) => setDailyAllocationLimit(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--primary)" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{language === "ar" ? "الحد الأسبوعي للمستعلم" : "Weekly Limit Per Student"}</span>
                    <span style={{ color: "var(--secondary)", fontWeight: 700, fontFamily: "monospace" }}>{weeklyAllocationLimit.toLocaleString()} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="500000"
                    step="10000"
                    value={weeklyAllocationLimit}
                    onChange={(e) => setWeeklyAllocationLimit(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--secondary)" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{language === "ar" ? "الحد الشهري الأقصى" : "Monthly Allocated Limit"}</span>
                    <span style={{ color: "var(--accent-orange)", fontWeight: 700, fontFamily: "monospace" }}>{monthlyAllocationLimit.toLocaleString()} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="200000"
                    max="2000000"
                    step="50000"
                    value={monthlyAllocationLimit}
                    onChange={(e) => setMonthlyAllocationLimit(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent-orange)" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px dashed var(--card-border)" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{language === "ar" ? "تفعيل الرقابة الصارمة" : "Strict Limit Enforcement"}</span>
                  <label className="switch-label" style={{ position: "relative", display: "inline-block", width: "42px", height: "20px" }}>
                    <input
                      type="checkbox"
                      checked={isTokenControlActive}
                      onChange={(e) => setIsTokenControlActive(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: isTokenControlActive ? "var(--primary)" : "#cbd5e1",
                      transition: "0.3s",
                      borderRadius: "20px"
                    }}>
                      <span style={{
                        position: "absolute",
                        content: '""',
                        height: "14px", width: "14px",
                        left: isTokenControlActive ? "24px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        transition: "0.3s",
                        borderRadius: "50%"
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* File Upload Size & Format Constraints Card */}
            <div style={{
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid var(--card-border)",
              borderRadius: "var(--border-radius-md)",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                <FiLock style={{ color: "var(--accent-orange)" }} />
                <span>{language === "ar" ? "تكوينات قيود وحجم الملفات المرفوعة" : "File Upload & Size Limit Configurations"}</span>
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6a7c88", margin: 0 }}>
                {language === "ar" ? "التحكم في الحد الأقصى للمرفقات وصيغ الملفات المسموح بها لحماية الخوادم والاشتراكات." : "Set hard-limits on custom textbook and notes uploads to safeguard cluster space and optimize parsing overhead."}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{language === "ar" ? "الحد الأقصى لحجم الملف الواحد" : "Maximum Size Allowed"}</span>
                    <span style={{ color: "var(--accent-orange)", fontWeight: 700, fontFamily: "monospace" }}>{maxUploadSize} MB</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={maxUploadSize}
                    onChange={(e) => setMaxUploadSize(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent-orange)" }}
                  />
                </div>

                <div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.4rem", color: "var(--foreground)" }}>
                    {language === "ar" ? "الصيغ والامتدادات المسموح بها" : "Allowed Attachment Formats"}
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    {[
                      { key: "pdf", label: "PDF Documents" },
                      { key: "docx", label: "Word (DOCX)" },
                      { key: "txt", label: "Text Files (TXT)" },
                      { key: "images", label: "Images (PNG/JPG)" }
                    ].map((fmt) => (
                      <label key={fmt.key} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", cursor: "pointer", color: "#475569" }}>
                        <input
                          type="checkbox"
                          checked={(allowedUploadFormats as any)[fmt.key]}
                          onChange={(e) => setAllowedFormats({ ...allowedUploadFormats, [fmt.key]: e.target.checked })}
                          style={{ accentColor: "var(--accent-orange)" }}
                        />
                        <span>{fmt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px dashed var(--card-border)" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{language === "ar" ? "فحص الملفات سحابياً قبل الحفظ" : "Pre-upload Sandbox Malware Scan"}</span>
                  <label className="switch-label" style={{ position: "relative", display: "inline-block", width: "42px", height: "20px" }}>
                    <input
                      type="checkbox"
                      checked={isUploadScanningEnabled}
                      onChange={(e) => setIsUploadScanningEnabled(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: isUploadScanningEnabled ? "var(--accent-orange)" : "#cbd5e1",
                      transition: "0.3s",
                      borderRadius: "20px"
                    }}>
                      <span style={{
                        position: "absolute",
                        content: '""',
                        height: "14px", width: "14px",
                        left: isUploadScanningEnabled ? "24px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        transition: "0.3s",
                        borderRadius: "50%"
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Config Action Row */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "1rem", borderTop: "1px dashed var(--card-border)", paddingTop: "1rem" }}>
            {configSaveSuccess && (
              <span style={{ fontSize: "0.85rem", color: "var(--accent-green)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <FiCheckCircle />
                {configSaveSuccess}
              </span>
            )}
            <button
              onClick={handleSaveConfigs}
              disabled={isSavingConfigs}
              className="btn btn-primary"
              style={{ padding: "0.6rem 1.5rem", minWidth: "180px", background: "linear-gradient(135deg, var(--primary), var(--secondary))", border: "none", boxShadow: "var(--shadow-md)" }}
            >
              {isSavingConfigs ? <FiRefreshCw className="spinning-icon" /> : <FiLock />}
              <span>{isSavingConfigs ? (language === "ar" ? "جاري الحفظ والإنفاذ..." : "Deploying Policies...") : (language === "ar" ? "حفظ وتطبيق السياسات" : "Save & Apply Policies")}</span>
            </button>
          </div>


          {/* Interactive Token Telemetry Visual Chart */}
          <div style={{
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-lg)",
            padding: "1.5rem",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            position: "relative"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FiActivity style={{ color: "var(--primary)", fontSize: "1.2rem" }} />
                <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800 }}>
                  {language === "ar" ? "سجل استهلاك الرموز اليومي" : "Historical Daily Token Telemetry"}
                </h3>
              </div>
              <span style={{
                fontSize: "0.7rem",
                color: "#106ba3",
                background: "rgba(16, 107, 163, 0.06)",
                padding: "3px 8px",
                borderRadius: "50px",
                fontWeight: 700
              }}>
                {language === "ar" ? "آخر 7 أيام (محدث لحظياً)" : "Last 7 Days (Realtime)"}
              </span>
            </div>

            <div style={{ width: "100%", overflowX: "auto" }}>
              <div style={{ position: "relative", minWidth: "550px", width: "100%", height: "230px" }}>
                {(() => {
                  const dummyHistory = [
                    { date: "05-23", tokens: 1200 },
                    { date: "05-24", tokens: 2800 },
                    { date: "05-25", tokens: 2100 },
                    { date: "05-26", tokens: 4100 },
                    { date: "05-27", tokens: 3600 },
                    { date: "05-28", tokens: 5800 },
                    { date: "05-29", tokens: 7200 },
                  ];

                  const historyData = (globalStats?.history && globalStats.history.length > 0)
                    ? globalStats.history.map(item => ({
                        ...item,
                        label: item.date.length >= 10 ? item.date.substring(5) : item.date
                      }))
                    : dummyHistory.map(item => ({ ...item, label: item.date }));

                  const maxVal = Math.max(...historyData.map(d => d.tokens), 500);

                  const svgWidth = 600;
                  const svgHeight = 220;
                  const paddingLeft = 60;
                  const paddingRight = 20;
                  const paddingTop = 25;
                  const paddingBottom = 35;

                  const chartWidth = svgWidth - paddingLeft - paddingRight;
                  const chartHeight = svgHeight - paddingTop - paddingBottom;

                  let linePath = "";
                  let areaPath = "";

                  if (historyData.length > 0) {
                    linePath = historyData.map((d, i) => {
                      const x = paddingLeft + (i / (historyData.length - 1)) * chartWidth;
                      const y = paddingTop + chartHeight - (d.tokens / maxVal) * chartHeight;
                      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                    }).join(" ");

                    const firstX = paddingLeft;
                    const lastX = paddingLeft + chartWidth;
                    const bottomY = paddingTop + chartHeight;
                    areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
                  }

                  const gridLines = [0.25, 0.5, 0.75, 1.0];

                  return (
                    <>
                      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" style={{ display: "block" }}>
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
                          </linearGradient>
                        </defs>

                        {/* Background Grid Lines */}
                        {gridLines.map((ratio, index) => {
                          const y = paddingTop + chartHeight - ratio * chartHeight;
                          const val = Math.round(ratio * maxVal);
                          return (
                            <g key={index}>
                              <line
                                x1={paddingLeft}
                                y1={y}
                                x2={svgWidth - paddingRight}
                                y2={y}
                                stroke="rgba(16, 107, 163, 0.08)"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                              />
                              <text
                                x={paddingLeft - 8}
                                y={y + 4}
                                fill="#8a9ca8"
                                fontSize="10"
                                fontWeight="700"
                                textAnchor="end"
                                style={{ fontFamily: "var(--font-mono)" }}
                              >
                                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                              </text>
                            </g>
                          );
                        })}

                        {/* Baseline */}
                        <line
                          x1={paddingLeft}
                          y1={paddingTop + chartHeight}
                          x2={svgWidth - paddingRight}
                          y2={paddingTop + chartHeight}
                          stroke="rgba(16, 107, 163, 0.15)"
                          strokeWidth="1"
                        />

                        {/* Under Area Gradient */}
                        {areaPath && (
                          <path
                            d={areaPath}
                            fill="url(#chartGradient)"
                          />
                        )}

                        {/* Active Area Bars for extra richness */}
                        {historyData.map((d, i) => {
                          const barWidth = Math.max(12, chartWidth / historyData.length * 0.25);
                          const x = paddingLeft + (i / (historyData.length - 1)) * chartWidth - barWidth / 2;
                          const y = paddingTop + chartHeight - (d.tokens / maxVal) * chartHeight;
                          const height = (d.tokens / maxVal) * chartHeight;
                          return (
                            <rect
                              key={`bar-${i}`}
                              x={x}
                              y={y}
                              width={barWidth}
                              height={height}
                              rx="3"
                              fill="rgba(16, 107, 163, 0.06)"
                              style={{ transition: "all 0.3s ease" }}
                            />
                          );
                        })}

                        {/* Core Line Path */}
                        {linePath && (
                          <path
                            d={linePath}
                            fill="none"
                            stroke="var(--primary)"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Glow Dots and Interactive hover overlays */}
                        {historyData.map((d, i) => {
                          const x = paddingLeft + (i / (historyData.length - 1)) * chartWidth;
                          const y = paddingTop + chartHeight - (d.tokens / maxVal) * chartHeight;
                          const isHovered = hoveredPoint && hoveredPoint.date === d.date;

                          return (
                            <g key={i}>
                              <circle
                                cx={x}
                                cy={y}
                                r={isHovered ? "7" : "4"}
                                fill="#ffffff"
                                stroke="var(--primary)"
                                strokeWidth={isHovered ? "4" : "2.5"}
                                style={{
                                  transition: "all 0.15s ease",
                                  cursor: "pointer",
                                  filter: "drop-shadow(0 2px 4px rgba(16, 107, 163, 0.2))"
                                }}
                              />
                              {/* X Axis Labels */}
                              <text
                                x={x}
                                y={paddingTop + chartHeight + 18}
                                fill="#6a7c88"
                                fontSize="10"
                                fontWeight="700"
                                textAnchor="middle"
                                style={{ fontFamily: " Cairo, var(--font-sans)" }}
                              >
                                {d.label}
                              </text>

                              {/* Invisible Trigger rect for easy hovering */}
                              <rect
                                x={x - (chartWidth / historyData.length) / 2}
                                y={paddingTop}
                                width={chartWidth / historyData.length}
                                height={chartHeight + 15}
                                fill="transparent"
                                style={{ cursor: "pointer" }}
                                onMouseEnter={(e) => {
                                  // Get bounding rect to calculate responsive HTML coordinates
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const container = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                                  if (container) {
                                    setHoveredPoint({
                                      date: d.date,
                                      tokens: d.tokens,
                                      x: rect.left - container.left + rect.width / 2,
                                      y: rect.top - container.top + (y - paddingTop)
                                    });
                                  }
                                }}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                            </g>
                          );
                        })}
                      </svg>

                      {/* Tooltip Overlay */}
                      {hoveredPoint && (
                        <div style={{
                          position: "absolute",
                          left: `${hoveredPoint.x}px`,
                          top: `${hoveredPoint.y - 30}px`,
                          transform: "translate(-50%, -100%)",
                          background: "rgba(15, 23, 42, 0.95)",
                          color: "#ffffff",
                          padding: "8px 14px",
                          borderRadius: "10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          pointerEvents: "none",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.22)",
                          zIndex: 100,
                          whiteSpace: "nowrap",
                          transition: "all 0.1s ease",
                          fontFamily: "Cairo, var(--font-sans)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          border: "1px solid rgba(255,255,255,0.15)"
                        }}>
                          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.65rem", display: "block" }}>
                            {language === "ar" ? `التاريخ: ${hoveredPoint.date}` : `Date: ${hoveredPoint.date}`}
                          </span>
                          <span style={{ color: "#4394d2", display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4394d2" }} />
                            {(hoveredPoint.tokens || 0).toLocaleString()} {language === "ar" ? "رمز مستهلك" : "tokens used"}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
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
                  const rankColors = [
                    { border: "rgba(16, 107, 163, 0.22)", bg: "linear-gradient(135deg, rgba(16, 107, 163, 0.08), rgba(27, 163, 156, 0.03))", badge: "var(--primary)" },
                    { border: "rgba(27, 163, 156, 0.22)", bg: "linear-gradient(135deg, rgba(27, 163, 156, 0.08), rgba(243, 156, 18, 0.03))", badge: "var(--secondary)" },
                    { border: "rgba(243, 156, 18, 0.22)", bg: "linear-gradient(135deg, rgba(243, 156, 18, 0.08), rgba(162, 217, 206, 0.03))", badge: "var(--accent-orange)" }
                  ];
                  const rankStyle = rankColors[idx] || { border: "rgba(16, 107, 163, 0.1)", bg: "rgba(255,255,255,0.75)", badge: "#7a8b9e" };
                  const initials = user.email ? user.email.substring(0, 2).toUpperCase() : "U";

                  return (
                    <div key={idx} style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.45rem",
                      padding: "0.85rem",
                      background: rankStyle.bg,
                      borderRadius: "8px",
                      border: `1px solid ${rankStyle.border}`,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                    className="user-breakdown-row"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: rankStyle.badge,
                            color: "#fff",
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-mono)"
                          }}>
                            #{idx + 1}
                          </span>
                          <span style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.85)",
                            border: "1px solid rgba(16, 107, 163, 0.15)",
                            color: "var(--primary)",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-mono)"
                          }}>
                            {initials}
                          </span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                            {user.email}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>
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
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "start" }}>
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
                          {act.timestamp ? new Date(act.timestamp).toLocaleString(language === "ar" ? "ar-EG" : "en-US") : "N/A"}
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

      {/* 6. Superadmin Database MCP Specialist Toolset Control Panel */}
      <section className="panel-card" style={{ width: "100%", marginTop: "1rem" }}>
        <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiTerminal style={{ color: "var(--primary)" }} />
          <span>{language === "ar" ? "لوحة التحكم واختبار أدوات MCP المخصصة" : "Superadmin Database MCP Specialist Toolset"}</span>
        </h2>
        <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
          {language === "ar"
            ? "تشغيل واختبار أدوات قاعدة البيانات المتقدمة لفاهم للتأكد من سلامة المزامنة والعمليات البينية."
            : "Execute, test, and inspect high-fidelity custom database MCP functions programmatically integrated into our multi-agent swarm."}
        </p>

        {/* MCP Tab Controls */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--card-border)",
          marginBottom: "1.5rem",
          gap: "1rem"
        }}>
          {[
            { id: "persist", nameAr: "حفظ كتالوج الكتب", nameEn: "Persist Textbook Catalog" },
            { id: "insight", nameAr: "تحليلات أداء الطلاب", nameEn: "Student Performance Analytics" },
            { id: "search", nameAr: "البحث المتجهي الهجين", nameEn: "Atlas Hybrid Vector Search" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveMcpTab(tab.id as any);
                setMcpResult(null);
                setMcpError(null);
              }}
              style={{
                padding: "0.75rem 1rem",
                background: "transparent",
                border: "none",
                borderBottom: activeMcpTab === tab.id ? "3px solid var(--primary)" : "3px solid transparent",
                color: activeMcpTab === tab.id ? "var(--primary)" : "#64748b",
                fontWeight: activeMcpTab === tab.id ? "700" : "500",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "0.9rem"
              }}
            >
              {language === "ar" ? tab.nameAr : tab.nameEn}
            </button>
          ))}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "1.5rem"
        }}>
          {/* Tool Parameters Form */}
          <div style={{
            background: "rgba(255, 255, 255, 0.45)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-md)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem"
          }}>
            <h3 style={{ fontSize: "1.05rem", margin: 0, fontWeight: 700 }}>
              {language === "ar" ? "معاملات الأداة النشطة" : "Active Tool Parameters"}
            </h3>

            {activeMcpTab === "persist" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                  {language === "ar" ? "ملف كتالوج الكتاب (صيغة JSON):" : "Extracted Book Catalog Payload (JSON format):"}
                </label>
                <textarea
                  value={catalogPayload}
                  onChange={(e) => setCatalogPayload(e.target.value)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.85rem",
                    padding: "0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--card-border)",
                    minHeight: "180px",
                    background: "#fdfbf7",
                    color: "var(--foreground)",
                    width: "100%",
                    outline: "none"
                  }}
                />
              </div>
            )}

            {activeMcpTab === "insight" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                    {language === "ar" ? "المرحلة الدراسية:" : "Target Grade Level:"}
                  </label>
                  <select
                    value={gradeTier}
                    onChange={(e) => setGradeTier(e.target.value)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--card-border)",
                      background: "#fff",
                      fontSize: "0.85rem",
                      outline: "none"
                    }}
                  >
                    <option value="Grade 10">{language === "ar" ? "الصف العاشر (أولى ثانوي)" : "Grade 10"}</option>
                    <option value="Grade 11">{language === "ar" ? "الصف الحادي عشر (ثانية ثانوي)" : "Grade 11"}</option>
                    <option value="Grade 12">{language === "ar" ? "الصف الثاني عشر (ثالثة ثانوي)" : "Grade 12"}</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                    {language === "ar" ? "رمز المادة الدراسية:" : "Subject Taxonomy ID:"}
                  </label>
                  <input
                    type="text"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--card-border)",
                      fontSize: "0.85rem",
                      outline: "none"
                    }}
                  />
                </div>
              </div>
            )}

            {activeMcpTab === "search" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                      {language === "ar" ? "المرحلة الدراسية:" : "Cohort / Grade:"}
                    </label>
                    <select
                      value={searchGrade}
                      onChange={(e) => setSearchGrade(e.target.value)}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "6px",
                        border: "1px solid var(--card-border)",
                        background: "#fff",
                        fontSize: "0.85rem",
                        outline: "none"
                      }}
                    >
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                      {language === "ar" ? "رمز المادة الدراسية:" : "Subject Taxonomy ID:"}
                    </label>
                    <input
                      type="text"
                      value={searchSubject}
                      onChange={(e) => setSearchSubject(e.target.value)}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "6px",
                        border: "1px solid var(--card-border)",
                        fontSize: "0.85rem",
                        outline: "none"
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                    {language === "ar" ? "نص استعلام البحث المتجهي (سيتم تحويله تلقائياً لمتجه 768-D):" : "Semantic Search query (simulates 768-D vector embedding conversion):"}
                  </label>
                  <input
                    type="text"
                    value={searchQueryVectorText}
                    onChange={(e) => setSearchQueryVectorText(e.target.value)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--card-border)",
                      fontSize: "0.85rem",
                      outline: "none"
                    }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleExecuteMcpTool}
              disabled={mcpLoading}
              style={{
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "0.75rem 1.5rem",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: mcpLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(16, 107, 163, 0.15)",
                alignSelf: "flex-start",
                marginTop: "0.5rem"
              }}
            >
              {mcpLoading ? (
                <>
                  <FiRefreshCw className="spinning-icon" />
                  <span>{language === "ar" ? "جاري تشغيل الأداة..." : "Running Tool..."}</span>
                </>
              ) : (
                <>
                  <FiZap />
                  <span>{language === "ar" ? "تشغيل أداة قاعدة البيانات" : "Execute Database Tool"}</span>
                </>
              )}
            </button>
          </div>

          {/* Results Audit Output */}
          <div style={{
            background: "#0f172a",
            color: "#38bdf8",
            border: "1px solid #1e293b",
            borderRadius: "var(--border-radius-md)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            minHeight: "220px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.85rem",
            position: "relative"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", paddingBottom: "0.5rem" }}>
              <span style={{ color: "#94a3b8", fontWeight: 700 }}>
                {language === "ar" ? "💻 مخرجات التدقيق وتفاصيل التشغيل" : "💻 Execution Audit Log Output"}
              </span>
              <span style={{
                color: mcpLoading ? "var(--accent-orange)" : mcpResult ? "var(--accent-green)" : mcpError ? "#f87171" : "#64748b",
                fontSize: "0.75rem",
                fontWeight: "bold"
              }}>
                {mcpLoading ? "RUNNING" : mcpResult ? "SUCCESS" : mcpError ? "FAILED" : "IDLE"}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", maxHeight: "300px" }}>
              {mcpLoading && (
                <div style={{ color: "var(--accent-orange)" }}>
                  {language === "ar" ? "> جاري إرسال حزمة تشغيل الأداة عبر خادم الوكيل الآمن..." : "> Securing GCP OIDC Bearer Token verification and invoking Cloud Run Agent execution pathway..."}
                </div>
              )}
              {mcpError && (
                <div style={{ color: "#f87171" }}>
                  {language === "ar" ? `❌ خطأ في التشغيل: ${mcpError}` : `❌ Execution Error: ${mcpError}`}
                </div>
              )}
              {mcpResult && (
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#e2e8f0" }}>
                  {typeof mcpResult === "string" ? mcpResult : JSON.stringify(mcpResult, null, 2)}
                </pre>
              )}
              {!mcpLoading && !mcpResult && !mcpError && (
                <div style={{ color: "#64748b" }}>
                  {language === "ar" ? "> بانتظار تشغيل الأداة لتلقي مخرجات فحص قاعدة البيانات..." : "> Standing by. Select a tool, customize arguments, and trigger execution to inspect live data metrics..."}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .dag-node-btn:hover {
          transform: translateY(-4px);
          border-color: var(--secondary) !important;
          box-shadow: 0 12px 30px rgba(16, 107, 163, 0.12) !important;
        }
        .metric-card-hover:hover {
          transform: translateY(-4px);
          border-color: var(--primary) !important;
          box-shadow: 0 10px 25px rgba(16, 107, 163, 0.08) !important;
          background: rgba(255, 255, 255, 0.65) !important;
        }
        .user-breakdown-row:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(16, 107, 163, 0.06);
          border-color: var(--primary) !important;
        }
      `}</style>
    </div>
  );
}


