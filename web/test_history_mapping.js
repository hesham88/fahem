const cloudRunUrl = "https://fahem-agent-sbqsl5tfga-uk.a.run.app";

async function main() {
  const sessionId = "onboarding_session_test_user_id_mapping_999";
  const userEmail = "hesham1988@gmail.com";
  const userId = "test_user_id_mapping_999";

  console.log("=== STEP 1: Saving test messages to DB ===");
  const testMessages = [
    { role: "user", content: "student", timestamp: new Date().toISOString() },
    { role: "assistant", content: "Welcome! May I have your name?", timestamp: new Date().toISOString() }
  ];

  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer LOCAL_BYPASS_TOKEN_fahem_2026"
  };

  try {
    const postRes = await fetch(`${cloudRunUrl}/user/chat-session`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sessionId,
        userId,
        userEmail,
        title: "Onboarding Chat Session Test",
        messages: testMessages
      })
    });
    console.log("POST status:", postRes.status);
    const postData = await postRes.json();
    console.log("POST response:", postData);

    console.log("\n=== STEP 2: Retrieving session from DB ===");
    const getRes = await fetch(`${cloudRunUrl}/user/chat-session/detail?sessionId=${sessionId}`, {
      method: "GET",
      headers
    });
    console.log("GET status:", getRes.status);
    const getData = await getRes.json();
    console.log("GET response (keys present):", Object.keys(getData?.session || {}));
    
    const existingMessages = getData?.session?.messages || [];
    console.log("Retrieved messages count:", existingMessages.length);
    console.log("First message:", JSON.stringify(existingMessages[0], null, 2));

    console.log("\n=== STEP 3: Simulating Gemini contents mapping ===");
    const contents = existingMessages.map(msg => ({
      role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content || msg.text || "" }]
    }));

    console.log("Mapped contents:\n", JSON.stringify(contents, null, 2));
    
  } catch (err) {
    console.error("Error occurred:", err);
  }
}

main();
