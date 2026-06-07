import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { requireUser } from "../../_auth";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { assignment_id, answers } = body;

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

      const now = Math.floor(Date.now() / 1000);
      const before_timer = now <= asg.ends_at;

      const sub_id = `sub_${assignment_id}_${ctx.uid}`;
      const existing = (db.assignment_submissions || []).some((s: any) => s._id === sub_id);
      if (existing) {
        return new Response(JSON.stringify({ error: "You have already submitted this assignment" }), {
          status: 409,
          headers: { "Content-Type": "application/json" }
        });
      }

      const gradedAnswers: any[] = [];
      let total_score = 0.0;
      let max_score = 0.0;

      const questionsDict: Record<string, any> = {};
      for (const q of asg.questions || []) {
        questionsDict[q.id] = q;
      }

      const geminiApiKey = process.env.GEMINI_API_KEY || "";

      for (const ans of answers || []) {
        const qid = ans.question_id;
        const val = ans.value;
        const answeredAt = ans.answeredAt || now;

        const q = questionsDict[qid];
        if (!q) continue;

        const q_type = q.type || "mcq";
        let correct = false;
        let score = 0.0;
        let explanation = "";

        max_score += 1.0;

        if (q_type === "mcq") {
          const expected = String(q.answer || "").trim().toLowerCase();
          const submitted = String(val).trim().toLowerCase();
          if (expected === submitted) {
            correct = true;
            score = 1.0;
            explanation = "Correct option index matches precisely.";
          } else {
            explanation = `Incorrect. The expected option index is ${q.answer}.`;
          }
        } else if (q_type === "exact_answer" || q_type === "complete_sentence") {
          const expected = String(q.answer || "").trim().toLowerCase();
          const submitted = String(val).trim().toLowerCase();
          if (expected === submitted) {
            correct = true;
            score = 1.0;
            explanation = "Your answer matches the expected value precisely.";
          } else {
            explanation = `Incorrect. The correct answer is '${q.answer}'.`;
          }
        } else if (q_type === "open_ended") {
          if (geminiApiKey) {
            try {
              const ai = new GoogleGenAI({ apiKey: geminiApiKey });
              const rubricText = q.rubric || "Standard completeness and academic accuracy.";
              const promptText = `
              You are an expert academic critique grader. Grade the submitted student answer for the question below.
              
              Question: ${q.prompt}
              Rubric/Guidelines: ${rubricText}
              Student Submission: ${val}
              
              Critique and grade the submission. Provide:
              1. A score between 0.0 and 1.0 (float)
              2. A short explanation/critique in the language of the submission.
              
              Format your output strictly as a JSON object containing keys "score" and "explanation".
              `;

              const resp = await ai.models.generateContent({
                model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
                contents: promptText,
                config: { responseMimeType: "application/json" }
              });

              const text = resp.text || "{}";
              const resData = JSON.parse(text);
              score = Number(resData.score || 0.0);
              correct = score >= 0.7;
              explanation = resData.explanation || "";
            } catch (gradingErr) {
              console.warn("Gemini grading failed:", gradingErr);
              explanation = "Graded manually or fallback complete.";
            }
          } else {
            score = 0.5;
            explanation = "Critique grading queued/fallback.";
          }
        }

        total_score += score;
        gradedAnswers.push({
          question_id: qid,
          value: val,
          answeredAt,
          before_timer,
          correct,
          score,
          explanation
        });
      }

      const submissionDoc = {
        _id: sub_id,
        assignment_id,
        group_id: asg.group_id,
        uid: ctx.uid,
        answers: gradedAnswers,
        total_score,
        max_score,
        submitted_at: now,
        graded: true
      };

      if (!db.assignment_submissions) {
        db.assignment_submissions = [];
      }
      db.assignment_submissions.push(submissionDoc);
      saveLocalDb(db);

      return new Response(JSON.stringify({ success: true, submission: submissionDoc }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return await proxyRequest("/assignments/submit", "POST", body, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
