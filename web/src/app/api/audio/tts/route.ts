import { NextRequest } from "next/server";
import { proxyRequest } from "../../proxy";
import { requireUser } from "../../_auth";
import { isLocalEnv } from "../../localDbHelper";

export const dynamic = "force-dynamic";

function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
  const header = Buffer.alloc(44);
  const dataLength = pcmBuffer.length;
  
  // "RIFF"
  header.write("RIFF", 0, "ascii");
  // file length - 8
  header.writeUInt32LE(36 + dataLength, 4);
  // "WAVE"
  header.write("WAVE", 8, "ascii");
  // "fmt "
  header.write("fmt ", 12, "ascii");
  // chunk size (16 for PCM)
  header.writeUInt32LE(16, 16);
  // audio format (1 for PCM)
  header.writeUInt16LE(1, 20);
  // number of channels
  header.writeUInt16LE(numChannels, 22);
  // sample rate
  header.writeUInt32LE(sampleRate, 24);
  // byte rate (SampleRate * NumChannels * BitsPerSample/8)
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  // block align (NumChannels * BitsPerSample/8)
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  // bits per sample
  header.writeUInt16LE(bitsPerSample, 34);
  // "data"
  header.write("data", 36, "ascii");
  // chunk size
  header.writeUInt32LE(dataLength, 40);
  
  return Buffer.concat([header, pcmBuffer]);
}

