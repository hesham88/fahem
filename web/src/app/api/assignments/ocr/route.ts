import { NextRequest } from "next/server";
import { requireUser } from "../../_auth";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    // Enforce instructor/admin roles
    const allowedRoles = ["teacher", "admin", "super-admin", "judge"];
    if (!allowedRoles.includes(ctx.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: Only instructors can extract questions" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { image } = body; // Base64-encoded image string

    if (!image) {
      return new Response(JSON.stringify({ error: "image (base64 string) is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }), {
        status: 501,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Clean up base64 prefix if present (e.g. data:image/png;base64,...)
    let cleanBase64 = image;
    let mimeType = "image/png";
    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        cleanBase64 = match[2];
      }
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const promptText = `
    You are an expert academic OCR and AI vision question-extractor.
    Look at the attached printed or handwritten academic question image and extract the questions.
    Ensure you translate and shape both English and Arabic versions of the title and questions properly.
    
    Format your output strictly as a JSON object with this exact structure:
    {
      "title": "A short English title representing the extracted topic",
      "title_ar": "A short Arabic title representing the extracted topic",
      "questions": [
        {
          "id": "q1",
          "type": "mcq", // must be one of: "mcq", "complete_sentence", "open_ended", "exact_answer"
          "prompt": "The prompt of the question in English",
          "prompt_ar": "The prompt of the question in Arabic",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"], // strictly 4 options for mcq, empty array [] for others
          "answer": "0", // correct option index ("0", "1", "2", "3") for MCQ, or the correct phrase/value for exact_answer/complete_sentence, or grading answer reference for open_ended
          "rubric": "" // optional rubric or grading guidelines for open_ended, otherwise empty string ""
        }
      ]
    }
    `;

    const resp = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64
          }
        },
        promptText
      ],
      config: { responseMimeType: "application/json" }
    });

    const text = resp.text || "{}";
    const extractedData = JSON.parse(text);

    return new Response(JSON.stringify({ success: true, ...extractedData }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-assignments-ocr] failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
