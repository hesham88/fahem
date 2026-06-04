import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

function getLanguageName(lang: string): string {
  const mapping: { [key: string]: string } = {
    en: "English",
    ar: "Arabic",
    fr: "French",
    de: "German",
    es: "Spanish",
    it: "Italian",
    zh: "Chinese"
  };
  return mapping[lang] || "English";
}

export async function POST(req: NextRequest) {
  try {
    const { text, title, targetLanguage } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing required parameter: text" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const langCode = targetLanguage || "en";
    const langName = getLanguageName(langCode);

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.warn("[Translator API] GEMINI_API_KEY is not configured. Returning mock/original text.");
      return new Response(JSON.stringify({
        success: true,
        translatedText: `[Translation Fallback to ${langName}] ${text}`,
        translatedTitle: title ? `[${langName}] ${title}` : ""
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const modelName = "gemini-2.5-flash"; // super fast, ideal for translating textbook contents

    const prompt = `You are a professional educational translator. Translate the following educational textbook content into ${langName} (${langCode}).
Make the translation natural, accurate, and contextually correct for students studying this subject.
Maintain identical paragraph structure, line breaks, mathematical symbols, equations, and technical terminology. Do NOT add any extra notes, meta-text, introductory or concluding statements. Return ONLY the translated text.

Title to translate (if present):
${title || ""}

Text to translate:
${text}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt
    });

    const responseText = response.text || "";
    
    // If we passed a title, let's split if possible, or we can just translate them separately or keep them combined.
    // Actually, a simpler and cleaner way is to translate the title and content in a single JSON schema so we get both clean!
    // Let's modify the prompt to use JSON return type so we always get clean title and text.
    
    const jsonPrompt = `You are a professional educational translator. Translate the following educational textbook section (both title and main content) into ${langName} (${langCode}).
Make the translation natural, accurate, and contextually correct for students studying this subject.
Maintain identical paragraph structure, mathematical symbols, equations, and technical terminology. Do NOT add any extra notes.

Output strictly as a JSON object with this exact structure:
{
  "translatedTitle": "translated title here",
  "translatedText": "translated text content here with preserved line breaks and technical formulas"
}

Original Title:
"${title || ""}"

Original Content:
"${text}"

Only output the raw JSON object, no markdown code blocks, no other text.`;

    const jsonResponse = await ai.models.generateContent({
      model: modelName,
      contents: jsonPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const jsonResponseText = jsonResponse.text || "";
    console.log("[Translator API] Translated response:", jsonResponseText);
    const result = JSON.parse(jsonResponseText.trim());

    return new Response(JSON.stringify({
      success: true,
      translatedTitle: result.translatedTitle || title,
      translatedText: result.translatedText || text
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[Translator API Error]:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
