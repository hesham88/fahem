import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, language, voice } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), { status: 500 });
    }

    const modelName = "gemini-3.1-flash-tts-preview";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

    // Select standard voice name if not provided
    // Available voices: "Kore", "Puck", "Charon", "Aoede", "Fenrir" etc.
    const selectedVoice = voice || (language === "ar" ? "Aoede" : "Kore");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedVoice
              }
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Gemini TTS API error: ${response.status} - ${errorText}` }), { status: response.status });
    }

    const resJson = await response.json();
    const inlineData = resJson.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    
    if (!inlineData || !inlineData.data) {
      // Fallback if audio was not returned in inlineData
      return new Response(JSON.stringify({ error: "No audio content returned from Gemini TTS model" }), { status: 500 });
    }

    return new Response(JSON.stringify({
      success: true,
      audioContent: inlineData.data, // base64 string
      mimeType: inlineData.mimeType || "audio/mp3"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[api-audio-tts] Failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
