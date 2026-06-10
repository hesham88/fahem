const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'web', 'src', 'app', 'api', 'local_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('--- Libraries ---');
console.log(db.libraries);

console.log('--- Curricula ---');
console.log(db.curricula);

console.log('--- Books ---');
db.books.forEach(b => {
  console.log(`- ID: ${b._id}, Title: ${b.title || b.titleEn || b.title_ar}, LibID: ${b.library_id || b.libId}, CurID: ${b.curriculum_id || b.curId}`);
});
