"use client";

import { useState, useRef, useEffect } from "react";
import { auth, db } from "../../../lib/firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, User, linkWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
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
  FiYoutube,
  FiInstagram,
  FiFacebook,
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
  FiX,
  FiMenu
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

const extractActualName = (rawInput: string): string => {
  let cleaned = rawInput.trim();
  
  // English patterns
  const englishPatterns = [
    /^(?:hey|hi|hello|dear)?\s*,?\s*my\s+name\s+is\s+/i,
    /^(?:hey|hi|hello|dear)?\s*,?\s*my\s+name's\s+/i,
    /^(?:hey|hi|hello|dear)?\s*,?\s*i\s+am\s+/i,
    /^(?:hey|hi|hello|dear)?\s*,?\s*i'm\s+/i,
    /^(?:hey|hi|hello|dear)?\s*,?\s*call\s+me\s+/i,
    /^(?:hey|hi|hello|dear)?\s*,?\s*this\s+is\s+/i
  ];

  // Arabic patterns
  const arabicPatterns = [
    /^(?:مرحبا|مرحباً|أهلاً|اهلا|يا هلا)?\s*,?\s*اسمي\s+هو\s+/i,
    /^(?:مرحبا|مرحباً|أهلاً|اهلا|يا هلا)?\s*,?\s*اسمي\s+/i,
    /^(?:مرحبا|مرحباً|أهلاً|اهلا|يا هلا)?\s*,?\s*أنا\s+/i,
    /^(?:مرحبا|مرحباً|أهلاً|اهلا|يا هلا)?\s*,?\s*انا\s+/i,
    /^(?:مرحبا|مرحباً|أهلاً|اهلا|يا هلا)?\s*,?\s*يدعونني\s+/i,
    /^(?:مرحبا|مرحباً|أهلاً|اهلا|يا هلا)?\s*,?\s*نادني\s+بـ\s*/i,
    /^(?:مرحبا|مرحباً|أهلاً|اهلا|يا هلا)?\s*,?\s*نادني\s+/i,
    /^(?:مرحبا|مرحباً|أهلاً|اهلا|يا هلا)?\s*,?\s*معكم\s+/i,
    /^(?:مرحبا|مرحباً|أهلاً|اهلا|يا هلا)?\s*,?\s*معك\s+/i
  ];

  let matched = true;
  while (matched) {
    matched = false;
    for (const regex of [...englishPatterns, ...arabicPatterns]) {
      if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, "").trim();
        matched = true;
        break;
      }
    }
  }

  // Remove any trailing or leading punctuation like periods, exclamation marks, etc.
  cleaned = cleaned.replace(/^[\s,.\-!?;:]+|[\s,.\-!?;:]+$/g, "").trim();

  return cleaned || rawInput.trim();
};

