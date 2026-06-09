import React, { useState, useEffect, useRef } from "react";
import { authedFetch } from "../lib/authedFetch";
import {
  FiBookOpen,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiSearch,
  FiGrid,
  FiLayers,
  FiCheck,
  FiTerminal,
  FiAlertCircle,
  FiChevronDown,
  FiEdit,
  FiFolder,
  FiInfo,
  FiSliders,
  FiSave,
  FiLink,
  FiActivity,
  FiCheckCircle,
  FiCpu,
  FiPause,
  FiPlay,
  FiSquare,
  FiSlash
} from "react-icons/fi";

interface Library {
  _id: string;
  name: string;
  name_ar: string;
  source: string;
  logo: string;
  scopeSchema: { key: string; label: string; label_ar: string; type: "enum" | "string"; options?: string[] }[];
  status: string;
}

interface Curriculum {
  _id: string;
  library_id: string;
  title: string;
  title_ar: string;
  scope: Record<string, string>;
  subject_ids: string[];
  status: string;
  visibility: string;
  owner_uid: string | null;
}

interface Subject {
  _id: string;
  curriculum_id: string;
  name: string;
  name_ar: string;
  color: string;
  emoji: string;
  category: string;
  core_book_ids?: string[];
  supporting_book_ids?: string[];
  books_count?: number;
}

interface Book {
  _id: string;
  library_id?: string;
  curriculum_id?: string;
  subject_id?: string;
  role?: "core" | "supporting";
  title: string;
  title_ar: string;
  language: string;
  source_url?: string;
  status: string;
}

interface QueueJob {
  id: string;
  fileName: string;
  bookTitle: string;
  bookTitleAr: string;
  subjectName: string;
  status: "idle" | "processing" | "completed" | "paused" | "failed" | "queued" | "downloading" | "pending_approval";
  progress: number;
  totalPages: number;
  processedPages: number;
}

const translations: Record<string, Record<string, string>> = {
  en: {
    title: "Curriculum Ingestion Studio",
    subtitle: "Empower your knowledge engine with dynamic library structures, curriculum scopes, and autonomous indexers.",
    tab_libraries: "🏛️ Library Manager",
    tab_curricula: "📐 Curriculum Builder",
    tab_ingest: "⚡ Ingestion & Crawl Console",
    
    // Library Manager
    create_library: "Create Library",
    edit_library: "Edit Library",
    lib_id: "Library ID",
    lib_id_placeholder: "e.g. lib_moe",
    lib_name_en: "Library Name (EN)",
    lib_name_ar: "Library Name (AR)",
    lib_source: "Source Provider Type",
    lib_logo: "Logo Path or URL",
    scope_schema: "Curriculum Scope Schema Dimensions",
    add_dimension: "Add Dimension",
    dim_key: "Key",
    dim_label_en: "Label (EN)",
    dim_label_ar: "Label (AR)",
    dim_type: "Type",
    dim_options: "Options (comma-separated)",
    save_library: "Save Library Configuration",
    library_list: "Configured Libraries",
    no_libraries: "No libraries configured. Add a new library to start.",
    
    // Curriculum Builder
    select_library: "Select Library Domain",
    create_curriculum: "Create Curriculum Unit",
    edit_curriculum: "Edit Curriculum Unit",
    cur_title_en: "Curriculum Title (EN)",
    cur_title_ar: "Curriculum Title (AR)",
    cur_id_opt: "Curriculum ID (Optional)",
    scope_details: "Scope Dimensions (from Library Schema)",
    save_curriculum: "Save Curriculum Unit",
    curricula_list: "Curriculum Units",
    no_curricula: "No curriculum units found for this library. Create one above.",
    subjects_manager: "Manage Subjects in Curriculum",
    no_subjects: "No subjects configured in this curriculum yet.",
    subject_name_en: "Subject Name (EN)",
    subject_name_ar: "Subject Name (AR)",
    subject_color: "Theme Color",
    subject_emoji: "Emoji Icon",
    subject_category: "Category Block",
    save_subject: "Save Subject Details",
    book_assignments: "Book Assignments",
    assign_book: "Assign Book to Subject",
    select_book: "Select Textbook",
    select_subject: "Select Target Subject",
    book_role: "Assignment Role",
    assign_btn: "Confirm Assignment",
    role_core: "Core Textbook",
    role_supporting: "Supporting Material",
    assigned_books: "Assigned Books",
    unassigned_books: "Unassigned Books Pool",
    
    // Ingestion Console
    target_destination: "Target Curricular Assignment Location",
    web_crawler: "Advanced Autonomous Web Crawler",
    crawl_url_label: "Target School / Portal URL",
    crawl_depth: "Max Crawl Depth",
    start_crawl: "Initiate Crawl & Analyze",
    crawler_running: "Crawling educational directories...",
    crawled_results: "Discovered Textbook Resources",
    bulk_ingest_btn: "Bulk Ingest Selected ({count} books)",
    manual_ingest: "Direct Manual Ingester",
    file_upload_or_url: "PDF Source URL / Location",
    direct_ingest_btn: "Direct Ingest Single Textbook",
    telemetry_console: "GCP Cloud Run Job Telemetry Console",
    refresh_jobs: "Refresh Queue Status",
    active_executing: "ACTIVE EXECUTING",
    queue_empty: "INGESTION QUEUE IDLE",
    term_job_btn: "Terminate Async Job",
    logs_terminal: "System Execution logs",
    all_books_count: "Total books in database:"
  },
  ar: {
    title: "أستوديو المناهج والاستيراد",
    subtitle: "عزز محرك المعرفة ببنيات مكتبية ديناميكية ومناهج دراسية متكاملة وقنوات أتمتة فائقة الذكاء.",
    tab_libraries: "🏛️ مدير المكتبات",
    tab_curricula: "📐 منشئ المناهج والأبواب",
    tab_ingest: "⚡ لوحة الاستيراد والزحف الذكي",
    
    // Library Manager
    create_library: "إنشاء مكتبة جديدة",
    edit_library: "تعديل المكتبة",
    lib_id: "رمز المكتبة الفريد",
    lib_id_placeholder: "مثال: lib_moe",
    lib_name_en: "اسم المكتبة (إنجليزي)",
    lib_name_ar: "اسم المكتبة (عربي)",
    lib_source: "مزود المحتوى",
    lib_logo: "رابط شعار المكتبة",
    scope_schema: "أبعاد ونطاق تصنيفات المنهج (Scope Schema)",
    add_dimension: "إضافة بعد جديد",
    dim_key: "المفتاح (Key)",
    dim_label_en: "العنوان (إنجليزي)",
    dim_label_ar: "العنوان (عربي)",
    dim_type: "النوع",
    dim_options: "الخيارات المتاحة (مفصولة بفاصلة)",
    save_library: "حفظ إعدادات المكتبة",
    library_list: "المكتبات النشطة بالنظام",
    no_libraries: "لا توجد مكتبات معرفة حالياً. أضف مكتبة جديدة للبدء.",
    
    // Curriculum Builder
    select_library: "اختر المكتبة التعليمية",
    create_curriculum: "إنشاء منهج دراسي جديد",
    edit_curriculum: "تعديل المنهج الدراسي",
    cur_title_en: "عنوان المنهج (إنجليزي)",
    cur_title_ar: "عنوان المنهج (عربي)",
    cur_id_opt: "رمز المنهج (اختياري)",
    scope_details: "تحديد أبعاد المنهج ونطاقه",
    save_curriculum: "حفظ المنهج الدراسي",
    curricula_list: "قائمة المناهج المسجلة",
    no_curricula: "لا توجد مناهج مسجلة تحت هذه المكتبة. أنشئ واحداً الآن.",
    subjects_manager: "إدارة المواد الدراسية للمنهج",
    no_subjects: "لا توجد مواد أكاديمية معرفة لهذا المنهج بعد.",
    subject_name_en: "اسم المادة (إنجليزي)",
    subject_name_ar: "اسم المادة (عربي)",
    subject_color: "اللون المميز",
    subject_emoji: "أيقونة تعبيرية",
    subject_category: "الفئة العامة",
    save_subject: "حفظ بيانات المادة الدراسية",
    book_assignments: "تخصيص وربط المناهج بالكتب",
    assign_book: "ربط كتاب بمادة دراسية",
    select_book: "اختر الكتاب الدراسي",
    select_subject: "اختر المادة الأكاديمية المستهدفة",
    book_role: "نوع الارتباط بالمنهج",
    assign_btn: "تأكيد ربط وتخصيص الكتاب",
    role_core: "كتاب أساسي منهجى",
    role_supporting: "مادة ومصدر داعم",
    assigned_books: "الكتب المرتبطة والمخصصة",
    unassigned_books: "حوض الكتب غير المخصصة",
    
    // Ingestion Console
    target_destination: "المنهج والمادة المستهدفة للاستيراد",
    web_crawler: "عنكبوت الزحف والاستكشاف التلقائي للمناهج",
    crawl_url_label: "رابط موقع المناهج / المكتبة الرقمية",
    crawl_depth: "أقصى عمق للزحف",
    start_crawl: "ابدأ الزحف والاستكشاف الذكي",
    crawler_running: "جاري تصفح واستكشاف دلائل الموقع...",
    crawled_results: "الكتب والمصادر التعليمية المستكشفة",
    bulk_ingest_btn: "استيراد ومعالجة الكتب المحددة ({count} كتاب)",
    manual_ingest: "أداة الاستيراد اليدوي المباشر",
    file_upload_or_url: "رابط كتاب PDF المباشر",
    direct_ingest_btn: "بدء استيراد ومعالجة الكتاب فوراً",
    telemetry_console: "مراقب عمليات الاستيراد غير المتزامنة (Cloud Run)",
    refresh_jobs: "تحديث قائمة المهام",
    active_executing: "قيد المعالجة حالياً",
    queue_empty: "قائمة مهام الاستيراد فارغة وجاهزة",
    term_job_btn: "إنهاء وإلغاء هذه المهمة",
    logs_terminal: "سجل عمليات النظام الحية (System Logs)",
    all_books_count: "إجمالي الكتب المفهرسة بقاعدة البيانات:"
  }
};

export interface TreeNode {
  key: string;
  name: string;
  type: "directory" | "file";
  children?: TreeNode[];
  bookId?: string;
  url?: string;
}

export function getAllBookIds(node: TreeNode): string[] {
  if (node.type === "file") {
    return node.bookId ? [node.bookId] : [];
  }
  const ids: string[] = [];
  if (node.children) {
    node.children.forEach(child => {
      ids.push(...getAllBookIds(child));
    });
  }
  return ids;
}

