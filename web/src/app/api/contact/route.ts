import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";
import { proxyRequest } from "../proxy";

export const dynamic = "force-dynamic";

async function verifyRecaptcha(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  
  const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();
  if (!cloudRunUrl) {
    console.error("[api-contact] MONGODB_AGENT_URL is not configured.");
    return false;
  }
  
  try {
    const verifyRes = await fetch(`${cloudRunUrl}/verify-recaptcha`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: token,
        action: "REPORT_SUBMIT"
      })
    });
    
    if (verifyRes.ok) {
      const assessment = await verifyRes.json();
      console.log("[reCAPTCHA Enterprise Server-Side] Assessment result:", assessment);
      return assessment.success !== false;
    }
  } catch (err) {
    console.error("[api-contact] reCAPTCHA verification error:", err);
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message, recaptchaToken, honeypot } = body;

    // Honey-pot check: if honeypot is filled, silently succeed (return 200) without saving
    if (honeypot && honeypot.trim() !== "") {
      console.warn("[api-contact] Honeypot triggered. Silently ignoring submission.");
      return new Response(JSON.stringify({ success: true, message: "Contact message processed successfully." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const reportBody = message || body.body;
    if (!email || !reportBody) {
      return new Response(JSON.stringify({ error: "Email and message body are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // reCAPTCHA check in production
    if (!isLocalEnv()) {
      if (!recaptchaToken) {
        return new Response(JSON.stringify({ error: "Security validation (reCAPTCHA) is required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const isTokenValid = await verifyRecaptcha(recaptchaToken);
      if (!isTokenValid) {
        return new Response(JSON.stringify({ error: "Security validation (reCAPTCHA) failed." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // IP Extraction
    const clientIp = (req.headers.get("x-forwarded-for") || "127.0.0.1").split(",")[0].trim();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayMs = startOfDay.getTime();

    // Prepare report document
    const reportId = "rep_contact_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const newReport = {
      _id: reportId,
      userId: null,
      source: "contact",
      category: "Contact Form",
      title: `Contact Submission: ${subject || "General Inquiry"}`,
      body: reportBody,
      contact: {
        name: name || "Anonymous",
        email: email
      },
      context: {
        name: name || "Anonymous",
        email: email,
        ip: clientIp,
        subject: subject || "General Inquiry"
      },
      status: "new",
      createdAt: Date.now()
    };

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      db.reports = db.reports || [];

      // Check count for this IP (local db)
      const recentCount = db.reports.filter(
        (rep: any) =>
          rep.source === "contact" &&
          rep.context?.ip === clientIp &&
          rep.createdAt >= startOfDayMs
      ).length;

      if (recentCount >= 5) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again tomorrow." }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }

      db.reports.push(newReport);
      saveLocalDb(db);

      return new Response(JSON.stringify({ success: true, message: "Contact message saved locally.", report: newReport }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      // Production: Proxy to Python backend /public/contact
      return await proxyRequest("/public/contact", "POST", {
        name,
        email,
        body: reportBody,
        subject: subject || "General Inquiry"
      });
    }

  } catch (err: any) {
    console.error("[api-contact] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
