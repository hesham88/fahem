const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'web', 'src', 'app', 'api', 'local_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('Starting DB Purge...');

// 1. Identify MOE Library
const libMoe = db.libraries.find(l => l._id === 'lib_moe');
if (libMoe) {
  console.log('Found MOE library:', libMoe.name);
  db.libraries = db.libraries.filter(l => l._id !== 'lib_moe');
} else {
  console.log('MOE library not found.');
}

// 2. Identify MOE Curricula
const moeCurricula = db.curricula.filter(c => c.library_id === 'lib_moe');
const moeCurriculaIds = moeCurricula.map(c => c._id);
console.log(`Found ${moeCurricula.length} MOE curricula:`, moeCurriculaIds);

// Filter them out
db.curricula = db.curricula.filter(c => c.library_id !== 'lib_moe');

// 3. Identify and Delete Associated Subjects
const subjectsToDelete = [];
moeCurricula.forEach(c => {
  if (c.subject_ids && Array.isArray(c.subject_ids)) {
    subjectsToDelete.push(...c.subject_ids);
  }
});
console.log(`Found ${subjectsToDelete.length} subjects to delete:`, subjectsToDelete);

// Filter them out from subjects
db.subjects = db.subjects.filter(s => !subjectsToDelete.includes(s._id));

// 4. Identify and Delete Associated Books
const booksToDelete = db.books.filter(b => b.library_id === 'lib_moe' || b.curriculum_id && moeCurriculaIds.includes(b.curriculum_id));
const booksToDeleteIds = booksToDelete.map(b => b._id);
console.log(`Found ${booksToDelete.length} books to delete:`, booksToDeleteIds);

// Filter them out from books
db.books = db.books.filter(b => b.library_id !== 'lib_moe' && !(b.curriculum_id && moeCurriculaIds.includes(b.curriculum_id)));

// 5. Delete Book Pages for deleted books
const originalPagesCount = db.book_pages.length;
db.book_pages = db.book_pages.filter(p => !booksToDeleteIds.includes(p.book_id));
const deletedPagesCount = originalPagesCount - db.book_pages.length;
console.log(`Deleted ${deletedPagesCount} book pages associated with deleted books.`);

// 6. Clear crawl_jobs and ingestion_jobs backlog
const originalCrawlJobsCount = (db.crawl_jobs || []).length;
const originalIngestJobsCount = (db.ingestion_jobs || []).length;
db.crawl_jobs = [];
db.ingestion_jobs = [];
db.ingestion_chunks_draft = [];
console.log(`Cleared crawl jobs (${originalCrawlJobsCount} cleared) and ingestion jobs (${originalIngestJobsCount} cleared).`);

// Save database
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Database purge complete and saved successfully!');
