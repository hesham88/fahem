import { GoogleAuth } from "google-auth-library";

const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();

async function getOidcToken(): Promise<string | null> {
  if (!cloudRunUrl) return null;
  
  let oidcToken: string | null = null;

  // 1. Query GCP Metadata Server
  try {
    const metadataUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(cloudRunUrl)}`;
    const metadataRes = await fetch(metadataUrl, {
      headers: { "Metadata-Flavor": "Google" }
    });
    if (metadataRes.ok) {
      const tokenText = await metadataRes.text();
      if (tokenText && tokenText.trim()) {
        oidcToken = tokenText.trim();
      }
    }
  } catch (metadataErr) {
    // Silently ignore
  }

  // 2. Fallback to google-auth-library
  if (!oidcToken) {
    try {
      const auth = new GoogleAuth();
      const authClient = await auth.getIdTokenClient(cloudRunUrl);
      
      let headers = (await authClient.getRequestHeaders()) as any;
      let authHeader = headers["Authorization"] || headers["authorization"];
      
      if (!authHeader) {
        const headersWithArg = (await authClient.getRequestHeaders(cloudRunUrl)) as any;
        authHeader = headersWithArg["Authorization"] || headersWithArg["authorization"];
      }

      if (authHeader && authHeader.startsWith("Bearer ")) {
        oidcToken = authHeader.substring(7);
      }
    } catch (authErr: any) {
      console.warn(`[proxy] GCP ID token generation skipped: ${authErr.message}`);
    }
  }

  return oidcToken;
}

export async function proxyRequest(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: any
): Promise<Response> {
  if (!cloudRunUrl) {
    return new Response(
      JSON.stringify({ error: "MONGODB_AGENT_URL is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const oidcToken = await getOidcToken();
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    if (oidcToken) {
      headers["Authorization"] = `Bearer ${oidcToken}`;
    }

    const url = `${cloudRunUrl}${path}`;
    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(10000),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (response.ok) {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Backend service error: ${response.status} - ${errorText}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error(`[proxy] Request to ${path} failed:`, err);
    return new Response(
      JSON.stringify({ error: `Proxy request failed: ${err.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
