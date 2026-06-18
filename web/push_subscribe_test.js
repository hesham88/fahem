const { GoogleAuth } = require("google-auth-library");
process.env.GOOGLE_APPLICATION_CREDENTIALS = "C:/Users/hesh1/AppData/Roaming/gcloud/application_default_credentials.json";
const url = "https://fahem-agent-sbqsl5tfga-uk.a.run.app";
(async () => {
  const auth = new GoogleAuth();
  const c = await auth.getIdTokenClient(url);
  const headers = await c.getRequestHeaders(url);
  headers["X-Verified-Principal"] = JSON.stringify({ uid: "push_e2e_test_uid", email: "hesham1988@gmail.com", role: "super-admin", db_target: "fahem_sandbox" }); // guard:allow-principal
  headers["Content-Type"] = "application/json";
  const sub = { endpoint: "https://httpbin.org/anything", keys: { p256dh: "BMockReceiverKeyForStorageRoundTripOnly_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", auth: "mockauthsecret0000" } };
  const r = await fetch(`${url}/user/push-subscribe`, { method: "POST", headers, body: JSON.stringify({ subscription: sub }) });
  console.log("POST /user/push-subscribe ->", r.status, JSON.stringify(await r.json()));
})().catch(e => console.error("ERR:", e.message));
