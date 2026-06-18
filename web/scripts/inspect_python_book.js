const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'src', 'app', 'api', 'local_db.json');
if (!fs.existsSync(dbPath)) {
  console.log("local_db.json not found at " + dbPath);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const pythonBooks = db.books.filter(b => (b._id || b.id || '').toLowerCase().includes('python'));

if (pythonBooks.length === 0) {
  console.log("No Python book found in local_db.json");
  process.exit(1);
}

const pages = db.book_pages || [];

pythonBooks.forEach(pythonBook => {
  console.log("\n==================================================");
  console.log("Python Book Metadata:");
  const bId = pythonBook._id || pythonBook.id;
  console.log("ID:", bId);
  console.log("Title:", pythonBook.title || pythonBook.titleEn);
  
  const bookPages = pages.filter(p => p.book_id === bId || p.bookId === bId);
  console.log("Pages Count in Database:", bookPages.length);

  if (bookPages.length > 0) {
    console.log("First 30 pages:");
    bookPages.slice(0, 30).forEach(p => {
      console.log(`- Page ${p.page_number || p.pageNum}: titleEn: "${p.titleEn}", chapterTitleEn: "${p.chapterTitleEn}"`);
    });
  }
});


