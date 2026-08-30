import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerationConfig } from "@google/generative-ai";
import type { WordResult } from "@/lib/types";

const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
] as const;

const TTS_MODELS = [
  "gemini-2.5-flash-preview-tts",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-pro-preview-tts",
] as const;

const TTS_VOICES = ["Kore", "Puck", "Aoede", "Fenrir", "Zephyr"] as const;

export type SpeechAudio = {
  audio: string;
  mimeType: string;
};

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("503") ||
    msg.includes("high demand")
  );
}

export type { WordResult };

// Ask the LLM for a batch of N candidate words. Returns an array of word strings.
export async function generateWordBatch(n: number): Promise<string[]> {
  const prompt =
    `Generate a list of ${n} interesting English words that are familiar but not everyday vocabulary. ` +
    `These words should be diverse in origin, length, and subject. ` +
    `Return ONLY a JSON array of strings like ["word1", "word2", ...]. ` +
    `No markdown, no code fences, no other text.`;

  const ai = getGenAI();
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const modelName of MODELS) {
      try {
        console.log("[gemini] generateWordBatch calling model", { model: modelName, attempt, n });
        const model = ai.getGenerativeModel({ model: modelName });
        const start = Date.now();
        const result = await model.generateContent(prompt);
        const elapsed = Date.now() - start;
        const text = result.response.text().trim();
        console.log("[gemini] generateWordBatch model succeeded", { model: modelName, attempt, elapsed });

        const cleaned = text
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        const parsed = JSON.parse(cleaned) as unknown;

        if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "string")) {
          throw new Error("Response was not a string array");
        }

        return parsed as string[];
      } catch (err) {
        lastError = err;
        console.warn("[gemini] generateWordBatch model failed", {
          model: modelName,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
        if (isRetryableError(err)) {
          continue;
        }
        // For non-retryable errors (e.g. parse errors) break the model loop
        // and retry the whole attempt with a fresh call.
        break;
      }
    }
  }

  console.error("[gemini] generateWordBatch all retries exhausted", { n, maxRetries });
  throw lastError;
}

// Given a specific word, ask the LLM for its full WordResult.
export async function enrichWord(word: string): Promise<WordResult> {
  const prompt =
    `Given the word "${word}", return a JSON object (no markdown, no backticks) with exactly these fields: ` +
    `{"word": "${word}", "pronunciation": "IPA pronunciation", "simple_pronunciation": "simplified spelled-out pronunciation", ` +
    `"part_of_speech": "the part of speech (e.g. noun, verb, adjective)", "definition": "concise definition", "etymology": "brief origin", "example": "a single example sentence using the word", ` +
    `"synonyms": "the top 3 synonyms as an array of strings", "antonyms": "the top 3 antonyms as an array of strings"}`;

  const ai = getGenAI();
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const modelName of MODELS) {
      try {
        console.log("[gemini] enrichWord calling model", { model: modelName, attempt, word });
        const model = ai.getGenerativeModel({ model: modelName });
        const start = Date.now();
        const result = await model.generateContent(prompt);
        const elapsed = Date.now() - start;
        const text = result.response.text().trim();
        console.log("[gemini] enrichWord model succeeded", { model: modelName, attempt, elapsed });

        const cleaned = text
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        const parsed = JSON.parse(cleaned) as Partial<WordResult>;
        parsed.synonyms = Array.isArray(parsed.synonyms)
          ? parsed.synonyms.filter((s): s is string => typeof s === "string")
          : [];
        parsed.antonyms = Array.isArray(parsed.antonyms)
          ? parsed.antonyms.filter((s): s is string => typeof s === "string")
          : [];
        return parsed as WordResult;
      } catch (err) {
        lastError = err;
        console.warn("[gemini] enrichWord model failed", {
          model: modelName,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
        if (isRetryableError(err)) {
          continue;
        }
        break;
      }
    }
  }

  console.error("[gemini] enrichWord all retries exhausted...", { word, maxRetries });
  throw lastError;
}