const extractAgeNumber = (rawInput: string): number => {
  // Convert any Arabic/Indic digits to standard English digits
  let cleaned = rawInput.trim()
    .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776));
  
  // Find any sequence of digits in the string
  const match = cleaned.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10);
  }
  return NaN;
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
  const [localCompleted, setLocalCompleted] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState<string>("phone");
  const [onboardingPhoneNumber, setOnboardingPhoneNumber] = useState("");
  const [onboardingVerificationCode, setOnboardingVerificationCode] = useState("");
  const [onboardingConfirmationResult, setOnboardingConfirmationResult] = useState<any>(null);
  const [onboardingSendingCode, setOnboardingSendingCode] = useState(false);
  const [onboardingVerifyingCode, setOnboardingVerifyingCode] = useState(false);
  const [onboardingRecaptchaVerifier, setOnboardingRecaptchaVerifier] = useState<any>(null);
  const [onboardingPhoneError, setOnboardingPhoneError] = useState("");
  const [onboardingTestMode, setOnboardingTestMode] = useState(false);
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
  const [ageError, setAgeError] = useState("");
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
  const [dynamicBooks, setDynamicBooks] = useState<any[]>([]);
  const [dynamicSubjects, setDynamicSubjects] = useState<any[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("subj_algebra_stats");
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [practiceSubject, setPracticeSubject] = useState("Math");
  const [generatedQuestion, setGeneratedQuestion] = useState<string>("");
  const [practiceAnswer, setPracticeAnswer] = useState<string>("");
  const [practiceResult, setPracticeResult] = useState<string>("");
  const [practiceLoading, setPracticeLoading] = useState<boolean>(false);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.id === "text-practice-input") {
        e.preventDefault();
        alert(language === "ar" 
          ? "تنبيه: تم تعطيل النسخ واللصق في مساحة التدريب لتشجيع الفهم النشط والكتابة الذاتية!" 
          : "Notice: Copy-pasting is disabled in the practice workstation to encourage active recall and typing your own answers!");
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [language]);

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
  const [typingUsers, setTypingUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !chatRecipient) {
      setTypingUsers([]);
      return;
    }

    const activeBoardId = user.uid < chatRecipient.userId 
      ? `${user.uid}_${chatRecipient.userId}` 
      : `${chatRecipient.userId}_${user.uid}`;

    const q = collection(db, "active_boards", activeBoardId, "typing");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.uid !== user.uid) {
          users.push(data);
        }
      });
      setTypingUsers(users);
    }, (error) => {
      console.error("Error listening to typing indicators:", error);
    });

    return () => {
      unsubscribe();
      try {
        const myTypingRef = doc(db, "active_boards", activeBoardId, "typing", user.uid);
        deleteDoc(myTypingRef);
      } catch (e) {
        console.error("Error cleaning up typing indicator:", e);
      }
    };
  }, [chatRecipient, user]);

  useEffect(() => {
    if (!user || !chatRecipient) return;

    const activeBoardId = user.uid < chatRecipient.userId 
      ? `${user.uid}_${chatRecipient.userId}` 
      : `${chatRecipient.userId}_${user.uid}`;

    const myTypingRef = doc(db, "active_boards", activeBoardId, "typing", user.uid);

    if (chatInput.trim()) {
      setDoc(myTypingRef, {
        uid: user.uid,
        name: userProfile?.name || user.email?.split("@")[0] || "Someone",
        isTyping: true,
        lastActive: new Date().toISOString()
      }).catch((err) => console.error("Error setting typing status:", err));
    } else {
      deleteDoc(myTypingRef).catch((err) => console.error("Error clearing typing status:", err));
    }
  }, [chatInput, chatRecipient, user, userProfile]);
  
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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
    { sender: "fahem", text: "For security verification, please start by entering your mobile phone number. We will send you a verification code via SMS to activate your account:" }
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

    const safeCountry = country || "";
    const isEgypt = safeCountry.toLowerCase().includes("egypt") || safeCountry.includes("مصر");
    
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

      if (onboardingUserType === "teacher") {
        list.push({
          sender: "fahem",
          text: isArabic
            ? "رائع جداً! لقد أكملنا البيانات الأساسية. الآن، اختر صورتك الرمزية المفضلة لملفك الشخصي من المكتبة المتنوعة أدناه:"
            : "Excellent! We have captured your core info. Now, select your preferred avatar from our diverse library below to complete onboarding:"
        });
        return list;
      }

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
    setOnboardingMessages(prev => {
      if (prev.length <= 2) {
        if (currentOnboardingStep === "phone") {
          return [
            {
              sender: "fahem",
              text: language === "ar"
                ? "مرحباً بك في منصة فاهم التعليمية! 🚀 أنا مرشدك الذكي، وسأساعدك في تهيئة حسابك الشخصي بخطوات بسيطة وممتعة تفاعلية."
                : "Welcome to Fahem Educational Platform! 🚀 I'm your AI guide, and I will help you set up your custom profile in a few simple and interactive steps."
            },
            {
              sender: "fahem",
              text: language === "ar"
                ? "لأسباب أمنية والتحقق من الهوية، يرجى البدء بالتحقق من رقم هاتفك المحمول لتفعيل الحساب:"
                : "For security verification, please start by verifying your mobile phone number to activate your account:"
            }
          ];
        } else {
          return [
            {
              sender: "fahem",
              text: language === "ar"
                ? "مرحباً بك في منصة فاهم التعليمية! 🚀 أنا مرشدك الذكي، وسأساعدك في تهيئة حسابك الشخصي بخطوات بسيطة وممتعة تفاعلية."
                : "Welcome to Fahem Educational Platform! 🚀 I'm your AI guide, and I will help you set up your custom profile in a few simple and interactive steps."
            },
            {
              sender: "fahem",
              text: language === "ar"
                ? "في البداية، ما هو دورك في منصتنا اليوم؟ (طالب، معلم، ولي أمر، أو مشرف)"
                : "To begin, what is your role on our platform today? (student, teacher, parent, or admin)"
            }
          ];
        }
      }
      return prev;
    });
  }, [language, currentOnboardingStep]);

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

  // Dynamic verifier cleanup for onboarding phone verification
  useEffect(() => {
    return () => {
      if (onboardingRecaptchaVerifier) {
        try {
          onboardingRecaptchaVerifier.clear();
        } catch (e) {
          console.warn("[reCAPTCHA] Cleanup failed:", e);
        }
      }
    };
  }, [onboardingRecaptchaVerifier]);

  // Phone verification methods for onboarding
  const setupOnboardingRecaptcha = (containerId: string) => {
    if (typeof window === "undefined") return null;
    try {
      const container = document.getElementById(containerId);
      if (!container) return null;
      container.innerHTML = '<div id="onboarding-recaptcha-widget"></div>';

      // Respect the user's test mode state on localhost/127.0.0.1
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        auth.settings.appVerificationDisabledForTesting = onboardingTestMode;
        console.log("[Firebase Auth] App verification disabled for testing on localhost?", onboardingTestMode);
      } else {
        auth.settings.appVerificationDisabledForTesting = false;
      }

      const verifier = new RecaptchaVerifier(auth, "onboarding-recaptcha-widget", {
        size: "normal",
        callback: (response: any) => {
          console.log("[reCAPTCHA] Onboarding resolved successfully");
        },
        "expired-callback": () => {
          console.log("[reCAPTCHA] Onboarding expired");
        }
      });
      return verifier;
    } catch (error) {
      console.error("[reCAPTCHA] Onboarding failed to initialize:", error);
      return null;
    }
  };

  const cleanupOnboardingRecaptcha = () => {
    if (onboardingRecaptchaVerifier) {
      try {
        onboardingRecaptchaVerifier.clear();
      } catch (e) {
        console.warn("[reCAPTCHA] Error clearing onboarding verifier:", e);
      }
      setOnboardingRecaptchaVerifier(null);
    }
  };

  const handleOnboardingSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingPhoneNumber.trim()) {
      setOnboardingPhoneError(language === "ar" ? "يرجى إدخال رقم الهاتف" : "Please enter a phone number");
      return;
    }
    setOnboardingSendingCode(true);
    setOnboardingPhoneError("");

    try {
      cleanupOnboardingRecaptcha();
      
      const verifier = setupOnboardingRecaptcha("onboarding-recaptcha-container");
      if (!verifier) {
        throw new Error(language === "ar" ? "فشل تهيئة reCAPTCHA" : "reCAPTCHA failed to initialize");
      }
      setOnboardingRecaptchaVerifier(verifier);
      
      await verifier.render();

      console.log("[Onboarding Phone] Attempting linkWithPhoneNumber for:", onboardingPhoneNumber);
      if (!auth.currentUser) {
        throw new Error(language === "ar" ? "لم يتم العثور على مستخدم تسجيل الدخول" : "No authenticated user found");
      }
      
      const confirmation = await linkWithPhoneNumber(auth.currentUser, onboardingPhoneNumber, verifier);
      setOnboardingConfirmationResult(confirmation);
      console.log("[Onboarding Phone] SMS sent successfully");
    } catch (error: any) {
      console.error("[Onboarding Phone] Error sending SMS:", error);
      setOnboardingPhoneError(error.message || (language === "ar" ? "فشل إرسال رمز التحقق" : "Failed to send verification code"));
      cleanupOnboardingRecaptcha();
    } finally {
      setOnboardingSendingCode(false);
    }
  };

  const handleOnboardingVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingVerificationCode.trim()) {
      setOnboardingPhoneError(language === "ar" ? "يرجى إدخال رمز التحقق" : "Please enter the verification code");
      return;
    }
    if (!onboardingConfirmationResult) {
      setOnboardingPhoneError(language === "ar" ? "انتهت صلاحية الجلسة، يرجى المحاولة مجدداً" : "Session expired, please try again");
      return;
    }
    setOnboardingVerifyingCode(true);
    setOnboardingPhoneError("");

    try {
      console.log("[Onboarding Phone] Verifying SMS code:", onboardingVerificationCode);
      const result = await onboardingConfirmationResult.confirm(onboardingVerificationCode);
      if (result.user) {
        console.log("[Onboarding Phone] Successfully linked phone:", result.user.phoneNumber);
        cleanupOnboardingRecaptcha();
        
        // Persist verified phone state in user profile in DB immediately
        const updatedProfile = {
          ...userProfile,
          phoneVerified: true,
          phone_verified: true,
          phoneNumber: result.user.phoneNumber || onboardingPhoneNumber
        };
        setUserProfile(updatedProfile);
        
        try {
          await fetch("/api/user/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user?.uid,
              profile: updatedProfile
            })
          });
          console.log("[Onboarding Phone] Profile phone_verified flag persisted in DB");
        } catch (dbErr) {
          console.error("Failed to save phone verification state to DB profile:", dbErr);
        }
        
        // Trigger conversational onboarding transition
        await sendOnboardingMessage("[SYSTEM] Phone number verified: " + onboardingPhoneNumber);
      }
    } catch (error: any) {
      console.error("[Onboarding Phone] Verification failed:", error);
      setOnboardingPhoneError(error.message || (language === "ar" ? "رمز التحقق غير صحيح" : "Verification code is incorrect"));
    } finally {
      setOnboardingVerifyingCode(false);
    }
  };

  const handleResetOnboardingPhoneAuth = () => {
    setOnboardingConfirmationResult(null);
    setOnboardingVerificationCode("");
    setOnboardingPhoneError("");
    cleanupOnboardingRecaptcha();
  };

  const placesSearchTimeoutRef = useRef<any>(null);
  const placesAbortControllerRef = useRef<AbortController | null>(null);
  const latestOnboardingStateRef = useRef<any>(null);

  // Google Places API integration helper
  const fetchPlaces = (query: string) => {
    if (placesSearchTimeoutRef.current) {
      clearTimeout(placesSearchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setPlacesResults([]);
      setSearchingPlaces(false);
      if (placesAbortControllerRef.current) {
        placesAbortControllerRef.current.abort();
        placesAbortControllerRef.current = null;
      }
      return;
    }

    setSearchingPlaces(true);

    placesSearchTimeoutRef.current = setTimeout(async () => {
      if (placesAbortControllerRef.current) {
        placesAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      placesAbortControllerRef.current = controller;

      try {
        const countryParam = onboardingCountry || "Egypt";
        const res = await fetch(
          `/api/places/search?query=${encodeURIComponent(query)}&country=${encodeURIComponent(countryParam)}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setPlacesResults(data.results || []);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Error searching places:", err);
        }
      } finally {
        if (placesAbortControllerRef.current === controller) {
          setSearchingPlaces(false);
          placesAbortControllerRef.current = null;
        }
      }
    }, 250);
  };

  const [onboardingInput, setOnboardingInput] = useState("");
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingStatusText, setOnboardingStatusText] = useState("");

  const sendOnboardingMessage = async (msgText: string) => {
    if (!msgText.trim() || !user) return;
    setOnboardingInput("");
    setOnboardingLoading(true);
    setOnboardingStatusText(language === "ar" ? "جاري الإرسال للذكاء الاصطناعي..." : "Sending to AI assistant...");

    // 1. Add user message to history
    setOnboardingMessages(prev => [...prev, { sender: "user", text: msgText }]);

    // 2. Prepare streaming placeholder message from the assistant
    setOnboardingMessages(prev => [...prev, { sender: "fahem", text: "" }]);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: msgText,
          language,
          userEmail: user.email || "",
          userId: user.uid,
          sessionId: `onboarding_session_${user.uid}`,
          onboarding: true
        }),
      });

      if (!response.body) {
        throw new Error("Streaming is not supported by the response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";
      let isFinalOutput = false;
      let buffer = "";

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        } else if (done) {
          buffer += decoder.decode();
        }

        let lineEndIndex;
        while ((lineEndIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.substring(0, lineEndIndex);
          buffer = buffer.substring(lineEndIndex + 1);

          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("[METADATA] state:")) {
            try {
              const jsonStr = trimmed.replace("[METADATA] state:", "").trim();
              const stateObj = JSON.parse(jsonStr);
              if (stateObj) {
                latestOnboardingStateRef.current = stateObj;
                if (stateObj.step) setCurrentOnboardingStep(stateObj.step);
                if (stateObj.role) setOnboardingUserType(stateObj.role);
                if (stateObj.country) setOnboardingCountry(stateObj.country);
                if (stateObj.name) setOnboardingName(stateObj.name);
                if (stateObj.username) setOnboardingUsername(stateObj.username);
                if (stateObj.age) setOnboardingAge(stateObj.age.toString());
                if (stateObj.grade) setOnboardingCustomGrade(stateObj.grade);
              }
            } catch (err) {
              console.error("Error parsing metadata state:", err);
            }
          }

          if (trimmed.startsWith("[METADATA]")) {
            continue;
          }
          if (trimmed.includes("=== Agent Final Output ===")) {
            isFinalOutput = true;
            continue;
          }
          if (trimmed.includes("==========================")) {
            isFinalOutput = false;
            continue;
          }
          if (trimmed.startsWith("[Fahem Agent]") || trimmed.startsWith("[SYSTEM]") || trimmed.startsWith("[ERROR]")) {
            setOnboardingStatusText(trimmed.replace("[Fahem Agent]", "").replace("[SYSTEM]", "").trim());
            continue;
          }

          if (isFinalOutput) {
            accumulatedText += line + "\n";
            setOnboardingMessages(prev => {
              const nextMsgs = [...prev];
              if (nextMsgs.length > 0) {
                nextMsgs[nextMsgs.length - 1] = { sender: "fahem", text: accumulatedText.trim() };
              }
              return nextMsgs;
            });
          } else {
            // Fallback for responses that aren't wrapped in Agent Final Output tags
            if (!trimmed.startsWith("[") && !trimmed.startsWith("=") && accumulatedText === "") {
              accumulatedText += line + "\n";
              setOnboardingMessages(prev => {
                const nextMsgs = [...prev];
                if (nextMsgs.length > 0) {
                  nextMsgs[nextMsgs.length - 1] = { sender: "fahem", text: accumulatedText.trim() };
                }
                return nextMsgs;
              });
            }
          }
        }
      }

      // Handle any leftover in buffer (no trailing newline)
      if (buffer.trim()) {
        const line = buffer;
        const trimmed = line.trim();
        if (trimmed.startsWith("[METADATA] state:")) {
          try {
            const jsonStr = trimmed.replace("[METADATA] state:", "").trim();
            const stateObj = JSON.parse(jsonStr);
            if (stateObj) {
              latestOnboardingStateRef.current = stateObj;
              if (stateObj.step) setCurrentOnboardingStep(stateObj.step);
              if (stateObj.role) setOnboardingUserType(stateObj.role);
              if (stateObj.country) setOnboardingCountry(stateObj.country);
              if (stateObj.name) setOnboardingName(stateObj.name);
              if (stateObj.username) setOnboardingUsername(stateObj.username);
              if (stateObj.age) setOnboardingAge(stateObj.age.toString());
              if (stateObj.grade) setOnboardingCustomGrade(stateObj.grade);
            }
          } catch (err) {
            console.error("Error parsing metadata state:", err);
          }
        }
        if (trimmed && !trimmed.startsWith("[METADATA]") && !trimmed.includes("=== Agent Final Output ===") && !trimmed.includes("==========================") && !trimmed.startsWith("[Fahem Agent]") && !trimmed.startsWith("[SYSTEM]") && !trimmed.startsWith("[ERROR]")) {
          if (isFinalOutput || accumulatedText === "") {
            accumulatedText += line;
            setOnboardingMessages(prev => {
              const nextMsgs = [...prev];
              if (nextMsgs.length > 0) {
                nextMsgs[nextMsgs.length - 1] = { sender: "fahem", text: accumulatedText.trim() };
              }
              return nextMsgs;
            });
          }
        }
      }

      // 3. Post-stream processing: check if the onboarding was completed successfully
      if (accumulatedText.includes("SUCCESS_ONBOARDING_COMPLETE")) {
        const cleanedText = accumulatedText.replace("SUCCESS_ONBOARDING_COMPLETE", "").trim();
        setOnboardingMessages(prev => {
          const nextMsgs = [...prev];
          if (nextMsgs.length > 0) {
            nextMsgs[nextMsgs.length - 1] = { sender: "fahem", text: cleanedText };
          }
          return nextMsgs;
        });

        setOnboardingStatusText(language === "ar" ? "✨ اكتمل الإعداد بنجاح! جاري تحميل المنصة..." : "✨ Onboarding complete! Loading dashboard...");

        setTimeout(async () => {
          setLoadingProfile(true);
          try {
            const res = await fetch(`/api/user/profile?userId=${encodeURIComponent(user.uid)}&email=${encodeURIComponent(user.email || "")}&t=${Date.now()}`, { cache: "no-store" });
            if (res.ok) {
              const data = await res.json();
              if (data.profile && data.profile.userId) {
                setUserProfile(data.profile);
                if (typeof window !== "undefined") {
                  localStorage.setItem("onboarding_completed_" + user.uid, "true");
                }
                await logActivity("onboarding_completed", "success", "Completed onboarding via conversational agent");
              }
            }
          } catch (err) {
            console.error("Error reloading profile on completion:", err);
          } finally {
            setLoadingProfile(false);
          }
        }, 2500);
      } else {
        setOnboardingStatusText("");
      }

    } catch (err: any) {
      console.error("Onboarding streaming failed:", err);
      setOnboardingStatusText("");
      setOnboardingMessages(prev => {
        const nextMsgs = [...prev];
        if (nextMsgs.length > 0) {
          nextMsgs[nextMsgs.length - 1] = { 
            sender: "fahem", 
            text: language === "ar" 
              ? "عذراً، واجهت مشكلة أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى." 
              : "Sorry, I encountered an issue connecting to the server. Please try again." 
          };
        }
        return nextMsgs;
      });
    } finally {
      setOnboardingLoading(false);
    }
  };

  const skipOnboarding = async () => {
    if (!user) return;
    setLoadingProfile(true);
    const emailPrefix = user.email ? user.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") : "";
    const usernameVal = emailPrefix.length >= 3 
      ? `${emailPrefix}_${Math.floor(100 + Math.random() * 900)}` 
      : `user_${user.uid.slice(0, 6)}`;

    const profileData = {
      userId: user.uid,
      username: usernameVal,
      email: user.email || "",
      name: user.displayName || user.email?.split("@")[0] || "User",
      age: 18,
      country: "Egypt",
      grade: "N/A",
      avatar: "🚀",
      school: "N/A",
      userType: "student",
      role: "student",
      onboardingCompleted: true,
      onboardingSkipped: true,
      isApproved: true,
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
        setUserProfile(profileData);
        if (typeof window !== "undefined") {
          localStorage.setItem("onboarding_completed_" + user.uid, "true");
        }
        await logActivity("onboarding_skipped", "success", "Skipped onboarding via chatbot interface");
      }
    } catch (err) {
      console.error("Error skipping onboarding:", err);
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

  const fetchBooksAndSubjects = async () => {
    setLoadingBooks(true);
    setLoadingSubjects(true);
    try {
      const subjectsRes = await fetch("/api/subjects", { cache: "no-store" });
      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        setDynamicSubjects(subjectsData.subjects || []);
      }
      
      const booksRes = await fetch("/api/books", { cache: "no-store" });
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setDynamicBooks(booksData.books || []);
      }
    } catch (err) {
      console.error("Failed to fetch books and subjects:", err);
    } finally {
      setLoadingBooks(false);
      setLoadingSubjects(false);
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
        fetchBooksAndSubjects(); // Fetch dynamic books and subjects from database
        
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

              if (data.profile.onboardingCompleted !== true) {
                // SMS Verification Logic Guard: if the user's phone is already verified in their profile,
                // bypass the phone verification step entirely and default to the next logical step ("role")
                const isPhoneVerified = data.profile.phoneVerified === true || data.profile.phone_verified === true;
                if (isPhoneVerified) {
                  setCurrentOnboardingStep("role");
                }

                // Fetch onboarding history
                fetch(`/api/history/detail?sessionId=onboarding_session_${currentUser.uid}`)
                  .then((res) => res.json())
                  .then((histData) => {
                    if (histData?.session?.messages && histData.session.messages.length > 0) {
                      const cleanAssistantMessage = (text: string): string => {
                        if (!text) return "";
                        return text
                          .split("\n")
                          .filter(line => !line.trim().startsWith("[METADATA]") && !line.includes("=== Agent Final Output ===") && !line.includes("=========================="))
                          .join("\n")
                          .replace("SUCCESS_ONBOARDING_COMPLETE", "")
                          .trim();
                      };

                      const msgs = histData.session.messages.map((m: any) => ({
                        sender: m.role === "user" ? "user" : "fahem",
                        text: m.role === "user" ? m.content : cleanAssistantMessage(m.content)
                      }));
                      setOnboardingMessages(msgs);

                      const assistantMsgs = histData.session.messages.filter((m: any) => m.role === "assistant" || m.role === "model");
                      if (assistantMsgs.length > 0) {
                        let lastStep = "role";
                        let lastRole = "student";
                        let lastCountry = "";
                        let lastName = "";
                        let lastUsername = "";
                        let lastAge = "";
                        let lastGrade = "";

                        for (const m of assistantMsgs) {
                          const lines = (m.content || "").split("\n");
                          for (const line of lines) {
                            const trimmed = line.trim();
                            if (trimmed.startsWith("[METADATA] state:")) {
                              try {
                                const jsonStr = trimmed.replace("[METADATA] state:", "").trim();
                                const stateObj = JSON.parse(jsonStr);
                                if (stateObj) {
                                  if (stateObj.step) lastStep = stateObj.step;
                                  if (stateObj.role) lastRole = stateObj.role;
                                  if (stateObj.country) lastCountry = stateObj.country;
                                  if (stateObj.name) lastName = stateObj.name;
                                  if (stateObj.username) lastUsername = stateObj.username;
                                  if (stateObj.age) lastAge = stateObj.age.toString();
                                  if (stateObj.grade) lastGrade = stateObj.grade;
                                }
                              } catch (e) {
                                console.error("Error parsing historical metadata:", e);
                              }
                            }
                          }
                        }

                        // Override loaded state step if phone is already verified
                        if (lastStep === "phone" && isPhoneVerified) {
                          lastStep = "role";
                        }

                        const loadedState = {
                          step: lastStep,
                          role: lastRole,
                          country: lastCountry,
                          name: lastName,
                          username: lastUsername,
                          age: lastAge,
                          grade: lastGrade
                        };
                        latestOnboardingStateRef.current = loadedState;
                        setCurrentOnboardingStep(lastStep);
                        setOnboardingUserType(lastRole as any);
                        setOnboardingCountry(lastCountry);
                        setOnboardingName(lastName);
                        setOnboardingUsername(lastUsername);
                        setOnboardingAge(lastAge);
                        setOnboardingCustomGrade(lastGrade);
                      }
                    }
                  })
                  .catch((histErr) => {
                    console.warn("Failed to load onboarding history on mount:", histErr);
                  });
              }
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
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", textAlign: "start", background: "#ffffff" }}>
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
      let buffer = "";

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        } else if (done) {
          buffer += decoder.decode();
        }

        let lineEndIndex;
        while ((lineEndIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.substring(0, lineEndIndex);
          buffer = buffer.substring(lineEndIndex + 1);

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
              continue; // Do NOT add metadata line to visible terminal logs
            }

            setLogs((prev) => [...prev, line]);
            if (!line.includes("[STDERR]") && !line.includes("[CLOSE]") && !line.includes("[Unknown]") && !line.includes("[Fahem Agent]") && !line.startsWith("[Sub-Agent:") && !line.startsWith("Loading local configuration") && !line.startsWith("Prompt:") && !line.startsWith("Starting Fahem") && !line.startsWith("Invoking agent")) {
              if (line !== "=== Agent Final Output === " && line !== "=== Agent Final Output ===" && line !== "==========================") {
                accumulatedResult += line + "\n";
              }
            }
          }
        }
      }

      // Handle any leftover in buffer (no trailing newline)
      if (buffer.trim()) {
        const line = buffer;
        const trimmedLine = line.trim();
        if (trimmedLine) {
          if (!trimmedLine.startsWith("[METADATA]")) {
            setLogs((prev) => [...prev, line]);
            if (!line.includes("[STDERR]") && !line.includes("[CLOSE]") && !line.includes("[Unknown]") && !line.includes("[Fahem Agent]") && !line.startsWith("[Sub-Agent:") && !line.startsWith("Loading local configuration") && !line.startsWith("Prompt:") && !line.startsWith("Starting Fahem") && !line.startsWith("Invoking agent")) {
              if (line !== "=== Agent Final Output === " && line !== "=== Agent Final Output ===" && line !== "==========================") {
                accumulatedResult += line + "\n";
              }
            }
          }
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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--background)", fontFamily: "var(--font-display)", position: "relative", overflow: "hidden" }}>
        {/* Animated ambient background spheres for visual consistency */}
        <div className="ambient-background" style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}>
          <div className="sphere sphere-1" style={{ top: "-10%", left: "-10%", background: "radial-gradient(circle, rgba(16,107,163,0.15) 0%, rgba(16,107,163,0) 70%)", width: "600px", height: "600px", position: "absolute", filter: "blur(80px)" }}></div>
          <div className="sphere sphere-2" style={{ bottom: "-10%", right: "-10%", background: "radial-gradient(circle, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0) 70%)", width: "600px", height: "600px", position: "absolute", filter: "blur(80px)" }}></div>
          <div className="sphere sphere-3" style={{ top: "40%", left: "40%", background: "radial-gradient(circle, rgba(243,123,29,0.1) 0%, rgba(243,123,29,0) 70%)", width: "500px", height: "500px", position: "absolute", filter: "blur(80px)" }}></div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", zIndex: 1, position: "relative" }}>
          {/* Concentric circular glassmorphic spinner */}
          <div className="loader-container">
            <div className="loader-ring loader-ring-outer"></div>
            <div className="loader-ring loader-ring-middle"></div>
            <div className="loader-ring loader-ring-inner"></div>
            <div className="loader-center">
              <FiCpu className="loader-cpu-icon" />
            </div>
          </div>
          <div className="loader-text-glow" style={{ fontSize: "1.2rem", color: "var(--primary)", fontWeight: 600, letterSpacing: "1px" }}>
            {language === "ar" ? "جاري التحميل..." : "Loading..."}
          </div>
        </div>
      </div>
    );
  }

  if (userProfile && userProfile.onboardingCompleted !== true && !localCompleted) {
    // Determine dynamic suggestions based on conversation content
    const getLastFahemMessage = () => {
      const fahemMsgs = onboardingMessages.filter(m => m.sender === "fahem");
      if (fahemMsgs.length === 0) return "";
      return fahemMsgs[fahemMsgs.length - 1].text;
    };

    const getQuickReplies = () => {
      const step = currentOnboardingStep ? currentOnboardingStep.trim().toLowerCase() : "";

      switch (step) {
        case "role":
          return [
            { label: language === "ar" ? "🎓 طالب علم" : "🎓 Student", value: "student" },
            { label: language === "ar" ? "🍎 معلم متميز" : "🍎 Teacher", value: "teacher" },
            { label: language === "ar" ? "👪 ولي أمر" : "👪 Parent", value: "parent" },
            { label: language === "ar" ? "🛡️ مشرف نظام" : "🛡️ Admin", value: "admin" }
          ];

        case "age":
          return [
            { label: "10", value: "10" },
            { label: "12", value: "12" },
            { label: "15", value: "15" },
            { label: "18", value: "18" },
            { label: "22", value: "22" }
          ];

        case "country":
          return [
            { label: language === "ar" ? "مصر 🇪🇬" : "Egypt 🇪🇬", value: "Egypt" },
            { label: language === "ar" ? "السعودية 🇸🇦" : "Saudi Arabia 🇸🇦", value: "Saudi Arabia" },
            { label: language === "ar" ? "الإمارات 🇦🇪" : "UAE 🇦🇪", value: "UAE" },
            { label: language === "ar" ? "قطر 🇶🇦" : "Qatar 🇶🇦", value: "Qatar" },
            { label: language === "ar" ? "الأردن 🇯🇴" : "Jordan 🇯🇴", value: "Jordan" }
          ];

        case "grade": {
          const isArabic = language === "ar";
          const age = latestOnboardingStateRef.current?.age?.toString() || onboardingAge;
          const country = latestOnboardingStateRef.current?.country || onboardingCountry;
          const proposed = getGradeSuggestion(age, country, isArabic);
          return [
            { 
              label: isArabic 
                ? `قبول المقترح: ${proposed} 👍` 
                : `Accept Recommendation: ${proposed} 👍`, 
              value: `Accept recommended grade: ${proposed}` 
            },
            { label: isArabic ? "متعلم مدى الحياة 🧠" : "Lifelong Learner 🧠", value: "Lifelong Learner" },
            { label: isArabic ? "تخطي هذه الخطوة ⏭️" : "Skip", value: "Skip" }
          ];
        }

        case "school":
          return [
            { label: language === "ar" ? "تخطي خطوة المدرسة ⏭️" : "Skip School Step ⏭️", value: "Skip" }
          ];

        case "children":
        case "childreninschool":
          return [
            { label: "1", value: "1" },
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4+", value: "4" }
          ];

        default: {
          // Fallback keyword parsing in case step is empty or laggy
          const lastText = getLastFahemMessage().toLowerCase();
          if (lastText.includes("role") || lastText.includes("user type") || lastText.includes("طالب") || lastText.includes("معلم") || lastText.includes("نوع حسابك")) {
            return [
              { label: language === "ar" ? "🎓 طالب علم" : "🎓 Student", value: "student" },
              { label: language === "ar" ? "🍎 معلم متميز" : "🍎 Teacher", value: "teacher" },
              { label: language === "ar" ? "👪 ولي أمر" : "👪 Parent", value: "parent" },
              { label: language === "ar" ? "🛡️ مشرف نظام" : "🛡️ Admin", value: "admin" }
            ];
          }
          if (lastText.includes("age") || lastText.includes("عمر") || lastText.includes("عاماً") || lastText.includes("سنة")) {
            return [
              { label: "12", value: "12" },
              { label: "15", value: "15" },
              { label: "18", value: "18" },
              { label: "25", value: "25" },
              { label: "35", value: "35" }
            ];
          }
          if (lastText.includes("country") || lastText.includes("بلد") || lastText.includes("إقامة") || lastText.includes("residing")) {
            return [
              { label: language === "ar" ? "مصر 🇪🇬" : "Egypt 🇪🇬", value: "Egypt" },
              { label: language === "ar" ? "السعودية 🇸🇦" : "Saudi Arabia 🇸🇦", value: "Saudi Arabia" },
              { label: language === "ar" ? "الإمارات 🇦🇪" : "UAE 🇦🇪", value: "UAE" }
            ];
          }
          if (lastText.includes("grade") || lastText.includes("صف") || lastText.includes("دراسي") || lastText.includes("مسار")) {
            return [
              { label: language === "ar" ? "تخطي هذه الخطوة ⏭️" : "Skip", value: "Skip" }
            ];
          }
          if (lastText.includes("school") || lastText.includes("مدرسة") || lastText.includes("جامعة") || lastText.includes("مؤسسة")) {
            return [
              { label: language === "ar" ? "تخطي خطوة المدرسة ⏭️" : "Skip School Step ⏭️", value: "Skip" }
            ];
          }
          return [];
        }
      }
    };

    const formatMessageText = (txt: string) => {
      if (!txt) return "";
      const lines = txt.split("\n");
      return lines.map((line, lineIdx) => {
        // Simple markdown parsing of **bold** and `code`
        const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
        const formattedLine = boldParts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i} style={{ color: "var(--primary)", fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
          }
          // Parse code blocks/inline code inside line
          const codeParts = part.split(/(`[^`]+`)/g);
          return codeParts.map((subPart, j) => {
            if (subPart.startsWith("`") && subPart.endsWith("`")) {
              return <code key={j} style={{ background: "rgba(16, 107, 163, 0.08)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.85em", color: "var(--primary)", border: "1px solid rgba(16, 107, 163, 0.15)", fontFamily: "monospace" }}>{subPart.slice(1, -1)}</code>;
            }
            return subPart;
          });
        });

        return (
          <p key={lineIdx} style={{ margin: "0 0 0.5rem 0", lineHeight: "1.6" }}>
            {formattedLine}
          </p>
        );
      });
    };

    const quickReplies = getQuickReplies();

    return (
      <div className="onboarding-overlay" style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
        background: "radial-gradient(circle at top right, rgba(212, 175, 55, 0.18), rgba(16, 107, 163, 0.12)), rgba(15, 23, 42, 0.82)",
        backdropFilter: "blur(16px)",
        display: "flex", justifyContent: "center", alignItems: "center", padding: "1.5rem",
        fontFamily: "var(--font-sans)", direction: language === "ar" ? "rtl" : "ltr"
      }}>
        {/* CSS Keyframes & animations injected cleanly */}
        <style>{`
          @keyframes onboarding-fade-in {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes onboarding-dot-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-7px); }
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.05); opacity: 0.8; }
            100% { transform: scale(0.95); opacity: 0.5; }
          }
          .onboarding-message {
            animation: onboarding-fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .onboarding-dot {
            width: 8px;
            height: 8px;
            background-color: var(--primary);
            border-radius: 50%;
            display: inline-block;
            margin: 0 2px;
            animation: onboarding-dot-bounce 1.4s infinite ease-in-out both;
          }
          .onboarding-dot:nth-child(1) { animation-delay: -0.32s; }
          .onboarding-dot:nth-child(2) { animation-delay: -0.16s; }
          .onboarding-dot:nth-child(3) { animation-delay: 0s; }
          
          .onboarding-chip {
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .onboarding-chip:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 14px rgba(16, 107, 163, 0.16);
            border-color: var(--primary) !important;
            background: rgba(16, 107, 163, 0.08) !important;
          }
          .onboarding-send-btn {
            transition: all 0.2s ease;
          }
          .onboarding-send-btn:hover:not(:disabled) {
            transform: scale(1.04);
            box-shadow: 0 4px 12px rgba(16, 107, 163, 0.2);
          }
          .custom-scroll-container::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scroll-container::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scroll-container::-webkit-scrollbar-thumb {
            background: rgba(16, 107, 163, 0.15);
            border-radius: 10px;
          }
          .custom-scroll-container::-webkit-scrollbar-thumb:hover {
            background: rgba(16, 107, 163, 0.3);
          }
          @keyframes typing-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          .typing-dot {
            animation: typing-bounce 1.4s infinite ease-in-out;
          }
        `}</style>

        <div style={{
          width: "100%", maxWidth: "820px", height: "85vh", maxHeight: "720px",
          background: "rgba(253, 251, 247, 0.88)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.45)", borderRadius: "24px",
          boxShadow: "0 30px 60px rgba(0, 0, 0, 0.18)", display: "flex", flexDirection: "column",
          overflow: "hidden"
        }}>
          {/* Header */}
          <div style={{
            padding: "1.25rem 2rem", borderBottom: "1px solid rgba(16, 107, 163, 0.08)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "linear-gradient(135deg, rgba(16, 107, 163, 0.06), rgba(212, 175, 55, 0.06))"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", padding: "0.5rem", borderRadius: "10px", color: "#ffffff", display: "flex", boxShadow: "0 4px 10px rgba(16, 107, 163, 0.25)" }}>
                <FiCpu className="pulse-icon" style={{ fontSize: "1.3rem" }} />
              </div>
              <div>
                <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--primary)", display: "block" }}>
                  {language === "ar" ? "مساعد فاهم الذكي للتسجيل" : "Fahem Intelligent Onboarding"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#6a7c88", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                  {language === "ar" ? "الذكاء الاصطناعي نشط" : "Conversational Setup (AI Active)"}
                </span>
              </div>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(16, 107, 163, 0.06)",
              border: "1px solid rgba(16, 107, 163, 0.15)",
              padding: "6px 14px",
              borderRadius: "20px",
              color: "var(--primary)",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
              transition: "all 0.2s"
            }}>
              <FiGlobe style={{ fontSize: "0.95rem" }} />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary)",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  outline: "none",
                  cursor: "pointer",
                  paddingRight: language === "ar" ? "0" : "4px",
                  paddingLeft: language === "ar" ? "4px" : "0",
                }}
              >
                <option value="en" style={{ color: "#111827", background: "#ffffff" }}>English</option>
                <option value="ar" style={{ color: "#111827", background: "#ffffff" }}>العربية</option>
                <option value="es" style={{ color: "#111827", background: "#ffffff" }}>Español</option>
                <option value="fr" style={{ color: "#111827", background: "#ffffff" }}>Français</option>
                <option value="de" style={{ color: "#111827", background: "#ffffff" }}>Deutsch</option>
                <option value="zh" style={{ color: "#111827", background: "#ffffff" }}>中文</option>
                <option value="it" style={{ color: "#111827", background: "#ffffff" }}>Italiano</option>
              </select>
            </div>
          </div>

          {/* Conversational Scroll Log */}
          <div 
            ref={onboardingScrollContainerRef}
            style={{
              flex: 1, overflowY: "auto", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem"
            }} className="custom-scroll-container">
            {onboardingMessages.map((msg, index) => {
              const isFahem = msg.sender === "fahem";
              // Skip rendering empty messages that might act as temporary stream holders
              if (!isFahem && !msg.text) return null;
              return (
                <div key={index} className="onboarding-message" style={{
                  display: "flex", gap: "0.85rem", alignSelf: isFahem ? "flex-start" : "flex-end",
                  flexDirection: isFahem ? "row" : "row-reverse", maxWidth: "80%"
                }}>
                  <div style={{
                    width: "38px", height: "36px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center",
                    background: isFahem ? "linear-gradient(135deg, var(--primary), var(--secondary))" : "rgba(212, 175, 55, 0.2)",
                    color: isFahem ? "#ffffff" : "var(--secondary-hover)", fontWeight: 700, fontSize: "1.2rem", flexShrink: 0,
                    boxShadow: isFahem ? "0 4px 8px rgba(16, 107, 163, 0.15)" : "none"
                  }}>
                    {isFahem ? "🤖" : "👤"}
                  </div>
                  <div style={{
                    padding: "1rem 1.25rem", borderRadius: "20px",
                    borderTopLeftRadius: isFahem ? "4px" : "20px", borderTopRightRadius: isFahem ? "20px" : "4px",
                    background: isFahem ? "#ffffff" : "linear-gradient(135deg, var(--primary), rgba(16, 107, 163, 0.95))",
                    color: isFahem ? "var(--foreground)" : "#ffffff",
                    boxShadow: isFahem ? "0 4px 12px rgba(0, 0, 0, 0.02)" : "0 4px 12px rgba(16, 107, 163, 0.15)",
                    border: isFahem ? "1px solid rgba(16, 107, 163, 0.08)" : "none",
                    lineHeight: "1.6", fontSize: "0.98rem"
                  }}>
                    {isFahem ? formatMessageText(msg.text) : msg.text}
                  </div>
                </div>
              );
            })}

            {/* Custom Phone Verification Card */}
            {currentOnboardingStep === "phone" && (
              <div className="onboarding-message" style={{
                alignSelf: "flex-start",
                marginLeft: "2.85rem",
                marginRight: language === "ar" ? "2.85rem" : "0",
                maxWidth: "460px",
                width: "calc(100% - 2.85rem)",
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px)",
                border: "1.5px solid rgba(16, 107, 163, 0.18)",
                borderRadius: "20px",
                boxShadow: "0 12px 30px rgba(16, 107, 163, 0.08)",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                boxSizing: "border-box"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "1.3rem" }}>📱</span>
                  <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "1.05rem" }}>
                    {language === "ar" ? "التحقق من رقم الهاتف المحمول" : "Mobile Phone Verification"}
                  </span>
                </div>

                {!onboardingConfirmationResult ? (
                  <form onSubmit={handleOnboardingSendCode} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#6a7c88" }}>
                        {language === "ar" ? "رقم الهاتف (مع رمز الدولة، مثلاً: 201xxxxxxxxx+)" : "Phone Number (with country code, e.g., +201xxxxxxxxx)"}
                      </label>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          type="tel"
                          value={onboardingPhoneNumber}
                          onChange={(e) => setOnboardingPhoneNumber(e.target.value)}
                          placeholder="+201234567890"
                          disabled={onboardingSendingCode}
                          style={{
                            flex: 1,
                            padding: "0.75rem 1rem",
                            border: "1px solid rgba(16, 107, 163, 0.2)",
                            borderRadius: "12px",
                            fontSize: "0.95rem",
                            outline: "none",
                            transition: "all 0.2s"
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                          onBlur={(e) => e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.2)"}
                        />
                        <button
                          type="submit"
                          disabled={onboardingSendingCode || !onboardingPhoneNumber.trim()}
                          style={{
                            padding: "0.75rem 1.25rem",
                            borderRadius: "12px",
                            border: "none",
                            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                            color: "#ffffff",
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            opacity: (onboardingSendingCode || !onboardingPhoneNumber.trim()) ? 0.6 : 1
                          }}
                        >
                          {onboardingSendingCode ? (
                            <span>{language === "ar" ? "جاري..." : "Sending..."}</span>
                          ) : (
                            <span>{language === "ar" ? "أرسل الرمز" : "Send SMS"}</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleOnboardingVerifyCode} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#6a7c88" }}>
                        {language === "ar" 
                          ? `أدخل رمز التحقق المكون من 6 أرقام المرسل إلى ${onboardingPhoneNumber}:` 
                          : `Enter the 6-digit verification code sent to ${onboardingPhoneNumber}:`}
                      </label>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          type="text"
                          maxLength={6}
                          value={onboardingVerificationCode}
                          onChange={(e) => setOnboardingVerificationCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="123456"
                          disabled={onboardingVerifyingCode}
                          style={{
                            flex: 1,
                            padding: "0.75rem 1rem",
                            border: "1px solid rgba(16, 107, 163, 0.2)",
                            borderRadius: "12px",
                            fontSize: "1.1rem",
                            letterSpacing: "0.2em",
                            textAlign: "center",
                            outline: "none",
                            transition: "all 0.2s"
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                          onBlur={(e) => e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.2)"}
                        />
                        <button
                          type="submit"
                          disabled={onboardingVerifyingCode || onboardingVerificationCode.length !== 6}
                          style={{
                            padding: "0.75rem 1.25rem",
                            borderRadius: "12px",
                            border: "none",
                            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                            color: "#ffffff",
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            opacity: (onboardingVerifyingCode || onboardingVerificationCode.length !== 6) ? 0.6 : 1
                          }}
                        >
                          {onboardingVerifyingCode ? (
                            <span>{language === "ar" ? "جاري..." : "Verifying..."}</span>
                          ) : (
                            <span>{language === "ar" ? "تحقق" : "Verify Code"}</span>
                          )}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={handleResetOnboardingPhoneAuth}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary)",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          textDecoration: "underline"
                        }}
                      >
                        {language === "ar" ? "تغيير رقم الهاتف أو إعادة الإرسال" : "Change phone number / Resend SMS"}
                      </button>
                    </div>
                  </form>
                )}

                <div id="onboarding-recaptcha-container" style={{ margin: "0.2rem 0", display: "flex", justifyContent: "center" }}></div>

                {/* Developer Test Mode Toggle (only visible on localhost) */}
                {(typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) && (
                  <div style={{
                    margin: "0.5rem 0",
                    padding: "0.85rem",
                    borderRadius: "14px",
                    background: "rgba(16, 107, 163, 0.05)",
                    border: "1px dashed rgba(16, 107, 163, 0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: "5px" }}>
                        🛠️ {language === "ar" ? "وضع الاختبار للمطورين" : "Developer Test Mode"}
                      </span>
                      <label style={{ position: "relative", display: "inline-block", width: "44px", height: "22px" }}>
                        <input 
                          type="checkbox" 
                          checked={onboardingTestMode}
                          onChange={(e) => {
                            setOnboardingTestMode(e.target.checked);
                            // Clear any current error when toggling
                            setOnboardingPhoneError("");
                          }}
                          style={{ opacity: 0, width: 0, height: 0 }} 
                        />
                        <span style={{
                          position: "absolute",
                          cursor: "pointer",
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: onboardingTestMode ? "var(--primary)" : "rgba(16, 107, 163, 0.15)",
                          transition: "0.3s",
                          borderRadius: "22px"
                        }}>
                          <span style={{
                            position: "absolute",
                            content: "''",
                            height: "16px", width: "16px",
                            left: onboardingTestMode ? "24px" : "3px",
                            bottom: "3px",
                            backgroundColor: "white",
                            transition: "0.3s",
                            borderRadius: "50%"
                          }} />
                        </span>
                      </label>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "#6a7c88", lineHeight: "1.3" }}>
                      {onboardingTestMode ? (
                        language === "ar" 
                          ? "💡 مفعّل: لتخطي التحقق البشري (reCAPTCHA). استخدم رقم هاتف وهمي مسجل في كونسول Firebase (مثال: 3434-555-650-1+) مع الرمز 654321."
                          : "💡 Enabled: Bypasses reCAPTCHA. Must use a whitelisted fictional phone number from your Firebase Console (e.g., +16505553434) with mock code 654321."
                      ) : (
                        language === "ar"
                          ? "💡 معطّل: لتجربة إرسال رسائل SMS حقيقية إلى هاتفك. يتطلب حل كابتشا reCAPTCHA."
                          : "💡 Disabled: Sends real SMS verification codes to your physical phone. Requires solving the reCAPTCHA below."
                      )}
                    </p>
                  </div>
                )}

                {onboardingPhoneError && (
                  <div style={{
                    color: "#dc2626",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    background: "rgba(220, 38, 38, 0.05)",
                    border: "1px solid rgba(220, 38, 38, 0.1)",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <span>⚠️ {onboardingPhoneError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Bouncing Dots Loading Bubble */}
            {onboardingLoading && onboardingMessages[onboardingMessages.length - 1]?.text === "" && (
              <div className="onboarding-message" style={{
                display: "flex", gap: "0.85rem", alignSelf: "flex-start", maxWidth: "80%"
              }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center",
                  background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                  color: "#ffffff", fontWeight: 700, fontSize: "1.2rem", flexShrink: 0,
                  boxShadow: "0 4px 8px rgba(16, 107, 163, 0.15)"
                }}>
                  🤖
                </div>
                <div style={{
                  padding: "1rem 1.25rem", borderRadius: "20px",
                  borderTopLeftRadius: "4px", borderTopRightRadius: "20px",
                  background: "#ffffff",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02)",
                  border: "1px solid rgba(16, 107, 163, 0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "4px"
                }}>
                  <div className="onboarding-dot"></div>
                  <div className="onboarding-dot"></div>
                  <div className="onboarding-dot"></div>
                </div>
              </div>
            )}

            {/* Realtime Streaming Engine Status message */}
            {onboardingStatusText && (
              <div style={{
                alignSelf: "center",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(16, 107, 163, 0.05)",
                border: "1px solid rgba(16, 107, 163, 0.08)",
                padding: "6px 14px",
                borderRadius: "20px",
                color: "var(--primary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                marginTop: "0.5rem"
              }}>
                <FiServer className="pulse-icon" style={{ fontSize: "0.9rem", color: "var(--primary)", animation: "pulse-ring 2s infinite" }} />
                <span>{onboardingStatusText}</span>
              </div>
            )}

            <div ref={onboardingEndRef} />
          </div>

          {/* Interactive Footer & Input Section */}
          <div style={{
            padding: "1.5rem 2rem", borderTop: "1px solid rgba(16, 107, 163, 0.08)",
            background: "rgba(255, 255, 255, 0.6)", display: "flex", flexDirection: "column", gap: "1rem"
          }}>
            {currentOnboardingStep === "avatar" ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                padding: "1.25rem 1.5rem",
                background: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(12px)",
                borderRadius: "20px",
                border: "1px solid rgba(16, 107, 163, 0.12)",
                boxShadow: "0 12px 30px rgba(16, 107, 163, 0.06)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "1rem" }}>
                    {language === "ar" ? "🎨 اختر صورتك الرمزية المفضلة لتكتمل الهوية:" : "🎨 Select your preferred avatar to complete profile:"}
                  </span>
                  <div style={{ display: "flex", gap: "0.25rem", background: "rgba(16, 107, 163, 0.06)", padding: "4px", borderRadius: "12px" }}>
                    {(["vectors", "animals", "tech", "golden"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setAvatarTab(tab)}
                        type="button"
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                          background: avatarTab === tab ? "#ffffff" : "transparent",
                          color: avatarTab === tab ? "var(--primary)" : "#6a7c88",
                          boxShadow: avatarTab === tab ? "0 2px 8px rgba(0, 0, 0, 0.05)" : "none",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {tab === "vectors" && (language === "ar" ? "متجهة" : "Vectors")}
                        {tab === "animals" && (language === "ar" ? "حيوانات" : "Animals")}
                        {tab === "tech" && (language === "ar" ? "تقنية" : "Tech")}
                        {tab === "golden" && (language === "ar" ? "ذهبية" : "Premium")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))",
                  gap: "0.85rem",
                  maxHeight: "160px",
                  overflowY: "auto",
                  padding: "0.5rem",
                  background: "rgba(255, 255, 255, 0.5)",
                  borderRadius: "16px",
                  border: "1px solid rgba(16, 107, 163, 0.05)"
                }} className="custom-scroll-container">
                  {avatarCategories[avatarTab].map((item, idx) => {
                    const isSelected = onboardingAvatar === item.e;
                    return (
                      <button
                        key={idx}
                        onClick={() => setOnboardingAvatar(item.e)}
                        type="button"
                        style={{
                          aspectRatio: "1/1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "50%",
                          background: isSelected 
                            ? "linear-gradient(135deg, rgba(16, 107, 163, 0.12), rgba(212, 175, 55, 0.22))"
                            : "#ffffff",
                          border: isSelected 
                            ? "3px solid var(--secondary)" 
                            : "2px solid rgba(16, 107, 163, 0.08)",
                          cursor: "pointer",
                          fontSize: "1.8rem",
                          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: isSelected 
                            ? "0 0 15px rgba(212, 175, 55, 0.5), inset 0 2px 4px rgba(0,0,0,0.05)" 
                            : "0 4px 8px rgba(0, 0, 0, 0.02)",
                          transform: isSelected ? "scale(1.08)" : "scale(1)"
                        }}
                        onMouseOver={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.transform = "scale(1.1)";
                            e.currentTarget.style.borderColor = "var(--primary)";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.08)";
                          }
                        }}
                        title={language === "ar" ? item.lAr : item.lEn}
                      >
                        {item.e.startsWith("/") ? (
                          <img src={item.e} alt={item.lEn} style={{ width: "42px", height: "42px", objectFit: "contain" }} />
                        ) : (
                          item.e
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Avatar Action Section */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "54px",
                      height: "54px",
                      borderRadius: "50%",
                      background: "rgba(16, 107, 163, 0.08)",
                      border: "2px solid var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.8rem",
                      overflow: "hidden"
                    }}>
                      {onboardingAvatar ? (
                        onboardingAvatar.startsWith("/") ? (
                          <img src={onboardingAvatar} alt="Selected" style={{ width: "38px", height: "38px", objectFit: "contain" }} />
                        ) : (
                          onboardingAvatar
                        )
                      ) : (
                        "🚀"
                      )}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--primary)", display: "block" }}>
                        {language === "ar" ? "الرمز المختار" : "Chosen Avatar"}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                        {onboardingAvatar 
                          ? (language === "ar" 
                              ? (avatarCategories[avatarTab].find(a => a.e === onboardingAvatar)?.lAr || "مخصص")
                              : (avatarCategories[avatarTab].find(a => a.e === onboardingAvatar)?.lEn || "Custom"))
                          : (language === "ar" ? "يرجى تحديد رمز للمتابعة" : "Please select to continue")
                        }
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <label style={{ padding: "0.85rem 1.25rem", fontSize: "0.9rem", fontWeight: 700, borderRadius: "14px", border: "1px solid rgba(212, 175, 55, 0.2)", background: "linear-gradient(135deg, rgba(16, 107, 163, 0.05), rgba(212, 175, 55, 0.05))", color: "var(--primary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem", transition: "all 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "none"; }}>
                      <span>📁 {language === "ar" ? "تحميل صورة شخصية" : "Upload Picture"}</span>
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert(language === "ar" ? "خطأ: حجم الصورة يتجاوز الحد الأقصى (2 ميجابايت)." : "Error: Avatar image size exceeds the strict 2MB validation limit.");
                            e.target.value = "";
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => { if (typeof reader.result === "string") setOnboardingAvatar(reader.result); };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                    <button
                      type="button"
                      onClick={() => sendOnboardingMessage("Skip")}
                      style={{
                        padding: "0.85rem 1.25rem",
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        borderRadius: "14px",
                        border: "1px solid rgba(16, 107, 163, 0.15)",
                        background: "#ffffff",
                        color: "var(--primary)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = "rgba(16, 107, 163, 0.05)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                    >
                      {language === "ar" ? "تخطي الخطوة ⏭️" : "Skip Step ⏭️"}
                    </button>
                    <button
                      type="button"
                      disabled={onboardingLoading}
                      onClick={() => {
                        const finalAvatar = onboardingAvatar || "/avatars/space_explorer.svg";
                        sendOnboardingMessage(finalAvatar);
                      }}
                      style={{
                        padding: "0.85rem 1.75rem",
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        borderRadius: "14px",
                        border: "none",
                        background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                        color: "#ffffff",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(16, 107, 163, 0.2)",
                        transition: "all 0.2s"
                      }}
                    >
                      {language === "ar" ? "تأكيد وإتمام التسجيل ✨" : "Confirm & Complete Onboarding ✨"}
                    </button>
                  </div>
                </div>
              </div>
            ) : currentOnboardingStep === "school" ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                width: "100%",
                position: "relative"
              }}>
                {/* Google Places live search instruction */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 0.5rem" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>📍</span>
                    {language === "ar" 
                      ? `البحث عن المدارس والجامعات في ${onboardingCountry || "مصر"} عبر خرائط جوجل`
                      : `Searching schools & universities in ${onboardingCountry || "Egypt"} via Google Places`}
                  </span>
                  {searchingPlaces && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="onboarding-dot" style={{ width: "6px", height: "6px", background: "var(--secondary)", margin: 0 }}></span>
                      <span style={{ fontSize: "0.75rem", color: "#6a7c88", fontWeight: 600 }}>
                        {language === "ar" ? "جاري البحث..." : "Searching..."}
                      </span>
                    </div>
                  )}
                </div>

                {/* Floating Google Places suggestions container */}
                {placesResults.length > 0 && (
                  <div style={{
                    position: "absolute",
                    bottom: "105%",
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    background: "rgba(255, 255, 255, 0.98)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(16, 107, 163, 0.15)",
                    borderRadius: "16px",
                    boxShadow: "0 -10px 30px rgba(0, 0, 0, 0.12), 0 10px 30px rgba(0,0,0,0.08)",
                    maxHeight: "220px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    padding: "0.5rem"
                  }} className="custom-scroll-container">
                    {placesResults.map((place, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          sendOnboardingMessage(place.name);
                          setPlacesResults([]);
                        }}
                        type="button"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.75rem 1rem",
                          borderRadius: "10px",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          textAlign: language === "ar" ? "right" : "left",
                          width: "100%",
                          transition: "all 0.15s ease",
                          direction: language === "ar" ? "rtl" : "ltr"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "rgba(16, 107, 163, 0.05)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span style={{ fontSize: "1.2rem" }}>
                          {place.type === "university" ? "🎓" : "🏫"}
                        </span>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-start", textAlign: "left", flex: 1 }}>
                          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>{place.name}</span>
                          <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>{place.address}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Input Search Form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (onboardingInput.trim() && !onboardingLoading) {
                      sendOnboardingMessage(onboardingInput);
                      setPlacesResults([]);
                    }
                  }}
                  style={{ display: "flex", gap: "0.75rem", width: "100%", alignItems: "center" }}
                >
                  <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type="text"
                      value={onboardingInput}
                      onChange={(e) => {
                        setOnboardingInput(e.target.value);
                        fetchPlaces(e.target.value);
                      }}
                      disabled={onboardingLoading}
                      placeholder={language === "ar" ? "اكتب اسم مدرستك أو ابحث بالخريطة..." : "Type your school name or search maps..."}
                      style={{
                        width: "100%", padding: "1rem 1.5rem", border: "1px solid rgba(16, 107, 163, 0.15)",
                        borderRadius: "16px", outline: "none", fontFamily: "var(--font-sans)",
                        fontSize: "0.98rem", background: "#ffffff",
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.01)",
                        transition: "border-color 0.2s ease"
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.15)"; }}
                      autoFocus
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sendOnboardingMessage("Skip");
                      setPlacesResults([]);
                    }}
                    style={{
                      padding: "0.95rem 1.25rem",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      borderRadius: "16px",
                      border: "1px solid rgba(16, 107, 163, 0.15)",
                      background: "#ffffff",
                      color: "var(--primary)",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = "rgba(16, 107, 163, 0.05)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                  >
                    {language === "ar" ? "تخطي ⏭️" : "Skip ⏭️"}
                  </button>

                  <button
                    type="submit"
                    disabled={!onboardingInput.trim() || onboardingLoading}
                    className="onboarding-send-btn btn btn-primary"
                    style={{
                      padding: "0.95rem 1.5rem", fontSize: "0.95rem", fontWeight: 700, borderRadius: "16px",
                      display: "flex", alignItems: "center", gap: "0.5rem", border: "none",
                      background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                      color: "#ffffff", cursor: "pointer"
                    }}
                  >
                    <span>{language === "ar" ? "إرسال" : "Send"}</span>
                    <FiSend style={{ fontSize: "1rem" }} />
                  </button>
                </form>
              </div>
            ) : currentOnboardingStep === "phone" ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                padding: "1.25rem", background: "rgba(16, 107, 163, 0.05)", border: "1px dashed rgba(16, 107, 163, 0.2)",
                borderRadius: "16px", color: "var(--primary)", fontWeight: 700, fontSize: "0.92rem",
                textAlign: "center"
              }}>
                <span>🔐 {language === "ar" ? "يرجى إكمال عملية التحقق من رقم الهاتف أعلاه للمتابعة..." : "Please complete phone verification above to proceed..."}</span>
              </div>
            ) : (
              <>
                {/* Quick Reply Chips Container */}
                {quickReplies.length > 0 && !onboardingLoading && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
                    {quickReplies.map((chip, chipIdx) => (
                      <button
                        key={chipIdx}
                        className="onboarding-chip"
                        onClick={() => sendOnboardingMessage(chip.value)}
                        type="button"
                        style={{
                          padding: "8px 16px", borderRadius: "30px", border: "1px solid rgba(16, 107, 163, 0.15)",
                          background: "#ffffff", color: "var(--primary)", fontSize: "0.88rem", fontWeight: 700,
                          cursor: "pointer", transition: "all 0.25s"
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Chat Input Box */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (onboardingInput.trim() && !onboardingLoading) {
                      sendOnboardingMessage(onboardingInput);
                    }
                  }}
                  style={{ display: "flex", gap: "0.75rem", width: "100%", alignItems: "center" }}
                >
                  <input
                    type="text"
                    value={onboardingInput}
                    onChange={(e) => setOnboardingInput(e.target.value)}
                    disabled={onboardingLoading}
                    placeholder={language === "ar" ? "اكتب إجابتك هنا وسلّمها للمساعد الذكي..." : "Type your response here and press send..."}
                    style={{
                      flex: 1, padding: "1rem 1.5rem", border: "1px solid rgba(16, 107, 163, 0.15)",
                      borderRadius: "16px", outline: "none", fontFamily: "var(--font-sans)",
                      fontSize: "0.98rem", background: "#ffffff",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.01)",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.15)"; }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!onboardingInput.trim() || onboardingLoading}
                    className="onboarding-send-btn btn btn-primary"
                    style={{
                      padding: "0.95rem 1.5rem", fontSize: "0.95rem", fontWeight: 700, borderRadius: "16px",
                      display: "flex", alignItems: "center", gap: "0.5rem", border: "none",
                      background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                      color: "#ffffff", cursor: "pointer"
                    }}
                  >
                    <span>{language === "ar" ? "إرسال" : "Send"}</span>
                    <FiSend style={{ fontSize: "1rem" }} />
                  </button>
                </form>
              </>
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

      {/* Mobile Sticky Header */}
      <header className="mobile-header">
        <div className="mobile-header-left" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", padding: "0.4rem", borderRadius: "var(--border-radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
            <FiCpu className="pulse-icon" style={{ fontSize: "1.1rem" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.5px" }}>{t("dashboard_title")}</span>
        </div>
        <div className="mobile-header-right" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button 
            className="mobile-hamburger-btn" 
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            aria-label="Toggle Navigation Menu"
            type="button"
            style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "0.4rem" }}
          >
            <FiMenu style={{ fontSize: "1.5rem" }} />
          </button>
        </div>
      </header>

      {isMobileSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileSidebarOpen(false)}></div>
      )}

      {/* Modern Sidebar Panel */}
      <aside className={`sidebar ${isMobileSidebarOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-top" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: "1rem" }}>
          {/* Logo Section */}
          <div className="sidebar-logo" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", padding: "0.5rem", borderRadius: "var(--border-radius-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                <FiCpu className="pulse-icon" style={{ fontSize: "1.4rem" }} />
              </div>
              <span style={{ fontWeight: 800, letterSpacing: "0.5px" }}>{t("dashboard_title")}</span>
            </div>
            <button 
              className="sidebar-close-btn" 
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close menu"
              type="button"
              style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "0.25rem" }}
            >
              <FiX style={{ fontSize: "1.5rem" }} />
            </button>
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
                      onPaste={(e) => {
                        e.preventDefault();
                        alert(language === "ar" ? "تم تعطيل النسخ واللصق لتشجيع التعلم النشط. يرجى كتابة إجابتك بنفسك!" : "Copy-pasting is disabled to encourage active learning. Please type your response!");
                      }}
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
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", textAlign: "start" }}>
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
              {(dynamicBooks && dynamicBooks.length > 0 ? dynamicBooks.map((b: any) => ({
                titleEn: b.title,
                titleAr: b.title_ar || b.title,
                subject: b.subject_id === "subj_algebra_stats" ? "Math" : b.subject_id === "subj_biology" ? "Science" : b.subject_id === "subj_arabic_grammar" ? "Arabic" : "History",
                size: "15.0 MB",
                format: "PDF",
                downloads: "1,450"
              })) : [
                { titleEn: "Advanced Mathematics Grade 9", titleAr: "الرياضيات المتقدمة - الصف التاسع", subject: "Math", size: "14.5 MB", format: "PDF", downloads: "1,240" },
                { titleEn: "Comprehensive Chemistry Handbook", titleAr: "كتاب الكيمياء الشامل والمبسط", subject: "Science", size: "18.2 MB", format: "PDF", downloads: "854" },
                { titleEn: "Arabic Literature and Poetry Anthology", titleAr: "روائع الأدب العربي والشعر", subject: "Arabic", size: "9.1 MB", format: "EPUB", downloads: "2,105" },
                { titleEn: "Modern History of the Middle East", titleAr: "التاريخ الحديث للشرق الأوسط", subject: "History", size: "12.4 MB", format: "PDF", downloads: "412" },
                { titleEn: "Physics Principles & Mechanics", titleAr: "أسس الفيزياء والميكانيكا الكلاسيكية", subject: "Science", size: "22.1 MB", format: "PDF", downloads: "931" },
                { titleEn: "Grammar & Arabic Linguistics Keys", titleAr: "مفاتيح النحو وقواعد الصرف المبسطة", subject: "Arabic", size: "5.4 MB", format: "PDF", downloads: "1,674" }
              ])
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
                {(dynamicSubjects && dynamicSubjects.length > 0 ? dynamicSubjects.map((subj: any) => {
                  const fallbackMeta = subj._id === "subj_algebra_stats" 
                    ? { nameEn: "Algebra & Statistics", nameAr: "الجبر والإحصاء", icon: "📊", progress: 65, color: "var(--primary)" }
                    : subj._id === "subj_biology"
                    ? { nameEn: "Biology", nameAr: "الأحياء", icon: "🧬", progress: 42, color: "#9c27b0" }
                    : subj._id === "subj_arabic_grammar"
                    ? { nameEn: "Arabic Grammar", nameAr: "النحو والصرف", icon: "📖", progress: 85, color: "#2e7d32" }
                    : { nameEn: subj.name, nameAr: subj.name_ar || subj.name, icon: subj.emoji || "📚", progress: 20, color: "#ef6c00" };
                  
                  return {
                    _id: subj._id,
                    nameEn: subj.name || fallbackMeta.nameEn,
                    nameAr: subj.name_ar || fallbackMeta.nameAr,
                    icon: subj.emoji || fallbackMeta.icon,
                    progress: fallbackMeta.progress,
                    color: fallbackMeta.color
                  };
                }) : [
                  { _id: "subj_algebra_stats", nameEn: "Pure Mathematics", nameAr: "الرياضيات العامة", icon: "📐", progress: 65, color: "var(--primary)" },
                  { _id: "subj_biology", nameEn: "Physics & Chemistry", nameAr: "العلوم والفيزياء", icon: "🧪", progress: 42, color: "#9c27b0" },
                  { _id: "subj_arabic_grammar", nameEn: "Arabic Grammar & Literature", nameAr: "اللغة العربية وآدابها", icon: "📚", progress: 85, color: "#2e7d32" },
                  { _id: "subj_history_geo", nameEn: "World History", nameAr: "التاريخ والجغرافيا", icon: "🌍", progress: 20, color: "#ef6c00" }
                ]).map((item, idx) => {
                  const isSelected = selectedSubjectId === item._id;
                  return (
                    <div 
                      key={idx} 
                      className="panel-card" 
                      onClick={() => setSelectedSubjectId(item._id)}
                      style={{ 
                        padding: "1.25rem", 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "1rem",
                        cursor: "pointer",
                        border: isSelected ? `2px solid ${item.color}` : "1px solid var(--card-border)",
                        transform: isSelected ? "scale(1.02)" : "scale(1)",
                        boxShadow: isSelected ? "0 8px 16px rgba(0,0,0,0.06)" : "none",
                        transition: "all 0.25s ease-in-out"
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = item.color;
                          e.currentTarget.style.transform = "scale(1.01)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "var(--card-border)";
                          e.currentTarget.style.transform = "scale(1)";
                        }
                      }}
                    >
                      <div style={{ fontSize: "2rem" }}>{item.icon}</div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.25rem 0", fontFamily: "var(--font-sans)" }}>{language === "ar" ? item.nameAr : item.nameEn}</h3>
                        <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden", marginBottom: "0.25rem" }}>
                          <div style={{ width: `${item.progress}%`, height: "100%", background: item.color, borderRadius: "3px" }}></div>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "#6a7c88", fontWeight: 700 }}>{item.progress}% {language === "ar" ? "مكتمل" : "completed"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Module Accordion Workspace */}
              <div className="panel-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "0.5rem", marginBottom: "1rem", fontWeight: 800 }}>
                  {language === "ar" ? "تفاصيل الوحدات والدروس التفاعلية" : "Interactive Curriculum Modules"}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {(() => {
                    const activeBook = dynamicBooks && dynamicBooks.find((b: any) => b.subject_id === selectedSubjectId);
                    const modulesList = activeBook && activeBook.chapters && activeBook.chapters.length > 0
                      ? activeBook.chapters.map((ch: any) => ({
                          titleAr: ch.title_ar || ch.title,
                          titleEn: ch.title,
                          lessons: ch.concepts || []
                        }))
                      : (selectedSubjectId === "subj_algebra_stats"
                        ? [
                            { titleAr: "الوحدة الأولى: الجبر والنسب المثلثية", titleEn: "Module 1: Algebra & Trigonometry Trigonometric Functions", lessons: ["المعادلات التربيعية", "المتطابقات المثلثية", "المصفوفات والمحددات"] },
                            { titleAr: "الوحدة الثانية: علم التفاضل والتكامل المبسط", titleEn: "Module 2: Basics of Calculus & Limits", lessons: ["النهايات والاتصال", "قواعد الاشتقاق وتطبيقاته", "المشتقات العليا"] },
                            { titleAr: "الوحدة الثالثة: الاحتمالات والإحصاء التطبيقي", titleEn: "Module 3: Probability & Applied Statistics", lessons: ["التوزيع الطبيعي المعتدل", "معامل الارتباط وبيرسون", "مبدأ العد والتباديل"] }
                          ]
                        : selectedSubjectId === "subj_biology"
                        ? [
                            { titleAr: "الوحدة الأولى: التغذية والعمليات الذاتية", titleEn: "Module 1: Nutrition & Autotrophic Processes", lessons: ["التغذية الذاتية والغير ذاتية", "البناء الضوئي وتفاعلاته", "حلقة كالفن وإنتاج الطاقة"] },
                            { titleAr: "الوحدة الثانية: النقل في الكائنات الحية", titleEn: "Module 2: Transport in Living Organisms", lessons: ["جهاز الدوران في الإنسان", "تركيب الدم والقلب والأوعية", "النظام الليمفاوي ومقاومة الأمراض"] }
                          ]
                        : selectedSubjectId === "subj_arabic_grammar"
                        ? [
                            { titleAr: "الوحدة الأولى: الأفعال الناسخة المقاربة والشروع", titleEn: "Module 1: Dynamic Verbs (Kaada & her Sisters)", lessons: ["اسم كاد وخبرها الجملة الفعلية", "شروط اقتران الخبر بأن", "الفروق الجوهرية بين كان وكاد"] },
                            { titleAr: "الوحدة الثانية: أسلوب الاستثناء وأدواته", titleEn: "Module 2: Style of Exception (Al-Mustathna)", lessons: ["أحكام المستثنى بعد إلا وغير وسوى", "الاستثناء التام والناقص المنفي", "أحكام الاستثناء بخلا وعدا وحاشا"] }
                          ]
                        : [
                            { titleAr: "الوحدة الأولى: المناهج العامة والدراسات", titleEn: "Module 1: General Curriculum & Studies", lessons: ["مراجعة عامة", "مفاهيم أساسية", "تدريبات وتطبيقات مخصصة"] }
                          ]);

                    return modulesList.map((mod: any, index: number) => (
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
                            {mod.lessons.map((les: string, lessonIdx: number) => (
                              <div key={lessonIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", background: "#ffffff", border: "1px solid rgba(0,0,0,0.03)", borderRadius: "4px" }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>📚 {les}</span>
                                <button
                                  onClick={() => alert(language === "ar" ? `جاري بدء الدرس التفاعلي الموثق بالصفحات الدراسية لـ: ${les}` : `Starting page-grounded interactive tutor lesson for: ${les}`)}
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
                    ));
                  })()}
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
                    style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.85rem", background: "#ffffff" }}
                  >
                    <option value="Math">{language === "ar" ? "الرياضيات" : "Mathematics"}</option>
                    <option value="Science">{language === "ar" ? "العلوم والفيزياء" : "Science & Physics"}</option>
                    <option value="Arabic">{language === "ar" ? "اللغة العربية" : "Arabic Linguistics"}</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setPracticeLoading(true);
                    setPracticeResult("");
                    setPracticeAnswer("");
                    setTimeout(() => {
                      const questions: Record<string, { en: string; ar: string }> = {
                        Math: {
                          en: "Given a matrix A where det(A) = 0, what can be inferred about its inverse? Explain your answer with matrix algebra concepts.",
                          ar: "إذا كانت المصفوفة أ بحيث محددها يساوي صفرًا (det(A) = 0)، فماذا يمكن استنتاجه عن معكوسها الضربي؟ اشرح إجابتك رياضياً."
                        },
                        Science: {
                          en: "Explain the process of Photosynthesis in chloroplasts. What are the key stages, reactions, and where do they occur?",
                          ar: "اشرح بالتفصيل عملية البناء الضوئي داخل البلاستيدات الخضراء. ما هي المراحل الأساسية والتفاعلات الضوئية واللاضوئية؟"
                        },
                        Arabic: {
                          en: "Explain the rules governing Kaada (كاد) and her sisters' predicates. How does it compare to Kana (كان)? Support your answer with grammatical examples.",
                          ar: "اشرح بالتفصيل حكم اقتران خبر كاد وأخواتها بأن المصدرية مبيناً أوجه الاختلاف والاتفاق بين كاد وكان مع الأمثلة النحوية."
                        }
                      };
                      setGeneratedQuestion(language === "ar" ? questions[practiceSubject].ar : questions[practiceSubject].en);
                      setPracticeLoading(false);
                    }, 800);
                  }}
                  style={{
                    padding: "10px", borderRadius: "var(--border-radius-sm)", border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#ffffff",
                    fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
                  }}
                  disabled={practiceLoading}
                >
                  {practiceLoading ? (
                    <FiRefreshCw className="spinning-icon" />
                  ) : "✨"}
                  <span>{language === "ar" ? "توليد سؤال تدريبي مخصص" : "Generate Custom Question"}</span>
                </button>

                {generatedQuestion && (
                  <div style={{ marginTop: "1rem", borderTop: "1px dashed rgba(235, 220, 185, 0.4)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ padding: "0.75rem", background: "rgba(16, 107, 163, 0.04)", borderLeft: "3px solid var(--primary)", borderRight: language === "ar" ? "3px solid var(--primary)" : "none", borderRadius: "4px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase" }}>
                        {language === "ar" ? "السؤال المولد بالذكاء الاصطناعي:" : "AI Generated Worksheet:"}
                      </span>
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", fontWeight: 700, lineHeight: "1.5" }}>{generatedQuestion}</p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "#4f6371" }}>
                        {language === "ar" ? "أدخل إجابتك (النسخ واللصق معطل):" : "Type your answer (paste is blocked):"}
                      </label>
                      <textarea
                        id="text-practice-input"
                        value={practiceAnswer}
                        onChange={(e) => setPracticeAnswer(e.target.value)}
                        onPaste={(e) => {
                          e.preventDefault();
                          alert(language === "ar" 
                            ? "تنبيه: تم تعطيل النسخ واللصق لتشجيع الفهم النشط والكتابة الذاتية!" 
                            : "Notice: Copy-pasting is disabled to encourage active recall and typing your own answers!");
                        }}
                        placeholder={language === "ar" ? "اكتب صياغتك وإجابتك الكاملة هنا..." : "Type your comprehensive response here..."}
                        style={{
                          width: "100%", height: "100px", padding: "0.75rem", borderRadius: "6px",
                          border: "1px solid var(--card-border)", outline: "none", fontSize: "0.85rem",
                          fontFamily: "var(--font-sans)", resize: "none"
                        }}
                      />
                    </div>

                    <button
                      onClick={() => {
                        setPracticeLoading(true);
                        setTimeout(() => {
                          const answersFeedback: Record<string, { en: string; ar: string }> = {
                            Math: {
                              en: "[Fahem AI Page Grounded Feedback - Textbook Page 14]\n\nExcellent try! You correctly identified that a matrix with determinant zero is singular and lacks a multiplicative inverse. Your explanation matches Section 1.2 on matrix inversion conditions. To get full points, make sure to state that A is singular.",
                              ar: "[تقرير تقييم فاهم المدعم بالكتاب المدرسي - صفحة ١٤]\n\nمحاولة ممتازة وصحيحة تماماً! لقد حددت بشكل صحيح أن المصفوفة ذات المحدد الصفري تسمى مصفوفة منفردة (شاذة) ولا يوجد لها معكوس ضربي. إجابتك تطابق تماماً ما ورد في الباب الأول للمصفوفات. استمر في هذا الأداء الرائع!"
                            },
                            Science: {
                              en: "[Fahem AI Page Grounded Feedback - Textbook Page 12]\n\nGreat explanation of the autotrophic process! You accurately described the role of chloroplasts and light-dependent reactions. Remember that the dark reaction (Calvin Cycle) occurs in the stroma as detailed on page 15.",
                              ar: "[تقرير تقييم فاهم المدعم بالكتاب المدرسي - صفحة ١٢]\n\nتفسير رائع لعملية البناء الذاتي والتحول الضوئي! لقد وصفت بدقة دور البلاستيدات والتفاعلات الضوئية. تذكر دائماً أن التفاعلات اللاضوئية (حلقة كالفن) تحدث في الستروما (الأرضية) كما هو مفصل في صفحة ١٥ من كتاب الأحياء."
                            },
                            Arabic: {
                              en: "[Fahem AI Page Grounded Feedback - Textbook Page 18]\n\nWonderful analysis! You correctly specified that the predicate of 'Kaada' must be a phrasal verb starting with a present tense verb. This aligns perfectly with the Thanaweya curriculum guidelines.",
                              ar: "[تقرير تقييم فاهم المدعم بالكتاب المدرسي - صفحة ١٨]\n\nشرح وافٍ وبليغ! لقد بينت بشكل ممتاز أن خبر كاد وأخواتها لا بد أن يكون جملة فعلية فعلها مضارع، وذكرت شروط اقترانه بأن المصدرية بدقة. إجابتك تطابق المنهج المقرر في كتاب النحو والصرف."
                            }
                          };
                          setPracticeResult(language === "ar" ? answersFeedback[practiceSubject].ar : answersFeedback[practiceSubject].en);
                          setPracticeLoading(false);
                        }, 1200);
                      }}
                      style={{
                        padding: "8px 12px", borderRadius: "4px", border: "none", cursor: "pointer",
                        background: "var(--primary)", color: "#ffffff", fontWeight: 700, fontSize: "0.8rem",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
                      }}
                      disabled={practiceLoading || !practiceAnswer.trim()}
                    >
                      {practiceLoading ? <FiRefreshCw className="spinning-icon" /> : "📝"}
                      <span>{language === "ar" ? "إرسال الإجابة للتقييم" : "Submit Response"}</span>
                    </button>

                    {practiceResult && (
                      <div style={{ marginTop: "0.5rem", padding: "0.75rem", background: "#f1f8e9", border: "1px solid #c5e1a5", borderRadius: "4px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#2e7d32" }}>
                          {language === "ar" ? "تحليل المعلم الذكي والتقييم المعتمد:" : "AI Grounded Tutor Evaluation:"}
                        </span>
                        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "#33691e", lineHeight: "1.5", whiteSpace: "pre-line" }}>{practiceResult}</p>
                      </div>
                    )}
                  </div>
                )}
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

                    {/* Real-time Typing Indicators */}
                    {typingUsers.length > 0 && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 0.75rem",
                        background: "rgba(16, 107, 163, 0.04)",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        color: "var(--primary)",
                        alignSelf: "flex-start",
                        marginBottom: "0.5rem",
                        border: "1px solid rgba(16, 107, 163, 0.08)",
                        animation: "pulse-ring 2s infinite"
                      }}>
                        <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                          <span className="typing-dot" style={{ width: "5px", height: "5px", background: "var(--primary)", borderRadius: "50%", display: "inline-block", animation: "typing-bounce 1.4s infinite ease-in-out" }} />
                          <span className="typing-dot" style={{ width: "5px", height: "5px", background: "var(--primary)", borderRadius: "50%", display: "inline-block", animation: "typing-bounce 1.4s infinite ease-in-out 0.2s" }} />
                          <span className="typing-dot" style={{ width: "5px", height: "5px", background: "var(--primary)", borderRadius: "50%", display: "inline-block", animation: "typing-bounce 1.4s infinite ease-in-out 0.4s" }} />
                        </div>
                        <span style={{ fontWeight: 600 }}>
                          {typingUsers.map(u => u.name).join(", ")} {language === "ar" ? "يكتب الآن..." : "is typing..."}
                        </span>
                      </div>
                    )}

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
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="LinkedIn">
              <FiLinkedin />
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="X">
              <FiTwitter />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="YouTube">
              <FiYoutube />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Instagram">
              <FiInstagram />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Facebook">
              <FiFacebook />
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
