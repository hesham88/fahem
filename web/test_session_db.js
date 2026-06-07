const cloudRunUrl = "https://fahem-agent-sbqsl5tfga-uk.a.run.app";

async function main() {
  const sessionId = "onboarding_session_test_user_id_999";
  const userEmail = "hesham1988@gmail.com";
  const userId = "test_user_id_999";

  console.log("=== Testing Save Chat Session ===");
  const testMessages = [
    { role: "user", content: "hello, I am student", timestamp: new Date().toISOString() },
    { role: "assistant", content: "Welcome! What is your name?", timestamp: new Date().toISOString() }
  ];

  const token = process.env.FAHEM_AUTH_TOKEN || "YOUR_FAHEM_AUTH_TOKEN";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
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
    console.log("POST /user/chat-session status:", postRes.status);
    const postData = await postRes.json();
    console.log("POST Response data:", postData);

    console.log("\n=== Testing Get Chat Session Detail ===");
    const getRes = await fetch(`${cloudRunUrl}/user/chat-session/detail?sessionId=${sessionId}`, {
      method: "GET",
      headers
    });
    console.log("GET /user/chat-session/detail status:", getRes.status);
    const getData = await getRes.json();
    console.log("GET Response data:", JSON.stringify(getData, null, 2));

    console.log("\n=== Testing Get User Sessions List ===");
    const listRes = await fetch(`${cloudRunUrl}/user/chat-session?userId=${userId}`, {
      method: "GET",
      headers
    });
    console.log("GET /user/chat-session status:", listRes.status);
    const listData = await listRes.json();
    console.log("GET List Response data:", JSON.stringify(listData, null, 2));

  } catch (err) {
    console.error("Error occurred:", err);
  }
}

main();
