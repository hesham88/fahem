import { GoogleAuth } from "google-auth-library";

const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();

let cachedToken: string | null = null;
let tokenExpiry: number = 0; // timestamp when cached token expires
let isGcpEnvironment: boolean | null = null; // null = unknown, true = GCP, false = local/non-GCP

export async function getOidcToken(): Promise<string | null> {
  if (!cloudRunUrl) return null;
  
  // Fast local check: if running in dev mode, bypass OIDC token fetch
  const isLocal = process.env.NODE_ENV === "development";
  if (isLocal) {
    isGcpEnvironment = false;
    return null; // Will immediately fallback to local bypass token
  }

  const now = Date.now();
  // If we have a cached token that is still valid (with a 5-minute safety buffer)
  if (cachedToken && tokenExpiry > now + 300000) {
    return cachedToken;
  }

  // If we already know we are NOT in a GCP environment, we can skip metadata and auth client entirely
  if (isGcpEnvironment === false) {
    return null; // Will fallback to local bypass token
  }

  let oidcToken: string | null = null;

  // 1. Query GCP Metadata Server (with extremely fast timeout and environment check)
  if (isGcpEnvironment === null || isGcpEnvironment === true) {
    try {
      const metadataUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(cloudRunUrl)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300); // 300ms timeout max
      
      const metadataRes = await fetch(metadataUrl, {
        headers: { "Metadata-Flavor": "Google" },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (metadataRes.ok) {
        const tokenText = await metadataRes.text();
        if (tokenText && tokenText.trim()) {
          oidcToken = tokenText.trim();
          isGcpEnvironment = true;
          cachedToken = oidcToken;
          tokenExpiry = now + 3000000; // Cache for 50 minutes (standard GCP token is 1h)
          return oidcToken;
        }
      }
    } catch (metadataErr) {
      // If metadata fetch fails or times out, we assume we might not be on GCP (unless we previously succeeded)
      if (isGcpEnvironment === null) {
        // We'll let the fallback run, but we will check GCP metadata status later
      }
    }
  }

  // 2. Fallback to google-auth-library
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
      isGcpEnvironment = true;
      cachedToken = oidcToken;
      tokenExpiry = now + 3000000; // Cache for 50 minutes
      return oidcToken;
    }
  } catch (authErr: any) {
    // Both attempts failed, we are definitely running locally/non-GCP
    if (isGcpEnvironment === null) {
      console.log(`[proxy] No GCP environment detected. Activating LOCAL_BYPASS mode for future requests.`);
      isGcpEnvironment = false;
    }
  }

  return oidcToken;
}

export async function proxyRequest(
  path: string,
  method: string = "GET",
  body?: any,
  ctx?: any
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

    // Forward the authenticated end-user principal to the Python backend
    if (ctx) {
      const principal: any = {
        uid: ctx.uid,
        email: ctx.email,
        role: ctx.role,
        db_target: ctx.db_target || "fahem"
      };
      // Carry the demo session id + tier so the backend can isolate per-session token budgets.
      if (ctx.sandbox_session_id) principal.sandbox_session_id = ctx.sandbox_session_id;
      if (ctx.tier !== undefined) principal.tier = ctx.tier;
      headers["X-Verified-Principal"] = JSON.stringify(principal); // guard:allow-principal
    }

    const url = `${cloudRunUrl}${path}`;
    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(60000),
      cache: "no-store",
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

