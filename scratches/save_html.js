const fs = require('fs');

async function test() {
  try {
    const url = 'https://openstax.org';
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    const html = await res.text();
    fs.writeFileSync('scratches/openstax.html', html);
    console.log('Saved scratches/openstax.html');
  } catch (e) {
    console.error(e);
  }
}

test();
