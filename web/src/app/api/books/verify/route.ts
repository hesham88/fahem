import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileFormat, downloadUrl, userId } = await req.json();

    if (!fileName || !fileFormat) {
      return new Response(JSON.stringify({ error: "Missing required parameters: fileName, fileFormat" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      // Fallback/Mock verification if API key is missing to keep the panel fully operational
      console.warn("[Academic Verifier Agent] GEMINI_API_KEY is not configured. Falling back to mock verification.");
      return simulateVerification(fileName, fileFormat);
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const modelName = "gemini-2.5-flash"; // extremely fast and accurate for validation

    const prompt = `You are the Fahem Academic Verifier Agent. 
Audit this user-uploaded document to verify if it is suitable as an educational or academic learning asset.
Academic materials include: textbooks, notes, syllabi, study guides, research papers, exam sheets, lecture slides, homework, flashcards, charts, etc.
Non-academic materials include: memes, personal photos, social media posts, receipts, movie posters, shopping lists, completely unrelated files, or explicit/inappropriate content.

Analyze these file attributes:
- File Name: "${fileName}"
- File Format: "${fileFormat}"
- File URL (if helpful): "${downloadUrl || ""}"

Respond strictly with a JSON object in this format:
{
  "isAcademic": true or false,
  "confidence": number (between 0 and 100),
  "category": "Mathematics", "Science", "History", "Language", "Computer Science", "Engineering", "General Education", or "Non-Academic",
  "rationaleEn": "Detailed reasoning in English explaining your audit verdict.",
  "rationaleAr": "Detailed reasoning in Arabic (العربية) explaining your audit verdict."
}
Only output the raw JSON object, no markdown blocks, no other text.`;

    let result;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "";
      console.log("[Academic Verifier Agent] API Response:", responseText);
      result = JSON.parse(responseText.trim());
    } catch (apiErr: any) {
      console.error("[Academic Verifier Agent] Gemini API call failed:", apiErr);
      // fallback simulation to preserve UX in case of rate limits or transient errors
      return simulateVerification(fileName, fileFormat);
    }

    return new Response(JSON.stringify({
      success: true,
      agent: "Fahem Academic Verifier Agent",
      verdict: result
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[Academic Verifier Agent API Error]:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Simulated/Heuristic audit callback to ensure absolute robustness
function simulateVerification(fileName: string, fileFormat: string) {
  const academicKeywords = [
    "math", "calc", "algebra", "physic", "chem", "bio", "histor", "geograph", "lecture", 
    "notes", "quiz", "test", "exam", "python", "code", "programm", "study", "guid", "learn", 
    "curriculum", "syllabus", "school", "colleg", "univers", "science", "literatur", "book",
    "chapter", "درس", "مذاكرة", "كتاب", "امتحان", "رياضيات", "فيزياء", "كيمياء", "محاضرة", 
    "ملخص", "علوم", "لغة", "عربي", "إنجليزي", "تاريخ", "جغرافيا"
  ];

  const lowerName = fileName.toLowerCase();
  const matched = academicKeywords.some(keyword => lowerName.includes(keyword));

  // If file contains any match, or it is a PDF/DOCX (which are highly likely academic), approve it.
  const isAcademicType = fileFormat.toLowerCase() === "pdf" || fileFormat.toLowerCase() === "docx" || matched;
  const isAcademic = isAcademicType;

  const confidence = isAcademic ? 85 : 40;
  const category = isAcademic 
    ? (lowerName.includes("python") || lowerName.includes("code") ? "Computer Science" : "General Education")
    : "Non-Academic";

  const rationaleEn = isAcademic
    ? `The file name "${fileName}" suggests educational context. PDF/DOCX formatted assets are highly aligned with the study vault.`
    : `The file name "${fileName}" and image format did not contain explicit academic indicators. It appears to be non-academic.`;

  const rationaleAr = isAcademic
    ? `اسم الملف "${fileName}" يشير إلى سياق تعليمي. تنسيقات PDF/DOCX تتماشى بشكل كبير مع خزنة المذاكرة المخصصة.`
    : `اسم الملف "${fileName}" وتنسيق الصورة لم يظهروا مؤشرات أكاديمية واضحة. يبدو أن الملف غير دراسي.`;

  return new Response(JSON.stringify({
    success: true,
    agent: "Fahem Academic Verifier Agent (Heuristic Simulator)",
    verdict: {
      isAcademic,
      confidence,
      category,
      rationaleEn,
      rationaleAr
    }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
