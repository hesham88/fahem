const { execSync } = require("child_process");

const cloudRunUrl = "https://fahem-agent-1061555578804.us-east4.run.app";
const targetUrl = "https://assets.openstax.org/oscms-prodcms/media/documents/university-physics-volume-1_-_WEB.pdf";

async function main() {
  try {
    console.log("Fetching GCP Identity Token using gcloud...");
    const token = execSync("gcloud auth print-identity-token").toString().trim();
    console.log("Token retrieved successfully.");

    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Verified-Principal": JSON.stringify({ // guard:allow-principal
        uid: "demo_evaluation_uid_01",
        email: "evaluation.judge@fahem.pro",
        role: "judge",
        db_target: "fahem_sandbox"
      })
    };

    const payload = {
      subject_id: "subj_openstax_physics",
      title: "University Physics Volume 1",
      title_ar: "الفيزياء الجامعية - المجلد 1",
      language: "en",
      book_type: "core",
      source_url: targetUrl
    };

    console.log("\n--- Triggering Ingestion POST /user/books ---");
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const postRes = await fetch(`${cloudRunUrl}/user/books`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    console.log("POST Status:", postRes.status);
    const postData = await postRes.json();
    console.log("POST Response:", JSON.stringify(postData, null, 2));

    if (!postRes.ok || !postData.success) {
      console.error("Failed to register book or start ingestion.");
      return;
    }

    const bookId = postData.book._id;
    console.log(`\nBook registered successfully with ID: ${bookId}`);
    console.log("Starting progress polling loop...\n");

    let printedLogsCount = 0;
    let printedJobLogsCount = 0;
    let sameStatusCount = 0;
    const maxStatusRetries = 1000; // Large number to keep polling until completion or failure

    while (true) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds

      // 1. Fetch book details
      const bookRes = await fetch(`${cloudRunUrl}/user/books`, {
        method: "GET",
        headers
      });
      
      let bookData = null;
      if (bookRes.ok) {
        const booksObj = await bookRes.json();
        const booksList = Array.isArray(booksObj) ? booksObj : (booksObj.books || []);
        bookData = booksList.find(b => b._id === bookId);
      }

      // 2. Fetch job details
      const jobRes = await fetch(`${cloudRunUrl}/user/books/jobs?bookId=${bookId}`, {
        method: "GET",
        headers
      });
      let jobData = null;
      if (jobRes.ok) {
        const jobObj = await jobRes.json();
        if (jobObj.success) {
          jobData = jobObj.job;
        }
      }

      if (!bookData && !jobData) {
        console.log("Awaiting database entry for book...");
        continue;
      }

      const progress = bookData ? bookData.ingestion_progress : (jobData ? jobData.progress : 0);
      const status = bookData ? bookData.ingestion_status : (jobData ? jobData.status : "unknown");
      
      console.log(`[POLL] Progress: ${progress}% | Status: ${status}`);

      // Print new ingestion_logs from bookData
      if (bookData && bookData.ingestion_logs && Array.isArray(bookData.ingestion_logs)) {
        const logs = bookData.ingestion_logs;
        if (logs.length > printedLogsCount) {
          console.log("\n--- NEW BOOK INGESTION LOGS ---");
          for (let i = printedLogsCount; i < logs.length; i++) {
            console.log(`[BOOK LOG] ${logs[i]}`);
          }
          console.log("--------------------------------\n");
          printedLogsCount = logs.length;
        }
      }

      // Print new logs from jobData
      if (jobData && jobData.logs && Array.isArray(jobData.logs)) {
        const jLogs = jobData.logs;
        if (jLogs.length > printedJobLogsCount) {
          console.log("\n--- NEW JOB LOGS ---");
          for (let i = printedJobLogsCount; i < jLogs.length; i++) {
            const entry = jLogs[i];
            const logStr = typeof entry === 'string' ? entry : JSON.stringify(entry);
            console.log(`[JOB LOG] ${logStr}`);
          }
          console.log("---------------------\n");
          printedJobLogsCount = jLogs.length;
        }
      }

      // Check termination conditions
      if (status === "completed" || progress >= 100) {
        console.log("\n=============================================");
        console.log("🎉 SUCCESS: Book ingestion completed successfully (100%)!");
        console.log("=============================================");
        break;
      }

      if (status === "failed" || status === "error") {
        console.log("\n=============================================");
        console.log("❌ FAILURE: Book ingestion failed!");
        console.log("=============================================");
        break;
      }
    }

  } catch (err) {
    console.error("Error in direct_physics_ingest polling loop:", err);
  }
}

main();
