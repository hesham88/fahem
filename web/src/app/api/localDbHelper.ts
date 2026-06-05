import fs from "fs";
import path from "path";

const LOCAL_DB_PATH = path.join(process.cwd(), "src/app/api/local_db.json");

interface LocalDb {
  subjects: any[];
  books: any[];
  admins: any[];
  config?: {
    isTokenControlActive: boolean;
    weeklyAllocationLimit: number;
    monthlyAllocationLimit: number;
    maxUploadSize: number; // in MB, e.g. 2 for 2MB
  };
  social_groups?: any[];
  social_threads?: any[];
  social_replies?: any[];
  users?: any[];
  admin_change_requests?: any[];
  user_activities?: any[];
  chat_sessions?: any[];
}

const DEFAULT_DB: LocalDb = {
  subjects: [
    { _id: "subj_algebra_stats", name: "Pure Mathematics", name_ar: "الرياضيات العامة", emoji: "📐", category: "Math", grade_level: "General", books_count: 1 },
    { _id: "subj_biology", name: "Physics & Chemistry", name_ar: "العلوم والفيزياء", emoji: "🧪", category: "Science", grade_level: "General", books_count: 1 },
    { _id: "subj_arabic_grammar", name: "Arabic Grammar & Literature", name_ar: "اللغة العربية وآدابها", emoji: "📚", category: "Arabic", grade_level: "General", books_count: 1 },
    { _id: "sub_computer_science_1780535716963", name: "Computer Science", name_ar: "علوم الحاسب", emoji: "💻", category: "Computer Science", grade_level: "General", books_count: 1 },
    { _id: "subj_business", name: "Business & Economics", name_ar: "الأعمال والاقتصاد", emoji: "💼", category: "Business", grade_level: "General", books_count: 1 },
    { _id: "subj_social_sciences", name: "Social Sciences & Humanities", name_ar: "العلوم الاجتماعية والإنسانيات", emoji: "🌍", category: "Social Sciences", grade_level: "General", books_count: 1 }
  ],
  books: [
    {
      _id: "book_algebra_stats_1",
      subject_id: "subj_algebra_stats",
      title: "Advanced Mathematics Grade 9",
      title_ar: "الرياضيات المتقدمة - الصف التاسع",
      grade: "Grade 9",
      term: "Term 1",
      year: "2026",
      language: "ar",
      book_type: "core",
      chapters: [
        { title: "Algebra Basics", title_ar: "أساسيات الجبر", start_page: 1, end_page: 25 },
        { title: "Quadratic Equations", title_ar: "المعادلات التربيعية", start_page: 26, end_page: 50 }
      ]
    },
    {
      _id: "book_biology_1",
      subject_id: "subj_biology",
      title: "Comprehensive Chemistry Handbook",
      title_ar: "كتاب الكيمياء الشامل والمبسط",
      grade: "Grade 10",
      term: "Term 1",
      year: "2026",
      language: "ar",
      book_type: "core",
      chapters: [
        { title: "Chemical Bonds", title_ar: "الروابط الكيميائية", start_page: 1, end_page: 30 }
      ]
    }
  ],
  admins: [
    { email: "hesham1988@gmail.com", name: "Hesham", isApprovedAdmin: true },
    { email: "admin@fahem.edu", name: "Approved Admin", isApprovedAdmin: true }
  ],
  config: {
    isTokenControlActive: true,
    weeklyAllocationLimit: 250000,
    monthlyAllocationLimit: 1000000,
    maxUploadSize: 2 // 2MB
  },
  social_groups: [
    { _id: "group_math", name: "Pure Mathematics Club", name_ar: "نادي الرياضيات البحتة", description: "Math enthusiasts and algebra discussion.", description_ar: "مساحة مخصصة لعشاق الرياضيات ومناقشة المسائل الجبرية.", category: "Math", emoji: "📐", members_count: 12 },
    { _id: "group_science", name: "Physics & Chemistry Lab", name_ar: "مختبر الفيزياء والكيمياء", description: "Scientific experiments and theory chat.", description_ar: "تجارب ونقاشات حول النظريات الفيزيائية والتفاعلات الكيميائية.", category: "Science", emoji: "🧪", members_count: 8 },
    { _id: "group_arabic", name: "Arabic Literature Circle", name_ar: "حلقة الأدب العربي", description: "Arabic grammar, prose and poetry discussion.", description_ar: "منبر لمناقشة قواعد اللغة العربية، النثر والقصائد الأدبية.", category: "Arabic", emoji: "📚", members_count: 15 }
  ],
  social_threads: [
    {
      _id: "thread_math_1",
      group_id: "group_math",
      title: "How to solve complex quadratic equations quickly?",
      title_ar: "كيفية حل المعادلات التربيعية المعقدة بسرعة؟",
      content: "Does anyone have a fast method or shortcut for resolving quadratic equations with high constants without drawing the whole parabola?",
      content_ar: "هل لدى أحدكم طريقة سريعة أو اختصار لحل المعادلات التربيعية ذات الثوابت الكبيرة دون الحاجة لرسم المنحنى البياني بالكامل؟",
      author_id: "user_student_1",
      author_name: "Ahmed Al-Mansoori",
      author_avatar: "👨‍🎓",
      created_at: "2026-06-03T12:00:00Z",
      likes_count: 4,
      replies_count: 1
    }
  ],
  social_replies: [
    {
      _id: "reply_math_1_1",
      thread_id: "thread_math_1",
      content: "You can use the quadratic formula directly, or look for perfect square trinomial decompositions. If constants are very high, try dividing by common factors first!",
      content_ar: "يمكنك استخدام القانون العام مباشرة، أو البحث عن تحليل المربع الكامل. إذا كانت الثوابت كبيرة جداً، جرب القسمة على العوامل المشتركة أولاً!",
      author_id: "user_teacher_1",
      author_name: "Mr. Mostafa",
      author_avatar: "👨‍🏫",
      created_at: "2026-06-03T14:30:00Z"
    }
  ],
  users: [
    { userId: "user_student_1", name: "Ahmed Al-Mansoori", username: "ahmed_student", email: "ahmed@student.edu", role: "student", userType: "student", school: "Al-Ahram School", isWhitelisted: false, banned: false, avatar: "👨‍🎓", country: "EG", grade: "Grade 9" },
    { userId: "user_teacher_1", name: "Mr. Mostafa", username: "mostafa_teacher", email: "mostafa@teacher.edu", role: "teacher", userType: "teacher", school: "El Nasr School", isWhitelisted: true, banned: false, avatar: "👨‍🏫", country: "EG", grade: "Grade 10" },
    { userId: "user_admin_1", name: "Approved Admin", username: "admin_standard", email: "admin@fahem.edu", role: "admin", userType: "admin", school: "Fahem Academy", isWhitelisted: true, banned: false, avatar: "👤", country: "EG", grade: "General" },
    { userId: "user_super_1", name: "Hesham", username: "hesham1988", email: "hesham1988@gmail.com", role: "super-admin", userType: "admin", school: "Fahem HQ", isWhitelisted: true, banned: false, avatar: "👑", country: "EG", grade: "General" }
  ],
  admin_change_requests: [],
  user_activities: []
};

