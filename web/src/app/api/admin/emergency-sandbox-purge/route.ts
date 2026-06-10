import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { requireAdmin } from "../../_auth";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { apply, clear_prod_jobs, purge_prod_demo, i_understand_prod_delete } = body;

    if (isLocalEnv()) {
      // In local env, we can execute the script locally or mock it
      const { exec } = require("child_process");
      const path = require("path");
      const scriptPath = path.join(process.cwd(), "scripts", "emergency_sandbox_purge.py");
      
      let cmd = `python "${scriptPath}"`;
      if (apply) cmd += " --apply";
      if (clear_prod_jobs) cmd += " --clear-prod-jobs";
      if (purge_prod_demo) cmd += " --purge-prod-demo";
      if (i_understand_prod_delete) cmd += " --i-understand-prod-delete";

      return new Promise<Response>((resolve) => {
        exec(cmd, (err: any, stdout: string, stderr: string) => {
          resolve(new Response(JSON.stringify({
            success: !err,
            returncode: err ? err.code : 0,
            stdout,
            stderr,
            cmd
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        });
      });
    } else {
      // In production, we proxy directly to Python backend Cloud Run
      const proxyRes = await proxyRequest("/admin/emergency-sandbox-purge", "POST", body, ctx);
      return proxyRes;
    }
  } catch (err: any) {
    console.error("[admin-purge-api] POST failed:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
