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

export default function Dashboard() {
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

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [finalResult, setFinalResult] = useState("");
  
  // Superadmin status
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"agent" | "admin" | "social" | "settings">("agent");

  // User Profile & Onboarding states
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
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

  // Grounded Multi-Agent Test Bench State
  const [groundedPrompt, setGroundedPrompt] = useState("");
  const [groundedInput, setGroundedInput] = useState("");
  const [groundedLoading, setGroundedLoading] = useState(false);
  const [groundedLogs, setGroundedLogs] = useState<string[]>([]);
  const [groundedResult, setGroundedResult] = useState("");
  const groundedLogsEndRef = useRef<HTMLDivElement>(null);

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
        setUserProfile(updatedProfile);
        alert(language === "ar" ? "تم تحديث الإعدادات بنجاح!" : "Preferences updated successfully!");
        await logActivity("update_preferences", "success", "Updated privacy and account settings");
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

  // Handle Dynamic Translation for Onboarding
  useEffect(() => {
    setOnboardingMessages([
      { sender: "fahem", text: language === "ar" 
        ? "مرحباً بك في منصة فاهم التعليمية! 🚀 أنا مرشدك الذكي، وسأساعدك في تهيئة حسابك الشخصي بخطوات بسيطة وممتعة تفاعلية." 
        : "Welcome to Fahem Educational Platform! 🚀 I'm your AI guide, and I will help you set up your custom profile in a few simple and interactive steps." },
      { sender: "fahem", text: language === "ar" 
        ? "في البداية، ما هو دورك في منصتنا اليوم؟ اختر من البطاقات أدناه:" 
        : "To begin, what is your role on our platform today? Select from the cards below:" }
    ]);
  }, [language]);

  const handleOnboardingNext = async () => {
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
      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: onboardingName },
        onboardingUserType === "student"
          ? { sender: "fahem", text: language === "ar" ? `سعدت بلقائك يا ${onboardingName}! كم عمرك الآن؟ 🎂` : `Nice to meet you, ${onboardingName}! How old are you? 🎂` }
          : { sender: "fahem", text: language === "ar" ? `سعدت بلقائك يا ${onboardingName}! ما هي بلد إقامتك؟ 🌍` : `Nice to meet you, ${onboardingName}! What is your country of residence? 🌍` }
      ]);
      setOnboardingStep(onboardingUserType === "student" ? 2 : 3); // Students go to age, others go to country
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
      const proposedGrade = parseInt(onboardingAge) >= 18 ? "lifelong" : `Grade ${parseInt(onboardingAge) - 5}`;
      const proposedGradeAr = parseInt(onboardingAge) >= 18 ? "متعلم مدى الحياة" : `الصف ${parseInt(onboardingAge) - 5}`;
      
      const nextMsg = onboardingUserType === "student"
        ? (language === "ar"
          ? `بناءً على عمرك (${onboardingAge} سنة) وإقامتك في (${onboardingCountry})، نقترح عليك المسار الدراسي: **${proposedGradeAr}**.\n\nهل ترغب في قبول هذا الاقتراح، أو إدخال صف مخصص، أو اختيار متعلم مدى الحياة، أو تخطي هذه الخطوة؟`
          : `Based on your age of ${onboardingAge} and residing in ${onboardingCountry}, we recommend: **${proposedGrade === "lifelong" ? "Lifelong Learner" : proposedGrade}**.\n\nWould you like to accept this recommendation, enter a custom grade, choose 'Lifelong Learner', or skip this step?`)
        : (language === "ar"
          ? `ممتاز! ما هو اسم المدرسة أو المؤسسة التعليمية التي تنتمي إليها؟ (اختياري، يمكنك تخطيه)`
          : `Great! What is the name of your school or educational institution? (Optional, you can skip)`);

      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: language === "ar" ? `أقيم في ${onboardingCountry}` : `I live in ${onboardingCountry}` },
        { sender: "fahem", text: nextMsg }
      ]);
      setOnboardingStep(onboardingUserType === "student" ? 4 : 5); // Students go to grade proposal, others to school
    } else if (onboardingStep === 4) { // Grade Proposal step (Student only)
      let choiceText = "";
      if (onboardingGradeOption === "recommended") choiceText = language === "ar" ? "قبول الصف المقترح" : "Accept Recommended Grade";
      else if (onboardingGradeOption === "lifelong") choiceText = language === "ar" ? "متعلم مدى الحياة" : "Lifelong Learner";
      else if (onboardingGradeOption === "skip") choiceText = language === "ar" ? "تخطي هذه الخطوة" : "Skip Step";
      else choiceText = `${language === "ar" ? "صف مخصص:" : "Custom Grade:"} ${onboardingCustomGrade}`;

      const ageVal = parseInt(onboardingAge);
      const isUnderage = ageVal < 13;

      const nextMsg = isUnderage
        ? (language === "ar"
          ? "تنبيه الأمان والرقابة الأبوية 🛡️: بما أن عمرك أقل من 13 سنة، فإننا نطبق معايير الخصوصية لحماية الأطفال. يرجى كتابة البريد الإلكتروني لولي أمرك ليقوم بالموافقة على تفعيل حسابك من لوحته الخاصة:"
          : "Safety & Parental Consent Notice 🛡️: Since you are under 13, standard age limit protections apply. Please enter your parent's email address so they can approve your account from their portal:")
        : (language === "ar"
          ? "رائع جداً! لقد أكملنا البيانات الأساسية. الآن، اختر صورتك الرمزية (الرمز التعبيري) المفضلة لملفك الشخصي من القائمة أدناه:"
          : "Excellent! We have captured your core info. Now, select your preferred avatar emoji from our diverse library below to complete onboarding:");

      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: choiceText },
        { sender: "fahem", text: nextMsg }
      ]);
      setOnboardingStep(isUnderage ? 6 : 7); // Underage go to parent email, others go to avatar
    } else if (onboardingStep === 5) { // School step (Non-students only)
      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: onboardingSchool.trim() ? onboardingSchool : (language === "ar" ? "تخطي" : "Skipped") },
        { sender: "fahem", text: language === "ar" ? "رائع جداً! الآن، اختر صورتك الرمزية المفضلة لملفك الشخصي من القائمة أدناه:" : "Awesome! Now select your favorite avatar emoji from our library below to complete onboarding:" }
      ]);
      setOnboardingStep(7); // Go to avatar selection
    } else if (onboardingStep === 6) { // Parent email step (Underage Student only)
      if (!onboardingParentEmail.trim()) return;
      setOnboardingMessages(prev => [
        ...prev,
        { sender: "user", text: onboardingParentEmail },
        { sender: "fahem", text: language === "ar" ? "شكراً لك! تم تسجيل البريد الأبوي للموافقة الأمنية. أخيراً، اختر صورتك الرمزية المفضلة من القائمة أدناه:" : "Thank you! Parental email registered for approval check. Finally, select your favorite avatar emoji from the list below:" }
      ]);
      setOnboardingStep(7); // Go to avatar selection
    }
  };

  const handleOnboardingComplete = async (avatarEmoji: string) => {
    if (!user) return;
    setOnboardingAvatar(avatarEmoji);
    setLoadingProfile(true);

    const gradeVal = onboardingGradeOption === "recommended"
      ? (parseInt(onboardingAge) >= 18 ? "lifelong" : `Grade ${parseInt(onboardingAge) - 5}`)
      : onboardingGradeOption === "custom" ? onboardingCustomGrade
      : onboardingGradeOption === "lifelong" ? "lifelong" : "skipped";

    const isUnderage = onboardingUserType === "student" && parseInt(onboardingAge) < 13;

    const profileData = {
      userId: user.uid,
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
        await logActivity("onboarding_completed", "success", `Completed onboarding as ${onboardingUserType}`);
      }
    } catch (err) {
      console.error("Error saving onboarding profile:", err);
    } finally {
      setLoadingProfile(false);
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
        setUserTokenStats(data);
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
        fetch(`/api/user/profile?userId=${encodeURIComponent(currentUser.uid)}`)
          .then((res) => res.json())
          .then((data) => {
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

  if (userProfile && userProfile.onboardingCompleted !== true) {
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
          <div style={{
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
                    {isFahem ? "🤖" : (onboardingAvatar || "👤")}
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
                    onClick={() => setOnboardingGradeOption("recommended")}
                    style={{
                      padding: "0.75rem", borderRadius: "var(--border-radius-md)", border: "1px solid var(--card-border)",
                      background: onboardingGradeOption === "recommended" ? "rgba(16, 107, 163, 0.05)" : "rgba(255,255,255,0.6)",
                      borderColor: onboardingGradeOption === "recommended" ? "var(--primary)" : "var(--card-border)",
                      cursor: "pointer", fontWeight: 700, color: "var(--primary)", fontSize: "0.85rem"
                    }}
                  >
                    {language === "ar" ? `الصف المقترح (الصف ${parseInt(onboardingAge) - 5})` : `Recommend (Grade ${parseInt(onboardingAge) - 5})`}
                  </button>
                  <button
                    onClick={() => setOnboardingGradeOption("lifelong")}
                    style={{
                      padding: "0.75rem", borderRadius: "var(--border-radius-md)", border: "1px solid var(--card-border)",
                      background: onboardingGradeOption === "lifelong" ? "rgba(16, 107, 163, 0.05)" : "rgba(255,255,255,0.6)",
                      borderColor: onboardingGradeOption === "lifelong" ? "var(--primary)" : "var(--card-border)",
                      cursor: "pointer", fontWeight: 700, color: "var(--primary)", fontSize: "0.85rem"
                    }}
                  >
                    {language === "ar" ? "متعلم مدى الحياة 🧠" : "Lifelong Learner 🧠"}
                  </button>
                  <button
                    onClick={() => setOnboardingGradeOption("custom")}
                    style={{
                      padding: "0.75rem", borderRadius: "var(--border-radius-md)", border: "1px solid var(--card-border)",
                      background: onboardingGradeOption === "custom" ? "rgba(16, 107, 163, 0.05)" : "rgba(255,255,255,0.6)",
                      borderColor: onboardingGradeOption === "custom" ? "var(--primary)" : "var(--card-border)",
                      cursor: "pointer", fontWeight: 700, color: "var(--primary)", fontSize: "0.85rem"
                    }}
                  >
                    {language === "ar" ? "صف مخصص آخر ✍️" : "Type Custom Grade ✍️"}
                  </button>
                  <button
                    onClick={() => setOnboardingGradeOption("skip")}
                    style={{
                      padding: "0.75rem", borderRadius: "var(--border-radius-md)", border: "1px solid var(--card-border)",
                      background: onboardingGradeOption === "skip" ? "rgba(16, 107, 163, 0.05)" : "rgba(255,255,255,0.6)",
                      borderColor: onboardingGradeOption === "skip" ? "var(--primary)" : "var(--card-border)",
                      cursor: "pointer", fontWeight: 700, color: "var(--primary)", fontSize: "0.85rem"
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

            {/* Step 5: School (Non-student) */}
            {onboardingStep === 5 && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={onboardingSchool}
                  onChange={(e) => setOnboardingSchool(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleOnboardingNext()}
                  placeholder={language === "ar" ? "مثال: مدرسة المستقبل النموذجية" : "e.g., Future Model School"}
                  style={{
                    flex: 1, padding: "0.75rem", border: "1px solid var(--card-border)",
                    borderRadius: "var(--border-radius-md)", outline: "none", fontFamily: "var(--font-sans)"
                  }}
                  autoFocus
                />
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

            {/* Step 7: Avatar Selection Grid */}
            {onboardingStep === 7 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.5rem",
                  maxHeight: "180px", overflowY: "auto", padding: "0.25rem"
                }}>
                  {[
                    { e: "🚀", lEn: "Space Explorer", lAr: "مستكشف الفضاء" },
                    { e: "🧠", lEn: "Deep Thinker", lAr: "مفكر عميق" },
                    { e: "🎨", lEn: "Artist", lAr: "فنان مبدع" },
                    { e: "👾", lEn: "Gamer/Coder", lAr: "مبرمج محترف" },
                    { e: "🦄", lEn: "Dreamer", lAr: "حالم مبدع" },
                    { e: "🐼", lEn: "Nature Lover", lAr: "صديق الطبيعة" },
                    { e: "🧪", lEn: "Scientist", lAr: "عالم ذكي" },
                    { e: "🦸", lEn: "Super Hero", lAr: "بطل خارق" },
                    { e: "🦉", lEn: "Wise Owl", lAr: "بومة حكيمة" },
                    { e: "🦁", lEn: "Leader", lAr: "أسد قائد" },
                    { e: "🐬", lEn: "Dolphin", lAr: "دلفين ذكي" },
                    { e: "🍕", lEn: "Pizza Lover", lAr: "محب البيتزا" }
                  ].map((item) => (
                    <button
                      key={item.e}
                      onClick={() => handleOnboardingComplete(item.e)}
                      title={language === "ar" ? item.lAr : item.lEn}
                      style={{
                        padding: "1rem 0", borderRadius: "var(--border-radius-md)", border: "1px solid var(--card-border)",
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
                      <span style={{ fontSize: "2rem" }}>{item.e}</span>
                      <span style={{ fontSize: "0.65rem", color: "#6a7c88", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "90%", textAlign: "center" }}>
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
                    fontSize: "0.85rem", fontWeight: 600, padding: "0.5rem"
                  }}
                >
                  {language === "ar" ? "تخطي الإعداد بالكامل ⏭️" : "Skip profile setup completely ⏭️"}
                </button>
                <button
                  type="button"
                  onClick={handleOnboardingNext}
                  className="btn btn-primary"
                  style={{
                    padding: "0.6rem 1.75rem", fontSize: "0.9rem", fontWeight: 700, borderRadius: "var(--border-radius-md)",
                    display: "flex", alignItems: "center", gap: "0.35rem"
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
          <nav className="sidebar-nav">
            <button
              onClick={() => setActiveTab("agent")}
              className={`sidebar-nav-btn ${activeTab === "agent" ? "active" : ""}`}
              type="button"
            >
              <FiActivity />
              <span>{t("nav_toolkit")}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`sidebar-nav-btn ${activeTab === "admin" ? "active" : ""}`}
                type="button"
              >
                <FiShield />
                <span>{t("nav_admin")}</span>
              </button>
            )}

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
              <span>{language === "ar" ? "التواصل والدردشة" : "Social & Chat"}</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`sidebar-nav-btn ${activeTab === "settings" ? "active" : ""}`}
              type="button"
            >
              <FiSettings />
              <span>{language === "ar" ? "الإعدادات والخصوصية" : "Preferences & Privacy"}</span>
            </button>

            {/* GitHub Repo link */}
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
            <div className="sidebar-user-card">
              <div className="sidebar-user-avatar-wrapper">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="sidebar-user-avatar" />
                ) : (
                  <div className="sidebar-user-avatar" style={{ background: "var(--primary)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.2rem" }}>
                    {user.email ? user.email[0].toUpperCase() : "U"}
                  </div>
                )}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name" title={user.displayName || user.email || ""}>
                  {user.displayName || (user.email ? user.email.split("@")[0] : "User")}
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
          <h1>{activeTab === "agent" ? t("dashboard_title") : (language === "ar" ? "لوحة التحكم الأمنية للمشرف" : "Superadmin Security & Telemetry")}</h1>
          <p>{activeTab === "agent" ? t("dashboard_subtitle") : (language === "ar" ? "مراقبة إعدادات الأمان ومكافحة الانتهاكات وسجلات التدقيق المباشرة لوكلاء فاهم." : "Audit active safety guardrails, GCP Model Armor policies, and secure real-time system logs.")}</p>
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
                      <strong style={{ fontSize: "1.25rem", color: "var(--primary)" }}>{userTokenStats.daily.toLocaleString()}</strong>
                      <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden", marginTop: "0.5rem" }}>
                        <div style={{ width: `${Math.min(100, (userTokenStats.daily / 50000) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #106ba3, #4394d2)", borderRadius: "3px" }}></div>
                      </div>
                      <span style={{ fontSize: "0.65rem", color: "#8a9ca8", textAlign: "right", marginTop: "2px" }}>
                        {Math.round(Math.min(100, (userTokenStats.daily / 50000) * 100))}% of 50K limit
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
                      <strong style={{ fontSize: "1.25rem", color: "var(--secondary)" }}>{userTokenStats.weekly.toLocaleString()}</strong>
                      <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden", marginTop: "0.5rem" }}>
                        <div style={{ width: `${Math.min(100, (userTokenStats.weekly / 250000) * 100)}%`, height: "100%", background: "linear-gradient(90deg, var(--secondary), #f5c242)", borderRadius: "3px" }}></div>
                      </div>
                      <span style={{ fontSize: "0.65rem", color: "#8a9ca8", textAlign: "right", marginTop: "2px" }}>
                        {Math.round(Math.min(100, (userTokenStats.weekly / 250000) * 100))}% of 250K limit
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
                      <strong style={{ fontSize: "1.25rem", color: "var(--accent-green)" }}>{userTokenStats.monthly.toLocaleString()}</strong>
                      <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", overflow: "hidden", marginTop: "0.5rem" }}>
                        <div style={{ width: `${Math.min(100, (userTokenStats.monthly / 1000000) * 100)}%`, height: "100%", background: "linear-gradient(90deg, var(--accent-green), #42d2a2)", borderRadius: "3px" }}></div>
                      </div>
                      <span style={{ fontSize: "0.65rem", color: "#8a9ca8", textAlign: "right", marginTop: "2px" }}>
                        {Math.round(Math.min(100, (userTokenStats.monthly / 1000000) * 100))}% of 1M limit
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
                      <strong style={{ fontSize: "1.25rem", color: "#635bff" }}>{userTokenStats.total.toLocaleString()}</strong>
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
                            {child.avatar || "👤"}
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
                        <span style={{ fontSize: "2.2rem" }}>{chatRecipient.avatar || "👤"}</span>
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
                              <span style={{ fontSize: "1.5rem" }}>{friend.avatar || "👤"}</span>
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
                                <span style={{ fontSize: "1.8rem" }}>{dirUser.avatar || "👤"}</span>
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
                                  href={`/${language}/profile/${dirUser.userId}`}
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
