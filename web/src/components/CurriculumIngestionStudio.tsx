import React, { useState, useEffect, useRef } from "react";
import {
  FiBookOpen,
  FiPlus,
  FiRefreshCw,
  FiZap,
  FiList,
  FiTrash2,
  FiSearch,
  FiCpu,
  FiClock,
  FiHardDrive,
  FiActivity,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiCheck,
  FiDownloadCloud,
  FiTerminal,
  FiPlay,
  FiPause,
  FiXCircle,
  FiCheckCircle,
  FiAlertCircle,
  FiSliders,
  FiChevronRight
} from "react-icons/fi";

interface Subject {
  _id: string;
  name: string;
  name_ar: string;
  grade_level: string;
  category: string;
  icon_emoji: string;
  books_count?: number;
}

interface ChapterSegment {
  id?: string;
  title: string;
  title_ar: string;
  page_start: number;
  page_end: number;
  concepts: string[];
}

interface QueueJob {
  id: string;
  fileName: string;
  bookTitle: string;
  bookTitleAr: string;
  subjectName: string;
  status: "idle" | "processing" | "completed" | "paused" | "failed";
  progress: number; // 0 to 100
  totalPages: number;
  processedPages: number;
  speed: number; // pages/sec
  eta: number; // seconds
  startTime: number;
}

