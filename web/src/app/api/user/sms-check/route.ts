import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { isLocalEnv } from "../../localDbHelper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ success: false, error: "Phone number is required", errorAr: "رقم الهاتف مطلوب" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get client IP address from request headers
    // x-forwarded-for: standard header set by proxies/load balancers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    if (isLocalEnv()) {
      // In local development, if MONGODB_AGENT_URL is not set, don't block SMS, just return success
      const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();
      if (!cloudRunUrl) {
        console.log(`[sms-check] Local environment bypass: allowing verification for phone: ${phone}, ip: ${ip}`);
        return new Response(JSON.stringify({ success: true, allowed: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Forward the request to Cloud Run backend via proxyRequest
    const proxyRes = await proxyRequest("/sms/rate-limit", "POST", { phone, ip });
    
    // Read the response from proxyRequest
    const data = await proxyRes.json();
    return new Response(JSON.stringify(data), {
      status: proxyRes.status,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("[sms-check] Route error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message || "Failed to process SMS limit check", errorAr: "فشل التحقق من حد الرسائل القصيرة" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