// Simple in-memory cache to store generated speech audio for identical texts, voices, and languages.
// Key format: voice:language:cleanText
const ttsCache = new Map<string, { audioContent: string; mimeType: string }>();

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;

    const body = await req.json();
    const { text, language, voice, bookId, pageNumber } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), { status: 400 });
    }

    // Clean text to remove any graphic emojis/pictographs and textual emoticons (e.g. :), :-D)
    // so that the TTS model reads only pure, high-quality human speech.
    const cleanText = text
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/\p{Emoji_Presentation}/gu, "")
      .replace(/\p{Emoji}/gu, "")
      // Filter out classic emoticons like :), :-D, ;), :P, :(, etc.
      .replace(/[:;=B8x][-~']?[)D\]pP(|\\\/O*D@$]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      return new Response(JSON.stringify({ error: "Text contains no readable speech after stripping emoticons" }), { status: 400 });
    }

    // Select standard voice name if not provided
    // Available voices: "Aoede", "Kore", "Puck", "Charon", "Fenrir" etc.
    const selectedVoice = voice || "Aoede";

    // Check Cache
    const cacheKey = `${selectedVoice}:${language || "en"}:${cleanText}`;
    if (ttsCache.has(cacheKey)) {
      console.log(`[api-audio-tts] Cache hit for: ${cleanText.substring(0, 40)}...`);
      const cached = ttsCache.get(cacheKey)!;

      // Log Audit Event for cached hits
      try {
        await proxyRequest("/audit-logs", "POST", {
          category: "AUDIO_TTS",
          agent: "Audio Service",
          message: `User listened to cached audio TTS segment using voice: ${selectedVoice}`,
          details: `Voice: ${selectedVoice} • Text Length: ${cleanText.length} chars • Language: ${language || "en"} • (Cache Hit)`
        });
      } catch (err) {
        console.warn("[api-audio-tts] Failed to log cached audit event:", err);
      }

      return new Response(JSON.stringify({
        success: true,
        audioContent: cached.audioContent,
        mimeType: cached.mimeType
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Direct Next.js execution of Gemini is used for both local and production environments
    // to bypass Google's enterprise safety/policy block (blockReason: PROHIBITED_CONTENT)
    // on gemini-3.1-flash-tts-preview model triggered by Cloud Run's US-East4 VPC/egress IP ranges.
    // Telemetry and audit logs are still successfully proxied and tracked on the backend.

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), { status: 500 });
    }

    // Use latest gemini-3.1-flash-tts-preview for natural voice and high performance
    const modelName = "gemini-3.1-flash-tts-preview";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

    let promptText = `Please read the following text exactly as written, word-for-word, in its original language, with absolutely no greetings, prefaces, answers, or commentary:\n\n${cleanText}`;

    const isArabic = language === "ar" || /[\u0600-\u06FF]/.test(cleanText);
    if (isArabic) {
      promptText = `Please read the following Arabic text exactly as written, word-for-word, with absolutely no greetings, prefaces, answers, or commentary. You must read it strictly using the authentic Egyptian Arabic dialect (اللهجة المصرية) pronunciation, rhythm, accent, and tone. Do not use Modern Standard Arabic (Fusha) pronunciation — speak completely in a natural Egyptian dialect (اللهجة العامية المصرية):\n\n${cleanText}`;
    }

    let response: any = null;
    const attempts = 4;
    let delay = 1000; // start with 1000ms delay for 429 retries
    let lastErrorText = "";

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: selectedVoice
                  }
                }
              }
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
          })
        });

        if (response.ok) {
          break; // success
        }

        lastErrorText = await response.text();
        if (response.status === 429) {
          if (attempt < attempts) {
            console.warn(`[api-audio-tts] Gemini API returned 429 quota. Retrying in ${delay}ms... (Attempt ${attempt}/${attempts})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2; // exponential backoff
            continue;
          }
        }
        
        break; // if not 429 or out of attempts
      } catch (err: any) {
        lastErrorText = err.message || String(err);
        if (attempt < attempts) {
          console.warn(`[api-audio-tts] Fetch failed: ${lastErrorText}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        throw err;
      }
    }

    if (!response || !response.ok) {
      const status = response ? response.status : 500;
      console.error(`[api-audio-tts] Gemini API failed with status ${status}: ${lastErrorText}`);
      return new Response(JSON.stringify({
        error: `Gemini API failed with status ${status}: ${lastErrorText}`
      }), {
        status: status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const resJson = await response.json();
    const inlineData = resJson.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    
    if (!inlineData || !inlineData.data) {
      console.error(`[api-audio-tts] No audio content returned from Gemini. Full response:`, JSON.stringify(resJson));
      return new Response(JSON.stringify({ error: "No audio content returned from Gemini TTS model" }), { status: 500 });
    }

    const usageMetadata = resJson.usageMetadata;
    const promptTokens = usageMetadata?.promptTokenCount || 0;
    const completionTokens = usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = usageMetadata?.totalTokenCount || 0;

    const targetUserId = ctx.uid;
    const targetUserEmail = ctx.email || "anonymous@fahem.ai";

    // A. Log Token Usage Telemetry
    if (totalTokens > 0) {
      try {
        const tokenUsagePayload: any = {
          userId: targetUserId,
          userEmail: targetUserEmail,
          promptTokens: Number(promptTokens),
          completionTokens: Number(completionTokens),
          totalTokens: Number(totalTokens),
          model: modelName,
          type: "audio_text_to_speech"
        };
        if (bookId && pageNumber !== undefined) {
          tokenUsagePayload.context = {
            book_id: bookId,
            page: Number(pageNumber),
            feature: "audio"
          };
        }
        await proxyRequest("/user/token-usage", "POST", tokenUsagePayload);
      } catch (err) {
        console.warn("[api-audio-tts] Failed to log token usage:", err);
      }
    }

    // B. Log & Audit Audio Event
    try {
      await proxyRequest("/audit-logs", "POST", {
        category: "AUDIO_TTS",
        agent: "Audio Service",
        message: `User listened to audio TTS segment using voice: ${selectedVoice}`,
        details: `Voice: ${selectedVoice} • Text Length: ${cleanText.length} chars • Language: ${language || "en"} • Tokens: ${totalTokens} (${promptTokens} prompt, ${completionTokens} completion)`
      });
    } catch (err) {
      console.warn("[api-audio-tts] Failed to log audit event:", err);
    }

    const rawPcmB64 = inlineData.data;
    const pcmBuffer = Buffer.from(rawPcmB64, "base64");

    // Parse sample rate from mimeType if available (e.g. "audio/pcm;rate=24000")
    let sampleRate = 24000;
    const mime = inlineData.mimeType || "";
    const rateMatch = mime.match(/rate=(\d+)/);
    if (rateMatch) {
      sampleRate = parseInt(rateMatch[1], 10);
    }

    // Convert raw PCM to browser-playable WAV container
    const wavBuffer = pcmToWav(pcmBuffer, sampleRate, 1, 16);
    const wavB64 = wavBuffer.toString("base64");

    // Cache the successful result
    ttsCache.set(cacheKey, {
      audioContent: wavB64,
      mimeType: "audio/wav"
    });

    return new Response(JSON.stringify({
      success: true,
      audioContent: wavB64, // Base64 encoded WAV file
      mimeType: "audio/wav"
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
