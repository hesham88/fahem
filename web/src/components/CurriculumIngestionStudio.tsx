import React, { useState, useEffect, useRef } from "react";
import { authedFetch } from "../lib/authedFetch";
import { Dropdown } from "./ui/Dropdown";
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
  current_step?: string;
  logs?: string[];
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
    lib_id_placeholder: "e.g. lib_openstax",
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
    lib_id_placeholder: "مثال: lib_openstax",
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
  totalPages?: number;
  subjectId?: string;
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

export function countPagesRecursive(node: TreeNode): number {
  if (node.type === "file") {
    return node.totalPages || 0;
  }
  let sum = 0;
  if (node.children) {
    node.children.forEach(child => {
      sum += countPagesRecursive(child);
    });
  }
  return sum;
}

export function buildDirectoryTree(books: any[]): TreeNode[] {
  // Group books by subject (using book.subject as directory name, with subjectId if available)
  const subjectGroups: Record<string, { name: string; id: string; books: any[] }> = {};

  books.forEach(book => {
    const subjName = book.subject || "Discovered Resources";
    const subjId = book.subjectId || "unassigned_subject";
    
    if (!subjectGroups[subjId]) {
      subjectGroups[subjId] = {
        name: subjName,
        id: subjId,
        books: []
      };
    }
    subjectGroups[subjId].books.push(book);
  });

  const rootNodes: TreeNode[] = [];

  Object.values(subjectGroups).forEach(group => {
    const children: TreeNode[] = group.books.map(book => ({
      key: book.id || book._id || book.url,
      name: book.title || book.bookTitle || "Untitled Book",
      type: "file" as const,
      bookId: book.id || book._id || book.url, // Fallback to url to guarantee a selectable identifier
      url: book.url,
      totalPages: book.totalPages || book.total_pages || 0
    }));

    rootNodes.push({
      key: "subject_node_" + group.id,
      name: group.name,
      type: "directory" as const,
      children: children,
      subjectId: group.id
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

  // Calculate total pages for folder display recursively
  let totalDirPages = 0;
  if (isDir && node.children) {
    node.children.forEach(c => {
      if (typeof c.totalPages === "number") totalDirPages += c.totalPages;
    });
  }

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

          {isDir && totalDirPages > 0 && (
            <span 
              className="page-count-badge dir-pages" 
              style={{
                fontSize: "0.72rem",
                padding: "0.1rem 0.4rem",
                borderRadius: "12px",
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                color: "#3b82f6",
                fontWeight: "600",
                marginLeft: "8px",
                marginRight: "8px"
              }}
            >
              {totalDirPages} pgs
            </span>
          )}

          {!isDir && typeof node.totalPages === "number" && node.totalPages > 0 && (
            <span 
              className="page-count-badge file-pages" 
              style={{
                fontSize: "0.72rem",
                padding: "0.1rem 0.4rem",
                borderRadius: "12px",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                fontWeight: "600",
                marginLeft: "8px",
                marginRight: "8px"
              }}
            >
              {node.totalPages} pgs
            </span>
          )}
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
  const [activeModal, setActiveModal] = useState<"library" | "curriculum" | "subject" | "assign_book" | null>(null);
  const [booksSearchQuery, setBooksSearchQuery] = useState("");

  // Core collections
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [books, setBooks] = useState<Book[]>([]);

  // Selection states
  const [selectedLibId, setSelectedLibId] = useState<string>("");
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Record<string, boolean>>({});

  // Monotonic Ingestion Progress Hook
  const [maxProgressByJob, setMaxProgressByJob] = useState<Record<string, number>>({});

  const isRoutingComplete = !!(selectedLibId && selectedCurriculumId && Object.keys(selectedSubjectIds).filter(k => selectedSubjectIds[k]).length > 0);

  const renderRoutingChecklist = () => {
    const hasLib = !!selectedLibId;
    const hasCur = !!selectedCurriculumId;
    const hasSub = Object.keys(selectedSubjectIds).filter(k => selectedSubjectIds[k]).length > 0;

    return (
      <div className="glass-routing-checklist" style={{
        background: "rgba(239, 68, 68, 0.08)",
        backdropFilter: "blur(12px)",
        border: "1.5px solid rgba(239, 68, 68, 0.25)",
        borderRadius: "10px",
        padding: "1rem 1.25rem",
        marginTop: "1rem",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        boxShadow: "0 8px 32px 0 rgba(239, 68, 68, 0.05)",
        width: "100%"
      }}>
        <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#f87171", display: "flex", alignItems: "center", gap: "6px" }}>
          <FiAlertCircle />
          {isAr ? "متطلبات التوجيه والربط ناقصة" : "Routing Requirements Incomplete"}
        </div>
        <p style={{ margin: 0, fontSize: "0.78rem", opacity: 0.8, color: "#cbd5e1" }}>
          {isAr 
            ? "يرجى استكمال تحديد معطيات التوجيه في الأعلى لتمكين الاستيراد:" 
            : "Please complete the routing configuration above to enable ingestion:"}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.8rem", marginTop: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: hasLib ? "#10b981" : "#f87171", fontWeight: "bold" }}>
              {hasLib ? "✓" : "✗"}
            </span>
            <span style={{ opacity: hasLib ? 0.6 : 1, textDecoration: hasLib ? "line-through" : "none" }}>
              {isAr ? "اختيار المكتبة التعليمية" : "Select Library Domain"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: hasCur ? "#10b981" : "#f87171", fontWeight: "bold" }}>
              {hasCur ? "✓" : "✗"}
            </span>
            <span style={{ opacity: hasCur ? 0.6 : 1, textDecoration: hasCur ? "line-through" : "none" }}>
              {isAr ? "اختيار المنهج الدراسي المستهدف" : "Select target Curriculum Unit"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: hasSub ? "#10b981" : "#f87171", fontWeight: "bold" }}>
              {hasSub ? "✓" : "✗"}
            </span>
            <span style={{ opacity: hasSub ? 0.6 : 1, textDecoration: hasSub ? "line-through" : "none" }}>
              {isAr ? "تحديد مادة دراسية واحدة على الأقل" : "Select at least one target Subject"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Form states - Library
  const [libForm, setLibForm] = useState<Partial<Library>>({
    _id: "",
    name: "",
    name_ar: "",
    source: "openstax",
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
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
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

  // Dynamic poller setup (2s when active jobs exist, 10s otherwise)
  const [pollInterval, setPollInterval] = useState(10000);

  useEffect(() => {
    const hasActiveJob = queue.some(job => ["processing", "downloading", "queued"].includes(job.status));
    const targetInterval = hasActiveJob ? 2000 : 10000;
    if (pollInterval !== targetInterval) {
      setPollInterval(targetInterval);
    }
  }, [queue, pollInterval]);

  useEffect(() => {
    const interval = setInterval(fetchQueueJobs, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  // Onboarding loads
  useEffect(() => {
    fetchLibraries();
    fetchBooks();
    fetchQueueJobs();
    fetchPastCrawls();
    return () => {
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
      setSelectedSubjectIds({});
    }
  }, [selectedLibId]);

  useEffect(() => {
    if (selectedCurriculumId) {
      fetchSubjects(selectedCurriculumId);
      setSelectedSubjectIds({});
    } else {
      setSubjects([]);
      setSelectedSubjectIds({});
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
        const normalized = data.jobs.map((job: any) => {
          const jobId = job.id || job._id || "";
          const jobProgress = typeof job.progress === "number" ? job.progress : (job.pct || 0);
          return {
            id: jobId,
            fileName: job.fileName || job.file_name || "",
            bookTitle: job.bookTitle || job.book_title || job.title || "",
            bookTitleAr: job.bookTitleAr || job.book_title_ar || job.title_ar || "",
            subjectName: job.subjectName || job.subject_name || "",
            status: job.status || "idle",
            progress: jobProgress,
            totalPages: typeof job.totalPages === "number" ? job.totalPages : (job.total_pages || 0),
            processedPages: typeof job.processedPages === "number" ? job.processedPages : (job.processed_pages || 0),
            current_step: job.current_step || job.stage || "fetch",
            logs: job.logs || []
          };
        });

        setMaxProgressByJob(prev => {
          const updated = { ...prev };
          normalized.forEach((job: any) => {
            const prevProgress = prev[job.id] || 0;
            if (job.progress > prevProgress) {
              updated[job.id] = job.progress;
            }
          });
          return updated;
        });

        setQueue(normalized);
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
    let finalId = libForm._id;
    if (!isEditingLib) {
      finalId = "lib_" + (libForm.name || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      if (finalId === "lib_" || finalId.length < 5) {
        finalId = "lib_" + Math.random().toString(36).substring(2, 7);
      }
    }

    const finalLibForm = {
      ...libForm,
      _id: finalId
    };

    if (!finalLibForm._id || !finalLibForm.name || !finalLibForm.name_ar || !finalLibForm.source) {
      triggerToast("Missing library primary fields", true);
      return;
    }
    setLoading(true);
    try {
      const res = await authedFetch("/api/libraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalLibForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(isAr ? "🏛️ تم حفظ المكتبة وتحديث البنية!" : "🏛️ Library saved and structure synced!");
        fetchLibraries();
        setLibForm({ _id: "", name: "", name_ar: "", source: "openstax", logo: "", scopeSchema: [] });
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
      let finalId = curForm._id;
      if (!isEditingCur) {
        finalId = "cur_" + (curForm.title || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
        if (finalId === "cur_" || finalId.length < 5) {
          finalId = "cur_" + Math.random().toString(36).substring(2, 7);
        }
      }

      const payload = {
        ...curForm,
        _id: finalId,
        id: finalId,
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
        setLibForm({ _id: "", name: "", name_ar: "", source: "openstax", logo: "", scopeSchema: [] });
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
    const targetSubjectIds = Object.keys(selectedSubjectIds).filter(sid => !!selectedSubjectIds[sid]);

    if (selectedList.length === 0) {
      triggerToast(isAr ? "⚠️ يرجى تحديد كتاب واحد على الأقل للاستيراد." : "⚠️ No discovered books selected for ingestion.", true);
      return;
    }
    if (!selectedLibId || !selectedCurriculumId || targetSubjectIds.length === 0) {
      let missingMsg = "";
      if (!selectedLibId) missingMsg = isAr ? "يجب اختيار مكتبة أولاً" : "Please select a Library domain first";
      else if (!selectedCurriculumId) missingMsg = isAr ? "يجب اختيار المنهج الدراسي المستهدف" : "Please select a target Curriculum unit first";
      else missingMsg = isAr ? "يجب تحديد مادة دراسية واحدة على الأقل من القائمة" : "Please select at least one target Subject checkbox";
      
      triggerToast(`⚠️ ${missingMsg}`, true);
      return;
    }

    addTerminalLog(`[CRAWLER] Initiating bulk ingestion for ${selectedList.length} assets into ${targetSubjectIds.length} subjects...`);
    setLoading(true);

    let successCount = 0;
    let totalAttempts = selectedList.length * targetSubjectIds.length;

    for (const item of selectedList) {
      for (const subId of targetSubjectIds) {
        try {
          const res = await authedFetch("/api/books", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject_id: subId,
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
    }

    triggerToast(isAr
      ? `📥 تم بنجاح استيراد وبدء معالجة ${successCount} كتاب لـ ${targetSubjectIds.length} مواد!`
      : `📥 Successfully queued ingestion for ${successCount}/${totalAttempts} book-subject assignments!`);
    
    fetchBooks();
    fetchQueueJobs();
    setLoading(false);
  };

  const handleDirectIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSubjectIds = Object.keys(selectedSubjectIds).filter(sid => !!selectedSubjectIds[sid]);

    if (!manualIngestForm.title || !manualIngestForm.source_url) {
      triggerToast(isAr ? "⚠️ يرجى إدخال عنوان الكتاب ورابط ملف PDF" : "⚠️ Please enter a Title and PDF source URL", true);
      return;
    }
    if (!selectedLibId || !selectedCurriculumId || targetSubjectIds.length === 0) {
      let missingMsg = "";
      if (!selectedLibId) missingMsg = isAr ? "يجب اختيار مكتبة أولاً" : "Please select a Library domain first";
      else if (!selectedCurriculumId) missingMsg = isAr ? "يجب اختيار المنهج الدراسي المستهدف" : "Please select a target Curriculum unit first";
      else missingMsg = isAr ? "يجب تحديد مادة دراسية واحدة على الأقل من القائمة" : "Please select at least one target Subject checkbox";
      
      triggerToast(`⚠️ ${missingMsg}`, true);
      return;
    }

    setLoading(true);
    addTerminalLog(`[MANUAL INGEST] Ingesting "${manualIngestForm.title}" into ${targetSubjectIds.length} subjects...`);

    let successCount = 0;
    for (const subId of targetSubjectIds) {
      try {
        const res = await authedFetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject_id: subId,
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
        if (res.ok) successCount++;
      } catch (err) {
        console.error(err);
      }
    }

    if (successCount > 0) {
      triggerToast(isAr
        ? `📚 تم بدء استيراد ومعالجة الكتاب لـ ${successCount} مادة بنجاح!`
        : `📚 Textbook ingestion queued successfully for ${successCount} subjects!`);
      setManualIngestForm({ title: "", title_ar: "", source_url: "", language: "ar", role: "core" });
      fetchBooks();
      fetchQueueJobs();
    } else {
      triggerToast(isAr ? "⚠️ فشل بدء الاستيراد لجميع المواد المعينة" : "⚠️ Ingestion failed to start", true);
    }
    setLoading(false);
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

  const handleControlJob = async (bookId: string, jobId: string, action: "pause" | "resume" | "stop" | "kill") => {
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
        } else if (action === "stop") {
          msg = isAr ? "⏹️ تم إيقاف المهمة!" : "⏹️ Ingestion job stopped cooperatively!";
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

      {/* Unified 2-Column Studio Dashboard */}
      <div className="studio-unified-layout">
        
        {/* Left Column: Master Curriculum Tree Explorer */}
        <aside className="tree-explorer-card">
          <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "750", display: "flex", alignItems: "center", gap: "8px" }}>
                🌳 {isAr ? "مستكشف المناهج" : "Curriculum Explorer"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                {isAr ? "الهيكل الهرمي للمكتبات والمناهج والكتب" : "Hierarchical libraries, curricula & books"}
              </p>
            </div>
            <button
              type="button"
              className="icon-btn-text"
              onClick={() => {
                setLibForm({ _id: "", name: "", name_ar: "", source: "openstax", logo: "", scopeSchema: [] });
                setIsEditingLib(false);
                setActiveModal("library");
              }}
              title={isAr ? "إضافة مكتبة جديدة" : "Add New Library"}
              style={{
                background: "rgba(59, 130, 246, 0.1)",
                color: "var(--primary)",
                border: "1px solid rgba(59, 130, 246, 0.15)",
                padding: "6px 10px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <FiPlus /> {isAr ? "مكتبة" : "Library"}
            </button>
          </div>

          <div className="tree-scroller-capped">
            {libraries.map(lib => {
              const libExpanded = !!expandedNodes[`lib_${lib._id}`];
              const libCurricula = curricula.filter(c => c.library_id === lib._id);
              return (
                <div key={lib._id} className="tree-branch" style={{ marginBottom: "6px" }}>
                  <div 
                    className={`tree-row ${selectedLibId === lib._id && !selectedCurriculumId && !selectedSubjectId ? "active-row" : ""}`}
                    onClick={() => {
                      setSelectedLibId(lib._id);
                      setSelectedCurriculumId("");
                      setSelectedSubjectId("");
                      setIsEditingLib(true);
                      setLibForm(lib);
                    }}
                    style={{ cursor: "pointer", borderRadius: "8px", padding: "6px 8px" }}
                  >
                    <span 
                      className="expand-toggle" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedNodes(prev => ({ ...prev, [`lib_${lib._id}`]: !prev[`lib_${lib._id}`] }));
                      }}
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      {libCurricula.length > 0 ? (libExpanded ? <FiChevronDown /> : <FiChevronDown style={{ transform: isAr ? "rotate(90deg)" : "rotate(-90deg)" }} />) : <span className="empty-spacer" />}
                    </span>
                    <img src={lib.logo || "/libs/logo.svg"} className="tree-lib-logo" alt="" onError={e => { (e.target as any).src = "/libs/logo.svg" }} style={{ width: "20px", height: "20px", objectFit: "contain", margin: "0 4px" }} />
                    <span className="tree-node-text" style={{ fontWeight: 700, fontSize: "0.9rem" }}>{isAr ? lib.name_ar : lib.name}</span>
                    
                    <div className="tree-node-actions" style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
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
                          setCurForm({ _id: "", title: "", title_ar: "", scope: {} });
                          setIsEditingCur(false);
                          setActiveModal("curriculum");
                        }}
                      >
                        <FiPlus />
                      </button>
                      <button 
                        type="button" 
                        className="tree-row-action" 
                        title={isAr ? "تعديل المكتبة" : "Edit Library"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLibId(lib._id);
                          setSelectedCurriculumId("");
                          setSelectedSubjectId("");
                          setIsEditingLib(true);
                          setLibForm(lib);
                          setActiveModal("library");
                        }}
                      >
                        <FiEdit />
                      </button>
                    </div>
                  </div>

                  {libExpanded && (
                    <div className="tree-children" style={{ paddingLeft: isAr ? 0 : "16px", paddingRight: isAr ? "16px" : 0 }}>
                      {libCurricula.map(cur => {
                        const curExpanded = !!expandedNodes[`cur_${cur._id}`];
                        const curSubjects = subjects.filter(s => s.curriculum_id === cur._id);
                        return (
                          <div key={cur._id} className="tree-branch" style={{ marginTop: "4px" }}>
                            <div 
                              className={`tree-row ${selectedCurriculumId === cur._id && !selectedSubjectId ? "active-row" : ""}`}
                              onClick={() => {
                                setSelectedLibId(lib._id);
                                setSelectedCurriculumId(cur._id);
                                setSelectedSubjectId("");
                                setIsEditingCur(true);
                                setCurForm({ _id: cur._id, title: cur.title, title_ar: cur.title_ar, scope: cur.scope || {} });
                              }}
                              style={{ cursor: "pointer", borderRadius: "6px", padding: "4px 8px" }}
                            >
                              <span 
                                className="expand-toggle" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedNodes(prev => ({ ...prev, [`cur_${cur._id}`]: !prev[`cur_${cur._id}`] }));
                                }}
                              >
                                {curSubjects.length > 0 ? (curExpanded ? <FiChevronDown /> : <FiChevronDown style={{ transform: isAr ? "rotate(90deg)" : "rotate(-90deg)" }} />) : <span className="empty-spacer" />}
                              </span>
                              <FiLayers className="tree-node-icon" style={{ color: "#6366f1" }} />
                              <span className="tree-node-text" style={{ fontSize: "0.85rem" }}>{isAr ? cur.title_ar : cur.title}</span>
                              
                              <div className="tree-node-actions" style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
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
                                    setSubjForm({ name: "", name_ar: "", color: "#4F46E5", emoji: "📚", category: "Science" });
                                    setEditingSubjectId(null);
                                    setActiveModal("subject");
                                  }}
                                >
                                  <FiPlus />
                                </button>
                                <button 
                                  type="button" 
                                  className="tree-row-action" 
                                  title={isAr ? "تعديل المنهج" : "Edit Curriculum"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLibId(lib._id);
                                    setSelectedCurriculumId(cur._id);
                                    setSelectedSubjectId("");
                                    setIsEditingCur(true);
                                    setCurForm({ _id: cur._id, title: cur.title, title_ar: cur.title_ar, scope: cur.scope || {} });
                                    setActiveModal("curriculum");
                                  }}
                                >
                                  <FiEdit />
                                </button>
                              </div>
                            </div>

                            {curExpanded && (
                              <div className="tree-children" style={{ paddingLeft: isAr ? 0 : "16px", paddingRight: isAr ? "16px" : 0 }}>
                                {curSubjects.map(subj => {
                                  const subjExpanded = !!expandedNodes[`subj_${subj._id}`];
                                  const subjBooks = books.filter(b => b.subject_id === subj._id);
                                  return (
                                    <div key={subj._id} className="tree-branch" style={{ marginTop: "2px" }}>
                                      <div 
                                        className={`tree-row ${selectedSubjectId === subj._id ? "active-row" : ""}`}
                                        style={{ borderInlineStart: `3px solid ${subj.color}`, padding: "4px 8px" }}
                                        onClick={() => {
                                          setSelectedLibId(lib._id);
                                          setSelectedCurriculumId(cur._id);
                                          setSelectedSubjectId(subj._id);
                                          setSelectedSubjectIds({ [subj._id]: true });
                                          setSubjForm(subj);
                                          setEditingSubjectId(subj._id);
                                        }}
                                      >
                                        <span 
                                          className="expand-toggle" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedNodes(prev => ({ ...prev, [`subj_${subj._id}`]: !prev[`subj_${subj._id}`] }));
                                          }}
                                        >
                                          {subjBooks.length > 0 ? (subjExpanded ? <FiChevronDown /> : <FiChevronDown style={{ transform: isAr ? "rotate(90deg)" : "rotate(-90deg)" }} />) : <span className="empty-spacer" />}
                                        </span>
                                        <span className="tree-node-emoji">{subj.emoji || "📚"}</span>
                                        <span className="tree-node-text" style={{ fontSize: "0.82rem" }}>{isAr ? subj.name_ar : subj.name}</span>
                                        
                                        <div className="tree-node-actions" style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
                                          <button 
                                            type="button" 
                                            className="tree-row-action" 
                                            title={isAr ? "ربط كتاب" : "Assign Book"}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedLibId(lib._id);
                                              setSelectedCurriculumId(cur._id);
                                              setSelectedSubjectId(subj._id);
                                              setAssignBookId("");
                                              setAssignSubjectId(subj._id);
                                              setAssignRole("core");
                                              setActiveModal("assign_book");
                                            }}
                                          >
                                            <FiPlus />
                                          </button>
                                          <button 
                                            type="button" 
                                            className="tree-row-action" 
                                            title={isAr ? "تعديل المادة" : "Edit Subject"}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedLibId(lib._id);
                                              setSelectedCurriculumId(cur._id);
                                              setSelectedSubjectId(subj._id);
                                              setSubjForm(subj);
                                              setEditingSubjectId(subj._id);
                                              setActiveModal("subject");
                                            }}
                                          >
                                            <FiEdit />
                                          </button>
                                        </div>
                                      </div>

                                      {subjExpanded && (
                                        <div className="tree-children" style={{ paddingLeft: isAr ? 0 : "12px", paddingRight: isAr ? "12px" : 0 }}>
                                          {subjBooks.map(book => (
                                            <div key={book._id} className="tree-row tree-row-book" style={{ padding: "4px 8px" }}>
                                              <FiBookOpen className="tree-node-icon" style={{ color: "#10b981", flexShrink: 0 }} />
                                              <div className="tree-node-book-meta" style={{ flexGrow: 1, minWidth: 0 }}>
                                                <span className="tree-node-text-bold" style={{ fontSize: "0.8rem", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                  {isAr ? book.title_ar : book.title}
                                                </span>
                                                <span className="tree-node-subtext" style={{ fontSize: "0.72rem", color: "#64748b" }}>
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
                                                <FiTrash2 />
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

        {/* Right Column: Operations Console & Assets Repository */}
        <div className="operations-column" style={{ display: "flex", flexDirection: "column" }}>
          
          {/* Active Workspace HUD Selection Card */}
          <div className="workspace-hud-card">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#64748b" }}>
                <span>🎯 {isAr ? "الموقع النشط المستهدف:" : "Target Workspace Location:"}</span>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {selectedLibId ? (
                  <span className="badge-pill" style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "rgba(59, 130, 246, 0.12)", color: "var(--primary)", fontWeight: "600", fontSize: "0.8rem", padding: "4px 10px", borderRadius: "20px" }}>
                    🏛️ {isAr ? (activeLibrary?.name_ar || selectedLibId) : (activeLibrary?.name || selectedLibId)}
                  </span>
                ) : (
                  <span className="badge-pill" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", fontSize: "0.8rem", padding: "4px 10px", borderRadius: "20px" }}>
                    {isAr ? "لم يتم تحديد مكتبة" : "No Library Target"}
                  </span>
                )}
                {selectedCurriculumId && (
                  <span className="badge-pill" style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "rgba(99, 102, 241, 0.12)", color: "#6366f1", fontWeight: "600", fontSize: "0.8rem", padding: "4px 10px", borderRadius: "20px" }}>
                    📐 {isAr ? (translations[language]?.title_ar || "المنهج") : "Curriculum"}
                  </span>
                )}
                {Object.keys(selectedSubjectIds).filter(k => selectedSubjectIds[k]).length > 0 && (
                  <span className="badge-pill" style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "rgba(16, 185, 129, 0.12)", color: "#10b981", fontWeight: "600", fontSize: "0.8rem", padding: "4px 10px", borderRadius: "20px" }}>
                    🎨 {Object.keys(selectedSubjectIds).filter(k => selectedSubjectIds[k]).length} {isAr ? "مواد محددة" : "Subjects selected"}
                  </span>
                )}
              </div>
            </div>
            {(selectedLibId || selectedCurriculumId) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLibId("");
                  setSelectedCurriculumId("");
                  setSelectedSubjectId("");
                  setSelectedSubjectIds({});
                }}
                className="discard-btn"
                style={{
                  fontSize: "0.75rem",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  backgroundColor: "rgba(220, 38, 38, 0.08)",
                  color: "#dc2626",
                  border: "1px solid rgba(220, 38, 38, 0.15)",
                  margin: 0
                }}
              >
                <FiSlash size={12} /> {isAr ? "تصفير الاختيار" : "Clear Target"}
              </button>
            )}
          </div>

          {/* Validation context alert if selections are incomplete */}
          {(!selectedLibId || !selectedCurriculumId || Object.keys(selectedSubjectIds).filter(k => selectedSubjectIds[k]).length === 0) && (
            <div className="ingestion-validation-warning-banner" style={{
              marginBottom: "1.5rem",
              padding: "1rem 1.25rem",
              borderRadius: "10px",
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              border: "1.5px solid rgb(245, 158, 11)",
              color: "rgb(251, 191, 36)",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              boxShadow: "0 4px 15px rgba(245, 158, 11, 0.12)",
              animation: "pulse-soft 2.5s infinite"
            }}>
              <FiAlertCircle style={{ fontSize: "1.6rem", flexShrink: 0, textShadow: "0 0 8px rgba(245, 158, 11, 0.5)" }} />
              <div style={{ fontSize: "0.85rem", lineHeight: 1.45 }}>
                <strong style={{ display: "block", marginBottom: "3px", textShadow: "0 0 4px rgba(245, 158, 11, 0.2)" }}>
                  {isAr ? "⚠️ متطلبات التوجيه والمسار معلقة" : "⚠️ Routing Context Incomplete"}
                </strong>
                <span>
                  {isAr 
                    ? `لوحة الاستيراد بانتظار تحديد المسار: يرجى اختيار مادة دراسية واحدة على الأقل في الأعلى لتتمكن من تشغيل قنوات استيراد الكتب.`
                    : `The Ingestion console is waiting for router context: Please select or click on a Curriculum or Subject on the tree sidebar to automatically activate targets.`
                  }
                </span>
              </div>
            </div>
          )}

          {/* Interactive Ops Control Cards Grid */}
          <div className="ops-panels-grid">
            
            {/* CARD A: Autonomous Web Crawler */}
            <section className="ops-console-card crawler-card">
              <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: "750", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "8px" }}>
                📡 {t("web_crawler")}
              </h3>
              
              <div className="standard-form" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>{t("crawl_url_label")}</label>
                  <input
                    type="url"
                    value={crawlUrl}
                    onChange={e => setCrawlUrl(e.target.value)}
                    className="styled-input url-input"
                    style={{ fontSize: "0.85rem", padding: "8px 10px" }}
                  />
                </div>
                
                <div className="form-group-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", margin: 0, alignItems: "end" }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>{t("crawl_depth")}</label>
                    <select
                      value={crawlMaxDepth}
                      onChange={e => setCrawlMaxDepth(Number(e.target.value))}
                      className="styled-select"
                      style={{ fontSize: "0.85rem", padding: "6px 8px", height: "38px" }}
                      disabled={isCrawling || crawlStatus === "paused"}
                    >
                      <option value={1}>1 - Shallow Target Link Only</option>
                      <option value={2}>2 - Standard Folder Depth</option>
                      <option value={3}>3 - Complete Portal Crawl</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: "4px" }}>
                    {!isCrawling && crawlStatus !== "paused" ? (
                      <button
                        type="button"
                        onClick={handleStartCrawling}
                        className="primary-submit-btn crawl-start-btn"
                        style={{ height: "38px", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.82rem", margin: 0, padding: "0 14px" }}
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
                              height: "38px",
                              padding: "0 10px",
                              borderRadius: "8px",
                              backgroundColor: "rgba(16, 185, 129, 0.15)",
                              border: "1.5px solid rgb(16, 185, 129)",
                              color: "rgb(52, 211, 153)",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "0.8rem"
                            }}
                          >
                            <FiPlay />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => selectedCrawlId && handleControlCrawlJob(selectedCrawlId, "pause")}
                            className="control-btn pause-btn"
                            style={{
                              height: "38px",
                              padding: "0 10px",
                              borderRadius: "8px",
                              backgroundColor: "rgba(245, 158, 11, 0.15)",
                              border: "1.5px solid rgb(245, 158, 11)",
                              color: "rgb(251, 191, 36)",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "0.8rem"
                            }}
                          >
                            <FiPause />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => selectedCrawlId && handleControlCrawlJob(selectedCrawlId, "stop")}
                          className="control-btn stop-btn"
                          style={{
                            height: "38px",
                            padding: "0 10px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(239, 68, 68, 0.12)",
                            border: "1.5px solid rgb(239, 68, 68)",
                            color: "rgb(248, 113, 113)",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "0.8rem"
                          }}
                        >
                          <FiSquare />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {(isCrawling || crawlProgress > 0) && (
                  <div style={{ marginTop: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px" }}>
                      <span style={{ color: "var(--primary)", fontWeight: "600" }}>
                        {isCrawling ? t("crawler_running") : (isAr ? "اكتمال المسح" : "Crawl Completed")}
                      </span>
                      <span>{crawlProgress}%</span>
                    </div>
                    <div style={{ height: "6px", width: "100%", backgroundColor: "rgba(0,0,0,0.06)", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${crawlProgress}%`, backgroundColor: "var(--primary)", borderRadius: "10px", transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                )}

                {/* Past Crawls History Select */}
                {pastCrawls.length > 0 && (
                  <div className="form-group" style={{ margin: "4px 0 0 0" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: "600", color: "#64748b" }}>
                      📂 {isAr ? "تاريخ عمليات الزحف السابقة" : "Historical Exploration History"}
                    </label>
                    <select
                      value={selectedCrawlId || ""}
                      onChange={e => {
                        const job = pastCrawls.find(j => j._id === e.target.value);
                        if (job) handleSelectPastCrawl(job);
                      }}
                      className="styled-select compact"
                      style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                    >
                      <option value="">-- {isAr ? "اختر عملية سابقة" : "Review Historical Jobs"} --</option>
                      {pastCrawls.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.url} ({new Date(c.createdAt).toLocaleDateString()}) - {c.status}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Crawler Discovered Resources Result Table */}
              <div style={{ borderTop: "1px dashed rgba(0,0,0,0.08)", paddingTop: "10px", marginTop: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: "700" }}>
                    📦 {t("crawled_results")} ({discoveredBooks.length})
                  </h4>
                  {discoveredBooks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkIngestion}
                      disabled={loading || Object.keys(selectedDiscovered).filter(k => selectedDiscovered[k]).length === 0}
                      className="primary-submit-btn"
                      style={{
                        margin: 0,
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        height: "28px",
                        borderRadius: "6px"
                      }}
                    >
                      {t("bulk_ingest_btn", { count: Object.keys(selectedDiscovered).filter(k => selectedDiscovered[k]).length })}
                    </button>
                  )}
                </div>

                <div style={{
                  maxHeight: "220px",
                  overflowY: "auto",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  padding: "4px"
                }}>
                  {discoveredBooks.length === 0 ? (
                    <p style={{ margin: 0, padding: "2rem", textAlign: "center", fontSize: "0.8rem", color: "#64748b" }}>
                      {isAr ? "لم يتم العثور على كتب أو مصادر مكتشفة حالياً." : "No crawled resources discovered yet. Execute a crawl to harvest digital library files."}
                    </p>
                  ) : (
                    buildDirectoryTree(discoveredBooks).map(node => (
                      <DirectoryNode
                        key={node.key}
                        node={node}
                        selectedDiscovered={selectedDiscovered}
                        crawlExpandedNodes={crawlExpandedNodes}
                        onToggleNode={(n, checked) => {
                          const ids = getAllBookIds(n);
                          setSelectedDiscovered(prev => {
                            const updated = { ...prev };
                            ids.forEach(id => {
                              if (checked) updated[id] = true;
                              else delete updated[id];
                            });
                            return updated;
                          });
                        }}
                        onToggleExpand={(key) => {
                          setCrawlExpandedNodes(prev => ({ ...prev, [key]: !prev[key] }));
                        }}
                        isAr={isAr}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* CARD B: Direct Ingestion & Telemetry Pipeline */}
            <section className="ops-console-card manual-ingest-card">
              <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: "750", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "8px" }}>
                🚀 {t("manual_ingest")}
              </h3>
              
              <form onSubmit={handleManualIngestion} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "end" }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>{t("file_upload_or_url")}</label>
                    <input
                      type="text"
                      placeholder={isAr ? "أدخل رابط الـ PDF المباشر..." : "Direct PDF URL link to download..."}
                      value={manualIngestForm.source_url}
                      onChange={e => setManualIngestForm({ ...manualIngestForm, source_url: e.target.value })}
                      className="styled-input"
                      style={{ fontSize: "0.85rem", padding: "8px 10px" }}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="primary-submit-btn"
                    style={{ height: "38px", margin: 0, fontSize: "0.8rem", padding: "0 14px", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <FiPlus /> {isAr ? "استيراد" : "Ingest"}
                  </button>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: "0.78rem" }}>{isAr ? "عنوان الكتاب (EN)" : "Book Title (EN)"}</label>
                    <input
                      type="text"
                      value={manualIngestForm.title}
                      onChange={e => setManualIngestForm({ ...manualIngestForm, title: e.target.value })}
                      className="styled-input"
                      style={{ fontSize: "0.8rem", padding: "6px" }}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: "0.78rem" }}>{isAr ? "عنوان الكتاب (AR)" : "Book Title (AR)"}</label>
                    <input
                      type="text"
                      value={manualIngestForm.title_ar}
                      onChange={e => setManualIngestForm({ ...manualIngestForm, title_ar: e.target.value })}
                      className="styled-input"
                      style={{ fontSize: "0.8rem", padding: "6px" }}
                      required
                    />
                  </div>
                </div>
              </form>

              {/* ACTIVE INGESTION PIPELINE PROGRESS */}
              <div style={{ borderTop: "1px dashed rgba(0,0,0,0.08)", paddingTop: "10px", marginTop: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FiActivity className={queue.length > 0 ? "spin-animation" : ""} />
                    <span>{t("telemetry_console")}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={fetchQueueJobs}
                    className="icon-btn-text"
                    style={{ fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <FiRefreshCw /> {t("refresh_jobs")}
                  </button>
                </div>

                <div style={{
                  maxHeight: "180px",
                  overflowY: "auto",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  {queue.length === 0 ? (
                    <p style={{ margin: 0, padding: "1.5rem", textAlign: "center", fontSize: "0.8rem", color: "#64748b" }}>
                      ✨ {t("queue_empty")}
                    </p>
                  ) : (
                    queue.map(job => {
                      const maxProgress = maxProgressByJob[job.id] || 0;
                      const displayProgress = Math.max(maxProgress, job.progress || 0);
                      const isFailed = job.status === "failed";
                      const isComplete = job.status === "completed";
                      return (
                        <div key={job.id} style={{
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid var(--card-border)",
                          background: isFailed ? "rgba(220, 38, 38, 0.05)" : (isComplete ? "rgba(16, 185, 129, 0.05)" : "rgba(255, 255, 255, 0.4)")
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "8px", marginBottom: "4px" }}>
                            <div style={{ minWidth: 0 }}>
                              <h5 style={{ margin: 0, fontSize: "0.8rem", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {isAr ? job.bookTitleAr : job.bookTitle}
                              </h5>
                              <small style={{ fontSize: "0.7rem", color: "#64748b" }}>
                                {job.fileName} ({job.processedPages}/{job.totalPages} pgs)
                              </small>
                            </div>
                            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                              <span style={{
                                fontSize: "0.68rem",
                                padding: "2px 6px",
                                borderRadius: "10px",
                                fontWeight: "bold",
                                backgroundColor: isFailed ? "rgba(220, 38, 38, 0.12)" : (isComplete ? "rgba(16, 185, 129, 0.12)" : "rgba(59, 130, 246, 0.12)"),
                                color: isFailed ? "#ef4444" : (isComplete ? "#10b981" : "#3b82f6")
                              }}>
                                {job.status.toUpperCase()}
                              </span>
                              {!isComplete && !isFailed && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelJob(job.id)}
                                  style={{
                                    border: "none",
                                    background: "none",
                                    color: "#ef4444",
                                    cursor: "pointer",
                                    padding: "2px",
                                    display: "flex",
                                    alignItems: "center"
                                  }}
                                  title={t("term_job_btn")}
                                >
                                  <FiTrash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div style={{ height: "4px", width: "100%", backgroundColor: "rgba(0,0,0,0.04)", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{
                              height: "100%",
                              width: `${displayProgress}%`,
                              backgroundColor: isFailed ? "#ef4444" : (isComplete ? "#10b981" : "#3b82f6"),
                              borderRadius: "4px",
                              transition: "width 0.4s ease"
                            }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* TERMINAL MONOSPACE LIVE LOGS */}
              <div style={{ borderTop: "1px dashed rgba(0,0,0,0.08)", paddingTop: "10px", marginTop: "4px" }}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FiTerminal />
                  <span>{isAr ? "مراقب السجلات الحية للمكتبة" : "System Logs & Tracing Terminal"}</span>
                </h4>
                <div className="terminal-logs-window" style={{
                  height: "110px",
                  background: "#0f172a",
                  borderRadius: "8px",
                  padding: "8px",
                  overflowY: "auto",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: "#38bdf8",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)"
                }}>
                  {terminalLogs.concat(crawlLogs).slice(-15).map((log, idx) => (
                    <div key={idx} className="terminal-line" style={{ marginBottom: "2px", color: log.includes("[CRAWLER]") ? "#34d399" : (log.includes("[ERROR]") ? "#f87171" : "#38bdf8") }}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* CARD C: Global Textbook Asset Pool (Beautiful Table) */}
          <section className="global-books-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "10px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FiBookOpen size={20} style={{ color: "var(--primary)" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "750" }}>
                  {isAr ? "مستودع الكتب العام والمصادر" : "Global Textbook Assets & Files"}
                </h3>
                <span className="badge-pill" style={{ fontSize: "0.75rem", fontWeight: "600", padding: "2px 8px", backgroundColor: "rgba(59, 130, 246, 0.12)", color: "var(--primary)", borderRadius: "12px" }}>
                  {books.length} {isAr ? "كتب مفهرسة" : "Indexed Textbooks"}
                </span>
              </div>
              
              {/* Dynamic search and filters */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1, justifyContent: "flex-end", maxWidth: "400px" }}>
                <div style={{ position: "relative", width: "100%" }}>
                  <FiSearch style={{ position: "absolute", left: isAr ? "auto" : "10px", right: isAr ? "10px" : "auto", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                  <input
                    type="text"
                    placeholder={isAr ? "ابحث عن كتاب بالاسم أو اللغة..." : "Search textbooks by title or language..."}
                    value={booksSearchQuery}
                    onChange={e => setBooksSearchQuery(e.target.value)}
                    className="styled-input"
                    style={{
                      fontSize: "0.8rem",
                      padding: "6px 10px",
                      paddingLeft: isAr ? "10px" : "32px",
                      paddingRight: isAr ? "32px" : "10px",
                      borderRadius: "8px",
                      margin: 0,
                      width: "100%"
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="global-books-table-wrapper">
              {books.length === 0 ? (
                <div style={{ padding: "3rem", textShadow: "none", textAlign: "center", color: "#64748b", fontSize: "0.9rem" }}>
                  {isAr ? "لا توجد كتب مسجلة في قاعدة البيانات حالياً." : "No textbook assets indexed in the local database. Start a crawl or upload files!"}
                </div>
              ) : (
                <table className="global-books-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: isAr ? "right" : "left" }}>{isAr ? "اسم المرجع / الكتاب" : "Textbook Title"}</th>
                      <th style={{ width: "100px" }}>{isAr ? "اللغة" : "Language"}</th>
                      <th style={{ width: "120px" }}>{isAr ? "عدد الصفحات" : "Page Count"}</th>
                      <th>{isAr ? "التصنيف التابع" : "Mapped Location"}</th>
                      <th style={{ width: "100px", textAlign: "center" }}>{isAr ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books
                      .filter(b => {
                        if (!booksSearchQuery) return true;
                        const query = booksSearchQuery.toLowerCase();
                        return (
                          b.title.toLowerCase().includes(query) ||
                          b.title_ar.toLowerCase().includes(query) ||
                          b.language.toLowerCase().includes(query)
                        );
                      })
                      .map(book => {
                        const actualPages = book.totalPages || book.total_pages || "--";
                        const sub = subjects.find(s => s._id === book.subject_id);
                        const cur = curricula.find(c => c._id === book.curriculum_id);
                        return (
                          <tr key={book._id}>
                            <td style={{ fontWeight: "600", fontSize: "0.85rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <FiBookOpen style={{ color: sub?.color || "#64748b", flexShrink: 0 }} />
                                <div style={{ minWidth: 0 }}>
                                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {isAr ? book.title_ar : book.title}
                                  </span>
                                  {book.source_url && (
                                    <a href={book.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--primary)", wordBreak: "break-all" }}>
                                      {book.source_url}
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ textTransform: "uppercase", fontSize: "0.78rem" }}>
                              <span className="badge-pill" style={{ padding: "2px 6px", fontSize: "0.72rem" }}>
                                {book.language}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--foreground)" }}>
                                {actualPages !== "--" ? `${actualPages} pgs` : "--"}
                              </span>
                            </td>
                            <td>
                              {sub ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <span style={{ fontSize: "0.75rem", fontWeight: "600", color: sub.color || "var(--primary)" }}>
                                    {sub.emoji} {isAr ? sub.name_ar : sub.name}
                                  </span>
                                  {cur && (
                                    <span style={{ fontSize: "0.68rem", color: "#64748b" }}>
                                      {isAr ? cur.title_ar : cur.title}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: "0.75rem", color: "#ef4444" }}>
                                  ⚠️ {isAr ? "كتاب غير مخصص بمادة" : "Unmapped Resource File"}
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                {book.subject_id && (
                                  <button
                                    type="button"
                                    onClick={async () => {
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
                                            if (book.curriculum_id) fetchSubjects(book.curriculum_id);
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
                                    className="edit-circle-btn"
                                    style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#dc2626", border: "none" }}
                                    title={isAr ? "فصل الكتاب من المادة" : "Decouple from Subject"}
                                  >
                                    <FiSlash size={12} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(isAr ? `هل أنت متأكد من حذف هذا الكتاب تماماً من النظام وقاعدة البيانات؟` : `Are you sure you want to completely delete this book from the system database?`)) {
                                      setLoading(true);
                                      try {
                                        const res = await authedFetch(`/api/books/${book._id}`, {
                                          method: "DELETE"
                                        });
                                        const data = await res.json();
                                        if (res.ok && data.success) {
                                          triggerToast(isAr ? "🗑️ تم حذف الكتاب بالكامل!" : "🗑️ Textbook completely deleted!");
                                          fetchBooks();
                                          if (book.curriculum_id) fetchSubjects(book.curriculum_id);
                                        } else {
                                          triggerToast(data.error || "Failed to delete book", true);
                                        }
                                      } catch (err: any) {
                                        triggerToast(err.message, true);
                                      } finally {
                                        setLoading(false);
                                      }
                                    }
                                  }}
                                  className="edit-circle-btn"
                                  style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "rgba(220, 38, 38, 0.15)", color: "#dc2626", border: "none" }}
                                  title={isAr ? "حذف الكتاب نهائياً" : "Delete Textbook completely"}
                                >
                                  <FiTrash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

        </div> {/* End of operations column */}
      </div> {/* End of studio-unified-layout */}

      {/* MODAL OVERLAYS (GLASSMORPHIC DIALOG FLOATING FORMS) */}

      {/* MODAL 1: Library configuration Form */}
      {activeModal === "library" && (
        <div className="studio-modal-overlay">
          <div className="studio-modal-box">
            <div className="studio-modal-header">
              <div className="studio-modal-title">
                <FiBookOpen style={{ color: "var(--primary)" }} />
                <span>{isEditingLib ? t("edit_library") : t("create_library")}</span>
              </div>
              <button type="button" onClick={() => { setActiveModal(null); setIsEditingLib(false); }} className="studio-modal-close">×</button>
            </div>

            <form onSubmit={async (e) => { e.preventDefault(); await handleSaveLibrary(e); setActiveModal(null); }} className="standard-form">
              <div className="form-group-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label>{t("lib_name_en")}</label>
                  <input
                    type="text"
                    value={libForm.name || ""}
                    onChange={e => setLibForm({ ...libForm, name: e.target.value })}
                    className="styled-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t("lib_name_ar")}</label>
                  <input
                    type="text"
                    value={libForm.name_ar || ""}
                    onChange={e => setLibForm({ ...libForm, name_ar: e.target.value })}
                    className="styled-input"
                    required
                  />
                </div>
              </div>
              <div className="form-group-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label>{t("lib_source")}</label>
                  <select
                    value={libForm.source || "openstax"}
                    onChange={e => setLibForm({ ...libForm, source: e.target.value })}
                    className="styled-select"
                  >
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

              <div className="scope-schema-section" style={{ borderTop: "1px dashed rgba(0,0,0,0.08)", paddingTop: "12px", marginTop: "12px" }}>
                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4 style={{ margin: 0, fontSize: "0.85rem" }}>{t("scope_schema")}</h4>
                  <button type="button" onClick={handleAddScopeDimension} className="icon-btn-text" style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "2px" }}>
                    <FiPlus /> {t("add_dimension")}
                  </button>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto", padding: "4px" }}>
                  {(libForm.scopeSchema || []).map((dim, idx) => (
                    <div key={idx} className="dimension-row" style={{ display: "flex", gap: "6px", flexWrap: "wrap", border: "1px solid var(--card-border)", padding: "6px", borderRadius: "8px" }}>
                      <input
                        type="text"
                        placeholder={t("dim_key")}
                        value={dim.key}
                        onChange={e => handleUpdateDimension(idx, "key", e.target.value)}
                        className="styled-input compact"
                        style={{ flex: 1, minWidth: "80px", fontSize: "0.78rem" }}
                        required
                      />
                      <input
                        type="text"
                        placeholder={t("dim_label_en")}
                        value={dim.label}
                        onChange={e => handleUpdateDimension(idx, "label", e.target.value)}
                        className="styled-input compact"
                        style={{ flex: 1, minWidth: "100px", fontSize: "0.78rem" }}
                        required
                      />
                      <input
                        type="text"
                        placeholder={t("dim_label_ar")}
                        value={dim.label_ar}
                        onChange={e => handleUpdateDimension(idx, "label_ar", e.target.value)}
                        className="styled-input compact"
                        style={{ flex: 1, minWidth: "100px", fontSize: "0.78rem" }}
                        required
                      />
                      <select
                        value={dim.type}
                        onChange={e => handleUpdateDimension(idx, "type", e.target.value)}
                        className="styled-select compact"
                        style={{ width: "120px", fontSize: "0.78rem" }}
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
                          className="styled-input compact"
                          style={{ width: "100%", fontSize: "0.78rem", marginTop: "4px" }}
                          required
                        />
                      )}
                      <button type="button" onClick={() => handleRemoveScopeDimension(idx)} className="delete-btn" style={{ marginLeft: "auto" }}>
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "12px", marginTop: "12px" }}>
                {isEditingLib && (
                  <button
                    type="button"
                    className="discard-btn"
                    style={{ backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#dc2626", border: "1px solid rgba(220, 38, 38, 0.2)", margin: 0 }}
                    onClick={() => { handleDeleteLibrary(); setActiveModal(null); }}
                  >
                    <FiTrash2 /> {isAr ? "حذف المكتبة" : "Delete Library"}
                  </button>
                )}
                <div style={{ display: "flex", gap: "8px", marginLeft: isEditingLib ? "auto" : "0" }}>
                  <button 
                    type="button" 
                    className="discard-btn"
                    onClick={() => { setActiveModal(null); setIsEditingLib(false); }}
                    style={{ margin: 0 }}
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button type="submit" disabled={loading} className="primary-submit-btn" style={{ margin: 0 }}>
                    <FiSave /> {t("save_library")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Curriculum configuration Form */}
      {activeModal === "curriculum" && (
        <div className="studio-modal-overlay">
          <div className="studio-modal-box">
            <div className="studio-modal-header">
              <div className="studio-modal-title">
                <FiLayers style={{ color: "#6366f1" }} />
                <span>{isEditingCur ? t("edit_curriculum") : t("create_curriculum")}</span>
              </div>
              <button type="button" onClick={() => { setActiveModal(null); setIsEditingCur(false); setIsCreatingCurUnderLib(null); }} className="studio-modal-close">×</button>
            </div>

            <form onSubmit={async (e) => { e.preventDefault(); await handleSaveCurriculum(e); setActiveModal(null); }} className="standard-form">
              <div className="form-group">
                <label>{t("cur_title_en")}</label>
                <input
                  type="text"
                  value={curForm.title || ""}
                  onChange={e => setCurForm({ ...curForm, title: e.target.value })}
                  className="styled-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>{t("cur_title_ar")}</label>
                <input
                  type="text"
                  value={curForm.title_ar || ""}
                  onChange={e => setCurForm({ ...curForm, title_ar: e.target.value })}
                  className="styled-input"
                  required
                />
              </div>

              {/* Dynamic scope dimension configurations */}
              {activeLibrary && activeLibrary.scopeSchema?.length > 0 && (
                <div style={{ borderTop: "1px dashed rgba(0,0,0,0.08)", paddingTop: "12px", marginTop: "12px" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "0.85rem" }}>{t("scope_details")}</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {activeLibrary.scopeSchema.map(dim => (
                      <div key={dim.key} className="form-group" style={{ margin: 0 }}>
                        <label>{isAr ? dim.label_ar : dim.label} ({dim.key})</label>
                        {dim.type === "enum" ? (
                          <select
                            value={curForm.scope?.[dim.key] || ""}
                            onChange={e => setCurForm({
                              ...curForm,
                              scope: { ...(curForm.scope || {}), [dim.key]: e.target.value }
                            })}
                            className="styled-select"
                            required
                          >
                            <option value="">-- Choose Option --</option>
                            {dim.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={curForm.scope?.[dim.key] || ""}
                            onChange={e => setCurForm({
                              ...curForm,
                              scope: { ...(curForm.scope || {}), [dim.key]: e.target.value }
                            })}
                            className="styled-input"
                            required
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "12px", marginTop: "12px" }}>
                {isEditingCur && (
                  <button
                    type="button"
                    className="discard-btn"
                    style={{ backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#dc2626", border: "1px solid rgba(220, 38, 38, 0.2)", margin: 0 }}
                    onClick={() => { handleDeleteCurriculum(); setActiveModal(null); }}
                  >
                    <FiTrash2 /> {isAr ? "حذف المنهج" : "Delete Curriculum"}
                  </button>
                )}
                <div style={{ display: "flex", gap: "8px", marginLeft: isEditingCur ? "auto" : "0" }}>
                  <button 
                    type="button" 
                    className="discard-btn"
                    onClick={() => { setActiveModal(null); setIsEditingCur(false); setIsCreatingCurUnderLib(null); }}
                    style={{ margin: 0 }}
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button type="submit" disabled={loading} className="primary-submit-btn" style={{ margin: 0 }}>
                    <FiSave /> {t("save_curriculum")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Subject configuration Form */}
      {activeModal === "subject" && (
        <div className="studio-modal-overlay">
          <div className="studio-modal-box">
            <div className="studio-modal-header">
              <div className="studio-modal-title">
                <span style={{ color: subjForm.color }}>{subjForm.emoji || "🎨"}</span>
                <span>{editingSubjId ? (isAr ? "تعديل المادة" : "Edit Subject") : (isAr ? "إضافة مادة جديدة" : "Create Subject")}</span>
              </div>
              <button type="button" onClick={() => { setActiveModal(null); setEditingSubjectId(null); setIsCreatingSubjUnderCur(null); }} className="studio-modal-close">×</button>
            </div>

            <form onSubmit={async (e) => { e.preventDefault(); await handleSaveSubject(e); setActiveModal(null); }} className="standard-form">
              <div className="form-group-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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

              <div className="form-group-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "end" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>{t("subject_color")}</label>
                  <input
                    type="color"
                    value={subjForm.color || "#4F46E5"}
                    onChange={e => setSubjForm({ ...subjForm, color: e.target.value })}
                    className="styled-input"
                    style={{ padding: "2px 6px", height: "38px", cursor: "pointer" }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0, position: "relative" }}>
                  <label>{t("subject_emoji")}</label>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="styled-input"
                    style={{
                      height: "38px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 12px",
                      cursor: "pointer",
                      fontSize: "1.15rem",
                      width: "100%",
                      textAlign: "center"
                    }}
                  >
                    <span>{subjForm.emoji || "📚"}</span>
                    <FiChevronDown size={14} style={{ opacity: 0.5 }} />
                  </button>

                  {showEmojiPicker && (
                    <div
                      ref={emojiPickerRef}
                      className="emoji-picker-container"
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        marginBottom: "6px",
                        zIndex: 1100,
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "10px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                        padding: "10px",
                        width: "200px"
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
                        {["📚", "📐", "🔬", "🧪", "🧬", "💻", "🧠", "🪐", "🌍", "🗺️", "🏛️", "🎨", "🎭", "🎵", "✍️", "📖", "🔢", "➕", "🗣️", "⏳"].map(emoji => (
                          <span
                            key={emoji}
                            onClick={() => {
                              setSubjForm({ ...subjForm, emoji });
                              setShowEmojiPicker(false);
                            }}
                            className="emoji-grid-item"
                            style={{
                              fontSize: "1.25rem",
                              cursor: "pointer",
                              padding: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "4px"
                            }}
                          >
                            {emoji}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>{t("subject_category")}</label>
                  <select
                    value={subjForm.category || "Science"}
                    onChange={e => setSubjForm({ ...subjForm, category: e.target.value })}
                    className="styled-select"
                    style={{ height: "38px" }}
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Languages">Languages</option>
                    <option value="Social Studies">Social Studies</option>
                    <option value="Technology">Technology</option>
                    <option value="Arts & Humanities">Arts & Humanities</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "12px", marginTop: "12px" }}>
                {editingSubjId && (
                  <button
                    type="button"
                    className="discard-btn"
                    style={{ backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#dc2626", border: "1px solid rgba(220, 38, 38, 0.2)", margin: 0 }}
                    onClick={async () => {
                      if (confirm(isAr 
                        ? "هل أنت متأكد من حذف هذه المادة؟ سيتم فك ارتباط الكتب المرتبطة بها."
                        : "Are you sure you want to delete this subject? Associated books will be decoupled gracefully."
                      )) {
                        setLoading(true);
                        try {
                          const res = await authedFetch(`/api/subjects?id=${selectedSubjectId}`, {
                            method: "DELETE"
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            triggerToast(isAr ? "🗑️ تم حذف المادة بنجاح!" : "🗑️ Subject deleted!");
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
                          setActiveModal(null);
                        }
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
                    <div className="catalog-header-checkbox" style={{ display: "flex", flexDirection: isRoutingComplete ? "row" : "column", alignItems: isRoutingComplete ? "center" : "stretch", gap: "10px" }}>
                      <h3>{t("crawled_results")}</h3>
                      {isRoutingComplete ? (
                        <button
                          onClick={handleBulkIngest}
                          disabled={loading}
                          className="bulk-ingest-button"
                        >
                          {t("bulk_ingest_btn", { count: Object.values(selectedDiscovered).filter(Boolean).length })}
                        </button>
                      ) : (
                        renderRoutingChecklist()
                      )}
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

                  {isRoutingComplete ? (
                    <button
                      type="submit"
                      disabled={loading}
                      className="primary-submit-btn"
                    >
                      <FiLayers /> {t("direct_ingest_btn")}
                    </button>
                  ) : (
                    renderRoutingChecklist()
                  )}
                </form>
              </section>
            </div>

            {/* BIG INGESTION DASHBOARD (FULL-WIDTH) */}
            <section className="big-ingestion-dashboard" style={{
              marginTop: "2rem",
              padding: "1.5rem",
              borderRadius: "12px",
              background: "rgba(17, 24, 39, 0.75)",
              border: "1.5px solid var(--card-border)",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.3)",
              backdropFilter: "blur(12px)",
              color: "#f8fafc"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px dashed rgba(255, 255, 255, 0.15)", paddingBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FiCpu className="pulse-animation" style={{ fontSize: "1.5rem", color: "var(--primary)" }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", letterSpacing: "-0.025em" }}>
                      {isAr ? "⚡ مركز مراقبة المعالجة والاستيراد" : "⚡ Live Ingestion Telemetry Hub"}
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.78rem", opacity: 0.7 }}>
                      {isAr ? "مراقبة مباشرة لتدفقات الاستيراد، المعالجة، والترميز الموجه لشبكة فاحم المعرفية." : "Real-time tracking of active pipeline stages, neural translation, page-by-page ingestion, and vector embeddings."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={fetchQueueJobs}
                  className="icon-btn-text"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(37, 99, 235, 0.15)",
                    border: "1px solid rgba(37, 99, 235, 0.3)",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    color: "var(--primary)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  <FiRefreshCw className={loading ? "spin-animation" : ""} /> {t("refresh_jobs")}
                </button>
              </div>

              {queue.length === 0 ? (
                <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#64748b" }}>
                  <FiActivity style={{ fontSize: "3rem", opacity: 0.15, marginBottom: "1rem" }} />
                  <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: "500" }}>{t("queue_empty")}</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", opacity: 0.7 }}>
                    {isAr ? "ابدأ استيراداً جماعياً أو فردياً لتنشيط لوحة المراقبة." : "Trigger manual or crawled ingestion assignments to wake up telemetry streams."}
                  </p>
                </div>
              ) : (
                <div className="active-pipeline-monitor" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {queue.map(job => {
                    const isProcessing = job.status === "processing" || job.status === "downloading" || job.status === "queued";
                    const isCompleted = job.status === "completed";
                    const isFailed = job.status === "failed";
                    const isPaused = job.status === "paused";

                    const displayProgress = maxProgressByJob[job.id] ?? job.progress;

                    const telemetryMapping: Record<string, { stage: string; agent: string; tool: string }> = {
                      fetch: { stage: "Source Retrieval", agent: "Download Crawler Agent", tool: "file_crawler" },
                      struct: { stage: "Document Structuring", agent: "Layout Parser Agent", tool: "pdf_layout_extractor" },
                      translate: { stage: "Neural Translation", agent: "Bi-directional Translator", tool: "llm_translator" },
                      assemble: { stage: "Content Assembly", agent: "Metadata Aggregator", tool: "meta_stitcher" },
                      embed: { stage: "Vector Embedding", agent: "Neural Indexer", tool: "pinecone_vectorizer" }
                    };

                    const telemetryMappingAr: Record<string, { stage: string; agent: string; tool: string }> = {
                      fetch: { stage: "جلب المصدر", agent: "وكيل الزحف والتحميل", tool: "file_crawler" },
                      struct: { stage: "هيكلة المستند", agent: "وكيل تحليل الهيكل والصفحات", tool: "pdf_layout_extractor" },
                      translate: { stage: "الترجمة العصبية", agent: "وكيل الترجمة الذكي", tool: "llm_translator" },
                      assemble: { stage: "تجميع البيانات", agent: "وكيل تجميع البيانات التعريفية", tool: "meta_stitcher" },
                      embed: { stage: "الترميز المتجهي", agent: "وكيل الفهرسة العصبية", tool: "pinecone_vectorizer" }
                    };

                    // Dynamic ETA Calculation
                    let etaText = isAr ? "غير محدد" : "Calculating...";
                    if (isProcessing && job.totalPages > 0 && job.processedPages > 0) {
                      const remainingPages = job.totalPages - job.processedPages;
                      if (remainingPages > 0) {
                        const estimatedSeconds = remainingPages * 2.5; // Average 2.5s per page (neural parsing + vectoring)
                        const mins = Math.floor(estimatedSeconds / 60);
                        const secs = Math.floor(estimatedSeconds % 60);
                        etaText = mins > 0 
                          ? `${mins}m ${secs}s` 
                          : `${secs}s`;
                      } else {
                        etaText = isAr ? "جاري الإنهاء..." : "Wrapping up...";
                      }
                    } else if (isCompleted) {
                      etaText = "0s";
                    }

                    // Stepper configuration based on stages
                    const stepKeys = ["fetch", "struct", "translate", "assemble", "embed"];
                    const stepLabels: Record<string, { en: string; ar: string; desc: string }> = {
                      fetch: { en: "Fetch Source", ar: "جلب المصدر", desc: "Downloading & isolating file" },
                      struct: { en: "Structure", ar: "هيكلة الفصول", desc: "Chunking & parsing layout" },
                      translate: { en: "Translate", ar: "الترجمة العصبية", desc: "Translating EN/FR content" },
                      assemble: { en: "Assemble", ar: "تجميع البيانات", desc: "Stitching structured metadata" },
                      embed: { en: "Embed Vector", ar: "الترميز المتجهي", desc: "Indexing into Pinecone database" }
                    };

                    const currentStepIndex = stepKeys.indexOf(job.current_step || "fetch");

                    return (
                      <div key={job.id} className={`pipeline-job-card ${job.status}`} style={{
                        padding: "1.25rem",
                        borderRadius: "10px",
                        background: "rgba(15, 23, 42, 0.4)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)"
                      }}>
                        {/* Job Meta Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "1rem" }}>
                          <div>
                            <span style={{
                              fontSize: "0.7rem",
                              fontWeight: "700",
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              color: "var(--primary)",
                              background: "rgba(37, 99, 235, 0.15)",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              marginRight: "8px",
                              display: "inline-block"
                            }} className="monospace-id">
                              {job.id}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>
                              {job.subjectName ? `🎯 ${job.subjectName}` : ""}
                            </span>
                            <h4 style={{ margin: "4px 0 0 0", fontSize: "1.05rem", fontWeight: "600", color: "#f8fafc" }}>
                              {isAr ? (job.bookTitleAr || job.bookTitle) : job.bookTitle}
                            </h4>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "0.7rem", opacity: 0.6, textTransform: "uppercase", display: "block" }}>
                                {isAr ? "الوقت المتبقي المقدر (ETA)" : "Estimated ETA"}
                              </span>
                              <strong style={{ fontSize: "0.95rem", color: isProcessing ? "var(--primary)" : "#64748b", textShadow: isProcessing ? "0 0 8px rgba(37,99,235,0.4)" : "none" }}>
                                {etaText}
                              </strong>
                            </div>
                            <span className={`status-pill ${job.status}`} style={{
                              fontSize: "0.75rem",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em"
                            }}>
                              {job.status}
                            </span>
                          </div>
                        </div>

                        {/* Stage Stepper Progress */}
                        <div className="horizontal-stepper" style={{
                          display: "flex",
                          justifyContent: "space-between",
                          position: "relative",
                          margin: "1.5rem 0",
                          padding: "0 10px"
                        }}>
                          {/* Background Connector Bar */}
                          <div style={{
                            position: "absolute",
                            top: "16px",
                            left: "5%",
                            right: "5%",
                            height: "3px",
                            background: "rgba(255,255,255,0.1)",
                            zIndex: 1
                          }} />
                          
                          {/* Active Connector Progress */}
                          {currentStepIndex >= 0 && (
                            <div style={{
                              position: "absolute",
                              top: "16px",
                              left: "5%",
                              width: `${(currentStepIndex / (stepKeys.length - 1)) * 90}%`,
                              height: "3px",
                              background: "linear-gradient(90deg, var(--primary) 0%, #10b981 100%)",
                              boxShadow: "0 0 8px rgba(16, 185, 129, 0.5)",
                              zIndex: 1,
                              transition: "width 0.4s ease"
                            }} />
                          )}

                          {stepKeys.map((stepKey, idx) => {
                            const isStepCompleted = idx < currentStepIndex || isCompleted;
                            const isStepActive = idx === currentStepIndex && isProcessing;
                            const isStepPending = idx > currentStepIndex && !isCompleted;
                            
                            let bubbleColor = "rgba(255,255,255,0.1)";
                            let borderStyle = "1.5px solid rgba(255,255,255,0.2)";
                            let textColor = "#64748b";

                            if (isStepCompleted) {
                              bubbleColor = "#10b981";
                              borderStyle = "1.5px solid #10b981";
                              textColor = "#10b981";
                            } else if (isStepActive) {
                              bubbleColor = "var(--primary)";
                              borderStyle = "1.5px solid var(--primary)";
                              textColor = "var(--primary)";
                            }

                            return (
                              <div key={stepKey} style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                width: "16%",
                                zIndex: 2,
                                textAlign: "center"
                              }}>
                                <div style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  backgroundColor: isStepCompleted ? "#10b981" : (isStepActive ? "var(--primary)" : "rgba(30, 41, 59, 0.8)"),
                                  border: borderStyle,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.85rem",
                                  fontWeight: "700",
                                  color: isStepCompleted || isStepActive ? "#ffffff" : "#64748b",
                                  boxShadow: isStepActive ? "0 0 12px var(--primary)" : (isStepCompleted ? "0 0 8px rgba(16, 185, 129, 0.4)" : "none"),
                                  animation: isStepActive ? "pulse-active-step 1.5s infinite" : "none"
                                }}>
                                  {isStepCompleted ? <FiCheckCircle size={14} /> : (idx + 1)}
                                </div>
                                <span style={{
                                  fontSize: "0.8rem",
                                  fontWeight: isStepActive || isStepCompleted ? "600" : "500",
                                  color: textColor,
                                  marginTop: "6px"
                                }}>
                                  {isAr ? stepLabels[stepKey].ar : stepLabels[stepKey].en}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Monotonic Progress Bar with Shimmer */}
                        <div style={{ marginTop: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>
                            <span>
                              {isAr ? "معالجة الصفحات بالتتابع" : "Monotonic Progress"}
                            </span>
                            <span style={{ fontWeight: "700" }}>
                              {job.processedPages} / {job.totalPages} {isAr ? "صفحة" : "pages"} ({displayProgress}%)
                            </span>
                          </div>
                          <div className="job-progressbar-outer" style={{
                            height: "10px",
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            borderRadius: "6px",
                            overflow: "hidden",
                            position: "relative"
                          }}>
                            <div className="job-progressbar-inner" style={{
                              width: `${displayProgress}%`,
                              height: "100%",
                              borderRadius: "6px",
                              background: "linear-gradient(90deg, var(--primary) 0%, #3b82f6 50%, #10b981 100%)",
                              position: "relative",
                              transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
                            }}>
                              <div className="scanning-shimmer" style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                                transform: "translateX(-100%)",
                                animation: "shimmer-slide 1.8s infinite"
                              }} />
                            </div>
                          </div>
                        </div>

                        {/* High-Fidelity Telemetry Trace Breadcrumb */}
                        {(() => {
                          const currentStep = job.current_step || "fetch";
                          const map = isAr ? telemetryMappingAr[currentStep] || telemetryMappingAr.fetch : telemetryMapping[currentStep] || telemetryMapping.fetch;
                          const arrow = isAr ? " ← " : " → ";
                          return (
                            <div className="telemetry-trace-breadcrumb" style={{
                              display: "flex",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "8px",
                              marginTop: "1.25rem",
                              padding: "10px 14px",
                              background: "rgba(255, 255, 255, 0.03)",
                              borderRadius: "8px",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              fontSize: "0.78rem"
                            }}>
                              <span style={{ color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {isAr ? "مسار التتبع الحي:" : "Telemetry Trace:"}
                              </span>
                              <span style={{ color: "var(--primary)", fontWeight: "600", background: "rgba(37, 99, 235, 0.12)", padding: "3px 8px", borderRadius: "4px" }}>
                                {map.stage}
                              </span>
                              <span style={{ color: "#475569" }}>{arrow}</span>
                              <span style={{ color: "#10b981", fontWeight: "600", background: "rgba(16, 185, 129, 0.12)", padding: "3px 8px", borderRadius: "4px" }}>
                                🤖 {map.agent}
                              </span>
                              <span style={{ color: "#475569" }}>{arrow}</span>
                              <span style={{ color: "#a78bfa", fontWeight: "600", background: "rgba(139, 92, 246, 0.12)", padding: "3px 8px", borderRadius: "4px" }}>
                                🛠️ {map.tool}
                              </span>
                              <span style={{ color: "#475569" }}>{arrow}</span>
                              <span style={{ color: "#cbd5e1", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={isAr ? (job.bookTitleAr || job.bookTitle) : job.bookTitle}>
                                📖 {isAr ? (job.bookTitleAr || job.bookTitle) : job.bookTitle}
                              </span>
                              <span style={{ color: "#475569" }}>{arrow}</span>
                              <span style={{ color: "#f43f5e", fontWeight: "700", background: "rgba(244, 63, 94, 0.12)", padding: "3px 8px", borderRadius: "4px" }}>
                                📄 {job.processedPages} / {job.totalPages} pgs
                              </span>
                            </div>
                          );
                        })()}

                        {/* Control Triggers Row */}
                        <div style={{ display: "flex", gap: "10px", marginTop: "1.25rem", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "0.75rem" }}>
                          {isProcessing && (
                            <button
                              type="button"
                              onClick={() => handleControlJob(job.id.replace("job_", ""), job.id, "pause")}
                              className="control-btn"
                              style={{
                                background: "rgba(245, 158, 11, 0.12)",
                                color: "#fbbf24",
                                border: "1px solid rgba(245, 158, 11, 0.25)",
                                borderRadius: "6px",
                                padding: "6px 14px",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "all 0.2s"
                              }}
                            >
                              <FiPause /> {isAr ? "إيقاف مؤقت" : "Pause"}
                            </button>
                          )}
                          {isPaused && (
                            <button
                              type="button"
                              onClick={() => handleControlJob(job.id.replace("job_", ""), job.id, "resume")}
                              className="control-btn"
                              style={{
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#34d399",
                                border: "1px solid rgba(16, 185, 129, 0.25)",
                                borderRadius: "6px",
                                padding: "6px 14px",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "all 0.2s"
                              }}
                            >
                              <FiPlay /> {isAr ? "استئناف" : "Resume"}
                            </button>
                          )}
                          {isProcessing && (
                            <button
                              type="button"
                              onClick={() => handleControlJob(job.id.replace("job_", ""), job.id, "stop")}
                              className="control-btn"
                              style={{
                                background: "rgba(239, 68, 68, 0.12)",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.25)",
                                borderRadius: "6px",
                                padding: "6px 14px",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "all 0.2s"
                              }}
                            >
                              <FiSquare /> {isAr ? "إيقاف" : "Stop"}
                            </button>
                          )}
                          {(isProcessing || isPaused || isFailed) && (
                            <button
                              type="button"
                              onClick={() => handleControlJob(job.id.replace("job_", ""), job.id, "kill")}
                              className="control-btn"
                              style={{
                                background: "rgba(185, 28, 28, 0.18)",
                                color: "#fca5a5",
                                border: "1px solid rgba(220, 38, 38, 0.3)",
                                borderRadius: "6px",
                                padding: "6px 14px",
                                fontSize: "0.8rem",
                                fontWeight: "700",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "all 0.2s"
                              }}
                            >
                              <FiSlash /> {isAr ? "إنهاء فوراً (Kill)" : "Kill Job"}
                            </button>
                          )}
                        </div>

                        {/* Live Step-by-Step logs nested in job */}
                        {job.logs && job.logs.length > 0 && (
                          <div style={{ marginTop: "1rem" }}>
                            <label style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase", marginBottom: "6px" }}>
                              <FiTerminal /> {isAr ? "سجل التتبع الخاص بالمهمة" : "Active Ingestion Trace Logs"}
                            </label>
                            <div className="terminal-logs-window" style={{
                              maxHeight: "150px",
                              overflowY: "auto",
                              background: "rgba(0, 0, 0, 0.35)",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              borderRadius: "6px",
                              padding: "0.75rem",
                              fontSize: "0.75rem",
                              fontFamily: "var(--font-mono, monospace)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px"
                            }}>
                              {job.logs.map((logLine, lIdx) => {
                                // Colorize logs based on keywords
                                let lineStyle: React.CSSProperties = { color: "#e2e8f0" };
                                const lowerLine = logLine.toLowerCase();
                                if (lowerLine.includes("error") || lowerLine.includes("fail") || lowerLine.includes("exception")) {
                                  lineStyle = { color: "#f87171", fontWeight: "600", borderLeft: "3px solid #ef4444", paddingLeft: "6px" };
                                } else if (lowerLine.includes("success") || lowerLine.includes("completed") || lowerLine.includes("done")) {
                                  lineStyle = { color: "#34d399", fontWeight: "600", borderLeft: "3px solid #10b981", paddingLeft: "6px" };
                                } else if (lowerLine.includes("fetch") || lowerLine.includes("download")) {
                                  lineStyle = { color: "var(--primary)", borderLeft: "3px solid #3b82f6", paddingLeft: "6px" };
                                } else if (lowerLine.includes("translate")) {
                                  lineStyle = { color: "#fbbf24", borderLeft: "3px solid #f59e0b", paddingLeft: "6px" };
                                } else if (lowerLine.includes("embed") || lowerLine.includes("vector")) {
                                  lineStyle = { color: "#a78bfa", borderLeft: "3px solid #8b5cf6", paddingLeft: "6px" };
                                }
                                return (
                                  <div key={lIdx} style={{
                                    ...lineStyle,
                                    lineHeight: 1.4,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all"
                                  }}>
                                    {logLine}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
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
