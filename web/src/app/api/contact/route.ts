import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    const reportBody = message || body.body;
    if (!email || !reportBody) {
      return new Response(JSON.stringify({ error: "Email and message body are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Anti-abuse: enforce a limit of 5 submissions per IP per day (fail-closed)
    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      db.reports = db.reports || [];

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startOfDayMs = startOfDay.getTime();

      // Check count for this IP
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

      db.reports.push(newReport);
      saveLocalDb(db);

      return new Response(JSON.stringify({ success: true, message: "Contact message saved locally.", report: newReport }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      // Production: proxy to Cloud Run
      const { proxyRequest } = require("../proxy");
      return await proxyRequest("/public/contact", "POST", {
        name,
        email,
        subject,
        body: reportBody
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
