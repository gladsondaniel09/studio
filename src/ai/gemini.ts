import { GoogleGenAI } from '@google/genai';
import type { z } from 'zod';

/**
 * Shared Google Gemini client for forensic audit-log analysis.
 *
 * Uses Gemini's free tier. Reads GEMINI_API_KEY from the environment (set it in
 * Vercel project env vars). Create a free key at https://aistudio.google.com/apikey.
 */
const apiKey = process.env.GEMINI_API_KEY ?? '';
const genAI = new GoogleGenAI({ apiKey });

export const ANALYSIS_MODEL = 'gemini-2.5-flash-preview-05-20';

/**
 * Calls Gemini in JSON mode, then validates the result against the supplied Zod
 * schema. Mirrors the previous Anthropic helper so the flows are unchanged.
 */
export async function generateStructured<T>(opts: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const response = await genAI.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: opts.prompt,
    config: {
      systemInstruction: `${opts.system}

OUTPUT FORMAT
Respond with a SINGLE valid JSON object that conforms exactly to the schema described in the user message. Do not include any prose, explanation, or markdown code fences. Output only the raw JSON object.`,
      responseMimeType: 'application/json',
      maxOutputTokens: opts.maxTokens ?? 32000,
      temperature: 0.2,
    },
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error('The AI model did not return any text content.');
  }

  const json = extractJson(text);
  return opts.schema.parse(json);
}

/** Pulls the first balanced JSON object out of a model response. */
function extractJson(text: string): unknown {
  let candidate = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    candidate = candidate.slice(first, last + 1);
  }

  try {
    return JSON.parse(candidate);
  } catch {
    throw new Error('The AI model returned content that was not valid JSON.');
  }
}