// Formats browsers can play from an <audio> element without repackaging.
const PLAYABLE_AUDIO = /^audio\/(wav|wave|x-wav|mp3|mpeg|ogg|webm|aac|m4a|x-m4a)$/i;

// Wrap raw PCM samples (base64) in a RIFF/WAVE header so browsers can play it.
// Handles linear PCM (format 1) and µ-law (format 7) at any bit depth.
function pcmToWav(
  base64Pcm: string,
  opts: { sampleRate: number; numChannels: number; bitsPerSample: number; format: number },
): string {
  const pcm = Buffer.from(base64Pcm, "base64");
  const bytesPerSample = opts.bitsPerSample / 8;
  const byteRate = opts.sampleRate * opts.numChannels * bytesPerSample;
  const blockAlign = opts.numChannels * bytesPerSample;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(opts.format, 20);
  header.writeUInt16LE(opts.numChannels, 22);
  header.writeUInt32LE(opts.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(opts.bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]).toString("base64");
}

// Normalize whatever the TTS model returns into something an <audio> tag can
// play. Browser-native formats pass through untouched; raw PCM (L16/L8/L24,
// µ-law) is wrapped in a WAV container.
function toBrowserPlayableAudio(input: SpeechAudio): SpeechAudio {
  const mimeType = input.mimeType;
  if (!mimeType || PLAYABLE_AUDIO.test(mimeType)) {
    return input;
  }

  // Only repackage formats we recognize as raw samples; leave anything else.
  if (!/pcm|l\d+|mulaw|pcmu/i.test(mimeType)) {
    return input;
  }

  const isMulaw = /mulaw|pcmu/i.test(mimeType);
  const bitsPerSample = Number(mimeType.match(/l(\d+)/i)?.[1] ?? (isMulaw ? 8 : 16));
  const sampleRate = Number(mimeType.match(/rate=(\d+)/i)?.[1] ?? 24000);
  const numChannels = Number(mimeType.match(/channels?=(\d+)/i)?.[1] ?? 1);
  const format = isMulaw ? 7 : 1;

  return {
    audio: pcmToWav(input.audio, { sampleRate, numChannels, bitsPerSample, format }),
    mimeType: "audio/wav",
  };
}

// Synthesize an audible pronunciation for a word using a TTS model.
// Returns the audio as a base64 string along with its MIME type.
export async function synthesizeSpeech(word: string): Promise<SpeechAudio> {
  const ai = getGenAI();
  const maxRetries = 3;
  let lastError: unknown;

  const generationConfig = {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: TTS_VOICES[0],
        },
      },
    },
  } as unknown as GenerationConfig;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const modelName of TTS_MODELS) {
      try {
        console.log("[gemini] synthesizeSpeech calling model", { model: modelName, attempt, word });
        const model = ai.getGenerativeModel({
          model: modelName,
          generationConfig,
        });
        const start = Date.now();
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: word }] }],
        });
        const elapsed = Date.now() - start;

        const parts = result.response.candidates?.[0]?.content?.parts ?? [];
        const audio = parts.find((part) => part.inlineData)?.inlineData;
        if (!audio?.data) {
          throw new Error("No audio returned by TTS model");
        }

        const { audio: audioData, mimeType } = toBrowserPlayableAudio({
          audio: audio.data,
          mimeType: audio.mimeType,
        });

        console.log("[gemini] synthesizeSpeech model succeeded", {
          model: modelName,
          attempt,
          elapsed,
          mimeType,
        });
        return { audio: audioData, mimeType };
      } catch (err) {
        lastError = err;
        console.warn("[gemini] synthesizeSpeech model failed", {
          model: modelName,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!isRetryableError(err)) break;
      }
    }
  }

  console.error("[gemini] synthesizeSpeech all retries exhausted", { word, maxRetries });
  throw lastError;
}
