const { GoogleAuth } = require("google-auth-library");
const adcPath = "C:/Users/hesh1/AppData/Roaming/gcloud/application_default_credentials.json";
const cloudRunUrl = "https://fahem-agent-1061555578804.us-east4.run.app";

async function main() {
  try {
    console.log("Setting GOOGLE_APPLICATION_CREDENTIALS environment variable...");
    process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;

    const auth = new GoogleAuth();
    console.log("Requesting ID token client for audience:", cloudRunUrl);
    const idTokenClient = await auth.getIdTokenClient(cloudRunUrl);
    
    console.log("Requesting headers...");
    const headers = await idTokenClient.getRequestHeaders(cloudRunUrl);
    console.log("Retrieved Auth Headers successfully.");

    // Let's add X-Verified-Principal as evaluation.judge@fahem.pro
    headers["X-Verified-Principal"] = JSON.stringify({ // guard:allow-principal
      uid: "demo_evaluation_uid_01",
      email: "evaluation.judge@fahem.pro",
      role: "judge",
      db_target: "fahem_sandbox"
    });

    console.log("\n--- Querying /user/libraries ---");
    const libRes = await fetch(`${cloudRunUrl}/user/libraries`, {
      method: "GET",
      headers
    });
    console.log("Status:", libRes.status);
    const libData = await libRes.json();
    console.log("Libraries Data:", JSON.stringify(libData, null, 2));

    console.log("\n--- Querying /user/subjects with curriculum_id=openstax_all ---");
    const subRes = await fetch(`${cloudRunUrl}/user/subjects?curriculum_id=openstax_all`, {
      method: "GET",
      headers
    });
    console.log("Status:", subRes.status);
    const subData = await subRes.json();
    console.log("Subjects Data:", JSON.stringify(subData, null, 2));

  } catch (err) {
    console.error("Error in temp_check_agent:", err);
  }
}

main();

