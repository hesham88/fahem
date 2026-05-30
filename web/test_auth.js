const { GoogleAuth } = require("google-auth-library");
const fs = require("fs");
const path = require("path");

const adcPath = "C:/Users/hesh1/AppData/Roaming/gcloud/application_default_credentials.json";
const cloudRunUrl = "https://fahem-agent-sbqsl5tfga-uk.a.run.app";

async function main() {
  try {
    console.log("Setting GOOGLE_APPLICATION_CREDENTIALS environment variable...");
    process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
    
    const auth = new GoogleAuth();
    console.log("Getting client...");
    const client = await auth.getClient();
    console.log("Client keys:", Object.keys(client));
    console.log("Client class name:", client.constructor.name);
    
    console.log("Getting ID token client...");
    const idTokenClient = await auth.getIdTokenClient(cloudRunUrl);
    console.log("IdTokenClient class name:", idTokenClient.constructor.name);
    
    console.log("Requesting headers...");
    const headers = await idTokenClient.getRequestHeaders(cloudRunUrl);
    console.log("Headers:", JSON.stringify(headers, null, 2));
  } catch (err) {
    console.error("Error in auth:", err);
  }
}

main();
