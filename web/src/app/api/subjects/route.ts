import { NextRequest } from "next/server";
import { checkIsAdmin, checkIsSuperadmin } from "../admin/helper";
import { proxyRequest } from "../proxy";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../localDbHelper";

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
    if (isLocalEnv()) {
      const db = getLocalDb();
      // Ensure both emoji and icon_emoji exist
      const subjects = db.subjects.map(s => ({
        ...s,
        icon_emoji: s.icon_emoji || s.emoji || "📚",
        emoji: s.emoji || s.icon_emoji || "📚"
      }));
      return new Response(JSON.stringify({ success: true, subjects }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return await proxyRequest("/user/subjects", "GET");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, name_ar, grade_level, category, icon_emoji, requesterEmail } = await req.json();

    if (!requesterEmail || !name || !name_ar) {
      return new Response(JSON.stringify({ error: "Missing required fields: requesterEmail, name, name_ar" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify requester is admin/superadmin
    const isAdmin = await checkIsAdmin(requesterEmail);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access Denied: Requester is not an authorized administrator." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isSuper = await checkIsSuperadmin(requesterEmail);
    const needsApproval = isAdmin && !isSuper;

    if (needsApproval) {
      const db = getLocalDb();
      const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const changeRequest = {
        id: requestId,
        requesterEmail,
        actionType: "create_subject",
        payload: { name, name_ar, grade_level, category, icon_emoji },
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
      const subjectId = "sub_" + name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
      const newSubject = {
        _id: subjectId,
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
        books_count: 0
      };
      db.subjects.push(newSubject);
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, subject: newSubject }), {
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
      icon_emoji
    });

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
    const { id, name, name_ar, grade_level, category, icon_emoji, requesterEmail } = await req.json();

    if (!requesterEmail || !id || !name || !name_ar) {
      return new Response(JSON.stringify({ error: "Missing required fields: requesterEmail, id, name, name_ar" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify requester is admin
    const isAdmin = await checkIsAdmin(requesterEmail);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access Denied: Requester is not authorized." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isSuper = await checkIsSuperadmin(requesterEmail);
    const needsApproval = isAdmin && !isSuper;

    if (needsApproval) {
      const db = getLocalDb();
      const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const changeRequest = {
        id: requestId,
        requesterEmail,
        actionType: "update_subject",
        payload: { id, name, name_ar, grade_level, category, icon_emoji },
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
      db.subjects[idx] = {
        ...db.subjects[idx],
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
        emoji: icon_emoji || db.subjects[idx].emoji || db.subjects[idx].icon_emoji || "📚" // Dual property compatibility
      };
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, subject: db.subjects[idx] }), {
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
      icon_emoji
    });

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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const requesterEmail = searchParams.get("requesterEmail");

    if (!id || !requesterEmail) {
      return new Response(JSON.stringify({ error: "Missing id or requesterEmail parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isAdmin = await checkIsAdmin(requesterEmail);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access Denied: Requester is not authorized." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isSuper = await checkIsSuperadmin(requesterEmail);
    const needsApproval = isAdmin && !isSuper;

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
      // Remove associated books
      db.books = db.books.filter(b => b.subject_id !== id);
      // Remove subject
      db.subjects.splice(idx, 1);
      saveLocalDb(db);
      return new Response(JSON.stringify({ success: true, message: "Subject and associated books deleted locally." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy to Cloud Run Agent
    return await proxyRequest(`/user/subjects?id=${id}`, "DELETE");

  } catch (err: any) {
    console.error("[api-subjects-delete] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

