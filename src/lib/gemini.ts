import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

function getModel() {
  if (!model) {
    model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });
  }
  return model;
}

type WordResult = {
  word: string;
  definition: string;
  etymology: string;
  example: string;
};

export async function generateWord(theme: string): Promise<WordResult> {
  const prompt = `You are a "Word of the Week" generator. Given this theme: "${theme}", pick a fitting word and return JSON (no markdown, no backticks) with:
{
  "word": "the word",
  "definition": "concise definition",
  "etymology": "brief origin of the word",
  "example": "a single example sentence using the word"
}`;

  const result = await getModel().generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as WordResult;
}
