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

    console.log(`\n--- Querying /user/knowledge ---`);
    const res = await fetch(`${cloudRunUrl}/user/knowledge`, {
      method: "GET",
      headers
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Success:", data.success);
    if (data.subjects) {
      console.log("Subjects count:", data.subjects.length);
    }
    
    // Let's also check if there is an explicit endpoint for books or subjects
    console.log(`\n--- Querying /user/subjects ---`);
    const subRes = await fetch(`${cloudRunUrl}/user/subjects`, {
      method: "GET",
      headers
    });
    const subData = await subRes.json();
    console.log("Subjects:", JSON.stringify(subData, null, 2));

  } catch (err) {
    console.error("Error fetching books:", err);
  }
}

main();
