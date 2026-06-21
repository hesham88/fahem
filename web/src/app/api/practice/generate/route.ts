import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";
import { requireUser } from "../../_auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    // FC7.11: the topic (customConcepts) and chapters were SENT by PracticePanel but DROPPED here,
    // and grounding used 2 RANDOM pages — so a "practice if-statements from this book" request
    // produced questions about whatever random pages were drawn (TOC/intro/unrelated chapters).
    const { subject, bookId, mode, language, selectedChapters, customConcepts } = body;

    const resolvedLanguage = language === "ar" ? "ar" : "en";
    const resolvedMode = mode || "mcq";
    const resolvedSubject = subject || "General";

    // Normalise the requested focus: concepts (comma-separated) + chapter labels.
    const concepts: string[] = String(customConcepts || "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const chapterLabels: string[] = (Array.isArray(selectedChapters) ? selectedChapters : [])
      .map((c: any) => String(c || "").trim()).filter(Boolean);
    const focusTerms = [...concepts, ...chapterLabels].map((t) => t.toLowerCase());

    // Helper to extract content depending on field naming in database
    const getPageContent = (p: any, lang: string) => {
      if (p.content) return p.content;
      if (lang === "ar") {
        return p.content_ar || p.content_en || "";
      } else {
        return p.content_en || p.content_ar || "";
      }
    };

    // FC7.11: choose pages RELEVANT to the requested focus rather than at random. Score each page
    // by how many focus terms it contains; take the best matches. Only if NOTHING is provided or
    // matched do we fall back to a deterministic sample (first pages, not random).
    const selectRelevantPages = (pages: any[], maxPages: number): any[] => {
      if (!Array.isArray(pages) || pages.length === 0) return [];
      if (focusTerms.length > 0) {
        const scored = pages
          .map((p) => {
            const text = String(getPageContent(p, resolvedLanguage) || "").toLowerCase();
            const score = focusTerms.reduce((acc, term) => acc + (term && text.includes(term) ? 1 : 0), 0);
            return { p, score };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score);
        if (scored.length > 0) return scored.slice(0, maxPages).map((x) => x.p);
      }
      // Deterministic fallback (front of the book) when there is no focus or no match.
      return pages.slice(0, maxPages);
    };

    // FC9.15: capture the source chapter of the grounding pages so the practice record can be
    // tagged with the REAL chapter/topic even when the user practices the whole book.
    const pageChapter = (p: any) => String(p.chapterTitleEn || p.chapter_title_en || p.chapterTitle || p.chapter_title || p.chapter || "").trim();
    const deriveChapter = (pages: any[]): string => {
      const counts: Record<string, number> = {};
      pages.forEach((p) => { const c = pageChapter(p); if (c) counts[c] = (counts[c] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return top ? top[0] : "";
    };

    // 1. Resolve grounding context from real book pages if bookId is provided
    let contextText = "";
    let sourceChapter = "";
    if (bookId) {
      if (isLocalEnv()) {
        const db = getLocalDb();
        const pages = (db as any).book_pages || [];
        const bookPages = pages.filter((p: any) => p.book_id === bookId);
        const selectedPages = selectRelevantPages(bookPages, 3);
        if (selectedPages.length > 0) {
          contextText = selectedPages.map((p: any) => `[Page ${p.page_number}]:\n${getPageContent(p, resolvedLanguage)}`).join("\n\n");
          sourceChapter = deriveChapter(selectedPages);
        }
      } else {
        // Production: fetch the book pages via the proxy, then ground on focus-relevant pages.
        try {
          const res = await proxyRequest(`/user/books/pages?book_id=${bookId}`, "GET");
          if (res.ok) {
            const data = await res.json();
            if (data && data.pages && data.pages.length > 0) {
              const selectedPages = selectRelevantPages(data.pages, 3);
              contextText = selectedPages.map((p: any) => `[Page ${p.page_number}]:\n${getPageContent(p, resolvedLanguage)}`).join("\n\n");
              sourceChapter = deriveChapter(selectedPages);
            }
          }
        } catch (err) {
          console.error("[generate-practice] Failed to get pages from proxy:", err);
        }
      }
    }

    // 2. Fallback static content for grounding if no pages exist
    if (!contextText) {
      if (resolvedSubject === "Math") {
        contextText = "Topic: Matrices, determinants, Cramer's rule, and linear systems.";
      } else if (resolvedSubject === "Science") {
        contextText = "Topic: Gases and thermodynamics (Ideal gas law, Boyle's law, Charles's law, heat, work, internal energy, laws of thermodynamics, molecular kinetics, pressure and temperature).";
      } else if (resolvedSubject === "Arabic") {
        contextText = "Topic: Arabic grammar, parsing (إعراب), nominative/accusative/genitive states, and parts of speech.";
      } else {
        contextText = "Topic: General academic curriculum subjects.";
      }
    }

    // 3. Build AI Prompt
    const focusBlock = (concepts.length > 0 || chapterLabels.length > 0)
      ? `- REQUIRED FOCUS (the question MUST test exactly this and nothing else):
    ${concepts.length > 0 ? `Concepts/topics: ${concepts.join(", ")}` : ""}
    ${chapterLabels.length > 0 ? `Chapters: ${chapterLabels.join(", ")}` : ""}
  If the grounding material below does not cover the required focus, still write the question about
  the REQUIRED FOCUS using the subject knowledge — never drift to an unrelated topic.`
      : `- No specific focus was given: base the question on the grounding material below.`;

    const prompt = `
You are the ultimate gamified AI Practice Tutor for the Fahem platform.
Your task is to generate a premium quality, highly engaging learning question for a student.

Practice Config:
- Subject: ${resolvedSubject}
- Mode: ${resolvedMode} (must be one of: mcq, text, oral)
- Language: ${resolvedLanguage === "ar" ? "Arabic" : "English"}
${focusBlock}
- Grounding context / source material:
${contextText}

CRITICAL: The question must be strictly on-topic for the REQUIRED FOCUS when one is given. Do NOT ask
about table-of-contents, page numbers, the repository/platform itself, or unrelated chapters.

Instructions for Question Types:
- If Mode is "mcq": Generate a multiple-choice question. Provide exactly 4 diverse options. Mark one as correct.
- If Mode is "text": Generate an active recall question requiring a written sentence or paragraph answer. Options and correctOption are not required.
- If Mode is "oral": Generate a speech/pronunciation/oral explanation task (e.g. "Explain why...", "Pronounce or recite...", "Deliver a summary of...").

Gamification Tone:
Make the question feel like a quest or video game challenge. Use emojis. Keep it fun and pedagogically sound.

You MUST respond with a JSON object strictly matching this schema:
{
  "question": "The challenge / question text",
  "options": ["Option A", "Option B", "Option C", "Option D"], // Only for mcq mode, otherwise empty array []
  "correctOption": "The exact string matching the correct option", // Only for mcq mode, otherwise empty string ""
  "topic": "A short (2-5 word) label of the SPECIFIC concept/topic this question tests",
  "hint": "A gamified, helpful hint or clue"
}
`;

    // 4. Call Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), { status: 500 });
    }

    const isOral = resolvedMode === "oral";
    let modelName = isOral ? "gemini-3.1-flash-live-preview" : (process.env.GEMINI_MODEL || "gemini-3.1-flash-lite");
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok && isOral && modelName === "gemini-3.1-flash-live-preview") {
      console.warn(`[api-practice-generate] gemini-3.1-flash-live-preview failed with status ${response.status}. Falling back to gemini-3.1-flash-lite.`);
      modelName = "gemini-3.1-flash-lite";
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
      response = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status} - ${errorText}` }), { status: response.status });
    }

    const resJson = await response.json();
    const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      return new Response(JSON.stringify({ error: "Empty response from Gemini" }), { status: 500 });
    }

    // Log Token Usage Telemetry
    const usageMetadata = resJson.usageMetadata;
    const promptTokens = usageMetadata?.promptTokenCount || 0;
    const completionTokens = usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = usageMetadata?.totalTokenCount || 0;

    if (totalTokens > 0) {
      try {
        await proxyRequest("/user/token-usage", "POST", {
          userId: ctx.uid,
          userEmail: ctx.email || "anonymous@fahem.ai",
          promptTokens: Number(promptTokens),
          completionTokens: Number(completionTokens),
          totalTokens: Number(totalTokens),
          model: modelName,
          type: "practice_generation"
        });
      } catch (err) {
        console.warn("[api-practice-generate] Failed to log token usage:", err);
      }
    }

    const questionData = JSON.parse(responseText.trim());

    // FC11.7: the model biases the correct MCQ option to a fixed slot (observed: always the 2nd
    // choice). Shuffle the options so the correct position is uniformly random per question.
    // Correctness is matched by the `correctOption` STRING downstream, so reordering is safe.
    if (resolvedMode === "mcq" && Array.isArray(questionData.options) && questionData.options.length > 1) {
      const opts = [...questionData.options];
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      questionData.options = opts;
    }

    // FC9.15: surface the source chapter so the practice record / analytics can pinpoint the topic.
    return new Response(JSON.stringify({ success: true, sourceChapter, ...questionData }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-practice-generate] Failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
