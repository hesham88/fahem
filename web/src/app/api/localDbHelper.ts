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
}

const DEFAULT_DB: LocalDb = {
  subjects: [
    { _id: "subj_algebra_stats", name: "Pure Mathematics", name_ar: "الرياضيات العامة", emoji: "📐", category: "Math", grade_level: "General", books_count: 1 },
    { _id: "subj_biology", name: "Physics & Chemistry", name_ar: "العلوم والفيزياء", emoji: "🧪", category: "Science", grade_level: "General", books_count: 1 },
    { _id: "subj_arabic_grammar", name: "Arabic Grammar & Literature", name_ar: "اللغة العربية وآدابها", emoji: "📚", category: "Arabic", grade_level: "General", books_count: 1 }
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
    { email: "admin.candidate@fahem.edu", name: "Anas Al-Sayed", isApprovedAdmin: false },
    { email: "contact@asdaa.co", name: "Asdaa Tech", isApprovedAdmin: true },
    { email: "hesham1988@gmail.com", name: "Hesham", isApprovedAdmin: true }
  ],
  config: {
    isTokenControlActive: true,
    weeklyAllocationLimit: 250000,
    monthlyAllocationLimit: 1000000,
    maxUploadSize: 2 // 2MB
  }
};

export function isLocalEnv(): boolean {
  // If MONGODB_URI is not set, or contains -pri (internal VPC), or we are not in GCP Cloud Run
  const hasPri = (process.env.MONGODB_URI || "").includes("-pri");
  const isCloudRun = !!process.env.K_SERVICE;
  return !isCloudRun || hasPri || process.env.NODE_ENV === "development";
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
    return JSON.parse(data);
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