export function buildDirectoryTree(books: any[]): TreeNode[] {
  const rootNodes: TreeNode[] = [];

  books.forEach(book => {
    let urlStr = book.url || "";
    let hostname = "";
    let paths: string[] = [];

    try {
      if (urlStr) {
        if (!/^https?:\/\//i.test(urlStr)) {
          urlStr = "https://" + urlStr;
        }
        const parsedUrl = new URL(urlStr);
        hostname = parsedUrl.hostname;
        paths = parsedUrl.pathname.split("/").filter(Boolean);
      }
    } catch (e) {
      hostname = "unknown-source";
      paths = [urlStr.replace(/[^a-zA-Z0-9]/g, "_")].filter(Boolean);
    }

    if (!hostname) {
      hostname = "unknown-source";
    }

    let currentChildren = rootNodes;
    let currentPathKey = "dir:" + hostname;

    let hostnameNode = currentChildren.find(n => n.name === hostname && n.type === "directory");
    if (!hostnameNode) {
      hostnameNode = {
        key: currentPathKey,
        name: hostname,
        type: "directory",
        children: []
      };
      currentChildren.push(hostnameNode);
    }
    currentChildren = hostnameNode.children!;

    for (let i = 0; i < paths.length; i++) {
      const part = paths[i];
      currentPathKey += "/" + part;
      let node = currentChildren.find(n => n.name === part && n.type === "directory");
      if (!node) {
        node = {
          key: currentPathKey,
          name: part,
          type: "directory",
          children: []
        };
        currentChildren.push(node);
      }
      currentChildren = node.children!;
    }

    currentChildren.push({
      key: book.id,
      name: book.title,
      type: "file",
      bookId: book.id,
      url: book.url
    });
  });

  return rootNodes;
}

export interface DirectoryNodeProps {
  node: TreeNode;
  selectedDiscovered: Record<string, boolean>;
  crawlExpandedNodes: Record<string, boolean>;
  onToggleNode: (node: TreeNode, checked: boolean) => void;
  onToggleExpand: (key: string) => void;
  isAr: boolean;
}

