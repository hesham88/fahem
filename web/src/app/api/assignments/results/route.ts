import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { isLocalEnv, getLocalDb } from "../../localDbHelper";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const { searchParams } = new URL(req.url);
    const assignment_id = searchParams.get("assignment_id");

    if (!assignment_id) {
      return new Response(JSON.stringify({ error: "assignment_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const asg = (db.group_assignments || []).find((a: any) => a._id === assignment_id);

      if (!asg) {
        return new Response(JSON.stringify({ error: "Assignment not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const submissions_list = (db.assignment_submissions || []).filter(
        (sub: any) => sub.assignment_id === assignment_id
      );

      const isInstructor = ["teacher", "admin", "super-admin", "judge"].includes(ctx.role);
      const filteredSubmissions = isInstructor
        ? submissions_list
        : submissions_list.filter((sub: any) => sub.uid === ctx.uid);

      return new Response(
        JSON.stringify({
          success: true,
          submissions: filteredSubmissions,
          assignment: {
            _id: asg._id,
            title: asg.title,
            title_ar: asg.title_ar,
            ends_at: asg.ends_at,
            status: asg.status
          }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return await proxyRequest(`/assignments/results?assignment_id=${assignment_id}`, "GET", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
