const { GoogleAuth } = require("google-auth-library");
const adcPath = "C:/Users/hesh1/AppData/Roaming/gcloud/application_default_credentials.json";
const cloudRunUrl = "https://fahem-agent-1061555578804.us-east4.run.app";

async function main() {
  try {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;

    const auth = new GoogleAuth();
    const idTokenClient = await auth.getIdTokenClient(cloudRunUrl);
    const headers = await idTokenClient.getRequestHeaders(cloudRunUrl);

    headers["X-Verified-Principal"] = JSON.stringify({ // guard:allow-principal
      uid: "demo_evaluation_uid_01",
      email: "hesham1988@gmail.com",
      role: "super-admin",
      db_target: "fahem_sandbox" // Target the sandbox database
    });

    console.log(`\n--- Fetching /admin/inspect-r17 (fahem_sandbox) ---`);
    const res = await fetch(`${cloudRunUrl}/admin/inspect-r17`, { method: "GET", headers });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Status key:", data.status);
    console.log("Total Books:", data.total_books);
    
    console.log("\nBooks in DB:");
    if (data.books) {
      data.books.forEach(b => {
        console.log(`- ID: ${b._id} | Title: ${b.title} | Subject: ${b.subject_id} | Status: ${b.status}`);
      });
    }

    console.log("\nDistinct Book IDs in 'book_pages':");
    console.log(JSON.stringify(data.distinct_page_book_ids, null, 2));

    console.log("\nOrphans in 'book_pages':");
    if (data.orphans) {
      data.orphans.forEach(o => {
        console.log(`- Book ID: ${o.book_id} | Pages count: ${o.page_count}`);
        console.log(`  Sample page info:`, JSON.stringify(o.sample_page, null, 2));
      });
    }

  } catch (err) {
    console.error("Error fetching inspect-r17:", err);
  }
}

main();
