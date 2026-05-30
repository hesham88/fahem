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
  FiServer,
  FiUsers,
  FiMessageSquare,
  FiUserCheck,
  FiUserPlus,
  FiUserMinus,
  FiSend,
  FiUser,
  FiX
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

const historyTranslations = {
  en: {
    newChat: "New Chat",
    savedChats: "Saved Chats",
    noSavedChats: "No saved chats yet",
    loadingChats: "Loading chats...",
    tokenAnalytics: "Token Consumption",
    dailyTokens: "Daily Tokens",
    weeklyTokens: "Weekly Tokens",
    monthlyTokens: "Monthly Tokens",
    totalTokens: "Total Lifetime",
    activeChat: "Active Conversation History",
    tokenLimitHelp: "Consumption against daily allocation",
    today: "Today",
    yesterday: "Yesterday",
    previousDays: "Previous Days",
  },
  ar: {
    newChat: "محادثة جديدة",
    savedChats: "المحادثات المحفوظة",
    noSavedChats: "لا توجد محادثات محفوظة بعد",
    loadingChats: "جاري تحميل المحادثات...",
    tokenAnalytics: "استهلاك الرموز (Tokens)",
    dailyTokens: "الاستهلاك اليومي",
    weeklyTokens: "الاستهلاك الأسبوعي",
    monthlyTokens: "الاستهلاك الشهري",
    totalTokens: "الإجمالي الكلي",
    activeChat: "سجل المحادثة النشطة",
    tokenLimitHelp: "نسبة الاستهلاك من الحصة اليومية المخصصة لك",
    today: "اليوم",
    yesterday: "أمس",
    previousDays: "الأيام السابقة",
  },
  es: {
    newChat: "Nuevo Chat",
    savedChats: "Chats Guardados",
    noSavedChats: "Aún no hay chats guardados",
    loadingChats: "Cargando chats...",
    tokenAnalytics: "Consumo de Tokens",
    dailyTokens: "Tokens Diarios",
    weeklyTokens: "Tokens Semanales",
    monthlyTokens: "Tokens Mensuales",
    totalTokens: "Total Acumulado",
    activeChat: "Historial de Conversación Activa",
    tokenLimitHelp: "Consumo en relación con la asignación diaria",
    today: "Hoy",
    yesterday: "Ayer",
    previousDays: "Días Anteriores",
  },
  fr: {
    newChat: "Nouvelle Discussion",
    savedChats: "Discussions Enregistrées",
    noSavedChats: "Aucune discussion enregistrée",
    loadingChats: "Chargement...",
    tokenAnalytics: "Consommation de Jetons",
    dailyTokens: "Jetons Quotidiens",
    weeklyTokens: "Jetons Hebdomadaires",
    monthlyTokens: "Jetons Mensuels",
    totalTokens: "Total Cumulé",
    activeChat: "Historique de Discussion",
    tokenLimitHelp: "Consommation par rapport à l'allocation quotidienne",
    today: "Aujourd'hui",
    yesterday: "Hier",
    previousDays: "Jours Précédents",
  },
  de: {
    newChat: "Neuer Chat",
    savedChats: "Gespeicherte Chats",
    noSavedChats: "Noch keine gespeicherten Chats",
    loadingChats: "Chats werden geladen...",
    tokenAnalytics: "Token-Verbrauch",
    dailyTokens: "Tägliche Tokens",
    weeklyTokens: "Wöchentliche Tokens",
    monthlyTokens: "Monatliche Tokens",
    totalTokens: "Gesamtlebensdauer",
    activeChat: "Aktiver Chatverlauf",
    tokenLimitHelp: "Verbrauch im Vergleich zum Tageslimit",
    today: "Heute",
    yesterday: "Gestern",
    previousDays: "Vorherige Tage",
  },
  zh: {
    newChat: "新建对话",
    savedChats: "已存对话",
    noSavedChats: "暂无保存的对话",
    loadingChats: "正在加载对话...",
    tokenAnalytics: "代币消耗分析",
    dailyTokens: "今日代币",
    weeklyTokens: "本周代币",
    monthlyTokens: "本月代币",
    totalTokens: "累计总量",
    activeChat: "当前对话历史",
    tokenLimitHelp: "今日配额消耗比例",
    today: "今天",
    yesterday: "昨天",
    previousDays: "往日对话",
  },
  it: {
    newChat: "Nuova Chat",
    savedChats: "Chat Salvate",
    noSavedChats: "Nessuna chat salvata",
    loadingChats: "Caricamento chat...",
    tokenAnalytics: "Consumo Token",
    dailyTokens: "Token Giornalieri",
    weeklyTokens: "Token Settimanali",
    monthlyTokens: "Token Mensili",
    totalTokens: "Totale Accumulato",
    activeChat: "Cronologia Chat Attiva",
    tokenLimitHelp: "Consumo rispetto alla quota giornaliera",
    today: "Oggi",
    yesterday: "Ieri",
    previousDays: "Giorni Precedenti",
  }
};

const AvatarImage = ({ src, size }: { src: string, size: string }) => {
  const [error, setError] = useState(false);
  if (error) {
    return <span style={{ fontSize: `calc(${size} * 0.75)`, display: "inline-block", verticalAlign: "middle", fontFamily: "var(--font-sans)" }}>👤</span>;
  }
  return (
    <img
      src={src}
      alt="Avatar"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        display: "inline-block",
        verticalAlign: "middle"
      }}
      onError={() => setError(true)}
    />
  );
};

const renderAvatar = (avatarVal?: string, fontSize?: string) => {
  if (!avatarVal) return <span style={{ fontSize }} className="avatar-fallback">👤</span>;
  const isImage = avatarVal.startsWith("http") || avatarVal.startsWith("/") || avatarVal.includes(".") || avatarVal.includes("data:image");
  const size = fontSize === "2.5rem" ? "60px" :
               fontSize === "2.2rem" ? "48px" :
               fontSize === "1.8rem" ? "36px" :
               fontSize === "1.5rem" ? "30px" : 
               fontSize === "1.1rem" ? "22px" : "36px";
  if (isImage) {
    return <AvatarImage src={avatarVal} size={size} />;
  }
  return <span style={{ fontSize: fontSize || "1.5rem", display: "inline-block", verticalAlign: "middle", fontFamily: "var(--font-sans)" }}>{avatarVal}</span>;
};

