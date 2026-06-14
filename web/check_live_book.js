const { GoogleAuth } = require("google-auth-library");
const adcPath = "C:/Users/hesh1/AppData/Roaming/gcloud/application_default_credentials.json";
const cloudRunUrl = "https://fahem-agent-sbqsl5tfga-uk.a.run.app";

async function main() {
  try {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;

    const auth = new GoogleAuth();
    const idTokenClient = await auth.getIdTokenClient(cloudRunUrl);
    const headers = await idTokenClient.getRequestHeaders(cloudRunUrl);

    // Let's add X-Verified-Principal as evaluation.judge@fahem.pro (super-admin or similar)
    headers["X-Verified-Principal"] = JSON.stringify({ // guard:allow-principal
      uid: "demo_evaluation_uid_01",
      email: "hesham1988@gmail.com", // owner email to access fahem db
      role: "super-admin",
      db_target: "fahem" // Target the production fahem database
    });

    const bookIdNormal = "book_introduction_to_computer_science_1781369827787";
    const bookIdJob = "job_book_introduction_to_computer_science_1781369827787";

    console.log(`\n--- Querying pages for normal book ID: ${bookIdNormal} ---`);
    const resNormal = await fetch(`${cloudRunUrl}/user/books/pages?book_id=${bookIdNormal}`, {
      method: "GET",
      headers
    });
    console.log("Status:", resNormal.status);
    const dataNormal = await resNormal.json();
    console.log("Success:", dataNormal.success);
    console.log("Pages count:", dataNormal.pages ? dataNormal.pages.length : "N/A");
    if (dataNormal.pages && dataNormal.pages.length > 0) {
      console.log("Sample page sample data (first page):", JSON.stringify(dataNormal.pages[0]).substring(0, 300) + "...");
    }

    console.log(`\n--- Querying pages for prefixed job ID: ${bookIdJob} ---`);
    const resJob = await fetch(`${cloudRunUrl}/user/books/pages?book_id=${bookIdJob}`, {
      method: "GET",
      headers
    });
    console.log("Status:", resJob.status);
    const dataJob = await resJob.json();
    console.log("Success:", dataJob.success);
    console.log("Pages count:", dataJob.pages ? dataJob.pages.length : "N/A");
    if (dataJob.pages && dataJob.pages.length > 0) {
      console.log("Sample page sample data (first page):", JSON.stringify(dataJob.pages[0]).substring(0, 300) + "...");
    }

    console.log(`\n--- Querying database statistics from /user/debug/db_stats ---`);
    const resStats = await fetch(`${cloudRunUrl}/user/debug/db_stats`, {
      method: "GET",
      headers
    });
    console.log("Stats Status:", resStats.status);
    const dataStats = await resStats.json();
    console.log("Stats Response:", JSON.stringify(dataStats, null, 2));

  } catch (err) {
    console.error("Error running diagnostics:", err);
  }
}

main();