export function DirectoryNode({
  node,
  selectedDiscovered,
  crawlExpandedNodes,
  onToggleNode,
  onToggleExpand,
  isAr
}: DirectoryNodeProps) {
  const isExpanded = !!crawlExpandedNodes[node.key];
  const isDir = node.type === "directory";

  const childIds = getAllBookIds(node);
  const checkedCount = childIds.filter(id => !!selectedDiscovered[id]).length;
  const isChecked = checkedCount === childIds.length && childIds.length > 0;
  const isIndeterminate = checkedCount > 0 && checkedCount < childIds.length;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onToggleNode(node, e.target.checked);
  };

  return (
    <div className="directory-branch" style={{ paddingInlineStart: "4px" }}>
      <div 
        className="tree-row-folder" 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          padding: "0.25rem 0.5rem",
          minHeight: "32px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
          {isDir ? (
            <button
              type="button"
              onClick={() => onToggleExpand(node.key)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                transform: isExpanded ? "rotate(0deg)" : (isAr ? "rotate(90deg)" : "rotate(-90deg)"),
                transition: "transform 0.2s ease",
                color: "#475569"
              }}
            >
              <FiChevronDown size={14} />
            </button>
          ) : (
            <div style={{ width: "18px" }} />
          )}

          <input
            type="checkbox"
            checked={isChecked}
            ref={el => {
              if (el) {
                el.indeterminate = isIndeterminate;
              }
            }}
            onChange={handleCheckboxChange}
            className="styled-checkbox"
            style={{ cursor: "pointer", flexShrink: 0 }}
          />

          <span style={{ color: isDir ? "#3b82f6" : "#10b981", display: "flex", alignItems: "center", flexShrink: 0 }}>
            {isDir ? <FiFolder size={16} /> : <FiBookOpen size={16} />}
          </span>

          <span 
            onClick={() => isDir ? onToggleExpand(node.key) : null}
            style={{ 
              fontSize: "0.85rem", 
              fontWeight: isDir ? "600" : "400",
              color: "#1e293b",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
              cursor: isDir ? "pointer" : "default",
              userSelect: "none"
            }}
            title={node.name}
          >
            {node.name}
          </span>
        </div>

        {!isDir && node.url && (
          <span 
            style={{ 
              fontSize: "0.72rem", 
              color: "#64748b", 
              maxWidth: "200px", 
              overflow: "hidden", 
              textOverflow: "ellipsis", 
              whiteSpace: "nowrap",
              marginInlineStart: "8px"
            }}
            title={node.url}
          >
            {node.url}
          </span>
        )}
      </div>

      {isDir && isExpanded && node.children && node.children.length > 0 && (
        <div className="directory-children" style={{ marginInlineStart: "12px" }}>
          {node.children.map(child => (
            <DirectoryNode
              key={child.key}
              node={child}
              selectedDiscovered={selectedDiscovered}
              crawlExpandedNodes={crawlExpandedNodes}
              onToggleNode={onToggleNode}
              onToggleExpand={onToggleExpand}
              isAr={isAr}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CurriculumIngestionStudio({ language }: { language: string; email?: string }) {
  const isAr = language === "ar";
  const t = (key: string, variables?: Record<string, string | number>) => {
    let text = translations[language]?.[key] || translations["en"]?.[key] || key;
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const [activeTab, setActiveTab] = useState<"libraries" | "curricula_builder" | "ingest_console">("libraries");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Core collections
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [books, setBooks] = useState<Book[]>([]);

  // Selection states
  const [selectedLibId, setSelectedLibId] = useState<string>("");
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // Form states - Library
  const [libForm, setLibForm] = useState<Partial<Library>>({
    _id: "",
    name: "",
    name_ar: "",
    source: "moe",
    logo: "",
    scopeSchema: []
  });
  const [isEditingLib, setIsEditingLib] = useState(false);

  // Form states - Curriculum
  const [curForm, setCurForm] = useState<{
    _id: string;
    title: string;
    title_ar: string;
    scope: Record<string, string>;
  }>({
    _id: "",
    title: "",
    title_ar: "",
    scope: {}
  });
  const [isEditingCur, setIsEditingCur] = useState(false);

  // Form states - Subject
  const [subjForm, setSubjForm] = useState<Partial<Subject>>({
    name: "",
    name_ar: "",
    color: "#4F46E5",
    emoji: "📚",
    category: "Science"
  });
  const [editingSubjId, setEditingSubjectId] = useState<string | null>(null);

  // Form states - Book Assignment
  const [assignBookId, setAssignBookId] = useState("");
  const [assignSubjId, setAssignSubjectId] = useState("");
  const [assignRole, setAssignRole] = useState<"core" | "supporting">("core");

  // Web Crawler & Ingest states
  const [crawlUrl, setCrawlUrl] = useState("https://openstax.org");
  const [crawlMaxDepth, setCrawlMaxDepth] = useState(3);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [crawlLogs, setCrawlLogs] = useState<string[]>([]);
  const [discoveredBooks, setDiscoveredResources] = useState<any[]>([]);
  const [selectedDiscovered, setSelectedDiscovered] = useState<Record<string, boolean>>({});

  // New Crawl History States
  const [pastCrawls, setPastCrawls] = useState<any[]>([]);
  const [selectedCrawlId, setSelectedCrawlId] = useState<string | null>(null);
  const crawlIntervalRef = useRef<any>(null);

  // Manual Ingest Form
  const [manualIngestForm, setManualIngestForm] = useState({
    title: "",
    title_ar: "",
    source_url: "",
    language: "ar",
    role: "core" as "core" | "supporting"
  });

  // Telemetry Queue state
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[SYSTEM] Ingestion Studio Queue initialized.",
    "[INFO] Cloud Run Async Executor listening on secure gcp-vpc router.",
    "[DEBUG] Shared lock system active on MongoDB Atlas primary database."
  ]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Tree Explorer, Emoji Picker, Delete Confirm & Pending states
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "lib_lib_moe": true // Expand first library by default if desired
  });
  const [crawlExpandedNodes, setCrawlExpandedNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (discoveredBooks && discoveredBooks.length > 0) {
      const tree = buildDirectoryTree(discoveredBooks);
      setCrawlExpandedNodes(prev => {
        const initialExpanded = { ...prev };
        tree.forEach(node => {
          if (node.type === "directory") {
            initialExpanded[node.key] = true;
          }
        });
        return initialExpanded;
      });
    }
  }, [discoveredBooks]);

  const [showDeleteSubjectConfirm, setShowDeleteSubjectConfirm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [isCreatingCurUnderLib, setIsCreatingCurUnderLib] = useState<string | null>(null);
  const [isCreatingSubjUnderCur, setIsCreatingSubjUnderCur] = useState<string | null>(null);

  // Onboarding loads
  useEffect(() => {
    fetchLibraries();
    fetchBooks();
    fetchQueueJobs();
    fetchPastCrawls();
    const interval = setInterval(fetchQueueJobs, 10000);
    return () => {
      clearInterval(interval);
      if (crawlIntervalRef.current) {
        clearInterval(crawlIntervalRef.current);
      }
    };
  }, []);

  const fetchPastCrawls = async () => {
    try {
      const res = await authedFetch("/api/admin/crawl");
      const data = await res.json();
      if (data.jobs && data.jobs.length > 0) {
        setPastCrawls(data.jobs);
      } else {
        setPastCrawls([]);
      }
    } catch (err) {
      console.error("Failed to fetch past crawls", err);
    }
  };

  const startCrawlPolling = (jobId: string) => {
    if (crawlIntervalRef.current) {
      clearInterval(crawlIntervalRef.current);
    }
    setIsCrawling(true);
    setSelectedCrawlId(jobId);
    
    const interval = setInterval(async () => {
      try {
        const pollRes = await authedFetch(`/api/admin/crawl?jobId=${jobId}`);
        if (!pollRes.ok) return;
        const poll = await pollRes.json();
        if (poll.success) {
          if (poll.logs) setCrawlLogs(poll.logs);
          if (typeof poll.progress === "number") setCrawlProgress(poll.progress);
          if (poll.discovered) setDiscoveredResources(poll.discovered);

          if (poll.status === "completed" || poll.status === "success") {
            clearInterval(interval);
            crawlIntervalRef.current = null;
            setIsCrawling(false);
            setCrawlProgress(100);
            addTerminalLog(`[CRAWLER] Completed! Discovered ${poll.discovered?.length || 0} valid assets.`);
            fetchPastCrawls();
          } else if (poll.status === "failed" || poll.status === "killed" || poll.status === "stopped") {
            clearInterval(interval);
            crawlIntervalRef.current = null;
            setIsCrawling(false);
            addTerminalLog(`[CRAWLER] Async web exploration job reported ${poll.status} status.`);
            fetchPastCrawls();
          } else if (poll.status === "paused") {
            clearInterval(interval);
            crawlIntervalRef.current = null;
            setIsCrawling(false);
            addTerminalLog(`[CRAWLER] Async web exploration job was paused.`);
            fetchPastCrawls();
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 1500);

    crawlIntervalRef.current = interval;
  };

  const handleSelectPastCrawl = (job: any) => {
    setSelectedCrawlId(job._id);
    setCrawlUrl(job.url);
    setCrawlMaxDepth(job.maxDepth || 3);
    setCrawlLogs(job.logs || []);
    setCrawlProgress(job.progress || 0);
    setDiscoveredResources(job.discovered || []);
    setSelectedDiscovered({});
    addTerminalLog(`[CRAWLER] Loaded historical crawl job: ${job._id} with ${job.discovered?.length || 0} assets.`);
    
    if (job.status === "harvesting") {
      startCrawlPolling(job._id);
    } else {
      if (crawlIntervalRef.current) {
        clearInterval(crawlIntervalRef.current);
        crawlIntervalRef.current = null;
      }
      setIsCrawling(false);
    }
  };

  // Auto-resume incomplete crawls
  useEffect(() => {
    const incompleteJob = pastCrawls.find(job => job.status === "harvesting");
    if (incompleteJob && !isCrawling && !crawlIntervalRef.current) {
      addTerminalLog(`[CRAWLER] Auto-resuming monitoring for active crawl job: ${incompleteJob._id}`);
      setCrawlUrl(incompleteJob.url);
      setCrawlMaxDepth(incompleteJob.maxDepth || 3);
      setCrawlLogs(incompleteJob.logs || []);
      setCrawlProgress(incompleteJob.progress || 0);
      setDiscoveredResources(incompleteJob.discovered || []);
      startCrawlPolling(incompleteJob._id);
    }
  }, [pastCrawls]);

  useEffect(() => {
    if (selectedLibId) {
      fetchCurricula(selectedLibId);
      // Reset curriculum selection
      setSelectedCurriculumId("");
      setSubjects([]);
    }
  }, [selectedLibId]);

  useEffect(() => {
    if (selectedCurriculumId) {
      fetchSubjects(selectedCurriculumId);
    } else {
      setSubjects([]);
    }
  }, [selectedCurriculumId]);

  // Loaders
  const fetchLibraries = async () => {
    try {
      const res = await authedFetch("/api/libraries");
      const data = await res.json();
      if (data.libraries) {
        setLibraries(data.libraries);
        if (data.libraries.length > 0 && !selectedLibId) {
          setSelectedLibId(data.libraries[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch libraries", err);
    }
  };

  const fetchCurricula = async (libId: string) => {
    try {
      const res = await authedFetch(`/api/curricula?library_id=${encodeURIComponent(libId)}`);
      const data = await res.json();
      if (data.curricula) {
        setCurricula(data.curricula);
      }
    } catch (err) {
      console.error("Failed to fetch curricula", err);
    }
  };

  const fetchSubjects = async (curriculumId: string) => {
    try {
      const res = await authedFetch(`/api/subjects?curriculum_id=${encodeURIComponent(curriculumId)}`);
      const data = await res.json();
      if (data.subjects) {
        setSubjects(data.subjects);
      }
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await authedFetch("/api/books");
      const data = await res.json();
      if (data.books) {
        setBooks(data.books);
      }
    } catch (err) {
      console.error("Failed to fetch books", err);
    }
  };

  const fetchQueueJobs = async () => {
    try {
      const res = await authedFetch("/api/books/jobs");
      const data = await res.json();
      if (data.jobs) {
        setQueue(data.jobs);
      }
    } catch (err) {
      console.error("Failed to fetch queue jobs", err);
    }
  };

  // Toast Helpers
  const triggerToast = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 6000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const addTerminalLog = (line: string) => {
    const t = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [`[${t}] ${line}`, ...prev.slice(0, 49)]);
  };

  // Actions: Library
  const handleSaveLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libForm._id || !libForm.name || !libForm.name_ar || !libForm.source) {
      triggerToast("Missing library primary fields", true);
      return;
    }
    setLoading(true);
    try {
      const res = await authedFetch("/api/libraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(libForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(isAr ? "🏛️ تم حفظ المكتبة وتحديث البنية!" : "🏛️ Library saved and structure synced!");
        fetchLibraries();
        setLibForm({ _id: "", name: "", name_ar: "", source: "moe", logo: "", scopeSchema: [] });
        setIsEditingLib(false);
      } else {
        triggerToast(data.error || "Failed to save library", true);
      }
    } catch (err: any) {
      triggerToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddScopeDimension = () => {
    setLibForm(prev => ({
      ...prev,
      scopeSchema: [
        ...(prev.scopeSchema || []),
        { key: "", label: "", label_ar: "", type: "enum", options: [] }
      ]
    }));
  };

  const handleRemoveScopeDimension = (idx: number) => {
    setLibForm(prev => ({
      ...prev,
      scopeSchema: (prev.scopeSchema || []).filter((_, i) => i !== idx)
    }));
  };

  const handleUpdateDimension = (idx: number, field: string, value: any) => {
    setLibForm(prev => {
      const schema = [...(prev.scopeSchema || [])];
      schema[idx] = { ...schema[idx], [field]: value };
      return { ...prev, scopeSchema: schema };
    });
  };

  // Actions: Curriculum
  const handleSaveCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curForm.title || !curForm.title_ar || !selectedLibId) {
      triggerToast("Missing curriculum primary details", true);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...curForm,
        library_id: selectedLibId,
        visibility: "public"
      };
      const isEdit = !!selectedCurriculumId;
      const url = isEdit ? `/api/curricula/${selectedCurriculumId}` : "/api/curricula";
      const method = isEdit ? "PATCH" : "POST";
      const res = await authedFetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(isAr ? "📐 تم حفظ المنهج التعليمي بنجاح!" : "📐 Curriculum unit saved successfully!");
        fetchCurricula(selectedLibId);
        setCurForm({ _id: "", title: "", title_ar: "", scope: {} });
        setIsEditingCur(false);
        setIsCreatingCurUnderLib(null);
        setSelectedCurriculumId("");
      } else {
        triggerToast(data.error || "Failed to save curriculum", true);
      }
    } catch (err: any) {
      triggerToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLibrary = async () => {
    if (!libForm._id) return;
    if (!confirm(isAr 
      ? `هل أنت متأكد من حذف هذه المكتبة (${libForm.name})؟ سيتم فصل الكتب التابعة لها ولكن لن يتم حذف ملفاتها.` 
      : `Are you sure you want to delete this library (${libForm.name})? Associated books will be decoupled gracefully, but their textbook source files will NOT be deleted.`
    )) {
      return;
    }
    setLoading(true);
    try {
      const res = await authedFetch(`/api/libraries?id=${libForm._id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(isAr ? "🗑️ تم حذف المكتبة وفصل الكتب بنجاح!" : "🗑️ Library deleted and books decoupled gracefully!");
        fetchLibraries();
        setLibForm({ _id: "", name: "", name_ar: "", source: "moe", logo: "", scopeSchema: [] });
        setIsEditingLib(false);
        setSelectedLibId("");
        setSelectedCurriculumId("");
        setSelectedSubjectId("");
      } else {
        triggerToast(data.error || "Failed to delete library", true);
      }
    } catch (err: any) {
      triggerToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCurriculum = async () => {
    if (!selectedCurriculumId) return;
    if (!confirm(isAr 
      ? `هل أنت متأكد من حذف هذا المنهج؟ سيتم حذف المواد وفصل الكتب التابعة لها ولكن لن يتم حذف ملفاتها.` 
      : `Are you sure you want to delete this curriculum? Associated subjects will be deleted and books decoupled gracefully, but their textbook source files will NOT be deleted.`
    )) {
      return;
    }
    setLoading(true);
    try {
      const res = await authedFetch(`/api/curricula/${selectedCurriculumId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(isAr ? "🗑️ تم حذف المنهج بنجاح!" : "🗑️ Curriculum deleted successfully!");
        fetchCurricula(selectedLibId);
        setCurForm({ _id: "", title: "", title_ar: "", scope: {} });
        setIsEditingCur(false);
        setIsCreatingCurUnderLib(null);
        setSelectedCurriculumId("");
        setSelectedSubjectId("");
      } else {
        triggerToast(data.error || "Failed to delete curriculum", true);
      }
    } catch (err: any) {
      triggerToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Actions: Subject
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjForm.name || !subjForm.name_ar || !selectedCurriculumId) {
      triggerToast("Missing subject primary specifications", true);
      return;
    }
    setLoading(true);
    try {
      const isEdit = !!editingSubjId;
      const payload = isEdit 
        ? { ...subjForm, id: editingSubjId, curriculum_id: selectedCurriculumId }
        : { ...subjForm, curriculum_id: selectedCurriculumId };
        
      const res = await authedFetch("/api/subjects", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(isAr ? "🎨 تم حفظ المادة بنجاح!" : "🎨 Subject details and theme color saved!");
        fetchSubjects(selectedCurriculumId);
        setSubjForm({ name: "", name_ar: "", color: "#4F46E5", emoji: "📚", category: "Science" });
        setEditingSubjectId(null);
        setIsCreatingSubjUnderCur(null);
        setSelectedSubjectId("");
      } else {
        triggerToast(data.error || "Failed to save subject", true);
      }
    } catch (err: any) {
      triggerToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Actions: Assign Book
  const handleAssignBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSubjId = assignSubjId || selectedSubjectId;
    if (!assignBookId || !targetSubjId || !selectedCurriculumId) {
      triggerToast("Please select a book, target subject, and active curriculum", true);
      return;
    }
    setLoading(true);
    try {
      const res = await authedFetch(`/api/books/${assignBookId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curriculum_id: selectedCurriculumId,
          subject_id: targetSubjId,
          role: assignRole
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(isAr ? "📚 تم ربط وتخصيص الكتاب بنجاح!" : "📚 Textbook assigned to curriculum subject successfully!");
        fetchBooks();
        fetchSubjects(selectedCurriculumId);
        setAssignBookId("");
      } else {
        triggerToast(data.error || "Failed to assign book", true);
      }
    } catch (err: any) {
      triggerToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Actions: Crawling & Ingesting
  const handleStartCrawling = async () => {
    if (!crawlUrl) return;
    setIsCrawling(true);
    setCrawlProgress(5);
    setCrawlLogs([`[INIT] Launching autonomous exploration on ${crawlUrl}...`]);
    setDiscoveredResources([]);
    setSelectedDiscovered({});
    addTerminalLog(`[CRAWLER] Web spider launched on GCP Cloud Run targeting ${crawlUrl}...`);

    try {
      const res = await authedFetch("/api/admin/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: crawlUrl,
          maxDepth: crawlMaxDepth
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setIsCrawling(false);
        addTerminalLog(`[CRAWLER ERROR] ${data.error || "Failed to launch crawl task"}`);
        return;
      }

      const jobId = data.jobId;
      addTerminalLog(`[CRAWLER] Exploration job created: ${jobId}. Attaching real-time listener...`);
      startCrawlPolling(jobId);

    } catch (err: any) {
      setIsCrawling(false);
      addTerminalLog(`[CRAWLER FAULT] ${err.message}`);
    }
  };

  const handleControlCrawlJob = async (jobId: string, action: "pause" | "resume" | "stop" | "kill") => {
    try {
      addTerminalLog(`[CRAWLER] Sending command ${action.toUpperCase()} to job ${jobId}...`);
      const res = await authedFetch("/api/admin/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action })
      });
      const data = await res.json();
      if (res.ok) {
        let msg = "";
        if (action === "pause") {
          msg = isAr ? "⏸️ تم إيقاف الزحف مؤقتاً!" : "⏸️ Web crawling job paused cooperatively!";
          addTerminalLog(`[CRAWLER] Job paused: ${jobId}`);
        } else if (action === "resume") {
          msg = isAr ? "▶️ تم استئناف الزحف بنجاح!" : "▶️ Web crawling job resumed successfully!";
          addTerminalLog(`[CRAWLER] Job resumed: ${jobId}`);
          startCrawlPolling(jobId);
        } else if (action === "stop") {
          msg = isAr ? "⏹️ تم إيقاف الزحف!" : "⏹️ Web crawling job stopped cooperatively!";
          addTerminalLog(`[CRAWLER] Job stopped: ${jobId}`);
        } else {
          msg = isAr ? "🛑 تم إنهاء عملية الزحف!" : "🛑 Web crawling job force-terminated!";
          addTerminalLog(`[CRAWLER] Job killed: ${jobId}`);
        }
        triggerToast(msg);
        fetchPastCrawls();
      } else {
        triggerToast(data.error || "Failed to control crawler", true);
        addTerminalLog(`[CRAWLER ERROR] Control action ${action} failed: ${data.error}`);
      }
    } catch (err: any) {
      triggerToast(err.message, true);
      addTerminalLog(`[CRAWLER FAULT] Control action ${action} faulted: ${err.message}`);
    }
  };

  const handleToggleNode = (node: TreeNode, checked: boolean) => {
    const ids = getAllBookIds(node);
    setSelectedDiscovered(prev => {
      const updated = { ...prev };
      ids.forEach(id => {
        updated[id] = checked;
      });
      return updated;
    });
  };

  const toggleCrawlExpand = (key: string) => {
    setCrawlExpandedNodes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleBulkIngest = async () => {
    const selectedList = discoveredBooks.filter(b => selectedDiscovered[b.id]);
    if (selectedList.length === 0) {
      triggerToast("No discovered books selected", true);
      return;
    }
    if (!selectedCurriculumId || !selectedSubjectId) {
      triggerToast("Please pick a target Curriculum and Subject in the header above", true);
      return;
    }

    addTerminalLog(`[CRAWLER] Initiating bulk ingestion for ${selectedList.length} assets...`);
    setLoading(true);

    let successCount = 0;
    for (const item of selectedList) {
      try {
        const res = await authedFetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject_id: selectedSubjectId,
            curriculum_id: selectedCurriculumId,
            library_id: selectedLibId,
            role: "core",
            title: item.title,
            title_ar: item.titleAr || item.title,
            source_url: item.url,
            language: item.language || "en",
            book_type: "core"
          })
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error(err);
      }
    }

    triggerToast(t("import_bulk_success", { importedCount: successCount, skippedCount: selectedList.length - successCount }));
    fetchBooks();
    fetchQueueJobs();
    setLoading(false);
  };

  const handleDirectIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIngestForm.title || !manualIngestForm.source_url) {
      triggerToast("Please enter a Title and PDF source URL", true);
      return;
    }
    if (!selectedCurriculumId || !selectedSubjectId) {
      triggerToast("Please pick a target Curriculum and Subject destination", true);
      return;
    }

    setLoading(true);
    addTerminalLog(`[MANUAL INGEST] Launching single textbook parsing for: "${manualIngestForm.title}"`);

    try {
      const res = await authedFetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: selectedSubjectId,
          curriculum_id: selectedCurriculumId,
          library_id: selectedLibId,
          role: manualIngestForm.role,
          title: manualIngestForm.title,
          title_ar: manualIngestForm.title_ar || manualIngestForm.title,
          source_url: manualIngestForm.source_url,
          language: manualIngestForm.language,
          book_type: manualIngestForm.role
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast(isAr ? "📚 تم بدء استيراد ومعالجة الكتاب بنجاح!" : "📚 Textbook manual ingestion queued successfully!");
        setManualIngestForm({ title: "", title_ar: "", source_url: "", language: "ar", role: "core" });
        fetchBooks();
        fetchQueueJobs();
      } else {
        triggerToast(data.error || "Ingestion failed to start", true);
      }
    } catch (err: any) {
      triggerToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateJob = async (id: string) => {
    try {
      const res = await authedFetch(`/api/books/cancel?bookId=${id}`, { method: "POST" });
      if (res.ok) {
        triggerToast(isAr ? "🛑 تم إلغاء المهمة بنجاح!" : "🛑 Ingestion job terminated!");
        fetchQueueJobs();
      } else {
        triggerToast("Failed to terminate job", true);
      }
    } catch (err: any) {
      triggerToast(err.message, true);
    }
  };

  const handleControlJob = async (bookId: string, jobId: string, action: "pause" | "resume" | "kill") => {
    try {
      const res = await authedFetch('/api/books/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bookId, jobId, action })
      });
      const data = await res.json();
      if (res.ok) {
        let msg = "";
        if (action === "pause") {
          msg = isAr ? "⏸️ تم إيقاف المهمة مؤقتاً!" : "⏸️ Ingestion job paused cooperatively!";
        } else if (action === "resume") {
          msg = isAr ? "▶️ تم استئناف المهمة بنجاح!" : "▶️ Ingestion job resumed successfully!";
        } else {
          msg = isAr ? "🛑 تم إنهاء المهمة بنجاح!" : "🛑 Ingestion job force terminated!";
        }
        triggerToast(msg);
        fetchQueueJobs();
      } else {
        triggerToast(data.error || "Failed to control job", true);
      }
    } catch (err: any) {
      triggerToast(err.message, true);
    }
  };

  const activeLibrary = libraries.find(l => l._id === selectedLibId);
  const activeCrawlJob = pastCrawls.find(j => j._id === selectedCrawlId);
  const crawlStatus = activeCrawlJob ? activeCrawlJob.status : (isCrawling ? "harvesting" : "idle");

  return (
    <div className="studio-container" style={{ direction: isAr ? "rtl" : "ltr" }}>
      <style>{`
        /* Dark mode overrides for Ingestion Studio */
        html.dark .form-card, 
        html.dark .list-card, 
        html.dark .column-container, 
        html.dark .crawler-card, 
        html.dark .manual-ingest-card {
          background: rgba(17, 24, 39, 0.65) !important;
          border-color: rgba(51, 65, 85, 0.35) !important;
        }
        html.dark .tab-btn:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }
        html.dark .tab-btn.active-tab {
          background: #111827 !important;
          color: var(--primary) !important;
          box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.25) !important;
        }
        html.dark .styled-input, 
        html.dark .styled-select {
          background: #1f2937 !important;
          border-color: #374151 !important;
          color: #f3f4f6 !important;
        }
        html.dark .styled-input::placeholder {
          color: #6b7280 !important;
        }
        html.dark .stats-badge {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05)) !important;
          border-color: rgba(59, 130, 246, 0.3) !important;
        }
        html.dark .step-circle {
          background: #1f2937 !important;
          border-color: #374151 !important;
          color: #9ca3af !important;
        }
        html.dark .step-circle.completed {
          background: var(--accent-green) !important;
          border-color: var(--accent-green) !important;
          color: #ffffff !important;
        }
        html.dark .step-circle.active {
          background: var(--primary) !important;
          border-color: var(--primary) !important;
          color: #ffffff !important;
        }
        
        /* Studio Form Responsiveness & Layout Improvements */
        @media (max-width: 768px) {
          .studio-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 1rem;
          }
          .studio-tabs {
            width: 100%;
            overflow-x: auto;
            white-space: nowrap;
            -webkit-overflow-scrolling: touch;
          }
          .tab-btn {
            flex: 1;
            text-align: center;
          }
          .tab-grid.grid-2 {
            grid-template-columns: 1fr !important;
          }
          .form-card, .list-card, .column-container, .crawler-card, .manual-ingest-card {
            padding: 1.25rem !important;
          }
        }
      `}</style>
      {/* Toast feedback notifications */}
      {successMsg && <div className="toast success-toast"><FiCheckCircle /> {successMsg}</div>}
      {errorMsg && <div className="toast error-toast"><FiAlertCircle /> {errorMsg}</div>}

      <header className="studio-header">
        <div className="header-meta">
          <FiCpu className="header-icon pulse-animation" />
          <div>
            <h1>{t("title")}</h1>
            <p className="subtitle">{t("subtitle")}</p>
          </div>
        </div>
        <div className="stats-badge">
          <span>{t("all_books_count")} <strong>{books.length}</strong></span>
        </div>
      </header>

      {/* Tabs */}
      <nav className="studio-tabs">
        <button
          onClick={() => setActiveTab("libraries")}
          className={`tab-btn ${activeTab === "libraries" ? "active-tab" : ""}`}
        >
          {t("tab_libraries")}
        </button>
        <button
          onClick={() => setActiveTab("curricula_builder")}
          className={`tab-btn ${activeTab === "curricula_builder" ? "active-tab" : ""}`}
        >
          {t("tab_curricula")}
        </button>
        <button
          onClick={() => setActiveTab("ingest_console")}
          className={`tab-btn ${activeTab === "ingest_console" ? "active-tab" : ""}`}
        >
          {t("tab_ingest")}
        </button>
      </nav>

      {/* Tab Contents */}
      <main className="tab-contents">
        
        {/* TAB 1: Library Manager */}
        {activeTab === "libraries" && (
          <div className="tab-grid grid-2">
            <section className="form-card">
              <h2>{isEditingLib ? t("edit_library") : t("create_library")}</h2>
              <form onSubmit={handleSaveLibrary} className="standard-form">
                <div className="form-group">
                  <label>{t("lib_id")}</label>
                  <input
                    type="text"
                    disabled={isEditingLib}
                    value={libForm._id || ""}
                    onChange={e => setLibForm({ ...libForm, _id: e.target.value })}
                    placeholder={t("lib_id_placeholder")}
                    className="styled-input"
                  />
                </div>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>{t("lib_name_en")}</label>
                    <input
                      type="text"
                      value={libForm.name || ""}
                      onChange={e => setLibForm({ ...libForm, name: e.target.value })}
                      className="styled-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("lib_name_ar")}</label>
                    <input
                      type="text"
                      value={libForm.name_ar || ""}
                      onChange={e => setLibForm({ ...libForm, name_ar: e.target.value })}
                      className="styled-input"
                    />
                  </div>
                </div>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>{t("lib_source")}</label>
                    <select
                      value={libForm.source || "moe"}
                      onChange={e => setLibForm({ ...libForm, source: e.target.value })}
                      className="styled-select"
                    >
                      <option value="moe">Ministry of Education (moe)</option>
                      <option value="openstax">OpenStax</option>
                      <option value="private">Private Vault</option>
                      <option value="custom">Custom Provider</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t("lib_logo")}</label>
                    <input
                      type="text"
                      value={libForm.logo || ""}
                      onChange={e => setLibForm({ ...libForm, logo: e.target.value })}
                      placeholder="/libs/logo.svg"
                      className="styled-input"
                    />
                  </div>
                </div>

                <div className="scope-schema-section">
                  <div className="section-header">
                    <h3>{t("scope_schema")}</h3>
                    <button type="button" onClick={handleAddScopeDimension} className="icon-btn-text">
                      <FiPlus /> {t("add_dimension")}
                    </button>
                  </div>
                  
                  {(libForm.scopeSchema || []).map((dim, idx) => (
                    <div key={idx} className="dimension-row">
                      <input
                        type="text"
                        placeholder={t("dim_key")}
                        value={dim.key}
                        onChange={e => handleUpdateDimension(idx, "key", e.target.value)}
                        className="styled-input compact"
                      />
                      <input
                        type="text"
                        placeholder={t("dim_label_en")}
                        value={dim.label}
                        onChange={e => handleUpdateDimension(idx, "label", e.target.value)}
                        className="styled-input compact"
                      />
                      <input
                        type="text"
                        placeholder={t("dim_label_ar")}
                        value={dim.label_ar}
                        onChange={e => handleUpdateDimension(idx, "label_ar", e.target.value)}
                        className="styled-input compact"
                      />
                      <select
                        value={dim.type}
                        onChange={e => handleUpdateDimension(idx, "type", e.target.value)}
                        className="styled-select compact"
                      >
                        <option value="enum">Enum Dropdown</option>
                        <option value="string">Text Input</option>
                      </select>
                      {dim.type === "enum" && (
                        <input
                          type="text"
                          placeholder="Options (Val1, Val2)"
                          value={dim.options?.join(",") || ""}
                          onChange={e => handleUpdateDimension(idx, "options", e.target.value.split(",").map(o => o.trim()))}
                          className="styled-input compact full-width-span"
                        />
                      )}
                      <button type="button" onClick={() => handleRemoveScopeDimension(idx)} className="delete-btn">
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="form-actions-row">
                  <button type="submit" disabled={loading} className="primary-submit-btn" style={{ margin: 0 }}>
                    <FiSave /> {t("save_library")}
                  </button>
                  {isEditingLib && (
                    <button
                      type="button"
                      className="discard-btn"
                      style={{ backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#dc2626", border: "1px solid rgba(220, 38, 38, 0.2)", margin: 0 }}
                      onClick={handleDeleteLibrary}
                    >
                      <FiTrash2 /> {isAr ? "حذف المكتبة" : "Delete Library"}
                    </button>
                  )}
                  <button 
                    type="button" 
                    className="discard-btn"
                    style={{ margin: 0 }}
                    onClick={() => {
                      setLibForm({ _id: "", name: "", name_ar: "", source: "moe", logo: "", scopeSchema: [] });
                      setIsEditingLib(false);
                    }}
                  >
                    {isAr ? "إلغاء التغييرات" : "Discard"}
                  </button>
                </div>
              </form>
            </section>

            <section className="list-card">
              <h2>{t("library_list")}</h2>
              <div className="card-scroller">
                {libraries.length === 0 ? (
                  <p className="empty-state-text">{t("no_libraries")}</p>
                ) : (
                  libraries.map(lib => (
                    <div key={lib._id} className="item-row-card">
                      <div className="item-meta">
                        <img
                          src={lib.logo}
                          alt={lib.name}
                          className="lib-logo-thumbnail"
                          onError={e => {
                            const img = e.target as HTMLImageElement;
                            img.onerror = null;
                            img.src = "/libs/logo.svg";
                          }}
                        />
                        <div>
                          <h4>{isAr ? lib.name_ar : lib.name} <span className="badge-pill">{lib.source}</span></h4>
                          <small className="monospace-id">{lib._id}</small>
                          <div className="dimensions-summary-pills">
                            {lib.scopeSchema?.map(s => (
                              <span key={s.key} className="dim-pill">{isAr ? s.label_ar : s.label} ({s.key})</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setLibForm(lib);
                          setIsEditingLib(true);
                        }}
                        className="edit-circle-btn"
                      >
                        <FiEdit />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: Curriculum Builder */}
        {activeTab === "curricula_builder" && (
          <div className="curriculum-builder-layout">
            <div className="tree-dual-pane-layout">
              
              {/* TREE EXPLORER SIDEBAR */}
              <aside className="tree-explorer-sidebar">
                <div className="sidebar-header">
                  <h3>🌳 {isAr ? "مستكشف المناهج" : "Curriculum Explorer"}</h3>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                    {isAr ? "الهيكل الهرمي للمكتبات والمناهج والكتب" : "Hierarchical structure of libraries & textbooks"}
                  </p>
                </div>

                <div className="library-picker-panel" style={{ padding: "0.5rem", border: "none", background: "none" }}>
                  <select
                    value={selectedLibId}
                    onChange={e => {
                      setSelectedLibId(e.target.value);
                      setSelectedCurriculumId("");
                      setSelectedSubjectId("");
                      setIsCreatingCurUnderLib(null);
                      setIsCreatingSubjUnderCur(null);
                    }}
                    className="styled-select-large"
                    style={{ width: "100%" }}
                  >
                    <option value="">-- {isAr ? "اختر المكتبة" : "Select Library Domain"} --</option>
                    {libraries.map(lib => (
                      <option key={lib._id} value={lib._id}>{isAr ? lib.name_ar : lib.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="button" 
                  className="create-library-btn"
                  onClick={() => {
                    setLibForm({ _id: "", name: "", name_ar: "", source: "moe", logo: "", scopeSchema: [] });
                    setIsEditingLib(false);
                    setActiveTab("libraries");
                  }}
                >
                  <FiPlus /> {isAr ? "إضافة مكتبة جديدة" : "Add New Library"}
                </button>

                <div className="tree-scroller">
                  {libraries
                    .filter(lib => !selectedLibId || lib._id === selectedLibId)
                    .map(lib => {
                      const libExpanded = !!expandedNodes[`lib_${lib._id}`];
                      const libCurricula = curricula.filter(c => c.library_id === lib._id);
                      return (
                        <div key={lib._id} className="tree-branch">
                          <div 
                            className={`tree-row ${selectedLibId === lib._id && !selectedCurriculumId && !selectedSubjectId ? "active-row" : ""}`}
                            onClick={() => {
                              setSelectedLibId(lib._id);
                              setSelectedCurriculumId("");
                              setSelectedSubjectId("");
                              setIsEditingLib(true);
                              setLibForm(lib);
                              setIsCreatingCurUnderLib(null);
                              setIsCreatingSubjUnderCur(null);
                            }}
                          >
                            <span 
                              className="expand-toggle" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedNodes(prev => ({ ...prev, [`lib_${lib._id}`]: !prev[`lib_${lib._id}`] }));
                              }}
                            >
                              {libCurricula.length > 0 ? (libExpanded ? <FiChevronDown /> : <FiChevronDown style={{ transform: "rotate(-90deg)" }} />) : <span className="empty-spacer" />}
                            </span>
                            <img src={lib.logo || "/libs/logo.svg"} className="tree-lib-logo" alt="" onError={e => { (e.target as any).src = "/libs/logo.svg" }} />
                            <span className="tree-node-text" style={{ fontWeight: 700 }}>{isAr ? lib.name_ar : lib.name}</span>
                            <button 
                              type="button" 
                              className="tree-row-action" 
                              title={isAr ? "إضافة منهج" : "Add Curriculum"}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLibId(lib._id);
                                setSelectedCurriculumId("");
                                setSelectedSubjectId("");
                                setIsCreatingCurUnderLib(lib._id);
                                setIsCreatingSubjUnderCur(null);
                                setCurForm({ _id: "", title: "", title_ar: "", scope: {} });
                              }}
                            >
                              <FiPlus />
                            </button>
                          </div>

                          {libExpanded && (
                            <div className="tree-children">
                              {isCreatingCurUnderLib === lib._id && (
                                <div className="tree-row pending-creation">
                                  <FiPlus className="pending-icon spin-animation" />
                                  <span className="tree-node-text italic" style={{ opacity: 0.6 }}>{isAr ? "منهج جديد..." : "New Curriculum..."}</span>
                                </div>
                              )}
                              {libCurricula.map(cur => {
                                const curExpanded = !!expandedNodes[`cur_${cur._id}`];
                                const curSubjects = subjects.filter(s => s.curriculum_id === cur._id);
                                return (
                                  <div key={cur._id} className="tree-branch">
                                    <div 
                                      className={`tree-row ${selectedCurriculumId === cur._id && !selectedSubjectId ? "active-row" : ""}`}
                                      onClick={() => {
                                        setSelectedLibId(lib._id);
                                        setSelectedCurriculumId(cur._id);
                                        setSelectedSubjectId("");
                                        setIsEditingCur(true);
                                        setCurForm({ _id: cur._id, title: cur.title, title_ar: cur.title_ar, scope: cur.scope || {} });
                                        setIsCreatingCurUnderLib(null);
                                        setIsCreatingSubjUnderCur(null);
                                      }}
                                    >
                                      <span 
                                        className="expand-toggle" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedNodes(prev => ({ ...prev, [`cur_${cur._id}`]: !prev[`cur_${cur._id}`] }));
                                        }}
                                      >
                                        {curSubjects.length > 0 ? (curExpanded ? <FiChevronDown /> : <FiChevronDown style={{ transform: "rotate(-90deg)" }} />) : <span className="empty-spacer" />}
                                      </span>
                                      <FiLayers className="tree-node-icon" style={{ color: "#6366f1" }} />
                                      <span className="tree-node-text">{isAr ? cur.title_ar : cur.title}</span>
                                      <button 
                                        type="button" 
                                        className="tree-row-action" 
                                        title={isAr ? "إضافة مادة" : "Add Subject"}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedLibId(lib._id);
                                          setSelectedCurriculumId(cur._id);
                                          setSelectedSubjectId("");
                                          setIsCreatingSubjUnderCur(cur._id);
                                          setIsCreatingCurUnderLib(null);
                                          setSubjForm({ name: "", name_ar: "", color: "#4F46E5", emoji: "📚", category: "Science" });
                                          setEditingSubjectId(null);
                                        }}
                                      >
                                        <FiPlus />
                                      </button>
                                    </div>

                                    {curExpanded && (
                                      <div className="tree-children">
                                        {isCreatingSubjUnderCur === cur._id && (
                                          <div className="tree-row pending-creation">
                                            <FiPlus className="pending-icon spin-animation" />
                                            <span className="tree-node-text italic" style={{ opacity: 0.6 }}>{isAr ? "مادة جديدة..." : "New Subject..."}</span>
                                          </div>
                                        )}
                                        {curSubjects.map(subj => {
                                          const subjExpanded = !!expandedNodes[`subj_${subj._id}`];
                                                  setEditingSubjectId(subj._id);
                                                  setIsCreatingCurUnderLib(null);
                                                  setIsCreatingSubjUnderCur(null);
                                                }}
                                              >
                                                <span 
                                                  className="expand-toggle" 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedNodes(prev => ({ ...prev, [`subj_${subj._id}`]: !prev[`subj_${subj._id}`] }));
                                                  }}
                                                >
                                                  {subjBooks.length > 0 ? (subjExpanded ? <FiChevronDown /> : <FiChevronDown style={{ transform: "rotate(-90deg)" }} />) : <span className="empty-spacer" />}
                                                </span>
                                                <span className="tree-node-emoji">{subj.emoji}</span>
                                                <span className="tree-node-text">{isAr ? subj.name_ar : subj.name}</span>
                                              </div>

                                              {subjExpanded && (
                                                <div className="tree-children">
                                                  {subjBooks.map(book => (
                                                    <div key={book._id} className="tree-row tree-row-book">
                                                      <FiBookOpen className="tree-node-icon" style={{ color: "#10b981", flexShrink: 0 }} />
                                                      <div className="tree-node-book-meta" style={{ flexGrow: 1, minWidth: 0 }}>
                                                        <span className="tree-node-text-bold" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                          {isAr ? book.title_ar : book.title}
                                                        </span>
                                                        <span className="tree-node-subtext">
                                                          ({book.language}) - {book.role === "core" ? (isAr ? "أساسي" : "Core") : (isAr ? "داعم" : "Supporting")}
                                                        </span>
                                                      </div>
                                                      <button
                                                        type="button"
                                                        className="tree-row-action decouple-action"
                                                        title={isAr ? "فصل الكتاب" : "Decouple Book"}
                                                        onClick={async (e) => {
                                                          e.stopPropagation();
                                                          if (confirm(isAr ? `هل أنت متأكد من فصل "${book.title}"؟` : `Are you sure you want to decouple "${book.title}"?`)) {
                                                            setLoading(true);
                                                            try {
                                                              const res = await authedFetch(`/api/books/${book._id}/assign`, {
                                                                method: "PATCH",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ action: "decouple" })
                                                              });
                                                              if (res.ok) {
                                                                triggerToast(isAr ? "🔓 تم فصل الكتاب بنجاح!" : "🔓 Book decoupled successfully!");
                                                                fetchBooks();
                                                                fetchSubjects(cur._id);
                                                              } else {
                                                                triggerToast("Failed to decouple book", true);
                                                              }
                                                            } catch (err: any) {
                                                              triggerToast(err.message, true);
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                          }
                                                        }}
                                                      >
                                                        <FiTrash2 style={{ color: "#ef4444" }} />
                                                      </button>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </aside>

              {/* FOCUSED WORKSPACE EDITOR PANEL */}
              <main className="workspace-editor-panel">
                
                {/* 1. Subject Form / Create / Edit View */}
                {(selectedSubjectId || isCreatingSubjUnderCur) ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <section className="form-card" style={{ margin: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h2>
                          {editingSubjId ? `🎨 ${isAr ? "تعديل المادة" : "Edit Subject"}` : `🎨 ${isAr ? "مادة جديدة" : "Create Subject"}`}
                        </h2>
                        {editingSubjId && (
                          <button
                            type="button"
                            onClick={() => setShowDeleteSubjectConfirm(true)}
                            className="discard-btn"
                            style={{ backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#dc2626", border: "1px solid rgba(220, 38, 38, 0.2)" }}
                          >
                            <FiTrash2 /> {isAr ? "حذف المادة" : "Delete Subject"}
                          </button>
                        )}
                      </div>
                      
                      <form onSubmit={handleSaveSubject} className="standard-form">
                        <div className="form-group-row">
                          <div className="form-group">
                            <label>{t("subject_name_en")}</label>
                            <input
                              type="text"
                              value={subjForm.name || ""}
                              onChange={e => setSubjForm({ ...subjForm, name: e.target.value })}
                              className="styled-input"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>{t("subject_name_ar")}</label>
                            <input
                              type="text"
                              value={subjForm.name_ar || ""}
                              onChange={e => setSubjForm({ ...subjForm, name_ar: e.target.value })}
                              className="styled-input"
                              required
                            />
                          </div>
                        </div>

                        <div className="form-group-row">
                          <div className="form-group color-picker-group">
                            <label>{t("subject_color")}</label>
                            <div className="color-picker-input-wrapper">
                              <input
                                type="color"
                                value={subjForm.color || "#4F46E5"}
                                onChange={e => setSubjForm({ ...subjForm, color: e.target.value })}
                                className="styled-color-picker"
                              />
                              <input
                                type="text"
                                value={subjForm.color || ""}
                                onChange={e => setSubjForm({ ...subjForm, color: e.target.value })}
                                className="styled-input hex-code-input"
                              />
                            </div>
                          </div>

                          {/* Curated academic emoji picker popover (OR-14) */}
                          <div className="form-group" style={{ position: "relative" }} ref={emojiPickerRef}>
                            <label>{t("subject_emoji")}</label>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <input
                                type="text"
                                value={subjForm.emoji || "📚"}
                                onChange={e => setSubjForm({ ...subjForm, emoji: e.target.value })}
                                className="styled-input emoji-input"
                                style={{ width: "3.5rem", textAlign: "center", fontSize: "1.25rem", cursor: "pointer" }}
                                readOnly
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              />
                              <button
                                type="button"
                                className="styled-input"
                                style={{ padding: "0.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "white" }}
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              >
                                😀
                              </button>
                            </div>

                            {showEmojiPicker && (
                              <div 
                                className="academic-emoji-grid"
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  left: 0,
                                  zIndex: 100,
                                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                                  border: "1.5px solid var(--card-border)",
                                  borderRadius: "8px",
                                  padding: "0.5rem",
                                  display: "grid",
                                  gridTemplateColumns: "repeat(6, 1fr)",
                                  gap: "0.25rem",
                                  width: "220px",
                                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                                  backdropFilter: "blur(12px)"
                                }}
                              >
                                {["📚", "📖", "🎓", "🔬", "🧪", "🧮", "🎨", "💻", "🧠", "📐", "📏", "🧭", "🌍", "🪐", "🧬", "🦕", "🏛️", "🖋️", "📝", "📊", "📈", "🛹", "🎭", "🎼"].map(emo => (
                                  <div
                                    key={emo}
                                    onMouseDown={(e) => {
                                      e.preventDefault(); // Bypass focus blur events entirely!
                                      setSubjForm({ ...subjForm, emoji: emo });
                                      setShowEmojiPicker(false);
                                    }}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      padding: "0.4rem",
                                      borderRadius: "4px",
                                      fontSize: "1.25rem",
                                      cursor: "pointer",
                                      transition: "background-color 0.2s"
                                    }}
                                    className="emoji-grid-item"
                                  >
                                    {emo}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="form-group">
                          <label>{t("subject_category")}</label>
                          <select
                            value={subjForm.category || "Science"}
                            onChange={e => setSubjForm({ ...subjForm, category: e.target.value })}
                            className="styled-select"
                          >
                            <option value="Science">Science</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="Languages">Languages</option>
                            <option value="Social Studies">Social Studies</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Business">Business</option>
                          </select>
                        </div>

                        {/* Universal side-by-side Save and Discard (OR-13) */}
                        <div className="form-actions-row">
                          <button type="submit" disabled={loading} className="primary-submit-btn" style={{ margin: 0 }}>
                            <FiSave /> {t("save_subject")}
                          </button>
                          <button 
                            type="button" 
                            className="discard-btn"
                            onClick={() => {
                              setSubjForm({ name: "", name_ar: "", color: "#4F46E5", emoji: "📚", category: "Science" });
                              setEditingSubjectId(null);
                              setIsCreatingSubjUnderCur(null);
                              setSelectedSubjectId("");
                            }}
                          >
                            {isAr ? "إلغاء التغييرات" : "Discard"}
                          </button>
                        </div>
                      </form>
                    </section>

                    {/* Book Assignments in Subject workspace (OR-11) */}
                    {selectedSubjectId && (
                      <div className="tab-grid grid-2" style={{ gap: "1.5rem" }}>
                        <section className="form-card" style={{ margin: 0, padding: "1.5rem" }}>
                          <h3>🔗 {t("assign_book")}</h3>
                          <form onSubmit={handleAssignBook} className="standard-form" style={{ marginTop: "1rem" }}>
                            <div className="form-group">
                              <label>{t("select_book")}</label>
                              <select
                                value={assignBookId}
                                onChange={e => setAssignBookId(e.target.value)}
                                className="styled-select"
                                required
                              >
                                <option value="">-- Choose Book from Pool --</option>
                                {books
                                  .filter(b => b.subject_id !== selectedSubjectId)
                                  .map(b => (
                                    <option key={b._id} value={b._id}>
                                      {isAr ? b.title_ar : b.title} ({b.language})
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div className="form-group">
                              <label>{t("book_role")}</label>
                              <select
                                value={assignRole}
                                onChange={e => setAssignRole(e.target.value as "core" | "supporting")}
                                className="styled-select"
                              >
                                <option value="core">{t("role_core")}</option>
                                <option value="supporting">{t("role_supporting")}</option>
                              </select>
                            </div>

                            <button type="submit" disabled={loading} className="primary-submit-btn highlight-gold" style={{ margin: 0, width: "100%" }}>
                              <FiLink /> {t("assign_btn")}
                            </button>
                          </form>
                        </section>

                        <section className="list-card" style={{ margin: 0, padding: "1.5rem" }}>
                          <h3>📚 {t("assigned_books")}</h3>
                          <div className="list-scroller-compact" style={{ maxHeight: "250px", marginTop: "1rem" }}>
                            {books.filter(b => b.subject_id === selectedSubjectId).length === 0 ? (
                              <p className="empty-state-text" style={{ fontSize: "0.85rem" }}>No books assigned to this subject yet.</p>
                            ) : (
                              books
                                .filter(b => b.subject_id === selectedSubjectId)
                                .map(b => (
                                  <div key={b._id} className="item-row-card" style={{ padding: "0.5rem 0.75rem", marginBottom: "0.5rem" }}>
                                    <div className="item-meta">
                                      <FiBookOpen style={{ color: subjForm.color || "#4F46E5", flexShrink: 0 }} />
                                      <div style={{ minWidth: 0 }}>
                                        <h5 style={{ margin: 0, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {isAr ? b.title_ar : b.title}
                                        </h5>
                                        <small className="badge-role" style={{ fontSize: "0.7rem", padding: "0.1rem 0.3rem" }}>
                                          {b.role === "core" ? t("role_core") : t("role_supporting")}
                                        </small>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="edit-circle-btn compact"
                                      style={{ backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#dc2626", border: "none" }}
                                      onClick={async () => {
                                        if (confirm(isAr ? `هل أنت متأكد من فصل "${b.title}"؟` : `Are you sure you want to decouple "${b.title}"?`)) {
                                          setLoading(true);
                                          try {
                                            const res = await authedFetch(`/api/books/${b._id}/assign`, {
                                              method: "PATCH",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ action: "decouple" })
                                            });
                                            if (res.ok) {
                                              triggerToast(isAr ? "🔓 تم فصل الكتاب بنجاح!" : "🔓 Book decoupled successfully!");
                                              fetchBooks();
                                              fetchSubjects(selectedCurriculumId);
                                            } else {
                                              triggerToast("Failed to decouple book", true);
                                            }
                                          } catch (err: any) {
                                            triggerToast(err.message, true);
                                          } finally {
                                            setLoading(false);
                                          }
                                        }
                                      }}
                                    >
                                      <FiTrash2 />
                                    </button>
                                  </div>
                                ))
                            )}
                          </div>
                        </section>
                      </div>
                    )}
                  </div>
                ) : (selectedCurriculumId || isCreatingCurUnderLib) ? (
                  /* 2. Curriculum Form / Create / Edit View */
                  <section className="form-card" style={{ margin: 0 }}>
                    <h2>
                      {selectedCurriculumId ? `📐 ${isAr ? "تعديل المنهج الدراسي" : "Edit Curriculum Unit"}` : `📐 ${isAr ? "منهج دراسي جديد" : "Create Curriculum Unit"}`}
                    </h2>
                    <form onSubmit={handleSaveCurriculum} className="standard-form">
                      <div className="form-group">
                        <label>{t("cur_id_opt")}</label>
                        <input
                          type="text"
                          disabled={!!selectedCurriculumId}
                          value={curForm._id}
                          onChange={e => setCurForm({ ...curForm, _id: e.target.value })}
                          placeholder="e.g. cur_moe_g12"
                          className="styled-input"
                        />
                      </div>
                      <div className="form-group-row">
                        <div className="form-group">
                          <label>{t("cur_title_en")}</label>
                          <input
                            type="text"
                            value={curForm.title}
                            onChange={e => setCurForm({ ...curForm, title: e.target.value })}
                            className="styled-input"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>{t("cur_title_ar")}</label>
                          <input
                            type="text"
                            value={curForm.title_ar}
                            onChange={e => setCurForm({ ...curForm, title_ar: e.target.value })}
                            className="styled-input"
                            required
                          />
                        </div>
                      </div>

                      {/* Scope Dimensions mapping */}
                      {activeLibrary && activeLibrary.scopeSchema?.length > 0 && (
                        <div className="dynamic-scope-fields" style={{ marginTop: "1rem" }}>
                          <h4 style={{ marginBottom: "0.75rem", fontSize: "0.95rem" }}>🧭 {t("scope_details")}</h4>
                          {activeLibrary.scopeSchema.map(dim => (
                            <div key={dim.key} className="form-group">
                              <label>{isAr ? dim.label_ar : dim.label} ({dim.key})</label>
                              {dim.type === "enum" ? (
                                <select
                                  value={curForm.scope[dim.key] || ""}
                                  onChange={e => setCurForm({
                                    ...curForm,
                                    scope: { ...curForm.scope, [dim.key]: e.target.value }
                                  })}
                                  className="styled-select"
                                >
                                  <option value="">-- Select Option --</option>
                                  {dim.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={curForm.scope[dim.key] || ""}
                                  onChange={e => setCurForm({
                                    ...curForm,
                                    scope: { ...curForm.scope, [dim.key]: e.target.value }
                                  })}
                                  className="styled-input"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Universal Save / Discard Controls */}
                      <div className="form-actions-row">
                        <button type="submit" disabled={loading} className="primary-submit-btn" style={{ margin: 0 }}>
                          <FiSave /> {t("save_curriculum")}
                        </button>
                        {selectedCurriculumId && (
                          <button
                            type="button"
                            className="discard-btn"
                            style={{ backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#dc2626", border: "1px solid rgba(220, 38, 38, 0.2)", margin: 0 }}
                            onClick={handleDeleteCurriculum}
                          >
                            <FiTrash2 /> {isAr ? "حذف المنهج" : "Delete Curriculum"}
                          </button>
                        )}
                        <button 
                          type="button" 
                          className="discard-btn"
                          style={{ margin: 0 }}
                          onClick={() => {
                            setCurForm({ _id: "", title: "", title_ar: "", scope: {} });
                            setIsEditingCur(false);
                            setIsCreatingCurUnderLib(null);
                            setSelectedCurriculumId("");
                          }}
                        >
                          {isAr ? "إلغاء التغييرات" : "Discard"}
                        </button>
                      </div>
                    </form>
                  </section>
                ) : (
                  /* 3. Empty State Welcome Card */
                  <div className="empty-workspace-state">
                    <FiLayers className="large-empty-iconpulse-animation" style={{ fontSize: "4rem", color: "var(--primary)", opacity: 0.25 }} />
                    <h3>{isAr ? "استوديو بناء وتعديل المناهج" : "Curriculum Workspace"}</h3>
                    <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8, color: "#64748b" }}>
                      {isAr ? "اختر مادة أو منهجاً من المخطط الشجري للمستكشف على اليمين للبدء بالتعديل أو بناء هياكل تعليمية جديدة." : "Select a Library, Curriculum or Subject from the Tree Explorer sidebar to view details, assign textbooks, or configure structures."}
                    </p>
                  </div>
                )}
              </main>
              
            </div>

            {/* DELETE SUBJECT CONFIRMATION MODAL OVERLAY (OR-12) */}
            {showDeleteSubjectConfirm && (
              <div className="delete-confirm-overlay">
                <div className="delete-confirm-modal">
                  <div className="modal-title-row">
                    <FiAlertCircle style={{ fontSize: "1.5rem" }} />
                    <span>{isAr ? "تأكيد حذف المادة" : "Confirm Deletion"}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5, color: "#475569" }}>
                    {isAr 
                      ? "هل أنت متأكد من حذف هذه المادة؟ سيتم فك ارتباط جميع الكتب والكتب المنهجية التابعة لها (Decouple) ولكن لن يتم حذف ملفاتها من قاعدة البيانات."
                      : "Are you sure you want to delete this subject? All associated books and curricula roles will be decoupled (unassigned) gracefully, but their textbook source files will NOT be deleted."}
                  </p>
                  <div className="modal-actions">
                    <button 
                      type="button" 
                      onClick={() => setShowDeleteSubjectConfirm(false)}
                      className="discard-btn"
                    >
                      {isAr ? "إلغاء" : "Cancel"}
                    </button>
                    <button 
                      type="button" 
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const res = await authedFetch(`/api/subjects?id=${selectedSubjectId}`, {
                            method: "DELETE"
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            triggerToast(isAr ? "🗑️ تم حذف المادة وفصل الكتب بنجاح!" : "🗑️ Subject deleted and books decoupled!");
                            fetchSubjects(selectedCurriculumId);
                            fetchBooks();
                            setSelectedSubjectId("");
                            setSubjForm({ name: "", name_ar: "", color: "#4F46E5", emoji: "📚", category: "Science" });
                            setEditingSubjectId(null);
                          } else {
                            triggerToast(data.error || "Failed to delete subject", true);
                          }
                        } catch (err: any) {
                          triggerToast(err.message, true);
                        } finally {
                          setLoading(false);
                          setShowDeleteSubjectConfirm(false);
                        }
                      }}
                      className="confirm-delete-btn"
                    >
                      {isAr ? "نعم، احذف المادة" : "Confirm Deletion"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Ingestion & Crawl Console */}
        {activeTab === "ingest_console" && (
          <div className="ingestion-console-layout">
            
            {/* DESTINATION SELECTION GATEWAY */}
            <div className="curriculum-assignment-gateway">
              <h3>🎯 {t("target_destination")}</h3>
              <div className="gateway-filters-row">
                <div className="filter-item">
                  <label>{t("tab_libraries")}</label>
                  <select value={selectedLibId} onChange={e => setSelectedLibId(e.target.value)} className="styled-select">
                    {libraries.map(lib => (
                      <option key={lib._id} value={lib._id}>{isAr ? lib.name_ar : lib.name}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-item">
                  <label>{t("tab_curricula")}</label>
                  <select value={selectedCurriculumId} onChange={e => setSelectedCurriculumId(e.target.value)} className="styled-select">
                    <option value="">-- Choose Curriculum --</option>
                    {curricula.map(cur => (
                      <option key={cur._id} value={cur._id}>{isAr ? cur.title_ar : cur.title}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-item">
                  <label>Target Subject</label>
                  <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="styled-select">
                    <option value="">-- Choose Subject --</option>
                    {subjects.map(subj => (
                      <option key={subj._id} value={subj._id}>{isAr ? subj.name_ar : subj.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="tab-grid grid-2">
              
              {/* CRAWLER SECTION */}
              <section className="crawler-card">
                <h2>{t("web_crawler")}</h2>
                <div className="standard-form">
                  <div className="form-group">
                    <label>{t("crawl_url_label")}</label>
                    <input
                      type="url"
                      value={crawlUrl}
                      onChange={e => setCrawlUrl(e.target.value)}
                      className="styled-input url-input"
                    />
                  </div>
                  <div className="form-group-row">
                    <div className="form-group">
                      <label>{t("crawl_depth")}</label>
                      <select
                        value={crawlMaxDepth}
                        onChange={e => setCrawlMaxDepth(Number(e.target.value))}
                        className="styled-select"
                        disabled={isCrawling || crawlStatus === "paused"}
                      >
                        <option value={1}>1 - Shallow Target Link Only</option>
                        <option value={2}>2 - Standard Folder Depth</option>
                        <option value={3}>3 - Complete Portal Crawl</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
                      {!isCrawling && crawlStatus !== "paused" ? (
                        <button
                          type="button"
                          onClick={handleStartCrawling}
                          className="primary-submit-btn crawl-start-btn"
                          style={{ height: "42px", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <FiSearch /> {t("start_crawl")}
                        </button>
                      ) : (
                        <>
                          {crawlStatus === "paused" ? (
                            <button
                              type="button"
                              onClick={() => selectedCrawlId && handleControlCrawlJob(selectedCrawlId, "resume")}
                              className="control-btn resume-btn"
                              style={{
                                height: "42px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "0 1.25rem",
                                borderRadius: "8px",
                                backgroundColor: "rgba(16, 185, 129, 0.15)",
                                border: "1.5px solid rgb(16, 185, 129)",
                                color: "rgb(52, 211, 153)",
                                cursor: "pointer",
                                fontWeight: "600",
                                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                textShadow: "0 0 8px rgba(16, 185, 129, 0.5)",
                                boxShadow: "0 0 12px rgba(16, 185, 129, 0.1)"
                              }}
                            >
                              <FiPlay /> {isAr ? "استئناف" : "Resume"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => selectedCrawlId && handleControlCrawlJob(selectedCrawlId, "pause")}
                              className="control-btn pause-btn"
                              style={{
                                height: "42px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "0 1.25rem",
                                borderRadius: "8px",
                                backgroundColor: "rgba(245, 158, 11, 0.15)",
                                border: "1.5px solid rgb(245, 158, 11)",
                                color: "rgb(251, 191, 36)",
                                cursor: "pointer",
                                fontWeight: "600",
                                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                textShadow: "0 0 8px rgba(245, 158, 11, 0.5)",
                                boxShadow: "0 0 12px rgba(245, 158, 11, 0.1)"
                              }}
                            >
                              <FiPause /> {isAr ? "إيقاف مؤقت" : "Pause"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => selectedCrawlId && handleControlCrawlJob(selectedCrawlId, "stop")}
                            className="control-btn stop-btn"
                            style={{
                              height: "42px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "0 1.25rem",
                              borderRadius: "8px",
                              backgroundColor: "rgba(239, 68, 68, 0.12)",
                              border: "1.5px solid rgb(239, 68, 68)",
                              color: "rgb(248, 113, 113)",
                              cursor: "pointer",
                              fontWeight: "600",
                              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                              textShadow: "0 0 8px rgba(239, 68, 68, 0.4)",
                              boxShadow: "0 0 12px rgba(239, 68, 68, 0.08)"
                            }}
                          >
                            <FiSquare /> {isAr ? "إيقاف" : "Stop"}
                          </button>

                          <button
                            type="button"
                            onClick={() => selectedCrawlId && handleControlCrawlJob(selectedCrawlId, "kill")}
                            className="control-btn kill-btn"
                            style={{
                              height: "42px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "0 1.25rem",
                              borderRadius: "8px",
                              backgroundColor: "rgba(185, 28, 28, 0.2)",
                              border: "1.5px solid rgb(220, 38, 38)",
                              color: "rgb(252, 165, 165)",
                              cursor: "pointer",
                              fontWeight: "700",
                              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                              textShadow: "0 0 8px rgba(220, 38, 38, 0.6)",
                              boxShadow: "0 0 15px rgba(220, 38, 38, 0.15)"
                            }}
                          >
                            <FiSlash /> {isAr ? "إنهاء بالقوة" : "Kill"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                {isCrawling && (
                  <div className="crawl-progressbar-wrapper" style={{ marginTop: "1rem" }}>
                    <div className="progressbar-fill" style={{ width: `${crawlProgress}%` }} />
                  </div>
                )}

                {/* Crawl History Panel */}
                <div className="crawl-history-panel" style={{ marginTop: "1.5rem", borderTop: "1px dashed rgba(255, 255, 255, 0.15)", paddingTop: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--foreground)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      🕒 {isAr ? "سجل عمليات الزحف" : "Crawl History"}
                    </h3>
                    <button type="button" onClick={fetchPastCrawls} className="icon-btn-text" style={{ fontSize: "0.8rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer" }}>
                      <FiRefreshCw /> {isAr ? "تحديث السجل" : "Refresh History"}
                    </button>
                  </div>
                  {pastCrawls.length === 0 ? (
                    <p className="empty-state-text" style={{ fontSize: "0.85rem", opacity: 0.6 }}>
                      {isAr ? "لا يوجد عمليات زحف سابقة مسجلة." : "No past crawl jobs recorded."}
                    </p>
                  ) : (
                    <div className="past-crawls-list" style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
                      {pastCrawls.map(job => (
                        <div
                          key={job._id}
                          onClick={() => handleSelectPastCrawl(job)}
                          className={`past-crawl-item ${selectedCrawlId === job._id ? "selected-active" : ""}`}
                          style={{
                            padding: "0.6rem 0.8rem",
                            borderRadius: "8px",
                            backgroundColor: selectedCrawlId === job._id ? "rgba(37, 99, 235, 0.1)" : "rgba(255, 255, 255, 0.4)",
                            border: selectedCrawlId === job._id ? "1.5px solid var(--primary)" : "1.5px solid var(--card-border)",
                            cursor: "pointer",
                            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                            <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "var(--primary)" }} className="monospace-id">{job._id}</span>
                            <span className={`status-pill ${job.status}`} style={{ fontSize: "0.72rem", padding: "0.15rem 0.45rem", borderRadius: "12px", fontWeight: "bold" }}>{job.status}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "#6a7c88" }}>
                            <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "230px" }}>{job.url}</span>
                            <span>{new Date((job.created_at || 0) * 1000).toLocaleDateString(isAr ? "ar-EG" : "en-US")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Crawled Results */}
                {discoveredBooks.length > 0 && (
                  <div className="discovered-catalog-wrapper">
                    <div className="catalog-header-checkbox">
                      <h3>{t("crawled_results")}</h3>
                      <button
                        onClick={handleBulkIngest}
                        disabled={loading || !selectedCurriculumId || !selectedSubjectId}
                        className="bulk-ingest-button"
                      >
                        {t("bulk_ingest_btn", { count: Object.values(selectedDiscovered).filter(Boolean).length })}
                      </button>
                    </div>
                    <div className="discovered-list">
                      {buildDirectoryTree(discoveredBooks).map(node => (
                        <DirectoryNode
                          key={node.key}
                          node={node}
                          selectedDiscovered={selectedDiscovered}
                          crawlExpandedNodes={crawlExpandedNodes}
                          onToggleNode={handleToggleNode}
                          onToggleExpand={toggleCrawlExpand}
                          isAr={isAr}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* MANUAL INGEST */}
              <section className="manual-ingest-card">
                <h2>{t("manual_ingest")}</h2>
                <form onSubmit={handleDirectIngest} className="standard-form">
                  <div className="form-group-row">
                    <div className="form-group">
                      <label>Book Title (EN)</label>
                      <input
                        type="text"
                        value={manualIngestForm.title}
                        onChange={e => setManualIngestForm({ ...manualIngestForm, title: e.target.value })}
                        placeholder="Physics Vol 1"
                        className="styled-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Book Title (AR)</label>
                      <input
                        type="text"
                        value={manualIngestForm.title_ar}
                        onChange={e => setManualIngestForm({ ...manualIngestForm, title_ar: e.target.value })}
                        placeholder="الفيزياء الجزء الأول"
                        className="styled-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{t("file_upload_or_url")}</label>
                    <input
                      type="url"
                      value={manualIngestForm.source_url}
                      onChange={e => setManualIngestForm({ ...manualIngestForm, source_url: e.target.value })}
                      placeholder="https://example.com/textbook.pdf"
                      className="styled-input"
                    />
                  </div>

                  <div className="form-group-row">
                    <div className="form-group">
                      <label>Language</label>
                      <select
                        value={manualIngestForm.language}
                        onChange={e => setManualIngestForm({ ...manualIngestForm, language: e.target.value })}
                        className="styled-select"
                      >
                        <option value="ar">العربية (ar)</option>
                        <option value="en">English (en)</option>
                        <option value="fr">Français (fr)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Role</label>
                      <select
                        value={manualIngestForm.role}
                        onChange={e => setManualIngestForm({ ...manualIngestForm, role: e.target.value as "core" | "supporting" })}
                        className="styled-select"
                      >
                        <option value="core">{t("role_core")}</option>
                        <option value="supporting">{t("role_supporting")}</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !selectedCurriculumId || !selectedSubjectId}
                    className="primary-submit-btn"
                  >
                    <FiLayers /> {t("direct_ingest_btn")}
                  </button>
                </form>

                {/* Telemetry Queue Dashboard */}
                <div className="telemetry-dashboard-wrapper">
                  <div className="dashboard-header">
                    <h3>{t("telemetry_console")}</h3>
                    <button onClick={fetchQueueJobs} className="icon-btn-text"><FiRefreshCw /> {t("refresh_jobs")}</button>
                  </div>
                  
                  <div className="queue-jobs-scroller">
                    {queue.length === 0 ? (
                      <p className="empty-state-text">{t("queue_empty")}</p>
                    ) : (
                      queue.map(job => (
                        <div key={job.id} className={`telemetry-job-row ${job.status === "processing" ? "active-border" : ""}`}>
                          <div className="job-meta-header">
                            <div>
                              <strong>{job.bookTitle}</strong>
                              <small>{job.id}</small>
                            </div>
                            <span className={`status-pill ${job.status}`}>{job.status}</span>
                          </div>
                          {job.status === "processing" && (
                            <div className="job-progressbar-outer">
                              <div className="job-progressbar-inner" style={{ width: `${job.progress}%` }} />
                              <span className="progress-percent">{job.progress}% ({job.processedPages}/{job.totalPages} pgs)</span>
                            </div>
                          )}
                          <div className="job-control-actions" style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                            {["processing", "queued", "downloading"].includes(job.status) && (
                              <button
                                onClick={() => handleControlJob(job.id.replace("job_", ""), job.id, "pause")}
                                className="control-btn"
                                style={{
                                  background: "rgba(245, 158, 11, 0.15)",
                                  color: "#f59e0b",
                                  border: "1px solid rgba(245, 158, 11, 0.3)",
                                  borderRadius: "4px",
                                  padding: "6px 12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "all 0.2s"
                                }}
                              >
                                ⏸️ {isAr ? "إيقاف مؤقت" : "Pause"}
                              </button>
                            )}
                            {job.status === "paused" && (
                              <button
                                onClick={() => handleControlJob(job.id.replace("job_", ""), job.id, "resume")}
                                className="control-btn"
                                style={{
                                  background: "rgba(16, 185, 129, 0.15)",
                                  color: "#10b981",
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                  borderRadius: "4px",
                                  padding: "6px 12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "all 0.2s"
                                }}
                              >
                                ▶️ {isAr ? "استئناف" : "Resume"}
                              </button>
                            )}
                            {["processing", "paused", "queued", "downloading"].includes(job.status) && (
                              <button
                                onClick={() => handleControlJob(job.id.replace("job_", ""), job.id, "kill")}
                                className="control-btn"
                                style={{
                                  background: "rgba(239, 68, 68, 0.15)",
                                  color: "#ef4444",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                  borderRadius: "4px",
                                  padding: "6px 12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "all 0.2s"
                                }}
                              >
                                🛑 {isAr ? "إنهاء فوراً" : "Force Kill"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Terminal log panel */}
      <section className="terminal-logs-section">
        <h3>📟 {t("logs_terminal")}</h3>
        <div className="terminal-logs-window">
          {terminalLogs.concat(crawlLogs).slice(0, 10).map((log, idx) => (
            <div key={idx} className="terminal-line">{log}</div>
          ))}
        </div>
      </section>
    </div>
  );
}
