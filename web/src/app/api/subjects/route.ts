import { NextRequest } from "next/server";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";
import { requireUser, requireAdmin } from "../_auth";

export const dynamic = "force-dynamic";

async function translateMetadata(text: string): Promise<Record<string, string>> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return {
      en: text,
      ar: text,
      es: text,
      fr: text,
      de: text,
      zh: text,
      it: text
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const prompt = `You are an elite multilingual academic translation assistant.
Translate this educational subject/book metadata string: "${text}"
into the following 7 languages: English (en), Arabic (ar), Spanish (es), French (fr), German (de), Chinese (zh), Italian (it).

Respond with a strictly formatted JSON object where the keys are the language codes (en, ar, es, fr, de, zh, it) and the values are the corresponding translations.
Only output the JSON object, do NOT include markdown syntax (e.g. \`\`\`json) or other text.`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini Translate Error: ${response.status}`);
    }

    const resJson = await response.json();
    const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (responseText) {
      return JSON.parse(responseText.trim());
    }
  } catch (err) {
    console.error("[translateMetadata] Error:", err);
  }

  return {
    en: text,
    ar: text,
    es: text,
    fr: text,
    de: text,
    zh: text,
    it: text
  };
}


export async function GET(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const { searchParams } = new URL(req.url);
    const curriculumId = searchParams.get("curriculum_id");

    if (isLocalEnv()) {
      const db = getLocalDb();
      let subjects = db.subjects || [];

      // Ensure both emoji and icon_emoji exist, and handle defaults
      subjects = subjects.map(s => {
        const booksCount = (db.books || []).filter((b: any) => b.subject_id === s._id).length;
        const booksForSubject = (db.books || []).filter((b: any) => b.subject_id === s._id);
        const core_book_ids = booksForSubject.filter((b: any) => b.role === "core").map((b: any) => b._id);
        const supporting_book_ids = booksForSubject.filter((b: any) => b.role === "supporting").map((b: any) => b._id);
        return {
          ...s,
          icon_emoji: s.icon_emoji || s.emoji || "📚",
          emoji: s.emoji || s.icon_emoji || "📚",
          books_count: booksCount,
          core_book_ids,
          supporting_book_ids
        };
      });

      if (curriculumId) {
        subjects = subjects.filter((s: any) => s.curriculum_id === curriculumId);
      }

      return new Response(JSON.stringify({ success: true, subjects }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    let proxyPath = "/user/subjects";
    if (curriculumId) {
      proxyPath += `?curriculum_id=${encodeURIComponent(curriculumId)}`;
    }
    return await proxyRequest(proxyPath, "GET", undefined, ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const payload = await req.json();
    const { name, name_ar, grade_level, category, icon_emoji: rawIconEmoji, emoji, curriculum_id, color, core_book_ids, supporting_book_ids } = payload;
    // The Curriculum Studio form sends `emoji`; accept it as the icon so the subject icon saves.
    const icon_emoji = rawIconEmoji || emoji;

    if (!name || !name_ar) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, name_ar" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const requesterEmail = ctx.email || "anonymous@fahem.ai";
    const isSuper = ctx.role === "super-admin";
    const needsApproval = !isSuper && ctx.db_target !== "fahem_sandbox" && !isLocalEnv();

    if (needsApproval) {
      const db = getLocalDb();
      const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const changeRequest = {
        id: requestId,
        requesterEmail,
        actionType: "create_subject",
        payload: { name, name_ar, grade_level, category, icon_emoji, curriculum_id, color, core_book_ids, supporting_book_ids },
        status: "pending",
        createdAt: new Date().toISOString()
      };
      db.admin_change_requests = db.admin_change_requests || [];
      db.admin_change_requests.push(changeRequest);
      saveLocalDb(db);

      return new Response(JSON.stringify({ success: true, needsApproval: true, message: "Your request has been submitted for Superadmin approval." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const nameTranslations = await translateMetadata(name || name_ar);

    // 1. Local environment check
    if (isLocalEnv()) {
      const db = getLocalDb();
      const currId = curriculum_id || "general";
      const slug = (nameTranslations.en || name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      const subjectId = `subj_${currId}_${slug}`;

      const existingIdx = db.subjects.findIndex(s => s._id === subjectId || (s.curriculum_id === currId && s.slug === slug));
      const newSubject = {
        _id: subjectId,
        slug,
        name,
        name_ar,
        name_en: nameTranslations.en || name,
        name_es: nameTranslations.es || name,
        name_fr: nameTranslations.fr || name,
        name_de: nameTranslations.de || name,
        name_zh: nameTranslations.zh || name,
        name_it: nameTranslations.it || name,
        grade_level: grade_level || "General",
        category: category || "Science",
        icon_emoji: icon_emoji || "📚",
        emoji: icon_emoji || "📚", // Dual property compatibility
        curriculum_id: currId,
        color: color || "#1E96A0",
        core_book_ids: core_book_ids || [],
        supporting_book_ids: supporting_book_ids || [],
        books_count: 0
      };

      if (existingIdx >= 0) {
        db.subjects[existingIdx] = {
          ...db.subjects[existingIdx],
          ...newSubject,
          books_count: db.subjects[existingIdx].books_count || 0
        };
      } else {
        db.subjects.push(newSubject);
      }

      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, subject: existingIdx >= 0 ? db.subjects[existingIdx] : newSubject }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Production: Proxy to Cloud Run Agent
    return await proxyRequest("/user/subjects", "POST", {
      name,
      name_ar,
      name_en: nameTranslations.en || name,
      name_es: nameTranslations.es || name,
      name_fr: nameTranslations.fr || name,
      name_de: nameTranslations.de || name,
      name_zh: nameTranslations.zh || name,
      name_it: nameTranslations.it || name,
      grade_level,
      category,
      icon_emoji,
      curriculum_id,
      color,
      core_book_ids,
      supporting_book_ids
    }, ctx);

  } catch (err: any) {
    console.error("[api-subjects-post] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const payload = await req.json();
    const { id, name, name_ar, grade_level, category, icon_emoji: rawIconEmoji, emoji, curriculum_id, color, core_book_ids, supporting_book_ids } = payload;
    // The Curriculum Studio form sends `emoji`; accept it as the icon so the subject icon updates.
    const icon_emoji = rawIconEmoji || emoji;

    if (!id || !name || !name_ar) {
      return new Response(JSON.stringify({ error: "Missing required fields: id, name, name_ar" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const requesterEmail = ctx.email || "anonymous@fahem.ai";
    const isSuper = ctx.role === "super-admin";
    const needsApproval = !isSuper && ctx.db_target !== "fahem_sandbox" && !isLocalEnv();

    if (needsApproval) {
      const db = getLocalDb();
      const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const changeRequest = {
        id: requestId,
        requesterEmail,
        actionType: "update_subject",
        payload: { id, name, name_ar, grade_level, category, icon_emoji, curriculum_id, color, core_book_ids, supporting_book_ids },
        status: "pending",
        createdAt: new Date().toISOString()
      };
      db.admin_change_requests = db.admin_change_requests || [];
      db.admin_change_requests.push(changeRequest);
      saveLocalDb(db);

      return new Response(JSON.stringify({ success: true, needsApproval: true, message: "Your request has been submitted for Superadmin approval." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const nameTranslations = await translateMetadata(name || name_ar);

    if (isLocalEnv()) {
      const db = getLocalDb();
      const idx = db.subjects.findIndex(s => s._id === id);
      if (idx < 0) {
        return new Response(JSON.stringify({ error: "Subject not found locally" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const currId = curriculum_id !== undefined ? curriculum_id : db.subjects[idx].curriculum_id || "cur_general";
      const slug = (nameTranslations.en || name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      const newSubjectId = `subj_${currId}_${slug}`;

      const updatedSubject = {
        ...db.subjects[idx],
        _id: newSubjectId,
        slug,
        name,
        name_ar,
        name_en: nameTranslations.en || name,
        name_es: nameTranslations.es || name,
        name_fr: nameTranslations.fr || name,
        name_de: nameTranslations.de || name,
        name_zh: nameTranslations.zh || name,
        name_it: nameTranslations.it || name,
        grade_level: grade_level || "General",
        category: category || "Science",
        icon_emoji: icon_emoji || db.subjects[idx].icon_emoji || db.subjects[idx].emoji || "📚",
        emoji: icon_emoji || db.subjects[idx].emoji || db.subjects[idx].icon_emoji || "📚", // Dual property compatibility
        curriculum_id: currId,
        color: color !== undefined ? color : db.subjects[idx].color,
        core_book_ids: core_book_ids !== undefined ? core_book_ids : db.subjects[idx].core_book_ids,
        supporting_book_ids: supporting_book_ids !== undefined ? supporting_book_ids : db.subjects[idx].supporting_book_ids
      };

      // Handle ID change (rename/re-curriculum) to preserve referential integrity
      if (id !== newSubjectId) {
        // 1. Reassign books pointing to the old ID
        db.books = (db.books || []).map((b: any) => {
          if (b.subject_id === id) {
            return { ...b, subject_id: newSubjectId, curriculum_id: currId };
          }
          return b;
        });

        // 2. Remove the old subject document
        db.subjects = db.subjects.filter(s => s._id !== id);

        // 3. Insert or update the new subject document
        const targetIdx = db.subjects.findIndex(s => s._id === newSubjectId);
        if (targetIdx >= 0) {
          db.subjects[targetIdx] = { ...db.subjects[targetIdx], ...updatedSubject };
        } else {
          db.subjects.push(updatedSubject);
        }
      } else {
        db.subjects[idx] = updatedSubject;
      }

      saveLocalDb(db);
      const finalSubject = db.subjects.find(s => s._id === newSubjectId) || updatedSubject;
      return new Response(JSON.stringify({ success: true, subject: finalSubject }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy to Cloud Run Agent
    return await proxyRequest(`/user/subjects`, "PUT", {
      id,
      name,
      name_ar,
      name_en: nameTranslations.en || name,
      name_es: nameTranslations.es || name,
      name_fr: nameTranslations.fr || name,
      name_de: nameTranslations.de || name,
      name_zh: nameTranslations.zh || name,
      name_it: nameTranslations.it || name,
      grade_level,
      category,
      icon_emoji,
      curriculum_id,
      color,
      core_book_ids,
      supporting_book_ids
    }, ctx);

  } catch (err: any) {
    console.error("[api-subjects-put] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const requesterEmail = ctx.email || "anonymous@fahem.ai";
    const isSuper = ctx.role === "super-admin";
    const needsApproval = !isSuper && ctx.db_target !== "fahem_sandbox" && !isLocalEnv();

    if (needsApproval) {
      const db = getLocalDb();
      const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const changeRequest = {
        id: requestId,
        requesterEmail,
        actionType: "delete_subject",
        payload: { id },
        status: "pending",
        createdAt: new Date().toISOString()
      };
      db.admin_change_requests = db.admin_change_requests || [];
      db.admin_change_requests.push(changeRequest);
      saveLocalDb(db);

      return new Response(JSON.stringify({ success: true, needsApproval: true, message: "Your deletion request has been submitted for Superadmin approval." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const idx = db.subjects.findIndex(s => s._id === id);
      if (idx < 0) {
        return new Response(JSON.stringify({ error: "Subject not found locally" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      // Decouple associated books instead of deleting them (OR-12)
      db.books = (db.books || []).map((b: any) => {
        if (b.subject_id === id) {
          return { ...b, subject_id: null, curriculum_id: null, role: null };
        }
        return b;
      });
      // Remove subject
      db.subjects.splice(idx, 1);
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, message: "Subject deleted and associated books decoupled locally." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy to Cloud Run Agent
    return await proxyRequest(`/user/subjects?id=${id}`, "DELETE", undefined, ctx);

  } catch (err: any) {
    console.error("[api-subjects-delete] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
