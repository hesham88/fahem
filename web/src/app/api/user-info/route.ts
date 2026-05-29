import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const headers = req.headers;
    
    // Determine client IP from standard proxy headers
    const xForwardedFor = headers.get("x-forwarded-for");
    const xRealIp = headers.get("x-real-ip");
    
    let ip = "127.0.0.1";
    if (xForwardedFor) {
      // First IP in the x-forwarded-for chain represents the client
      ip = xForwardedFor.split(",")[0].trim();
    } else if (xRealIp) {
      ip = xRealIp.trim();
    }

    const userAgent = headers.get("user-agent") || "unknown";

    // Detect country from potential CDN/GCP load-balancer injected geo-headers
    const country = headers.get("x-gcp-conn-country") || headers.get("cf-ipcountry") || "unknown";

    return NextResponse.json({
      ip,
      userAgent,
      country,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
