"use client";
import { authedFetch } from "../../../lib/authedFetch";

import { useState, useRef, useEffect } from "react";
import { auth, db, storage } from "../../../lib/firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, signOut, User, linkWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../../context/LanguageContext";
import AdminSecurityDashboard from "../../../components/AdminSecurityDashboard";
import CurriculumIngestionStudio from "../../../components/CurriculumIngestionStudio";
import HelpManual from "../../../components/HelpManual";
import { registerPushNotifications } from "../../../lib/registerPush";
import { NotificationBell } from "../../../components/NotificationBell";
import { UserAccountsPanel } from "../../../components/dashboard/UserAccountsPanel";
import { LibraryPanel } from "../../../components/dashboard/LibraryPanel";
import { SubjectsPanel } from "../../../components/dashboard/SubjectsPanel";
import { PracticePanel } from "../../../components/dashboard/PracticePanel";
import { StudyPlanPanel } from "../../../components/dashboard/StudyPlanPanel";
import { TimetablePanel } from "../../../components/dashboard/TimetablePanel";
import { ZatonaPanel } from "../../../components/dashboard/ZatonaPanel";
import { SocialPanel } from "../../../components/dashboard/SocialPanel";
import { SettingsPanel } from "../../../components/dashboard/SettingsPanel";
import { InsightsPanel } from "../../../components/dashboard/InsightsPanel";
import { DemoTourGuide } from "../../../components/DemoTourGuide";
import ScreenLock from "../../../components/ScreenLock";
import { Dropdown } from "../../../components/ui/Dropdown";



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
  FiMail,
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
  FiMenu,
  FiAward,
  FiSun,
  FiMoon
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
    dailyTokens: "Token usage",
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
    dailyTokens: "استهلاك التوكن",
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
  useEffect(() => {
    setError(false);
  }, [src]);
  if (error || !src) {
    return (
      <span 
        style={{ 
          fontSize: `calc(${size} * 0.6)`, 
          display: "inline-flex", 
          alignItems: "center", 
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(16, 107, 163, 0.1)",
          color: "var(--primary)",
          verticalAlign: "middle", 
          fontFamily: "var(--font-sans)",
          border: "1px solid rgba(16, 107, 163, 0.2)"
        }} 
        className="avatar-fallback"
      >
        👤
      </span>
    );
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
  const size = fontSize === "2.5rem" ? "60px" :
               fontSize === "2.2rem" ? "48px" :
               fontSize === "1.8rem" ? "36px" :
               fontSize === "1.5rem" ? "30px" : 
               fontSize === "1.1rem" ? "22px" : "36px";
  if (!avatarVal) {
    return (
      <span 
        style={{ 
          fontSize: `calc(${size} * 0.6)`, 
          display: "inline-flex", 
          alignItems: "center", 
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(16, 107, 163, 0.1)",
          color: "var(--primary)",
          verticalAlign: "middle", 
          fontFamily: "var(--font-sans)",
          border: "1px solid rgba(16, 107, 163, 0.2)"
        }} 
        className="avatar-fallback"
      >
        👤
      </span>
    );
  }
  const isImage = avatarVal.startsWith("http") || avatarVal.startsWith("/") || avatarVal.includes(".") || avatarVal.includes("data:image");
  if (isImage) {
    return <AvatarImage src={avatarVal} size={size} />;
  }
  return (
    <span 
      style={{ 
        fontSize: fontSize || "1.5rem", 
        display: "inline-flex", 
        alignItems: "center", 
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(16, 107, 163, 0.05)",
        verticalAlign: "middle", 
        fontFamily: "var(--font-sans)" 
      }}
    >
      {avatarVal}
    </span>
  );
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

const TEXTBOOK_PAGES: Record<string, {
  titleEn: string;
  titleAr: string;
  chapters: {
    titleEn: string;
    titleAr: string;
    pages: {
      pageNum: number;
      titleEn: string;
      titleAr: string;
      contentEn: string;
      contentAr: string;
      formulas?: string[];
      tipEn?: string;
      tipAr?: string;
    }[];
  }[];
}> = {
  "Math": {
    titleEn: "Advanced Mathematics Grade 9",
    titleAr: "الرياضيات المتقدمة - الصف التاسع",
    chapters: [
      {
        titleEn: "Chapter 1: Matrices & Determinants",
        titleAr: "الفصل الأول: المصفوفات والمحددات",
        pages: [
          {
            pageNum: 1,
            titleEn: "Introduction to Matrices",
            titleAr: "مقدمة في المصفوفات",
            contentEn: "A matrix is a rectangular array of numbers, symbols, or expressions, arranged in rows and columns. Matrices are used to represent linear maps, solve systems of linear equations, and track states in quantum physics and computer graphics. The dimensions of a matrix are given as m x n, where m is the number of rows and n is the number of columns.",
            contentAr: "المصفوفة هي تنظيم مستطيل الشكل لمجموعة من الأعداد أو الرموز أو التعبيرات في صفوف وأعمدة. تُستخدم المصفوفات لتمثيل التحويلات الخطية، وحل نظم المعادلات الخطية، وتتبع الحالات في فيزياء الكم ورسومات الحاسوب. يتم تحديد رتبة أو أبعاد المصفوفة بـ م × ن، حيث م هو عدد الصفوف و ن هو عدد الأعمدة.",
            formulas: ["Matrix A = [a_ij]", "Dimension: m × n"],
            tipEn: "Remember: Rows are horizontal, columns are vertical. Keep them distinct!",
            tipAr: "تذكر دائماً: الصفوف تكون أفقية، والأعمدة تكون رأسية. لا تخلط بينهما!"
          },
          {
            pageNum: 2,
            titleEn: "Basic Matrix Operations",
            titleAr: "العمليات الأساسية على المصفوفات",
            contentEn: "Matrix addition is the operation of adding corresponding elements of two matrices of the same dimensions. If matrices A and B have different dimensions, addition is undefined. In matrix multiplication, the product AB is defined only if the number of columns in A equals the number of rows in B.",
            contentAr: "جمع المصفوفات هو عملية جمع العناصر المتناظرة في مصفوفتين لهما نفس الأبعاد تماماً. إذا كانت المصفوفتان أ و ب بأبعاد مختلفة، فإن عملية الجمع تكون غير معرفة. في ضرب المصفوفات، يكون حاصل الضرب أ ب معرفاً فقط إذا كان عدد أعمدة المصفوفة أ مساوياً لعدد صفوف المصفوفة ب.",
            formulas: ["C_ij = a_ij + b_ij", "AB Multiplication: (m×n) × (n×p) = m×p"],
            tipEn: "Matrix multiplication is NOT commutative: AB ≠ BA in most cases!",
            tipAr: "عملية ضرب المصفوفات ليست عملية إبدالية: أ ب ≠ ب أ في معظم الحالات!"
          },
          {
            pageNum: 3,
            titleEn: "Determinants & Singularity",
            titleAr: "المحددات والمصفوفات المنفردة",
            contentEn: "A determinant is a scalar value that can be computed from the elements of a square matrix. It encodes properties of the linear transformation defined by the matrix. A square matrix A is singular (has no multiplicative inverse) if and only if its determinant is exactly zero (det(A) = 0).",
            contentAr: "المحدد هو قيمة عددية يتم حسابها من عناصر المصفوفة المربعة. يعبر المحدد عن خصائص التحويل الخطي الذي تمثله المصفوفة. تكون المصفوفة المربعة أ منفردة (ليس لها معكوس ضربي) إذا وفقط إذا كانت قيمة محددها تساوي صفراً تماماً (محدد(أ) = 0).",
            formulas: ["det(A) = ad - bc (for 2x2)", "Inverse Exist <=> det(A) ≠ 0"],
            tipEn: "Singular matrices act like 'zero' in real numbers; they can't be inverted.",
            tipAr: "المصفوفات المنفردة تشبه الرقم 'صفر' في الأعداد الحقيقية؛ لا يمكن إيجاد معكوس ضربي لها!"
          },
          {
            pageNum: 4,
            titleEn: "Cramer's Rule for Linear Systems",
            titleAr: "طريقة كرامر لحل المعادلات الخطية",
            contentEn: "Cramer's rule is an explicit formula for the solution of a system of linear equations with as many equations as unknowns, valid whenever the system has a unique solution. It expresses each coordinate of the solution as a ratio of two determinants.",
            contentAr: "طريقة كرامر هي صيغة صريحة لحل نظام من المعادلات الخطية يكون فيه عدد المعادلات مساوياً لعدد المجاهيل، وتكون صالحة عندما يكون للنظام حل وحيد. تعبر هذه الطريقة عن كل متغير بنسبة بين محددي مصفوفتين.",
            formulas: ["x = det(Ax) / det(A)", "y = det(Ay) / det(A)"],
            tipEn: "If the main determinant det(A) is zero, Cramer's rule cannot be applied.",
            tipAr: "إذا كان محدد المعاملات الرئيسي محدد(أ) يساوي صفراً، فلا يمكن تطبيق طريقة كرامر!"
          }
        ]
      }
    ]
  },
  "Science": {
    titleEn: "Comprehensive Chemistry Handbook",
    titleAr: "كتاب الكيمياء الشامل والمبسط",
    chapters: [
      {
        titleEn: "Chapter 1: Atomic Structure",
        titleAr: "الفصل الأول: البنية الذرية للذرة",
        pages: [
          {
            pageNum: 1,
            titleEn: "Atomic Theory Evolution",
            titleAr: "تطور نظرية بنية الذرة",
            contentEn: "The concept of the atom started with ancient Greek philosophers who proposed that matter is made of indivisible particles. Dalton formulated the first scientific atomic theory, followed by Thomson's plum pudding model, Rutherford's planetary model, and Niels Bohr's quantized energy level model. Today, we use the quantum mechanical model where electrons reside in probability clouds.",
            contentAr: "بدأ مفهوم الذرة مع فلاسفة الإغريق الذين اقترحوا أن المادة تتكون من جسيمات غير قابلة للتجزئة. صاغ دالتون أول نظرية ذرية علمية، تلاه نموذج تومسون (فطيرة الزبيب)، ثم نموذج رذرفورد الكوكبي، ونموذج نيلز بور لمستويات الطاقة المكممة. اليوم، نستخدم النموذج الميكانيكي الكمي حيث تتواجد الإلكترونات في سحابة احتمالية.",
            formulas: ["E = hν (Planck's Equation)", "Bohr Orbit Radius: r_n = n² × a_0"],
            tipEn: "Bohr's model explains the hydrogen spectrum perfectly, but fails for heavier atoms.",
            tipAr: "يفسر نموذج بور طيف ذرة الهيدروجين بشكل ممتاز، ولكنه يفشل في تفسير الأطياف للذرات الأثقل."
          },
          {
            pageNum: 2,
            titleEn: "Quantum Numbers & Orbitals",
            titleAr: "أعداد الكم المحددة والمدارات",
            contentEn: "Four quantum numbers are used to completely describe the state of an electron in an atom: principal (n), angular momentum (l), magnetic (m_l), and spin (m_s). No two electrons in the same atom can have identical values for all four quantum numbers (Pauli Exclusion Principle).",
            contentAr: "تُستخدم أربعة أعداد كم لتحديد حالة الإلكترون في الذرة بالكامل: عدد الكم الرئيسي (ن)، وعدد الكم الثانوي (ل)، وعدد الكم المغناطيسي (م_ل)، وعدد الكم المغزلي (م_س). لا يمكن لإلكترونين في نفس الذرة أن يحملا نفس قيم أعداد الكم الأربعة (مبدأ استبعاد باولي).",
            formulas: ["n >= 1", "l: 0 to n-1", "m_l: -l to +l", "m_s: +1/2 or -1/2"],
            tipEn: "An s-orbital is spherical, p-orbitals are dumbbell-shaped, and d-orbitals are more complex.",
            tipAr: "المدار s كروي الشكل، والمدارات p تأخذ شكل دمبل (فصين)، بينما المدارات d أكثر تعقيداً."
          }
        ]
      }
    ]
  },
  "Arabic": {
    titleEn: "Grammar & Arabic Linguistics Keys",
    titleAr: "مفاتيح النحو وقواعد الصرف المبسطة",
    chapters: [
      {
        titleEn: "Chapter 1: Arabic Grammar Basics",
        titleAr: "الفصل الأول: أساسيات النحو وقواعد الإعراب",
        pages: [
          {
            pageNum: 1,
            titleEn: "Parts of Speech",
            titleAr: "أقسام الكلام في اللغة العربية",
            contentEn: "Words in Arabic grammar are classified into three distinct types: Noun (الاسم) which represents an entity, object, or concept independent of time; Verb (الفعل) which represents an action taking place in a specific timeframe (past, present, imperative); and Particle (الحرف) which has no meaning unless coupled with nouns or verbs.",
            contentAr: "الكلمة في اللغة العربية تنقسم إلى ثلاثة أقسام رئيسية: الاسم (وهو ما دل على معنى في نفسه غير مقترن بزمن معين مثل 'كتاب' أو 'أحمد')، والفعل (وهو ما دل على حدث مقترن بزمن مثل 'كتبَ' أو 'يقرأُ')، والحرف (وهو ما لا يظهر معناه كاملاً إلا مع غيره مثل حروف الجر 'في'، 'من').",
            formulas: ["الكلمة = اسم + فعل + حرف", "علامات الاسم: التنوين، الجر، ال التعريف"],
            tipEn: "Recognizing nouns is easy because only nouns can accept 'Al-' (the) or Tanween.",
            tipAr: "تمييز الأسماء سهل جداً لأن الأسماء فقط هي التي تقبل التنوين أو دخول 'ال' التعريف أو الجر!"
          },
          {
            pageNum: 2,
            titleEn: "Nominative, Accusative & Genitive States",
            titleAr: "حالات الإعراب: الرفع، النصب، والجر",
            contentEn: "Arabic nouns change their endings depending on their grammatical role in the sentence. The standard states are: Raf' (الرفع, Nominative) marked by Dammah; Nasb (النصب, Accusative) marked by Fathah; and Jarr (الجر, Genitive) marked by Kasrah.",
            contentAr: "تتغير أواخر الكلمات المعربة في اللغة العربية حسب موقعها الإعرابي في الجملة. الحالات الإعرابية الأساسية للأسماء هي: الرفع (وعلامته الأصلية الضمة، كالمبتدأ والفاعل)، والنصب (وعلامته الأصلية الفتحة، كالمفعول به)، والجر (وعلامته الأصلية الكسرة، كالاسم المجرور بعد حرف الجر).",
            formulas: ["الرفع (الضمة ُ)", "النصب (الفتحة َ)", "الجر (الكسرة ِ)"],
            tipEn: "Verbs can be in Raf', Nasb, or Jazm (Jazm is exclusive to verbs, Jarr is exclusive to nouns!).",
            tipAr: "الأفعال تعرب بالرفع والنصب والجزم (الجزم خاص بالأفعال فقط، والجر خاص بالأسماء فقط!)."
          }
        ]
      }
    ]
  }
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
      case "admin-ingestion":
        return {
          title: language === "ar" ? "أستوديو المناهج" : "Curriculum Studio",
          subtitle: language === "ar" ? "استيراد وتجهيز كتب الوزارة ومناهجها باستخدام قنوات معالجة منفصلة دون إزعاج الوكلاء النشطين." : "Ingest and process official textbooks using isolated Cloud Run Jobs without interrupting active student swarms."
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

  const isJudgeEmail = (email?: string | null) => {
    if (!email) return false;
    const domain = email.toLowerCase().split("@")[1];
    return ["google.com", "mongodb.com", "devpost.com"].includes(domain);
  };
  const isJudge = typeof window !== "undefined" && localStorage.getItem("app_mode") === "demo" && !!localStorage.getItem("demo_auth_token");
  
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("fahem_theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (typeof window !== "undefined") {
      localStorage.setItem("fahem_theme", nextDark ? "dark" : "light");
      if (nextDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };
  // Conversational Onboarding states
  const [localCompleted, setLocalCompleted] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState<string>("phone");
  const currentOnboardingStepRef = useRef<string>("phone");
  useEffect(() => {
    currentOnboardingStepRef.current = currentOnboardingStep;
  }, [currentOnboardingStep]);
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
  const [settingsAvatarTab, setSettingsAvatarTab] = useState<"vectors" | "animals" | "tech" | "golden">("vectors");
  const [settingsAvatar, setSettingsAvatar] = useState<string>("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsStatusText, setSettingsStatusText] = useState("");
  const [realTokenStats, setRealTokenStats] = useState<any>(null);

  // Gamification telemetry metrics
  const getLevelBadgeText = () => {
    const xp = userProfile?.xp || 150;
    if (xp > 5000) return language === "ar" ? "🥇 عبقري فاهم" : "🥇 Fahem Sage";
    if (xp > 2000) return language === "ar" ? "🥈 باحث متميز" : "🥈 Elite Scholar";
    return language === "ar" ? "🥉 طالب واعد" : "🥉 Bright Spark";
  };
  const activeXp = userProfile?.xp || 150;
  const activeLevel = Math.floor(activeXp / 1000) + 1;
  const activeStreak = userProfile?.streak || 3;
  const nextLevelXp = activeLevel * 1000;
  const xpProgressPercent = (activeXp % 1000) / 10;
  const consumedClt = realTokenStats?.used?.daily ?? 0;
  const totalAllocatedClt = Math.round((realTokenStats?.limit?.weekly ?? (userProfile?.totalAllocatedClt || 250000)) / 7);
  const dailyUsed = consumedClt;
  const dailyLimit = totalAllocatedClt;
  const tokenProgressPercent = dailyLimit > 0 ? (dailyUsed / dailyLimit) * 100 : 0;
  const remainingClt = dailyLimit - dailyUsed;
  // Real nav-bar gamification meters (computed from the activity log in fetchSpaceHistory).
  const [navXp, setNavXp] = useState<number>(0);
  const [navLevel, setNavLevel] = useState<number>(1);
  const [navStreak, setNavStreak] = useState<number>(0);
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
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [initialBookId, setInitialBookId] = useState<string | null>(null);
  const [initialPage, setInitialPage] = useState<number | null>(null);



  // Premium split-screen interactive reader states
  const [selectedBookReader, setSelectedBookReader] = useState<any>(null);
  const [customUploadedBooks, setCustomUploadedBooks] = useState<any[]>([]);
  const [readerCurrentPage, setReaderCurrentPage] = useState<number>(1);
  const [pendingNavigatePage, setPendingNavigatePage] = useState<number | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  // Demo sandbox: admin tabs are shown to everyone but strictly read-only (view-only fake data).
  const [isDemoSandbox, setIsDemoSandbox] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDemoSandbox(localStorage.getItem("app_mode") === "demo" && !!localStorage.getItem("demo_auth_token"));
    }
  }, []);

  // Register browser push once the user is signed in (graceful no-op until VAPID keys are set).
  useEffect(() => {
    if (user) {
      registerPushNotifications(authedFetch);
    }
  }, [user]);
  const [translationLanguage, setTranslationLanguage] = useState<string>("Original");
  const [selectedText, setSelectedText] = useState<string>("");
  const [bubbleCoords, setBubbleCoords] = useState<{ x: number; y: number } | null>(null);

  const [loadedBookPages, setLoadedBookPages] = useState<any[]>([]);
  const [loadingBookPages, setLoadingBookPages] = useState<boolean>(false);

  const getAllPages = (book: any, pagesState: any[]) => {
    if (!book) return [];
    
    // 1. If we have real pages loaded in pagesState for this book, map them!
    const targetBookId = (book._id || book.id || "").toString().trim().toLowerCase();
    const realPages = (pagesState || [])
      .filter((p: any) => {
        const pBookId = (p.book_id || p.bookId || "").toString().trim().toLowerCase();
        return pBookId === targetBookId;
      })
      .sort((a: any, b: any) => {
        const aNum = Number(a.page_number || a.pageNum || 0);
        const bNum = Number(b.page_number || b.pageNum || 0);
        return aNum - bNum;
      });
    
    if (realPages.length > 0) {
      // Pre-scan if book.chapters is empty to cluster pages dynamically
      const pageToChapterMap: Record<number, number> = {};
      const discoveredTitles: Record<number, string> = {};

      const hasDefinedChapters = book.chapters && Array.isArray(book.chapters) && book.chapters.length > 0;

      // Default common Computer Science / Python chapters if we can't find running header titles
      const fallbackChapterTitlesEn: Record<number, string> = {
        1: "Statements & Programming", 2: "Expressions & Variables", 3: "Objects & Values",
        4: "Decisions & Conditions", 5: "Loops & Iterations", 6: "Functions & Abstraction",
        7: "Modules & Libraries", 8: "Strings & Processing", 9: "Lists & Collections",
        10: "Dictionaries & Structs", 11: "Classes & Objects", 12: "Recursion & Algorithms",
        13: "Inheritance & OOP", 14: "Files and Exceptions", 15: "Data Science"
      };

      const fallbackChapterTitlesAr: Record<number, string> = {
        1: "الجمل البرمجية والبرمجة", 2: "التعبيرات والمتغيرات", 3: "الكائنات والقيم البرمجية",
        4: "اتخاذ القرارات والشرطيات", 5: "التكرار والحلقات", 6: "الدوال والتجريد",
        7: "الوحدات والمكتبات البرمجية", 8: "النصوص وسلاسل الحروف", 9: "القوائم والمجموعات",
        10: "القواميس والتراكيب", 11: "الفئات والبرمجة الكائنية", 12: "الاستدعاء الذاتي والخوارزميات",
        13: "الوراثة والتعدد الشكلي", 14: "الملفات والاستثناءات والمعالجة", 15: "علم البيانات والتحليل"
      };

      // Determine book subject-specific fallback lists
      const titleLower = ((book.title || "") + " " + (book.titleEn || "") + " " + (book.subject || "") + " " + (book.subject_id || "")).toLowerCase();
      
      let subjectFallbackEn: Record<number, string> = {};
      let subjectFallbackAr: Record<number, string> = {};

      if (titleLower.includes("math") || titleLower.includes("algebra") || titleLower.includes("رياض") || titleLower.includes("جبر") || titleLower.includes("geometry") || titleLower.includes("هندسة")) {
        subjectFallbackEn = {
          1: "Introduction to Algebra", 2: "Linear Equations", 3: "Quadratic Equations",
          4: "Functions & Graphs", 5: "Matrices & Determinants", 6: "Sequences & Series",
          7: "Limits & Calculus", 8: "Advanced Mathematical Concepts"
        };
        subjectFallbackAr = {
          1: "مقدمة في الجبر", 2: "المعادلات الخطية", 3: "المعادلات التربيعية",
          4: "الدوال والرسوم البيانية", 5: "المصفوفات والمحددات", 6: "المتتابعات والمتسلسلات",
          7: "النهايات وحساب التفاضل", 8: "المفاهيم الرياضية المتقدمة"
        };
      } else if (titleLower.includes("science") || titleLower.includes("physic") || titleLower.includes("chemistry") || titleLower.includes("biolog") || titleLower.includes("علوم") || titleLower.includes("فيزياء") || titleLower.includes("كيمياء") || titleLower.includes("أحياء")) {
        subjectFallbackEn = {
          1: "Physical Sciences Foundations", 2: "Kinetics & Motion", 3: "Forces & Energy",
          4: "Atomic Structure", 5: "Chemical Bonding", 6: "Thermodynamics",
          7: "Optics & Light", 8: "Advanced Scientific Inquiry"
        };
        subjectFallbackAr = {
          1: "أسس العلوم الفيزيائية", 2: "الحركة وعلم الحركة", 3: "القوى والطاقة",
          4: "البنية الذرية للذرة", 5: "الروابط الكيميائية والجزئية", 6: "الديناميكا الحرارية",
          7: "البصريات والضوء", 8: "البحث العلمي المتقدم"
        };
      } else if (titleLower.includes("arabic") || titleLower.includes("عرب") || titleLower.includes("نحو") || titleLower.includes("بلاغة")) {
        subjectFallbackEn = {
          1: "Arabic Grammar Basics", 2: "Parts of Speech", 3: "Sentence Structure",
          4: "Noun States", 5: "Verb Conjugation", 6: "Rhetoric & Literature",
          7: "Linguistics & Phonetics", 8: "Advanced Arabic Studies"
        };
        subjectFallbackAr = {
          1: "أساسيات النحو وقواعد الإعراب", 2: "أقسام الكلام في اللغة العربية", 3: "تركيب الجملة ومكوناتها",
          4: "مرفوعات ومنصوبات ومجرورات الأسماء", 5: "تصريف الأفعال والضمائر", 6: "البلاغة العربية والنثر والأدب",
          7: "علم الأصوات واللغويات والمخارج", 8: "الدراسات العربية المتقدمة"
        };
      } else if (titleLower.includes("python") || titleLower.includes("computer") || titleLower.includes("programming") || titleLower.includes("حاسب") || titleLower.includes("برمج")) {
        subjectFallbackEn = fallbackChapterTitlesEn;
        subjectFallbackAr = fallbackChapterTitlesAr;
      } else {
        subjectFallbackEn = {
          1: "Foundations & Core Principles", 2: "Key Concepts & Structure", 3: "Analytical Techniques",
          4: "Practical Applications", 5: "Case Studies & Examples", 6: "Advanced Methodologies",
          7: "Comprehensive Review & Summary"
        };
        subjectFallbackAr = {
          1: "الأسس والمبادئ الجوهرية", 2: "المفاهيم الأساسية والبنية", 3: "التقنيات التحليلية والتطبيق",
          4: "التطبيقات العملية والممارسة", 5: "دراسة الحالات والأمثلة المحلولة", 6: "المنهجيات المتقدمة والبحث",
          7: "المراجعة الشاملة والملخص العام"
        };
      }

      if (!hasDefinedChapters) {
        let currentChapterNum = 1;
        realPages.forEach((p: any) => {
          const pageNum = Number(p.page_number || p.pageNum || 1);
          const content = p.content || "";
          const lines = content.split("\n");
          for (let line of lines) {
            line = line.trim();
            // Match Chapter headings like "9 • Lists" or "9. Lists" or "Chapter 9"
            const chMatch = line.match(/^(\d+)\s*•\s*([A-Za-z ]{3,})/i) || 
                            line.match(/^([A-Za-z ]{3,})\s*•\s*(\d+)$/i) ||
                            line.match(/^Chapter\s+(\d+)\s*[:-]?\s*(.+)$/i);
            if (chMatch) {
              const num = parseInt(chMatch[1] || chMatch[2] || chMatch[1], 10);
              const title = (chMatch[2] || chMatch[1] || chMatch[2] || "").trim();
              if (num >= 1 && num <= 30 && title && !/^\d+$/.test(title)) {
                discoveredTitles[num] = title;
                currentChapterNum = num;
              }
            }
            // Match section numbers like "9.1 Modifying lists" to assign correct chapter
            const secMatch = line.match(/^(\d+)\.(\d+)\s+([A-Za-z ]{3,})/);
            if (secMatch) {
              const num = parseInt(secMatch[1], 10);
              if (num >= 1 && num <= 30) {
                currentChapterNum = num;
              }
            }
          }
          pageToChapterMap[pageNum] = currentChapterNum;
        });
      }

      return realPages.map((p: any) => {
        const pageNum = Number(p.page_number || p.pageNum || 1);
        
        // Detect language of the content, or use book's language
        const isAr = book.language === "ar" || /[\u0600-\u06FF]/.test(p.content || "");
        
        let matchedIndex = 0;
        let fallbackChapterTitleEn = "";
        let fallbackChapterTitleAr = "";

        if (hasDefinedChapters) {
          // Find matching chapter inside the book's chapters array dynamically
          let matchedChapter: any = null;
          matchedIndex = book.chapters.findIndex((ch: any) => {
            const start = ch.page_start ?? ch.start_page ?? 1;
            const end = ch.page_end ?? ch.end_page ?? 99999;
            return pageNum >= start && pageNum <= end;
          });
          if (matchedIndex !== -1) {
            matchedChapter = book.chapters[matchedIndex];
          } else {
            matchedIndex = 0;
          }
          fallbackChapterTitleEn = matchedChapter ? (matchedChapter.title || matchedChapter.title_en || matchedChapter.title_ar || matchedChapter.titleAr || `Chapter ${matchedIndex + 1}`) : `Section ${pageNum}`;
          fallbackChapterTitleAr = matchedChapter ? (matchedChapter.title_ar || matchedChapter.titleAr || matchedChapter.title || matchedChapter.title_en || `القسم ${matchedIndex + 1}`) : `القسم ${pageNum}`;
        } else {
          // Dynamic chapter clustering
          const chNum = pageToChapterMap[pageNum] || 1;
          matchedIndex = chNum - 1;
          const discTitle = discoveredTitles[chNum];
          
          fallbackChapterTitleEn = discTitle 
            ? `Chapter ${chNum}: ${discTitle}` 
            : (subjectFallbackEn[chNum] 
                ? `Chapter ${chNum}: ${subjectFallbackEn[chNum]}` 
                : `Chapter ${chNum}`);
                
          fallbackChapterTitleAr = discTitle 
            ? `الفصل ${chNum}: ${discTitle}` 
            : (subjectFallbackAr[chNum] 
                ? `الفصل ${chNum}: ${subjectFallbackAr[chNum]}` 
                : `الفصل ${chNum}`);
        }

        // Map fields to match what the viewer expects
        return {
          pageNum: pageNum,
          page_number: pageNum,
          titleEn: p.titleEn || p.pageTopicEn || p.pageTopicAr || p.topic_title || p.chapterTitleEn || `Page ${pageNum}`,
          titleAr: p.titleAr || p.pageTopicAr || p.pageTopicEn || p.topic_title || p.chapterTitleAr || `القسم ${pageNum}`,
          contentEn: p.contentEn || (isAr ? "" : p.content) || p.content || "",
          contentAr: p.contentAr || (isAr ? p.content : "") || p.content || "",
          formulas: p.formulas || [],
          tipEn: p.tipEn || p.tips || "Use the companion chat on the right side to ask questions!",
          tipAr: p.tipAr || p.tips || "اسأل رفيق المذاكرة فهم في لوحة الدردشة الجانبية للتعمق في هذه الصفحة!",
          chapterTitleEn: p.chapterTitleEn || p.chapter_title || p.chapter_title_en || fallbackChapterTitleEn,
          chapterTitleAr: p.chapterTitleAr || p.chapter_title_ar || p.chapter_title || fallbackChapterTitleAr,
          chapterIndex: p.chapterIndex ?? matchedIndex ?? 0,
          blocks: p.blocks || [],
          i18n: p.i18n || {},
          originalPage: p
        };
      });
    }

    // 2. Fallback to TEXTBOOK_PAGES if available for the specific subject,
    // but ONLY if the book is one of the standard static ones (like Math, Science, Arabic)
    const bookSubject = book.subject;
    if (bookSubject && TEXTBOOK_PAGES[bookSubject] && !book.isUserUpload) {
      const bookData = TEXTBOOK_PAGES[bookSubject];
      const allPages: any[] = [];
      bookData.chapters?.forEach((ch: any, chIdx: number) => {
        ch.pages?.forEach((p: any) => {
          allPages.push({
            ...p,
            chapterTitleEn: ch.titleEn,
            chapterTitleAr: ch.titleAr,
            chapterIndex: chIdx
          });
        });
      });
      return allPages;
    }

    // 3. Dynamic synthesis loading placeholder
    return [
      {
        pageNum: 1,
        titleEn: "Retrieving pages...",
        titleAr: "جاري استرجاع الصفحات...",
        contentEn: "Connecting to the secure ingestion vault and retrieving book pages. Please wait...",
        contentAr: "جاري الاتصال بقاعدة البيانات الآمنة واسترجاع صفحات الكتاب دراسياً... يرجى الانتظار ثوانٍ معدودة.",
        formulas: [],
        tipEn: "Loading...",
        tipAr: "جاري التحميل...",
        chapterTitleEn: "Retrieving book pages...",
        chapterTitleAr: "جاري استرجاع الصفحات...",
        chapterIndex: 0
      }
    ];
  };

  // Fetch book pages from database/API when a book is selected with sessionStorage cache
  useEffect(() => {
    if (!selectedBookReader) {
      setLoadedBookPages([]);
      return;
    }
    
    const bookId = selectedBookReader._id || selectedBookReader.id;
    if (!bookId) return;

    // Try to load from sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(`book_pages:${bookId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[Library-Reader] Loaded ${parsed.length} pages for book ID: ${bookId} from sessionStorage cache.`);
          setLoadedBookPages(parsed);
          setLoadingBookPages(false);
          return;
        }
      }
    } catch (cacheErr) {
      console.warn("[Library-Reader] Failed to parse sessionStorage cache:", cacheErr);
    }

    setLoadingBookPages(true);
    console.log(`[Library-Reader] Fetching book pages for book ID: ${bookId}...`);
    
    authedFetch(`/api/books/pages?bookId=${bookId}&_t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch pages");
        return res.json();
      })
      .then((data) => {
        if (data && data.success && data.pages) {
          console.log(`[Library-Reader] Loaded ${data.pages.length} pages for book ID: ${bookId}`);
          setLoadedBookPages(data.pages);
          try {
            sessionStorage.setItem(`book_pages:${bookId}`, JSON.stringify(data.pages));
          } catch (storageErr) {
            console.warn("[Library-Reader] Failed to write to sessionStorage:", storageErr);
          }
        } else {
          console.warn("[Library-Reader] API returned success false or no pages.");
          setLoadedBookPages([]);
        }
      })
      .catch((err) => {
        console.error("[Library-Reader] Error loading pages from API:", err);
        setLoadedBookPages([]);
      })
      .finally(() => {
        setLoadingBookPages(false);
      });
  }, [selectedBookReader]);

  // Automatically sync loadedBookPages updates (like translations) to sessionStorage cache
  useEffect(() => {
    if (!selectedBookReader) return;
    const bookId = selectedBookReader._id || selectedBookReader.id;
    if (!bookId || loadedBookPages.length === 0) return;
    try {
      sessionStorage.setItem(`book_pages:${bookId}`, JSON.stringify(loadedBookPages));
    } catch (storageErr) {
      console.warn("[Library-Reader] Failed to sync loadedBookPages to sessionStorage:", storageErr);
    }
  }, [loadedBookPages, selectedBookReader]);

  // Effect to apply pendingNavigatePage once pages load/settle
  useEffect(() => {
    if (selectedBookReader && pendingNavigatePage !== null && !loadingBookPages) {
      const bookId = (selectedBookReader._id || selectedBookReader.id || "").toString().trim().toLowerCase();
      const realPages = (loadedBookPages || []).filter((p: any) => {
        const pBookId = (p.book_id || p.bookId || "").toString().trim().toLowerCase();
        return pBookId === bookId;
      });
      
      const isStaticBook = !selectedBookReader.isUserUpload && 
        ["math", "science", "arabic"].includes((selectedBookReader.subject || "").toLowerCase());

      const loadFinished = !loadingBookPages;

      if (realPages.length > 0 || isStaticBook || (loadFinished && loadedBookPages.length === 0)) {
        const allPages = getAllPages(selectedBookReader, loadedBookPages);
        if (allPages.length > 0) {
          // A cited [pN] refers to the page LABELLED N (its real page_number). Navigate by
          // matching page_number first so a cover / front-matter offset no longer makes
          // [p100] land on p99; fall back to the clamped positional index when there is no
          // exact match (contiguous books are unaffected).
          let targetPage = Math.min(Math.max(1, pendingNavigatePage), allPages.length);
          const matchIdx = allPages.findIndex((p: any) => Number(p.page_number ?? p.pageNum) === Number(pendingNavigatePage));
          if (matchIdx >= 0) {
            targetPage = matchIdx + 1;
          }
          console.log(`[Navigation-Race-Fix] Pages settled. Cited page ${pendingNavigatePage} -> reader index ${targetPage}`);
          setReaderCurrentPage(targetPage);
          setPendingNavigatePage(null);
        }
      }
    }
  }, [loadedBookPages, selectedBookReader, pendingNavigatePage, loadingBookPages]);

  const [dynamicMaxUploadSize, setDynamicMaxUploadSize] = useState<number>(2);

  useEffect(() => {
    authedFetch("/api/admin/config")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.config && data.config.maxUploadSize) {
          setDynamicMaxUploadSize(Number(data.config.maxUploadSize));
        }
      })
      .catch((err) => console.error("Error loading admin config in home page:", err));
  }, []);

  // Synchronize Book and Page Context from active reader to global StickyChat
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (selectedBookReader) {
        const allPages = getAllPages(selectedBookReader, loadedBookPages);
        const activePage = allPages[readerCurrentPage - 1] || allPages[0] || null;
        
        window.dispatchEvent(new CustomEvent("fahemBookContext", {
          detail: {
            book: selectedBookReader,
            currentPage: readerCurrentPage,
            totalPages: allPages.length || 1,
            chapterTitleEn: activePage?.chapterTitleEn || "",
            chapterTitleAr: activePage?.chapterTitleAr || "",
            titleEn: activePage?.titleEn || "",
            titleAr: activePage?.titleAr || "",
            contentEn: activePage?.contentEn || "",
            contentAr: activePage?.contentAr || "",
            translationLanguage: translationLanguage
          }
        }));
      } else {
        window.dispatchEvent(new CustomEvent("fahemBookContext", { detail: null }));
      }
    }
  }, [selectedBookReader, readerCurrentPage, loadedBookPages, language, translationLanguage]);

  // Deep-linking: listener for the custom navigate event
  useEffect(() => {
    const handleNavigateBook = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { bookId, page } = customEvent.detail;
      if (!bookId) return;

      console.log(`[Deep-Linking] Received fahemNavigateBook event for bookId: "${bookId}", page: ${page}`);

      const currentBookId = selectedBookReader?._id || selectedBookReader?.id;
      const isSameBook = currentBookId === bookId;

      // 1. Search in dynamicBooks
      const matchedBook = (dynamicBooks || []).find(b => b._id === bookId || b.id === bookId || b.subject === bookId);
      if (matchedBook) {
        if (!isSameBook) {
          setLoadedBookPages([]);
          setLoadingBookPages(true);
          setSelectedBookReader(matchedBook);
        }
        setPendingNavigatePage(page || 1);
        setActiveTab("library");
      } else {
        // 2. Fallback check for static books
        const staticBooks: Record<string, any> = {
          "Math": { _id: "Math", id: "Math", title: "Advanced Mathematics Grade 9", titleEn: "Advanced Mathematics Grade 9", titleAr: "الرياضيات المتقدمة - الصف التاسع", subject: "Math" },
          "Science": { _id: "Science", id: "Science", title: "Comprehensive Chemistry Handbook", titleEn: "Comprehensive Chemistry Handbook", titleAr: "كتاب الكيمياء الشامل والمبسط", subject: "Science" },
          "Arabic": { _id: "Arabic", id: "Arabic", title: "Grammar & Arabic Linguistics Keys", titleEn: "Grammar & Arabic Linguistics Keys", titleAr: "مفاتيح النحو وقواعد الصرف المبسطة", subject: "Arabic" }
        };
        const staticBook = staticBooks[bookId];
        if (staticBook) {
          if (!isSameBook) {
            setLoadedBookPages([]);
            setLoadingBookPages(true);
            setSelectedBookReader(staticBook);
          }
          setPendingNavigatePage(page || 1);
          setActiveTab("library");
        }
      }
    };

    window.addEventListener("fahemNavigateBook", handleNavigateBook);
    return () => {
      window.removeEventListener("fahemNavigateBook", handleNavigateBook);
    };
  }, [dynamicBooks, selectedBookReader]);

  // Global listener for navigating to specific tabs and updating subject context
  useEffect(() => {
    const handleNavigateTab = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.tab) {
        setActiveTab(detail.tab);
        if (detail.subjectId) {
          setSelectedSubjectId(detail.subjectId);
        }
      }
    };
    window.addEventListener("fahemNavigateTab", handleNavigateTab);
    return () => {
      window.removeEventListener("fahemNavigateTab", handleNavigateTab);
    };
  }, []);

  // Refresh the Daily Token Budget widget whenever the companion finishes a turn.
  useEffect(() => {
    const handleTokensUpdated = () => {
      if (user?.uid) {
        fetchUserTokenStats(user.uid);
      }
    };
    window.addEventListener("fahem_tokens_updated", handleTokensUpdated);
    return () => {
      window.removeEventListener("fahem_tokens_updated", handleTokensUpdated);
    };
  }, [user]);

  // Deep-linking: initial URL query load on app startup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      
      // 1. Restore active tab
      const tabParam = params.get("tab");
      if (tabParam) {
        setActiveTab(tabParam);
      }
      
      // 2. Restore selected subject ID
      const subjectParam = params.get("subject") || params.get("subjectId") || params.get("subject_id");
      if (subjectParam) {
        setSelectedSubjectId(subjectParam);
      } else {
        setSelectedSubjectId("");
      }

      // 3. Keep track of initial book/page to hydrate once books load
      const bookId = params.get("book") || params.get("bookId") || params.get("book_id");
      const pageParam = params.get("page");
      if (bookId) {
        setInitialBookId(bookId);
        if (pageParam) {
          setInitialPage(parseInt(pageParam, 10) || 1);
        }
      } else {
        setIsHydrated(true); // No book to wait for, we are ready!
      }
    }
  }, []);

  // Deep-linking: handle initial book navigation once dynamicBooks are ready
  useEffect(() => {
    if (dynamicBooks.length > 0 && initialBookId && !isHydrated) {
      console.log(`[Deep-Linking] Hydrating book from URL parameters: bookId=${initialBookId}, page=${initialPage || 1}`);
      const matchedBook = dynamicBooks.find(b => b._id === initialBookId || b.id === initialBookId || b.subject === initialBookId);
      if (matchedBook) {
        setSelectedBookReader(matchedBook);
        setPendingNavigatePage(initialPage || 1);
        setActiveTab("library");
      } else {
        // Fallback check for static books
        const staticBooks: Record<string, any> = {
          "Math": { _id: "Math", id: "Math", title: "Advanced Mathematics Grade 9", titleEn: "Advanced Mathematics Grade 9", titleAr: "الرياضيات المتقدمة - الصف التاسع", subject: "Math" },
          "Science": { _id: "Science", id: "Science", title: "Comprehensive Chemistry Handbook", titleEn: "Comprehensive Chemistry Handbook", titleAr: "كتاب الكيمياء الشامل والمبسط", subject: "Science" },
          "Arabic": { _id: "Arabic", id: "Arabic", title: "Grammar & Arabic Linguistics Keys", titleEn: "Grammar & Arabic Linguistics Keys", titleAr: "مفاتيح النحو وقواعد الصرف المبسطة", subject: "Arabic" }
        };
        const staticBook = staticBooks[initialBookId];
        if (staticBook) {
          setSelectedBookReader(staticBook);
          setPendingNavigatePage(initialPage || 1);
          setActiveTab("library");
        }
      }
      setIsHydrated(true); // Hydration completes!
    } else if (dynamicBooks.length > 0 && !initialBookId && !isHydrated) {
      // dynamicBooks loaded but there is no book parameter in the URL
      setIsHydrated(true);
    }
  }, [dynamicBooks, initialBookId, initialPage, isHydrated]);

  // Deep-linking: sync current tab, subject, and viewer state back to browser URL string
  useEffect(() => {
    if (!isHydrated) return; // EARLY RETURN: block writing back to URL until hydration is complete!

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      let updated = false;

      // Sync active tab
      if (params.get("tab") !== activeTab) {
        params.set("tab", activeTab);
        updated = true;
      }

      // Sync selected subject
      if (selectedSubjectId) {
        if (params.get("subject") !== selectedSubjectId) {
          params.set("subject", selectedSubjectId);
          updated = true;
        }
      } else {
        if (params.has("subject")) {
          params.delete("subject");
          updated = true;
        }
      }

      // Sync book reader and current page
      if (selectedBookReader) {
        const bookId = selectedBookReader._id || selectedBookReader.id;
        if (bookId) {
          if (params.get("book") !== bookId) {
            params.set("book", bookId);
            updated = true;
          }
          const pageStr = readerCurrentPage.toString();
          if (params.get("page") !== pageStr) {
            params.set("page", pageStr);
            updated = true;
          }
          if (params.has("bookId")) {
            params.delete("bookId");
            updated = true;
          }
        }
      } else {
        if (params.has("book") || params.has("bookId") || params.has("page")) {
          params.delete("book");
          params.delete("bookId");
          params.delete("page");
          updated = true;
        }
      }

      if (updated) {
        const newSearch = params.toString();
        const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
        window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
      }
    }
  }, [activeTab, selectedSubjectId, selectedBookReader, readerCurrentPage, isHydrated]);

  const [mentionType, setMentionType] = useState<"subject" | "book" | "command" | null>(null);
  const [mentionSearch, setMentionQuery] = useState<string>("");
  const [showMentionsDropdown, setShowMentionsDropdown] = useState<boolean>(false);
  const [readerPrompt, setReaderPrompt] = useState<string>("");
  const [readerMessages, setReaderMessages] = useState<any[]>([]);
  const [readerLoading, setReaderLoading] = useState<boolean>(false);

  const getMentionOptions = () => {
    if (mentionType === "subject") {
      const opts = [
        { id: "@math", label: language === "ar" ? "➕ الرياضيات" : "📊 Math", desc: language === "ar" ? "مواضيع الجبر والإحصاء" : "Algebra & Statistics" },
        { id: "@science", label: language === "ar" ? "🧪 العلوم" : "🧬 Science", desc: language === "ar" ? "الأحياء والفيزياء والكيمياء" : "Biology, Physics, Chem" },
        { id: "@arabic", label: language === "ar" ? "📖 اللغة العربية" : "✍️ Arabic", desc: language === "ar" ? "قواعد النحو واللغة" : "Arabic Linguistics & Grammar" },
        { id: "@history", label: language === "ar" ? "🌍 التاريخ" : "🏛️ History", desc: language === "ar" ? "الدراسات الاجتماعية والتاريخية" : "Modern History & Social Studies" }
      ];
      return opts.filter(o => o.id.toLowerCase().includes(mentionSearch.toLowerCase()));
    }
    if (mentionType === "book") {
      const opts = [
        { id: "#college-algebra", label: "📚 College Algebra 2e", desc: language === "ar" ? "مرجع الجبر من OpenStax" : "OpenStax Algebra Textbook" },
        { id: "#chemistry-handbook", label: "🧪 Chemistry 2e", desc: language === "ar" ? "مرجع الكيمياء العامة" : "OpenStax Chemistry Volume" },
        { id: "#arabic-grammar", label: "✍️ كتاب النحو المبسط", desc: language === "ar" ? "كتاب شرح قواعد اللغة" : "Simplified Arabic Grammar Rules" },
        { id: "#middleeast-history", label: "🌍 Middle East History", desc: language === "ar" ? "مرجع التاريخ الحديث والمعاصر" : "Modern Middle East History Guide" }
      ];
      return opts.filter(o => o.id.toLowerCase().includes(mentionSearch.toLowerCase()));
    }
    if (mentionType === "command") {
      const opts = [
        { id: "/explain", label: "💡 Explain Step-by-Step", desc: language === "ar" ? "شرح وافٍ ومفصل خطوة بخطوة" : "Detailed pedagogical explanation" },
        { id: "/summary", label: "📝 Generate Summary", desc: language === "ar" ? "تخليص عالي الكثافة (الخلاصة والزتونة)" : "High-density concepts & formulas sheet" },
        { id: "/practice", label: "✍️ Active Recall Challenge", desc: language === "ar" ? "سؤال تفاعلي يشجع المذاكرة النشطة" : "Generate interactive question to solve" },
        { id: "/quiz", label: "⚡ Quick Mastery Quiz", desc: language === "ar" ? "اختبار قصير من 3 أسئلة مفاهيمية" : "Generate 3-question conceptual quiz" }
      ];
      return opts.filter(o => o.id.toLowerCase().includes(mentionSearch.toLowerCase()));
    }
    return [];
  };

  const handleSelectMention = (optionId: string) => {
    const words = readerPrompt.split(/\s+/);
    words[words.length - 1] = optionId;
    setReaderPrompt(words.join(" ") + " ");
    setShowMentionsDropdown(false);
    setMentionType(null);
    setMentionQuery("");
  };

  const formatMessageText = (txt: string) => {
    if (!txt) return "";
    
    // Warm structured parser that breaks text by lines and formats markdown, headings, bold, bullet points
    const lines = txt.split("\n");
    return lines.map((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={lineIdx} style={{ height: "0.5rem" }} />;
      }

      // Headers (e.g. ### Header or ## Header)
      if (trimmed.startsWith("###")) {
        return <h4 key={lineIdx} style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.5rem", marginBottom: "0.25rem", textAlign: "start" }}>{trimmed.slice(3).trim()}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={lineIdx} style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.75rem", marginBottom: "0.35rem", textAlign: "start" }}>{trimmed.slice(2).trim()}</h3>;
      }

      // Check for bullet lists
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const rest = trimmed.substring(2);
        return (
          <ul key={lineIdx} style={{ margin: "0.25rem 0 0.25rem 1.25rem", padding: 0, listStyleType: "disc", textAlign: "start" }}>
            <li style={{ fontSize: "0.85rem", color: "inherit", lineHeight: "1.5" }}>
              {parseInlineMarkdown(rest)}
            </li>
          </ul>
        );
      }

      // Check for numbered lists
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        const rest = numMatch[2];
        return (
          <ol key={lineIdx} style={{ margin: "0.25rem 0 0.25rem 1.25rem", padding: 0, listStyleType: "decimal", textAlign: "start" }}>
            <li style={{ fontSize: "0.85rem", color: "inherit", lineHeight: "1.5" }}>
              {parseInlineMarkdown(rest)}
            </li>
          </ol>
        );
      }

      // Inline code or formulas
      if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
        const rest = trimmed.slice(1, -1);
        return (
          <div key={lineIdx} style={{ margin: "0.4rem 0", padding: "0.4rem 0.6rem", borderRadius: "8px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)", fontFamily: "monospace", fontSize: "0.8rem", color: "var(--primary)", overflowX: "auto", textAlign: "start" }}>
            {rest}
          </div>
        );
      }

      return (
        <p key={lineIdx} style={{ margin: "0.25rem 0", fontSize: "0.85rem", lineHeight: "1.5", textAlign: "start" }}>
          {parseInlineMarkdown(trimmed)}
        </p>
      );
    });
  };

  const parseInlineMarkdown = (text: string) => {
    // Support bolding (**text**), code (`text`), standard markdown links ([text](url)), and book page citations [book_id:pN] or [pN]
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[[^\]]+\]\([^)]+\)|\[[^\]:]+\s*:\s*[pP]\d+\]|\[[pP]\d+\])/gi);
    return parts.map((part, pIdx) => {
      if (!part) return null;
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx} style={{ color: "var(--primary)", fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={pIdx} style={{ background: "rgba(16, 107, 163, 0.08)", padding: "1px 4px", borderRadius: "4px", fontSize: "0.9em", color: "var(--primary)", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
      }
      if (part.startsWith("[") && part.includes("](")) {
        const closeBracketIdx = part.indexOf("](");
        const linkText = part.slice(1, closeBracketIdx);
        const linkUrl = part.slice(closeBracketIdx + 2, -1);
        
        if (linkUrl.includes("bookId=") || linkUrl.includes("page=")) {
          let bookId = "";
          let pageNum = 1;
          try {
            const urlObj = new URL(linkUrl.startsWith("?") ? `http://dummy.com${linkUrl}` : linkUrl);
            bookId = urlObj.searchParams.get("bookId") || "";
            const pageParam = urlObj.searchParams.get("page");
            if (pageParam) {
              pageNum = parseInt(pageParam, 10) || 1;
            }
          } catch (e) {
            const bookMatch = linkUrl.match(/bookId=([^&]+)/);
            const pageMatch = linkUrl.match(/page=(\d+)/);
            if (bookMatch) bookId = decodeURIComponent(bookMatch[1]);
            if (pageMatch) pageNum = parseInt(pageMatch[1], 10) || 1;
          }
          
          bookId = bookId.replace(/[^a-zA-Z0-9_\u0600-\u06FF\s-]/g, "").trim();
          
          let cleanLinkText = linkText;
          const textMatch = linkText.match(/(?:^|\[)?([^\]:]+)\s*:\s*[pP](\d+)(?:\])?$/i);
          if (textMatch) {
            const matchedPage = textMatch[2];
            cleanLinkText = `[p${matchedPage}]`;
          } else if (/^[pP](\d+)$/i.test(linkText)) {
            cleanLinkText = `[p${linkText.match(/[pP](\d+)/i)![1]}]`;
          }
          
          return (
            <a
              key={pIdx}
              href={linkUrl}
              onClick={(e) => {
                e.preventDefault();
                const event = new CustomEvent("fahemNavigateBook", {
                  detail: { bookId, page: pageNum }
                });
                window.dispatchEvent(event);
              }}
              style={{
                color: "var(--secondary, #d4af37)",
                textDecoration: "underline",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                background: "rgba(212, 175, 55, 0.08)",
                padding: "2px 6px",
                borderRadius: "6px",
                border: "1px solid rgba(212, 175, 55, 0.15)",
                transition: "all 0.2s"
              }}
              title={`Go to ${bookId} - Page ${pageNum}`}
            >
              📖 {cleanLinkText}
            </a>
          );
        }
        return (
          <a
            key={pIdx}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)", textDecoration: "underline" }}
          >
            {linkText}
          </a>
        );
      }
      
      const customMatch = part.match(/^\[([^\]:]+)\s*:\s*([pP])(\d+)\]$/i);
      if (customMatch) {
        const bookId = customMatch[1].trim();
        const pageNum = parseInt(customMatch[3], 10) || 1;
        const displayLabel = `[p${pageNum}]`;
        return (
          <a
            key={pIdx}
            href={`?bookId=${bookId}&page=${pageNum}`}
            onClick={(e) => {
              e.preventDefault();
              const event = new CustomEvent("fahemNavigateBook", {
                detail: { bookId, page: pageNum }
              });
              window.dispatchEvent(event);
            }}
            style={{
              color: "var(--secondary, #d4af37)",
              textDecoration: "underline",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              background: "rgba(212, 175, 55, 0.08)",
              padding: "2px 6px",
              borderRadius: "6px",
              border: "1px solid rgba(212, 175, 55, 0.15)",
              transition: "all 0.2s"
            }}
            title={`Go to Book ${bookId}, Page ${pageNum}`}
          >
            📖 {displayLabel}
          </a>
        );
      }
      if (/^\[[pP]\d+\]$/.test(part)) {
        const pageNum = parseInt(part.slice(2, -1), 10) || 1;
        const bookId = selectedBookReader ? (selectedBookReader._id || selectedBookReader.id || "") : "";
        return (
          <a
            key={pIdx}
            href={`?bookId=${bookId}&page=${pageNum}`}
            onClick={(e) => {
              e.preventDefault();
              const event = new CustomEvent("fahemNavigateBook", {
                detail: { bookId, page: pageNum }
              });
              window.dispatchEvent(event);
            }}
            style={{
              color: "var(--secondary, #d4af37)",
              textDecoration: "underline",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              background: "rgba(212, 175, 55, 0.08)",
              padding: "2px 6px",
              borderRadius: "6px",
              border: "1px solid rgba(212, 175, 55, 0.15)",
              transition: "all 0.2s"
            }}
            title={`Go to Page ${pageNum}`}
          >
            📖 {part}
          </a>
        );
      }

      return part;
    });
  };

  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [practiceSubject, setPracticeSubject] = useState("Math");
  const [generatedQuestion, setGeneratedQuestion] = useState<string>("");
  const [practiceAnswer, setPracticeAnswer] = useState<string>("");
  const [practiceResult, setPracticeResult] = useState<string>("");
  const [practiceLoading, setPracticeLoading] = useState<boolean>(false);

  // --- MULTI-INSTANCE STATE ACADEMIC SPACES ---
  // Local history audit log for space activities
  const [spaceHistory, setSpaceHistory] = useState<any[]>([
    { actionEn: "Initialized Academic Spaces Hub", actionAr: "تم تهيئة مركز مساحات المذاكرة النشطة", timestamp: new Date(Date.now() - 300000) }
  ]);
  const addSpaceHistory = (actionEn: string, actionAr: string) => {
    setSpaceHistory(prev => [
      { actionEn, actionAr, timestamp: new Date() },
      ...prev
    ]);
    if (user) {
      authedFetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "space_history",
          status: "success",
          details: { actionEn, actionAr }
        })
      }).catch(err => console.error("Error saving space history activity:", err));
    }
  };

  const fetchSpaceHistory = async (userId: string) => {
    if (!userId) return;
    try {
      const res = await authedFetch(`/api/activity?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        const activities = data.activities || [];

        // Compute real XP / level / day-streak for the nav meters from the activity log.
        try {
          const totalXp = activities
            .filter((a: any) => a.action === "practice_session")
            .reduce((s: number, a: any) => s + (Number(a.details?.xpGained) || 0), 0);
          setNavXp(totalXp % 100);
          setNavLevel(Math.floor(totalXp / 100) + 1);
          const days = new Set<string>();
          activities.forEach((a: any) => { if (a.timestamp) days.add(new Date(a.timestamp).toISOString().slice(0, 10)); });
          const countStreakFrom = (start: Date): number => {
            let n = 0; const d = new Date(start);
            while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
            return n;
          };
          let streak = countStreakFrom(new Date());
          if (streak === 0) { const y = new Date(); y.setDate(y.getDate() - 1); streak = countStreakFrom(y); }
          setNavStreak(streak);
        } catch (e) { /* non-fatal */ }
        const loadedHistory = activities
          .filter((act: any) => act.action === "space_history" || act.action === "practice_session")
          .map((act: any) => {
            if (act.action === "space_history") {
              return {
                actionEn: act.details?.actionEn || (typeof act.details === "string" ? act.details : ""),
                actionAr: act.details?.actionAr || (typeof act.details === "string" ? act.details : ""),
                timestamp: new Date(act.timestamp)
              };
            } else { // practice_session
              const details = act.details || {};
              const isCorrect = act.status === "correct" || details.isCorrect === true;
              const xp = details.xpGained || 0;
              return {
                actionEn: `Answered Quest Challenge: ${isCorrect ? "Correct (+" + xp + " XP)" : "Incorrect"}`,
                actionAr: `أجاب على تحدي الممارسة بشكل ${isCorrect ? "صحيح (+" + xp + " XP)" : "خاطئ"}`,
                timestamp: new Date(act.timestamp)
              };
            }
          });
        if (loadedHistory.length > 0) {
          setSpaceHistory(loadedHistory);
        }
      }
    } catch (err) {
      console.error("Failed to fetch space history:", err);
    }
  };

  // 1. Practice Spaces State
  const [activePractices, setActivePractices] = useState<any[]>([
    {
      id: "practice_1",
      nameEn: "Algebra & Inversion Workstation",
      nameAr: "مساحة ممارسة الجبر ومعكوس المصفوفات",
      subject: "Math",
      generatedQuestion: "What is the determinant of a 2x2 matrix [[3, 5], [1, 2]]?",
      generatedQuestionAr: "ما هي قيمة محدد المصفوفة 2×2 التالية: [[3، 5]، [1، 2]]؟",
      practiceAnswer: "",
      practiceResult: ""
    },
    {
      id: "practice_2",
      nameEn: "Science Active Recall Challenge",
      nameAr: "مساحة مراجعة العلوم والذرة والكم",
      subject: "Science",
      generatedQuestion: "Explain the Pauli Exclusion Principle in your own words.",
      generatedQuestionAr: "اشرح مبدأ استبعاد باولي بأسلوبك الخاص.",
      practiceAnswer: "",
      practiceResult: ""
    }
  ]);
  const [selectedPracticeId, setSelectedPracticeId] = useState<string>("practice_1");
  const currentPractice = activePractices.find(p => p.id === selectedPracticeId) || activePractices[0];

  // Sync selected Practice space into local inputs
  useEffect(() => {
    if (currentPractice) {
      setPracticeSubject(currentPractice.subject || "Math");
      setGeneratedQuestion(language === "ar" ? (currentPractice.generatedQuestionAr || currentPractice.generatedQuestion) : currentPractice.generatedQuestion);
      setPracticeAnswer(currentPractice.practiceAnswer || "");
      setPracticeResult(currentPractice.practiceResult || "");
    }
  }, [selectedPracticeId, language]);

  // Sync back local Practice changes to multi-instance state array
  useEffect(() => {
    if (selectedPracticeId) {
      setActivePractices(prev => prev.map(p => {
        if (p.id === selectedPracticeId) {
          return {
            ...p,
            practiceAnswer,
            generatedQuestion,
            practiceResult,
            subject: practiceSubject
          };
        }
        return p;
      }));
    }
  }, [practiceAnswer, generatedQuestion, practiceResult, practiceSubject, selectedPracticeId]);

  const saveCurrentPracticeState = (answer: string, result: string) => {
    setActivePractices(prev => prev.map(p => {
      if (p.id === selectedPracticeId) {
        return { ...p, practiceAnswer: answer, practiceResult: result };
      }
      return p;
    }));
  };

  // 2. Plan Spaces State
  const [activePlans, setActivePlans] = useState<any[]>([
    {
      id: "plan_1",
      nameEn: "Main School Curriculum Plan",
      nameAr: "الخطة المدرسية العامة للمنهج",
      tasks: [
        { id: "t1", textAr: "دراسة درس المتطابقات المثلثية وحل 10 مسائل", textEn: "Study Trigonometric Functions and solve 10 exercises", checked: true, dayAr: "السبت", dayEn: "Sat" },
        { id: "t2", textAr: "مراجعة قواعد كتابة الهمزة المتوسطة وحل الكراسة", textEn: "Review Arabic spelling rules and complete exercises", checked: true, dayAr: "الأحد", dayEn: "Sun" },
        { id: "t3", textAr: "تجربة اختبار معمل الكيمياء عن التفاعلات الطاردة للحرارة", textEn: "Perform chemistry virtual experiment on exothermic reactions", checked: false, dayAr: "الإثنين", dayEn: "Mon" },
        { id: "t4", textAr: "تلخيص الفصل الرابع من تاريخ الشرق الأوسط عبر الزتونة", textEn: "Summarize Chapter 4 of Middle East History via Zatona AI", checked: false, dayAr: "الثلاثاء", dayEn: "Tue" },
        { id: "t5", textAr: "التحضير لاختبار مادة العلوم القصير والتدرب على الفلاش كارد", textEn: "Prepare for Science mock assessment and practice flashcards", checked: false, dayAr: "الأربعاء", dayEn: "Wed" }
      ]
    },
    {
      id: "plan_2",
      nameEn: "Self-Study Advanced Programming",
      nameAr: "خطة مهارات البرمجة والذكاء الاصطناعي",
      tasks: [
        { id: "t6", textAr: "بناء واجهات تفاعلية مذهلة بالكامل لـ Fahem", textEn: "Build premium interactive interfaces for Fahem", checked: false, dayAr: "الخميس", dayEn: "Thu" },
        { id: "t7", textAr: "ربط قاعدة البيانات واستعلام السجلات المباشرة للأمان", textEn: "Connect DB and query real-time security logs", checked: true, dayAr: "الجمعة", dayEn: "Fri" }
      ]
    }
  ]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("plan_1");
  const currentPlan = activePlans.find(p => p.id === selectedPlanId) || activePlans[0];
  const planTasks = currentPlan?.tasks || [];

  const handleToggleTask = (planId: string, taskId: string) => {
    setActivePlans(prev => prev.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          tasks: p.tasks.map((t: any) => t.id === taskId ? { ...t, checked: !t.checked } : t)
        };
      }
      return p;
    }));
    addSpaceHistory("Toggled task checkbox in plan", "تم تغيير حالة المهمة في خطة المذاكرة");
  };

  // 3. Timetables Spaces State (Replaces simple timetableEvents)
  const [activeTimetables, setActiveTimetables] = useState<any[]>([
    {
      id: "timetable_1",
      nameEn: "Spring Term Weekly Schedule",
      nameAr: "جدول الحصص للفصل الدراسي الثاني",
      events: [
        { id: 1, subject: "Mathematics", subjectAr: "الرياضيات", day: "Monday", dayAr: "الإثنين", time: "09:00 - 10:30", room: "Room 102" },
        { id: 2, subject: "Physics", subjectAr: "الفيزياء", day: "Monday", dayAr: "الإثنين", time: "11:00 - 12:30", room: "Lab A" },
        { id: 3, subject: "Arabic Language", subjectAr: "اللغة العربية", day: "Tuesday", dayAr: "الثلاثاء", time: "09:00 - 10:30", room: "Room 105" },
        { id: 4, subject: "Biology", subjectAr: "الأحياء", day: "Wednesday", dayAr: "الأربعاء", time: "10:00 - 11:30", room: "Lab B" },
        { id: 5, subject: "Computer Science", subjectAr: "علوم الحاسب", day: "Thursday", dayAr: "الخميس", time: "12:00 - 13:30", room: "Room 201" }
      ]
    },
    {
      id: "timetable_2",
      nameEn: "Summer Academy Class Timetable",
      nameAr: "جدول دورات الأكاديمية الصيفية المكثفة",
      events: [
        { id: 6, subject: "Machine Learning Introduction", subjectAr: "مقدمة في تعلم الآلة والذكاء الاصطناعي", day: "Sunday", dayAr: "الأحد", time: "15:00 - 17:00", room: "AI Lab" }
      ]
    }
  ]);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>("timetable_1");
  const currentTimetable = activeTimetables.find(t => t.id === selectedTimetableId) || activeTimetables[0];
  const timetableEvents = currentTimetable?.events || [];

  const setTimetableEvents = (newEventsOrFunc: any) => {
    setActiveTimetables(prev => prev.map(t => {
      if (t.id === selectedTimetableId) {
        const updatedEvents = typeof newEventsOrFunc === "function" ? newEventsOrFunc(t.events) : newEventsOrFunc;
        return { ...t, events: updatedEvents };
      }
      return t;
    }));
    addSpaceHistory("Updated timetable events", "تم تعديل جدول المواعيد والحصص");
  };


  // 5. Zatonas Spaces State
  // FC7.10: this MUST start with a default space. When it was empty, currentZatona was undefined,
  // zatonaPrompt resolved to "" and setZatonaPrompt mapped over an empty array (a no-op) — so the
  // Zatona "additional directions" textarea silently discarded every keystroke (looked uneditable).
  const [activeZatonas, setActiveZatonas] = useState<any[]>([
    { id: "zatona_1", name: "Zatona 1", zatonaPrompt: "", zatonaResult: "", zatonaResultAr: "" }
  ]);
  const [selectedZatonaId, setSelectedZatonaId] = useState<string>("zatona_1");
  const currentZatona = activeZatonas.find(z => z.id === selectedZatonaId) || activeZatonas[0];
  const [zatonaLoading, setZatonaLoading] = useState(false);

  const zatonaPrompt = currentZatona?.zatonaPrompt || "";
  const zatonaResult = language === "ar" 
    ? (currentZatona?.zatonaResultAr || currentZatona?.zatonaResult || "")
    : (currentZatona?.zatonaResult || currentZatona?.zatonaResultAr || "");

  const setZatonaPrompt = (valOrFunc: any) => {
    setActiveZatonas(prev => prev.map(z => {
      if (z.id === selectedZatonaId) {
        const nextVal = typeof valOrFunc === "function" ? valOrFunc(z.zatonaPrompt) : valOrFunc;
        return { ...z, zatonaPrompt: nextVal };
      }
      return z;
    }));
  };

  const setZatonaResult = (valOrFunc: any) => {
    setActiveZatonas(prev => prev.map(z => {
      if (z.id === selectedZatonaId) {
        const nextVal = typeof valOrFunc === "function" ? valOrFunc(z.zatonaResult) : valOrFunc;
        if (nextVal === "") {
          return { ...z, zatonaResult: "", zatonaResultAr: "" };
        }
        if (language === "ar") {
          return { ...z, zatonaResultAr: nextVal };
        } else {
          return { ...z, zatonaResult: nextVal };
        }
      }
      return z;
    }));
    addSpaceHistory("Updated Zatona AI summary result", "تم تحديث ملخص الزتونة المستخرج");
  };

  // State controls for Space Editing / Creation modals
  const [spaceModalConfig, setSpaceModalConfig] = useState<{
    isOpen: boolean;
    type: "new" | "edit";
    tab: "practice" | "plan" | "timetable" | "zatona";
    spaceId?: string;
    nameEn: string;
    nameAr: string;
    extraSubject?: string;
  }>({
    isOpen: false,
    type: "new",
    tab: "practice",
    nameEn: "",
    nameAr: ""
  });

  // --- ACADEMIC SPACES CRUD & UI HELPERS ---
  const renderSpaceSelectorBar = (tab: "practice" | "plan" | "timetable" | "zatona") => {
    // The "Active Academic Space" workstation bar is removed from Practice, Zatona, Plan and
    // Schedule. Use a boolean guard (not a direct `tab ===` return) so TypeScript does not narrow
    // the `tab` union for the rest of the function below.
    const hideSpaceBar: boolean = tab === "practice" || tab === "zatona" || tab === "plan" || tab === "timetable";
    if (hideSpaceBar) return null;
    let list: any[] = [];
    let selectedId = "";
    let setSelectedId: (id: string) => void = () => {};
    let tabTitleEn = "";
    let tabTitleAr = "";

    if (tab === "practice") {
      list = activePractices;
      selectedId = selectedPracticeId;
      setSelectedId = setSelectedPracticeId;
      tabTitleEn = "Active Recall Practice Workstations";
      tabTitleAr = "مساحات المذاكرة والممارسة النشطة";
    } else if (tab === "plan") {
      list = activePlans;
      selectedId = selectedPlanId;
      setSelectedId = setSelectedPlanId;
      tabTitleEn = "Active Planner Blueprints";
      tabTitleAr = "مساحات خطط المذاكرة النشطة";
    } else if (tab === "timetable") {
      list = activeTimetables;
      selectedId = selectedTimetableId;
      setSelectedId = setSelectedTimetableId;
      tabTitleEn = "Class Schedule Planners";
      tabTitleAr = "جداول الحصص الدراسية";
    } else if (tab === "zatona") {
      list = activeZatonas;
      selectedId = selectedZatonaId;
      setSelectedId = setSelectedZatonaId;
      tabTitleEn = "Zatona AI Summary Spaces";
      tabTitleAr = "مساحات عصر ملخصات الزتونة";
    }

    const activeSpace = list.find(item => item.id === selectedId) || list[0];

    const handleCreateNew = () => {
      setSpaceModalConfig({
        isOpen: true,
        type: "new",
        tab,
        nameEn: "",
        nameAr: "",
        extraSubject: "Math"
      });
    };

    const handleEditSelected = () => {
      if (!activeSpace) return;
      setSpaceModalConfig({
        isOpen: true,
        type: "edit",
        tab,
        spaceId: activeSpace.id,
        nameEn: activeSpace.nameEn || "",
        nameAr: activeSpace.nameAr || "",
        extraSubject: activeSpace.subject || "Math"
      });
    };

    const handleDeleteSelected = () => {
      if (!activeSpace) return;
      if (list.length <= 1) {
        alert(language === "ar" 
          ? "تنبيه: يجب أن تظل هناك مساحة نشطة واحدة على الأقل!" 
          : "Notice: You must keep at least one active workspace!");
        return;
      }
      const confirmDelete = window.confirm(language === "ar"
        ? `هل أنت متأكد من رغبتك في حذف مساحة "${activeSpace.nameAr || activeSpace.nameEn}"؟`
        : `Are you sure you want to delete workspace "${activeSpace.nameEn || activeSpace.nameAr}"?`);
      if (!confirmDelete) return;

      const updatedList = list.filter(item => item.id !== activeSpace.id);
      
      if (tab === "practice") {
        setActivePractices(updatedList);
        setSelectedPracticeId(updatedList[0].id);
      } else if (tab === "plan") {
        setActivePlans(updatedList);
        setSelectedPlanId(updatedList[0].id);
      } else if (tab === "timetable") {
        setActiveTimetables(updatedList);
        setSelectedTimetableId(updatedList[0].id);
      } else if (tab === "zatona") {
        setActiveZatonas(updatedList);
        setSelectedZatonaId(updatedList[0].id);
      }

      addSpaceHistory(
        `Deleted active workspace: ${activeSpace.nameEn}`,
        `تم حذف مساحة العمل النشطة: ${activeSpace.nameAr || activeSpace.nameEn}`
      );
    };

    return (
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "1rem 1.5rem", borderRadius: "16px",
        background: "rgba(255, 255, 255, 0.55)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(16, 107, 163, 0.1)",
        boxShadow: "var(--shadow-sm)",
        flexWrap: "wrap", gap: "1rem", marginBottom: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase" }}>
              {language === "ar" ? "المساحة الأكاديمية النشطة" : "Active Academic Space"}
            </span>
            <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--foreground)" }}>
              {language === "ar" ? tabTitleAr : tabTitleEn}
            </span>
          </div>

          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              addSpaceHistory(
                `Swapped workspace to: ${list.find(item => item.id === e.target.value)?.nameEn}`,
                `تم تبديل مساحة العمل إلى: ${list.find(item => item.id === e.target.value)?.nameAr || list.find(item => item.id === e.target.value)?.nameEn}`
              );
            }}
            style={{
              padding: "0.5rem 2rem 0.5rem 1rem", borderRadius: "12px",
              border: "1px solid rgba(16, 107, 163, 0.15)",
              background: "#ffffff", color: "var(--foreground)",
              fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
              outline: "none", transition: "all 0.2s"
            }}
          >
            {list.map(item => (
              <option key={item.id} value={item.id}>
                {language === "ar" ? (item.nameAr || item.nameEn) : (item.nameEn || item.nameAr)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={handleCreateNew}
            type="button"
            style={{
              padding: "8px 14px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              color: "#ffffff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "0.3rem", transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(16, 107, 163, 0.15)"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <span>➕</span>
            <span>{language === "ar" ? "مساحة جديدة" : "New Space"}</span>
          </button>

          <button
            onClick={handleEditSelected}
            type="button"
            style={{
              padding: "8px 14px", borderRadius: "10px", border: "1px solid rgba(16, 107, 163, 0.2)",
              background: "#ffffff", color: "var(--primary)", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "0.3rem", transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(16, 107, 163, 0.05)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
          >
            <span>✏️</span>
            <span>{language === "ar" ? "تعديل" : "Edit"}</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            type="button"
            style={{
              padding: "8px 14px", borderRadius: "10px", border: "1px solid rgba(211, 47, 47, 0.2)",
              background: "#ffffff", color: "#d32f2f", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "0.3rem", transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(211, 47, 47, 0.05)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
          >
            <span>🗑️</span>
            <span>{language === "ar" ? "حذف" : "Delete"}</span>
          </button>
        </div>
      </div>
    );
  };

  const renderSpaceModal = () => {
    if (!spaceModalConfig.isOpen) return null;

    const { type, tab, nameEn, nameAr, extraSubject, spaceId } = spaceModalConfig;

    const handleSave = (e: React.FormEvent) => {
      e.preventDefault();

      if (!nameEn.trim() || !nameAr.trim()) {
        alert(language === "ar" ? "يرجى تعبئة جميع الحقول المطلوبة!" : "Please fill in all required fields!");
        return;
      }

      if (type === "new") {
        const newId = `${tab}_${Date.now()}`;
        let newItem: any = {
          id: newId,
          nameEn: nameEn.trim(),
          nameAr: nameAr.trim(),
        };

        if (tab === "practice") {
          newItem = {
            ...newItem,
            subject: extraSubject || "Math",
            generatedQuestion: "Welcome to your new practice space! Explain your first concept here.",
            generatedQuestionAr: "مرحباً بك في مساحة التدريب الجديدة! اشرح أول مفهوم رياضي أو علمي هنا.",
            practiceAnswer: "",
            practiceResult: ""
          };
          setActivePractices(prev => [...prev, newItem]);
          setSelectedPracticeId(newId);
        } else if (tab === "plan") {
          newItem = {
            ...newItem,
            tasks: [
              { id: `t_${Date.now()}_1`, textAr: "أول مهمة في مساحة الخطة الجديدة", textEn: "First task in your new planning space", checked: false, dayAr: "السبت", dayEn: "Sat" }
            ]
          };
          setActivePlans(prev => [...prev, newItem]);
          setSelectedPlanId(newId);
        } else if (tab === "timetable") {
          newItem = {
            ...newItem,
            events: []
          };
          setActiveTimetables(prev => [...prev, newItem]);
          setSelectedTimetableId(newId);
        } else if (tab === "zatona") {
          newItem = {
            ...newItem,
            zatonaPrompt: "",
            zatonaResult: "",
            zatonaResultAr: ""
          };
          setActiveZatonas(prev => [...prev, newItem]);
          setSelectedZatonaId(newId);
        }

        addSpaceHistory(
          `Created new academic space: ${nameEn}`,
          `تم إنشاء مساحة أكاديمية جديدة: ${nameAr}`
        );
      } else {
        const updateItem = (item: any) => ({
          ...item,
          nameEn: nameEn.trim(),
          nameAr: nameAr.trim(),
          subject: tab === "practice" ? (extraSubject || item.subject) : item.subject
        });

        if (tab === "practice") {
          setActivePractices(prev => prev.map(p => p.id === spaceId ? updateItem(p) : p));
        } else if (tab === "plan") {
          setActivePlans(prev => prev.map(p => p.id === spaceId ? updateItem(p) : p));
        } else if (tab === "timetable") {
          setActiveTimetables(prev => prev.map(t => t.id === spaceId ? updateItem(t) : t));
        } else if (tab === "zatona") {
          setActiveZatonas(prev => prev.map(z => z.id === spaceId ? updateItem(z) : z));
        }

        addSpaceHistory(
          `Edited academic space: ${nameEn}`,
          `تم تعديل المساحة الأكاديمية: ${nameAr}`
        );
      }

      setSpaceModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    return (
      <div style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(12px)",
        display: "flex", justifyContent: "center", alignItems: "center",
        zIndex: 10000
      }}>
        <div className="panel-card" style={{
          width: "100%", maxWidth: "480px", padding: "2rem",
          background: "rgba(255, 255, 255, 0.95)", border: "1px solid rgba(16, 107, 163, 0.15)",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)", borderRadius: "24px"
        }}>
          <h3 style={{ margin: "0 0 1.5rem 0", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>{type === "new" ? "➕" : "✏️"}</span>
            <span>
              {type === "new"
                ? (language === "ar" ? "إنشاء مساحة دراسية نشطة جديدة" : "Create New Academic Space")
                : (language === "ar" ? "تعديل تفاصيل المساحة الدراسية" : "Edit Academic Space Details")}
            </span>
          </h3>

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text)" }}>
                {language === "ar" ? "اسم المساحة (بالإنكليزية) *" : "Space Name (English) *"}
              </label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => setSpaceModalConfig(prev => ({ ...prev, nameEn: e.target.value }))}
                placeholder="e.g. Physics Quantum Workstation"
                style={{
                  padding: "0.75rem", borderRadius: "12px", border: "1px solid var(--card-border)",
                  outline: "none", fontSize: "0.9rem", width: "100%", background: "#ffffff"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text)" }}>
                {language === "ar" ? "اسم المساحة (بالعربية) *" : "Space Name (Arabic) *"}
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setSpaceModalConfig(prev => ({ ...prev, nameAr: e.target.value }))}
                placeholder="مثال: مساحة ميكانيكا الكم والفيزياء"
                style={{
                  padding: "0.75rem", borderRadius: "12px", border: "1px solid var(--card-border)",
                  outline: "none", fontSize: "0.9rem", width: "100%", background: "#ffffff"
                }}
              />
            </div>

            {tab === "practice" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text)" }}>
                  {language === "ar" ? "المادة الدراسية" : "Workstation Subject"}
                </label>
                <select
                  value={extraSubject}
                  onChange={(e) => setSpaceModalConfig(prev => ({ ...prev, extraSubject: e.target.value }))}
                  style={{
                    padding: "0.75rem", borderRadius: "12px", border: "1px solid var(--card-border)",
                    outline: "none", fontSize: "0.9rem", width: "100%", background: "#ffffff"
                  }}
                >
                  <option value="Math">{language === "ar" ? "الرياضيات" : "Math"}</option>
                  <option value="Science">{language === "ar" ? "العلوم" : "Science"}</option>
                  <option value="Arabic">{language === "ar" ? "اللغة العربية" : "Arabic"}</option>
                </select>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => setSpaceModalConfig(prev => ({ ...prev, isOpen: false }))}
                style={{
                  padding: "0.75rem 1.25rem", borderRadius: "12px", border: "1px solid var(--card-border)",
                  background: "#ffffff", color: "var(--foreground)", fontWeight: 700, fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>

              <button
                type="submit"
                style={{
                  padding: "0.75rem 1.5rem", borderRadius: "12px", border: "none",
                  background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                  color: "#ffffff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(16, 107, 163, 0.25)"
                }}
              >
                {language === "ar" ? "حفظ المساحة" : "Save Workspace"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderSpaceHistory = () => {
    return (
      <div className="panel-card" style={{
        padding: "1.5rem", marginTop: "2rem",
        background: "rgba(255, 255, 255, 0.6)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(16, 107, 163, 0.08)", borderRadius: "var(--border-radius-lg)"
      }}>
        <h4 style={{
          fontSize: "1rem", fontWeight: 800, color: "var(--primary)",
          display: "flex", alignItems: "center", gap: "0.5rem",
          margin: "0 0 1rem 0", borderBottom: "1px dashed rgba(16, 107, 163, 0.15)",
          paddingBottom: "0.5rem"
        }}>
          ⏱️
          <span>{language === "ar" ? "سجل الأنشطة والتدقيق لمساحات المذاكرة" : "Academic Spaces Activity & Audit Log"}</span>
        </h4>
        <div style={{
          maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem"
        }} className="custom-scrollbar">
          {spaceHistory.length === 0 ? (
            <span style={{ fontSize: "0.85rem", color: "#6a7c88" }}>
              {language === "ar" ? "لا توجد أنشطة مسجلة بعد." : "No actions logged yet."}
            </span>
          ) : (
            spaceHistory.map((log, idx) => (
              <div key={idx} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: "0.8rem", padding: "0.4rem 0.75rem", borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.4)", border: "1px solid rgba(0, 0, 0, 0.02)"
              }}>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                  {typeof (language === "ar" ? log.actionAr : log.actionEn) === "object"
                    ? JSON.stringify(language === "ar" ? log.actionAr : log.actionEn)
                    : String(language === "ar" ? log.actionAr : log.actionEn)}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#8fa0ac" }}>
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Social & Messenger states
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [directorySearch, setDirectorySearch] = useState("");
  const [chatRecipient, setChatRecipient] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);

  // Silent polling DM synchronization effect
  useEffect(() => {
    if (activeTab !== "social" || !chatRecipient || !user) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await authedFetch(`/api/chat/message?senderId=${encodeURIComponent(user.uid)}&recipientId=${encodeURIComponent(chatRecipient.userId)}`);
        if (res.ok) {
          const data = await res.json();
          const fetchedMsgs = data.messages || [];
          
          setChatMessages(prev => {
            if (prev.length !== fetchedMsgs.length || JSON.stringify(prev) !== JSON.stringify(fetchedMsgs)) {
              return fetchedMsgs;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Error silently syncing chat messages:", err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [activeTab, chatRecipient, user]);

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
      const res = await authedFetch("/api/user/list");
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
      const res = await authedFetch(`/api/parent/children?parentEmail=${encodeURIComponent(user.email)}`);
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
      const res = await authedFetch("/api/parent/approve", {
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
      const res = await authedFetch(`/api/chat/message?senderId=${encodeURIComponent(user.uid)}&recipientId=${encodeURIComponent(recipientId)}`);
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
      const res = await authedFetch("/api/chat/message", {
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
        const messagesRes = await authedFetch(`/api/chat/message?senderId=${encodeURIComponent(user.uid)}&recipientId=${encodeURIComponent(chatRecipient.userId)}`);
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
      await authedFetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        avatar: settingsAvatar || userProfile.avatar,
        privacySettings: {
          profileVisibility: privacyVisibility,
          allowMessages: privacyAllowMessages,
          showActivity: privacyShowActivity
        }
      };
      const res = await authedFetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      const res = await authedFetch(`/api/user/account?userId=${encodeURIComponent(user.uid)}&email=${encodeURIComponent(user.email)}`, {
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
  // Phone verification methods for onboarding
  const setupOnboardingRecaptcha = (containerId: string) => {
    if (typeof window === "undefined") return null;
    try {
      const container = document.getElementById(containerId);
      if (!container) return null;
      
      // Use existing stable element if present to avoid churning the DOM node between attempts
      let widget = document.getElementById("onboarding-recaptcha-widget");
      if (!widget) {
        widget = document.createElement("div");
        widget.id = "onboarding-recaptcha-widget";
        container.appendChild(widget);
      }

      // Respect the user's test mode state on localhost/127.0.0.1
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        auth.settings.appVerificationDisabledForTesting = onboardingTestMode;
        console.log("[Firebase Auth] App verification disabled for testing on localhost?", onboardingTestMode);
      } else {
        auth.settings.appVerificationDisabledForTesting = false;
      }

      const verifier = new RecaptchaVerifier(auth, "onboarding-recaptcha-widget", {
        size: "invisible",
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
      let errMsg = error.message || (language === "ar" ? "فشل إرسال رمز التحقق" : "Failed to send verification code");
      if (error.code === "auth/provider-already-linked" || error.code === "auth/credential-already-in-use") {
        errMsg = language === "ar" 
          ? "رقم الهاتف هذا مسجل بالفعل لتبادل البيانات أو مرتبط بحساب آخر." 
          : "This phone number is already linked or registered to another account.";
      }
      setOnboardingPhoneError(errMsg);
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
          await authedFetch("/api/user/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile: updatedProfile
            })
          });
          console.log("[Onboarding Phone] Profile phone_verified flag persisted in DB");
        } catch (dbErr) {
          console.error("Failed to save phone verification state to DB profile:", dbErr);
        }
        
        // Trigger conversational onboarding transition
        await sendOnboardingMessage("[SYSTEM] Phone number verified: " + onboardingPhoneNumber);
        
        // Advance current onboarding step and unlock phone gate
        setCurrentOnboardingStep("role");
      }
    } catch (error: any) {
      console.error("[Onboarding Phone] Verification failed:", error);
      let errMsg = error.message || (language === "ar" ? "رمز التحقق غير صحيح" : "Verification code is incorrect");
      if (error.code === "auth/provider-already-linked" || error.code === "auth/credential-already-in-use") {
        errMsg = language === "ar" 
          ? "رقم الهاتف هذا مسجل بالفعل لتبادل البيانات أو مرتبط بحساب آخر." 
          : "This phone number is already linked or registered to another account.";
      }
      setOnboardingPhoneError(errMsg);
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
        const res = await authedFetch(`/api/places/search?query=${encodeURIComponent(query)}&country=${encodeURIComponent(countryParam)}`,
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

  const getOnboardingQuestion = (
    step: string, 
    role: string, 
    lang: string, 
    overrideName?: string, 
    overrideUsername?: string, 
    overrideAge?: string, 
    overrideCountry?: string
  ): string => {
    const isAr = lang === "ar";
    const s = step.toLowerCase().trim();
    const activeName = overrideName || onboardingName;
    const activeUsername = overrideUsername || onboardingUsername;
    const activeAge = overrideAge || onboardingAge;
    const activeCountry = overrideCountry || onboardingCountry;

    if (s === "role") {
      return isAr
        ? "في البداية، ما هو دورك في منصتنا اليوم؟ اختر من البطاقات أدناه: 🎓 طالب علم، 🍎 معلم متميز، 👪 ولي أمر، أو 🛡️ مشرف نظام."
        : "To begin, what is your role on our platform today? Select from the cards below: Student, Teacher, Parent, or Admin.";
    }
    if (s === "name") {
      return isAr
        ? "مرحباً بك! ما هو اسمك الكامل؟ 👋"
        : "Excellent! What is your full name? 👋";
    }
    if (s === "username") {
      return isAr
        ? `سعدت بلقائك يا ${activeName || "صديقي"}! 🌟 يرجى اختيار اسم مستخدم (Username) فريد لحسابك. سيتم استخدامه في رابط ملفك الشخصي بدلاً من الأرقام:`
        : `Nice to meet you, ${activeName || "my friend"}! 🌟 Please choose a unique username for your account. This will be used in your profile URL instead of numbers:`;
    }
    if (s === "age") {
      return isAr
        ? `رائع جداً! اسم المستخدم @${activeUsername} متاح لحسابك. كم عمرك الآن؟ 🎂`
        : `Awesome! Username @${activeUsername} is available. How old are you? 🎂`;
    }
    if (s === "country") {
      return isAr
        ? "رائع! ما هي بلد إقامتك؟ 🌍"
        : "Great! What is your country of residence? 🌍";
    }
    if (s === "grade") {
      const localizedCountry = getLocalizedCountryName(activeCountry, isAr);
      const proposedGradeText = getGradeSuggestion(activeAge, activeCountry, isAr);
      return isAr
        ? `بناءً على عمرك (${activeAge} سنة) وإقامتك في (${localizedCountry})، نقترح عليك المسار الدراسي: **${proposedGradeText}**.\n\nهل ترغب في قبول هذا الاقتراح، أو إدخال صف مخصص، أو اختيار متعلم مدى الحياة، أو تخطي هذه الخطوة؟`
        : `Based on your age of ${activeAge} and residing in ${localizedCountry}, we recommend: **${proposedGradeText}**.\n\nWould you like to accept this recommendation, enter a custom grade, choose 'Lifelong Learner', or skip this step?`;
    }
    if (s === "parentemail") {
      return isAr
        ? "تنبيه الأمان والرقابة الأبوية 🛡️: بما أن عمرك أقل من 13 سنة، فإننا نطبق معايير الخصوصية لحماية الأطفال. يرجى كتابة البريد الإلكتروني لولي أمرك ليقوم بالموافقة على تفعيل حسابك من لوحته الخاصة:"
        : "Safety & Parental Consent Notice 🛡️: Since you are under 13, standard age limit protections apply. Please enter your parent's email address so they can approve your account from their portal:";
    }
    if (s === "school") {
      if (role === "student") {
        return isAr
          ? "رائع جداً! ما هو اسم المدرسة أو الجامعة التي تدرس بها حالياً؟ 🏫 (اكتب للبحث في الخريطة)"
          : "Awesome! What is the name of the school or university where you currently study? 🏫 (Type to search)";
      } else if (role === "teacher") {
        return isAr
          ? "ممتاز! ما هو اسم المدرسة أو المؤسسة التعليمية التي تعمل بها حالياً؟ 🏫 (اكتب للبحث)"
          : "Excellent! What is the name of the school or educational institution where you work? 🏫 (Type to search)";
      } else {
        return isAr
          ? "ممتاز! ما هو اسم مدرسة أو جامعة أطفالك؟ 🏫 (اكتب للبحث)"
          : "Excellent! What is the name of your children's school or university? 🏫 (Type to search)";
      }
    }
    if (s === "children") {
      return isAr
        ? "كم عدد أطفالك بشكل عام؟ 👪"
        : "How many children do you have in general? 👪";
    }
    if (s === "childreninschool") {
      return isAr
        ? "منهم، كم عدد الأطفال الذين يدرسون حالياً في المدارس أو الجامعات؟ 🏫"
        : "Out of those, how many are studying in schools or universities? 🏫";
    }
    if (s === "avatar") {
      if (role === "admin") {
        return isAr
          ? "رائع جداً! بصفتك مشرفاً، سننتقل الآن مباشرةً لاختيار صورتك الرمزية (الرمز التعبيري) لإتمام الإعداد:"
          : "Awesome! As an Admin, we will now skip directly to choosing your profile avatar to finish:";
      } else if (role === "parent") {
        return isAr
          ? "رائع جداً! لقد أكملنا كل التفاصيل الخاصة بك. أخيراً، اختر صورتك الرمزية المفضلة والحديثة من المكتبة الفاخرة أدناه:"
          : "Wonderful! We have gathered all details. Finally, select your favorite, modern avatar from our premium library below to complete onboarding:";
      } else {
        return isAr
          ? "رائع جداً! لقد أكملنا البيانات الأساسية. الآن، اختر صورتك الرمزية المفضلة لملفك الشخصي من المكتبة المتنوعة أدناه:"
          : "Excellent! We have captured your core info. Now, select your preferred avatar from our diverse library below to complete onboarding:";
      }
    }
    if (s === "complete") {
      return isAr
        ? "✨ تهانينا! لقد أكملت إعداد حسابك بنجاح في عائلة فاهم. نحن متحمسون جداً لرحلتك التعليمية معنا! دعنا نستكشف المنصة الآن.\n\nSUCCESS_ONBOARDING_COMPLETE"
        : "✨ Congratulations! You have successfully completed your profile setup in the Fahem family. We are incredibly excited to support your educational journey! Let's explore the platform now.\n\nSUCCESS_ONBOARDING_COMPLETE";
    }
    return "";
  };

  const sendOnboardingMessage = async (msgText: string) => {
    if (!msgText.trim() || !user) return;

    let currentAvatarVal = onboardingAvatar;

    setOnboardingInput("");
    setOnboardingLoading(true);
    setOnboardingStatusText(language === "ar" ? "جاري المعالجة..." : "Processing...");

    // Check if it's a special system message (e.g. phone verification done)
    if (msgText.startsWith("[SYSTEM]")) {
      setOnboardingMessages(prev => [...prev, { sender: "fahem", text: "" }]);
      await new Promise(resolve => setTimeout(resolve, 800));
      const nextQuestion = getOnboardingQuestion("role", onboardingUserType, language);
      setOnboardingMessages(prev => {
        const copy = [...prev];
        if (copy.length > 0 && copy[copy.length - 1].sender === "fahem" && copy[copy.length - 1].text === "") {
          copy[copy.length - 1] = { sender: "fahem", text: nextQuestion };
        } else {
          copy.push({ sender: "fahem", text: nextQuestion });
        }
        return copy;
      });
      setOnboardingLoading(false);
      setOnboardingStatusText("");
      return;
    }

    // Add user message to history
    let userMsgDisplay = msgText;
    if (currentOnboardingStep === "role") {
      const lowerMsg = msgText.toLowerCase();
      if (lowerMsg.includes("student") || lowerMsg.includes("طالب")) {
        userMsgDisplay = language === "ar" ? "🎓 طالب علم" : "🎓 Student";
      } else if (lowerMsg.includes("teacher") || lowerMsg.includes("معلم")) {
        userMsgDisplay = language === "ar" ? "🍎 معلم متميز" : "🍎 Teacher";
      } else if (lowerMsg.includes("parent") || lowerMsg.includes("ولي")) {
        userMsgDisplay = language === "ar" ? "👪 ولي أمر" : "👪 Parent";
      } else if (lowerMsg.includes("admin") || lowerMsg.includes("مشرف") || lowerMsg.includes("مسؤول")) {
        userMsgDisplay = language === "ar" ? "🛡️ مشرف نظام" : "🛡️ Admin";
      }
    } else if (currentOnboardingStep === "grade") {
      const isArabic = language === "ar";
      const proposed = getGradeSuggestion(onboardingAge, onboardingCountry, isArabic);
      if (msgText.includes("Accept") || msgText.includes("قبول") || msgText.toLowerCase().includes(proposed.toLowerCase())) {
        userMsgDisplay = isArabic ? `قبول المقترح: ${proposed}` : `Accept Recommendation: ${proposed}`;
      } else if (msgText.toLowerCase() === "lifelong learner" || msgText.includes("مدى الحياة")) {
        userMsgDisplay = isArabic ? "متعلم مدى الحياة" : "Lifelong Learner";
      } else if (msgText.toLowerCase() === "skip" || msgText.includes("تخطي")) {
        userMsgDisplay = isArabic ? "تخطي الخطوة" : "Skip Step";
      }
    } else if (currentOnboardingStep === "school" && (msgText.toLowerCase() === "skip" || msgText.includes("تخطي"))) {
      userMsgDisplay = language === "ar" ? "تخطي خطوة المدرسة" : "Skip School Step";
    } else if (currentOnboardingStep === "avatar" && (msgText === "Skip" || msgText.toLowerCase() === "skip")) {
      userMsgDisplay = language === "ar" ? "تخطي الخطوة" : "Skip Step";
    }

    // Append the user message and instantly show the empty placeholder for Fahem thinking
    setOnboardingMessages(prev => [
      ...prev,
      { sender: "user", text: userMsgDisplay },
      { sender: "fahem", text: "" }
    ]);

    // Small delay to simulate AI thinking and guarantee smooth rendering
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const activeStep = currentOnboardingStepRef.current || currentOnboardingStep;
      let roleVal = onboardingUserType;
      
      const trimmedMsg = msgText.trim();
      let nextStep = activeStep;

      if (activeStep === "phone") {
        nextStep = "role";
      } else if (activeStep === "role") {
        const lowerMsg = trimmedMsg.toLowerCase();
        let matchedRole: "student" | "teacher" | "parent" | "admin" = "student";
        if (lowerMsg === "student" || lowerMsg.includes("طالب")) {
          matchedRole = "student";
        } else if (lowerMsg === "teacher" || lowerMsg.includes("معلم")) {
          matchedRole = "teacher";
        } else if (lowerMsg === "parent" || lowerMsg.includes("ولي")) {
          matchedRole = "parent";
        } else if (lowerMsg === "admin" || lowerMsg.includes("مشرف") || lowerMsg.includes("مسؤول")) {
          matchedRole = "admin";
        }
        setOnboardingUserType(matchedRole);
        roleVal = matchedRole;
        nextStep = "name";
      } else if (activeStep === "name") {
        setOnboardingName(trimmedMsg);
        nextStep = "username";
      } else if (activeStep === "username") {
        const usernameVal = trimmedMsg.replace(/^@/, "").trim();
        setOnboardingUsername(usernameVal);
        if (roleVal === "admin") {
          nextStep = "avatar";
        } else if (roleVal === "student") {
          nextStep = "age";
        } else {
          nextStep = "country";
        }
      } else if (activeStep === "age") {
        setOnboardingAge(trimmedMsg);
        nextStep = "country";
      } else if (activeStep === "country") {
        setOnboardingCountry(trimmedMsg);
        if (roleVal === "student") {
          nextStep = "grade";
        } else {
          nextStep = "school";
        }
      } else if (activeStep === "grade") {
        const isAr = language === "ar";
        const ageVal = parseInt(onboardingAge) || 0;
        const proposed = getGradeSuggestion(onboardingAge, onboardingCountry, isAr);
        if (trimmedMsg.includes("Accept") || trimmedMsg.includes("قبول") || trimmedMsg.toLowerCase().includes(proposed.toLowerCase())) {
          setOnboardingGradeOption("recommended");
          setOnboardingCustomGrade(proposed);
        } else if (trimmedMsg.toLowerCase() === "lifelong learner" || trimmedMsg.includes("مدى الحياة")) {
          setOnboardingGradeOption("lifelong");
          setOnboardingCustomGrade(isAr ? "متعلم مدى الحياة" : "Lifelong Learner");
        } else if (trimmedMsg.toLowerCase() === "skip" || trimmedMsg.includes("تخطي")) {
          setOnboardingGradeOption("skip");
          setOnboardingCustomGrade("");
        } else {
          setOnboardingGradeOption("custom");
          setOnboardingCustomGrade(trimmedMsg);
        }

        if (ageVal < 13) {
          nextStep = "parentEmail";
        } else {
          nextStep = "school";
        }
      } else if (activeStep === "parentEmail") {
        setOnboardingParentEmail(trimmedMsg);
        nextStep = "school";
      } else if (activeStep === "school") {
        if (trimmedMsg.toLowerCase() === "skip" || trimmedMsg.includes("تخطي")) {
          setOnboardingSchool("");
        } else {
          setOnboardingSchool(trimmedMsg);
        }
        if (roleVal === "parent") {
          nextStep = "children";
        } else {
          nextStep = "avatar";
        }
      } else if (activeStep === "children") {
        setOnboardingChildrenCount(trimmedMsg);
        nextStep = "childrenInSchool";
      } else if (activeStep === "childrenInSchool") {
        setOnboardingChildrenInSchool(trimmedMsg);
        nextStep = "avatar";
      } else if (activeStep === "avatar") {
        let avatarVal = trimmedMsg;
        if (trimmedMsg === "Skip" || !trimmedMsg) {
          avatarVal = "/avatars/space_explorer.svg";
        }
        setOnboardingAvatar(avatarVal);
        currentAvatarVal = avatarVal;
        nextStep = "complete";
      }

      // Update active step
      currentOnboardingStepRef.current = nextStep;
      setCurrentOnboardingStep(nextStep);

      // Generate the next question
      const resolvedRole = roleVal;
      const resolvedName = activeStep === "name" ? trimmedMsg : onboardingName;
      const resolvedUsername = activeStep === "username" ? trimmedMsg.replace(/^@/, "").trim() : onboardingUsername;
      const resolvedAge = activeStep === "age" ? trimmedMsg : onboardingAge;
      const resolvedCountry = activeStep === "country" ? trimmedMsg : onboardingCountry;

      const nextQuestion = getOnboardingQuestion(
        nextStep, 
        resolvedRole, 
        language, 
        resolvedName, 
        resolvedUsername, 
        resolvedAge, 
        resolvedCountry
      );

      // Replace the last empty "fahem" placeholder with the next question
      setOnboardingMessages(prev => {
        const copy = [...prev];
        if (copy.length > 0 && copy[copy.length - 1].sender === "fahem" && copy[copy.length - 1].text === "") {
          copy[copy.length - 1] = { sender: "fahem", text: nextQuestion };
        } else {
          copy.push({ sender: "fahem", text: nextQuestion });
        }
        return copy;
      });

      // Post-processing: check if completed
      if (nextStep === "complete") {
        setOnboardingStatusText(language === "ar" ? "✨ اكتمل الإعداد بنجاح! جاري تحميل المنصة..." : "✨ Onboarding complete! Loading dashboard...");

        setTimeout(async () => {
          setLoadingProfile(true);
          try {
            // Build the final profile document
            const finalProfile = {
              ...(userProfile || {}),
              userId: user.uid,
              username: resolvedUsername || `user_${user.uid.slice(0, 6)}`,
              email: user.email || "",
              name: resolvedName || user.displayName || user.email?.split("@")[0] || "User",
              age: parseInt(resolvedAge) || 18,
              country: resolvedCountry || "Egypt",
              grade: resolvedRole === "student" ? (onboardingCustomGrade || getGradeSuggestion(resolvedAge, resolvedCountry, language === "ar") || "N/A") : "N/A",
              avatar: currentAvatarVal || "/avatars/space_explorer.svg",
              school: onboardingSchool || "N/A",
              userType: resolvedRole,
              role: resolvedRole,
              onboardingCompleted: true,
              onboardingSkipped: false,
              isApproved: true,
              friends: userProfile?.friends || [],
              groupsJoined: userProfile?.groupsJoined || [],
              privacySettings: userProfile?.privacySettings || {
                profileVisibility: "public",
                allowMessages: true,
                showActivity: true
              },
              // Additional role-specific fields
              parentEmail: onboardingParentEmail || "",
              childrenCount: onboardingChildrenCount || "",
              childrenInSchool: onboardingChildrenInSchool || ""
            };

            const res = await authedFetch("/api/user/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: user.uid,
                profile: finalProfile
              })
            });

            if (res.ok) {
              const data = await res.json();
              setUserProfile({
                ...finalProfile,
                ...(data.profile || {})
              });
              setSettingsAvatar(finalProfile.avatar);
            } else {
              // Fail-safe local state backup
              setUserProfile(finalProfile);
            }

            if (typeof window !== "undefined") {
              localStorage.setItem("onboarding_completed_" + user.uid, "true");
            }
            setLocalCompleted(true);
            await logActivity("onboarding_completed", "success", "Completed onboarding via local step machine");
          } catch (err) {
            console.error("Error saving profile on completion:", err);
            if (typeof window !== "undefined") {
              localStorage.setItem("onboarding_completed_" + user.uid, "true");
            }
            setLocalCompleted(true);
          } finally {
            setLoadingProfile(false);
          }
        }, 2500);
      } else {
        setOnboardingStatusText("");
      }

    } catch (err) {
      console.error("Local onboarding transition failed:", err);
      setOnboardingStatusText("");
      // clean up empty fahem message if it exists
      setOnboardingMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].sender === "fahem" && prev[prev.length - 1].text === "") {
          return prev.slice(0, -1);
        }
        return prev;
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

    // One-time boot purge of legacy bypass/demo flags if a leftover legacy bypass flag exists, purge it to free trapped users on load!
    if (typeof window !== "undefined") {
      const bypassSessionKey = ["judge", "bypass", "session"].join("_");
      const bypassEmailKey = ["judge", "bypass", "email"].join("_");
      if (localStorage.getItem(bypassSessionKey) === "true") {
        localStorage.removeItem(bypassSessionKey);
        localStorage.removeItem(bypassEmailKey);
        localStorage.removeItem("app_mode");
        localStorage.removeItem("demo_auth_token");
      }
    }

    try {
      const res = await authedFetch("/api/user/profile", {
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
      const res = await authedFetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          profile: updatedProfile,
          requesterEmail: user?.email
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.needsApproval) {
          alert(language === "ar" ? "تم تقديم طلب تعديل بيانات العضو للموافقة عليه من قبل المسؤول الأعلى!" : "Your request to update the user has been submitted for Superadmin approval.");
        } else {
          alert(language === "ar" ? "تم تحديث بيانات العضو بنجاح!" : "User updated successfully!");
          await fetchAllUsersList();
        }
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
      const statsRes = await authedFetch(`/api/admin/activities?email=${encodeURIComponent(user.email)}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setAdminStats(statsData);
      }
      
      const logsRes = await authedFetch(`/api/admin/logs?email=${encodeURIComponent(user.email)}`);
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
      const res = await authedFetch("/api/user/friend", {
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
      const response = await authedFetch(`/api/db-metadata?email=${encodeURIComponent(activeEmail)}`);
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
      const response = await authedFetch(`/api/history?userId=${encodeURIComponent(activeUserId)}`);
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
      const response = await authedFetch(`/api/telemetry?userId=${encodeURIComponent(activeUserId)}`);
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

      // Also query real /api/user/token-stats
      const realStatsRes = await authedFetch("/api/user/token-stats");
      if (realStatsRes.ok) {
        const realStatsData = await realStatsRes.json();
        if (realStatsData && realStatsData.success) {
          setRealTokenStats(realStatsData);
        }
      }
    } catch (err) {
      console.error("Error fetching token stats:", err);
    }
  };

  const fetchBooksAndSubjects = async () => {
    setLoadingBooks(true);
    setLoadingSubjects(true);
    try {
      const subjectsRes = await authedFetch("/api/subjects", { cache: "no-store" });
      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        setDynamicSubjects(subjectsData.subjects || []);
      }
      
      const booksRes = await authedFetch("/api/books", { cache: "no-store" });
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
      const response = await authedFetch(`/api/history/detail?sessionId=${encodeURIComponent(sessionIdVal)}`);
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
      const response = await authedFetch(`/api/history?sessionId=${encodeURIComponent(sessionIdVal)}`, {
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
    // One-time boot purge of legacy bypass/demo flags if a leftover legacy bypass flag exists, purge it to free trapped users on load!
    if (typeof window !== "undefined") {
      const bypassSessionKey = ["judge", "bypass", "session"].join("_");
      const bypassEmailKey = ["judge", "bypass", "email"].join("_");
      if (localStorage.getItem(bypassSessionKey) === "true") {
        localStorage.removeItem(bypassSessionKey);
        localStorage.removeItem(bypassEmailKey);
        localStorage.removeItem("app_mode");
        localStorage.removeItem("demo_auth_token");
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const isDemoModeActive = typeof window !== "undefined" && localStorage.getItem("app_mode") === "demo" && !!localStorage.getItem("demo_auth_token");
      
      if (!firebaseUser && !isDemoModeActive) {
        router.push(`/${language}`);
      } else {
        if (firebaseUser) {
          // Real Firebase user wins: clean up demo/bypass state entirely
          if (typeof window !== "undefined") {
            localStorage.removeItem("app_mode");
            localStorage.removeItem("demo_auth_token");
            localStorage.removeItem("judge_bypass_session");
            localStorage.removeItem("judge_bypass_email");
            sessionStorage.removeItem("judge_selected_persona");
          }
        }

        const savedBypassEmail = typeof window !== "undefined" ? (localStorage.getItem("judge_bypass_email") || "demo.evaluation@fahem.edu") : "demo.evaluation@fahem.edu";
        const currentUser = firebaseUser || ({
          uid: "demo_evaluation_uid_01",
          email: savedBypassEmail,
          displayName: "⭐ DEMO",
          photoURL: "/avatars/space_explorer.svg",
          phoneNumber: "+15555555555",
        } as unknown as User);

        setUser(currentUser);
        if (typeof window !== "undefined") {
          const isDone = localStorage.getItem("onboarding_completed_" + currentUser.uid) === "true";
          if (isDone) {
            setLocalCompleted(true);
          }
        }
        fetchMetadata(currentUser.email || undefined); // Fetch live database metadata on mount
        fetchUserSessions(currentUser.uid); // Fetch user sessions
        fetchUserTokenStats(currentUser.uid); // Fetch user token usage stats
        fetchBooksAndSubjects(); // Fetch dynamic books and subjects from database
        fetchSpaceHistory(currentUser.uid); // Fetch active recall and space audit history
        
        // Fetch User Profile over MongoDB Agent Proxies
        setLoadingProfile(true);
        setProfileLoadError(null);
        if (isDemoModeActive && !firebaseUser) {
          const savedPersona = typeof window !== "undefined" ? (sessionStorage.getItem("judge_selected_persona") || "admin") : "admin";
          const judgeProfile = {
            userId: currentUser.uid,
            email: currentUser.email || "demo.evaluation@fahem.edu",
            name: "⭐ DEMO (Sandbox)",
            username: "demo_evaluation",
            avatar: "/avatars/space_explorer.svg",
            onboardingCompleted: (currentUser.email && currentUser.email.toLowerCase().includes("onboarding-test")) ? false : true,
            phoneVerified: (currentUser.email && currentUser.email.toLowerCase().includes("onboarding-test")) ? true : undefined,
            phone_verified: (currentUser.email && currentUser.email.toLowerCase().includes("onboarding-test")) ? true : undefined,
            userType: savedPersona === "teacher" ? "teacher" : "student",
            role: savedPersona === "admin" ? "admin" : savedPersona,
            isWhitelisted: true,
            grade: "Secondary 2",
            school: "El Nasr School",
            friends: [],
            groupsJoined: [],
            privacySettings: {
              profileVisibility: "public",
              allowMessages: true,
              showActivity: true
            }
          };
          setUserProfile(judgeProfile);
          setLoadingProfile(false);
          setIsAdmin(savedPersona === "admin"); // Allow judge Standard/Superadmin console access for auditing
          if (judgeProfile.onboardingCompleted === false) {
            setCurrentOnboardingStep("role");
          }
        } else {
          authedFetch(`/api/user/profile?userId=${encodeURIComponent(currentUser.uid)}&email=${encodeURIComponent(currentUser.email || "")}&t=${Date.now()}`, { cache: "no-store" })
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
                setSettingsAvatar(data.profile.avatar || "");

                const isUserAdmin = data.profile.role === "admin" || data.profile.role === "super-admin" || data.profile.userType === "admin";
                const hasLocalCompleted = typeof window !== "undefined" && localStorage.getItem("onboarding_completed_" + currentUser.uid) === "true";
                const hasCompletedFields = data.profile.role && data.profile.country && data.profile.username;

                if (isUserAdmin || hasLocalCompleted || hasCompletedFields) {
                  setUserProfile({
                    ...data.profile,
                    onboardingCompleted: true
                  });
                  setLocalCompleted(true);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("onboarding_completed_" + currentUser.uid, "true");
                  }
                  if (data.profile.onboardingCompleted !== true) {
                    authedFetch("/api/user/profile", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: currentUser.uid,
                        profile: { ...data.profile, onboardingCompleted: true }
                      })
                    }).catch((err) => console.error("Error auto-completing onboarding for returning user:", err));
                  }
                } else if (data.profile.onboardingCompleted !== true) {
                  // SMS Verification Logic Guard: if the user's phone is already verified in their profile,
                  // bypass the phone verification step entirely and default to the next logical step ("role")
                  const isPhoneVerified = data.profile.phoneVerified === true || data.profile.phone_verified === true;
                  if (isPhoneVerified) {
                    setCurrentOnboardingStep("role");
                  }

                  // Fetch onboarding history
                  authedFetch(`/api/history/detail?sessionId=onboarding_session_${currentUser.uid}`)
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
        }

        // Verify superadmin status
        const isDemoModeActiveAfter = typeof window !== "undefined" && localStorage.getItem("app_mode") === "demo" && !firebaseUser;
        if (currentUser.email && !isDemoModeActiveAfter) {
          authedFetch(`/api/admin/check`)
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
      const adminTabs = ["admin", "super-admin-users", "admin-ingestion"];
      // FC7.4: Admin Panel + Users & Activity Trail are fully banned in the sandbox for everyone —
      // redirect away even if the tab is forced. Curriculum Studio (admin-ingestion) stays (FC7.6).
      const sandboxBannedTabs = ["admin", "super-admin-users"];
      if (isDemoSandbox && sandboxBannedTabs.includes(activeTab)) {
        setActiveTab("library");
      } else if (!isAdmin && !isDemoSandbox && adminTabs.includes(activeTab)) {
        setActiveTab("library");
      }
    }
  }, [isAdmin, isDemoSandbox, activeTab, loadingUser, loadingProfile]);

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
      const response = await authedFetch("/api/agent/grounded", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptText,
          language: (translationLanguage && translationLanguage !== "Original") ? translationLanguage : language,
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
            // Parse book page citations and standard markdown links within standard text parts
            const citeParts = codePart.split(/(\[[^\]]+\]\([^)]+\)|\[[^\]:]+\s*:\s*[pP]\d+\]|\[[pP]\d+\])/gi);
            return citeParts.map((citePart, citeIndex) => {
              if (!citePart) return null;
              if (citePart.startsWith("[") && citePart.includes("](")) {
                const closeBracketIdx = citePart.indexOf("](");
                const linkText = citePart.slice(1, closeBracketIdx);
                const linkUrl = citePart.slice(closeBracketIdx + 2, -1);
                
                if (linkUrl.includes("bookId=") || linkUrl.includes("page=")) {
                  let bookId = "";
                  let pageNum = 1;
                  try {
                    const urlObj = new URL(linkUrl.startsWith("?") ? `http://dummy.com${linkUrl}` : linkUrl);
                    bookId = urlObj.searchParams.get("bookId") || "";
                    const pageParam = urlObj.searchParams.get("page");
                    if (pageParam) {
                      pageNum = parseInt(pageParam, 10) || 1;
                    }
                  } catch (e) {
                    const bookMatch = linkUrl.match(/bookId=([^&]+)/);
                    const pageMatch = linkUrl.match(/page=(\d+)/);
                    if (bookMatch) bookId = decodeURIComponent(bookMatch[1]);
                    if (pageMatch) pageNum = parseInt(pageMatch[1], 10) || 1;
                  }
                  
                  bookId = bookId.replace(/[^a-zA-Z0-9_\u0600-\u06FF\s-]/g, "").trim();
                  
                  let cleanLinkText = linkText;
                  const textMatch = linkText.match(/(?:^|\[)?([^\]:]+)\s*:\s*[pP](\d+)(?:\])?$/i);
                  if (textMatch) {
                    const matchedPage = textMatch[2];
                    cleanLinkText = `[p${matchedPage}]`;
                  } else if (/^[pP](\d+)$/i.test(linkText)) {
                    cleanLinkText = `[p${linkText.match(/[pP](\d+)/i)![1]}]`;
                  }
                  
                  return (
                    <a
                      key={`${codeIndex}-${citeIndex}`}
                      href={linkUrl}
                      onClick={(e) => {
                        e.preventDefault();
                        const event = new CustomEvent("fahemNavigateBook", {
                          detail: { bookId, page: pageNum }
                        });
                        window.dispatchEvent(event);
                      }}
                      style={{
                        color: "var(--secondary, #d4af37)",
                        textDecoration: "underline",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "2px",
                        background: "rgba(212, 175, 55, 0.08)",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        border: "1px solid rgba(212, 175, 55, 0.15)",
                        transition: "all 0.2s"
                      }}
                      title={`Go to ${bookId} - Page ${pageNum}`}
                    >
                      📖 {cleanLinkText}
                    </a>
                  );
                }
                return (
                  <a
                    key={`${codeIndex}-${citeIndex}`}
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--primary)", textDecoration: "underline" }}
                  >
                    {linkText}
                  </a>
                );
              }
              
              const customMatch = citePart.match(/^\[([^\]:]+)\s*:\s*([pP])(\d+)\]$/i);
              if (customMatch) {
                const bookId = customMatch[1].trim();
                const pageNum = parseInt(customMatch[3], 10) || 1;
                const displayLabel = `[p${pageNum}]`;
                return (
                  <a
                    key={`${codeIndex}-${citeIndex}`}
                    href={`?bookId=${bookId}&page=${pageNum}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const event = new CustomEvent("fahemNavigateBook", {
                        detail: { bookId, page: pageNum }
                      });
                      window.dispatchEvent(event);
                    }}
                    style={{
                      color: "var(--secondary, #d4af37)",
                      textDecoration: "underline",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                      background: "rgba(212, 175, 55, 0.08)",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      border: "1px solid rgba(212, 175, 55, 0.15)",
                      transition: "all 0.2s"
                    }}
                    title={`Go to Book ${bookId}, Page ${pageNum}`}
                  >
                    📖 {displayLabel}
                  </a>
                );
              }
              if (/^\[[pP]\d+\]$/.test(citePart)) {
                const pageNum = parseInt(citePart.slice(2, -1), 10) || 1;
                const bookId = selectedBookReader ? (selectedBookReader._id || selectedBookReader.id || "") : "";
                return (
                  <a
                    key={`${codeIndex}-${citeIndex}`}
                    href={`?bookId=${bookId}&page=${pageNum}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const event = new CustomEvent("fahemNavigateBook", {
                        detail: { bookId, page: pageNum }
                      });
                      window.dispatchEvent(event);
                    }}
                    style={{
                      color: "var(--secondary, #d4af37)",
                      textDecoration: "underline",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                      background: "rgba(212, 175, 55, 0.08)",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      border: "1px solid rgba(212, 175, 55, 0.15)",
                      transition: "all 0.2s"
                    }}
                    title={`Go to Page ${pageNum}`}
                  >
                    📖 {citePart}
                  </a>
                );
              }
              return citePart;
            });
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
      // For a demo session, archive + purge the session BEFORE clearing the token, so the next
      // demo starts fresh and superadmin keeps the analysis copy in the sandbox archive.
      if (typeof window !== "undefined" && localStorage.getItem("app_mode") === "demo" && localStorage.getItem("demo_auth_token")) {
        try {
          await authedFetch("/api/demo/signout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        } catch (e) {
          console.warn("demo signout archive failed (non-blocking):", e);
        }
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("app_mode");
        localStorage.removeItem("demo_auth_token");
        localStorage.removeItem("judge_bypass_session");
        localStorage.removeItem("judge_bypass_email");
        sessionStorage.removeItem("judge_selected_persona");
      }
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
      const response = await authedFetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: queryText,
          language: (translationLanguage && translationLanguage !== "Original") ? translationLanguage : language,
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



  const handleStartStudy = (book: any, pageNum?: number) => {
    setSelectedBookReader(book);
    // FC6.13: the fabricated cover is page 0. Open on it when no specific page is requested;
    // otherwise honour the requested real page_number (chapters/topics pass page_number directly).
    setReaderCurrentPage((pageNum !== undefined && pageNum !== null) ? pageNum : (book?.coverUrl ? 0 : 1));
    setActiveTab("library"); // ensure we switch to the library tab where the reader panel is housed!
    const welcomeText = language === "ar" 
      ? `أهلاً بك يا بطل في مساحتك الدراسية التفاعلية الدافئة لكتاب "${book.titleAr || book.title}"! أنا رفيقك الدراسي الذكي وصديقك المقرب، متواجد هنا دائماً لأفكر وأحلل وأتعلم معك خطوة بخطوة 🌟. دعنا نجعل المذاكرة ممتعة وسهلة جداً! في أي وقت تحتاج توجيهي، استخدم الإشارات الذكية في الدردشة: اكتب @ لتحديد المادة، # لاختيار مرجع من الكتاب، أو / لتفعيل أحد الأوامر الدراسية السحرية مثل (/explain أو /summary) لمساعدتك فوراً. بمَ ترغب في أن نبدأ اليوم؟` 
      : `Welcome to your cozy interactive study space for "${book.titleEn || book.title}"! I'm your friendly AI study partner, always here to think, solve, and explore with you 🌟. Let's make learning fun and painless! Whenever you need anything, just mention it: type @ to target a subject, # to reference a textbook chapter, or / to use one of my magical shortcuts (like /explain or /summary) to get helpful answers right away. What shall we learn today?`;
    setReaderMessages([
      { sender: "fahem", text: welcomeText }
    ]);
  };

  const runReaderQuery = async (queryText: string) => {
    if (!queryText.trim() || !selectedBookReader) return;
    setReaderLoading(true);

    const userMsg = { sender: "student", text: queryText };
    setReaderMessages((prev) => [...prev, userMsg]);
    setReaderPrompt("");

    const allPages = getAllPages(selectedBookReader, loadedBookPages);
    const activePage = allPages[readerCurrentPage - 1] || allPages[0] || null;
    let promptPayload = queryText;
    const lowerText = queryText.toLowerCase();

    // Contextual mentions parsing and grounding enrichment
    let directive = "";
    if (lowerText.includes("/explain")) {
      directive += "\n[Command Directive: Provide a deep, step-by-step pedagogical explanation of the core concept. Break down complex points, use analogies, and end with an understanding-check question.]";
    } else if (lowerText.includes("/summary")) {
      directive += "\n[Command Directive: Synthesize a high-density, concise study summary. Outline key formulas, core laws, vocabulary definitions, and a quick-review 'Zatona' synthesis.]";
    } else if (lowerText.includes("/practice")) {
      directive += "\n[Command Directive: Generate an interactive learning challenge or active-recall question. Engage the student and prevent copy-pasting answers.]";
    } else if (lowerText.includes("/quiz")) {
      directive += "\n[Command Directive: Generate a mini-quiz of 3 quick-check conceptual questions to test the student's mastery.]";
    }

    let subjectGrounding = "";
    if (lowerText.includes("@math") || lowerText.includes("#advancedmath")) {
      subjectGrounding = "\n[Subject Grounding: Mathematics - Formulas & Analytical Concepts]";
    } else if (lowerText.includes("@science") || lowerText.includes("#chemistryhandbook") || lowerText.includes("#biologynotes")) {
      subjectGrounding = "\n[Subject Grounding: Science & Engineering - Experimental & Empirical Concepts]";
    } else if (lowerText.includes("@arabic") || lowerText.includes("#arabicgrammar")) {
      subjectGrounding = "\n[Subject Grounding: Arabic Linguistics & Grammar Basics]";
    } else if (lowerText.includes("@history") || lowerText.includes("#middleeasthistory")) {
      subjectGrounding = "\n[Subject Grounding: Modern History & Social Studies]";
    }

    if (activePage) {
      const pageText = language === "ar" 
        ? (activePage.contentAr || activePage.contentEn || activePage.content || "") 
        : (activePage.contentEn || activePage.contentAr || activePage.content || "");
      promptPayload = `[Context Reference: Textbook: "${selectedBookReader.titleEn || selectedBookReader.title}", Page: ${readerCurrentPage}, Chapter: "${activePage.chapterTitleEn || activePage.chapterTitleAr || "General"}"]\n[Page Content:\n${pageText}\n]\n${subjectGrounding} ${directive} \n\nUser Question: ${queryText}`;
    } else {
      promptPayload = `${subjectGrounding} ${directive} \n\nUser Question: ${queryText}`;
    }

    const agentMsgId = Date.now();
    setReaderMessages((prev) => [...prev, { id: agentMsgId, sender: "fahem", text: "...", isStreaming: true }]);

    try {
      const response = await authedFetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptPayload,
          language: (translationLanguage && translationLanguage !== "Original") ? translationLanguage : language,
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
            if (trimmedLine.startsWith("[METADATA]")) {
              const content = trimmedLine.replace("[METADATA] ", "").replace("[METADATA]", "").trim();
              if (content.startsWith("ActiveAgent:")) {
                const agentName = content.replace("ActiveAgent:", "").trim();
                setActiveDbAgent(agentName);
              }
              continue;
            }

            if (!line.includes("[STDERR]") && !line.includes("[CLOSE]") && !line.includes("[Unknown]") && !line.includes("[Fahem Agent]") && !line.startsWith("[Sub-Agent:") && !line.startsWith("Loading local configuration") && !line.startsWith("Prompt:") && !line.startsWith("Starting Fahem") && !line.startsWith("Invoking agent")) {
              if (line !== "=== Agent Final Output === " && line !== "=== Agent Final Output ===" && line !== "==========================") {
                accumulatedResult += line + "\n";
                setReaderMessages((prev) =>
                  prev.map((m: any) => {
                    if (m.id === agentMsgId) {
                      return { ...m, text: accumulatedResult.trim() };
                    }
                    return m;
                  })
                );
              }
            }
          }
        }
      }

      if (buffer.trim()) {
        const line = buffer;
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("[METADATA]")) {
          if (!line.includes("[STDERR]") && !line.includes("[CLOSE]") && !line.includes("[Unknown]") && !line.includes("[Fahem Agent]") && !line.startsWith("[Sub-Agent:") && !line.startsWith("Loading local configuration") && !line.startsWith("Prompt:") && !line.startsWith("Starting Fahem") && !line.startsWith("Invoking agent")) {
            if (line !== "=== Agent Final Output === " && line !== "=== Agent Final Output ===" && line !== "==========================") {
              accumulatedResult += line + "\n";
            }
          }
        }
      }

      const cleanResult = accumulatedResult
        .replace(/=== Agent Final Output ===/g, "")
        .replace(/==========================/g, "")
        .trim();

      setReaderMessages((prev) =>
        prev.map((m: any) => {
          if (m.id === agentMsgId) {
            return {
              ...m,
              text: cleanResult || (language === "ar" ? "اكتملت الإجابة بنجاح!" : "Answer completed successfully!"),
              isStreaming: false
            };
          }
          return m;
        })
      );

      await fetchMetadata();

    } catch (error: any) {
      console.error("Reader streaming failed:", error);
      setReaderMessages((prev) =>
        prev.map((m: any) => {
          if (m.id === agentMsgId) {
            return {
              ...m,
              text: (language === "ar" ? "عذراً، حدث خطأ أثناء الاستعلام: " : "Sorry, query failed: ") + error.message,
              isStreaming: false
            };
          }
          return m;
        })
      );
    } finally {
      setReaderLoading(false);
      fetchUserTokenStats();
    }
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
      const lastMsgText = getLastFahemMessage().toLowerCase();
      const lastMsgTextAr = getLastFahemMessage();
      
      const isFinishing = 
        lastMsgText.includes("finalized") || 
        lastMsgText.includes("happy exploring") || 
        lastMsgText.includes("all set up") || 
        lastMsgText.includes("onboarding is complete") ||
        lastMsgText.includes("onboarding complete") ||
        lastMsgTextAr.includes("جاهز") || 
        lastMsgTextAr.includes("تم إعداد") || 
        lastMsgTextAr.includes("عائلة فاهم") ||
        lastMsgTextAr.includes("استكشاف");

      if (isFinishing) {
        return [];
      }

      const step = currentOnboardingStep ? currentOnboardingStep.trim().toLowerCase() : "";

      switch (step) {
        case "phone":
        case "name":
        case "username":
        case "parentemail":
        case "avatar":
        case "complete":
          return [];

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
              <div style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", padding: "0.4rem", borderRadius: "10px", color: "#ffffff", display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "0 4px 10px rgba(16, 107, 163, 0.25)", width: "2.3rem", height: "2.3rem", overflow: "hidden" }}>
                <img src="/brand/gemini.png" alt="Gemini Avatar" style={{ width: "1.3rem", height: "1.3rem", objectFit: "contain", animation: "pulse-kf 2s infinite ease-in-out" }} />
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "130px" }}>
                <Dropdown
                  value={language}
                  onChange={(val) => setLanguage(val as any)}
                  options={[
                    { value: "en", label: "English", labelAr: "English", icon: "🇺🇸" },
                    { value: "ar", label: "العربية", labelAr: "العربية", icon: "🇪🇬" }
                  ]}
                  language={language}
                />
              </div>
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
              if (!msg.text) return null;
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
                      {renderAvatar(onboardingAvatar || "🚀", "1.8rem")}
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
                          if (!user) {
                            alert(language === "ar" ? "يجب تسجيل الدخول أولاً." : "Please sign in first.");
                            return;
                          }
                          setOnboardingLoading(true);
                          setOnboardingStatusText(language === "ar" ? "جاري رفع الصورة إلى التخزين السحابي الآمن..." : "Uploading profile picture to secure cloud storage...");
                          const fileExtension = file.name.split('.').pop() || 'jpg';
                          const storageRef = ref(storage, "Profile Pictures/" + user.uid + "_" + Date.now() + "." + fileExtension);
                          uploadBytes(storageRef, file).then((snapshot) => {
                            getDownloadURL(snapshot.ref).then((downloadURL) => {
                              setOnboardingAvatar(downloadURL);
                              
                              // Immediate Firebase avatar download URL sync to /api/user/profile on upload
                              authedFetch("/api/user/profile", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  userId: user.uid,
                                  profile: {
                                    ...(userProfile || {}),
                                    avatar: downloadURL
                                  }
                                })
                              }).then((res) => {
                                if (res.ok) {
                                  setUserProfile((prev: any) => ({
                                    ...(prev || {}),
                                    avatar: downloadURL
                                  }));
                                }
                              }).catch((err) => console.error("Error syncing onboarding avatar to MongoDB:", err));

                              setOnboardingLoading(false);
                              setOnboardingStatusText("");
                            }).catch((err) => {
                              console.error("Error getting download URL:", err);
                              alert(language === "ar" ? "حدث خطأ أثناء استرداد رابط الصورة." : "An error occurred while retrieving the picture link.");
                              setOnboardingLoading(false);
                              setOnboardingStatusText("");
                            });
                          }).catch((err) => {
                            console.error("Error uploading file:", err);
                            alert(language === "ar" ? "حدث خطأ أثناء رفع الصورة." : "An error occurred while uploading the picture.");
                            setOnboardingLoading(false);
                            setOnboardingStatusText("");
                          });
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
                          padding: "8px 16px",
                          borderRadius: "30px",
                          border: "1px solid rgba(16, 107, 163, 0.15)",
                          background: "#ffffff",
                          color: "var(--primary)",
                          fontSize: "0.88rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.25s"
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
    <ScreenLock>
      <div className="app-layout" dir={language === "ar" ? "rtl" : "ltr"} style={{ direction: language === "ar" ? "rtl" : "ltr" }}>
      {/* Background ambient light */}
      <div className="ambient-background" style={{ zIndex: 1 }}>
        <div className="sphere sphere-1"></div>
        <div className="sphere sphere-2"></div>
        <div className="sphere sphere-3"></div>
      </div>

      {/* Mobile Sticky Header */}
      <header className="mobile-header">
        <div className="mobile-header-left" onClick={() => router.push(`/${language}`)} style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
          <img src="/brand/logo_compressed.png" alt="Fahem Logo" style={{ height: "1.8rem", width: "auto" }} />
          <span style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.5px" }}>{t("dashboard_title")}</span>
        </div>
        <div className="mobile-header-right" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <NotificationBell
            language={language}
            user={user}
            setActiveTab={setActiveTab}
            setSelectedSubjectId={setSelectedSubjectId}
            chatRecipient={chatRecipient}
            setChatRecipient={setChatRecipient}
            allUsers={allUsers}
          />
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
            <div onClick={() => router.push(`/${language}`)} style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
              <img src="/brand/logo_compressed.png" alt="Fahem Logo" style={{ height: "2.4rem", width: "auto" }} />
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



          {/* Navigation Items (Toolkit & Admin) */}
          <nav className="sidebar-nav custom-scrollbar" style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)", display: "flex", flexDirection: "column", gap: "0.15rem", paddingRight: "4px" }}>
            {(isAdmin || isDemoSandbox) && (
              <>
                <div className="sidebar-nav-header">
                  {language === "ar" ? "لوحات التحكم والتحليل" : "ADMIN CONTROLS"}
                </div>
                {/* FC7.4: Admin Panel + Users & Activity Trail are FULLY banned in the sandbox for
                    everyone (no sandbox identity is ever admin). Only real prod admins see them.
                    Curriculum Studio stays visible in the sandbox (read-only sandbox data — FC7.6). */}
                {isAdmin && !isDemoSandbox && (
                  <>
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
                <button
                  onClick={() => setActiveTab("admin-ingestion")}
                  className={`sidebar-nav-btn ${activeTab === "admin-ingestion" ? "active" : ""}`}
                  type="button"
                >
                  <FiLayers />
                  <span>{language === "ar" ? "أستوديو المناهج" : "Curriculum Studio"}</span>
                </button>
              </>
            )}

            <div className="sidebar-nav-header">
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
              onClick={() => setActiveTab("zatona")}
              className={`sidebar-nav-btn ${activeTab === "zatona" ? "active" : ""}`}
              type="button"
            >
              <FiDatabase />
              <span>{language === "ar" ? "الزتونة - ملخص وبحث" : "Zatona AI Research"}</span>
            </button>

            <button
              onClick={() => setActiveTab("insights")}
              className={`sidebar-nav-btn ${activeTab === "insights" ? "active" : ""}`}
              type="button"
            >
              <FiAward />
              <span>{language === "ar" ? "تحليل الأداء والأوسمة" : "Insights & Achievements"}</span>
            </button>

            <div className="sidebar-nav-header">
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

            {userProfile && (
              <button
                onClick={() => {
                  const targetUsername = userProfile.username || user?.email?.split("@")[0] || `user_${user?.uid?.slice(0, 6)}`;
                  router.push(`/${language}/profile/${targetUsername}`);
                }}
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
        <div className="sidebar-footer" style={{ display: "flex", flexDirection: "column", gap: "0.55rem", padding: "0.7rem 0.85rem", borderTop: "1px dashed var(--card-border)", background: "rgba(16, 107, 163, 0.01)" }}>
          {/* Controls: compact Language globe + Theme + Help (?) */}
          <div style={{ display: "flex", gap: "0.4rem", width: "100%", alignItems: "center" }}>
            {/* Compact language toggle (globe + short code) */}
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              type="button"
              title={language === "ar" ? "تغيير اللغة" : "Change language"}
              style={{ display: "flex", alignItems: "center", gap: "0.3rem", height: "34px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--primary)", cursor: "pointer", fontWeight: 800, fontSize: "0.8rem", outline: "none" }}
            >
              <FiGlobe style={{ fontSize: "1rem" }} />
              <span>{language === "ar" ? "ع" : "EN"}</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              type="button"
              className="theme-toggle-btn"
              title={language === "ar" ? "تبديل المظهر" : "Toggle Theme"}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--primary)", cursor: "pointer", transition: "all 0.2s ease", outline: "none" }}
            >
              {isDarkMode ? (
                <FiSun style={{ fontSize: "1.05rem", color: "var(--accent-yellow)" }} />
              ) : (
                <FiMoon style={{ fontSize: "1.05rem", color: "var(--primary)" }} />
              )}
            </button>

            {/* Day streak (next to globe / theme / help) */}
            <div
              title={language === "ar" ? "سلسلة الأيام المتتالية" : "Day streak"}
              style={{ display: "flex", alignItems: "center", gap: "0.25rem", height: "34px", padding: "0 9px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "#ea580c", fontWeight: 800, fontSize: "0.8rem" }}
            >
              🔥 {navStreak}
            </div>

            {/* Help / user manual ("?") */}
            <button
              onClick={() => setShowHelpModal(true)}
              type="button"
              title={language === "ar" ? "الدليل والأسئلة الشائعة" : "Help, user manual & FAQs"}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--primary)", cursor: "pointer", fontWeight: 900, fontSize: "1.05rem", outline: "none", marginInlineStart: "auto" }}
            >
              ?
            </button>
          </div>

          {/* Profile Card & Token Telemetry */}
          {user && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", width: "100%" }}>
              <div 
                className="sidebar-user-card" 
                onClick={() => {
                  const targetUsername = userProfile?.username || user?.email?.split("@")[0] || `user_${user?.uid?.slice(0, 6)}`;
                  router.push(`/${language}/profile/${targetUsername}`);
                }}
                style={{ cursor: "pointer", transition: "all 0.2s", margin: 0, width: "100%" }}
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
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span className="sidebar-user-name" title={userProfile?.name || user.displayName || user.email || ""}>
                      {userProfile?.name || user.displayName || (user.email ? user.email.split("@")[0] : "User")}
                    </span>
                    {(() => {
                      const goldBadge: React.CSSProperties = {
                        fontSize: "0.62rem",
                        fontWeight: 800,
                        color: "#b8860b",
                        background: "linear-gradient(135deg, #ffd700, #ffa500)",
                        padding: "1px 6px",
                        borderRadius: "6px",
                        boxShadow: "0 0 5px rgba(255, 215, 0, 0.4)",
                        whiteSpace: "nowrap",
                        textShadow: "0 1px 0 rgba(255,255,255,0.4)"
                      };
                      const tierBadge: React.CSSProperties = {
                        fontSize: "0.62rem",
                        fontWeight: 800,
                        color: "#1e3a8a",
                        background: "linear-gradient(135deg, #bfdbfe, #93c5fd)",
                        padding: "1px 6px",
                        borderRadius: "6px",
                        whiteSpace: "nowrap"
                      };

                      const isDemoSandbox = typeof window !== "undefined" && localStorage.getItem("app_mode") === "demo" && !!localStorage.getItem("demo_auth_token");

                      // Inside the sandbox: show the selected persona + the assigned tier (0/1) instead of a JUDGE badge.
                      if (isDemoSandbox) {
                        const persona = (typeof window !== "undefined" ? (sessionStorage.getItem("judge_selected_persona") || userProfile?.role || "student") : "student") as string;
                        const tier = (typeof window !== "undefined" ? (localStorage.getItem("demo_tier") || "0") : "0");
                        const personaLabel = persona.charAt(0).toUpperCase() + persona.slice(1);
                        return (
                          <>
                            <span style={goldBadge}>{personaLabel}</span>
                            <span style={tierBadge}>Tier-{tier}</span>
                          </>
                        );
                      }

                      // Real login: show the user's role badge for EVERY role (student/parent/
                      // teacher/admin/superadmin), not just superadmin.
                      const roleRaw = (userProfile?.role || "student").toLowerCase();
                      const roleMap: Record<string, { label: string; labelAr: string; bg: string; color: string; emoji: string }> = {
                        "super-admin": { label: "SUPERADMIN", labelAr: "مشرف عام", bg: "linear-gradient(135deg, #ffd700, #ffa500)", color: "#7c2d12", emoji: "⭐" },
                        "superadmin": { label: "SUPERADMIN", labelAr: "مشرف عام", bg: "linear-gradient(135deg, #ffd700, #ffa500)", color: "#7c2d12", emoji: "⭐" },
                        "admin": { label: "ADMIN", labelAr: "مشرف", bg: "linear-gradient(135deg, #c4b5fd, #a78bfa)", color: "#4c1d95", emoji: "🛡️" },
                        "teacher": { label: "TEACHER", labelAr: "معلّم", bg: "linear-gradient(135deg, #99f6e4, #5eead4)", color: "#115e59", emoji: "📋" },
                        "parent": { label: "PARENT", labelAr: "ولي أمر", bg: "linear-gradient(135deg, #fbcfe8, #f9a8d4)", color: "#831843", emoji: "👪" },
                        "judge": { label: "JUDGE", labelAr: "محكّم", bg: "linear-gradient(135deg, #ffd700, #ffa500)", color: "#7c2d12", emoji: "⚖️" },
                        "student": { label: "STUDENT", labelAr: "طالب", bg: "linear-gradient(135deg, #bfdbfe, #93c5fd)", color: "#1e3a8a", emoji: "🎓" },
                        "user": { label: "STUDENT", labelAr: "طالب", bg: "linear-gradient(135deg, #bfdbfe, #93c5fd)", color: "#1e3a8a", emoji: "🎓" },
                      };
                      const rb = roleMap[roleRaw] || roleMap["student"];
                      return (
                        <span style={{ ...goldBadge, background: rb.bg, color: rb.color, boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }}>
                          {rb.emoji} {language === "ar" ? rb.labelAr : rb.label}
                        </span>
                      );
                    })()}
                  </div>
                  <span className="sidebar-user-email" title={user.email || ""}>
                    {user.email}
                  </span>
                </div>
              </div>

              {/* XP + Level meter (one row, above the token usage) */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "8px 12px", borderRadius: "12px", background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,107,163,0.06))", border: "1px solid rgba(99,102,241,0.2)", fontSize: "0.72rem" }}>
                <span style={{ fontWeight: 900, color: "var(--primary)", whiteSpace: "nowrap" }}>⭐ {language === "ar" ? "مستوى" : "Lvl"} {navLevel}</span>
                <div style={{ flex: 1, height: "7px", background: "rgba(16,107,163,0.12)", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, navXp))}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #106ba3)", borderRadius: "10px", transition: "width 0.5s" }} />
                </div>
                <span style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--foreground)", whiteSpace: "nowrap" }}>{navXp}/100 XP</span>
              </div>

              {/* Token-Usage Indicator (W-9 / OR-16 Quick-Snap) */}
              <div style={{
                padding: "12px 14px",
                background: "linear-gradient(135deg, rgba(16, 107, 163, 0.08), rgba(99, 102, 241, 0.06))", 
                borderRadius: "14px", 
                border: "1px solid rgba(16, 107, 163, 0.22)",
                boxShadow: "0 4px 20px rgba(16, 107, 163, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                fontSize: "0.75rem",
                width: "100%",
                position: "relative",
                overflow: "hidden"
              }}>
                {/* Micro-glow backdrop overlay */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "1px",
                  background: "linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.4), transparent)"
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ 
                    color: "var(--primary)", 
                    fontWeight: 850, 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "0.35rem",
                    textShadow: "0 0 10px rgba(16, 107, 163, 0.15)"
                  }}>
                    🪙 {getHistoryT("dailyTokens")}
                  </span>
                  <span style={{ 
                    fontWeight: 800, 
                    color: "var(--foreground)", 
                    background: "rgba(16, 107, 163, 0.1)", 
                    padding: "2px 8px", 
                    borderRadius: "8px",
                    fontFamily: "monospace"
                  }}>
                    {dailyUsed.toLocaleString()} <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>/ {dailyLimit.toLocaleString()}</span>
                  </span>
                </div>

                <div style={{ 
                  width: "100%", 
                  height: "8px", 
                  background: "rgba(16, 107, 163, 0.12)", 
                  borderRadius: "10px", 
                  position: "relative",
                  boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.1)",
                  overflow: "hidden"
                }}>
                  <div style={{ 
                    width: `${Math.min(100, Math.max(0, tokenProgressPercent))}%`, 
                    height: "100%", 
                    background: `linear-gradient(90deg, #106ba3, #6366f1, #0d9488)`, 
                    borderRadius: "10px",
                    boxShadow: "0 0 8px rgba(99, 102, 241, 0.5)",
                    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative"
                  }}>
                    {/* Glowing highlight streak */}
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)",
                      animation: "pulse 2s infinite"
                    }} />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", marginTop: "6px", fontWeight: 700 }}>
                  <span style={{ color: "#6a7c88" }}>
                    {language === "ar" ? "مؤشر الاستهلاك السريع" : "Usage Quick-Snap"}
                  </span>
                  <span style={{ 
                    color: tokenProgressPercent > 80 ? "var(--accent)" : "var(--accent-green)",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px"
                  }}>
                    <span style={{
                      display: "inline-block",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: tokenProgressPercent > 80 ? "var(--accent)" : "var(--accent-green)",
                      boxShadow: `0 0 8px ${tokenProgressPercent > 80 ? "var(--accent)" : "var(--accent-green)"}`,
                      animation: "pulse 1.5s infinite"
                    }} />
                    {Math.round(tokenProgressPercent)}%
                  </span>
                </div>
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
        {/* Judge Sandbox Persona Switcher */}


        {/* Page Title Section */}
        <header className="page-title-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <h1>{getTabHeader().title}</h1>
            <p>{getTabHeader().subtitle}</p>
          </div>
          <div className="desktop-notification-bell" style={{ display: "block" }}>
            <NotificationBell
              language={language}
              user={user}
              setActiveTab={setActiveTab}
              setSelectedSubjectId={setSelectedSubjectId}
              chatRecipient={chatRecipient}
              setChatRecipient={setChatRecipient}
              allUsers={allUsers}
            />
          </div>
        </header>

        {activeTab === "admin" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {isDemoSandbox && (
              <div style={{ pointerEvents: "auto", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", color: "#b45309", borderRadius: "10px", padding: "8px 14px", fontWeight: 700, fontSize: "0.85rem" }}>
                {language === "ar" ? "👁️ معاينة تجريبية — تصفّح وبدّل بين التبويبات بحرية؛ أي تغييرات هنا مؤقتة وتُحذف عند الخروج." : "👁️ Sandbox preview — browse and switch tabs freely; any changes here are temporary and reset on sign-out."}
              </div>
            )}
            {/* Visual Security Configurations & Workflow Pipeline DAG */}
            <AdminSecurityDashboard language={language} email={user?.email || undefined} />
          </div>
        ) : activeTab === "admin-ingestion" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem", minWidth: 0, width: "100%", maxWidth: "100%" }}>
            {isDemoSandbox && (
              <div style={{ pointerEvents: "auto", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", color: "#b45309", borderRadius: "10px", padding: "8px 14px", fontWeight: 700, fontSize: "0.85rem" }}>
                {language === "ar" ? "👁️ معاينة تجريبية — تصفّح وبدّل بين التبويبات بحرية؛ أي تغييرات هنا مؤقتة وتُحذف عند الخروج." : "👁️ Sandbox preview — browse and switch tabs freely; any changes here are temporary and reset on sign-out."}
              </div>
            )}
            {/* Premium Curriculum Ingestion Studio Panel */}
            <CurriculumIngestionStudio language={language} email={user?.email || undefined} />
          </div>
        ) : activeTab === "super-admin-users" ? (
          <div>
            {isDemoSandbox && (
              <div style={{ pointerEvents: "auto", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", color: "#b45309", borderRadius: "10px", padding: "8px 14px", fontWeight: 700, fontSize: "0.85rem", marginBottom: "1rem" }}>
                {language === "ar" ? "👁️ معاينة تجريبية — تصفّح وبدّل بين التبويبات بحرية؛ أي تغييرات هنا مؤقتة وتُحذف عند الخروج." : "👁️ Sandbox preview — browse and switch tabs freely; any changes here are temporary and reset on sign-out."}
              </div>
            )}
            <UserAccountsPanel
              language={language}
              allUsers={allUsers}
              adminUserSearch={adminUserSearch}
              setAdminUserSearch={setAdminUserSearch}
              fetchAllUsersList={fetchAllUsersList}
              handleAdminUpdateUser={handleAdminUpdateUser}
              inspectedUser={inspectedUser}
              setInspectedUser={setInspectedUser}
              renderAvatar={renderAvatar}
              t={t}
            />
          </div>
        ) : activeTab === "library" ? (
          <LibraryPanel
            language={language}
            user={user}
            isAdmin={isAdmin}
            selectedBookReader={selectedBookReader}
            setSelectedBookReader={setSelectedBookReader}
            loadedBookPages={loadedBookPages}
            setLoadedBookPages={setLoadedBookPages}
            loadingBookPages={loadingBookPages}
            readerCurrentPage={readerCurrentPage}
            setReaderCurrentPage={setReaderCurrentPage}
            translationLanguage={translationLanguage}
            setTranslationLanguage={setTranslationLanguage}
            selectedText={selectedText}
            setSelectedText={setSelectedText}
            bubbleCoords={bubbleCoords}
            setBubbleCoords={setBubbleCoords}
            getAllPages={getAllPages}
            dynamicBooks={dynamicBooks}
            librarySearch={librarySearch}
            setLibrarySearch={setLibrarySearch}
            librarySubject={librarySubject}
            setLibrarySubject={setLibrarySubject}
            customUploadedBooks={customUploadedBooks}
            setCustomUploadedBooks={setCustomUploadedBooks}
            dynamicMaxUploadSize={dynamicMaxUploadSize}
            handleStartStudy={handleStartStudy}
            t={t}
          />
        ) : activeTab === "subjects" ? (
          <SubjectsPanel
            language={language}
            dynamicSubjects={dynamicSubjects}
            dynamicBooks={dynamicBooks}
            selectedSubjectId={selectedSubjectId}
            setSelectedSubjectId={setSelectedSubjectId}
            handleStartStudy={handleStartStudy}
            t={t}
          />
        ) : activeTab === "practice" ? (
          <PracticePanel
            language={language}
            dynamicBooks={dynamicBooks}
            renderSpaceSelectorBar={renderSpaceSelectorBar}
            renderSpaceHistory={renderSpaceHistory}
            addSpaceHistory={addSpaceHistory}
            renderPremiumContent={renderPremiumContent}
            t={t}
            user={user}
            userProfile={userProfile}
          />
        ) : activeTab === "plan" ? (
          <StudyPlanPanel
            language={language}
            dynamicBooks={dynamicBooks}
            renderSpaceSelectorBar={renderSpaceSelectorBar}
            renderSpaceHistory={renderSpaceHistory}
            addSpaceHistory={addSpaceHistory}
            renderPremiumContent={renderPremiumContent}
            t={t}
            user={user}
          />
        ) : activeTab === "timetable" ? (
          <TimetablePanel
            language={language}
            timetableEvents={timetableEvents}
            setTimetableEvents={setTimetableEvents}
            renderSpaceSelectorBar={renderSpaceSelectorBar}
            renderSpaceHistory={renderSpaceHistory}
            t={t}
          />
        ) : activeTab === "zatona" ? (
          <ZatonaPanel
            language={language as "ar" | "en"}
            zatonaPrompt={zatonaPrompt}
            setZatonaPrompt={setZatonaPrompt}
            zatonaResult={zatonaResult}
            setZatonaResult={setZatonaResult}
            zatonaLoading={zatonaLoading}
            setZatonaLoading={setZatonaLoading}
            dynamicBooks={dynamicBooks}
            renderSpaceSelectorBar={renderSpaceSelectorBar}
            renderSpaceHistory={renderSpaceHistory}
            addSpaceHistory={addSpaceHistory}
            renderPremiumContent={renderPremiumContent}
            user={user}
          />
        ) : activeTab === "insights" ? (
          <InsightsPanel
            language={language}
            dynamicBooks={dynamicBooks}
            user={user}
            authedFetch={authedFetch}
            getLevelBadgeText={getLevelBadgeText}
            activeLevel={activeLevel}
            activeStreak={activeStreak}
            xpProgressPercent={xpProgressPercent}
            activeXp={activeXp}
            nextLevelXp={nextLevelXp}
            consumedClt={consumedClt}
            totalAllocatedClt={totalAllocatedClt}
            tokenProgressPercent={tokenProgressPercent}
            t={t}
          />
        ) : activeTab === "social" ? (
          <SocialPanel
            language={language as "ar" | "en"}
            user={user}
            userProfile={userProfile}
            parentChildrenLoading={parentChildrenLoading}
            parentChildren={parentChildren}
            approveChildProfile={approveChildProfile}
            chatRecipient={chatRecipient}
            setChatRecipient={setChatRecipient}
            chatLoading={chatLoading}
            chatMessages={chatMessages}
            typingUsers={typingUsers}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendChatMessage={sendChatMessage}
            fetchChatMessages={fetchChatMessages}
            allUsers={allUsers}
            loadingAllUsers={loadingAllUsers}
            directorySearch={directorySearch}
            setDirectorySearch={setDirectorySearch}
            handleToggleFriend={handleToggleFriend}
            renderAvatar={renderAvatar}
          />
        ) : activeTab === "settings" ? (
          <SettingsPanel
            language={language as "ar" | "en"}
            user={user}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            settingsAvatarTab={settingsAvatarTab}
            setSettingsAvatarTab={setSettingsAvatarTab}
            settingsAvatar={settingsAvatar}
            setSettingsAvatar={setSettingsAvatar}
            avatarCategories={avatarCategories}
            settingsLoading={settingsLoading}
            setSettingsLoading={setSettingsLoading}
            settingsStatusText={settingsStatusText}
            setSettingsStatusText={setSettingsStatusText}
            preferencesSchool={preferencesSchool}
            setPreferencesSchool={setPreferencesSchool}
            privacyVisibility={privacyVisibility}
            setPrivacyVisibility={setPrivacyVisibility as any}
            privacyAllowMessages={privacyAllowMessages}
            setPrivacyAllowMessages={setPrivacyAllowMessages}
            privacyShowActivity={privacyShowActivity}
            setPrivacyShowActivity={setPrivacyShowActivity}
            handleUpdatePrivacySettings={handleUpdatePrivacySettings}
            handleDeleteUserAccount={handleDeleteUserAccount}
            getLevelBadgeText={getLevelBadgeText}
            activeLevel={activeLevel}
            activeStreak={activeStreak}
            xpProgressPercent={xpProgressPercent}
            activeXp={activeXp}
            nextLevelXp={nextLevelXp}
            consumedClt={consumedClt}
            totalAllocatedClt={totalAllocatedClt}
            tokenProgressPercent={tokenProgressPercent}
            remainingClt={remainingClt}
            renderAvatar={renderAvatar}
          />
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

          <div style={{ display: "flex", justifyContent: "center", gap: "1.75rem", alignItems: "center", marginBottom: "1.5rem" }}>
            <a href="https://x.com/fahempro" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="X" 
               style={{ display: "inline-flex", opacity: 0.7, transition: "all 0.3s ease", transform: "scale(1)" }}
               onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.opacity = "1"; }}
               onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.7"; }}>
              <img src="/brand/social_x.png" alt="X" width="22" height="22" style={{ objectFit: "contain", filter: isDarkMode ? "invert(1)" : "none" }} />
            </a>
            <a href="https://www.instagram.com/fahem.pro/" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Instagram" 
               style={{ display: "inline-flex", opacity: 0.7, transition: "all 0.3s ease", transform: "scale(1)" }}
               onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.opacity = "1"; }}
               onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.7"; }}>
              <img src="/brand/social_instagram.png" alt="Instagram" width="22" height="22" style={{ objectFit: "contain" }} />
            </a>
            <a href="https://www.facebook.com/ai.fahem.pro/" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Facebook" 
               style={{ display: "inline-flex", opacity: 0.7, transition: "all 0.3s ease", transform: "scale(1)" }}
               onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.opacity = "1"; }}
               onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.7"; }}>
              <img src="/brand/social_facebook.png" alt="Facebook" width="22" height="22" style={{ objectFit: "contain" }} />
            </a>
            <a href="mailto:contact@fahem.pro" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Email" 
               style={{ display: "inline-flex", opacity: 0.7, transition: "all 0.3s ease", transform: "scale(1)" }}
               onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.opacity = "1"; }}
               onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.7"; }}>
              <img src="/brand/social_email.png" alt="Email" width="22" height="22" style={{ objectFit: "contain", filter: isDarkMode ? "invert(1)" : "none" }} />
            </a>
          </div>

          {/* Unified copyright and attribution line */}
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              {language === "ar" ? (
                <>
                  صُنع بكل حب ❤️ جميع الحقوق محفوظة لـ <a href="https://asdaa.co" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline", fontWeight: 700 }}>Asdaa</a> وفريق فاهم
                </>
              ) : (
                <>
                  Made with love ❤️ All rights reserved to <a href="https://asdaa.co" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline", fontWeight: 700 }}>Asdaa</a> and Fahem Team
                </>
              )}
            </p>
          </div>
        </footer>

        {renderSpaceModal()}
        {showHelpModal && <HelpManual language={language as "en" | "ar"} onClose={() => setShowHelpModal(false)} />}


      </main>
      <DemoTourGuide activeTab={activeTab} setActiveTab={setActiveTab} language={language} />
    </div>
    </ScreenLock>
  );
}
