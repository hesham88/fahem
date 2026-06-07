import { NextRequest } from "next/server";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";
import { requireUser } from "../_auth";
import { createNotification } from "../notifications/helper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const { searchParams } = new URL(req.url);
    const group_id = searchParams.get("group_id");

    if (!group_id) {
      return new Response(JSON.stringify({ error: "group_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const assignments = (db.group_assignments || [])
        .filter((asg: any) => asg.group_id === group_id)
        .sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0));

      const assignmentsWithSubmissions = assignments.map((asg: any) => {
        const submission = (db.assignment_submissions || []).find(
          (sub: any) => sub.assignment_id === asg._id && sub.uid === ctx.uid
        );
        return {
          ...asg,
          user_submission: submission ? { ...submission } : null
        };
      });

      return new Response(JSON.stringify({ success: true, assignments: assignmentsWithSubmissions }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest(`/assignments?group_id=${group_id}`, "GET", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    // Enforce role authorization
    const allowedRoles = ["teacher", "admin", "super-admin", "judge"];
    if (!allowedRoles.includes(ctx.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: Only instructors can post assignments" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { group_id, title, title_ar, subject_id, book_id, questions, timer_seconds = 120 } = body;

    if (!group_id || !title || !title_ar || (!subject_id && !book_id)) {
      return new Response(JSON.stringify({ error: "Missing required fields: group_id, title, title_ar, and (subject_id or book_id)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();

      // GA.2 — Academic grounding validation (fail-closed)
      let anchorValid = false;
      if (subject_id) {
        const subjectExists = (db.subjects || []).some((s: any) => s._id === subject_id);
        if (subjectExists) anchorValid = true;
      }
      if (!anchorValid && book_id) {
        const bookExists = (db.books || []).some((b: any) => b._id === book_id);
        if (bookExists) anchorValid = true;
      }

      if (!anchorValid) {
        return new Response(JSON.stringify({ error: "Fail-closed: Question must have a valid subject_id or book_id anchor." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const now = Math.floor(Date.now() / 1000);
      const asg_id = "asg_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      const ends_at = now + Number(timer_seconds);

      const newAsg = {
        _id: asg_id,
        group_id,
        author_uid: ctx.uid,
        title,
        title_ar,
        subject_id,
        book_id,
        questions: questions || [],
        timer_seconds: Number(timer_seconds),
        starts_at: now,
        ends_at,
        status: "active",
        created_at: now,
        updated_at: now
      };

      if (!db.group_assignments) {
        db.group_assignments = [];
      }
      db.group_assignments.push(newAsg);
      saveLocalDb(db);

      // Fan-out notifications using createNotification internally
      const studentsToNotify = (db.users || []).filter(
        (u: any) => ["student", "user"].includes(u.role) && (u.userId || u.uid) !== ctx.uid
      );

      for (const student of studentsToNotify) {
        const studentUid = student.userId || student.uid;
        if (studentUid) {
          await createNotification({
            recipient_uid: studentUid,
            type: "assignment_new",
            title: `New Assignment: ${title}`,
            title_ar: `واجب جديد: ${title_ar}`,
            body: `Your instructor posted a new timed assignment: '${title}'`,
            body_ar: `قام المعلم بنشر واجب مؤقت جديد: '${title_ar}'`,
            payload: {
              group_id,
              assignment_id: asg_id,
              deep_link: `?tab=social&group=${group_id}&assignment=${asg_id}`
            }
          });
        }
      }

      return new Response(JSON.stringify({ success: true, assignment: newAsg }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/assignments", "POST", body, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