export function isLocalEnv(): boolean {
  if (process.env.FORCE_REAL_DB === "true" || process.env.NEXT_PUBLIC_STAGING === "true" || process.env.STAGING === "true") {
    return false; // Force staging/delivery database config, bypassing local fallbacks
  }
  if (process.env.NODE_ENV === "production") {
    return false; // Staging & production are NEVER local envs
  }
  const isCloudRun = !!process.env.K_SERVICE;
  if (isCloudRun) {
    return false; // Production/Cloud Run is NEVER local
  }
  // If running locally, check if MONGODB_URI is not set or contains -pri (meaning it's private and unreachable locally)
  const hasPri = (process.env.MONGODB_URI || "").includes("-pri");
  const noUri = !process.env.MONGODB_URI;
  return noUri || hasPri || process.env.NODE_ENV === "development";
}

export function shouldSkipDirectMongo(): boolean {
  // If we are in production and MONGODB_URI contains "-pri" but we are not on Cloud Run directly
  const hasPri = (process.env.MONGODB_URI || "").includes("-pri");
  const isCloudRun = !!process.env.K_SERVICE;
  return hasPri && !isCloudRun;
}

export function getLocalDb(): LocalDb {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      // Ensure directory exists
      const dir = path.dirname(LOCAL_DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(LOCAL_DB_PATH, "utf8");
    const db = JSON.parse(data) as LocalDb;
    
    // Ensure social keys are initialized if they don't exist in existing JSON file
    let updated = false;
    if (!db.social_groups) {
      db.social_groups = DEFAULT_DB.social_groups;
      updated = true;
    }
    if (!db.social_threads) {
      db.social_threads = DEFAULT_DB.social_threads;
      updated = true;
    }
    if (!db.social_replies) {
      db.social_replies = DEFAULT_DB.social_replies;
      updated = true;
    }
    if (!db.users) {
      db.users = DEFAULT_DB.users;
      updated = true;
    }
    if (!db.admin_change_requests) {
      db.admin_change_requests = DEFAULT_DB.admin_change_requests;
      updated = true;
    }
    if (!db.user_activities) {
      db.user_activities = [];
      updated = true;
    }
    if (!db.chat_sessions) {
      db.chat_sessions = [];
      updated = true;
    }
    
    if (updated) {
      saveLocalDb(db);
    }
    
    return db;
  } catch (err) {
    console.error("[localDbHelper] Error reading local DB:", err);
    return DEFAULT_DB;
  }
}

export function saveLocalDb(db: LocalDb): boolean {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("[localDbHelper] Error writing to local DB:", err);
    return false;
  }
}

export function resolveScriptPath(subPath: string): string {
  // Try process.cwd()/scripts/subPath
  const localPath = path.join(process.cwd(), "scripts", subPath);
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  // Try process.cwd()/../scripts/subPath
  const parentPath = path.join(process.cwd(), "..", "scripts", subPath);
  if (fs.existsSync(parentPath)) {
    return parentPath;
  }
  // Fallback to localPath
  return localPath;
}

