async function test() {
  try {
    const url = 'https://openstax.org/apps/cms/api/books/?format=json';
    const res = await fetch(url);
    const data = await res.json();
    if (data.books && data.books.length > 0) {
      data.books.slice(0, 10).forEach(b => {
        console.log(`Title: ${b.title}`);
        console.log(`  High Res PDF: ${b.high_resolution_pdf_url}`);
        console.log(`  Low Res PDF: ${b.low_resolution_pdf_url}`);
      });
    }
  } catch (e) {
    console.error(e);
  }
}

test();
