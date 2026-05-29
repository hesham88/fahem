const { execSync } = require("child_process");

async function test() {
  try {
    const token = execSync("gcloud auth print-identity-token").toString().trim();
    console.log("Secured Token. Token length:", token.length);
    const url = "https://fahem-agent-1061555578804.us-east4.run.app/run";
    const payload = {
      user_id: "test",
      session_id: "test_sess",
      app_name: "app",
      new_message: {
        role: "user",
        parts: [{ text: "ping" }]
      },
      streaming: false
    };

    console.log(`Sending request to ${url}...`);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
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
