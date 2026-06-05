import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, targetLanguage } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text to translate" }), { status: 400 });
    }

    const resolvedLanguage = targetLanguage === "ar" ? "ar" : "en";
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), { status: 500 });
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

    const prompt = `
You are the elite "Fahem Translation Agent" specialized in preserving layout and pedagogical flow.
Your task is to translate academic textbook page content into the target language while maintaining maximum accuracy, pedagogical clarity, and absolute layout structure.

Target Language: ${resolvedLanguage === "ar" ? "Arabic" : "English"}

MANDATORY RULES:
1. Translate all academic text, titles, descriptions, and educational materials beautifully and naturally.
2. Keep technical variables, identifier names, programming variables (e.g., x, y, score, value), and actual code snippets in English as-is. Do NOT translate them or transcribe them to Arabic characters.
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
              { text: `Here is the academic textbook page content to translate:\n\n${text}` }
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
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status} - ${errorText}` }), { status: response.status });
    }

    const resJson = await response.json();
    const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      return new Response(JSON.stringify({ error: "Empty response from translation agent" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, translatedText: responseText.trim() }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-translate] Translation failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
