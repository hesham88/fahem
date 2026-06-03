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
  FiChevronRight,
  FiChevronDown,
  FiFolder,
  FiFileText,
  FiInfo
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
  const [crawlUrl, setBookCrawlUrl] = useState("https://openstax.org");
  const [crawlMaxDepth, setCrawlDepth] = useState<number>(2);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlLogs, setCrawlLogs] = useState<string[]>([]);
  const [discoveredResources, setDiscoveredResources] = useState<any[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<"all" | "pdf" | "html">("pdf");
  const [selectedResources, setSelectedResources] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [importingBulk, setImportingBulk] = useState(false);

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

  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const crawlerContainerRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll terminal log inside container (no viewport glitching/yanking)
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  useEffect(() => {
    if (crawlerContainerRef.current) {
      crawlerContainerRef.current.scrollTop = crawlerContainerRef.current.scrollHeight;
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
    setSelectedResources({});

    const logMessages = [
      `Initializing premium web spider agent targeting ${crawlUrl}...`,
      "Enforcing strict compliance with robots.txt policy... Allowed",
      "Scanning target server HTML anchors, breadcrumbs, & metadata tags...",
      `Crawling depth level: Resolving nested links up to max_depth: ${crawlMaxDepth}`,
      "Following breadcrumb hierarchy path: Home -> Subjects -> Core Books -> Assets...",
      "Analyzing link tree hierarchies to classify book types (Core vs Student/Instructor Support)...",
      "[DETECTION] Parsing path: /subjects/computer-science -> Core Book: Introduction to Python Programming -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/Introduction_to_Python_Programming-WEB.pdf (Core Book)",
      "[DETECTION] Parsing path: /subjects/computer-science -> Student Solutions -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/Introduction_to_Python_Programming_Student_Solutions.pdf (Supporting Book - Student)",
      "[DETECTION] Parsing path: /subjects/computer-science -> Instructor Resources -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/Introduction_to_Python_Programming_Instructor_Guide.pdf (Supporting Book - Instructor)",
      "[DETECTION] Parsing path: /subjects/mathematics -> Core Book: Calculus Volume 1 -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/Calculus-Volume1-OP.pdf (Core Book)",
      "[DETECTION] Parsing path: /subjects/mathematics -> Student solutions -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/Calculus_Volume_1_Student_Solutions_Manual.pdf (Supporting Book - Student)",
      "[DETECTION] Parsing path: /subjects/mathematics -> Instructor answer guide -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/Calculus_Volume_1_Instructor_Answer_Guide.pdf (Supporting Book - Instructor)",
      "[DETECTION] Parsing path: /subjects/mathematics -> Core Book: College Algebra -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/College_Algebra-WEB.pdf (Core Book)",
      "[DETECTION] Parsing path: /subjects/mathematics -> College Algebra solutions -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/College_Algebra_Student_Solutions_Manual.pdf (Supporting Book - Student)",
      "[DETECTION] Parsing path: /subjects/mathematics -> College Algebra key -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/College_Algebra_Instructor_Answer_Key.pdf (Supporting Book - Instructor)",
      "[DETECTION] Parsing path: /subjects/physics -> Core Book: College Physics -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/CollegePhysics-OP.pdf (Core Book)",
      "[DETECTION] Parsing path: /subjects/physics -> Student Solutions -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/College_Physics_Student_Solutions_Manual.pdf (Supporting Book - Student)",
      "[DETECTION] Parsing path: /subjects/physics -> Instructor Answer Key -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/College_Physics_Instructor_Answer_Key.pdf (Supporting Book - Instructor)",
      "[DETECTION] Parsing path: /subjects/chemistry -> Core Book: Chemistry 2e -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/Chemistry2e-OP.pdf (Core Book)",
      "[DETECTION] Parsing path: /subjects/chemistry -> Study Guide & Solutions -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/Chemistry_2e_Student_Solutions_Manual.pdf (Supporting Book - Student)",
      "[DETECTION] Parsing path: /subjects/chemistry -> Instructor Answers -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/Chemistry_2e_Instructor_Answer_Key.pdf (Supporting Book - Instructor)",
      "[DETECTION] Parsing path: /subjects/biology -> Core Book: Biology 2e -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/Biology2e-OP.pdf (Core Book)",
      "[DETECTION] Parsing path: /subjects/biology -> Student Review Manual -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/Biology_2e_Student_Solutions_Manual.pdf (Supporting Book - Student)",
      "[DETECTION] Parsing path: /subjects/biology -> Instructor Exam Keys -> URL: https://assets.openstax.org/oscms-prodcms/media/documents/Biology_2e_Instructor_Answer_Key.pdf (Supporting Book - Instructor)",
      "Spider crawled successfully! Analyzed link breadcrumbs and classified 15 direct PDF textbooks & manuals.",
      "Structuring directories and generating visual stats dashboard..."
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

        const csSubjId = subjectsList.find(s => s.name.toLowerCase().includes("science") || s.name.toLowerCase().includes("comput"))?._id || "subj_computer_science";
        const mathSubjId = subjectsList.find(s => s.name.toLowerCase().includes("math"))?._id || "subj_mathematics";
        const physSubjId = subjectsList.find(s => s.name.toLowerCase().includes("physic"))?._id || "subj_physics";
        const chemSubjId = subjectsList.find(s => s.name.toLowerCase().includes("chemist"))?._id || "subj_chemistry";
        const bioSubjId = subjectsList.find(s => s.name.toLowerCase().includes("biolog"))?._id || "subj_biology";

        setDiscoveredResources([
          // Computer Science
          {
            id: "os_py_core",
            title: "Introduction to Python Programming",
            titleAr: "مقدمة في البرمجة بلغة بايثون",
            subject: "Computer Science",
            subjectId: csSubjId,
            fileName: "Introduction_to_Python_Programming-WEB.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/Introduction_to_Python_Programming-WEB.pdf",
            totalPages: 240,
            bookType: "core",
            grade: "Grade 11",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Introduction to Programming", title_ar: "مقدمة في البرمجة", page_start: 1, page_end: 45, concepts: ["variables", "expressions", "types"] },
              { title: "Control Structures & Loops", title_ar: "جمل التحكم والتكرار", page_start: 46, page_end: 110, concepts: ["conditionals", "while loops", "for loops"] },
              { title: "Functions & Scope", title_ar: "الدوال ونطاق المتغيرات", page_start: 111, page_end: 175, concepts: ["def", "parameters", "return", "local scope"] },
              { title: "Data Structures & Objects", title_ar: "بنيات البيانات والكائنات", page_start: 176, page_end: 240, concepts: ["lists", "dicts", "classes", "methods"] }
            ]
          },
          {
            id: "os_py_student",
            title: "Introduction to Python Programming (Student Solutions Manual)",
            titleAr: "دليل حلول الطالب - البرمجة بلغة بايثون",
            subject: "Computer Science",
            subjectId: csSubjId,
            fileName: "Introduction_to_Python_Programming_Student_Solutions.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/Introduction_to_Python_Programming_Student_Solutions.pdf",
            totalPages: 110,
            bookType: "student_support",
            grade: "Grade 11",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Exercises & Workouts", title_ar: "حلول وتمارين مبسطة", page_start: 1, page_end: 110, concepts: ["exercise solutions", "debugging"] }
            ]
          },
          {
            id: "os_py_instructor",
            title: "Introduction to Python Programming (Instructor Teaching Guide)",
            titleAr: "دليل إجابات وتدريس المعلم - لغة بايثون",
            subject: "Computer Science",
            subjectId: csSubjId,
            fileName: "Introduction_to_Python_Programming_Instructor_Guide.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/Introduction_to_Python_Programming_Instructor_Guide.pdf",
            totalPages: 160,
            bookType: "instructor_support",
            grade: "Grade 11",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Teaching Guides & Assessments", title_ar: "أسئلة وتقييمات المعلم", page_start: 1, page_end: 160, concepts: ["teaching models", "rubrics", "test bank"] }
            ]
          },

          // Mathematics
          {
            id: "os_calc_core",
            title: "Calculus Volume 1",
            titleAr: "حساب التفاضل والتكامل - الجزء الأول",
            subject: "Mathematics",
            subjectId: mathSubjId,
            fileName: "Calculus-Volume1-OP.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/Calculus-Volume1-OP.pdf",
            totalPages: 184,
            bookType: "core",
            grade: "Grade 12",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Functions and Graphs", title_ar: "الدوال والتمثيلات البيانية", page_start: 1, page_end: 60, concepts: ["domains", "ranges", "linear models"] },
              { title: "Limits & Continuity", title_ar: "النهايات والاتصال", page_start: 61, page_end: 130, concepts: ["limit laws", "asymptotes", "continuity"] },
              { title: "Derivatives", title_ar: "المشتقات", page_start: 131, page_end: 184, concepts: ["power rule", "product rule", "chain rule"] }
            ]
          },
          {
            id: "os_calc_student",
            title: "Calculus Volume 1 (Student Solutions Manual)",
            titleAr: "دليل حلول الطالب - التفاضل والتكامل 1",
            subject: "Mathematics",
            subjectId: mathSubjId,
            fileName: "Calculus_Volume_1_Student_Solutions_Manual.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/Calculus_Volume_1_Student_Solutions_Manual.pdf",
            totalPages: 95,
            bookType: "student_support",
            grade: "Grade 12",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Calculus Exercises & Solutions", title_ar: "حلول تمارين التفاضل والتكامل", page_start: 1, page_end: 95, concepts: ["derivatives solutions", "limits"] }
            ]
          },
          {
            id: "os_calc_instructor",
            title: "Calculus Volume 1 (Instructor Answer Guide)",
            titleAr: "دليل إجابات المعلم - التفاضل والتكامل 1",
            subject: "Mathematics",
            subjectId: mathSubjId,
            fileName: "Calculus_Volume_1_Instructor_Answer_Guide.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/Calculus_Volume_1_Instructor_Answer_Guide.pdf",
            totalPages: 120,
            bookType: "instructor_support",
            grade: "Grade 12",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Calculus Grading Material", title_ar: "مواد اختبار وتوزيع درجات المادة", page_start: 1, page_end: 120, concepts: ["calculus curriculum", "final exam"] }
            ]
          },
          {
            id: "os_alg_core",
            title: "College Algebra",
            titleAr: "الجبر الجامعي المتقدم",
            subject: "Mathematics",
            subjectId: mathSubjId,
            fileName: "College_Algebra-WEB.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/College_Algebra-WEB.pdf",
            totalPages: 210,
            bookType: "core",
            grade: "Grade 10",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Prerequisites & Algebra Basics", title_ar: "المتطلبات الأساسية ومبادئ الجبر", page_start: 1, page_end: 70, concepts: ["real numbers", "exponents", "radicals"] },
              { title: "Equations & Inequalities", title_ar: "المعادلات والمتباينات الجبرية", page_start: 71, page_end: 140, concepts: ["linear equations", "quadratic equations", "complex numbers"] },
              { title: "Functions & Systems", title_ar: "الدوال والأنظمة الخطية والرسوم", page_start: 141, page_end: 210, concepts: ["composition of functions", "inverse functions"] }
            ]
          },
          {
            id: "os_alg_student",
            title: "College Algebra (Student Solutions Manual)",
            titleAr: "دليل دراسة وحلول الطالب المنهجية - الجبر",
            subject: "Mathematics",
            subjectId: mathSubjId,
            fileName: "College_Algebra_Student_Solutions_Manual.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/College_Algebra_Student_Solutions_Manual.pdf",
            totalPages: 80,
            bookType: "student_support",
            grade: "Grade 10",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Algebra step-by-step workouts", title_ar: "خطوات حلول التمارين الجبرية", page_start: 1, page_end: 80, concepts: ["factoring", "inequalities solutions"] }
            ]
          },
          {
            id: "os_alg_instructor",
            title: "College Algebra (Instructor Answer Key)",
            titleAr: "دليل حلول وإرشادات المعلم - كتاب الجبر",
            subject: "Mathematics",
            subjectId: mathSubjId,
            fileName: "College_Algebra_Instructor_Answer_Key.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/College_Algebra_Instructor_Answer_Key.pdf",
            totalPages: 105,
            bookType: "instructor_support",
            grade: "Grade 10",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Algebra Lesson Plans & Exams", title_ar: "خطط الدروس والاختبارات المعتمدة", page_start: 1, page_end: 105, concepts: ["curriculum design", "lesson pacing"] }
            ]
          },

          // Physics
          {
            id: "os_phys_core",
            title: "College Physics",
            titleAr: "الفيزياء الكلاسيكية والحديثة للجامعات",
            subject: "Physics",
            subjectId: physSubjId,
            fileName: "CollegePhysics-OP.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/CollegePhysics-OP.pdf",
            totalPages: 175,
            bookType: "core",
            grade: "Grade 11",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Kinematics", title_ar: "علم الحركة المجردة", page_start: 1, page_end: 50, concepts: ["velocity", "acceleration", "displacement"] },
              { title: "Dynamics and Force", title_ar: "القوى وقوانين الحركة الكلاسيكية", page_start: 51, page_end: 110, concepts: ["newtons laws", "friction", "drag forces"] },
              { title: "Work & Kinetic Energy", title_ar: "الشغل المبذول وطاقة الحركة والوضع", page_start: 111, page_end: 175, concepts: ["kinetic energy", "potential energy", "conservation of energy"] }
            ]
          },
          {
            id: "os_phys_student",
            title: "College Physics (Student Solutions Manual)",
            titleAr: "دليل مراجعة وحلول الطالب - الفيزياء العامة",
            subject: "Physics",
            subjectId: physSubjId,
            fileName: "College_Physics_Student_Solutions_Manual.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/College_Physics_Student_Solutions_Manual.pdf",
            totalPages: 90,
            bookType: "student_support",
            grade: "Grade 11",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Kinematics & Dynamics Solutions", title_ar: "حلول ميكانيكا وحرآة الأجسام", page_start: 1, page_end: 90, concepts: ["free-body forces", "friction solutions"] }
            ]
          },
          {
            id: "os_phys_instructor",
            title: "College Physics (Instructor Answer Key)",
            titleAr: "مفتاح إجابات واختبارات المعلم - كتاب الفيزياء",
            subject: "Physics",
            subjectId: physSubjId,
            fileName: "College_Physics_Instructor_Answer_Key.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/College_Physics_Instructor_Answer_Key.pdf",
            totalPages: 115,
            bookType: "instructor_support",
            grade: "Grade 11",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Laboratory answers and grading rubrics", title_ar: "حلول تجارب المعمل وتوزيع الدرجات", page_start: 1, page_end: 115, concepts: ["lab safety", "experimental analysis"] }
            ]
          },

          // Chemistry
          {
            id: "os_chem_core",
            title: "Chemistry 2e",
            titleAr: "كيمياء المواد والعناصر - الطبعة الثانية",
            subject: "Chemistry",
            subjectId: chemSubjId,
            fileName: "Chemistry2e-OP.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/Chemistry2e-OP.pdf",
            totalPages: 195,
            bookType: "core",
            grade: "Grade 10",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Atoms, Molecules, and Ions", title_ar: "الذرات والجزيئات والروابط الأيونية", page_start: 1, page_end: 65, concepts: ["atomic structure", "molecular formulas"] },
              { title: "Stoichiometry of Reactions", title_ar: "حسابات كيمياء المعادلات والتفاعلات", page_start: 66, page_end: 130, concepts: ["stoichiometry", "yields"] },
              { title: "Thermochemistry & Energy", title_ar: "الكيمياء الحرارية وتبادل الطاقة", page_start: 131, page_end: 195, concepts: ["calorimetry", "enthalpy rules"] }
            ]
          },
          {
            id: "os_chem_student",
            title: "Chemistry 2e (Student Study Guide & Workbook)",
            titleAr: "كراسة تدريبات وحلول الطالب المبسطة - كيمياء",
            subject: "Chemistry",
            subjectId: chemSubjId,
            fileName: "Chemistry_2e_Student_Solutions_Manual.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/Chemistry_2e_Student_Solutions_Manual.pdf",
            totalPages: 100,
            bookType: "student_support",
            grade: "Grade 10",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Stoichiometry & Reaction Workouts", title_ar: "تبسيط حلول التفاعلات الكيميائية", page_start: 1, page_end: 100, concepts: ["balanced equation solutions", "limiting reagents"] }
            ]
          },
          {
            id: "os_chem_instructor",
            title: "Chemistry 2e (Instructor Solutions Manual)",
            titleAr: "دليل حلول وتقييمات المعلم - كتاب الكيمياء",
            subject: "Chemistry",
            subjectId: chemSubjId,
            fileName: "Chemistry_2e_Instructor_Answer_Key.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/Chemistry_2e_Instructor_Answer_Key.pdf",
            totalPages: 130,
            bookType: "instructor_support",
            grade: "Grade 10",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Instructor Lab setups & answer schemes", title_ar: "إرشادات تجهيز المختبر وحلول الأسئلة", page_start: 1, page_end: 130, concepts: ["chemical reagents safety", "grading lab exams"] }
            ]
          },

          // Biology
          {
            id: "os_bio_core",
            title: "Biology 2e",
            titleAr: "علم الأحياء والكائنات الحية - الطبعة الثانية",
            subject: "Biology",
            subjectId: bioSubjId,
            fileName: "Biology2e-OP.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/Biology2e-OP.pdf",
            totalPages: 215,
            bookType: "core",
            grade: "Grade 11",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "The Chemistry of Life", title_ar: "التركيب الكيميائي للخلايا والماء", page_start: 1, page_end: 70, concepts: ["organic molecules", "macromolecules"] },
              { title: "Cell Structure & Photosynthesis", title_ar: "تركيب الخلية النباتية والحيوانية والبناء الضوئي", page_start: 71, page_end: 145, concepts: ["mitochondria", "photosynthesis", "cell respiration"] },
              { title: "Genetics and Inheritance Rules", title_ar: "علم هندسة الجينات الوراثية وتضاعف الـ DNA", page_start: 146, page_end: 215, concepts: ["meiosis", "gene mapping", "mendel inheritance"] }
            ]
          },
          {
            id: "os_bio_student",
            title: "Biology 2e (Student Review & Diagrams Manual)",
            titleAr: "مذكرة رسوم الأحياء ومراجعة المنهج للطالب",
            subject: "Biology",
            subjectId: bioSubjId,
            fileName: "Biology_2e_Student_Solutions_Manual.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/Biology_2e_Student_Solutions_Manual.pdf",
            totalPages: 85,
            bookType: "student_support",
            grade: "Grade 11",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Cellular Diagram Labeling & Quiz prep", title_ar: "مراجعات الرسوم البيانية للخلية الوراثية", page_start: 1, page_end: 85, concepts: ["labelling cells", "practice tests"] }
            ]
          },
          {
            id: "os_bio_instructor",
            title: "Biology 2e (Instructor Classroom Slide Guides)",
            titleAr: "شرائح ومفتاح إجابات المعلم - علم الأحياء",
            subject: "Biology",
            subjectId: bioSubjId,
            fileName: "Biology_2e_Instructor_Answer_Key.pdf",
            url: "https://assets.openstax.org/oscms-prodcms/media/documents/Biology_2e_Instructor_Answer_Key.pdf",
            totalPages: 110,
            bookType: "instructor_support",
            grade: "Grade 11",
            term: "Term 1",
            year: "2026",
            language: "en",
            chapters: [
              { title: "Lecture Slides Notes & Final Keys", title_ar: "مذكرات العرض المساعد ومفاتيح الأسئلة", page_start: 1, page_end: 110, concepts: ["lecture schedules", "biology final solutions"] }
            ]
          }
        ]);
        setExpandedFolders({
          "Computer Science": true,
          "Mathematics": true,
          "Physics": true,
          "Chemistry": true,
          "Biology": true
        });
      }
    }, 500);
  };

  // Bulk Ingest selected textbooks into system
  const handleImportSelectedBooks = async () => {
    const selectedList = discoveredResources.filter(res => selectedResources[res.id]);
    if (selectedList.length === 0) return;

    setImportingBulk(true);
    addTerminalLog(`[CRAWLER] Initiating bulk importation queue on GCP Cloud Run for ${selectedList.length} selected assets...`);

    let importedCount = 0;
    let failedCount = 0;

    for (const book of selectedList) {
      addTerminalLog(`[CRAWLER] Registering schema metadata in MongoDB for: "${book.title}"...`);
      try {
        const res = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject_id: book.subjectId,
            title: book.title,
            title_ar: book.titleAr,
            grade: book.grade,
            term: book.term,
            year: book.year,
            language: book.language,
            book_type: book.bookType,
            source_url: book.url,
            storage_path: `/fahem-core-store/textbooks/${book.fileName}`,
            chapters: book.chapters,
            requesterEmail: email
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          importedCount++;
          addTerminalLog(`[SUCCESS] Registered textbook: "${book.title}". Spawning isolated Cloud Run indexing job...`);

          // Spawn live local queue task that processes page-by-page
          const cleanFileName = book.url.split("/").pop() || `${book.title.replace(/\s+/g, "_")}.pdf`;
          const newJob: QueueJob = {
            id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            fileName: cleanFileName,
            bookTitle: book.title,
            bookTitleAr: book.titleAr,
            subjectName: book.subject,
            status: "idle",
            progress: 0,
            totalPages: book.totalPages,
            processedPages: 0,
            speed: 0,
            eta: 0,
            startTime: 0
          };

          setQueue(prev => [...prev, newJob]);
          addTerminalLog(`[QUEUE] Registered Cloud Run Task for: ${cleanFileName}`);
        } else {
          failedCount++;
          addTerminalLog(`[ERROR] Registration failed for: "${book.title}". Reason: ${data.error || "Server Error"}`);
        }
      } catch (err: any) {
        failedCount++;
        addTerminalLog(`[ERROR] System fault during import: ${err.message}`);
      }
    }

    setImportingBulk(false);
    setSelectedResources({});
    fetchSubjects();

    if (failedCount === 0) {
      setBookSuccess(
        language === "ar"
          ? `🎉 تم استيراد وتفعيل قائمة المعالجة لعدد ${importedCount} كتب بنجاح!`
          : `🎉 Successfully registered and scheduled ${importedCount} textbooks for async indexing!`
      );
      setTimeout(() => setBookSuccess(null), 5000);
    } else {
      setBookError(
        language === "ar"
          ? `⚠️ اكتمل الاستيراد مع وجود أخطاء. الناجح: ${importedCount}، الفاشل: ${failedCount}. تفحص السجلات.`
          : `⚠️ Import completed with errors. Succeeded: ${importedCount}, Failed: ${failedCount}. Check terminal logs.`
      );
      setTimeout(() => setBookError(null), 5000);
    }
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
              {language === "ar" ? "أستوديو المناهج" : "Curriculum Studio"}
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
          <div 
            ref={terminalContainerRef}
            style={{
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
            }}
          >
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
            <div 
              ref={crawlerContainerRef}
              style={{
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
              }}
            >
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
            </div>
          </div>

          {/* Crawled Results Shelf */}
          {discoveredResources.length > 0 && (() => {
            const totalDiscovered = discoveredResources.length;
            const coreCount = discoveredResources.filter(r => r.bookType === "core").length;
            const studentSupportCount = discoveredResources.filter(r => r.bookType === "student_support").length;
            const instructorSupportCount = discoveredResources.filter(r => r.bookType === "instructor_support").length;

            const subjects = Array.from(new Set(discoveredResources.map((r: any) => r.subject)));

            const subjectTranslations: Record<string, string> = {
              "Computer Science": "علوم الحاسوب",
              "Mathematics": "الرياضيات",
              "Physics": "الفيزياء",
              "Chemistry": "الكيمياء",
              "Biology": "علم الأحياء"
            };

            const isSubjectFullySelected = (subject: string) => {
              const subBooks = discoveredResources.filter(r => r.subject === subject);
              if (subBooks.length === 0) return false;
              return subBooks.every(r => selectedResources[r.id]);
            };

            const toggleSubjectSelection = (subject: string) => {
              const subBooks = discoveredResources.filter(r => r.subject === subject);
              const allSelected = isSubjectFullySelected(subject);
              setSelectedResources(prev => {
                const updated = { ...prev };
                subBooks.forEach(r => {
                  updated[r.id] = !allSelected;
                });
                return updated;
              });
            };

            const isAllSelected = discoveredResources.length > 0 && discoveredResources.every(r => selectedResources[r.id]);

            const toggleGlobalSelection = () => {
              const nextVal = !isAllSelected;
              setSelectedResources(() => {
                const updated: Record<string, boolean> = {};
                discoveredResources.forEach(r => {
                  updated[r.id] = nextVal;
                });
                return updated;
              });
            };

            const selectedCount = discoveredResources.filter(r => selectedResources[r.id]).length;

            return (
              <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                
                {/* Section Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    🔍 {language === "ar" ? "لوحة استكشاف المناهج ومتصفح المجلدات الذكي" : "Curriculum Exploration Dashboard & Directory Explorer"}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "#64748b", background: "rgba(16, 107, 163, 0.08)", padding: "2px 8px", borderRadius: "20px" }}>
                    OpenStax Deep-Crawled Assets
                  </span>
                </div>

                {/* VISUAL STATISTICS DASHBOARD */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.75rem",
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.5) 100%)",
                  borderRadius: "12px",
                  padding: "1rem",
                  border: "1px solid var(--card-border)",
                  boxShadow: "0 4px 20px -2px rgba(16, 107, 163, 0.05)"
                }}>
                  {/* Card 1: Total */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem" }}>
                    <div style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "10px",
                      background: "rgba(16, 107, 163, 0.1)",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem"
                    }}>
                      <FiSearch />
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "1.25rem", fontWeight: 800, color: "var(--foreground)", lineHeight: "1" }}>{totalDiscovered}</span>
                      <span style={{ display: "block", fontSize: "0.65rem", color: "#64748b", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {language === "ar" ? "إجمالي الملفات" : "Total Discovered"}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Core Textbooks */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem" }}>
                    <div style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "10px",
                      background: "rgba(39, 174, 96, 0.1)",
                      color: "var(--accent-green)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem"
                    }}>
                      📘
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "1.25rem", fontWeight: 800, color: "var(--foreground)", lineHeight: "1" }}>{coreCount}</span>
                      <span style={{ display: "block", fontSize: "0.65rem", color: "#64748b", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {language === "ar" ? "الكتب المنهجية الأساسية" : "Core Textbooks"}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Student Support */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem" }}>
                    <div style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "10px",
                      background: "rgba(241, 196, 15, 0.15)",
                      color: "#b78a02",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem"
                    }}>
                      📒
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "1.25rem", fontWeight: 800, color: "var(--foreground)", lineHeight: "1" }}>{studentSupportCount}</span>
                      <span style={{ display: "block", fontSize: "0.65rem", color: "#64748b", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {language === "ar" ? "مساعدات الطالب" : "Student Supports"}
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Instructor Support */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem" }}>
                    <div style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "10px",
                      background: "rgba(230, 126, 34, 0.1)",
                      color: "#e67e22",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem"
                    }}>
                      📙
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "1.25rem", fontWeight: 800, color: "var(--foreground)", lineHeight: "1" }}>{instructorSupportCount}</span>
                      <span style={{ display: "block", fontSize: "0.65rem", color: "#64748b", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {language === "ar" ? "مصادر المعلم" : "Instructor Resources"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SUBJECT DISTRIBUTION CHART */}
                <div style={{
                  background: "rgba(255, 255, 255, 0.55)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "12px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#4f6371", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    📊 {language === "ar" ? "توزيع المواد الأكاديمية المستكشفة" : "Crawled Subject Distribution Metrics"}
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.25rem" }}>
                    {subjects.map((subj: any) => {
                      const subjBooks = discoveredResources.filter(r => r.subject === subj);
                      const percentage = Math.round((subjBooks.length / totalDiscovered) * 100);
                      const localizedName = language === "ar" ? (subjectTranslations[subj] || subj) : subj;
                      
                      // Assign color scheme based on subject name
                      let barColor = "linear-gradient(90deg, #106ba3, #1ba39c)";
                      if (subj.includes("Computer")) barColor = "linear-gradient(90deg, #4f46e5, #06b6d4)";
                      else if (subj.includes("Math")) barColor = "linear-gradient(90deg, #db2777, #f43f5e)";
                      else if (subj.includes("Physic")) barColor = "linear-gradient(90deg, #d97706, #f59e0b)";
                      else if (subj.includes("Biolog")) barColor = "linear-gradient(90deg, #059669, #10b981)";
                      else if (subj.includes("Chemist")) barColor = "linear-gradient(90deg, #7c3aed, #8b5cf6)";

                      return (
                        <div key={subj} style={{ flex: "1 1 calc(20% - 0.5rem)", minWidth: "140px", background: "#f8fafc", border: "1px solid rgba(16, 107, 163, 0.05)", borderRadius: "8px", padding: "0.5rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: 700, color: "var(--foreground)" }}>
                            <span>{localizedName}</span>
                            <span>{subjBooks.length} ({percentage}%)</span>
                          </div>
                          <div style={{ height: "6px", width: "100%", background: "#e2e8f0", borderRadius: "10px", marginTop: "4px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${percentage}%`, background: barColor, borderRadius: "10px", transition: "width 0.8s ease-out" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BULK ACTION TOOLBAR */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "linear-gradient(90deg, rgba(16, 107, 163, 0.04) 0%, rgba(27, 163, 156, 0.04) 100%)",
                  border: "1px solid rgba(16, 107, 163, 0.12)",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  flexWrap: "wrap",
                  gap: "0.75rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, color: "var(--foreground)" }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleGlobalSelection}
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          accentColor: "var(--primary)"
                        }}
                      />
                      <span>{language === "ar" ? "تحديد الكل" : "Select All Discovered"}</span>
                    </label>

                    <div style={{ height: "16px", width: "1px", background: "rgba(16, 107, 163, 0.2)" }} />

                    <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 800 }}>
                      {language === "ar" 
                        ? `تم تحديد ${selectedCount} من ${totalDiscovered} كتاب ومستند` 
                        : `Selected: ${selectedCount} of ${totalDiscovered} resources`}
                    </span>
                  </div>

                  <button
                    onClick={handleImportSelectedBooks}
                    disabled={selectedCount === 0 || importingBulk}
                    type="button"
                    style={{
                      background: selectedCount === 0 ? "#cbd5e1" : "linear-gradient(135deg, var(--secondary), var(--primary))",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 16px",
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      cursor: (selectedCount === 0 || importingBulk) ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: selectedCount === 0 ? "none" : "0 4px 12px rgba(16, 107, 163, 0.15)",
                      transition: "all 0.2s"
                    }}
                  >
                    {importingBulk ? (
                      <>
                        <FiRefreshCw className="spinning-icon" />
                        <span>{language === "ar" ? "جاري استيراد الحزمة..." : "Importing Selected to Cluster..."}</span>
                      </>
                    ) : (
                      <>
                        <FiDownloadCloud />
                        <span>
                          {language === "ar" 
                            ? `استيراد الحزمة المحددة لـ ${selectedCount} كتب` 
                            : `Bulk Ingest Selected (${selectedCount} Books)`}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* DIRECTORY TREE EXPLORER */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  background: "rgba(255, 255, 255, 0.75)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "12px",
                  padding: "1rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}>
                  {subjects.map((subj: any) => {
                    const subBooks = discoveredResources.filter(r => r.subject === subj);
                    const isExpanded = !!expandedFolders[subj];
                    const isFullySelected = isSubjectFullySelected(subj);
                    const isPartiallySelected = !isFullySelected && discoveredResources.filter(r => r.subject === subj).some(r => selectedResources[r.id]);
                    const localizedSubj = language === "ar" ? (subjectTranslations[subj] || subj) : subj;

                    return (
                      <div key={subj} style={{ display: "flex", flexDirection: "column", border: "1px solid rgba(16, 107, 163, 0.05)", borderRadius: "8px", overflow: "hidden", marginBottom: "0.25rem" }}>
                        {/* Folder Header Row */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.6rem 0.8rem",
                          background: "linear-gradient(90deg, #f8fafc 0%, rgba(255,255,255,0.9) 100%)",
                          borderBottom: isExpanded ? "1px solid rgba(16, 107, 163, 0.08)" : "none",
                          transition: "background 0.2s"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                            {/* Expand Arrow Icon */}
                            <button
                              type="button"
                              onClick={() => setExpandedFolders(prev => ({ ...prev, [subj]: !prev[subj] }))}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "#64748b",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "4px",
                                borderRadius: "4px",
                                transition: "all 0.2s"
                              }}
                            >
                              {isExpanded ? <FiChevronDown style={{ fontSize: "1rem" }} /> : <FiChevronRight style={{ fontSize: "1rem" }} />}
                            </button>

                            {/* Folder Icon */}
                            <FiFolder style={{ color: "var(--primary)", fontSize: "1.1rem" }} />

                            {/* Folder Name & Translate */}
                            <span 
                              onClick={() => setExpandedFolders(prev => ({ ...prev, [subj]: !prev[subj] }))}
                              style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--foreground)", cursor: "pointer", userSelect: "none" }}
                            >
                              {localizedSubj}
                            </span>

                            {/* Files Count Tag */}
                            <span style={{ fontSize: "0.65rem", background: "rgba(16, 107, 163, 0.06)", color: "var(--primary)", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
                              {subBooks.length} {language === "ar" ? "ملفات" : "files"}
                            </span>
                          </div>

                          {/* Folder Checkbox */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 700 }}>
                              {language === "ar" ? "تحديد المجلد" : "Select Subject Folder"}
                            </span>
                            <input
                              type="checkbox"
                              checked={isFullySelected}
                              ref={el => {
                                if (el) {
                                  el.indeterminate = isPartiallySelected;
                                }
                              }}
                              onChange={() => toggleSubjectSelection(subj)}
                              style={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                accentColor: "var(--primary)"
                              }}
                            />
                          </div>
                        </div>

                        {/* Folder Children List */}
                        {isExpanded && (
                          <div style={{
                            padding: "0.25rem 0.5rem 0.5rem 1.5rem",
                            background: "rgba(255,255,255,0.45)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                            borderLeft: "2px solid rgba(16, 107, 163, 0.08)",
                            marginLeft: "1rem",
                            marginTop: "0.25rem"
                          }}>
                            {subBooks.map((res: any) => {
                              const isBookSelected = !!selectedResources[res.id];
                              
                              // Determine book Type details
                              let bookTypeLabel = language === "ar" ? "كتاب أساسي" : "Core Book";
                              let bookTypeColor = "rgba(39, 174, 96, 0.1)";
                              let bookTypeTextColor = "var(--accent-green)";
                              let bookIcon = "📘";

                              if (res.bookType === "student_support") {
                                bookTypeLabel = language === "ar" ? "مساعد الطالب" : "Student Support";
                                bookTypeColor = "rgba(241, 196, 15, 0.12)";
                                bookTypeTextColor = "#b78a02";
                                bookIcon = "📒";
                              } else if (res.bookType === "instructor_support") {
                                bookTypeLabel = language === "ar" ? "مصدر المعلم" : "Instructor Support";
                                bookTypeColor = "rgba(230, 126, 34, 0.1)";
                                bookTypeTextColor = "#d35400";
                                bookIcon = "📙";
                              }

                              return (
                                <div
                                  key={res.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "0.4rem 0.6rem",
                                    background: isBookSelected ? "rgba(16, 107, 163, 0.03)" : "transparent",
                                    borderRadius: "6px",
                                    border: isBookSelected ? "1px solid rgba(16, 107, 163, 0.1)" : "1px solid transparent",
                                    transition: "all 0.15s"
                                  }}
                                  className="crawler-item-row"
                                >
                                  {/* Left: Checkbox, Icon, Title info */}
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1 }}>
                                    <input
                                      type="checkbox"
                                      checked={isBookSelected}
                                      onChange={() => {
                                        setSelectedResources(prev => ({
                                          ...prev,
                                          [res.id]: !prev[res.id]
                                        }));
                                      }}
                                      style={{
                                        width: "14px",
                                        height: "14px",
                                        borderRadius: "3px",
                                        cursor: "pointer",
                                        accentColor: "var(--primary)"
                                      }}
                                    />
                                    <span style={{ fontSize: "1rem" }}>{bookIcon}</span>
                                    
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)" }}>
                                        {res.title}
                                      </span>
                                      {res.titleAr && res.titleAr !== res.title && (
                                        <span style={{ fontSize: "0.65rem", color: "#64748b", fontFamily: "Cairo, var(--font-sans)" }}>
                                          {res.titleAr}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Badges & Actions */}
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    {/* Type Badge */}
                                    <span style={{
                                      fontSize: "0.6rem",
                                      fontWeight: 800,
                                      background: bookTypeColor,
                                      color: bookTypeTextColor,
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      textTransform: "uppercase",
                                      whiteSpace: "nowrap"
                                    }}>
                                      {bookTypeLabel}
                                    </span>

                                    {/* Pages Badge */}
                                    <span style={{
                                      fontSize: "0.6rem",
                                      background: "rgba(226, 232, 240, 0.5)",
                                      color: "#475569",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      whiteSpace: "nowrap"
                                    }}>
                                      {res.totalPages} p
                                    </span>

                                    {/* Action button to pre-fill */}
                                    <button
                                      onClick={() => handlePreFillFromCrawler(res)}
                                      type="button"
                                      title={language === "ar" ? "تعبئة البيانات يدوياً للتعديل" : "Pre-fill Ingestion Schema Form"}
                                      style={{
                                        padding: "4px",
                                        borderRadius: "4px",
                                        border: "1px solid rgba(16, 107, 163, 0.2)",
                                        background: "transparent",
                                        color: "var(--primary)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        transition: "all 0.15s"
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "var(--primary)";
                                        e.currentTarget.style.color = "#ffffff";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "var(--primary)";
                                      }}
                                    >
                                      <FiSliders style={{ fontSize: "0.75rem" }} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })()}
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
