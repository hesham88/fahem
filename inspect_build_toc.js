const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'web', 'src', 'app', 'api', 'local_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const book = db.books.find(b => b._id === 'openstax_python_programming');

const sourceChapters = book.chapters || [];

const isMainChapter = (title) => {
  if (!title) return false;
  const t = title.trim().toLowerCase();
  const isChPattern = /^(chapter|chap|الفصل|باب)\s+\d+/i.test(t);
  if (isChPattern) return true;

  const mainTitles = [
    "book cover", "cover", "غلاف الكتاب", "غلاف",
    "contents", "المحتويات", "الفهرس", "فهرس",
    "preface", "المقدمة", "تمهيد", "مقدمة",
    "answer key", "مفاتيح الإجابات", "حلول", "الأجوبة",
    "index", "كشاف"
  ];
  return mainTitles.includes(t);
};

const nestedChapters = [];
let currentMain = null;

sourceChapters.forEach((ch, idx) => {
  const titleEn = ch.titleEn || ch.title || ch.title_en || ch.titleAr || `Section ${idx + 1}`;
  const titleAr = ch.titleAr || ch.title_ar || ch.title || ch.titleEn || `القسم ${idx + 1}`;
  const start = ch.start_page ?? ch.startPage ?? ch.page_start ?? null;
  const end = ch.end_page ?? ch.endPage ?? ch.page_end ?? null;

  let isContained = false;
  if (currentMain && start !== null && end !== null) {
    const mainStart = currentMain.startPage;
    const mainEnd = currentMain.endPage;
    if (mainStart !== null && mainEnd !== null) {
      isContained = (start >= mainStart && end <= mainEnd);
    }
  }

  const isMain = isMainChapter(titleEn) || isMainChapter(titleAr) || !isContained;

  if (isMain || !currentMain) {
    currentMain = {
      id: `ch-${idx}`,
      titleEn,
      titleAr,
      pageNum: start || ch.pageNum || ch.page_number || ch.pageNumber || 1,
      startPage: start,
      endPage: end,
      topics: []
    };
    nestedChapters.push(currentMain);
  } else {
    currentMain.topics.push({
      id: `top-${idx}`,
      titleEn,
      titleAr,
      pageNum: start || ch.pageNum || ch.page_number || ch.pageNumber || currentMain.pageNum
    });
  }
});

nestedChapters.forEach((ch) => {
  console.log(`Chapter: ${ch.titleEn} (${ch.startPage}-${ch.endPage}) - topics count: ${ch.topics.length}`);
  ch.topics.forEach(t => {
    console.log(`  -> Topic: ${t.titleEn} (pageNum: ${t.pageNum})`);
  });
});