export default function CurriculumIngestionStudio({ language, email }: { language: string; email?: string }) {
  // Lists and loading
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  // Subject Form States
  const [subjName, setSubjName] = useState("");
  const [subjNameAr, setSubjNameAr] = useState("");
  const [subjGrade, setSubjGrade] = useState("Grade 11");
  const [subjCategory, setSubjCategory] = useState("Science");
  const [subjEmoji, setSubjEmoji] = useState("🔬");
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [subjectSuccess, setSubjectSuccess] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  // Book Form States
  const [bookSubjId, setBookSubjId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookTitleAr, setBookTitleAr] = useState("");
  const [bookGrade, setBookGrade] = useState("Grade 11");
  const [bookTerm, setBookTerm] = useState("Term 1");
  const [bookYear, setBookYear] = useState("2026");
  const [bookLang, setBookLang] = useState("ar");
  const [bookType, setBookType] = useState("core");
  const [bookSourceUrl, setBookSourceUrl] = useState("");
  const [bookStoragePath, setBookStoragePath] = useState("");
  const [pendingChapters, setPendingChapters] = useState<ChapterSegment[]>([]);

  // Interactive Chapter Builder States
  const [chTitle, setChTitle] = useState("");
  const [chTitleAr, setChTitleAr] = useState("");
  const [chStartPage, setChStartPage] = useState<number>(1);
  const [chEndPage, setChEndPage] = useState<number>(15);
  const [chConcepts, setChConcepts] = useState("");

  const [isIngestingBook, setIsIngestingBook] = useState(false);
  const [bookSuccess, setBookSuccess] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);

  // Web Crawler / Exploration Studio States
  const [crawlUrl, setBookCrawlUrl] = useState("https://ellibrary.moe.gov.eg");
  const [crawlMaxDepth, setCrawlDepth] = useState<number>(2);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlLogs, setCrawlLogs] = useState<string[]>([]);
  const [discoveredResources, setDiscoveredResources] = useState<any[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<"all" | "pdf" | "html">("pdf");

  // Ingestion Queue States
  const [queue, setQueue] = useState<QueueJob[]>([
    {
      id: "job_01",
      fileName: "Ministry_Physics_Grade11_Part1.pdf",
      bookTitle: "Physics Eleventh Grade Vol 1",
      bookTitleAr: "الفيزياء للصف الحادي عشر - الجزء الأول",
      subjectName: "Physics",
      status: "completed",
      progress: 100,
      totalPages: 168,
      processedPages: 168,
      speed: 0,
      eta: 0,
      startTime: Date.now() - 1200000
    },
    {
      id: "job_02",
      fileName: "Ministry_Chemistry_Grade11_Part2.pdf",
      bookTitle: "Organic Chemistry Principles",
      bookTitleAr: "مبادئ الكيمياء العضوية",
      subjectName: "Chemistry",
      status: "idle",
      progress: 0,
      totalPages: 240,
      processedPages: 0,
      speed: 0,
      eta: 0,
      startTime: 0
    },
    {
      id: "job_03",
      fileName: "Advanced_English_Interactive_Tutor.pdf",
      bookTitle: "High School English Level II",
      bookTitleAr: "اللغة الإنجليزية المتقدمة - المستوى الثاني",
      subjectName: "Languages",
      status: "idle",
      progress: 0,
      totalPages: 112,
      processedPages: 0,
      speed: 0,
      eta: 0,
      startTime: 0
    }
  ]);

  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[SYSTEM] Ingestion Studio Queue initialized.",
    "[INFO] Cloud Run Async Executor listening on secure gcp-vpc router.",
    "[DEBUG] Shared lock system active on MongoDB Atlas primary database."
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const crawlerEndRef = useRef<HTMLDivElement>(null);

  // Load and fetch initial subjects
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

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Auto-scroll terminal log
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  useEffect(() => {
    if (crawlerEndRef.current) {
      crawlerEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [crawlLogs]);

  // Real-time Queue Processor Simulation Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setQueue((prevQueue) => {
        // Find the first job that is either "processing" or "idle" to work on
        const activeIdx = prevQueue.findIndex((job) => job.status === "processing");
        
        if (activeIdx === -1) {
          // No processing job. If there is an 'idle' job, make it processing!
          const idleIdx = prevQueue.findIndex((job) => job.status === "idle");
          if (idleIdx !== -1) {
            const updated = [...prevQueue];
            updated[idleIdx] = {
              ...updated[idleIdx],
              status: "processing",
              startTime: Date.now(),
              speed: parseFloat((Math.random() * 8 + 12).toFixed(1)) // 12-20 pages per sec
            };
            addTerminalLog(`[LAUNCH] Initializing asynchronous Cloud Run Job container for ${updated[idleIdx].fileName}...`);
            addTerminalLog(`[STORAGE] Downloading direct binary payload from ${updated[idleIdx].fileName}`);
            addTerminalLog(`[OCR] Optical Character Recognition pipeline spinning up...`);
            return updated;
          }
          return prevQueue;
        }

        const updated = [...prevQueue];
        const activeJob = updated[activeIdx];

        // Increment processed pages
        const speed = parseFloat((Math.random() * 4 + 14).toFixed(1)); // fluctuate speed slightly
        const increment = Math.ceil(speed * 1.5); // page processing per ticker
        const newProcessed = Math.min(activeJob.processedPages + increment, activeJob.totalPages);
        const progress = Math.round((newProcessed / activeJob.totalPages) * 100);
        
        // Calculate dynamic ETA
        const remainingPages = activeJob.totalPages - newProcessed;
        const eta = remainingPages > 0 ? Math.ceil(remainingPages / speed) : 0;

        // Logging events periodically
        if (newProcessed > activeJob.processedPages && newProcessed < activeJob.totalPages) {
          if (Math.random() > 0.6) {
            addTerminalLog(
              `[PROCESSING] [${activeJob.fileName}] Parsed pages ${activeJob.processedPages}-${newProcessed}. Executing semantic text chunking...`
            );
          }
          if (Math.random() > 0.75) {
            addTerminalLog(
              `[VECTOR_ARMOR] [${activeJob.fileName}] Generating 1536-dim embeddings via Gemini Text-Embedding-004. Batch size: 16`
            );
          }
        }

        if (newProcessed >= activeJob.totalPages) {
          // Finished!
          updated[activeIdx] = {
            ...activeJob,
            status: "completed",
            progress: 100,
            processedPages: activeJob.totalPages,
            speed: 0,
            eta: 0
          };
          addTerminalLog(`[VECTOR_INDEX] [${activeJob.fileName}] Ingested ${activeJob.totalPages} pages into MongoDB Atlas Vector clusters successfully!`);
          addTerminalLog(`[SUCCESS] Cloud Run Ingestion Job ${activeJob.id} finished successfully. Container teardown in progress.`);
        } else {
          updated[activeIdx] = {
            ...activeJob,
            processedPages: newProcessed,
            progress,
            speed,
            eta
          };
        }

        return updated;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [queue]);

  const addTerminalLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
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
        addTerminalLog(`[CATALOG] Admin added new subject schema: ${subjName} (${subjGrade})`);
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
    const newCh: ChapterSegment = {
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
    setChEndPage(Number(chEndPage) + 15);
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
      // 1. Commit metadata real-time to MongoDB
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
        setBookSuccess(
          language === "ar" 
            ? "📚 تم حفظ مسودة الكتاب بنجاح وإرسال مهمة المعالجة اللامركزية!" 
            : "📚 Book metadata committed. Processing task pushed to Cloud Run Job queue!"
        );

        // 2. Add to local simulated Ingestion Queue representing GCP Cloud Run Job
        const targetSubject = subjectsList.find(s => s._id === bookSubjId);
        const subjectName = targetSubject ? targetSubject.name : "Curriculum";
        const cleanFileName = bookSourceUrl 
          ? bookSourceUrl.split("/").pop() || `${bookTitle.replace(/\s+/g, "_")}.pdf` 
          : `${bookTitle.replace(/\s+/g, "_")}.pdf`;

        const newJob: QueueJob = {
          id: `job_${Date.now()}`,
          fileName: cleanFileName,
          bookTitle,
          bookTitleAr,
          subjectName,
          status: "idle",
          progress: 0,
          totalPages: pendingChapters.length > 0 ? pendingChapters[pendingChapters.length - 1].page_end : 120,
          processedPages: 0,
          speed: 0,
          eta: 0,
          startTime: 0
        };

        setQueue(prev => [...prev, newJob]);
        addTerminalLog(`[QUEUE] Pushed async processing job to GCP Cloud Run pool for: ${cleanFileName}`);

        // Reset form
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

  // Simulated Crawler & Content Discovery
  const handleStartCrawling = () => {
    if (!crawlUrl) return;
    setIsCrawling(true);
    setCrawlLogs([]);
    setDiscoveredResources([]);

    const logMessages = [
      `Initializing premium web spider agent targeting ${crawlUrl}...`,
      "Enforcing strict compliance with robots.txt policy... Allowed",
      "Scanning target server HTML anchors & metadata tags...",
      `Crawling level 1: Resolving page references up to max_depth: ${crawlMaxDepth}`,
      "Discovered index: /downloads/education/curriculums",
      "Parsing educational node list for direct PDF textbook repositories...",
      "Found potential textbook: Physics_Grade12_Electricity_and_Magnetism_v2.pdf",
      "Found potential textbook: High_School_Arabic_Grammar_and_Poetry_Grade11.pdf",
      "Found potential textbook: Advanced_Biology_Cells_and_Heredity_G12.pdf",
      "Resolving download URLs & page segment counts...",
      "Spider crawled successfully. Consolidated 3 high-quality textbooks ready for direct ingestion."
    ];

    let currentMsgIdx = 0;
    const logInterval = setInterval(() => {
      if (currentMsgIdx < logMessages.length) {
        const timestamp = new Date().toLocaleTimeString();
        setCrawlLogs((prev) => [...prev, `[${timestamp}] 🕷️ ${logMessages[currentMsgIdx]}`]);
        currentMsgIdx++;
      } else {
        clearInterval(logInterval);
        setIsCrawling(false);
        setDiscoveredResources([
          {
            title: "Physics Grade 12 - Electricity & Magnetism",
            titleAr: "الفيزياء للصف الثاني عشر - الكهرباء والمغناطيسية",
            subject: "Physics",
            subjectId: subjectsList.find(s => s.name.toLowerCase().includes("physic"))?._id || "",
            fileName: "Physics_Grade12_Electricity_and_Magnetism_v2.pdf",
            url: "https://ellibrary.moe.gov.eg/downloads/Physics_Grade12_Electricity_and_Magnetism_v2.pdf",
            totalPages: 184,
            chapters: [
              { title: "Static Electricity", title_ar: "الكهرباء الساكنة", page_start: 1, page_end: 45, concepts: ["charge", "coulomb", "electric field"] },
              { title: "Electric Currents", title_ar: "التيار الكهربائي", page_start: 46, page_end: 110, concepts: ["ohm law", "resistors", "kirchhoff"] },
              { title: "Magnetic Fields", title_ar: "المجالات المغناطيسية", page_start: 111, page_end: 184, concepts: ["magnetic flux", "ampere law", "faraday"] }
            ]
          },
          {
            title: "High School Arabic Grammar",
            titleAr: "قواعد النحو العربي - المرحلة الثانوية",
            subject: "Languages",
            subjectId: subjectsList.find(s => s.name.toLowerCase().includes("lang"))?._id || "",
            fileName: "High_School_Arabic_Grammar_and_Poetry_Grade11.pdf",
            url: "https://ellibrary.moe.gov.eg/downloads/High_School_Arabic_Grammar_and_Poetry_Grade11.pdf",
            totalPages: 96,
            chapters: [
              { title: "The Nominative Cases", title_ar: "المرفوعات من الأسماء", page_start: 1, page_end: 30, concepts: ["المبتدأ والخبر", "فاعل", "اسم كان"] },
              { title: "The Accusative Cases", title_ar: "المنصوبات من الأسماء", page_start: 31, page_end: 70, concepts: ["المفاعيل الخمسة", "خبر كان", "حال"] }
            ]
          },
          {
            title: "Advanced Biology G12 - Cells & Heredity",
            titleAr: "الأحياء المتقدمة - الخلايا والوراثة",
            subject: "Science",
            subjectId: subjectsList.find(s => s.name.toLowerCase().includes("science"))?._id || "",
            fileName: "Advanced_Biology_Cells_and_Heredity_G12.pdf",
            url: "https://ellibrary.moe.gov.eg/downloads/Advanced_Biology_Cells_and_Heredity_G12.pdf",
            totalPages: 210,
            chapters: [
              { title: "Cellular Structure", title_ar: "تركيب الخلية ووظيفتها", page_start: 1, page_end: 65, concepts: ["organelles", "mitochondria", "membrane"] },
              { title: "Molecular Genetics", title_ar: "علم الوراثة الجزيئي", page_start: 66, page_end: 140, concepts: ["DNA replication", "transcription", "translation"] }
            ]
          }
        ]);
      }
    }, 1000);
  };

  const handlePreFillFromCrawler = (res: any) => {
    setBookTitle(res.title);
    setBookTitleAr(res.titleAr);
    setBookSourceUrl(res.url);
    setBookStoragePath(`/fahem-core-store/textbooks/${res.fileName}`);
    setPendingChapters(res.chapters);
    if (res.subjectId) {
      setBookSubjId(res.subjectId);
    }
    addTerminalLog(`[CRAWLER] Auto-filled book schema from discovered resource: ${res.fileName}`);
  };

  const handleCancelJob = (id: string) => {
    setQueue(prev => prev.filter(job => job.id !== id));
    addTerminalLog(`[QUEUE] Terminated Ingestion Job ${id} on Cloud Run cluster.`);
  };

  // Queue states calculation helper
  const activeProcessingJob = queue.find(j => j.status === "processing");
  const idleJobsCount = queue.filter(j => j.status === "idle").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%" }}>
      
      {/* premium architectural layout card */}
      <div style={{
        background: "linear-gradient(135deg, rgba(16, 107, 163, 0.08) 0%, rgba(27, 163, 156, 0.04) 100%)",
        border: "1px solid rgba(16, 107, 163, 0.15)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--secondary), var(--primary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(16, 107, 163, 0.2)",
            color: "#ffffff"
          }}>
            <FiCpu style={{ fontSize: "1.5rem", animation: isCrawling || activeProcessingJob ? "spin 6s linear infinite" : "none" }} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.3rem", margin: 0, fontWeight: 800, color: "var(--primary)" }}>
              {language === "ar" ? "أستوديو استيراد ومعالجة المناهج الدراسيّة" : "Curriculum & Books Ingestion Studio"}
            </h2>
            <p style={{ margin: "0.25rem 0 0 0", color: "#4f6371", fontSize: "0.85rem" }}>
              {language === "ar"
                ? "قنوات معالجة غير متزامنة تماماً مدعومة بـ GCP Cloud Run لتهيئة المناهج واستخلاص الأفكار وتحويلها لمصادر معرفية دون التأثير على وكلاء التدريس النشطين."
                : "Decoupled asynchronous processing pipelines powered by independent GCP Cloud Run Jobs to ingest and index textbook context without disrupting student-facing agent swarms."}
            </p>
          </div>
        </div>

        {/* Architectural Isolation Diagram */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          marginTop: "0.75rem",
          background: "rgba(255,255,255,0.4)",
          padding: "1rem",
          borderRadius: "12px",
          border: "1px dashed var(--card-border)"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-green)", animation: "pulse 1.5s infinite" }} />
              {language === "ar" ? "1. خادم وكيل تدريس الطلاب (نشط ومحمي)" : "1. Student Tutor Agent Cluster (Active & Protected)"}
            </span>
            <p style={{ fontSize: "0.7rem", color: "#5a6e7c", margin: 0 }}>
              {language === "ar"
                ? "خوادم stateless مخصصة للردود اللحظية والتفاعل المباشر للطلبة في الفصول الافتراضية. معزولة 100% عن العمليات الرياضية وحساب المتجهات الثقيلة."
                : "Stateless container app dedicated exclusively to ultra-fast student chats and real-time agent responses. Isolated fully from heavy CPU-bound parsing operations."}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", borderInlineStart: "2px solid rgba(16, 107, 163, 0.1)", paddingInlineStart: "1rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--secondary)", animation: activeProcessingJob ? "pulse 1s infinite" : "none" }} />
              {language === "ar" ? "2. مشغل معالجة المناهج (GCP Cloud Run Job)" : "2. Ingestion Pipeline (GCP Cloud Run Job)"}
            </span>
            <p style={{ fontSize: "0.7rem", color: "#5a6e7c", margin: 0 }}>
              {language === "ar"
                ? "حاويات مهام (Jobs) تدور عند الطلب لاستخلاص النصوص بالـ OCR وتوليد المتجهات (Embeddings) وحفظها بقاعدة MongoDB Atlas. معزولة حاسوبياً."
                : "On-demand containerized batch tasks triggered asynchronously to perform intensive OCR, multi-page chunking, vector generation, and Atlas index publishing."}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Crawl Discovery & Ingestion Studio Progress Monitor */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "1.5rem"
      }}>
        
        {/* ROW 1: Real-time Cloud Run Async Pipeline Telemetry Console */}
        <section className="panel-card" style={{ width: "100%", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <FiActivity style={{ color: "var(--secondary)" }} />
              <span>{language === "ar" ? "مراقب قنوات الاستيراد غير المتزامنة" : "Cloud Run Async Jobs Telemetry Console"}</span>
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: "10px",
                background: activeProcessingJob ? "rgba(39, 174, 96, 0.1)" : "rgba(100, 116, 139, 0.1)",
                color: activeProcessingJob ? "var(--accent-green)" : "#64748b",
                fontWeight: 700
              }}>
                {activeProcessingJob 
                  ? (language === "ar" ? "جاري المعالجة نشط" : "ACTIVE EXECUTING") 
                  : (language === "ar" ? "الانتظار فارغ" : "QUEUE EMPTY")}
              </span>
            </div>
          </div>

          {/* Active Job Dashboard Panel */}
          {activeProcessingJob ? (
            <div style={{
              background: "rgba(16, 107, 163, 0.04)",
              border: "1px solid rgba(16, 107, 163, 0.15)",
              borderRadius: "12px",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginBottom: "1rem"
            }}>
              {/* Job Info Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1rem"
              }}>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block", textTransform: "uppercase" }}>
                    {language === "ar" ? "الكتاب الجاري معالجته" : "CURRENT PROCESSING BOOK"}
                  </span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)", display: "block", marginTop: "2px" }}>
                    📖 {language === "ar" ? activeProcessingJob.bookTitleAr : activeProcessingJob.bookTitle}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#4f6371", fontStyle: "italic", marginTop: "2px", display: "block" }}>
                    {activeProcessingJob.fileName}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block", textTransform: "uppercase" }}>
                    {language === "ar" ? "سرعة الاستيراد والـ OCR" : "INGESTION VELOCITY"}
                  </span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--secondary)", fontFamily: "var(--font-mono)", display: "block", marginTop: "2px" }}>
                    ⚡ {activeProcessingJob.speed} {language === "ar" ? "صفحات / ثانية" : "pages/sec"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block", textTransform: "uppercase" }}>
                    {language === "ar" ? "الوقت التقديري المتبقي" : "ESTIMATED TIME OF ARRIVAL (ETA)"}
                  </span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--accent-orange)", fontFamily: "var(--font-mono)", display: "block", marginTop: "2px" }}>
                    ⏱️ {activeProcessingJob.eta} {language === "ar" ? "ثواني متبقية" : "seconds left"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block", textTransform: "uppercase" }}>
                    {language === "ar" ? "المهام المتبقية في قائمة الانتظار" : "QUEUE REMAINING ITEMS"}
                  </span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--foreground)", fontFamily: "var(--font-mono)", display: "block", marginTop: "2px" }}>
                    📦 {idleJobsCount} {language === "ar" ? "كتب قيد الانتظار" : "books pending"}
                  </span>
                </div>
              </div>

              {/* Progress Bar Component */}
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px" }}>
                  <span>{language === "ar" ? `تحليل ونمذجة المستند: صفحة ${activeProcessingJob.processedPages} من أصل ${activeProcessingJob.totalPages}` : `Analyzing: page ${activeProcessingJob.processedPages} of ${activeProcessingJob.totalPages}`}</span>
                  <span>{activeProcessingJob.progress}%</span>
                </div>
                <div style={{ width: "100%", height: "10px", background: "rgba(16, 107, 163, 0.1)", borderRadius: "5px", overflow: "hidden" }}>
                  <div style={{
                    width: `${activeProcessingJob.progress}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%)",
                    borderRadius: "5px",
                    transition: "width 0.4s ease-in-out"
                  }} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: "rgba(255, 255, 255, 0.4)",
              border: "1px dashed var(--card-border)",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              marginBottom: "1rem"
            }}>
              <FiCheckCircle style={{ fontSize: "2rem", color: "var(--accent-green)", marginBottom: "0.5rem" }} />
              <h4 style={{ fontSize: "1rem", margin: 0, fontWeight: 700 }}>
                {language === "ar" ? "كل المهام غير المتزامنة منتهية بالكامل!" : "All asynchronous processing jobs completed!"}
              </h4>
              <p style={{ margin: "0.25rem 0 0 0", color: "#64748b", fontSize: "0.8rem" }}>
                {language === "ar" 
                  ? "قائمة الانتظار فارغة حالياً. أضف كتاباً دراسياً جديداً أو ابحث في المناهج بالأسفل لبدء مهمة معالجة متجهات ذكية."
                  : "The queue is currently idle. Ingest a new textbook or use the crawler below to kick off a Cloud Run index process."}
              </p>
            </div>
          )}

          {/* Stepper Pipeline Indicators */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            background: "rgba(255,255,255,0.45)",
            border: "1px solid var(--card-border)",
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "1rem"
          }}>
            {[
              { labelAr: "استيراد والتحقق", labelEn: "1. Download & Lock", status: activeProcessingJob ? (activeProcessingJob.progress > 15 ? "done" : "current") : "done" },
              { labelAr: "المسح والـ OCR الذكي", labelEn: "2. OCR & PDF Parse", status: activeProcessingJob ? (activeProcessingJob.progress > 45 ? "done" : activeProcessingJob.progress > 15 ? "current" : "pending") : "done" },
              { labelAr: "التقطيع وتوليد المتجهات", labelEn: "3. Semantic Embeds", status: activeProcessingJob ? (activeProcessingJob.progress > 75 ? "done" : activeProcessingJob.progress > 45 ? "current" : "pending") : "done" },
              { labelAr: "الفهرسة والمزامنة", labelEn: "4. Database Publish", status: activeProcessingJob ? (activeProcessingJob.progress > 95 ? "done" : activeProcessingJob.progress > 75 ? "current" : "pending") : "done" }
            ].map((step, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                opacity: step.status === "pending" ? 0.5 : 1,
                transition: "all 0.3s"
              }}>
                <div style={{
                  width: "1.5rem",
                  height: "1.5rem",
                  borderRadius: "50%",
                  background: step.status === "done" 
                    ? "var(--accent-green)" 
                    : step.status === "current" 
                      ? "var(--secondary)" 
                      : "rgba(100,116,139,0.15)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  animation: step.status === "current" ? "pulse 1.5s infinite" : "none"
                }}>
                  {step.status === "done" ? "✓" : idx + 1}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                    {language === "ar" ? step.labelAr : step.labelEn}
                  </span>
                  <span style={{ fontSize: "0.6rem", color: "#64748b" }}>
                    {step.status === "done" 
                      ? (language === "ar" ? "منتهي" : "COMPLETED") 
                      : step.status === "current" 
                        ? (language === "ar" ? "قيد العمل" : "PROCESSING") 
                        : (language === "ar" ? "قيد الانتظار" : "PENDING")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Cloud Run Terminal Log */}
          <div style={{
            background: "#0d1117",
            border: "1px solid #21262d",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            maxHeight: "150px",
            overflowY: "auto",
            boxShadow: "inset 0 4px 16px rgba(0,0,0,0.8)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #21262d", paddingBottom: "4px", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "#8b949e", display: "flex", alignItems: "center", gap: "4px" }}>
                <FiTerminal /> GCP_CLOUD_RUN_JOB_LOGGER
              </span>
              <span style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", color: "#58a6ff" }}>
                STATUS: 200 OK
              </span>
            </div>
            {terminalLogs.map((log, idx) => {
              let color = "#c9d1d9";
              if (log.includes("[SUCCESS]")) color = "#3fb950";
              else if (log.includes("[LAUNCH]")) color = "#58a6ff";
              else if (log.includes("[VECTOR]")) color = "#ff7b72";
              else if (log.includes("[PROCESSING]")) color = "#d2a8ff";
              return (
                <div key={idx} style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.7rem",
                  lineHeight: "1rem",
                  color: color,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all"
                }}>
                  {log}
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>

          {/* Queue List Table */}
          <div style={{ marginTop: "1rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4f6371", display: "block", marginBottom: "0.5rem" }}>
              📋 {language === "ar" ? "سجل وجدول مهام الاستيراد المعلقة" : "Ingestion Cluster Task Schedule"}
            </span>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: language === "ar" ? "right" : "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--card-border)", color: "#4f6371" }}>
                    <th style={{ padding: "0.5rem" }}>{language === "ar" ? "رقم المهمة" : "Job ID"}</th>
                    <th style={{ padding: "0.5rem" }}>{language === "ar" ? "المستند" : "File Name"}</th>
                    <th style={{ padding: "0.5rem" }}>{language === "ar" ? "المادة" : "Subject"}</th>
                    <th style={{ padding: "0.5rem" }}>{language === "ar" ? "نسبة التقدم" : "Progress"}</th>
                    <th style={{ padding: "0.5rem" }}>{language === "ar" ? "الحالة" : "Status"}</th>
                    <th style={{ padding: "0.5rem", textAlign: "center" }}>{language === "ar" ? "التحكم" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((job) => (
                    <tr key={job.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td style={{ padding: "0.5rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 700 }}>{job.id}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700 }}>{language === "ar" ? job.bookTitleAr : job.bookTitle}</span>
                          <span style={{ fontSize: "0.65rem", color: "#64748b" }}>{job.fileName}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.5rem" }}>{job.subjectName}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: "60px", height: "6px", background: "rgba(100,116,139,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${job.progress}%`, height: "100%", background: job.status === "completed" ? "var(--accent-green)" : "var(--secondary)" }} />
                          </div>
                          <span>{job.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <span style={{
                          fontSize: "0.7rem",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: job.status === "completed" ? "rgba(39, 174, 96, 0.08)" : job.status === "processing" ? "rgba(16, 107, 163, 0.08)" : "rgba(100, 116, 139, 0.08)",
                          color: job.status === "completed" ? "var(--accent-green)" : job.status === "processing" ? "var(--primary)" : "#64748b",
                          fontWeight: 700
                        }}>
                          {job.status === "completed" 
                            ? (language === "ar" ? "✓ مكتمل" : "Completed") 
                            : job.status === "processing" 
                              ? (language === "ar" ? "🌀 قيد العمل" : "Processing") 
                              : (language === "ar" ? "⏳ في الانتظار" : "Pending")}
                        </span>
                      </td>
                      <td style={{ padding: "0.5rem", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleCancelJob(job.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#d32f2f",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            opacity: job.status === "completed" ? 0.3 : 1
                          }}
                          disabled={job.status === "completed"}
                          title="Terminate Job"
                        >
                          <FiXCircle />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ROW 2: Crawl & Discover Module */}
        <section className="panel-card" style={{ width: "100%", padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: "0 0 1rem 0", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>
            <FiGlobe style={{ color: "var(--primary)" }} />
            <span>{language === "ar" ? "أداة الاستكشاف والزحف الإلكتروني للكتب" : "Curriculum Crawler & Web Exploration Studio"}</span>
          </h3>
          <p style={{ color: "#4f6371", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {language === "ar"
              ? "أدخل رابط بوابة المناهج التعليمية أو مكتبة المدرسة الرقمية لاستكشاف الكتب وملفات الـ PDF آلياً واستخلاص هيكلية الفصول منها لتجهيزها للاستيراد بلمسة واحدة."
              : "Discover dynamic textbook references directly from portal links. Crawl catalogs, auto-detect chapter segments, and feed them into the ingestion workflow with one click."}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {/* Crawler Parameters Panel */}
            <div style={{
              background: "rgba(255, 255, 255, 0.45)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem"
            }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.25rem", display: "block" }}>
                ⚙️ {language === "ar" ? "عوامل زحف الشبكة" : "Spider Parameters Configuration"}
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "رابط البوابة المستهدفة" : "Target School / Portal Domain"}</label>
                <input
                  type="url"
                  placeholder="https://ellibrary.moe.gov.eg"
                  value={crawlUrl}
                  onChange={(e) => setBookCrawlUrl(e.target.value)}
                  style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "عمق الزحف (Max Depth)" : "Recursion Depth"}</label>
                  <select
                    value={crawlMaxDepth}
                    onChange={(e) => setCrawlDepth(Number(e.target.value))}
                    style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem" }}
                  >
                    <option value={1}>1 (Single Page)</option>
                    <option value={2}>2 (Standard Links)</option>
                    <option value={3}>3 (Deep Recursion)</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "نوع الملفات" : "Format Filter"}</label>
                  <select
                    value={selectedFormat}
                    onChange={(e: any) => setSelectedFormat(e.target.value)}
                    style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem" }}
                  >
                    <option value="pdf">Direct PDF textbooks</option>
                    <option value="html">Educational Web Pages</option>
                    <option value="all">All Content</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartCrawling}
                disabled={isCrawling || !crawlUrl}
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: (isCrawling || !crawlUrl) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  marginTop: "0.5rem"
                }}
              >
                {isCrawling ? (
                  <>
                    <FiRefreshCw className="spinning-icon" />
                    <span>{language === "ar" ? "جاري استكشاف الموقع..." : "Crawling educational nodes..."}</span>
                  </>
                ) : (
                  <>
                    <FiSearch />
                    <span>{language === "ar" ? "ابدأ الزحف والاستكشاف آلياً" : "Crawl & Explore Library"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Crawler Terminal Output */}
            <div style={{
              background: "#0c0f13",
              border: "1px solid #1a202c",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              height: "220px",
              overflowY: "auto",
              boxShadow: "inset 0 4px 12px rgba(0,0,0,0.6)"
            }}>
              <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "#6a7c88", borderBottom: "1px solid #1a202c", paddingBottom: "4px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                🕷️ CRAWLER_EXPLORER_CONSOLE_OUTPUT
              </span>
              {crawlLogs.length === 0 ? (
                <div style={{ color: "#4f6371", fontSize: "0.75rem", fontFamily: "var(--font-mono)", textAlign: "center", marginTop: "3rem" }}>
                  {language === "ar" ? "بوابة الزحف جاهزة للاستكشاف" : "Crawler idle. Configure and launch a crawl."}
                </div>
              ) : (
                crawlLogs.map((log, idx) => (
                  <div key={idx} style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    lineHeight: "1rem",
                    color: "#a0aec0"
                  }}>
                    {log}
                  </div>
                ))
              )}
              <div ref={crawlerEndRef} />
            </div>
          </div>

          {/* Crawled Results Shelf */}
          {discoveredResources.length > 0 && (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", display: "block" }}>
                🔍 {language === "ar" ? "الكتب المستكشفة الجاهزة للاستيراد" : "Discovered Assets Ready for Cloud Run Ingestion"}
              </span>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "0.75rem"
              }}>
                {discoveredResources.map((res, index) => (
                  <div key={index} style={{
                    background: "rgba(255,255,255,0.55)",
                    border: "1px solid var(--card-border)",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--foreground)", display: "block" }}>
                        📖 {language === "ar" ? res.titleAr : res.title}
                      </span>
                      <span style={{ fontSize: "0.65rem", color: "#64748b", display: "block", marginTop: "2px" }}>
                        Format: PDF • {res.totalPages} pages • Subject: {res.subject}
                      </span>
                    </div>
                    <button
                      onClick={() => handlePreFillFromCrawler(res)}
                      type="button"
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid var(--primary)",
                        background: "transparent",
                        color: "var(--primary)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px"
                      }}
                    >
                      <FiDownloadCloud />
                      <span>{language === "ar" ? "تجهيز" : "Import"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ROW 3: CRUD Subject & Book Metadata Commit Controls */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem"
        }}>
          
          {/* Column 3.1: Add New Subject Schema */}
          <section className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", margin: 0 }}>
              <FiPlus style={{ color: "var(--primary)" }} />
              <span>{language === "ar" ? "إضافة مادة دراسية جديدة" : "Add New Subject Schema"}</span>
            </h3>

            {subjectError && (
              <div style={{ padding: "0.5rem", background: "rgba(211, 47, 47, 0.08)", border: "1px solid rgba(211, 47, 47, 0.15)", borderRadius: "4px", color: "#f87171", fontSize: "0.8rem" }}>
                {subjectError}
              </div>
            )}
            {subjectSuccess && (
              <div style={{ padding: "0.5rem", background: "rgba(39, 174, 96, 0.08)", border: "1px solid rgba(39, 174, 96, 0.15)", borderRadius: "4px", color: "var(--accent-green)", fontSize: "0.8rem" }}>
                {subjectSuccess}
              </div>
            )}

            <form onSubmit={handleCreateSubject} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "اسم المادة (إنجليزي)" : "Subject Name (English)"}</label>
                <input
                  type="text"
                  placeholder="e.g. Pure Mathematics"
                  value={subjName}
                  onChange={(e) => setSubjName(e.target.value)}
                  required
                  style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "اسم المادة (عربي)" : "Subject Name (Arabic)"}</label>
                <input
                  type="text"
                  placeholder="مثال: الرياضيات البحتة"
                  value={subjNameAr}
                  onChange={(e) => setSubjNameAr(e.target.value)}
                  required
                  style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem", fontFamily: "Cairo, var(--font-sans)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "المرحلة الدراسية" : "Grade Level"}</label>
                  <select
                    value={subjGrade}
                    onChange={(e) => setSubjGrade(e.target.value)}
                    style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}
                  >
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "التصنيف" : "Category"}</label>
                  <select
                    value={subjCategory}
                    onChange={(e) => setSubjCategory(e.target.value)}
                    style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}
                  >
                    <option value="Science">Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Languages">Languages</option>
                    <option value="Social Studies">Social Studies</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "رمز تعبيري (Emoji)" : "Icon Emoji"}</label>
                <input
                  type="text"
                  placeholder="📚"
                  value={subjEmoji}
                  onChange={(e) => setSubjEmoji(e.target.value)}
                  style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem", width: "50px", textAlign: "center" }}
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingSubject}
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.6rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: isCreatingSubject ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  marginTop: "0.5rem"
                }}
              >
                {isCreatingSubject ? (
                  <FiRefreshCw className="spinning-icon" />
                ) : (
                  <>
                    <FiPlus />
                    <span>{language === "ar" ? "إنشاء المادة ودفعها للمستودع" : "Create New Subject Schema"}</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Column 3.2: Ingest New Textbook metadata */}
          <section className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem", margin: 0 }}>
              <FiBookOpen style={{ color: "var(--secondary)" }} />
              <span>{language === "ar" ? "استيراد وتجهيز كتاب منهجي جديد" : "Ingest New Textbook Context"}</span>
            </h3>

            {bookError && (
              <div style={{ padding: "0.5rem", background: "rgba(211, 47, 47, 0.08)", border: "1px solid rgba(211, 47, 47, 0.15)", borderRadius: "4px", color: "#f87171", fontSize: "0.8rem" }}>
                {bookError}
              </div>
            )}
            {bookSuccess && (
              <div style={{ padding: "0.5rem", background: "rgba(39, 174, 96, 0.08)", border: "1px solid rgba(39, 174, 96, 0.15)", borderRadius: "4px", color: "var(--accent-green)", fontSize: "0.8rem" }}>
                {bookSuccess}
              </div>
            )}

            <form onSubmit={handleIngestBook} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "اختر المادة المرتبطة" : "Select Target Subject"}</label>
                <select
                  value={bookSubjId}
                  onChange={(e) => setBookSubjId(e.target.value)}
                  required
                  style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}
                >
                  {subjectsList.length === 0 ? (
                    <option value="">{language === "ar" ? "جاري تحميل المواد الدراسية..." : "Loading subjects..."}</option>
                  ) : (
                    subjectsList.map((subj) => (
                      <option key={subj._id} value={subj._id}>
                        {subj.icon_emoji} {language === "ar" ? subj.name_ar : subj.name} ({subj.grade_level})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "عنوان الكتاب (إنجليزي)" : "Book Title (English)"}</label>
                  <input
                    type="text"
                    placeholder="e.g. Calculus Volume I"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    required
                    style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "عنوان الكتاب (عربي)" : "Book Title (Arabic)"}</label>
                  <input
                    type="text"
                    placeholder="مثال: التفاضل والتكامل ج1"
                    value={bookTitleAr}
                    onChange={(e) => setBookTitleAr(e.target.value)}
                    required
                    style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem", fontFamily: "Cairo, var(--font-sans)" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.35rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#4f6371" }}>Grade</label>
                  <select value={bookGrade} onChange={(e) => setBookGrade(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#4f6371" }}>Term</label>
                  <select value={bookTerm} onChange={(e) => setBookTerm(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#4f6371" }}>Lang</label>
                  <select value={bookLang} onChange={(e) => setBookLang(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                    <option value="ar">العربية</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#4f6371" }}>Type</label>
                  <select value={bookType} onChange={(e) => setBookType(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                    <option value="core">Core</option>
                    <option value="supplementary">Extra</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "رابط المصدر (PDF URL)" : "Source Document URL"}</label>
                <input
                  type="url"
                  placeholder="https://ellibrary.moe.gov.eg/calc_g11.pdf"
                  value={bookSourceUrl}
                  onChange={(e) => setBookSourceUrl(e.target.value)}
                  style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}
                />
              </div>

              {/* Interactive Chapters List Section */}
              <div style={{
                background: "rgba(0,0,0,0.02)",
                border: "1px dashed var(--card-border)",
                borderRadius: "8px",
                padding: "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", color: "var(--primary)" }}>
                  <FiList />
                  {language === "ar" ? "مسودة فصول الكتاب المكتشفة" : "Chapter Blueprint Segments"}
                </span>

                {pendingChapters.length === 0 ? (
                  <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                    {language === "ar" ? "لا توجد فصول مضافة بعد. أضف فصولاً بالأسفل:" : "No segments defined. Build and link chapters below:"}
                  </span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: "120px", overflowY: "auto", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>
                    {pendingChapters.map((ch, index) => (
                      <div key={index} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(255,255,255,0.9)",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        border: "1px solid var(--card-border)"
                      }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span>{language === "ar" ? ch.title_ar : ch.title}</span>
                          <span style={{ fontSize: "0.65rem", color: "#64748b" }}>Pages {ch.page_start} - {ch.page_end} • Concepts: {ch.concepts.join(", ")}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveChapter(index)}
                          style={{ background: "transparent", border: "none", color: "#d32f2f", cursor: "pointer", fontSize: "0.85rem" }}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive Builder Form Row */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", background: "rgba(255,255,255,0.6)", padding: "0.5rem", borderRadius: "6px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem" }}>
                    <input
                      type="text"
                      placeholder="Chapter Title"
                      value={chTitle}
                      onChange={(e) => setChTitle(e.target.value)}
                      style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}
                    />
                    <input
                      type="text"
                      placeholder="عنوان الفصل بالعربي"
                      value={chTitleAr}
                      onChange={(e) => setChTitleAr(e.target.value)}
                      style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem", fontFamily: "Cairo, var(--font-sans)" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.35rem", alignItems: "center" }}>
                    <input
                      type="number"
                      placeholder="Start"
                      value={chStartPage}
                      onChange={(e) => setChStartPage(Number(e.target.value))}
                      style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}
                    />
                    <input
                      type="number"
                      placeholder="End"
                      value={chEndPage}
                      onChange={(e) => setChEndPage(Number(e.target.value))}
                      style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}
                    />
                    <input
                      type="text"
                      placeholder="Concepts (comma-separated)"
                      value={chConcepts}
                      onChange={(e) => setChConcepts(e.target.value)}
                      style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddChapter}
                    disabled={!chTitle || !chTitleAr}
                    style={{
                      background: "rgba(27, 163, 156, 0.12)",
                      color: "var(--secondary)",
                      border: "1px solid rgba(27, 163, 156, 0.2)",
                      borderRadius: "4px",
                      padding: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: (!chTitle || !chTitleAr) ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "2px"
                    }}
                  >
                    <FiPlus />
                    <span>{language === "ar" ? "إضافة فصل للمسودة" : "Add Chapter Segment"}</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isIngestingBook || !bookSubjId || !bookTitle || !bookTitleAr}
                style={{
                  background: "var(--secondary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.6rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: (isIngestingBook || !bookSubjId || !bookTitle || !bookTitleAr) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  marginTop: "0.5rem"
                }}
              >
                {isIngestingBook ? (
                  <FiRefreshCw className="spinning-icon" />
                ) : (
                  <>
                    <FiZap />
                    <span>{language === "ar" ? "دفع للمزامنة والبدء بالاستيراد" : "Ingest Textbook & Start Indexing"}</span>
                  </>
                )}
              </button>
            </form>
          </section>

        </div>
      </div>
    </div>
  );
}
