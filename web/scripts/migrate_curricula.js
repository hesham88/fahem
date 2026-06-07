const fs = require("fs");
const path = require("path");

const LOCAL_DB_PATH = path.join(__dirname, "../src/app/api/local_db.json");

function migrate() {
  console.log("Starting Local Database Migration for Curriculum Data Model...");
  
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    console.error(`Error: local_db.json not found at ${LOCAL_DB_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(LOCAL_DB_PATH, "utf8");
  const db = JSON.parse(raw);

  // 1. Define Standard Libraries
  const libraries = [
    {
      _id: "lib_moe",
      name: "Egyptian MOE",
      name_ar: "وزارة التربية والتعليم",
      source: "moe",
      logo: "/libs/moe.svg",
      scopeSchema: [
        {
          key: "grade",
          label: "Grade",
          label_ar: "الصف",
          type: "enum",
          options: [
            "Primary 1",
            "Primary 2",
            "Primary 3",
            "Primary 4",
            "Primary 5",
            "Primary 6",
            "Preparatory 1",
            "Preparatory 2",
            "Preparatory 3",
            "Secondary 1",
            "Secondary 2",
            "Secondary 3"
          ]
        },
        {
          key: "term",
          label: "Term",
          label_ar: "الفصل الدراسي",
          type: "enum",
          options: ["Term 1", "Term 2", "Full Year"]
        },
        {
          key: "year",
          label: "Year",
          label_ar: "العام الدراسي",
          type: "string"
        }
      ],
      status: "active"
    },
    {
      _id: "lib_openstax",
      name: "OpenStax Library",
      name_ar: "مكتبة أوبن ستاكس",
      source: "openstax",
      logo: "/libs/openstax.svg",
      scopeSchema: [
        {
          key: "discipline",
          label: "Discipline",
          label_ar: "التخصص",
          type: "enum",
          options: ["Science", "Mathematics", "Social Sciences", "Humanities", "Business", "College Success"]
        },
        {
          key: "level",
          label: "Level",
          label_ar: "المستوى",
          type: "enum",
          options: ["College", "High School", "General"]
        }
      ],
      status: "active"
    },
    {
      _id: "lib_private",
      name: "Private Vault",
      name_ar: "الخزانة الخاصة",
      source: "private",
      logo: "/libs/private.svg",
      scopeSchema: [
        {
          key: "category",
          label: "Category",
          label_ar: "الفئة",
          type: "enum",
          options: ["My Uploads", "Shared with Me", "Uncategorized"]
        }
      ],
      status: "active"
    }
  ];

  db.libraries = libraries;

  // 2. Define Curricula and Subjects arrays
  const curricula = [];
  const subjects = [];

  // Grouping books
  const books = db.books || [];
  const migratedBooks = [];

  // Pre-seed some default curricula
  const openstaxMathCurriculum = {
    _id: "cur_openstax_math_college",
    library_id: "lib_openstax",
    title: "OpenStax — Mathematics & CS College Series",
    title_ar: "أوبن ستاكس — سلسلة الرياضيات وعلوم الحاسب الجامعية",
    scope: { discipline: "Mathematics", level: "College" },
    subject_ids: ["sub_computer_science_1780535716963"],
    status: "published",
    visibility: "public",
    owner_uid: null,
    created_by: "system",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  curricula.push(openstaxMathCurriculum);

  // Subject for OpenStax CS
  const openstaxCsSubject = {
    _id: "sub_computer_science_1780535716963",
    curriculum_id: "cur_openstax_math_college",
    name: "Computer Science",
    name_ar: "علوم الحاسب",
    color: "#6366F1",
    emoji: "💻",
    category: "Computer Science",
    core_book_ids: ["book_introduction_to_python_programming_1780627757426"],
    supporting_book_ids: [],
    books_count: 1
  };
  subjects.push(openstaxCsSubject);

  // Loop through books and migrate them
  books.forEach(book => {
    let libId = "lib_moe";
    let currId = "";
    let subjId = "";
    let role = "core";
    let visibility = book.visibility || "public";
    let ownerUid = book.userId || null;

    if (book._id === "book_introduction_to_python_programming_1780627757426") {
      libId = "lib_openstax";
      currId = "cur_openstax_math_college";
      subjId = "sub_computer_science_1780535716963";
      role = "core";
      visibility = "public";
      ownerUid = null;
    } else if (book.userId && (book._id === "book_python_real_test" || book._id === "book_history_real_test")) {
      // Private user upload
      libId = "lib_private";
      currId = `cur_private_${book.userId}`;
      subjId = `subj_private_${book.userId}`;
      role = "core";
      visibility = "private";
      ownerUid = book.userId;

      // Check if curriculum already exists
      let privateCurr = curricula.find(c => c._id === currId);
      if (!privateCurr) {
        privateCurr = {
          _id: currId,
          library_id: "lib_private",
          title: "My Private Vault",
          title_ar: "خزانتي الخاصة",
          scope: { category: "My Uploads" },
          subject_ids: [subjId],
          status: "published",
          visibility: "private",
          owner_uid: book.userId,
          created_by: book.userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        curricula.push(privateCurr);
      }

      // Check if subject already exists
      let privateSubj = subjects.find(s => s._id === subjId);
      if (!privateSubj) {
        privateSubj = {
          _id: subjId,
          curriculum_id: currId,
          name: "My Documents",
          name_ar: "مستنداتي",
          color: "#4F46E5",
          emoji: "🔒",
          category: "Private",
          core_book_ids: [],
          supporting_book_ids: [],
          books_count: 0
        };
        subjects.push(privateSubj);
      }
      if (!privateSubj.core_book_ids.includes(book._id)) {
        privateSubj.core_book_ids.push(book._id);
        privateSubj.books_count++;
      }
    } else {
      // Public MOE book or normal book
      libId = "lib_moe";
      
      // Let's parse grade/term/year from book or fallback
      let grade = "Secondary 2"; // fallback for Grade 11
      if (book.grade === "Secondary 1" || book.grade === "Secondary 2" || book.grade === "Secondary 3") {
        grade = book.grade;
      } else if (book.grade === "Grade 11") {
        grade = "Secondary 2";
      } else if (book.grade === "Grade 12") {
        grade = "Secondary 3";
      } else if (book.grade === "Grade 9" || book.grade === "Preparatory 3") {
        grade = "Preparatory 3";
      }

      let term = book.term === "Term 2" ? "Term 2" : "Term 1";
      let year = book.year || "2026";

      // Form unique curriculum ID: e.g. cur_moe_secondary2_term1_2026
      const slugGrade = grade.toLowerCase().replace(" ", "");
      const slugTerm = term.toLowerCase().replace(" ", "");
      currId = `cur_moe_${slugGrade}_${slugTerm}_${year}`;

      // Check if curriculum exists
      let moeCurr = curricula.find(c => c._id === currId);
      if (!moeCurr) {
        moeCurr = {
          _id: currId,
          library_id: "lib_moe",
          title: `MOE — ${grade} · ${term} · ${year}`,
          title_ar: `وزارة التربية والتعليم — ${grade === "Secondary 1" ? "الصف الأول الثانوي" : grade === "Secondary 2" ? "الصف الثاني الثانوي" : "الصف الثالث الثانوي"} · ${term === "Term 1" ? "الفصل الدراسي الأول" : "الفصل الدراسي الثاني"} · ${year}`,
          scope: { grade, term, year },
          subject_ids: [],
          status: "published",
          visibility: "public",
          owner_uid: null,
          created_by: "system",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        curricula.push(moeCurr);
      }

      // Map subject_id
      // Let's use existing subject mapping or map subj_algebra_stats
      subjId = book.subject_id || "subj_algebra_stats";
      if (subjId === "subj_user_uploads") {
        subjId = "subj_algebra_stats"; // clean up
      }

      const specificSubjId = `${subjId}_${slugGrade}_${slugTerm}`;
      if (!moeCurr.subject_ids.includes(specificSubjId)) {
        moeCurr.subject_ids.push(specificSubjId);
      }

      // Check if subject exists
      let moeSubj = subjects.find(s => s._id === specificSubjId);
      if (!moeSubj) {
        // Find legacy subject template
        const legacySubj = (db.subjects || []).find(s => s._id === subjId) || {
          name: "Pure Mathematics",
          name_ar: "الرياضيات البحتة",
          emoji: "📐",
          category: "Math"
        };

        moeSubj = {
          _id: specificSubjId,
          curriculum_id: currId,
          name: legacySubj.name,
          name_ar: legacySubj.name_ar,
          color: legacySubj._id === "subj_algebra_stats" ? "#1E96A0" : "#E11D48",
          emoji: legacySubj.emoji || "📚",
          category: legacySubj.category || "General",
          core_book_ids: [],
          supporting_book_ids: [],
          books_count: 0
        };
        subjects.push(moeSubj);
      }

      if (!moeSubj.core_book_ids.includes(book._id)) {
        moeSubj.core_book_ids.push(book._id);
        moeSubj.books_count++;
      }

      subjId = specificSubjId;
    }

    // Modernized book schema mapping
    const migratedBook = {
      ...book,
      library_id: libId,
      curriculum_id: currId,
      subject_id: subjId,
      role: role,
      visibility: visibility,
      owner_uid: ownerUid,
      totalPages: book.total_pages || book.totalPages || 0,
      status: book.ingestion_status === "completed" || book.is_completed ? "embedded" : "processing"
    };

    // clean up legacy keys that are mapped or retired
    delete migratedBook.grade;
    delete migratedBook.term;
    delete migratedBook.year;
    delete migratedBook.is_completed;
    delete migratedBook.total_pages;

    migratedBooks.push(migratedBook);
  });

  // Write subjects, books, curricula and libraries back to database
  db.libraries = libraries;
  db.curricula = curricula;
  db.subjects = subjects;
  db.books = migratedBooks;

  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), "utf8");
  console.log("Local Database Migration successfully completed! 🎉");
  console.log(`- Libraries count: ${libraries.length}`);
  console.log(`- Curricula count: ${curricula.length}`);
  console.log(`- Subjects count: ${subjects.length}`);
  console.log(`- Books count: ${migratedBooks.length}`);
}

migrate();
