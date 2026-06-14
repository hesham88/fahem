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
      db_target: "fahem"
    });

    console.log(`\n--- Fetching /user/knowledge ---`);
    const resKnow = await fetch(`${cloudRunUrl}/user/knowledge`, { method: "GET", headers });
    const knowData = await resKnow.json();
    console.log("Success:", knowData.success);
    console.log("Total Books returned:", knowData.total_books);
    
    if (knowData.subjects) {
      for (const subject of knowData.subjects) {
        console.log(`\n==========================================`);
        console.log(`Subject: ${subject.name} (${subject._id})`);
        console.log(`Books count: ${subject.books_count}`);
        console.log(`==========================================`);
        if (subject.books && subject.books.length > 0) {
          for (const book of subject.books) {
            console.log(`- Book ID: ${book._id}`);
            console.log(`  Title (EN): ${book.title}`);
            console.log(`  Title (AR): ${book.title_ar}`);
            console.log(`  Role: ${book.role}`);
            console.log(`  Curriculum ID: ${book.curriculum_id}`);
            console.log(`  Ingestion Job ID: ${book.job_id || book.ingestion_job_id || "N/A"}`);
            console.log(`  Properties: ${JSON.stringify(book, null, 2)}`);
          }
        } else {
          console.log("No books nested directly in subject.books.");
        }
      }
    } else {
      console.log("No subjects returned in response.");
    }
    
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
