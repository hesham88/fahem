const { execSync } = require("child_process");

async function test() {
  try {
    let token = "";
    try {
      token = execSync("gcloud auth print-identity-token").toString().trim();
      console.log("Secured Token. Token length:", token.length);
    } catch (e) {
      console.log("Failed to get gcloud token. Will try unauthenticated.");
    }
    
    const url = "https://fahem-agent-sbqsl5tfga-uk.a.run.app/run";
    const payload = {
      user_id: "test",
      session_id: "metadata_test_sess_" + Date.now(),
      app_name: "app",
      new_message: {
        role: "user",
        parts: [{ text: "Retrieve database stats and list collections for the fahem database. Respond ONLY with a valid JSON string having the following keys: databaseName, collectionsCount, collectionList, storageSize, indexCount, status. Do NOT wrap it in any formatting or markdown block, do not include any other characters." }]
      },
      streaming: false
    };

    console.log(`Sending request to ${url}...`);
    const headers = {
      "Content-Type": "application/json"
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    console.log("HTTP Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