const avatarCategories = {
  vectors: [
    { e: "/avatars/space_explorer.svg", lEn: "Space Explorer", lAr: "مستكشف الفضاء" },
    { e: "/avatars/wise_owl.svg", lEn: "Wise Owl", lAr: "بومة حكيمة" },
    { e: "/avatars/robot_tutor.svg", lEn: "Robot Tutor", lAr: "معلم آلي" }
  ],
  animals: [
    { e: "🐬", lEn: "Dolphin", lAr: "دلفين" },
    { e: "🦉", lEn: "Wise Owl", lAr: "بومة" },
    { e: "🦁", lEn: "Lion", lAr: "أسد" },
    { e: "🦊", lEn: "Fox", lAr: "ثعلب" },
    { e: "🐨", lEn: "Koala", lAr: "كوالا" },
    { e: "🐼", lEn: "Panda", lAr: "باندا" },
    { e: "🦄", lEn: "Unicorn", lAr: "وحيد القرن" },
    { e: "🐙", lEn: "Octopus", lAr: "أخطبوط" },
    { e: "🐢", lEn: "Turtle", lAr: "سلحفاة" },
    { e: "🦅", lEn: "Eagle", lAr: "نسر" },
    { e: "🐋", lEn: "Whale", lAr: "حوت" },
    { e: "🐯", lEn: "Tiger", lAr: "ببر" },
    { e: "🐒", lEn: "Monkey", lAr: "قرد" },
    { e: "🦖", lEn: "T-Rex", lAr: "ديناصور" }
  ],
  tech: [
    { e: "👾", lEn: "Invader", lAr: "كائن فضائي" },
    { e: "🤖", lEn: "Robot", lAr: "روبوت" },
    { e: "🚀", lEn: "Rocket", lAr: "صاروخ" },
    { e: "🧠", lEn: "Brain", lAr: "دماغ" },
    { e: "🧪", lEn: "Potion", lAr: "أنبوب اختبار" },
    { e: "🦸", lEn: "Hero", lAr: "بطل خارق" },
    { e: "🎨", lEn: "Art Palette", lAr: "لوحة ألوان" },
    { e: "👩‍💻", lEn: "Coder", lAr: "مبرمجة" },
    { e: "💻", lEn: "Laptop", lAr: "حاسوب محمول" },
    { e: "🔬", lEn: "Microscope", lAr: "مجهر" },
    { e: "🔭", lEn: "Telescope", lAr: "تلسكوب" },
    { e: "🛸", lEn: "UFO", lAr: "طبق طائر" }
  ],
  golden: [
    { e: "👑", lEn: "Crown", lAr: "تاج" },
    { e: "💎", lEn: "Diamond", lAr: "ألماسة" },
    { e: "✨", lEn: "Sparkles", lAr: "بريق" },
    { e: "⭐", lEn: "Star", lAr: "نجمة" },
    { e: "🏆", lEn: "Trophy", lAr: "كأس" },
    { e: "🛡️", lEn: "Shield", lAr: "درع" },
    { e: "🔮", lEn: "Crystal Ball", lAr: "بلورة سحرية" },
    { e: "🏅", lEn: "Medal", lAr: "ميدالية" },
    { e: "🔥", lEn: "Fire", lAr: "شعلة" },
    { e: "🌟", lEn: "Sparkling Star", lAr: "نجمة لامعة" }
  ]
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();

  const getTelemetryT = (key: keyof typeof telemetryTranslations.en) => {
    const lang = (language as keyof typeof telemetryTranslations) || "en";
    const dictionary = telemetryTranslations[lang] || telemetryTranslations.en;
    return dictionary[key] || telemetryTranslations.en[key];
  };

  const getHistoryT = (key: keyof typeof historyTranslations.en) => {
    const lang = (language as keyof typeof historyTranslations) || "en";
    const dictionary = historyTranslations[lang] || historyTranslations.en;
    return dictionary[key] || historyTranslations.en[key];
  };

  const getTabHeader = () => {
    switch (activeTab) {
      case "agent":
        return {
          title: t("dashboard_title"),
          subtitle: t("dashboard_subtitle")
        };
      case "admin":
        return {
          title: language === "ar" ? "لوحة الأمن والتحليل والتحكم" : "Security & System Telemetry",
          subtitle: language === "ar" ? "مراقبة إعدادات الأمان وجدار الحماية لوكلاء فاهم وسجلات التدقيق المباشرة." : "Audit active safety guardrails, GCP Model Armor policies, and secure real-time system logs."
        };
      case "super-admin-users":
        return {
          title: language === "ar" ? "إدارة الأعضاء والنشاط" : "Users & Activity Trail",
          subtitle: language === "ar" ? "عرض جميع المستخدمين المسجلين، تعيين الأدوار، حظر الحسابات، ومراقبة النشاط العام." : "View all enrolled users, manage roles, issue account bans, and inspect live user activity trails."
        };
      case "library":
        return {
          title: language === "ar" ? "المكتبة التعليمية الرقمية" : "Interactive Knowledge Library",
          subtitle: language === "ar" ? "تصفح وتحميل المناهج الدراسية، الكتب الإلكترونية، والمراجعات الشاملة لكافة المراحل." : "Explore, search, and download curriculum textbooks, comprehensive review sheets, and premium educational resources."
        };
      case "subjects":
        return {
          title: language === "ar" ? "المناهج والمواد الدراسية" : "Curriculum Subjects",
          subtitle: language === "ar" ? "مسارات تعليمية تفاعلية مصممة خصيصاً لمرحلتك الدراسية بمحتوى معزز بالذكاء الاصطناعي." : "Interactive, AI-enhanced course directory tailored explicitly to your current educational grade."
        };
      case "practice":
        return {
          title: language === "ar" ? "مركز التدريب والممارسة" : "Practice & Flashcards Workstation",
          subtitle: language === "ar" ? "عزز مهاراتك من خلال بنوك الأسئلة الذكية، والبطاقات التعليمية التفاعلية." : "Sharpen your knowledge with dynamic question banks and adaptive digital flashcards."
        };
      case "plan":
        return {
          title: language === "ar" ? "خطة الدراسة الشخصية" : "Personalized Study Planner",
          subtitle: language === "ar" ? "صمم جدولك الدراسي بمساعدة الذكاء الاصطناعي لتنظيم وقتك بذكاء وتحقيق أهدافك." : "Generate custom study roadmaps structured by our AI agent to align with your learning pace and goals."
        };
      case "timetable":
        return {
          title: language === "ar" ? "جدول الحصص والمحاضرات" : "Weekly Schedule & Timetable",
          subtitle: language === "ar" ? "نظم يومك الدراسي وتابع مواعيد الحصص المباشرة والدروس المسجلة بكل سهولة." : "Coordinate your weekly academic calendar and stay on top of classes, tasks, and live tutoring sessions."
        };
      case "quiz":
        return {
          title: language === "ar" ? "منصة الاختبارات والتقييم" : "Assessment & Quiz Arena",
          subtitle: language === "ar" ? "قيم مستواك الدراسي من خلال اختبارات قصيرة تفاعلية فورية والحصول على تقارير تفصيلية." : "Test your proficiency under real exam conditions with immediate feedback and performance reviews."
        };
      case "zatona":
        return {
          title: language === "ar" ? "الزتونة - ملخصات وأبحاث" : "Zatona - AI Summary & Research Hub",
          subtitle: language === "ar" ? "احصل على خلاصات الكتب والأبحاث المركزة بضغطة زر واحدة بذكاء فائق." : "Unlock high-yield concise executive summaries, deep academic research, and instant textbook digests."
        };
      case "social":
        return {
          title: language === "ar" ? "قنوات التواصل الاجتماعي والدردشة" : "Social Network & Interactive Chat",
          subtitle: language === "ar" ? "تواصل مع زملائك، المدرسين، وأولياء الأمور في بيئة تفاعلية آمنة." : "Engage with classmates, certified teachers, and school communities in a safe, interactive social ecosystem."
        };
      case "settings":
        return {
          title: language === "ar" ? "الإعدادات والخصوصية" : "Preferences & Privacy Control",
          subtitle: language === "ar" ? "إدارة وتعديل بيانات ملفك الشخصي، تعيين الصورة الرمزية، وتغيير تفضيلات الخصوصية." : "Manage your public profile information, change your dynamic avatars, and customize privacy visibility rules."
        };
      default:
        return {
          title: "Fahem Home",
          subtitle: "Welcome back to your personalized educational space."
        };
    }
  };

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [finalResult, setFinalResult] = useState("");
  
  // Superadmin status
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("library");

  // User Profile & Onboarding states
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  
  // Conversational Onboarding states
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingAge, setOnboardingAge] = useState("");
  const [onboardingCountry, setOnboardingCountry] = useState("");
  const [onboardingGradeOption, setOnboardingGradeOption] = useState<"recommended" | "custom" | "lifelong" | "skip">("recommended");
  const [onboardingCustomGrade, setOnboardingCustomGrade] = useState("");
  const [onboardingParentEmail, setOnboardingParentEmail] = useState("");
  const [onboardingAvatar, setOnboardingAvatar] = useState("");
  const [onboardingSchool, setOnboardingSchool] = useState("");
  const [onboardingUserType, setOnboardingUserType] = useState<"student" | "teacher" | "parent" | "admin">("student");
  const [onboardingUsername, setOnboardingUsername] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [onboardingChildrenCount, setOnboardingChildrenCount] = useState("");
  const [onboardingChildrenInSchool, setOnboardingChildrenInSchool] = useState("");
  const [avatarTab, setAvatarTab] = useState<"vectors" | "animals" | "tech" | "golden">("vectors");
  const [placesResults, setPlacesResults] = useState<any[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [selectedPlaceForBranch, setSelectedPlaceForBranch] = useState<any | null>(null);

  // Educational Hub & Super Admin User Manager states
  const [adminUserSearch, setAdminUserSearch] = useState("");
  const [inspectedUser, setInspectedUser] = useState<any | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [librarySubject, setLibrarySubject] = useState("all");
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [practiceSubject, setPracticeSubject] = useState("Math");
  const [timetableEvents, setTimetableEvents] = useState<any[]>([
    { id: 1, subject: "Mathematics", subjectAr: "الرياضيات", day: "Monday", dayAr: "الإثنين", time: "09:00 - 10:30", room: "Room 102" },
    { id: 2, subject: "Physics", subjectAr: "الفيزياء", day: "Monday", dayAr: "الإثنين", time: "11:00 - 12:30", room: "Lab A" },
    { id: 3, subject: "Arabic Language", subjectAr: "اللغة العربية", day: "Tuesday", dayAr: "الثلاثاء", time: "09:00 - 10:30", room: "Room 105" },
    { id: 4, subject: "Biology", subjectAr: "الأحياء", day: "Wednesday", dayAr: "الأربعاء", time: "10:00 - 11:30", room: "Lab B" },
    { id: 5, subject: "Computer Science", subjectAr: "علوم الحاسب", day: "Thursday", dayAr: "الخميس", time: "12:00 - 13:30", room: "Room 201" }
  ]);
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [zatonaPrompt, setZatonaPrompt] = useState("");
  const [zatonaResult, setZatonaResult] = useState("");
  const [zatonaLoading, setZatonaLoading] = useState(false);

  // Social & Messenger states
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [directorySearch, setDirectorySearch] = useState("");
  const [chatRecipient, setChatRecipient] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  
  // Parental child approval panel states
  const [parentChildren, setParentChildren] = useState<any[]>([]);
  const [parentChildrenLoading, setParentChildrenLoading] = useState(false);

  // Settings & Preferences states
  const [privacyVisibility, setPrivacyVisibility] = useState<"public" | "friends" | "private">("public");
  const [privacyAllowMessages, setPrivacyAllowMessages] = useState(true);
  const [privacyShowActivity, setPrivacyShowActivity] = useState(true);
  const [preferencesSchool, setPreferencesSchool] = useState("");

  // Session History, Chat History, Activity History & Telemetry states
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState<boolean>(false);
  const [activeSessionMessages, setActiveSessionMessages] = useState<any[]>([]);
  const [userTokenStats, setUserTokenStats] = useState<{
    daily: number;
    weekly: number;
    monthly: number;
    total: number;
    history: any[];
  } | null>(null);

  // Admin & Sourced Statistics/Logs States
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);
  const [selectedUserActivities, setSelectedUserActivities] = useState<any[] | null>(null);

  // Educational Hub Interactive states
  // 1. Library States
  const [downloadingLibId, setDownloadingLibId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadedLibs, setDownloadedLibs] = useState<string[]>([]);

  // 2. Subjects States
  const [subjectsExpandedGrade, setSubjectsExpandedGrade] = useState<string | null>(null);

  // 3. Practice States
  const [practiceFlashCardId, setPracticeFlashCardId] = useState<number | null>(null);
  const [isFlashCardFlipped, setIsFlashCardFlipped] = useState(false);
  const [practiceSelectedOption, setPracticeSelectedOption] = useState<number | null>(null);
  const [practiceAnswerChecked, setPracticeAnswerChecked] = useState(false);
  const [practiceQuestionIndex, setPracticeQuestionIndex] = useState(0);

  // 4. Plan States
  const [planGoal, setPlanPlanGoal] = useState("");
  const [planHours, setPlanDailyHours] = useState("2");
  const [planSubject, setPlanSubject] = useState("Mathematics");
  const [planOutput, setPlanOutput] = useState<any[] | null>(null);
  const [planCheckedTasks, setPlanCheckedTasks] = useState<string[]>([]);

  // 5. Timetable States
  const [selectedTimetableClass, setSelectedTimetableClass] = useState<any | null>(null);

  // 6. Quiz States
  const [quizActive, setQuizActive] = useState(false);
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [quizTimeLeft, setQuizTimeLeft] = useState(300); // 5 minutes
  const [quizResult, setQuizScoreResult] = useState<{ score: number; passed: boolean } | null>(null);

  // 7. Zatona States
  const [zatonaQuery, setZatonaQuery] = useState("");
  const [zatonaTab, setZatonaTab] = useState<"summary" | "terms" | "mindmap">("summary");

  // Grounded Multi-Agent Test Bench State
  const [groundedPrompt, setGroundedPrompt] = useState("");
  const [groundedInput, setGroundedInput] = useState("");
  const [groundedLoading, setGroundedLoading] = useState(false);
  const [groundedLogs, setGroundedLogs] = useState<string[]>([]);
  const [groundedResult, setGroundedResult] = useState("");
  const groundedLogsEndRef = useRef<HTMLDivElement>(null);
  const onboardingEndRef = useRef<HTMLDivElement>(null);
  const onboardingScrollContainerRef = useRef<HTMLDivElement>(null);

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

  const fetchAllUsersList = async () => {
    setLoadingAllUsers(true);
    try {
      const res = await fetch("/api/user/list");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching all users:", err);
    } finally {
      setLoadingAllUsers(false);
    }
  };

  const fetchParentChildrenList = async () => {
    if (!user || !user.email) return;
    setParentChildrenLoading(true);
    try {
      const res = await fetch(`/api/parent/children?parentEmail=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        setParentChildren(data.children || []);
      }
    } catch (err) {
      console.error("Error fetching children list:", err);
    } finally {
      setParentChildrenLoading(false);
    }
  };

  const approveChildProfile = async (childId: string) => {
    if (!user || !user.email) return;
    try {
      const res = await fetch("/api/parent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentEmail: user.email, childId })
      });
      if (res.ok) {
        await fetchParentChildrenList();
        // Log action
        await logActivity("parent_approve_child", "success", `Approved child ${childId}`);
      }
    } catch (err) {
      console.error("Error approving child:", err);
    }
  };

  const fetchChatMessages = async (recipientId: string) => {
    if (!user) return;
    setChatLoading(true);
    try {
      const res = await fetch(`/api/chat/message?senderId=${encodeURIComponent(user.uid)}&recipientId=${encodeURIComponent(recipientId)}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    } finally {
      setChatLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!user || !chatRecipient || !chatInput.trim()) return;
    const msgContent = chatInput.trim();
    setChatInput("");
    
    // Optimistic update
    const tempMsg = {
      senderId: user.uid,
      senderName: userProfile?.name || user.email?.split("@")[0] || "Me",
      recipientId: chatRecipient.userId,
      content: msgContent,
      timestamp: new Date().toISOString()
    };
    setChatMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.uid,
          senderName: userProfile?.name || user.email?.split("@")[0] || "Me",
          recipientId: chatRecipient.userId,
          content: msgContent,
          isGroup: false
        })
      });
      if (res.ok) {
        // Log activity
        await logActivity("send_chat_message", "success", `Sent direct message to ${chatRecipient.userId}`);
        // Fetch actual list to keep sync
        const messagesRes = await fetch(`/api/chat/message?senderId=${encodeURIComponent(user.uid)}&recipientId=${encodeURIComponent(chatRecipient.userId)}`);
        if (messagesRes.ok) {
          const mData = await messagesRes.json();
          setChatMessages(mData.messages || []);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const logActivity = async (action: string, status: string, details?: string) => {
    if (!user) return;
    try {
      await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email || "",
          action,
          status,
          details
        })
      });
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  };

  const handleUpdatePrivacySettings = async () => {
    if (!user || !userProfile) return;
    try {
      const updatedProfile = {
        ...userProfile,
        school: preferencesSchool,
        privacySettings: {
          profileVisibility: privacyVisibility,
          allowMessages: privacyAllowMessages,
          showActivity: privacyShowActivity
        }
      };
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          profile: updatedProfile
        })
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.status !== "error") {
          setUserProfile(updatedProfile);
          alert(language === "ar" ? "تم تحديث الإعدادات بنجاح!" : "Preferences updated successfully!");
          await logActivity("update_preferences", "success", "Updated privacy and account settings");
        } else {
          console.error("Failed to update preferences: backend returned error", resData.error || "");
          alert(language === "ar"
            ? `فشل تحديث الإعدادات: ${resData.error || "خطأ غير معروف في الخادم"}`
            : `Failed to update preferences: ${resData.error || "unknown server error"}`
          );
        }
      } else {
        const errorText = await res.text();
        console.error("Failed to update privacy settings:", errorText);
        alert(language === "ar"
          ? "فشل الاتصال بالخادم لتحديث الإعدادات."
          : "Failed to connect to server to update preferences."
        );
      }
    } catch (err) {
      console.error("Error updating privacy settings:", err);
    }
  };

  const handleDeleteUserAccount = async () => {
    if (!user || !user.email) return;
    const confirmMsg = language === "ar" 
      ? "تنبيه هام جداً: هل أنت متأكد تماماً من حذف حسابك بالكامل؟ سيؤدي هذا إلى مسح كافة بياناتك وسجلاتك ومحادثاتك نهائياً من قاعدة البيانات بلا رجعة وفقاً لمعايير GDPR."
      : "CRITICAL WARNING: Are you absolutely sure you want to delete your account? This will permanently wipe your profile, chat history, activity logs, and token telemetry from the database in compliance with GDPR. This action CANNOT be undone.";
    
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/user/account?userId=${encodeURIComponent(user.uid)}&email=${encodeURIComponent(user.email)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert(language === "ar" ? "تم مسح حسابك وكافة بياناتك بنجاح من النظام." : "Your account and all associated records have been successfully erased.");
        // Sign out
        await signOut(auth);
        router.push(`/${language}`);
      }
    } catch (err) {
      console.error("Error deleting account:", err);
    }
  };

  // Onboarding Chat Messages State
  const [onboardingMessages, setOnboardingMessages] = useState<Array<{ sender: "fahem" | "user"; text: string }>>([
    { sender: "fahem", text: "Welcome to Fahem Educational Platform! 🚀 I'm your AI guide, and I will help you set up your custom profile in a few simple and interactive steps." },
    { sender: "fahem", text: "To begin, what is your role on our platform today? Select from the cards below:" }
  ]);

  // Country Localizer Helper
  const getLocalizedCountryName = (country: string, isArabic: boolean) => {
    switch (country) {
      case "Egypt":
        return isArabic ? "مصر 🇪🇬" : "Egypt 🇪🇬";
      case "Saudi Arabia":
        return isArabic ? "المملكة العربية السعودية 🇸🇦" : "Saudi Arabia 🇸🇦";
      case "UAE":
        return isArabic ? "الإمارات العربية المتحدة 🇦🇪" : "UAE 🇦🇪";
      case "Qatar":
        return isArabic ? "قطر 🇶🇦" : "Qatar 🇶🇦";
      case "Kuwait":
        return isArabic ? "الكويت 🇰🇼" : "Kuwait 🇰🇼";
      case "Oman":
        return isArabic ? "عمان 🇴🇲" : "Oman 🇴🇲";
      case "Jordan":
        return isArabic ? "الأردن 🇯🇴" : "Jordan 🇯🇴";
      case "USA":
        return isArabic ? "الولايات المتحدة الأمريكية 🇺🇸" : "USA 🇺🇸";
      case "UK":
        return isArabic ? "المملكة المتحدة 🇬🇧" : "UK 🇬🇧";
      case "Other":
        return isArabic ? "بلد آخر 🌍" : "Other Country 🌍";
      default:
        return country;
    }
  };

  // Grade Suggestion Helper
  const getGradeSuggestion = (ageStr: string, country: string, isArabic: boolean) => {
    const age = parseInt(ageStr);
    if (isNaN(age) || age <= 0) {
      return isArabic ? "متعلم مدى الحياة 🧠" : "Lifelong Learner 🧠";
    }
    if (age < 4) {
      return isArabic ? "مرحلة الحضانة 👶" : "Preschool / Toddler 👶";
    }
    if (age === 4 || age === 5) {
      return isArabic ? "مرحلة الروضة / التمهيدي 🧸" : "Kindergarten / Preschool 🧸";
    }
    if (age >= 18) {
      return isArabic ? "طالب جامعي / متعلم مدى الحياة 🎓" : "University Student / Lifelong Learner 🎓";
    }
    
    const egyptGradesAr: Record<number, string> = {
      6: "الصف الأول الابتدائي",
      7: "الصف الثاني الابتدائي",
      8: "الصف الثالث الابتدائي",
      9: "الصف الرابع الابتدائي",
      10: "الصف الخامس الابتدائي",
      11: "الصف السادس الابتدائي",
      12: "الصف الأول الإعدادي",
      13: "الصف الثاني الإعدادي",
      14: "الصف الثالث الإعدادي",
      15: "الصف الأول الثانوي",
      16: "الصف الثاني الثانوي",
      17: "الصف الثالث الثانوي"
    };

    const gulfGradesAr: Record<number, string> = {
      6: "الصف الأول الابتدائي",
      7: "الصف الثاني الابتدائي",
      8: "الصف الثالث الابتدائي",
      9: "الصف الرابع الابتدائي",
      10: "الصف الخامس الابتدائي",
      11: "الصف السادس الابتدائي",
      12: "الصف الأول المتوسط",
      13: "الصف الثاني المتوسط",
      14: "الصف الثالث المتوسط",
      15: "الصف الأول الثانوي",
      16: "الصف الثاني الثانوي",
      17: "الصف الثالث الثانوي"
    };

    const standardGradesEn: Record<number, string> = {
      6: "Grade 1 (Primary)",
      7: "Grade 2 (Primary)",
      8: "Grade 3 (Primary)",
      9: "Grade 4 (Primary)",
      10: "Grade 5 (Primary)",
      11: "Grade 6 (Primary)",
      12: "Grade 7 (Middle/Prep)",
      13: "Grade 8 (Middle/Prep)",
      14: "Grade 9 (Middle/Prep)",
      15: "Grade 10 (Secondary/High)",
      16: "Grade 11 (Secondary/High)",
      17: "Grade 12 (Secondary/High)"
    };

    const isEgypt = country.toLowerCase().includes("egypt") || country.includes("مصر");
    
    if (isArabic) {
      if (isEgypt) {
        return egyptGradesAr[age] || `الصف ${age - 5}`;
      } else {
        return gulfGradesAr[age] || `الصف ${age - 5}`;
      }
    } else {
      return standardGradesEn[age] || `Grade ${age - 5}`;
    }
  };

  // Reconstruct onboarding messages history for seamless translation without losing progress
  const getOnboardingHistory = (isArabic: boolean) => {
    const list: Array<{ sender: "fahem" | "user"; text: string }> = [];

    // Welcome messages (Step 0)
    list.push({
      sender: "fahem",
      text: isArabic
        ? "مرحباً بك في منصة فاهم التعليمية! 🚀 أنا مرشدك الذكي، وسأساعدك في تهيئة حسابك الشخصي بخطوات بسيطة وممتعة تفاعلية."
        : "Welcome to Fahem Educational Platform! 🚀 I'm your AI guide, and I will help you set up your custom profile in a few simple and interactive steps."
    });
    list.push({
      sender: "fahem",
      text: isArabic
        ? "في البداية، ما هو دورك في منصتنا اليوم؟ اختر من البطاقات أدناه:"
        : "To begin, what is your role on our platform today? Select from the cards below:"
    });

    if (onboardingStep === 0) return list;

    // Step 1: User chose user type
    const roleText = onboardingUserType === "student" ? (isArabic ? "طالب" : "Student") :
                     onboardingUserType === "teacher" ? (isArabic ? "معلم" : "Teacher") :
                     onboardingUserType === "parent" ? (isArabic ? "ولي أمر" : "Parent") :
                     (isArabic ? "مشرف" : "Admin");
    list.push({ sender: "user", text: roleText });
    list.push({
      sender: "fahem",
      text: isArabic ? "مرحباً بك! ما هو اسمك الكامل؟ 👋" : "Excellent! What is your full name? 👋"
    });

    if (onboardingStep === 1) return list;

    // Step 8: User typed full name, now asking for Username
    list.push({ sender: "user", text: onboardingName });
    list.push({
      sender: "fahem",
      text: isArabic
        ? `سعدت بلقائك يا ${onboardingName}! 🌟 يرجى اختيار اسم مستخدم (Username) فريد لحسابك. سيتم استخدامه في رابط ملفك الشخصي بدلاً من الأرقام:`
        : `Nice to meet you, ${onboardingName}! 🌟 Please choose a unique username for your account. This will be used in your profile URL instead of numbers:`
    });

    if (onboardingStep === 8) return list;

    // Step 2/3: User chose username
    list.push({ sender: "user", text: `@${onboardingUsername}` });

    if (onboardingUserType === "admin") {
      list.push({
        sender: "fahem",
        text: isArabic
          ? "رائع جداً! بصفتك مشرفاً، سننتقل الآن مباشرةً لاختيار صورتك الرمزية (الرمز التعبيري) لإتمام الإعداد:"
          : "Awesome! As an Admin, we will now skip directly to choosing your profile avatar to finish:"
      });
      return list;
    }

    if (onboardingUserType === "student") {
      list.push({
        sender: "fahem",
        text: isArabic
          ? `رائع جداً! اسم المستخدم @${onboardingUsername} متاح لحسابك. كم عمرك الآن؟ 🎂`
          : `Awesome! Username @${onboardingUsername} is available. How old are you? 🎂`
      });

      if (onboardingStep === 2) return list;

      // User typed age
      list.push({
        sender: "user",
        text: isArabic ? `عمري ${onboardingAge} عاماً` : `I am ${onboardingAge} years old`
      });
      list.push({
        sender: "fahem",
        text: isArabic ? `رائع! ما هي بلد إقامتك؟ 🌍` : `Great! What is your country of residence? 🌍`
      });

      if (onboardingStep === 3) return list;

      // User selected country
      const localizedCountry = getLocalizedCountryName(onboardingCountry, isArabic);
      list.push({
        sender: "user",
        text: isArabic ? `أقيم في ${localizedCountry}` : `I live in ${localizedCountry}`
      });

      const proposedGradeText = getGradeSuggestion(onboardingAge, onboardingCountry, isArabic);
      list.push({
        sender: "fahem",
        text: isArabic
          ? `بناءً على عمرك (${onboardingAge} سنة) وإقامتك في (${localizedCountry})، نقترح عليك المسار الدراسي: **${proposedGradeText}**.\n\nهل ترغب في قبول هذا الاقتراح، أو إدخال صف مخصص، أو اختيار متعلم مدى الحياة، أو تخطي هذه الخطوة؟`
          : `Based on your age of ${onboardingAge} and residing in ${localizedCountry}, we recommend: **${proposedGradeText}**.\n\nWould you like to accept this recommendation, enter a custom grade, choose 'Lifelong Learner', or skip this step?`
      });

      if (onboardingStep === 4) return list;

      // User chose grade option
      let choiceText = "";
      if (onboardingGradeOption === "recommended") {
        choiceText = proposedGradeText;
      } else if (onboardingGradeOption === "lifelong") {
        choiceText = isArabic ? "متعلم مدى الحياة" : "Lifelong Learner";
      } else if (onboardingGradeOption === "skip") {
        choiceText = isArabic ? "تخطي هذه الخطوة" : "Skip Step";
      } else {
        choiceText = `${isArabic ? "صف مخصص:" : "Custom Grade:"} ${onboardingCustomGrade}`;
      }
      list.push({ sender: "user", text: choiceText });

      const ageVal = parseInt(onboardingAge) || 0;
      if (ageVal < 13) {
        list.push({
          sender: "fahem",
          text: isArabic
            ? "تنبيه الأمان والرقابة الأبوية 🛡️: بما أن عمرك أقل من 13 سنة، فإننا نطبق معايير الخصوصية لحماية الأطفال. يرجى كتابة البريد الإلكتروني لولي أمرك ليقوم بالموافقة على تفعيل حسابك من لوحته الخاصة:"
            : "Safety & Parental Consent Notice 🛡️: Since you are under 13, standard age limit protections apply. Please enter your parent's email address so they can approve your account from their portal:"
        });

        if (onboardingStep === 6) return list;

        // User typed parent email
        list.push({ sender: "user", text: onboardingParentEmail });
        list.push({
          sender: "fahem",
          text: isArabic
            ? "شكراً لك! تم تسجيل البريد الأبوي للموافقة الأمنية. الآن، ما هو اسم المدرسة أو الجامعة التي تدرس بها حالياً؟ 🏫 (اكتب للبحث)"
            : "Thank you! Parental email registered for approval check. Now, what is the name of the school or university where you study? 🏫 (Type to search)"
        });
      } else {
        list.push({
          sender: "fahem",
          text: isArabic
            ? "رائع جداً! ما هو اسم المدرسة أو الجامعة التي تدرس بها حالياً؟ 🏫 (اكتب للبحث في الخريطة)"
            : "Awesome! What is the name of the school or university where you currently study? 🏫 (Type to search)"
        });
      }

      if (onboardingStep === 5) return list;

      // User chose school
      list.push({
        sender: "user",
        text: onboardingSchool ? onboardingSchool : (isArabic ? "تخطي" : "Skipped")
      });
      list.push({
        sender: "fahem",
        text: isArabic
          ? "رائع جداً! لقد أكملنا البيانات الأساسية. الآن، اختر صورتك الرمزية المفضلة لملفك الشخصي من المكتبة المتنوعة أدناه:"
          : "Excellent! We have captured your core info. Now, select your preferred avatar from our diverse library below to complete onboarding:"
      });

      return list;

    } else {
      // Teacher or Parent flow
      list.push({
        sender: "fahem",
        text: isArabic
          ? `رائع جداً! اسم المستخدم @${onboardingUsername} متاح لحسابك. ما هي بلد إقامتك؟ 🌍`
          : `Awesome! Username @${onboardingUsername} is available. What is your country of residence? 🌍`
      });

      if (onboardingStep === 3) return list;

      // User selected country
      const localizedCountry = getLocalizedCountryName(onboardingCountry, isArabic);
      list.push({
        sender: "user",
        text: isArabic ? `أقيم في ${localizedCountry}` : `I live in ${localizedCountry}`
      });

      const nextMsg = onboardingUserType === "teacher"
        ? (isArabic ? "ممتاز! ما هو اسم المدرسة أو المؤسسة التعليمية التي تعمل بها حالياً؟ 🏫 (اكتب للبحث)" : "Excellent! What is the name of the school or educational institution where you work? 🏫 (Type to search)")
        : (isArabic ? "ممتاز! ما هو اسم مدرسة أو جامعة أطفالك؟ 🏫 (اكتب للبحث)" : "Excellent! What is the name of your children's school or university? 🏫 (Type to search)");
      list.push({ sender: "fahem", text: nextMsg });

      if (onboardingStep === 5) return list;

      // User chose school
      list.push({
        sender: "user",
        text: onboardingSchool ? onboardingSchool : (isArabic ? "تخطي" : "Skipped")
      });
      list.push({
        sender: "fahem",
        text: isArabic ? "كم عدد أطفالك بشكل عام؟ 👪" : "How many children do you have in general? 👪"
      });

      if (onboardingStep === 10) return list;

      // User typed children count
      list.push({ sender: "user", text: onboardingChildrenCount });
      list.push({
        sender: "fahem",
        text: isArabic
          ? "منهم، كم عدد الأطفال الذين يدرسون حالياً في المدارس أو الجامعات؟ 🏫"
          : "Out of those, how many are studying in schools or universities? 🏫"
      });

      if (onboardingStep === 11) return list;

      // User typed children in school count
      list.push({ sender: "user", text: onboardingChildrenInSchool });
      list.push({
        sender: "fahem",
        text: isArabic
          ? "رائع جداً! لقد أكملنا كل التفاصيل الخاصة بك. أخيراً، اختر صورتك الرمزية المفضلة والحديثة من المكتبة الفاخرة أدناه:"
          : "Wonderful! We have gathered all details. Finally, select your favorite, modern avatar from our premium library below to complete onboarding:"
      });

      return list;
    }
  };

  // Handle Dynamic Translation for Onboarding
  useEffect(() => {
    setOnboardingMessages(getOnboardingHistory(language === "ar"));
  }, [language]);

  // Smooth scroll to the latest message during onboarding without scroll-fighting
  useEffect(() => {
    const scrollContainer = onboardingScrollContainerRef.current;
    if (scrollContainer) {
      // Instant scroll lock
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      // Smooth layout transition adjustment
      const timer = setTimeout(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth"
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [onboardingMessages, onboardingStep]);

  // Google Places API integration helper
  const fetchPlaces = async (query: string) => {
    if (query.trim().length < 2) {
      setPlacesResults([]);
      return;
    }
    setSearchingPlaces(true);
    try {
      const countryParam = onboardingCountry || "Egypt";
      const res = await fetch(`/api/places/search?query=${encodeURIComponent(query)}&country=${encodeURIComponent(countryParam)}`);
      if (res.ok) {
        const data = await res.json();
        setPlacesResults(data.results || []);
      }
    } catch (err) {
      console.error("Error searching places:", err);
    } finally {
      setSearchingPlaces(false);
    }
  };

  const handleOnboardingNext = async (
    overrideGradeOption?: "recommended" | "custom" | "lifelong" | "skip",
    overrideSchool?: string
  ) => {
    if (onboardingStep === 0) { // User type selection
      const roleText = onboardingUserType === "student" ? (language === "ar" ? "طالب" : "Student") :
                       onboardingUserType === "teacher" ? (language === "ar" ? "معلم" : "Teacher") :
                       onboardingUserType === "parent" ? (language === "ar" ? "ولي أمر" : "Parent") :
                       (language === "ar" ? "مشرف" : "Admin");
      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: roleText },
        { sender: "fahem", text: language === "ar" ? "مرحباً بك! ما هو اسمك الكامل؟ 👋" : "Excellent! What is your full name? 👋" }
      ]);
      setOnboardingStep(1);
    } else if (onboardingStep === 1) { // Name step
      if (!onboardingName.trim()) return;

      // Generate username suggestions based on the user's full name
      const cleanParts = onboardingName.trim().toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
      const suggestionsList: string[] = [];
      if (cleanParts.length > 0) {
        const p1 = cleanParts[0];
        const p2 = cleanParts[1] || "";
        suggestionsList.push(p2 ? `${p1}_${p2}` : `${p1}_fahem`);
        suggestionsList.push(`${p1}${Math.floor(100 + Math.random() * 900)}`);
        suggestionsList.push(p2 ? `${p2}_${p1}` : `${p1}_active`);
      } else {
        suggestionsList.push("user_" + Math.floor(1000 + Math.random() * 9000));
        suggestionsList.push("fahem_learner");
      }
      setUsernameSuggestions(suggestionsList);

      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: onboardingName },
        { 
          sender: "fahem", 
          text: language === "ar" 
            ? `سعدت بلقائك يا ${onboardingName}! 🌟 يرجى اختيار اسم مستخدم (Username) فريد لحسابك. سيتم استخدامه في رابط ملفك الشخصي بدلاً من الأرقام:` 
            : `Nice to meet you, ${onboardingName}! 🌟 Please choose a unique username for your account. This will be used in your profile URL instead of numbers:`
        }
      ]);
      setOnboardingStep(8); // Go to username selection
    } else if (onboardingStep === 8) { // Username step
      const inputUsername = onboardingUsername.trim();
      if (!inputUsername) return;

      // Alphanumeric and underscores between 3 and 20 chars
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(inputUsername)) {
        setUsernameError(
          language === "ar"
            ? "يجب أن يتراوح اسم المستخدم بين 3 إلى 20 حرفاً، ويحتوي فقط على أحرف إنجليزية وأرقام وشرطة سفلية (_)"
            : "Username must be 3-20 characters, containing only English letters, numbers, and underscores (_)"
        );
        return;
      }

      setUsernameError("");
      setCheckingUsername(true);
      try {
        const checkRes = await fetch(`/api/user/username/check?username=${encodeURIComponent(inputUsername)}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.available) {
            if (onboardingUserType === "admin") {
              setOnboardingMessages(prev => [
                ...prev,
                { sender: "user", text: `@${inputUsername}` },
                { sender: "fahem", text: language === "ar" ? "رائع جداً! بصفتك مشرفاً، سننتقل الآن مباشرةً لاختيار صورتك الرمزية (الرمز التعبيري) لإتمام الإعداد:" : "Awesome! As an Admin, we will now skip directly to choosing your profile avatar to finish:" }
              ]);
              setOnboardingStep(7); // Admins go straight to avatar selection
            } else {
              setOnboardingMessages(prev => [
                ...prev,
                { sender: "user", text: `@${inputUsername}` },
                onboardingUserType === "student"
                  ? { sender: "fahem", text: language === "ar" ? `رائع جداً! اسم المستخدم @${inputUsername} متاح لحسابك. كم عمرك الآن؟ 🎂` : `Awesome! Username @${inputUsername} is available. How old are you? 🎂` }
                  : { sender: "fahem", text: language === "ar" ? `رائع جداً! اسم المستخدم @${inputUsername} متاح لحسابك. ما هي بلد إقامتك؟ 🌍` : `Awesome! Username @${inputUsername} is available. What is your country of residence? 🌍` }
              ]);
              setOnboardingStep(onboardingUserType === "student" ? 2 : 3);
            }
          } else {
            setUsernameError(
              language === "ar"
                ? "عذراً، اسم المستخدم هذا محجوز مسبقاً! يرجى تجربة اسم آخر أو اختيار أحد الاقتراحات أدناه."
                : "Sorry, this username is already taken! Please try another one or choose from the suggestions below."
            );
          }
        } else {
          setUsernameError(language === "ar" ? "فشل التحقق من اسم المستخدم. يرجى المحاولة مرة أخرى." : "Failed to verify username. Please try again.");
        }
      } catch (err) {
        console.error("Error checking username:", err);
        setUsernameError(language === "ar" ? "فشل الاتصال بالخادم." : "Connection failed.");
      } finally {
        setCheckingUsername(false);
      }
    } else if (onboardingStep === 2) { // Age step (Student only)
      if (!onboardingAge.trim()) return;
      const ageVal = parseInt(onboardingAge);
      if (isNaN(ageVal) || ageVal <= 0) return;
      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: language === "ar" ? `عمري ${onboardingAge} عاماً` : `I am ${onboardingAge} years old` },
        { sender: "fahem", text: language === "ar" ? `رائع! ما هي بلد إقامتك؟ 🌍` : `Great! What is your country of residence? 🌍` }
      ]);
      setOnboardingStep(3);
    } else if (onboardingStep === 3) { // Country step
      if (!onboardingCountry.trim()) return;
      
      const localizedCountry = getLocalizedCountryName(onboardingCountry, language === "ar");

      if (onboardingUserType === "student") {
        const proposedGradeText = getGradeSuggestion(onboardingAge, onboardingCountry, language === "ar");
        setOnboardingMessages(prev => [
          ...prev,
          { sender: "user", text: language === "ar" ? `أقيم في ${localizedCountry}` : `I live in ${localizedCountry}` },
          { 
            sender: "fahem", 
            text: language === "ar"
              ? `بناءً على عمرك (${onboardingAge} سنة) وإقامتك في (${localizedCountry})، نقترح عليك المسار الدراسي: **${proposedGradeText}**.\n\nهل ترغب في قبول هذا الاقتراح، أو إدخال صف مخصص، أو اختيار متعلم مدى الحياة، أو تخطي هذه الخطوة؟`
              : `Based on your age of ${onboardingAge} and residing in ${localizedCountry}, we recommend: **${proposedGradeText}**.\n\nWould you like to accept this recommendation, enter a custom grade, choose 'Lifelong Learner', or skip this step?`
          }
        ]);
        setOnboardingStep(4);
      } else {
        // Teacher or Parent school step prompt
        const nextMsg = onboardingUserType === "teacher"
          ? (language === "ar" ? "ممتاز! ما هو اسم المدرسة أو المؤسسة التعليمية التي تعمل بها حالياً؟ 🏫 (اكتب للبحث)" : "Excellent! What is the name of the school or educational institution where you work? 🏫 (Type to search)")
          : (language === "ar" ? "ممتاز! ما هو اسم مدرسة أو جامعة أطفالك؟ 🏫 (اكتب للبحث)" : "Excellent! What is the name of your children's school or university? 🏫 (Type to search)");
        
        setOnboardingMessages(prev => [
          ...prev,
          { sender: "user", text: language === "ar" ? `أقيم في ${localizedCountry}` : `I live in ${localizedCountry}` },
          { sender: "fahem", text: nextMsg }
        ]);
        setOnboardingStep(5);
      }
    } else if (onboardingStep === 4) { // Grade Proposal step (Student only)
      const proposedGradeText = getGradeSuggestion(onboardingAge, onboardingCountry, language === "ar");
      let choiceText = "";
      const currentOpt = overrideGradeOption || onboardingGradeOption;
      if (currentOpt === "recommended") choiceText = proposedGradeText;
      else if (currentOpt === "lifelong") choiceText = language === "ar" ? "متعلم مدى الحياة" : "Lifelong Learner";
      else if (currentOpt === "skip") choiceText = language === "ar" ? "تخطي هذه الخطوة" : "Skip Step";
      else choiceText = `${language === "ar" ? "صف مخصص:" : "Custom Grade:"} ${onboardingCustomGrade}`;

      const ageVal = parseInt(onboardingAge);
      const isUnderage = ageVal < 13;

      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: choiceText }
      ]);

      if (isUnderage) {
        setOnboardingMessages(prev => [
          ...prev,
          { 
            sender: "fahem", 
            text: language === "ar"
              ? "تنبيه الأمان والرقابة الأبوية 🛡️: بما أن عمرك أقل من 13 سنة، فإننا نطبق معايير الخصوصية لحماية الأطفال. يرجى كتابة البريد الإلكتروني لولي أمرك ليقوم بالموافقة على تفعيل حسابك من لوحته الخاصة:"
              : "Safety & Parental Consent Notice 🛡️: Since you are under 13, standard age limit protections apply. Please enter your parent's email address so they can approve your account from their portal:"
          }
        ]);
        setOnboardingStep(6); // Underage student goes to parent email
      } else {
        setOnboardingMessages(prev => [
          ...prev,
          { 
            sender: "fahem", 
            text: language === "ar"
              ? "رائع جداً! ما هو اسم المدرسة أو الجامعة التي تدرس بها حالياً؟ 🏫 (اكتب للبحث في الخريطة)"
              : "Awesome! What is the name of the school or university where you currently study? 🏫 (Type to search)"
          }
        ]);
        setOnboardingStep(5); // Student goes to school search
      }
    } else if (onboardingStep === 5) { // School search step
      const schoolName = (overrideSchool !== undefined ? overrideSchool : onboardingSchool).trim();
      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: schoolName ? schoolName : (language === "ar" ? "تخطي" : "Skipped") }
      ]);

      if (onboardingUserType === "student") {
        setOnboardingMessages(prev => [
          ...prev,
          { 
            sender: "fahem", 
            text: language === "ar"
              ? "رائع جداً! لقد أكملنا البيانات الأساسية. الآن، اختر صورتك الرمزية المفضلة لملفك الشخصي من المكتبة المتنوعة أدناه:"
              : "Excellent! We have captured your core info. Now, select your preferred avatar from our diverse library below to complete onboarding:"
          }
        ]);
        setOnboardingStep(7); // Student goes to avatar selection
      } else {
        // Teacher or Parent children count prompt (Item 7)
        setOnboardingMessages(prev => [
          ...prev,
          { 
            sender: "fahem", 
            text: language === "ar"
              ? "كم عدد أطفالك بشكل عام؟ 👪"
              : "How many children do you have in general? 👪"
          }
        ]);
        setOnboardingStep(10); // Go to children count step
      }
    } else if (onboardingStep === 6) { // Parent email step (Underage Student only)
      if (!onboardingParentEmail.trim()) return;
      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: onboardingParentEmail },
        { 
          sender: "fahem", 
          text: language === "ar"
            ? "شكراً لك! تم تسجيل البريد الأبوي للموافقة الأمنية. الآن، ما هو اسم المدرسة أو الجامعة التي تدرس بها حالياً؟ 🏫 (اكتب للبحث)"
            : "Thank you! Parental email registered for approval check. Now, what is the name of the school or university where you study? 🏫 (Type to search)"
        }
      ]);
      setOnboardingStep(5); // Go to school search step after parent email
    } else if (onboardingStep === 10) { // Children count step (Teacher/Parent)
      const count = onboardingChildrenCount.trim();
      if (!count) return;
      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: count },
        { 
          sender: "fahem", 
          text: language === "ar"
            ? "منهم، كم عدد الأطفال الذين يدرسون حالياً في المدارس أو الجامعات؟ 🏫"
            : "Out of those, how many are studying in schools or universities? 🏫"
        }
      ]);
      setOnboardingStep(11); // Go to children in school count step
    } else if (onboardingStep === 11) { // Children in school/university count step (Teacher/Parent)
      const inSchoolCount = onboardingChildrenInSchool.trim();
      if (!inSchoolCount) return;
      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: inSchoolCount },
        { 
          sender: "fahem", 
          text: language === "ar"
            ? "رائع جداً! لقد أكملنا كل التفاصيل الخاصة بك. أخيراً، اختر صورتك الرمزية المفضلة والحديثة من المكتبة الفاخرة أدناه:"
            : "Wonderful! We have gathered all details. Finally, select your favorite, modern avatar from our premium library below to complete onboarding:"
        }
      ]);
      setOnboardingStep(7); // Go to avatar selection
    }
  };

  const handleOnboardingComplete = async (avatarEmoji: string) => {
    if (!user) return;
    setOnboardingAvatar(avatarEmoji);
    setLoadingProfile(true);

    const gradeVal = onboardingGradeOption === "recommended"
      ? getGradeSuggestion(onboardingAge, onboardingCountry, language === "ar")
      : onboardingGradeOption === "custom" ? onboardingCustomGrade
      : onboardingGradeOption === "lifelong" ? "lifelong" : "skipped";

    const isUnderage = onboardingUserType === "student" && parseInt(onboardingAge) < 13;

    // Generate/Use a unique username
    let usernameVal = onboardingUsername.trim();
    if (!usernameVal) {
      const emailPrefix = user.email ? user.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") : "";
      const cleanedPrefix = emailPrefix.slice(0, 15);
      usernameVal = cleanedPrefix.length >= 3 
        ? `${cleanedPrefix}_${Math.floor(100 + Math.random() * 900)}` 
        : `user_${user.uid.slice(0, 6)}`;
    }

    const profileData = {
      userId: user.uid,
      username: usernameVal,
      email: user.email || "",
      name: onboardingName || user.displayName || user.email?.split("@")[0] || "User",
      age: parseInt(onboardingAge) || 0,
      country: onboardingCountry || "Egypt",
      grade: onboardingUserType === "student" ? gradeVal : "N/A",
      parentEmail: isUnderage ? onboardingParentEmail : "",
      avatar: avatarEmoji,
      school: onboardingSchool || "",
      userType: onboardingUserType,
      role: onboardingUserType,
      onboardingCompleted: true,
      isApproved: !isUnderage, // Pending parent approval if underage student
      childrenCount: parseInt(onboardingChildrenCount) || 0,
      childrenInSchoolCount: parseInt(onboardingChildrenInSchool) || 0,
      friends: [],
      groupsJoined: [],
      privacySettings: {
        profileVisibility: "public",
        allowMessages: true,
        showActivity: true
      }
    };

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          profile: profileData
        })
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.status !== "error") {
          setUserProfile(profileData);
          if (typeof window !== "undefined") {
            localStorage.setItem("onboarding_completed_" + user.uid, "true");
          }
          await logActivity("onboarding_completed", "success", `Completed onboarding as ${onboardingUserType}`);
        } else {
          console.error("Failed to save onboarding profile: backend returned status error", resData.error || "");
          alert(language === "ar"
            ? `عذراً، فشل حفظ ملفك الشخصي في قاعدة البيانات: ${resData.error || "خطأ في خادم قاعدة البيانات"}`
            : `Sorry, failed to save your profile to the database: ${resData.error || "database server error"}`
          );
        }
      } else {
        const errorText = await res.text();
        console.error("Failed to save onboarding profile:", errorText);
        alert(language === "ar"
          ? "حدث خطأ في الشبكة أثناء حفظ بياناتك. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى."
          : "A network error occurred while saving your profile. Please check your connection and try again."
        );
      }
    } catch (err) {
      console.error("Error saving onboarding profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleAdminUpdateUser = async (targetUserId: string, updatedFields: any) => {
    const targetUser = allUsers.find(u => u.userId === targetUserId);
    if (!targetUser) return;
    try {
      const updatedProfile = {
        ...targetUser,
        ...updatedFields
      };
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          profile: updatedProfile
        })
      });
      if (res.ok) {
        alert(language === "ar" ? "تم تحديث بيانات العضو بنجاح!" : "User updated successfully!");
        await fetchAllUsersList();
      } else {
        alert(language === "ar" ? "فشل تحديث العضو." : "Failed to update user.");
      }
    } catch (err) {
      console.error("Error in admin user update:", err);
    }
  };

  const fetchAdminData = async () => {
    if (!user || !user.email) return;
    setLoadingAdminData(true);
    try {
      const statsRes = await fetch(`/api/admin/activities?email=${encodeURIComponent(user.email)}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setAdminStats(statsData);
      }
      
      const logsRes = await fetch(`/api/admin/logs?email=${encodeURIComponent(user.email)}`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAdminLogs(logsData.logs || []);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoadingAdminData(false);
    }
  };

  const handleToggleFriend = async (targetUser: any) => {
    if (!user || !userProfile) return;
    const isFriend = userProfile.friends?.includes(targetUser.userId);
    const action = isFriend ? "remove" : "add";
    try {
      const res = await fetch("/api/user/friend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          friendId: targetUser.userId,
          action
        })
      });
      if (res.ok) {
        const updatedFriends = isFriend
          ? userProfile.friends.filter((id: string) => id !== targetUser.userId)
          : [...(userProfile.friends || []), targetUser.userId];
        
        setUserProfile((prev: any) => ({
          ...prev,
          friends: updatedFriends
        }));

        await logActivity(
          action === "add" ? "add_friend" : "remove_friend",
          "success",
          `${action === "add" ? "Added" : "Removed"} friend ${targetUser.userId}`
        );

        await fetchAllUsersList();
      }
    } catch (err) {
      console.error("Error toggling friend:", err);
    }
  };

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

  const fetchUserSessions = async (userIdVal?: string) => {
    const activeUserId = userIdVal || user?.uid;
    if (!activeUserId) return;
    setIsSessionsLoading(true);
    try {
      const response = await fetch(`/api/history?userId=${encodeURIComponent(activeUserId)}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setIsSessionsLoading(false);
    }
  };

  const fetchUserTokenStats = async (userIdVal?: string) => {
    const activeUserId = userIdVal || user?.uid;
    if (!activeUserId) return;
    try {
      const response = await fetch(`/api/telemetry?userId=${encodeURIComponent(activeUserId)}`);
      if (response.ok) {
        const data = await response.json();
        const rawStats = (data && data.stats) ? data.stats : (data || {});
        
        const getVal = (v: any) => {
          if (!v) return 0;
          if (typeof v === "object") return v.total || 0;
          return Number(v) || 0;
        };

        setUserTokenStats({
          daily: getVal(rawStats.daily),
          weekly: getVal(rawStats.weekly),
          monthly: getVal(rawStats.monthly),
          total: getVal(rawStats.total),
          history: Array.isArray(rawStats.history) ? rawStats.history : []
        });
      }
    } catch (err) {
      console.error("Error fetching token stats:", err);
    }
  };

  const loadSession = async (sessionIdVal: string) => {
    if (!sessionIdVal) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/history/detail?sessionId=${encodeURIComponent(sessionIdVal)}`);
      if (response.ok) {
        const data = await response.json();
        const sess = data.session;
        if (sess) {
          setCurrentSessionId(sess.sessionId);
          setActiveSessionMessages(sess.messages || []);
          // Set finalResult to the last assistant response if there is one
          const assistantMsgs = (sess.messages || []).filter((m: any) => m.role === "assistant");
          if (assistantMsgs.length > 0) {
            setFinalResult(assistantMsgs[assistantMsgs.length - 1].content);
          } else {
            setFinalResult("");
          }
          // Clear standard logs/terminal stream unless the user executes a new one
          setLogs([]);
        }
      }
    } catch (err) {
      console.error("Error loading session:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionIdVal: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sessionIdVal) return;
    if (!confirm(language === "ar" ? "هل أنت متأكد من حذف هذه المحادثة؟" : "Are you sure you want to delete this chat session?")) {
      return;
    }
    try {
      const response = await fetch(`/api/history?sessionId=${encodeURIComponent(sessionIdVal)}`, {
        method: "DELETE"
      });
      if (response.ok) {
        if (currentSessionId === sessionIdVal) {
          startNewChat();
        }
        await fetchUserSessions();
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId("");
    setActiveSessionMessages([]);
    setLogs([]);
    setFinalResult("");
    setPrompt("");
    setGroundedInput("");
    setGroundedPrompt("");
    setGroundedLogs([]);
    setGroundedResult("");
  };

  // Auth Guard & Initial Load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push(`/${language}`);
      } else {
        setUser(currentUser);
        fetchMetadata(currentUser.email || undefined); // Fetch live database metadata on mount
        fetchUserSessions(currentUser.uid); // Fetch user sessions
        fetchUserTokenStats(currentUser.uid); // Fetch user token usage stats
        
        // Fetch User Profile over MongoDB Agent Proxies
        setLoadingProfile(true);
        setProfileLoadError(null);
        fetch(`/api/user/profile?userId=${encodeURIComponent(currentUser.uid)}&email=${encodeURIComponent(currentUser.email || "")}&t=${Date.now()}`, { cache: "no-store" })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.profile && data.profile.userId) {
              setUserProfile(data.profile);
              setPrivacyVisibility(data.profile.privacySettings?.profileVisibility || "public");
              setPrivacyAllowMessages(data.profile.privacySettings?.allowMessages !== false);
              setPrivacyShowActivity(data.profile.privacySettings?.showActivity !== false);
              setPreferencesSchool(data.profile.school || "");
            } else {
              // No user document found - this is first time onboarding trigger state
              const defaultProfile = {
                userId: currentUser.uid,
                email: currentUser.email || "",
                onboardingCompleted: false,
                userType: "student",
                role: "student",
                friends: [],
                groupsJoined: [],
                privacySettings: {
                  profileVisibility: "public",
                  allowMessages: true,
                  showActivity: true
                }
              };
              setUserProfile(defaultProfile);
            }
          })
          .catch((err) => {
            console.error("Error loading user profile:", err);
            setProfileLoadError(err.message || "Failed to load user profile from database");
          })
          .finally(() => {
            setLoadingProfile(false);
          });

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

  // Enforce superadmin-only tab restrictions
  useEffect(() => {
    if (!loadingUser && !loadingProfile) {
      const adminTabs = ["agent", "admin", "super-admin-users"];
      if (!isAdmin && adminTabs.includes(activeTab)) {
        setActiveTab("library");
      }
    }
  }, [isAdmin, activeTab, loadingUser, loadingProfile]);

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
          userId: user?.uid || "",
          sessionId: currentSessionId || undefined
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
                } else if (content.startsWith("SessionId:")) {
                  const activeSessId = content.replace("SessionId:", "").trim();
                  setCurrentSessionId(activeSessId);
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
      fetchUserSessions();
      fetchUserTokenStats();
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
          userId: user?.uid || "",
          sessionId: currentSessionId || undefined
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
                } else if (content.startsWith("SessionId:")) {
                  const activeSessId = content.replace("SessionId:", "").trim();
                  setCurrentSessionId(activeSessId);
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
      fetchUserSessions();
      fetchUserTokenStats();
    }
  };

  const handleClear = () => {
    setPrompt("");
    setLogs([]);
    setFinalResult("");
  };

  if (loadingUser || loadingProfile) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--background)", fontFamily: "var(--font-display)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <FiCpu className="spinning-icon" style={{ fontSize: "3rem", color: "var(--primary)" }} />
          <div style={{ fontSize: "1.2rem", color: "var(--primary)", fontWeight: 500 }}>
            {language === "ar" ? "جاري تحميل بيانات الجلسة والملف الشخصي..." : "Loading session and user profile..."}
          </div>
        </div>
      </div>
    );
  }

  if (profileLoadError) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--background)", fontFamily: "var(--font-display)", direction: language === "ar" ? "rtl" : "ltr" }}>
        <div style={{
          maxWidth: "480px", padding: "2.5rem", borderRadius: "var(--border-radius-lg)",
          background: "rgba(255, 255, 255, 0.75)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(16, 107, 163, 0.15)", boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
          textAlign: "center", display: "flex", flexDirection: "column", gap: "1.25rem", alignItems: "center"
        }}>
          <div style={{ background: "rgba(230, 92, 0, 0.1)", color: "var(--accent-orange)", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FiAlertTriangle style={{ fontSize: "2rem" }} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)", margin: 0 }}>
            {language === "ar" ? "خطأ في تحميل الملف الشخصي" : "Profile Load Failure"}
          </h2>
          <p style={{ fontSize: "0.95rem", color: "#6a7c88", lineHeight: "1.6", margin: 0 }}>
            {language === "ar" 
              ? `واجهت المنصة مشكلة أثناء استرداد بيانات ملفك الشخصي من قاعدة البيانات: (${profileLoadError}). يرجى إعادة المحاولة لتجنب حدوث أي حظر أو تكرار للحساب.`
              : `The platform encountered an issue retrieving your profile from the database: (${profileLoadError}). Please retry to avoid account duplication loops.`}
          </p>
          <button
            onClick={() => {
              setProfileLoadError(null);
              setLoadingProfile(true);
              const currentUser = auth.currentUser;
              if (currentUser) {
                fetch(`/api/user/profile?userId=${encodeURIComponent(currentUser.uid)}&email=${encodeURIComponent(currentUser.email || "")}&t=${Date.now()}`, { cache: "no-store" })
                  .then((res) => {
                    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                    return res.json();
                  })
                  .then((data) => {
                    if (data.error) throw new Error(data.error);
                    if (data.profile && data.profile.userId) {
                      setUserProfile(data.profile);
                      setPrivacyVisibility(data.profile.privacySettings?.profileVisibility || "public");
                      setPrivacyAllowMessages(data.profile.privacySettings?.allowMessages !== false);
                      setPrivacyShowActivity(data.profile.privacySettings?.showActivity !== false);
                      setPreferencesSchool(data.profile.school || "");
                    } else {
                      const defaultProfile = {
                        userId: currentUser.uid,
                        email: currentUser.email || "",
                        onboardingCompleted: false,
                        userType: "student",
                        role: "student",
                        friends: [],
                        groupsJoined: [],
                        privacySettings: {
                          profileVisibility: "public",
                          allowMessages: true,
                          showActivity: true
                        }
                      };
                      setUserProfile(defaultProfile);
                    }
                  })
                  .catch((err) => {
                    console.error("Error loading user profile on retry:", err);
                    setProfileLoadError(err.message || "Failed to fetch profile");
                  })
                  .finally(() => {
                    setLoadingProfile(false);
                  });
              }
            }}
            style={{
              width: "100%", padding: "0.85rem", background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              color: "#ffffff", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer",
              fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
            }}
          >
            <FiRefreshCw className="pulse-icon" />
            {language === "ar" ? "إعادة محاولة الاتصال" : "Retry Connection"}
          </button>
        </div>
      </div>
    );
  }

  const localCompleted = typeof window !== "undefined" && user && localStorage.getItem(`onboarding_completed_${user.uid}`) === "true";
  if (userProfile && userProfile.onboardingCompleted !== true && !localCompleted) {
    return (
      <div className="onboarding-overlay" style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
        background: "radial-gradient(circle at top right, rgba(212, 175, 55, 0.15), rgba(16, 107, 163, 0.05)), #f4ecd8",
        display: "flex", justifyContent: "center", alignItems: "center", padding: "1.5rem",
        fontFamily: "var(--font-sans)", direction: language === "ar" ? "rtl" : "ltr"
      }}>
        <div style={{
          width: "100%", maxWidth: "750px", height: "90vh", maxHeight: "680px",
          background: "rgba(255, 255, 255, 0.75)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(16, 107, 163, 0.15)", borderRadius: "var(--border-radius-lg)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08)", display: "flex", flexDirection: "column",
          overflow: "hidden"
        }}>
          {/* Header */}
          <div style={{
            padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(16, 107, 163, 0.1)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "linear-gradient(135deg, rgba(16, 107, 163, 0.05), rgba(212, 175, 55, 0.05))"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", padding: "0.4rem", borderRadius: "8px", color: "#ffffff", display: "flex" }}>
                <FiCpu className="pulse-icon" style={{ fontSize: "1.2rem" }} />
              </div>
              <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--primary)" }}>
                {language === "ar" ? "إعداد حساب فاهم الذكي" : "Fahem Interactive Profile Setup"}
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)", background: "rgba(16, 107, 163, 0.08)", padding: "4px 10px", borderRadius: "20px" }}>
              {language === "ar" ? `الخطوة ${onboardingStep + 1} من 8` : `Step ${onboardingStep + 1} of 8`}
            </div>
          </div>

          {/* Conversational Scroll Log */}
          <div 
            ref={onboardingScrollContainerRef}
            style={{
              flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem"
            }} className="custom-scrollbar">
            {onboardingMessages.map((msg, index) => {
              const isFahem = msg.sender === "fahem";
              return (
                <div key={index} style={{
                  display: "flex", gap: "0.75rem", alignSelf: isFahem ? "flex-start" : "flex-end",
                  flexDirection: isFahem ? "row" : "row-reverse", maxWidth: "80%"
                }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: isFahem ? "linear-gradient(135deg, var(--primary), var(--secondary))" : "rgba(212, 175, 55, 0.2)",
                    color: isFahem ? "#ffffff" : "var(--secondary-hover)", fontWeight: 700, fontSize: "1.1rem", flexShrink: 0
                  }}>
                    {isFahem ? "🤖" : renderAvatar(onboardingAvatar, "1.1rem")}
                  </div>
                  <div style={{
                    padding: "0.85rem 1.1rem", borderRadius: "16px",
                    borderTopLeftRadius: isFahem ? "2px" : "16px", borderTopRightRadius: isFahem ? "16px" : "2px",
                    background: isFahem ? "#ffffff" : "linear-gradient(135deg, var(--primary), rgba(16, 107, 163, 0.95))",
                    color: isFahem ? "var(--foreground)" : "#ffffff",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
                    border: isFahem ? "1px solid rgba(16, 107, 163, 0.08)" : "none",
                    lineHeight: "1.6", fontSize: "0.95rem"
                  }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={onboardingEndRef} />
          </div>

          {/* Interactive Input Section */}
          <div style={{
            padding: "1.5rem", borderTop: "1px solid rgba(16, 107, 163, 0.1)",
            background: "#ffffff", display: "flex", flexDirection: "column", gap: "1rem"
          }}>
            {/* Step 0: User Type Grid */}
            {onboardingStep === 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {[
                  { id: "student", emoji: "🎓", labelAr: "طالب علم", labelEn: "Student", descAr: "تعلم وتبادل الأفكار مع معلمنا الذكي", descEn: "Learn & chat with our advanced AI tutor" },
                  { id: "teacher", emoji: "🍎", labelAr: "معلم متميز", labelEn: "Teacher", descAr: "قم بإدارة المجموعات والمحتوى الدراسي", descEn: "Manage student groups & educational content" },
                  { id: "parent", emoji: "👪", labelAr: "ولي أمر", labelEn: "Parent", descAr: "أضف أطفالك، وافق على الطلبات وتابع التطور", descEn: "Add children, approve requests, monitor progress" },
                  { id: "admin", emoji: "🛡️", labelAr: "مشرف نظام", labelEn: "Admin", descAr: "أشرف على الأمان وسياسات الاستخدام والتقارير", descEn: "Supervise safety, telemetry & audit reports" }
                ].map((role) => (
                  <button
                    key={role.id}
                    onClick={() => {
                      setOnboardingUserType(role.id as any);
                    }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem",
                      padding: "0.85rem", borderRadius: "var(--border-radius-md)", border: "1px solid var(--card-border)",
                      background: onboardingUserType === role.id ? "rgba(16, 107, 163, 0.05)" : "rgba(255, 255, 255, 0.6)",
                      borderColor: onboardingUserType === role.id ? "var(--primary)" : "var(--card-border)",
                      cursor: "pointer", transition: "all 0.2s ease"
                    }}
                  >
                    <span style={{ fontSize: "1.8rem" }}>{role.emoji}</span>
                    <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "0.95rem" }}>
                      {language === "ar" ? role.labelAr : role.labelEn}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#6a7c88", textAlign: "center" }}>
                      {language === "ar" ? role.descAr : role.descEn}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 1: Name Input */}
            {onboardingStep === 1 && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={onboardingName}
                  onChange={(e) => setOnboardingName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleOnboardingNext()}
                  placeholder={language === "ar" ? "مثال: أحمد محمود" : "e.g., Jane Doe"}
                  style={{
                    flex: 1, padding: "0.75rem", border: "1px solid var(--card-border)",
                    borderRadius: "var(--border-radius-md)", outline: "none", fontFamily: "var(--font-sans)"
                  }}
                  autoFocus
                />
              </div>
            )}

            {/* Step 8: Username Selection */}
            {onboardingStep === 8 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
                <div style={{ display: "flex", gap: "0.5rem", position: "relative", alignItems: "center" }}>
                  <span style={{
                    position: "absolute",
                    left: language === "ar" ? "auto" : "12px",
                    right: language === "ar" ? "12px" : "auto",
                    color: "var(--secondary)",
                    fontWeight: 700,
                    fontSize: "1.1rem"
                  }}>@</span>
                  <input
                    type="text"
                    value={onboardingUsername}
                    onChange={(e) => {
                      setOnboardingUsername(e.target.value.replace(/\s+/g, ""));
                      if (usernameError) setUsernameError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && !checkingUsername && handleOnboardingNext()}
                    placeholder={language === "ar" ? "اسم_المستخدم" : "username_here"}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      paddingLeft: language === "ar" ? "0.75rem" : "2rem",
                      paddingRight: language === "ar" ? "2rem" : "0.75rem",
                      border: "1px solid var(--card-border)",
                      borderRadius: "var(--border-radius-md)",
                      outline: "none",
                      fontFamily: "var(--font-sans)",
                      borderColor: usernameError ? "var(--accent-orange)" : "var(--card-border)",
                      transition: "border-color 0.2s"
                    }}
                    autoFocus
                  />
                  {checkingUsername && (
                    <div style={{
                      position: "absolute",
                      right: language === "ar" ? "auto" : "12px",
                      left: language === "ar" ? "12px" : "auto",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <FiCpu className="spinning-icon" style={{ color: "var(--primary)" }} />
                    </div>
                  )}
                </div>

                {usernameError && (
                  <div style={{
                    color: "var(--accent-orange)",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    marginTop: "-0.25rem"
                  }}>
                    ⚠️ {usernameError}
                  </div>
                )}

                {usernameSuggestions.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
                      {language === "ar" ? "أسماء مقترحة لك:" : "Suggested usernames for you:"}
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {usernameSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setOnboardingUsername(suggestion);
                            setUsernameError("");
                          }}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "15px",
                            border: "1px solid rgba(16, 107, 163, 0.15)",
                            background: onboardingUsername === suggestion ? "rgba(212, 175, 55, 0.12)" : "rgba(255, 255, 255, 0.6)",
                            color: "var(--primary)",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            fontWeight: onboardingUsername === suggestion ? 700 : 500,
                            borderColor: onboardingUsername === suggestion ? "var(--secondary)" : "rgba(16, 107, 163, 0.15)",
                            transition: "all 0.2s"
                          }}
                        >
                          @{suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Age Input */}
            {onboardingStep === 2 && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="number"
                  value={onboardingAge}
                  onChange={(e) => setOnboardingAge(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleOnboardingNext()}
                  placeholder={language === "ar" ? "أدخل عمرك" : "e.g., 14"}
                  style={{
                    flex: 1, padding: "0.75rem", border: "1px solid var(--card-border)",
                    borderRadius: "var(--border-radius-md)", outline: "none", fontFamily: "var(--font-sans)"
                  }}
                  autoFocus
                />
              </div>
            )}

            {/* Step 3: Country Input */}
            {onboardingStep === 3 && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <select
                  value={onboardingCountry}
                  onChange={(e) => setOnboardingCountry(e.target.value)}
                  style={{
                    flex: 1, padding: "0.75rem", border: "1px solid var(--card-border)",
                    borderRadius: "var(--border-radius-md)", outline: "none", fontFamily: "var(--font-sans)",
                    background: "#ffffff"
                  }}
                  autoFocus
                >
                  <option value="">{language === "ar" ? "اختر بلد إقامتك..." : "Select residence country..."}</option>
                  <option value="Egypt">{language === "ar" ? "مصر 🇪🇬" : "Egypt 🇪🇬"}</option>
                  <option value="Saudi Arabia">{language === "ar" ? "المملكة العربية السعودية 🇸🇦" : "Saudi Arabia 🇸🇦"}</option>
                  <option value="UAE">{language === "ar" ? "الإمارات العربية المتحدة 🇦🇪" : "UAE 🇦🇪"}</option>
                  <option value="Qatar">{language === "ar" ? "قطر 🇶🇦" : "Qatar 🇶🇦"}</option>
                  <option value="Kuwait">{language === "ar" ? "الكويت 🇰🇼" : "Kuwait 🇰🇼"}</option>
                  <option value="Oman">{language === "ar" ? "عمان 🇴🇲" : "Oman 🇴🇲"}</option>
                  <option value="Jordan">{language === "ar" ? "الأردن 🇯🇴" : "Jordan 🇯🇴"}</option>
                  <option value="USA">{language === "ar" ? "الولايات المتحدة الأمريكية 🇺🇸" : "USA 🇺🇸"}</option>
                  <option value="UK">{language === "ar" ? "المملكة المتحدة 🇬🇧" : "UK 🇬🇧"}</option>
                  <option value="Other">{language === "ar" ? "بلد آخر 🌍" : "Other Country 🌍"}</option>
                </select>
              </div>
            )}

            {/* Step 4: Grade Proposal (Student) */}
            {onboardingStep === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      setOnboardingGradeOption("recommended");
                      setTimeout(() => handleOnboardingNext("recommended"), 150);
                    }}
                    type="button"
                    style={{
                      padding: "0.75rem", borderRadius: "var(--border-radius-md)", border: "1px solid var(--card-border)",
                      background: onboardingGradeOption === "recommended" ? "rgba(16, 107, 163, 0.05)" : "rgba(255,255,255,0.6)",
                      borderColor: onboardingGradeOption === "recommended" ? "var(--primary)" : "var(--card-border)",
                      cursor: "pointer", fontWeight: 700, color: "var(--primary)", fontSize: "0.85rem",
                      fontFamily: "var(--font-sans)"
                    }}
                  >
                    {language === "ar" 
                      ? `المقترح: ${getGradeSuggestion(onboardingAge, onboardingCountry, true)}` 
                      : `Recommended: ${getGradeSuggestion(onboardingAge, onboardingCountry, false)}`}
                  </button>
                  <button
                    onClick={() => {
                      setOnboardingGradeOption("lifelong");
                      setTimeout(() => handleOnboardingNext("lifelong"), 150);
                    }}
                    type="button"
                    style={{
                      padding: "0.75rem", borderRadius: "var(--border-radius-md)", border: "1px solid var(--card-border)",
                      background: onboardingGradeOption === "lifelong" ? "rgba(16, 107, 163, 0.05)" : "rgba(255,255,255,0.6)",
                      borderColor: onboardingGradeOption === "lifelong" ? "var(--primary)" : "var(--card-border)",
                      cursor: "pointer", fontWeight: 700, color: "var(--primary)", fontSize: "0.85rem",
                      fontFamily: "var(--font-sans)"
                    }}
                  >
                    {language === "ar" ? "متعلم مدى الحياة 🧠" : "Lifelong Learner 🧠"}
                  </button>
                  <button
                    onClick={() => setOnboardingGradeOption("custom")}
                    type="button"
                    style={{
                      padding: "0.75rem", borderRadius: "var(--border-radius-md)", border: "1px solid var(--card-border)",
                      background: onboardingGradeOption === "custom" ? "rgba(16, 107, 163, 0.05)" : "rgba(255,255,255,0.6)",
                      borderColor: onboardingGradeOption === "custom" ? "var(--primary)" : "var(--card-border)",
                      cursor: "pointer", fontWeight: 700, color: "var(--primary)", fontSize: "0.85rem",
                      fontFamily: "var(--font-sans)"
                    }}
                  >
                    {language === "ar" ? "صف مخصص آخر ✍️" : "Type Custom Grade ✍️"}
                  </button>
                  <button
                    onClick={() => {
                      setOnboardingGradeOption("skip");
                      setTimeout(() => handleOnboardingNext("skip"), 150);
                    }}
                    type="button"
                    style={{
                      padding: "0.75rem", borderRadius: "var(--border-radius-md)", border: "1px solid var(--card-border)",
                      background: onboardingGradeOption === "skip" ? "rgba(16, 107, 163, 0.05)" : "rgba(255,255,255,0.6)",
                      borderColor: onboardingGradeOption === "skip" ? "var(--primary)" : "var(--card-border)",
                      cursor: "pointer", fontWeight: 700, color: "var(--primary)", fontSize: "0.85rem",
                      fontFamily: "var(--font-sans)"
                    }}
                  >
                    {language === "ar" ? "تخطي هذه الخطوة ⏭️" : "Skip this step ⏭️"}
                  </button>
                </div>

                {onboardingGradeOption === "custom" && (
                  <input
                    type="text"
                    value={onboardingCustomGrade}
                    onChange={(e) => setOnboardingCustomGrade(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleOnboardingNext("custom")}
                    placeholder={language === "ar" ? "مثال: المسار البريطاني السنة 8" : "e.g., Year 8 British Curriculum"}
                    style={{
                      padding: "0.75rem", border: "1px solid var(--card-border)",
                      borderRadius: "var(--border-radius-md)", outline: "none", fontFamily: "var(--font-sans)"
                    }}
                    autoFocus
                  />
                )}
              </div>
            )}

            {/* Step 5: School Search with Google Places & Branches */}
            {onboardingStep === 5 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", position: "relative" }}>
                <input
                  type="text"
                  value={onboardingSchool}
                  onChange={(e) => {
                    setOnboardingSchool(e.target.value);
                    fetchPlaces(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleOnboardingNext()}
                  placeholder={
                    onboardingUserType === "student"
                      ? (language === "ar" ? "ابحث عن مدرستك أو جامعتك..." : "Search for your school or university...")
                      : onboardingUserType === "teacher"
                        ? (language === "ar" ? "ابحث عن مدرسة أو جامعة تعمل بها..." : "Search for school or university where you work...")
                        : (language === "ar" ? "ابحث عن مدرسة أو جامعة أطفالك..." : "Search for your children's school or university...")
                  }
                  style={{
                    flex: 1, padding: "0.75rem", border: "1px solid var(--card-border)",
                    borderRadius: "var(--border-radius-md)", outline: "none", fontFamily: "var(--font-sans)"
                  }}
                  autoFocus
                />

                {searchingPlaces && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--primary)", fontFamily: "var(--font-sans)" }}>
                    <FiCpu className="spinning-icon" />
                    <span>{language === "ar" ? "جاري البحث في خرائط جوجل..." : "Searching Google Maps places..."}</span>
                  </div>
                )}

                {placesResults.length > 0 && (
                  <div style={{
                    maxHeight: "180px", overflowY: "auto", border: "1px solid var(--card-border)",
                    borderRadius: "var(--border-radius-md)", background: "#ffffff",
                    display: "flex", flexDirection: "column", zIndex: 10
                  }} className="custom-scrollbar">
                    {placesResults.map((place: any, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          if (place.branches && place.branches.length > 1) {
                            setSelectedPlaceForBranch(place);
                          } else {
                            setOnboardingSchool(place.name);
                            setPlacesResults([]);
                            // Transition automatically with override to bypass state batched updates
                            setTimeout(() => handleOnboardingNext(undefined, place.name), 150);
                          }
                        }}
                        type="button"
                        style={{
                          padding: "0.75rem 1rem", border: "none", borderBottom: "1px solid rgba(0,0,0,0.05)",
                          background: "none", textAlign: "start", cursor: "pointer", width: "100%",
                          display: "flex", flexDirection: "column", gap: "0.15rem", fontFamily: "var(--font-sans)"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "rgba(16, 107, 163, 0.04)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "none"}
                      >
                        <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.9rem" }}>{place.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>📍 {place.address}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Popover Branch Selector */}
                {selectedPlaceForBranch && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, marginTop: "0.5rem",
                    padding: "1rem", borderRadius: "var(--border-radius-md)", border: "1px solid var(--primary)",
                    background: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(10px)", zIndex: 20,
                    boxShadow: "var(--shadow-md)", display: "flex", flexDirection: "column", gap: "0.75rem"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", fontFamily: "var(--font-display)" }}>
                        {language === "ar"
                          ? `اختر الفرع والموقع الجغرافي لـ ${selectedPlaceForBranch.name}`
                          : `Select campus branch for ${selectedPlaceForBranch.name}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPlaceForBranch(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#6a7c88" }}
                      >
                        <FiX />
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {selectedPlaceForBranch.branches.map((branch: string) => (
                        <button
                          key={branch}
                          type="button"
                          onClick={() => {
                            const fullBranchName = `${selectedPlaceForBranch.name} - ${branch}`;
                            setOnboardingSchool(fullBranchName);
                            setSelectedPlaceForBranch(null);
                            setPlacesResults([]);
                            // Transition automatically with override to bypass state batched updates
                            setTimeout(() => handleOnboardingNext(undefined, fullBranchName), 150);
                          }}
                          style={{
                            padding: "0.6rem 1rem", borderRadius: "var(--border-radius-sm)",
                            border: "1px solid rgba(16, 107, 163, 0.15)", background: "rgba(16, 107, 163, 0.02)",
                            color: "var(--primary)", fontWeight: 600, fontSize: "0.8rem", textAlign: "start",
                            cursor: "pointer", transition: "all 0.2s", fontFamily: "var(--font-sans)"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "var(--primary)";
                            e.currentTarget.style.color = "#ffffff";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "rgba(16, 107, 163, 0.02)";
                            e.currentTarget.style.color = "var(--primary)";
                          }}
                        >
                          🏢 {branch}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Parent Email (Underage Student only) */}
            {onboardingStep === 6 && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="email"
                  value={onboardingParentEmail}
                  onChange={(e) => setOnboardingParentEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleOnboardingNext()}
                  placeholder={language === "ar" ? "البريد الإلكتروني لولي الأمر" : "parent@example.com"}
                  style={{
                    flex: 1, padding: "0.75rem", border: "1px solid var(--card-border)",
                    borderRadius: "var(--border-radius-md)", outline: "none", fontFamily: "var(--font-sans)"
                  }}
                  autoFocus
                />
              </div>
            )}

            {/* Step 10: Children Count (Parent/Teacher) */}
            {onboardingStep === 10 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-display)" }}>
                  {language === "ar" ? "كم عدد أطفالك؟" : "How many children do you have?"}
                </label>
                <input
                  type="number"
                  value={onboardingChildrenCount}
                  onChange={(e) => setOnboardingChildrenCount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleOnboardingNext()}
                  placeholder={language === "ar" ? "مثال: 3" : "e.g., 3"}
                  style={{
                    padding: "0.75rem", border: "1px solid var(--card-border)",
                    borderRadius: "var(--border-radius-md)", outline: "none", fontFamily: "var(--font-sans)"
                  }}
                  autoFocus
                />
              </div>
            )}

            {/* Step 11: Children in Education (Parent/Teacher) */}
            {onboardingStep === 11 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-display)" }}>
                  {language === "ar" ? "كم عدد الأطفال الذين يدرسون حالياً بالمدارس أو الجامعات؟" : "How many of them are in school or university?"}
                </label>
                <input
                  type="number"
                  value={onboardingChildrenInSchool}
                  onChange={(e) => setOnboardingChildrenInSchool(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleOnboardingNext()}
                  placeholder={language === "ar" ? "مثال: 2" : "e.g., 2"}
                  style={{
                    padding: "0.75rem", border: "1px solid var(--card-border)",
                    borderRadius: "var(--border-radius-md)", outline: "none", fontFamily: "var(--font-sans)"
                  }}
                  autoFocus
                />
              </div>
            )}

            {/* Step 7: Beautiful Diverse Tabbed Avatar Selection Panel */}
            {onboardingStep === 7 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
                {/* Tab selectors */}
                <div style={{
                  display: "flex", gap: "0.4rem", borderBottom: "1px solid rgba(16, 107, 163, 0.1)",
                  paddingBottom: "0.5rem", flexWrap: "wrap"
                }}>
                  {[
                    { id: "vectors", labelAr: "متجهات متميزة", labelEn: "Vectors" },
                    { id: "animals", labelAr: "مخلوقات وبحار 🐬", labelEn: "Animals & Sea 🐬" },
                    { id: "tech", labelAr: "التقنية والمتعلمون", labelEn: "Tech & Learners" },
                    { id: "golden", labelAr: "أيقونات ذهبية", labelEn: "Golden Icons" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAvatarTab(tab.id as any)}
                      style={{
                        padding: "6px 12px", borderRadius: "20px", border: "1px solid",
                        borderColor: avatarTab === tab.id ? "var(--primary)" : "rgba(16, 107, 163, 0.12)",
                        background: avatarTab === tab.id ? "linear-gradient(135deg, var(--primary), var(--secondary))" : "rgba(255,255,255,0.6)",
                        color: avatarTab === tab.id ? "#ffffff" : "var(--primary)",
                        cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, transition: "all 0.2s",
                        fontFamily: "var(--font-display)"
                      }}
                    >
                      {language === "ar" ? tab.labelAr : tab.labelEn}
                    </button>
                  ))}
                </div>

                {/* Grid selection */}
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem",
                  maxHeight: "180px", overflowY: "auto", padding: "0.25rem"
                }} className="custom-scrollbar">
                  {(avatarCategories[avatarTab] || []).map((item) => (
                    <button
                      key={item.e}
                      onClick={() => handleOnboardingComplete(item.e)}
                      title={language === "ar" ? item.lAr : item.lEn}
                      type="button"
                      style={{
                        padding: "0.85rem 0", borderRadius: "var(--border-radius-md)", border: "1px solid var(--card-border)",
                        background: "#ffffff", cursor: "pointer", transition: "all 0.2s ease",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = "var(--primary)";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = "var(--card-border)";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {item.e.startsWith("/") ? (
                        <img src={item.e} alt={item.lEn} style={{ width: "2.5rem", height: "2.5rem", objectFit: "contain", borderRadius: "50%" }} />
                      ) : (
                        <span style={{ fontSize: "2rem" }}>{item.e}</span>
                      )}
                      <span style={{
                        fontSize: "0.65rem", color: "#6a7c88", whiteSpace: "nowrap",
                        overflow: "hidden", textOverflow: "ellipsis", width: "90%", textAlign: "center",
                        fontFamily: "var(--font-sans)"
                      }}>
                        {language === "ar" ? item.lAr : item.lEn}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            {onboardingStep < 7 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    handleOnboardingComplete("🚀");
                  }}
                  style={{
                    background: "none", border: "none", color: "#8a9ca8", cursor: "pointer",
                    fontSize: "0.85rem", fontWeight: 600, padding: "0.5rem", fontFamily: "var(--font-sans)"
                  }}
                >
                  {language === "ar" ? "تخطي الإعداد بالكامل ⏭️" : "Skip profile setup completely ⏭️"}
                </button>
                <button
                  type="button"
                  onClick={() => handleOnboardingNext()}
                  className="btn btn-primary"
                  style={{
                    padding: "0.6rem 1.75rem", fontSize: "0.9rem", fontWeight: 700, borderRadius: "var(--border-radius-md)",
                    display: "flex", alignItems: "center", gap: "0.35rem", fontFamily: "var(--font-display)"
                  }}
                >
                  <span>{language === "ar" ? "متابعة" : "Next / Send"}</span>
                  <FiSend style={{ fontSize: "0.9rem" }} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout" dir={language === "ar" ? "rtl" : "ltr"} style={{ direction: language === "ar" ? "rtl" : "ltr" }}>
      {/* Background ambient light */}
      <div className="ambient-background" style={{ zIndex: 1 }}>
        <div className="sphere sphere-1"></div>
        <div className="sphere sphere-2"></div>
        <div className="sphere sphere-3"></div>
      </div>

      {/* Modern Sidebar Panel */}
      <aside className="sidebar">
        <div className="sidebar-top" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: "1rem" }}>
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
          <nav className="sidebar-nav custom-scrollbar" style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)", display: "flex", flexDirection: "column", gap: "0.15rem", paddingRight: "4px" }}>
            {isAdmin && (
              <>
                <div style={{
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  color: "rgba(16, 107, 163, 0.45)",
                  padding: "0.6rem 0.75rem 0.25rem",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display)"
                }}>
                  {language === "ar" ? "لوحات التحكم والتحليل" : "ADMIN CONTROLS"}
                </div>
                <button
                  onClick={() => setActiveTab("agent")}
                  className={`sidebar-nav-btn ${activeTab === "agent" ? "active" : ""}`}
                  type="button"
                >
                  <FiCpu />
                  <span>{t("nav_toolkit")}</span>
                </button>
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`sidebar-nav-btn ${activeTab === "admin" ? "active" : ""}`}
                  type="button"
                >
                  <FiShield />
                  <span>{t("nav_admin")}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("super-admin-users");
                    fetchAllUsersList();
                  }}
                  className={`sidebar-nav-btn ${activeTab === "super-admin-users" ? "active" : ""}`}
                  type="button"
                >
                  <FiUserCheck />
                  <span>{language === "ar" ? "إدارة الأعضاء والنشاط" : "Users & Activity Trail"}</span>
                </button>
              </>
            )}

            <div style={{
              fontSize: "0.65rem",
              fontWeight: 800,
              letterSpacing: "0.05em",
              color: "rgba(16, 107, 163, 0.45)",
              padding: "0.6rem 0.75rem 0.25rem",
              textTransform: "uppercase",
              fontFamily: "var(--font-display)"
            }}>
              {language === "ar" ? "المساحة التعليمية الذكية" : "ACADEMIC SPACE"}
            </div>
            
            <button
              onClick={() => setActiveTab("library")}
              className={`sidebar-nav-btn ${activeTab === "library" ? "active" : ""}`}
              type="button"
            >
              <FiBookOpen />
              <span>{language === "ar" ? "المكتبة الرقمية" : "Knowledge Library"}</span>
            </button>

            <button
              onClick={() => setActiveTab("subjects")}
              className={`sidebar-nav-btn ${activeTab === "subjects" ? "active" : ""}`}
              type="button"
            >
              <FiLayers />
              <span>{language === "ar" ? "المناهج والمواد" : "Course Subjects"}</span>
            </button>

            <button
              onClick={() => setActiveTab("practice")}
              className={`sidebar-nav-btn ${activeTab === "practice" ? "active" : ""}`}
              type="button"
            >
              <FiActivity />
              <span>{language === "ar" ? "الممارسة والتدريب" : "Practice Workstation"}</span>
            </button>

            <button
              onClick={() => setActiveTab("plan")}
              className={`sidebar-nav-btn ${activeTab === "plan" ? "active" : ""}`}
              type="button"
            >
              <FiFileText />
              <span>{language === "ar" ? "خطة الدراسة الذكية" : "Study Planner"}</span>
            </button>

            <button
              onClick={() => setActiveTab("timetable")}
              className={`sidebar-nav-btn ${activeTab === "timetable" ? "active" : ""}`}
              type="button"
            >
              <FiClock />
              <span>{language === "ar" ? "جدول الحصص واليوم" : "Weekly Schedule"}</span>
            </button>

            <button
              onClick={() => setActiveTab("quiz")}
              className={`sidebar-nav-btn ${activeTab === "quiz" ? "active" : ""}`}
              type="button"
            >
              <FiTerminal />
              <span>{language === "ar" ? "الاختبارات الذكية" : "Quiz Assessment"}</span>
            </button>

            <button
              onClick={() => setActiveTab("zatona")}
              className={`sidebar-nav-btn ${activeTab === "zatona" ? "active" : ""}`}
              type="button"
            >
              <FiDatabase />
              <span>{language === "ar" ? "الزتونة - ملخص وبحث" : "Zatona AI Research"}</span>
            </button>

            <div style={{
              fontSize: "0.65rem",
              fontWeight: 800,
              letterSpacing: "0.05em",
              color: "rgba(16, 107, 163, 0.45)",
              padding: "0.6rem 0.75rem 0.25rem",
              textTransform: "uppercase",
              fontFamily: "var(--font-display)"
            }}>
              {language === "ar" ? "المجتمع والتفضيلات" : "COMMUNITY & CONTROL"}
            </div>

            <button
              onClick={() => {
                setActiveTab("social");
                fetchAllUsersList();
                fetchParentChildrenList();
              }}
              className={`sidebar-nav-btn ${activeTab === "social" ? "active" : ""}`}
              type="button"
            >
              <FiUsers />
              <span>{language === "ar" ? "التواصل والدردشة" : "Social Network"}</span>
            </button>

            {userProfile?.username && (
              <button
                onClick={() => router.push(`/${language}/profile/${userProfile.username}`)}
                className="sidebar-nav-btn"
                type="button"
              >
                <FiUser />
                <span>{language === "ar" ? "ملفي الشخصي المعزز" : "My Public Profile"}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("settings")}
              className={`sidebar-nav-btn ${activeTab === "settings" ? "active" : ""}`}
              type="button"
            >
              <FiSettings />
              <span>{language === "ar" ? "الإعدادات والخصوصية" : "Account Settings"}</span>
            </button>

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

          {/* Saved Chats Sidebar Section */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            flex: 1, 
            minHeight: 0, 
            marginTop: "0.5rem",
            borderTop: "1px dashed rgba(235, 220, 185, 0.4)",
            paddingTop: "0.75rem"
          }}>
            <h3 style={{ 
              fontSize: "0.85rem", 
              fontWeight: 800, 
              color: "#6a7c88", 
              textTransform: "uppercase", 
              letterSpacing: "0.5px",
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <span>{getHistoryT("savedChats")}</span>
              {sessions.length > 0 && (
                <span style={{
                  fontSize: "0.75rem",
                  background: "rgba(16, 107, 163, 0.08)",
                  color: "var(--primary)",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  fontWeight: 700
                }}>
                  {sessions.length}
                </span>
              )}
            </h3>

            {/* New Chat Button */}
            <button
              onClick={startNewChat}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                width: "100%",
                padding: "0.65rem",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--border-radius-md)",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                marginBottom: "0.75rem",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.filter = "brightness(1.1)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.filter = "none";
                e.currentTarget.style.transform = "none";
              }}
            >
              <FiPlus style={{ fontSize: "1rem" }} />
              <span>{getHistoryT("newChat")}</span>
            </button>

            {/* Scrollable Container */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              minHeight: 0
            }} className="custom-scrollbar">
              {isSessionsLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", color: "#8a9ca8" }}>
                  <FiRefreshCw className="spin-icon" style={{ marginRight: "0.5rem", animation: "spin 2s linear infinite" }} />
                  <span style={{ fontSize: "0.8rem" }}>{getHistoryT("loadingChats")}</span>
                </div>
              ) : sessions.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#8a9ca8", textAlign: "center" }}>
                  <FiFileText style={{ fontSize: "1.5rem", opacity: 0.3, marginBottom: "0.5rem" }} />
                  <span style={{ fontSize: "0.8rem" }}>{getHistoryT("noSavedChats")}</span>
                </div>
              ) : (
                sessions.map((sess) => {
                  const isActive = currentSessionId === sess.sessionId;
                  return (
                    <div
                      key={sess.sessionId}
                      onClick={() => loadSession(sess.sessionId)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.55rem 0.75rem",
                        borderRadius: "var(--border-radius-md)",
                        background: isActive ? "rgba(16, 107, 163, 0.08)" : "rgba(255, 255, 255, 0.4)",
                        border: `1px solid ${isActive ? "rgba(16, 107, 163, 0.15)" : "rgba(235, 220, 185, 0.25)"}`,
                        cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                        gap: "0.5rem"
                      }}
                      onMouseOver={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "rgba(16, 107, 163, 0.04)";
                          e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.1)";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.4)";
                          e.currentTarget.style.borderColor = "rgba(235, 220, 185, 0.25)";
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden", flex: 1 }}>
                        <FiFileText style={{ color: isActive ? "var(--primary)" : "#8a9ca8", flexShrink: 0, fontSize: "0.95rem" }} />
                        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
                          <span style={{
                            fontSize: "0.82rem",
                            fontWeight: isActive ? 700 : 600,
                            color: isActive ? "var(--primary)" : "var(--text-color)",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden"
                          }} title={sess.title || "Untitled Chat"}>
                            {sess.title || (language === "ar" ? "محادثة بدون عنوان" : "Untitled Chat")}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#8a9ca8" }}>
                            {sess.messageCount} {language === "ar" ? "رسائل" : "messages"}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => deleteSession(sess.sessionId, e)}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "4px",
                          cursor: "pointer",
                          color: "#8a9ca8",
                          borderRadius: "var(--border-radius-sm)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => {
                          e.stopPropagation();
                          e.currentTarget.style.color = "var(--accent-red)";
                          e.currentTarget.style.background = "rgba(235, 87, 87, 0.1)";
                        }}
                        onMouseOut={(e) => {
                          e.stopPropagation();
                          e.currentTarget.style.color = "#8a9ca8";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <FiTrash2 style={{ fontSize: "0.85rem" }} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
            <div 
              className="sidebar-user-card" 
              onClick={() => {
                if (userProfile?.username) {
                  router.push(`/${language}/profile/${userProfile.username}`);
                }
              }}
              style={{ cursor: "pointer", transition: "all 0.2s" }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(16, 107, 163, 0.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div className="sidebar-user-avatar-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                {userProfile?.avatar ? (
                  renderAvatar(userProfile.avatar, "1.5rem")
                ) : user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="sidebar-user-avatar" />
                ) : (
                  <div className="sidebar-user-avatar" style={{ background: "var(--primary)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.2rem" }}>
                    {user.email ? user.email[0].toUpperCase() : "U"}
                  </div>
                )}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name" title={userProfile?.name || user.displayName || user.email || ""}>
                  {userProfile?.name || user.displayName || (user.email ? user.email.split("@")[0] : "User")}
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
          <h1>{getTabHeader().title}</h1>
          <p>{getTabHeader().subtitle}</p>
        </header>

        {activeTab === "agent" ? (
          /* Main Grid Layout for MongoDB Agent */
          <div className="grid-cols-2">
            {/* Left Side: Interaction & Output */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              
              {/* User Token consumption cards */}
              {userTokenStats && (
                <section className="panel-card" style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <h2 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, fontWeight: 800 }}>
                      <FiActivity style={{ color: "var(--primary)" }} />
                      <span>{getHistoryT("tokenAnalytics")}</span>
                    </h2>
                    <span style={{ fontSize: "0.75rem", color: "#6a7c88", background: "rgba(16, 107, 163, 0.06)", padding: "4px 8px", borderRadius: "var(--border-radius-sm)", fontWeight: 700 }}>
                      {getHistoryT("tokenLimitHelp")}
                    </span>
                  </div>
                  
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "1rem",
                  }} className="token-stats-grid">
                    {/* Daily Card */}
                    <div style={{
                      background: "rgba(255, 255, 255, 0.4)",
                      border: "1px solid rgba(235, 220, 185, 0.25)",
                      borderRadius: "var(--border-radius-md)",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      boxShadow: "var(--shadow-sm)",
                    }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6a7c88" }}>{getHistoryT("dailyTokens")}</span>
                      <strong style={{ fontSize: "1.25rem", color: "var(--primary)" }}>{(userTokenStats.daily || 0).toLocaleString()}</strong>
                      <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden", marginTop: "0.5rem" }}>
                        <div style={{ width: `${Math.min(100, (((userTokenStats.daily || 0) / 50000) * 100))}%`, height: "100%", background: "linear-gradient(90deg, #106ba3, #4394d2)", borderRadius: "3px" }}></div>
                      </div>
                      <span style={{ fontSize: "0.65rem", color: "#8a9ca8", textAlign: "right", marginTop: "2px" }}>
                        {Math.round(Math.min(100, (((userTokenStats.daily || 0) / 50000) * 100)))}% of 50K limit
                      </span>
                    </div>

                    {/* Weekly Card */}
                    <div style={{
                      background: "rgba(255, 255, 255, 0.4)",
                      border: "1px solid rgba(235, 220, 185, 0.25)",
                      borderRadius: "var(--border-radius-md)",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      boxShadow: "var(--shadow-sm)",
                    }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6a7c88" }}>{getHistoryT("weeklyTokens")}</span>
                      <strong style={{ fontSize: "1.25rem", color: "var(--secondary)" }}>{(userTokenStats.weekly || 0).toLocaleString()}</strong>
                      <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden", marginTop: "0.5rem" }}>
                        <div style={{ width: `${Math.min(100, (((userTokenStats.weekly || 0) / 250000) * 100))}%`, height: "100%", background: "linear-gradient(90deg, var(--secondary), #f5c242)", borderRadius: "3px" }}></div>
                      </div>
                      <span style={{ fontSize: "0.65rem", color: "#8a9ca8", textAlign: "right", marginTop: "2px" }}>
                        {Math.round(Math.min(100, (((userTokenStats.weekly || 0) / 250000) * 100)))}% of 250K limit
                      </span>
                    </div>

                    {/* Monthly Card */}
                    <div style={{
                      background: "rgba(255, 255, 255, 0.4)",
                      border: "1px solid rgba(235, 220, 185, 0.25)",
                      borderRadius: "var(--border-radius-md)",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      boxShadow: "var(--shadow-sm)",
                    }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6a7c88" }}>{getHistoryT("monthlyTokens")}</span>
                      <strong style={{ fontSize: "1.25rem", color: "var(--accent-green)" }}>{(userTokenStats.monthly || 0).toLocaleString()}</strong>
                      <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden", marginTop: "0.5rem" }}>
                        <div style={{ width: `${Math.min(100, (((userTokenStats.monthly || 0) / 1000000) * 100))}%`, height: "100%", background: "linear-gradient(90deg, var(--accent-green), #42d2a2)", borderRadius: "3px" }}></div>
                      </div>
                      <span style={{ fontSize: "0.65rem", color: "#8a9ca8", textAlign: "right", marginTop: "2px" }}>
                        {Math.round(Math.min(100, (((userTokenStats.monthly || 0) / 1000000) * 100)))}% of 1M limit
                      </span>
                    </div>

                    {/* Lifetime Total Card */}
                    <div style={{
                      background: "rgba(255, 255, 255, 0.4)",
                      border: "1px solid rgba(235, 220, 185, 0.25)",
                      borderRadius: "var(--border-radius-md)",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      boxShadow: "var(--shadow-sm)",
                    }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6a7c88" }}>{getHistoryT("totalTokens")}</span>
                      <strong style={{ fontSize: "1.25rem", color: "#635bff" }}>{(userTokenStats.total || 0).toLocaleString()}</strong>
                      <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden", marginTop: "0.5rem" }}>
                        <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #635bff, #a35bff)", borderRadius: "3px" }}></div>
                      </div>
                      <span style={{ fontSize: "0.65rem", color: "#8a9ca8", textAlign: "right", marginTop: "2px" }}>
                        Uncapped Lifetime
                      </span>
                    </div>
                  </div>
                </section>
              )}

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

              {/* Active Session Conversation History (Chat Bubbles) */}
              {activeSessionMessages.length > 0 && (
                <section className="panel-card" style={{ padding: "1.5rem" }}>
                  <h2 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.75rem", fontWeight: 800 }}>
                    <FiFileText style={{ color: "var(--primary)" }} />
                    <span>{getHistoryT("activeChat")}</span>
                  </h2>
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    maxHeight: "450px",
                    overflowY: "auto",
                    padding: "0.25rem",
                  }} className="custom-scrollbar">
                    {activeSessionMessages.map((msg, index) => {
                      const isUser = msg.role === "user";
                      // Format local time if available
                      let timeStr = "";
                      if (msg.createdAt || msg.timestamp) {
                        try {
                          const date = new Date(msg.createdAt || msg.timestamp);
                          timeStr = date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
                        } catch (_) {}
                      }
                      
                      return (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: isUser ? "flex-end" : "flex-start",
                            width: "100%"
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "85%",
                              padding: "0.85rem 1.1rem",
                              borderRadius: "var(--border-radius-lg)",
                              border: isUser ? "1px solid rgba(16, 107, 163, 0.15)" : "1px solid rgba(235, 220, 185, 0.3)",
                              background: isUser 
                                ? "linear-gradient(135deg, rgba(16, 107, 163, 0.08), rgba(67, 148, 210, 0.08))" 
                                : "rgba(255, 255, 255, 0.65)",
                              boxShadow: "var(--shadow-sm)",
                              textAlign: language === "ar" ? "right" : "left",
                              direction: language === "ar" ? "rtl" : "ltr",
                            }}
                          >
                            {/* Role Label */}
                            <div style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: isUser ? "var(--primary)" : "var(--secondary)",
                              marginBottom: "0.4rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem"
                            }}>
                              <span style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: isUser ? "var(--primary)" : "var(--secondary)",
                                display: "inline-block"
                              }}></span>
                              {isUser 
                                ? (language === "ar" ? "أنت" : "You") 
                                : (language === "ar" ? "وكيل فاهم الذكي" : "Fahem AI Agent")}
                            </div>
                            
                            {/* Message Content */}
                            <div style={{
                              color: "var(--foreground)",
                              fontSize: "0.95rem",
                              lineHeight: "1.6"
                            }}>
                              {renderPremiumContent(msg.content)}
                            </div>
                          </div>
                          
                          {timeStr && (
                            <span style={{
                              fontSize: "0.68rem",
                              color: "#8a9ca8",
                              marginTop: "0.3rem",
                              marginRight: isUser ? "0.5rem" : "none",
                              marginLeft: isUser ? "none" : "0.5rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.2rem"
                            }}>
                              <FiClock style={{ fontSize: "0.75rem" }} />
                              {timeStr}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

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
        ) : activeTab === "admin" ? (
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
        ) : activeTab === "super-admin-users" ? (
          /* Tabular Super-Admin User Manager Panel */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <section className="panel-card" style={{ padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.6rem", margin: 0, fontWeight: 800 }}>
                  <FiUsers style={{ color: "var(--primary)" }} />
                  <span>{language === "ar" ? "قائمة الأعضاء وإدارة الصلاحيات" : "User Accounts & Role Manager"}</span>
                </h2>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder={language === "ar" ? "ابحث بالاسم أو البريد..." : "Search name or email..."}
                    value={adminUserSearch}
                    onChange={(e) => setAdminUserSearch(e.target.value)}
                    style={{
                      padding: "0.5rem 0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid var(--card-border)",
                      fontSize: "0.85rem", outline: "none", fontFamily: "var(--font-sans)"
                    }}
                  />
                  <button 
                    onClick={fetchAllUsersList}
                    className="btn btn-secondary" 
                    style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
                  >
                    <FiRefreshCw className="pulse-icon" />
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: language === "ar" ? "right" : "left", fontFamily: "var(--font-sans)", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--card-border)", color: "var(--primary)", fontWeight: 700 }}>
                      <th style={{ padding: "0.75rem 0.5rem" }}>{language === "ar" ? "العضو" : "User"}</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>{language === "ar" ? "البريد الإلكتروني" : "Email"}</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>{language === "ar" ? "الدور الدراسي" : "User Role"}</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>{language === "ar" ? "المدرسة/الجامعة" : "School"}</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>{language === "ar" ? "الحالة" : "Status"}</th>
                      <th style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>{language === "ar" ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers
                      .filter(u => {
                        const s = adminUserSearch.toLowerCase();
                        return (u.name || "").toLowerCase().includes(s) || 
                               (u.username || "").toLowerCase().includes(s) || 
                               (u.email || "").toLowerCase().includes(s);
                      })
                      .map((u, i) => (
                        <tr key={u.userId || i} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", transition: "all 0.15s" }} onMouseOver={(e)=>e.currentTarget.style.background="rgba(16, 107, 163, 0.02)"} onMouseOut={(e)=>e.currentTarget.style.background="none"}>
                          <td style={{ padding: "0.75rem 0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {renderAvatar(u.avatar, "1.2rem")}
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 700 }}>{u.name || "N/A"}</span>
                              <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>@{u.username || "N/A"}</span>
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem 0.5rem", color: "#4f6371" }}>{u.email || "N/A"}</td>
                          <td style={{ padding: "0.75rem 0.5rem" }}>
                            <select
                              value={u.role || u.userType || "student"}
                              onChange={(e) => handleAdminUpdateUser(u.userId, { role: e.target.value, userType: e.target.value })}
                              style={{ padding: "3px 6px", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.8rem", background: "#ffffff" }}
                            >
                              <option value="student">{language === "ar" ? "طالب" : "Student"}</option>
                              <option value="teacher">{language === "ar" ? "معلم" : "Teacher"}</option>
                              <option value="parent">{language === "ar" ? "ولي أمر" : "Parent"}</option>
                              <option value="admin">{language === "ar" ? "مشرف" : "Admin"}</option>
                            </select>
                          </td>
                          <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "#4f6371", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={u.school}>{u.school || "N/A"}</td>
                          <td style={{ padding: "0.75rem 0.5rem" }}>
                            {u.banned ? (
                              <span style={{ padding: "2px 6px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 700, background: "rgba(211, 47, 47, 0.12)", color: "#d32f2f" }}>
                                {language === "ar" ? "محظور 🛑" : "Banned 🛑"}
                              </span>
                            ) : (
                              <span style={{ padding: "2px 6px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 700, background: "rgba(46, 125, 50, 0.12)", color: "#2e7d32" }}>
                                {language === "ar" ? "نشط ✅" : "Active ✅"}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem 0.5rem", display: "flex", gap: "0.35rem", justifyContent: "center" }}>
                            <button
                              onClick={() => handleAdminUpdateUser(u.userId, { banned: !u.banned })}
                              style={{
                                padding: "4px 8px", borderRadius: "var(--border-radius-sm)", border: "none", cursor: "pointer",
                                fontSize: "0.75rem", fontWeight: 700, transition: "all 0.2s",
                                background: u.banned ? "rgba(46, 125, 50, 0.1)" : "rgba(211, 47, 47, 0.1)",
                                color: u.banned ? "#2e7d32" : "#d32f2f"
                              }}
                            >
                              {u.banned ? (language === "ar" ? "تنشيط الحساب" : "Activate") : (language === "ar" ? "حظر العضو" : "Ban Account")}
                            </button>
                            <button
                              onClick={() => {
                                setInspectedUser(u);
                              }}
                              style={{
                                padding: "4px 8px", borderRadius: "var(--border-radius-sm)", border: "1px solid rgba(16,107,163,0.2)",
                                background: "none", color: "var(--primary)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer"
                              }}
                            >
                              {language === "ar" ? "تتبع الأنشطة" : "Trail"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    {allUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#6a7c88" }}>
                          {language === "ar" ? "لا يوجد أعضاء مسجلين حالياً." : "No registered members found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Inspection Overlay Modal for Activity Trail */}
            {inspectedUser && (
              <div style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000,
                background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", padding: "1.5rem"
              }}>
                <div className="panel-card" style={{ width: "100%", maxWidth: "600px", padding: "1.5rem", position: "relative", background: "#fbf8f0", border: "1px solid var(--primary)" }}>
                  <button 
                    onClick={() => setInspectedUser(null)}
                    style={{ position: "absolute", top: "1rem", left: language === "ar" ? "1rem" : "auto", right: language === "ar" ? "auto" : "1rem", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "var(--primary)" }}
                  >
                    <FiX />
                  </button>
                  <h3 style={{ fontSize: "1.2rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.5rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiActivity style={{ color: "var(--primary)" }} />
                    <span>{language === "ar" ? `سجل أنشطة العضو: ${inspectedUser.name}` : `Activity Trail: ${inspectedUser.name}`}</span>
                  </h3>
                  <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }} className="custom-scrollbar">
                    <div style={{ padding: "0.75rem", borderRadius: "6px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.03)" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", display: "block" }}>{language === "ar" ? "تسجيل الدخول الأول" : "Account Onboarding Success"}</span>
                      <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>📍 {language === "ar" ? "الدولة:" : "Country:"} {inspectedUser.country || "Egypt"} | {language === "ar" ? "الدور:" : "Role:"} {inspectedUser.role || "student"}</span>
                    </div>
                    <div style={{ padding: "0.75rem", borderRadius: "6px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.03)" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", display: "block" }}>{language === "ar" ? "التحاق تعليمي" : "Academic Enrolment"}</span>
                      <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>📍 {language === "ar" ? "المدرسة/الجامعة:" : "Institution:"} {inspectedUser.school || "N/A"} | {language === "ar" ? "الصف:" : "Grade:"} {inspectedUser.grade || "N/A"}</span>
                    </div>
                    <div style={{ padding: "0.75rem", borderRadius: "6px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.03)" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", display: "block" }}>{language === "ar" ? "إعداد الملف الرمزي" : "Avatar Update"}</span>
                      <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>📍 {language === "ar" ? "الرمز المختار:" : "Chosen Icon:"} {inspectedUser.avatar || "👤"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "library" ? (
          /* Knowledge Library Panel */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {["all", "Math", "Science", "Arabic", "History"].map(sub => (
                  <button
                    key={sub}
                    onClick={() => setLibrarySubject(sub)}
                    style={{
                      padding: "6px 14px", borderRadius: "20px", border: "1px solid", cursor: "pointer",
                      fontSize: "0.8rem", fontWeight: 700, transition: "all 0.2s",
                      borderColor: librarySubject === sub ? "var(--primary)" : "rgba(16, 107, 163, 0.12)",
                      background: librarySubject === sub ? "linear-gradient(135deg, var(--primary), var(--secondary))" : "rgba(255,255,255,0.6)",
                      color: librarySubject === sub ? "#ffffff" : "var(--primary)",
                      fontFamily: "var(--font-display)"
                    }}
                  >
                    {sub === "all" ? (language === "ar" ? "الكل" : "All Subjects") :
                     sub === "Math" ? (language === "ar" ? "الرياضيات" : "Math") :
                     sub === "Science" ? (language === "ar" ? "العلوم" : "Science") :
                     sub === "Arabic" ? (language === "ar" ? "اللغة العربية" : "Arabic") :
                     (language === "ar" ? "التاريخ" : "History")}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder={language === "ar" ? "ابحث في المكتبة..." : "Search text books..."}
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                style={{
                  padding: "0.5rem 1rem", borderRadius: "20px", border: "1px solid var(--card-border)",
                  outline: "none", fontSize: "0.85rem", width: "220px", fontFamily: "var(--font-sans)"
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
              {[
                { titleEn: "Advanced Mathematics Grade 9", titleAr: "الرياضيات المتقدمة - الصف التاسع", subject: "Math", size: "14.5 MB", format: "PDF", downloads: "1,240" },
                { titleEn: "Comprehensive Chemistry Handbook", titleAr: "كتاب الكيمياء الشامل والمبسط", subject: "Science", size: "18.2 MB", format: "PDF", downloads: "854" },
                { titleEn: "Arabic Literature and Poetry Anthology", titleAr: "روائع الأدب العربي والشعر", subject: "Arabic", size: "9.1 MB", format: "EPUB", downloads: "2,105" },
                { titleEn: "Modern History of the Middle East", titleAr: "التاريخ الحديث للشرق الأوسط", subject: "History", size: "12.4 MB", format: "PDF", downloads: "412" },
                { titleEn: "Physics Principles & Mechanics", titleAr: "أسس الفيزياء والميكانيكا الكلاسيكية", subject: "Science", size: "22.1 MB", format: "PDF", downloads: "931" },
                { titleEn: "Grammar & Arabic Linguistics Keys", titleAr: "مفاتيح النحو وقواعد الصرف المبسطة", subject: "Arabic", size: "5.4 MB", format: "PDF", downloads: "1,674" }
              ]
                .filter(item => {
                  const s = librarySearch.toLowerCase();
                  const matchesSearch = item.titleEn.toLowerCase().includes(s) || item.titleAr.includes(s);
                  const matchesSub = librarySubject === "all" || item.subject === librarySubject;
                  return matchesSearch && matchesSub;
                })
                .map((item, idx) => (
                  <div key={idx} className="panel-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "180px", position: "relative", transition: "all 0.2s" }} onMouseOver={(e)=>{e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.borderColor="var(--primary)"}} onMouseLeave={(e)=>{e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="var(--card-border)"}}>
                    <div>
                      <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", background: "rgba(16, 107, 163, 0.08)", color: "var(--primary)", padding: "2px 8px", borderRadius: "10px", display: "inline-block", marginBottom: "0.5rem" }}>
                        {item.subject === "Math" ? (language === "ar" ? "رياضيات" : "Math") :
                         item.subject === "Science" ? (language === "ar" ? "علوم" : "Science") :
                         item.subject === "Arabic" ? (language === "ar" ? "عربي" : "Arabic") :
                         (language === "ar" ? "تاريخ" : "History")}
                      </span>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--foreground)", fontFamily: "var(--font-sans)" }}>
                        {language === "ar" ? item.titleAr : item.titleEn}
                      </h3>
                      <p style={{ fontSize: "0.75rem", color: "#6a7c88", margin: 0 }}>💾 {item.format} | 📦 {item.size}</p>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#4f6371" }}>📥 {item.downloads} {language === "ar" ? "تحميل" : "downloads"}</span>
                      <button
                        onClick={() => alert(language === "ar" ? `جاري تحميل ملف: ${item.titleAr}` : `Downloading textbook: ${item.titleEn}`)}
                        style={{
                          padding: "4px 10px", borderRadius: "20px", border: "none", cursor: "pointer",
                          background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#ffffff",
                          fontSize: "0.75rem", fontWeight: 700
                        }}
                      >
                        {language === "ar" ? "تحميل مجاني" : "Download"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : activeTab === "subjects" ? (
          /* Course Subjects Panel */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }} className="grid-cols-1">
              {/* Core subjects progress cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  { nameAr: "الرياضيات العامة", nameEn: "Pure Mathematics", icon: "📐", progress: 65, color: "var(--primary)" },
                  { nameAr: "العلوم والفيزياء", nameEn: "Physics & Chemistry", icon: "🧪", progress: 42, color: "#9c27b0" },
                  { nameAr: "اللغة العربية وآدابها", nameEn: "Arabic Grammar & Literature", icon: "📚", progress: 85, color: "#2e7d32" },
                  { nameAr: "التاريخ والجغرافيا", nameEn: "World History", icon: "🌍", progress: 20, color: "#ef6c00" }
                ].map((item, idx) => (
                  <div key={idx} className="panel-card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ fontSize: "2rem" }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.25rem 0", fontFamily: "var(--font-sans)" }}>{language === "ar" ? item.nameAr : item.nameEn}</h3>
                      <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden", marginBottom: "0.25rem" }}>
                        <div style={{ width: `${item.progress}%`, height: "100%", background: item.color, borderRadius: "3px" }}></div>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#6a7c88", fontWeight: 700 }}>{item.progress}% {language === "ar" ? "مكتمل" : "completed"}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Module Accordion Workspace */}
              <div className="panel-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.5rem", marginBottom: "1rem", fontWeight: 800 }}>
                  {language === "ar" ? "تفاصيل الوحدات والدروس التفاعلية" : "Interactive Curriculum Modules"}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {[
                    { titleAr: "الوحدة الأولى: الجبر والنسب المثلثية", titleEn: "Module 1: Algebra & Trigonometry Trigonometric Functions", lessons: ["المعادلات التربيعية", "المتطابقات المثلثية", "المصفوفات والمحددات"] },
                    { titleAr: "الوحدة الثانية: علم التفاضل والتكامل المبسط", titleEn: "Module 2: Basics of Calculus & Limits", lessons: ["النهايات والاتصال", "قواعد الاشتقاق وتطبيقاته", "المشتقات العليا"] },
                    { titleAr: "الوحدة الثالثة: الاحتمالات والإحصاء التطبيقي", titleEn: "Module 3: Probability & Applied Statistics", lessons: ["التوزيع الطبيعي المعتدل", "معامل الارتباط وبيرسون", "مبدأ العد والتباديل"] }
                  ].map((mod, index) => (
                    <div key={index} style={{ border: "1px solid var(--card-border)", borderRadius: "var(--border-radius-sm)", background: "#ffffff", overflow: "hidden" }}>
                      <button
                        onClick={() => setExpandedModule(expandedModule === index ? null : index)}
                        style={{
                          width: "100%", padding: "1rem", border: "none", background: "none", cursor: "pointer",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-sans)", fontSize: "0.9rem"
                        }}
                      >
                        <span>{language === "ar" ? mod.titleAr : mod.titleEn}</span>
                        <span>{expandedModule === index ? "▼" : "▶"}</span>
                      </button>
                      {expandedModule === index && (
                        <div style={{ padding: "0.5rem 1rem 1rem 1rem", borderTop: "1px solid rgba(0,0,0,0.04)", background: "rgba(16, 107, 163, 0.01)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {mod.lessons.map((les, lessonIdx) => (
                            <div key={lessonIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", background: "#ffffff", border: "1px solid rgba(0,0,0,0.03)", borderRadius: "4px" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>📚 {les}</span>
                              <button
                                onClick={() => alert(language === "ar" ? `جاري بدء الدرس: ${les}` : `Starting lesson: ${les}`)}
                                style={{
                                  padding: "2px 8px", borderRadius: "4px", border: "none", cursor: "pointer",
                                  background: "var(--primary)", color: "#ffffff", fontSize: "0.75rem", fontWeight: 700
                                }}
                              >
                                {language === "ar" ? "ابدأ الدرس" : "Study Lesson"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "practice" ? (
          /* Practice Workstation Panel */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem" }} className="grid-cols-1">
              {/* Flashcard Player Widget with flip animation */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div 
                  onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                  style={{
                    height: "220px", borderRadius: "var(--border-radius-lg)", border: "1px solid var(--primary)",
                    background: "radial-gradient(circle at top right, rgba(16, 107, 163, 0.08), rgba(212, 175, 55, 0.03)), #ffffff",
                    display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                    cursor: "pointer", padding: "2rem", textAlign: "center", position: "relative",
                    boxShadow: "var(--shadow-sm)", transition: "all 0.4s ease", transformStyle: "preserve-3d"
                  }}
                >
                  <div style={{ position: "absolute", top: "0.75rem", right: "1rem", fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase" }}>
                    {language === "ar" ? "بطاقة مراجعة تفاعلية" : "Interactive Flashcard"}
                  </div>
                  
                  {!flashcardFlipped ? (
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "#6a7c88", fontWeight: 700 }}>{language === "ar" ? "السؤال / المفهوم" : "Question / Concept"}</span>
                      <h3 style={{ fontSize: "1.25rem", color: "var(--primary)", margin: "0.5rem 0 0 0", fontWeight: 800, fontFamily: "var(--font-sans)" }}>
                        {language === "ar" ? [
                          "ما هو تعريف المشتقة الأولى في التفاضل؟",
                          "ما هي الصيغة الكيميائية لغاز ثنائي أكسيد الكربون؟",
                          "من هو مؤلف كتاب كليلة ودمنة؟"
                        ][flashcardIndex] : [
                          "What is the definition of the derivative in Calculus?",
                          "What is the chemical formula for carbon dioxide?",
                          "Who is the author of the Arabic classic 'Kalila and Demna'?"
                        ][flashcardIndex]}
                      </h3>
                      <p style={{ fontSize: "0.8rem", color: "rgba(16, 107, 163, 0.6)", marginTop: "1rem", fontWeight: 700 }}>💡 {language === "ar" ? "اضغط لقلب البطاقة ومعرفة الإجابة" : "Click to flip and reveal answer"}</p>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "#2e7d32", fontWeight: 700 }}>{language === "ar" ? "الإجابة النموذجية" : "Model Answer"}</span>
                      <p style={{ fontSize: "1.1rem", color: "var(--foreground)", margin: "0.5rem 0 0 0", fontWeight: 700, lineHeight: "1.6", fontFamily: "var(--font-sans)" }}>
                        {language === "ar" ? [
                          "هي معدل التغير اللحظي للدالة بالنسبة لمتغيرها المستقل، وتمثل هندسياً بميل المماس لمنحنى الدالة عند نقطة.",
                          "الصيغة الكيميائية هي CO₂، ويتكون من جزيء كربون وجزيئين أكسجين.",
                          "ابن المقفع، وهو كاتب وأديب فارسي الأصل قام بترجمته وصياغته بأسلوب عربي بليغ."
                        ][flashcardIndex] : [
                          "It is the instantaneous rate of change of a function with respect to its variable, geometrically representing the slope of the tangent.",
                          "The chemical formula is CO₂, consisting of one carbon atom and two oxygen atoms.",
                          "Ibn al-Muqaffa, who translated and adapted these ancient Indian fables into classical Arabic prose."
                        ][flashcardIndex]}
                      </p>
                    </div>
                  )}
                </div>

                {/* Player controls */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    onClick={() => {
                      setFlashcardFlipped(false);
                      setFlashcardIndex(prev => (prev === 0 ? 2 : prev - 1));
                    }}
                    style={{ padding: "6px 12px", border: "1px solid var(--card-border)", borderRadius: "6px", background: "#ffffff", cursor: "pointer", fontWeight: 700 }}
                  >
                    ◀ {language === "ar" ? "السابق" : "Prev"}
                  </button>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{flashcardIndex + 1} / 3</span>
                  <button
                    onClick={() => {
                      setFlashcardFlipped(false);
                      setFlashcardIndex(prev => (prev === 2 ? 0 : prev + 1));
                    }}
                    style={{ padding: "6px 12px", border: "1px solid var(--card-border)", borderRadius: "6px", background: "#ffffff", cursor: "pointer", fontWeight: 700 }}
                  >
                    {language === "ar" ? "التالي" : "Next"} ▶
                  </button>
                </div>
              </div>

              {/* Practice Questions generator */}
              <div className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800 }}>{language === "ar" ? "مولد أسئلة التدريب الذكي" : "AI Question Workstation"}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700 }}>{language === "ar" ? "اختر المادة الدراسية" : "Select Subject"}</label>
                  <select
                    value={practiceSubject}
                    onChange={(e) => setPracticeSubject(e.target.value)}
                    style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.85rem" }}
                  >
                    <option value="Math">{language === "ar" ? "الرياضيات" : "Mathematics"}</option>
                    <option value="Science">{language === "ar" ? "العلوم والفيزياء" : "Science & Physics"}</option>
                    <option value="Arabic">{language === "ar" ? "اللغة العربية" : "Arabic Linguistics"}</option>
                  </select>
                </div>
                <button
                  onClick={() => alert(language === "ar" ? `جاري توليد سؤال جديد لـ ${practiceSubject} بمساعدة الذكاء الاصطناعي...` : `Generating dynamic mock question for ${practiceSubject} using our AI agent...`)}
                  style={{
                    padding: "10px", borderRadius: "var(--border-radius-sm)", border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#ffffff",
                    fontWeight: 700, fontSize: "0.85rem"
                  }}
                >
                  ✨ {language === "ar" ? "توليد سؤال تدريبي مخصص" : "Generate Custom Question"}
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === "plan" ? (
          /* Study Planner Panel */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }} className="grid-cols-1">
              {/* Custom planner checklist */}
              <div className="panel-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.5rem", marginBottom: "1rem", fontWeight: 800 }}>
                  {language === "ar" ? "خطة الدراسة ومتابعة المهام الأسبوعية" : "My Weekly Academic Plan & Tasks"}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {[
                    { textAr: "دراسة درس المتطابقات المثلثية وحل 10 مسائل", textEn: "Study Trigonometric Functions and solve 10 exercises", checked: true, dayAr: "السبت", dayEn: "Sat" },
                    { textAr: "مراجعة قواعد كتابة الهمزة المتوسطة وحل الكراسة", textEn: "Review Arabic spelling rules and complete exercises", checked: true, dayAr: "الأحد", dayEn: "Sun" },
                    { textAr: "تجربة اختبار معمل الكيمياء عن التفاعلات الطاردة للحرارة", textEn: "Perform chemistry virtual experiment on exothermic reactions", checked: false, dayAr: "الإثنين", dayEn: "Mon" },
                    { textAr: "تلخيص الفصل الرابع من تاريخ الشرق الأوسط عبر الزتونة", textEn: "Summarize Chapter 4 of Middle East History via Zatona AI", checked: false, dayAr: "الثلاثاء", dayEn: "Tue" },
                    { textAr: "التحضير لاختبار مادة العلوم القصير والتدرب على الفلاش كارد", textEn: "Prepare for Science mock assessment and practice flashcards", checked: false, dayAr: "الأربعاء", dayEn: "Wed" }
                  ].map((task, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid rgba(0,0,0,0.03)", background: "#ffffff", transition: "all 0.15s" }}>
                      <input
                        type="checkbox"
                        defaultChecked={task.checked}
                        style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--primary)" }}
                      />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: task.checked ? "#6a7c88" : "var(--foreground)", textDecoration: task.checked ? "line-through" : "none" }}>
                          {language === "ar" ? task.textAr : task.textEn}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.7rem", fontWeight: 800, background: "rgba(16, 107, 163, 0.06)", color: "var(--primary)", padding: "2px 8px", borderRadius: "10px" }}>
                        {language === "ar" ? task.dayAr : task.dayEn}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Study goal statistics */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="panel-card" style={{ padding: "1.5rem", textAlign: "center", background: "linear-gradient(135deg, rgba(16, 107, 163, 0.05), rgba(212, 175, 55, 0.05))" }}>
                  <span style={{ fontSize: "2.5rem" }}>🏆</span>
                  <h3 style={{ fontSize: "1rem", margin: "0.5rem 0 0.25rem 0", fontWeight: 800 }}>{language === "ar" ? "أداء الأسبوع" : "Weekly Target Metric"}</h3>
                  <p style={{ fontSize: "0.8rem", color: "#6a7c88", margin: "0 0 1rem 0" }}>{language === "ar" ? "لقد أنجزت 2 من أصل 5 مهام دراسية مقررة." : "You have achieved 2 of 5 scheduled goals."}</p>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>40%</div>
                </div>

                <button
                  onClick={() => alert(language === "ar" ? "جاري إنشاء خطة دراسية مخصصة بواسطة الذكاء الاصطناعي لتغطية المنهج الدراسي بالكامل..." : "Generating custom AI-designed study blueprint to cover your full curriculum...")}
                  style={{
                    padding: "1rem", borderRadius: "var(--border-radius-md)", border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#ffffff",
                    fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
                  }}
                >
                  <span>✨ {language === "ar" ? "توليد خطة دراسية ذكية" : "AI Custom Blueprint"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === "timetable" ? (
          /* Weekly Schedule Panel */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <section className="panel-card" style={{ padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FiClock style={{ color: "var(--primary)" }} />
                  <span>{language === "ar" ? "جدول الحصص الأسبوعي الحاضر" : "Weekly Class Schedule Planner"}</span>
                </h3>
                <button
                  onClick={() => {
                    const newSub = window.prompt(language === "ar" ? "اسم الحصة والمادة:" : "Class subject:");
                    const newDay = window.prompt(language === "ar" ? "اليوم (مثال: Monday):" : "Day of week (e.g., Monday):");
                    const newTime = window.prompt(language === "ar" ? "الوقت (مثال: 09:00 - 10:30):" : "Time range (e.g., 09:00 - 10:30):");
                    if (newSub && newDay && newTime) {
                      setTimetableEvents(prev => [
                        ...prev,
                        { id: Date.now(), subject: newSub, subjectAr: newSub, day: newDay, dayAr: newDay, time: newTime, room: "Virtual Room" }
                      ]);
                    }
                  }}
                  className="btn btn-primary"
                  style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                >
                  <FiPlus />
                  <span>{language === "ar" ? "إضافة حصة" : "Add Class"}</span>
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {timetableEvents.map((evt) => (
                  <div key={evt.id} style={{ padding: "1rem", border: "1px solid var(--card-border)", borderRadius: "var(--border-radius-md)", background: "#ffffff", display: "flex", flexDirection: "column", gap: "0.5rem", position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)", background: "rgba(16, 107, 163, 0.06)", padding: "2px 8px", borderRadius: "10px" }}>
                        {language === "ar" ? evt.dayAr : evt.day}
                      </span>
                      <button
                        onClick={() => {
                          setTimetableEvents(prev => prev.filter(e => e.id !== evt.id));
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#d32f2f", fontSize: "0.8rem" }}
                        title={language === "ar" ? "حذف الحصة" : "Delete class"}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                      📚 {language === "ar" ? evt.subjectAr : evt.subject}
                    </h4>
                    <p style={{ fontSize: "0.8rem", color: "#6a7c88", margin: 0 }}>⏱️ {evt.time} | 🏫 {evt.room}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : activeTab === "quiz" ? (
          /* Quiz Arena Panel */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <section className="panel-card" style={{ padding: "2rem" }}>
              {!quizFinished ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800 }}>
                      {language === "ar" ? "مقياس التحصيل والأداء النهائي" : "Knowledge Assessment Workstation"}
                    </h3>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, background: "rgba(16, 107, 163, 0.08)", padding: "4px 10px", borderRadius: "20px", color: "var(--primary)" }}>
                      {language === "ar" ? `السؤال ${quizQuestionIndex + 1} من 3` : `Question ${quizQuestionIndex + 1} of 3`}
                    </span>
                  </div>

                  {/* Question Title */}
                  <h4 style={{ fontSize: "1.1rem", color: "var(--primary)", margin: "0 0 1.25rem 0", fontWeight: 800, fontFamily: "var(--font-sans)" }}>
                    {language === "ar" ? [
                      "ما هي ناتج عملية تكامل السينوس (sin(x) dx)؟",
                      "أي الكواكب التالية يلقب بالكوكب الأحمر نظراً لنسبة أكسيد الحديد العالية؟",
                      "ما هي عاصمة جمهورية مصر العربية؟"
                    ][quizQuestionIndex] : [
                      "What is the integral of sin(x) dx?",
                      "Which planet in our solar system is known as the Red Planet?",
                      "What is the capital city of Egypt?"
                    ][quizQuestionIndex]}
                  </h4>

                  {/* Options */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                    {([
                      [
                        { textAr: "cos(x) + C", textEn: "cos(x) + C", isCorrect: false },
                        { textAr: "-cos(x) + C", textEn: "-cos(x) + C", isCorrect: true },
                        { textAr: "sin(x) + C", textEn: "sin(x) + C", isCorrect: false },
                        { textAr: "tan(x) + C", textEn: "tan(x) + C", isCorrect: false }
                      ],
                      [
                        { textAr: "المشتري", textEn: "Jupiter", isCorrect: false },
                        { textAr: "المريخ", textEn: "Mars", isCorrect: true },
                        { textAr: "الزهرة", textEn: "Venus", isCorrect: false },
                        { textAr: "عطارد", textEn: "Mercury", isCorrect: false }
                      ],
                      [
                        { textAr: "القاهرة", textEn: "Cairo", isCorrect: true },
                        { textAr: "الإسكندرية", textEn: "Alexandria", isCorrect: false },
                        { textAr: "الجيزة", textEn: "Giza", isCorrect: false },
                        { textAr: "الأقصر", textEn: "Luxor", isCorrect: false }
                      ]
                    ][quizQuestionIndex]).map((opt, optIdx) => {
                      const isSelected = quizAnswers[quizQuestionIndex] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => setQuizAnswers(prev => ({ ...prev, [quizQuestionIndex]: optIdx }))}
                          style={{
                            padding: "0.85rem 1.25rem", borderRadius: "var(--border-radius-sm)", border: "1px solid",
                            textAlign: language === "ar" ? "right" : "left", cursor: "pointer",
                            fontSize: "0.9rem", fontWeight: 600, transition: "all 0.15s",
                            borderColor: isSelected ? "var(--primary)" : "var(--card-border)",
                            background: isSelected ? "rgba(16, 107, 163, 0.05)" : "#ffffff",
                            color: isSelected ? "var(--primary)" : "var(--foreground)",
                            fontFamily: "var(--font-sans)"
                          }}
                        >
                          <span style={{ marginRight: language === "ar" ? "0" : "0.5rem", marginLeft: language === "ar" ? "0.5rem" : "0" }}>
                            {["A", "B", "C", "D"][optIdx]}.
                          </span>
                          {language === "ar" ? opt.textAr : opt.textEn}
                        </button>
                      );
                    })}
                  </div>

                  {/* Navigation buttons */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      disabled={quizQuestionIndex === 0}
                      onClick={() => setQuizQuestionIndex(prev => prev - 1)}
                      style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "#ffffff", cursor: quizQuestionIndex === 0 ? "not-allowed" : "pointer", opacity: quizQuestionIndex === 0 ? 0.5 : 1, fontWeight: 700 }}
                    >
                      {language === "ar" ? "السابق" : "Back"}
                    </button>
                    {quizQuestionIndex === 2 ? (
                      <button
                        onClick={() => setQuizFinished(true)}
                        className="btn btn-primary"
                        style={{ padding: "8px 16px", fontWeight: 700 }}
                      >
                        {language === "ar" ? "إنهاء وتصحيح الاختبار" : "Submit Quiz"}
                      </button>
                    ) : (
                      <button
                        disabled={quizAnswers[quizQuestionIndex] === undefined}
                        onClick={() => setQuizQuestionIndex(prev => prev + 1)}
                        style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--primary)", background: "var(--primary)", color: "#ffffff", cursor: quizAnswers[quizQuestionIndex] === undefined ? "not-allowed" : "pointer", opacity: quizAnswers[quizQuestionIndex] === undefined ? 0.5 : 1, fontWeight: 700 }}
                      >
                        {language === "ar" ? "التالي" : "Next Question"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Quiz Finished Certificate Display */
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", padding: "1rem" }}>
                  <span style={{ fontSize: "3.5rem" }}>🎉</span>
                  <h3 style={{ fontSize: "1.4rem", margin: 0, fontWeight: 800 }}>{language === "ar" ? "اكتمل الاختبار بنجاح!" : "Assessment Complete!"}</h3>
                  
                  {/* Score Calculation */}
                  {(() => {
                    const modelAnswers = [1, 1, 0]; // Index of correct answers
                    let score = 0;
                    if (quizAnswers[0] === modelAnswers[0]) score += 1;
                    if (quizAnswers[1] === modelAnswers[1]) score += 1;
                    if (quizAnswers[2] === modelAnswers[2]) score += 1;

                    return (
                      <div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", margin: "0.5rem 0" }}>
                          {score} / 3
                        </div>
                        <p style={{ fontSize: "0.95rem", color: "#4f6371", maxWidth: "450px", margin: "0 auto 1.5rem auto", lineHeight: "1.6" }}>
                          {score === 3 
                            ? (language === "ar" ? "عمل رائع ومثالي! لقد أجبت على كافة الأسئلة بشكل صحيح مذهل." : "Perfect score! Outstanding academic achievement.")
                            : (language === "ar" ? "عمل جيد! يمكنك مراجعة الوحدات الدراسية وإعادة الاختبار لتحقيق الدرجة الكاملة." : "Good attempt! Review course materials and try again to master this subject.")}
                        </p>
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => {
                      setQuizQuestionIndex(0);
                      setQuizAnswers({});
                      setQuizFinished(false);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: "8px 16px", fontWeight: 700 }}
                  >
                    🔄 {language === "ar" ? "إعادة المحاولة" : "Retake Assessment"}
                  </button>
                </div>
              )}
            </section>
          </div>
        ) : activeTab === "zatona" ? (
          /* Zatona AI Research Panel */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }} className="grid-cols-1">
              {/* Left Side: Summary prompt generator */}
              <div className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800, borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.5rem" }}>
                  {language === "ar" ? "الزتونة: مركز التلخيص واستخراج الجوهر" : "Zatona: High-Yield AI Summary Engine"}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#4f6371", margin: 0, lineHeight: "1.6" }}>
                  {language === "ar"
                    ? "اكتب فكرة رئيسية أو الصق مقتطفاً من كتابك المدرسي، وسيقوم عميل فاهم الذكي بتحليله وإيجاز تفاصيله في تلخيص فائق التركيز يحتوي فقط على الفكرة والجوهر الدراسي المفيد."
                    : "Type a topic or paste a textbook section. Our AI will digest, extract, and present a warm, concise report containing only the pure essence and academic value."}
                </p>
                <textarea
                  value={zatonaPrompt}
                  onChange={(e) => setZatonaPrompt(e.target.value)}
                  placeholder={language === "ar" ? "الصق النص هنا أو اكتب الفكرة (مثال: قوانين الحركة لنيوتن)..." : "Paste textbook text or type study topic (e.g., Newton's laws of motion)..."}
                  style={{
                    width: "100%", height: "120px", padding: "0.75rem", borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--card-border)", outline: "none", fontSize: "0.85rem",
                    fontFamily: "var(--font-sans)", resize: "none"
                  }}
                />
                <button
                  disabled={zatonaLoading || !zatonaPrompt.trim()}
                  onClick={() => {
                    setZatonaLoading(true);
                    setZatonaResult("");
                    setTimeout(() => {
                      setZatonaLoading(false);
                      setZatonaResult(
                        language === "ar"
                          ? `ملخص مخصص للـ [ ${zatonaPrompt} ]\n\n📌 الخلاصة الأولى:\nتصف قوانين نيوتن الثلاثة العلاقة بين حركة الجسم والقوى المؤثرة عليه.\n\n📌 الخلاصة الثانية (قانون القصور الذاتي):\nالجسم الساكن يظل ساكناً والجسم المتحرك يظل متحركاً ما لم تؤثر عليه قوة خارجية.\n\n📌 الخلاصة الثالثة:\nالقوة تساوي الكتلة ضرب التسارع (F = ma)، ولكل فعل رد فعل مساوٍ له في المقدار ومضاد له في الاتجاه.`
                          : `High-Yield AI Digest for [ ${zatonaPrompt} ]\n\n📌 Core Concept 1:\nNewton's laws formulate the baseline relation between structural mass mechanics and accelerating forces.\n\n📌 Core Concept 2 (Inertia):\nAn object remains in static equilibrium or uniform velocity unless acted upon by a net external force.\n\n📌 Core Concept 3:\nForce is mathematically equal to mass times acceleration (F = ma), and every action yields an equal and opposite reaction.`
                      );
                    }, 1200);
                  }}
                  className="btn btn-primary"
                  style={{ padding: "10px", fontWeight: 700 }}
                >
                  {zatonaLoading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      <FiRefreshCw className="spinning-icon" />
                      <span>{language === "ar" ? "جاري عصر واستخراج الزتونة..." : "Digesting textbook essence..."}</span>
                    </span>
                  ) : (
                    <span>✨ {language === "ar" ? "عصر واستخراج الزتونة الذكية" : "Digest Textbook Essence"}</span>
                  )}
                </button>
              </div>

              {/* Right Side: Report Viewer */}
              <div className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800 }}>{language === "ar" ? "تقرير التلخيص المستخرج" : "Zatona AI Presentation"}</h3>
                <div style={{
                  flex: 1, padding: "1rem", borderRadius: "6px", border: "1px dashed var(--primary)",
                  background: "#ffffff", overflowY: "auto", minHeight: "150px"
                }} className="custom-scrollbar">
                  {zatonaResult ? (
                    <div style={{ whiteSpace: "pre-line", fontSize: "0.85rem", lineHeight: "1.6", fontFamily: "var(--font-sans)" }}>
                      {zatonaResult}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", color: "#6a7c88", fontSize: "0.85rem", gap: "0.5rem" }}>
                      <span>🍋</span>
                      <span>{language === "ar" ? "اكتب مادة دراسية على اليسار واضغط على زر عصر الزتونة" : "Enter topic details on the left to extract the pure essence"}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "social" ? (
          /* Social Hub & Messenger Pane */
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            
            {/* Parent Control & Approvals Panel */}
            {userProfile?.userType === "parent" && (
              <section className="panel-card" style={{ padding: "2rem" }}>
                <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.6rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "1rem", marginBottom: "1.5rem", fontWeight: 800 }}>
                  <FiShield style={{ color: "var(--primary)" }} />
                  <span>{language === "ar" ? "إدارة حسابات الأبناء والموافقات الأبوية" : "Children Panel & Parental Consents"}</span>
                </h2>
                <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: "1.6" }}>
                  {language === "ar" 
                    ? "بصفتك ولي أمر، يمكنك مراقبة حسابات أبنائك الذين تقل أعمارهم عن 13 عاماً والموافقة على تفعيلها للسماح لهم بالاستفادة من خدمات المنصة والذكاء الاصطناعي تماشياً مع معايير COPPA وحماية الأطفال."
                    : "As a parent, you have direct oversight over your children's profiles. Approve pending children below to authorize their access to Fahem AI tools under COPPA and standard protection protocols."}
                </p>

                {parentChildrenLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6a7c88" }}>
                    <FiRefreshCw className="spinning-icon" />
                    <span>{language === "ar" ? "جاري تحميل حسابات الأبناء..." : "Fetching children records..."}</span>
                  </div>
                ) : parentChildren.length === 0 ? (
                  <div style={{ padding: "1.5rem", background: "rgba(255, 255, 255, 0.4)", borderRadius: "var(--border-radius-md)", border: "1px dashed var(--card-border)", textAlign: "center", color: "#6a7c88" }}>
                    {language === "ar" 
                      ? "لم يتم العثور على أي حسابات أبناء مسجلة بريدك الإلكتروني كولي أمر حالياً." 
                      : "No child profiles are registered under your parent email address yet."}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                    {parentChildren.map((child: any) => (
                      <div
                        key={child.userId}
                        style={{
                          padding: "1.25rem",
                          borderRadius: "var(--border-radius-md)",
                          background: "rgba(255, 255, 255, 0.65)",
                          border: "1px solid var(--card-border)",
                          boxShadow: "var(--shadow-sm)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.85rem",
                          position: "relative"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <span style={{ fontSize: "2.5rem", background: "rgba(16, 107, 163, 0.06)", width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {renderAvatar(child.avatar, "2.5rem")}
                          </span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                            <strong style={{ fontSize: "1.1rem", color: "var(--foreground)" }}>{child.name}</strong>
                            <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>{child.email}</span>
                            <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>
                              {language === "ar" ? `العمر: ${child.age} سنة` : `Age: ${child.age} years old`}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderTop: "1px solid rgba(235, 220, 185, 0.2)" }}>
                          <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>
                            {language === "ar" ? `المسار: ${child.grade}` : `Track: ${child.grade}`}
                          </span>
                          {child.isApproved ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "4px 10px", borderRadius: "10px", background: "rgba(46, 125, 50, 0.1)", color: "var(--accent-green)", fontSize: "0.75rem", fontWeight: 700 }}>
                              <FiUserCheck />
                              {language === "ar" ? "مصرح ونشط" : "Approved"}
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "4px 10px", borderRadius: "10px", background: "rgba(211, 47, 47, 0.1)", color: "#d32f2f", fontSize: "0.75rem", fontWeight: 700 }}>
                              <FiClock />
                              {language === "ar" ? "قيد المراجعة" : "Pending Consent"}
                            </span>
                          )}
                        </div>

                        {!child.isApproved && (
                          <button
                            type="button"
                            onClick={() => approveChildProfile(child.userId)}
                            className="btn btn-primary"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.6rem", fontSize: "0.85rem" }}
                          >
                            <FiUserPlus />
                            <span>{language === "ar" ? "تفعيل الحساب والموافقة" : "Authorize Child Account"}</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Main Messenger and Directory Split Layout */}
            <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "2rem" }}>
              
              {/* Left Side: Messenger Direct DM Panel */}
              <section className="panel-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", minHeight: "550px" }}>
                {!chatRecipient ? (
                  /* No chat recipient selected */
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", gap: "1rem", padding: "2rem" }}>
                    <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(16, 107, 163, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", animation: "pulse 2s infinite" }}>
                      <FiMessageSquare style={{ fontSize: "2.5rem", color: "var(--primary)" }} />
                    </div>
                    <h3 style={{ fontSize: "1.25rem", margin: 0 }}>{language === "ar" ? "مراسلات آمنة ومباشرة" : "Secure Direct Messenger"}</h3>
                    <p style={{ color: "#6a7c88", fontSize: "0.9rem", maxWidth: "340px", lineHeight: "1.6", margin: 0 }}>
                      {language === "ar"
                        ? "اختر صديقاً من قائمتك أو ابحث عن مستخدمين في الدليل لبدء محادثة مشفرة وآمنة في الوقت الفعلي."
                        : "Select a friend from your roster or discover users in the platform directory to exchange private messages."}
                    </p>
                  </div>
                ) : (
                  /* Chat client active */
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    {/* Chat Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "1rem", marginBottom: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {renderAvatar(chatRecipient.avatar, "2.2rem")}
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <strong style={{ fontSize: "1.1rem", color: "var(--foreground)" }}>{chatRecipient.name}</strong>
                          <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                            {chatRecipient.userType === "student" ? (language === "ar" ? "طالب" : "Student") :
                             chatRecipient.userType === "teacher" ? (language === "ar" ? "معلم" : "Teacher") :
                             chatRecipient.userType === "parent" ? (language === "ar" ? "ولي أمر" : "Parent") :
                             (language === "ar" ? "مشرف" : "Admin")}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChatRecipient(null)}
                        style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", padding: "0.5rem", borderRadius: "50%", transition: "background 0.2s ease" }}
                        className="btn-close-chat"
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                        aria-label="Close Chat"
                      >
                        <FiX />
                      </button>
                    </div>

                    {/* Messages Body */}
                    <div
                      style={{
                        flex: 1,
                        maxHeight: "350px",
                        overflowY: "auto",
                        padding: "0.5rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.85rem",
                        marginBottom: "1rem",
                      }}
                      className="custom-scrollbar"
                    >
                      {chatLoading ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", gap: "0.5rem", color: "#6a7c88" }}>
                          <FiRefreshCw className="spinning-icon" />
                          <span>{language === "ar" ? "جاري جلب الرسائل..." : "Retrieving history..."}</span>
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#8a9ca8", fontSize: "0.9rem" }}>
                          {language === "ar" ? "ابدأ المحادثة الآن! اكتب رسالة أدناه 👇" : "No messages yet. Send a friendly hello! 👇"}
                        </div>
                      ) : (
                        chatMessages.map((msg: any, index: number) => {
                          const isMe = msg.senderId === user?.uid;
                          let timeStr = "";
                          try {
                            timeStr = new Date(msg.timestamp).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
                          } catch (_) {}

                          return (
                            <div
                              key={index}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: isMe ? "flex-end" : "flex-start",
                                alignSelf: isMe ? "flex-end" : "flex-start",
                                maxWidth: "85%"
                              }}
                            >
                              <div
                                style={{
                                  padding: "0.75rem 1rem",
                                  borderRadius: isMe 
                                    ? (language === "ar" ? "16px 16px 4px 16px" : "16px 16px 16px 4px")
                                    : (language === "ar" ? "16px 16px 16px 4px" : "16px 16px 4px 16px"),
                                  background: isMe 
                                    ? "linear-gradient(135deg, var(--primary), var(--secondary))" 
                                    : "rgba(255,255,255,0.75)",
                                  color: isMe ? "#ffffff" : "var(--foreground)",
                                  border: isMe ? "none" : "1px solid var(--card-border)",
                                  boxShadow: "var(--shadow-sm)",
                                  fontSize: "0.95rem",
                                  lineHeight: "1.5",
                                  textAlign: language === "ar" ? "right" : "left",
                                  wordBreak: "break-word"
                                }}
                              >
                                {msg.content}
                              </div>
                              <span style={{ fontSize: "0.68rem", color: "#8a9ca8", marginTop: "2px", display: "inline-block", padding: "0 4px" }}>
                                {timeStr}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Messages Footer Form */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendChatMessage();
                      }}
                      style={{ display: "flex", gap: "0.5rem", borderTop: "1px dashed rgba(235, 220, 185, 0.4)", paddingTop: "1rem" }}
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={language === "ar" ? "اكتب رسالة مشفرة..." : "Type a secure message..."}
                        style={{
                          flex: 1,
                          padding: "0.75rem 1rem",
                          borderRadius: "var(--border-radius-md)",
                          border: "1px solid var(--card-border)",
                          outline: "none",
                          fontFamily: "var(--font-sans)",
                          background: "#ffffff",
                          fontSize: "0.95rem"
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim()}
                        className="btn btn-primary"
                        style={{ padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <FiSend />
                      </button>
                    </form>
                  </div>
                )}
              </section>

              {/* Right Side: Connections list & Directory */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                
                {/* Connections (Friends list) */}
                <section className="panel-card" style={{ padding: "1.5rem" }}>
                  <h2 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.3)", paddingBottom: "0.5rem", fontWeight: 800 }}>
                    <FiUserCheck style={{ color: "var(--accent-green)" }} />
                    <span>{language === "ar" ? "قائمة الأصدقاء" : "Your Friend Circle"}</span>
                  </h2>

                  {userProfile?.friends?.length === 0 ? (
                    <div style={{ padding: "1rem", borderRadius: "var(--border-radius-md)", background: "rgba(255,255,255,0.4)", border: "1px dashed var(--card-border)", textAlign: "center", color: "#6a7c88", fontSize: "0.85rem" }}>
                      {language === "ar" 
                        ? "لم تقم بإضافة أي أصدقاء بعد. تصفح الدليل في الأسفل وأضف زملاء دراسة!" 
                        : "No friends added to your circle yet. Add classmates below!"}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "200px", overflowY: "auto" }} className="custom-scrollbar">
                      {allUsers
                        .filter((u: any) => userProfile?.friends?.includes(u.userId))
                        .map((friend: any) => (
                          <div
                            key={friend.userId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.6rem 0.85rem",
                              borderRadius: "var(--border-radius-sm)",
                              background: "rgba(255,255,255,0.6)",
                              border: "1px solid var(--card-border)",
                              boxShadow: "var(--shadow-sm)"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {renderAvatar(friend.avatar, "1.5rem")}
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <strong style={{ fontSize: "0.9rem", color: "var(--foreground)" }}>{friend.name}</strong>
                                <span style={{ fontSize: "0.7rem", color: "#6a7c88" }}>{friend.email}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setChatRecipient(friend);
                                  fetchChatMessages(friend.userId);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                              >
                                <FiMessageSquare />
                                <span>{language === "ar" ? "دردشة" : "Chat"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleFriend(friend)}
                                style={{ background: "rgba(211, 47, 47, 0.08)", color: "#d32f2f", border: "1px solid rgba(211, 47, 47, 0.2)", padding: "0.35rem 0.65rem", borderRadius: "var(--border-radius-sm)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 700 }}
                              >
                                {language === "ar" ? "حذف" : "Remove"}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </section>

                {/* Directory */}
                <section className="panel-card" style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h2 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.3)", paddingBottom: "0.5rem", fontWeight: 800 }}>
                    <FiUsers style={{ color: "var(--primary)" }} />
                    <span>{language === "ar" ? "دليل مستخدمي المنصة" : "Discover Members & Directory"}</span>
                  </h2>

                  {/* Search bar */}
                  <div style={{ position: "relative", marginBottom: "1rem" }}>
                    <input
                      type="text"
                      value={directorySearch}
                      onChange={(e) => setDirectorySearch(e.target.value)}
                      placeholder={language === "ar" ? "ابحث عن مستخدمين بالاسم، البريد أو الدور..." : "Search by name, email, or role..."}
                      style={{
                        width: "100%",
                        padding: "0.6rem 1rem",
                        borderRadius: "var(--border-radius-sm)",
                        border: "1px solid var(--card-border)",
                        outline: "none",
                        fontFamily: "var(--font-sans)",
                        background: "#ffffff",
                        fontSize: "0.85rem"
                      }}
                    />
                  </div>

                  {loadingAllUsers ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "2rem", gap: "0.5rem", color: "#6a7c88" }}>
                      <FiRefreshCw className="spinning-icon" />
                      <span>{language === "ar" ? "جاري تحميل الدليل..." : "Loading directory list..."}</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "280px", overflowY: "auto" }} className="custom-scrollbar">
                      {allUsers
                        .filter((u: any) => u.userId !== user?.uid) // Exclude current user
                        .filter((u: any) => {
                          const s = directorySearch.toLowerCase();
                          return (
                            (u.name || "").toLowerCase().includes(s) ||
                            (u.email || "").toLowerCase().includes(s) ||
                            (u.userType || u.role || "").toLowerCase().includes(s) ||
                            (u.country || "").toLowerCase().includes(s)
                          );
                        })
                        .map((dirUser: any) => {
                          const isFriend = userProfile?.friends?.includes(dirUser.userId);
                          
                          // Custom styling for role badge
                          let badgeBg = "rgba(16, 107, 163, 0.08)";
                          let badgeColor = "var(--primary)";
                          let roleName = dirUser.userType || dirUser.role || "student";
                          if (roleName === "admin") {
                            badgeBg = "rgba(198, 40, 40, 0.08)";
                            badgeColor = "#c62828";
                          } else if (roleName === "teacher") {
                            badgeBg = "rgba(245, 194, 66, 0.1)";
                            badgeColor = "var(--secondary-hover)";
                          } else if (roleName === "parent") {
                            badgeBg = "rgba(46, 125, 50, 0.08)";
                            badgeColor = "var(--accent-green)";
                          }

                          return (
                            <div
                              key={dirUser.userId}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "0.6rem 0.85rem",
                                borderRadius: "var(--border-radius-sm)",
                                background: "rgba(255,255,255,0.45)",
                                border: "1px solid var(--card-border)",
                                boxShadow: "var(--shadow-sm)",
                                transition: "all 0.2s ease"
                              }}
                              className="directory-item"
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                {renderAvatar(dirUser.avatar, "1.8rem")}
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                    <strong style={{ fontSize: "0.85rem", color: "var(--foreground)" }}>{dirUser.name}</strong>
                                    <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "8px", background: badgeBg, color: badgeColor, fontWeight: 700, textTransform: "capitalize" }}>
                                      {roleName === "student" ? (language === "ar" ? "طالب" : "Student") :
                                       roleName === "teacher" ? (language === "ar" ? "معلم" : "Teacher") :
                                       roleName === "parent" ? (language === "ar" ? "ولي أمر" : "Parent") :
                                       (language === "ar" ? "مشرف" : "Admin")}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: "0.7rem", color: "#6a7c88" }}>{dirUser.email}</span>
                                  {dirUser.school && (
                                    <span style={{ fontSize: "0.68rem", color: "var(--primary)" }}>🏫 {dirUser.school}</span>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: "0.35rem" }}>
                                {/* Profile Link */}
                                <a
                                  href={`/${language}/profile/${dirUser.username || dirUser.userId}`}
                                  className="btn btn-secondary"
                                  style={{ padding: "0.35rem 0.55rem", fontSize: "0.7rem", display: "flex", alignItems: "center", textDecoration: "none" }}
                                >
                                  <FiUser />
                                </a>

                                {/* Add/Remove Friend */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleFriend(dirUser)}
                                  className={isFriend ? "btn btn-secondary" : "btn btn-primary"}
                                  style={{ padding: "0.35rem 0.65rem", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                                >
                                  {isFriend ? (
                                    <>
                                      <FiUserMinus />
                                      <span>{language === "ar" ? "حذف" : "Remove"}</span>
                                    </>
                                  ) : (
                                    <>
                                      <FiUserPlus />
                                      <span>{language === "ar" ? "صديق" : "Add Friend"}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </section>
              </div>

            </div>
          </div>
        ) : activeTab === "settings" ? (
          /* Preferences & Privacy panel */
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <section className="panel-card" style={{ padding: "2rem" }}>
              <h2 style={{ fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "0.6rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "1rem", marginBottom: "1.5rem", fontWeight: 800 }}>
                <FiSettings style={{ color: "var(--primary)" }} />
                <span>{language === "ar" ? "مركز الحساب والخصوصية" : "Account & Privacy Center"}</span>
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }} className="grid-cols-2">
                {/* School Preferences */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>
                    {language === "ar" ? "المدرسة أو المؤسسة التعليمية" : "School or Educational Institution"}
                  </label>
                  <input
                    type="text"
                    value={preferencesSchool}
                    onChange={(e) => setPreferencesSchool(e.target.value)}
                    placeholder={language === "ar" ? "أدخل اسم مدرستك" : "Enter your school name"}
                    style={{
                      padding: "0.85rem 1.1rem",
                      borderRadius: "var(--border-radius-md)",
                      border: "1px solid var(--card-border)",
                      outline: "none",
                      fontFamily: "var(--font-sans)",
                      background: "#ffffff",
                      fontSize: "0.95rem",
                      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                    onBlur={(e) => e.target.style.borderColor = "var(--card-border)"}
                  />
                </div>

                {/* Profile Visibility */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>
                    {language === "ar" ? "ظهور الملف الشخصي" : "Profile Visibility"}
                  </label>
                  <select
                    value={privacyVisibility}
                    onChange={(e: any) => setPrivacyVisibility(e.target.value)}
                    style={{
                      padding: "0.85rem 1.1rem",
                      borderRadius: "var(--border-radius-md)",
                      border: "1px solid var(--card-border)",
                      outline: "none",
                      fontFamily: "var(--font-sans)",
                      background: "#ffffff",
                      fontSize: "0.95rem",
                      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                      transition: "border-color 0.2s ease"
                    }}
                  >
                    <option value="public">{language === "ar" ? "عام (الجميع يمكنه رؤية ملفك)" : "Public (Visible to everyone)"}</option>
                    <option value="friends">{language === "ar" ? "الأصدقاء فقط" : "Friends Only"}</option>
                    <option value="private">{language === "ar" ? "خاص (مخفي من الدليل)" : "Private (Hidden from directory)"}</option>
                  </select>
                </div>
              </div>

              {/* Toggles & Privacy Settings */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", background: "rgba(255, 255, 255, 0.4)", border: "1px solid rgba(235, 220, 185, 0.25)", borderRadius: "var(--border-radius-md)", padding: "1.5rem", marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 700 }}>{language === "ar" ? "خيارات الخصوصية والتحكم" : "Privacy & Connection Preferences"}</h3>
                
                {/* Messages Switch */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{language === "ar" ? "مراسلات مباشرة" : "Allow Direct Messages"}</span>
                    <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>{language === "ar" ? "السماح للمستخدمين الآخرين بإرسال رسائل مباشرة إليك" : "Let other active members message you directly"}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacyAllowMessages}
                    onChange={(e) => setPrivacyAllowMessages(e.target.checked)}
                    style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "var(--primary)" }}
                  />
                </div>

                <div style={{ width: "100%", height: "1px", background: "rgba(235, 220, 185, 0.3)" }}></div>

                {/* Show Activity Switch */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{language === "ar" ? "عرض سجل الأنشطة" : "Show Activity Timeline"}</span>
                    <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>{language === "ar" ? "إظهار سجل أنشطتك واستعلامات الذكاء الاصطناعي في صفحتك العامة" : "Display your study session history and AI interactions on your profile"}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacyShowActivity}
                    onChange={(e) => setPrivacyShowActivity(e.target.checked)}
                    style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "var(--primary)" }}
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleUpdatePrivacySettings}
                className="btn btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minWidth: "160px" }}
              >
                <FiCheckCircle />
                <span>{language === "ar" ? "حفظ التغييرات" : "Save Settings"}</span>
              </button>
            </section>

            {/* Danger Zone */}
            <section className="panel-card" style={{ padding: "2rem", border: "1px solid rgba(211, 47, 47, 0.25)", background: "rgba(211, 47, 47, 0.03)", borderRadius: "var(--border-radius-md)" }}>
              <h2 style={{ fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "0.6rem", color: "#c62828", margin: "0 0 1rem 0", fontWeight: 800 }}>
                <FiAlertTriangle style={{ color: "#d32f2f" }} />
                <span>{language === "ar" ? "منطقة الخطر: حذف الحساب والبيانات (GDPR)" : "Danger Zone: GDPR Right to be Forgotten"}</span>
              </h2>
              <p style={{ fontSize: "0.9rem", color: "#5a6a75", lineHeight: "1.6", marginBottom: "1.5rem" }}>
                {language === "ar"
                  ? "بموجب المادة 17 من اللائحة العامة لحماية البيانات (GDPR)، يحق لك طلب حذف حسابك نهائياً من النظام. الضغط على الزر أدناه سيقوم بمسح كامل لملفك الشخصي، وسجلات الدردشة والرسائل المباشرة، وسجل الأنشطة بالكامل، وإحصاءات استهلاك الرموز (Tokens) من خوادمنا بشكل نهائي وغير قابل للاسترجاع."
                  : "Under Article 17 of the General Data Protection Regulation (GDPR), you hold the right to erasure. Triggering the process below immediately deletes your user profile, chat history, direct messages, study logs, and token telemetry from our MongoDB servers permanently. This action is absolutely irreversible."}
              </p>
              <button
                type="button"
                onClick={handleDeleteUserAccount}
                style={{
                  background: "#d32f2f",
                  color: "#ffffff",
                  border: "none",
                  padding: "0.85rem 1.5rem",
                  borderRadius: "var(--border-radius-md)",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "background 0.2s ease, transform 0.1s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#c62828"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#d32f2f"}
              >
                <FiTrash2 />
                <span>{language === "ar" ? "حذف حسابي وكافة بياناتي نهائياً" : "Permanently Erase My Account"}</span>
              </button>
            </section>
          </div>
        ) : null}

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
