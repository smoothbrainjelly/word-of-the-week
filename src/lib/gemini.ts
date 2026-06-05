import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text);
}
