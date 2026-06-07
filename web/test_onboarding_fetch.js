const cloudRunUrl = "https://fahem-agent-sbqsl5tfga-uk.a.run.app";

async function main() {
  console.log("Testing Node.js fetch connection to Cloud Run:", cloudRunUrl);
  
  const serializedContext = JSON.stringify({
    prompt: "student",
    language: "en",
    user_email: "hesham1988@gmail.com",
    user_id: "test_user_id_123",
    username: "hesham1988",
    credits: 100,
    onboarding: true
  });

  const payload = {
    user_id: "test_user_id_123",
    session_id: "onboarding_session_test_user_id_123",
    app_name: "app",
    new_message: {
      role: "user",
      parts: [{ text: serializedContext }]
    },
    streaming: false
  };

  const token = process.env.FAHEM_AUTH_TOKEN || "YOUR_FAHEM_AUTH_TOKEN";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  try {
    const start = Date.now();
    const response = await fetch(`${cloudRunUrl}/run`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    
    console.log("Fetch call completed in", ((Date.now() - start)/1000).toFixed(2), "seconds.");
    console.log("Response status:", response.status);
    console.log("Response headers:", [...response.headers.entries()]);
    
    const text = await response.text();
    console.log("Response text length:", text.length);
    console.log("Response preview:", text.substring(0, 500));
  } catch (err) {
    console.error("Fetch threw an error:", err);
  }
}

main();
