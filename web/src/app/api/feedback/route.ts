import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";
import { requireUser } from "../_auth";

export const dynamic = "force-dynamic";

async function verifyRecaptcha(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  
  const cloudRunUrl = (process.env.MONGODB_AGENT_URL || "").trim();
  if (!cloudRunUrl) {
    console.error("[api-feedback] MONGODB_AGENT_URL is not configured.");
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
      console.log("[reCAPTCHA Enterprise Server-Side] Feedback Assessment result:", assessment);
      return assessment.success !== false;
    }
  } catch (err) {
    console.error("[api-feedback] reCAPTCHA verification error:", err);
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.clone().json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
    }

    const { name, email, feedback, category, source, title, context, honeypot, recaptchaToken, subject, message } = body;
    const isPublicContact = source === "contact";

    let ctx: any = null;
    if (!isPublicContact) {
      ctx = await requireUser(req);
      if (ctx instanceof Response) return ctx;
    } else {
      ctx = {
        uid: "anonymous",
        email: email || null,
        role: "anonymous",
        db_target: "fahem_sandbox"
      };
    }

    // Honey-pot check for public spam prevention
    if (isPublicContact && honeypot && honeypot.trim() !== "") {
      console.warn("[api-feedback] Honeypot triggered. Silently ignoring submission.");
      return new Response(JSON.stringify({ success: true, message: "Contact message processed successfully." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Body text is either 'feedback' (from InlineFeedbackCard) or 'body' or 'message'
    const reportBody = body.body || feedback || message;
    if (!reportBody) {
      return new Response(JSON.stringify({ error: "Report content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // reCAPTCHA check in production for public contact
    if (isPublicContact && !isLocalEnv()) {
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

    // Extract IP for rate limiting
    const clientIp = (req.headers.get("x-forwarded-for") || "127.0.0.1").split(",")[0].trim();

    if (!isLocalEnv()) {
      const { proxyRequest } = require("../proxy");
      if (isPublicContact) {
        return await proxyRequest("/public/contact", "POST", {
          name,
          email,
          body: reportBody,
          subject: subject || title || category || "Contact Form Submission"
        });
      } else {
        return await proxyRequest("/user/reports", "POST", body, ctx);
      }
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayMs = startOfDay.getTime();

    const db = getLocalDb() as any;
    db.reports = db.reports || [];

    // Rate-limit checks (IP-based for contact, UID-based for logged-in feedback)
    if (isPublicContact) {
      const recentReports = db.reports.filter(
        (rep: any) =>
          rep.source === "contact" &&
          rep.context?.ip === clientIp &&
          rep.createdAt >= startOfDayMs
      );
      if (recentReports.length >= 5) {
        return new Response(JSON.stringify({ error: "daily limit reached." }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      const recentReports = db.reports.filter(
        (rep: any) => rep.userId === ctx.uid && rep.createdAt >= startOfDayMs
      );
      if (recentReports.length >= 3) {
        return new Response(JSON.stringify({ error: "daily limit reached." }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const reportId = "rep_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    const newReport: any = {
      _id: reportId,
      userId: isPublicContact ? null : ctx.uid,
      source: source || "footer",
      category: category || (isPublicContact ? "Contact Form" : "General"),
      title: title || subject || category || (isPublicContact ? "Contact Form Submission" : "Feedback Report"),
      body: reportBody,
      context: context || {
        name: name || "Anonymous",
        email: email || ctx.email || "anonymous@fahem.edu",
        ip: clientIp,
        subject: subject || title || "General Inquiry"
      },
      status: "new",
      createdAt: Date.now()
    };

    if (isPublicContact) {
      newReport.contact = {
        name: name || "Anonymous",
        email: email
      };
    }

    db.reports.push(newReport);
    saveLocalDb(db);

    return new Response(JSON.stringify({ success: true, message: "Report saved locally.", report: newReport }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-feedback] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
