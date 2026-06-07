import { NextRequest } from "next/server";
import { requireUser } from "../../_auth";
import { isLocalEnv, getLocalDb, saveLocalDb, shouldSkipDirectMongo } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { bookId, pageNumber, targetLanguage } = body;

    if (!bookId || pageNumber === undefined || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: bookId, pageNumber, or targetLanguage" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supportedLanguages = ["en", "ar", "es", "fr", "de", "zh", "it"];
    if (!supportedLanguages.includes(targetLanguage)) {
      return new Response(
        JSON.stringify({ error: `Unsupported target language: ${targetLanguage}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const targetLanguageNames: Record<string, string> = {
      en: "English",
      ar: "Arabic",
      es: "Spanish",
      fr: "French",
      de: "German",
      zh: "Chinese (Simplified)",
      it: "Italian"
    };
    const targetLanguageName = targetLanguageNames[targetLanguage];

    let page: any = null;
    let localDb: any = null;
    let mongoClient: any = null;

    if (isLocalEnv()) {
      localDb = getLocalDb();
      const pages = localDb.book_pages || [];
      page = pages.find(
        (p: any) =>
          (p.book_id === bookId || p.bookId === bookId) &&
          Number(p.page_number || p.pageNum || 0) === Number(pageNumber)
      );
    } else {
      try {
        if (!shouldSkipDirectMongo()) {
          const { MongoClient } = require("mongodb");
          const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
          mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
          await mongoClient.connect();
          const db = mongoClient.db("fahem");
          page = await db.collection("book_pages").findOne({
            book_id: bookId,
            page_number: Number(pageNumber)
          });
        }
      } catch (mongoErr) {
        console.error("[api-translate-page] MongoDB Direct Connection failed, trying fallback:", mongoErr);
      }
    }

    // Fallback if production failed/skipped or page is not in localDb
    if (!page) {
      if (mongoClient) await mongoClient.close();
      return new Response(
        JSON.stringify({ error: `Page ${pageNumber} of book ${bookId} not found` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize page i18n
    if (!page.i18n) {
      page.i18n = {};
    }

    // Check if translations for this language already exist in page.i18n
    let hasExistingTranslation = false;
    if (page.blocks && Array.isArray(page.blocks) && page.blocks.length > 0) {
      // If at least some blocks have translation for the targetLanguage, we consider it exists
      const blockIds = page.blocks.map((b: any) => b.id);
      hasExistingTranslation = blockIds.some((id: string) => page.i18n[id] && page.i18n[id][targetLanguage]);
    } else {
      // For legacy/simple pages, check if translated page content is in i18n[targetLanguage]
      hasExistingTranslation = !!page.i18n[targetLanguage];
    }

    if (hasExistingTranslation) {
      if (mongoClient) await mongoClient.close();
      return new Response(JSON.stringify({ success: true, i18n: page.i18n }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Run translation agent via Gemini
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      if (mongoClient) await mongoClient.close();
      return new Response(
        JSON.stringify({ error: "Gemini API key is not configured on server" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

    let responseText = "";
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    // Handle block translation vs. legacy content translation
    if (page.blocks && Array.isArray(page.blocks) && page.blocks.length > 0) {
      // Extract translatable blocks
      const blocksToTranslate = page.blocks.map((b: any) => {
        const translatableFields: any = {};
        const fieldsToCheck = ["text", "term", "caption", "label", "title", "prompt"];
        fieldsToCheck.forEach(field => {
          if (b[field] && typeof b[field] === "string" && b[field].trim() !== "") {
            translatableFields[field] = b[field];
          }
        });
        if (b.options && Array.isArray(b.options) && b.options.length > 0) {
          translatableFields.options = b.options;
        }
        if (b.items && Array.isArray(b.items) && b.items.length > 0) {
          translatableFields.items = b.items.map((item: any) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && typeof item.text === "string") return item.text;
            return item;
          });
        }
        if (Object.keys(translatableFields).length > 0) {
          return { id: b.id, type: b.type, fields: translatableFields };
        }
        return null;
      }).filter(Boolean);

      if (blocksToTranslate.length === 0) {
        // Nothing to translate
        if (mongoClient) await mongoClient.close();
        return new Response(JSON.stringify({ success: true, i18n: page.i18n }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      const prompt = `
You are the elite "Fahem Translation Agent" specialized in preserving layout and pedagogical flow.
Your task is to translate academic textbook blocks into the target language.

Target Language: ${targetLanguageName}

MANDATORY RULES:
1. Translate all academic text, titles, descriptions, and educational materials beautifully and naturally into ${targetLanguageName}.
2. Keep technical variables, identifier names, programming variables (e.g., x, y, score, value), and actual code snippets in English as-is. Do NOT translate or transcribe them to the target language.
3. Keep all formatting tags, HTML entities, and Markdown syntax (such as bolding **, headers #, etc.) in their EXACT relative layout placement.
4. If there are equations, formulas, or numbers being evaluated, leave them exactly in their original notation.
5. You must return your translations in a strict JSON format mapping each block's ID to its translated fields object.
6. Preserve the exact keys of the fields (e.g., "text", "term", "caption", "label", "title", "prompt", "options", "items").
7. For array fields like "options" and "items", return a translated array of the exact same length.
8. Output ONLY the raw JSON object, without any markdown code fences, headers, or explanations. Start with '{' and end with '}'.
`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { text: `Here are the textbook blocks to translate:\n\n${JSON.stringify(blocksToTranslate, null, 2)}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (mongoClient) await mongoClient.close();
        return new Response(
          JSON.stringify({ error: `Gemini API error: ${response.status} - ${errorText}` }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const resJson = await response.json();
      responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const usageMetadata = resJson.usageMetadata;
      promptTokens = usageMetadata?.promptTokenCount || 0;
      completionTokens = usageMetadata?.candidatesTokenCount || 0;
      totalTokens = usageMetadata?.totalTokenCount || 0;

      if (!responseText.trim()) {
        if (mongoClient) await mongoClient.close();
        return new Response(
          JSON.stringify({ error: "Empty translation response from Gemini" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      try {
        let cleanJsonText = responseText.trim();
        // Remove markdown block backticks if returned despite prompt instructions
        if (cleanJsonText.startsWith("```")) {
          cleanJsonText = cleanJsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }
        const parsedTranslations = JSON.parse(cleanJsonText);

        // Merge back into page.i18n
        for (const [blockId, fields] of Object.entries(parsedTranslations)) {
          if (!page.i18n[blockId]) {
            page.i18n[blockId] = {};
          }
          page.i18n[blockId][targetLanguage] = fields;
        }
      } catch (jsonErr: any) {
        console.error("[api-translate-page] JSON Parsing Error of translations:", jsonErr, responseText);
        if (mongoClient) await mongoClient.close();
        return new Response(
          JSON.stringify({ error: `Failed to parse translations JSON: ${jsonErr.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

    } else {
      // Legacy/Simple page content translation
      const originalText = page.content || page.contentEn || page.contentAr || "";
      if (!originalText.trim()) {
        if (mongoClient) await mongoClient.close();
        return new Response(JSON.stringify({ success: true, i18n: page.i18n }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      const prompt = `
You are the elite "Fahem Translation Agent" specialized in preserving layout and pedagogical flow.
Your task is to translate academic textbook page content into the target language while maintaining maximum accuracy, pedagogical clarity, and absolute layout structure.

Target Language: ${targetLanguageName}

MANDATORY RULES:
1. Translate all academic text, titles, descriptions, and educational materials beautifully and naturally.
2. Keep technical variables, identifier names, programming variables (e.g., x, y, score, value), and actual code snippets in English as-is. Do NOT translate them or transcribe them to the target language.
3. Keep all formatting tags, HTML entities, and Markdown syntax (such as bolding **, headers #, ##, ###, bullet points -, *, •, numbered lists, code blocks \`\`\`, blockquotes, and tables) in their EXACT relative layout placement. The document structure must be completely preserved.
4. If there are equations, formulas, or numbers being evaluated, leave them exactly in their original notation.
5. Do NOT output any intro, outro, conversational notes, or wrapping JSON markdown codeblocks. Output ONLY the raw translated text.
`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { text: `Here is the academic textbook page content to translate:\n\n${originalText}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.95
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (mongoClient) await mongoClient.close();
        return new Response(
          JSON.stringify({ error: `Gemini API error: ${response.status} - ${errorText}` }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const resJson = await response.json();
      responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const usageMetadata = resJson.usageMetadata;
      promptTokens = usageMetadata?.promptTokenCount || 0;
      completionTokens = usageMetadata?.candidatesTokenCount || 0;
      totalTokens = usageMetadata?.totalTokenCount || 0;

      page.i18n[targetLanguage] = responseText.trim();
    }

    // Save to database
    if (isLocalEnv()) {
      const idx = localDb.book_pages.findIndex((p: any) => p._id === page._id);
      if (idx !== -1) {
        localDb.book_pages[idx] = page;
        saveLocalDb(localDb);
      }
    } else if (mongoClient) {
      const db = mongoClient.db("fahem");
      await db.collection("book_pages").updateOne(
        { _id: page._id },
        { $set: { i18n: page.i18n } }
      );
      await mongoClient.close();
    }

    // Log Token Usage Telemetry with Context!
    if (totalTokens > 0) {
      try {
        await proxyRequest("/user/token-usage", "POST", {
          userId: ctx.uid,
          userEmail: ctx.email || "anonymous@fahem.ai",
          promptTokens: Number(promptTokens),
          completionTokens: Number(completionTokens),
          totalTokens: Number(totalTokens),
          model: modelName,
          type: "academic_translation",
          context: {
            book_id: bookId,
            page: Number(pageNumber),
            feature: "translate"
          }
        });
      } catch (err) {
        console.warn("[api-translate-page] Failed to log token usage:", err);
      }
    }

    return new Response(JSON.stringify({ success: true, i18n: page.i18n }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-translate-page] Translation failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
