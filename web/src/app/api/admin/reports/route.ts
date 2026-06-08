import { NextRequest } from "next/server";
import { getLocalDb, saveLocalDb, isLocalEnv, getDbTarget } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";
import { requireAdmin } from "../../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      const reports = db.reports || [];
      return new Response(JSON.stringify({ success: true, reports }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Production: read from MongoDB via proxy
    return await proxyRequest("/admin/reports", "GET", undefined, ctx);

  } catch (err: any) {
    console.error("[admin-reports-api] GET failed:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { reportId, status } = body;

    if (!reportId || !status) {
      return new Response(JSON.stringify({ error: "reportId and status are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const validStatuses = ["new", "triaged", "resolved"];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: "invalid status value" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb() as any;
      db.reports = db.reports || [];
      const reportIndex = db.reports.findIndex((rep: any) => rep._id === reportId);
      if (reportIndex === -1) {
        return new Response(JSON.stringify({ error: "Report not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      db.reports[reportIndex].status = status;
      saveLocalDb(db);

      return new Response(JSON.stringify({ success: true, report: db.reports[reportIndex] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Production: update in MongoDB via proxy
    return await proxyRequest("/admin/reports", "POST", { reportId, status }, ctx);

  } catch (err: any) {
    console.error("[admin-reports-api] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
