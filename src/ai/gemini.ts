import Groq from 'groq-sdk';
import type { z } from 'zod';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

export const ANALYSIS_MODEL = 'llama-3.3-70b-versatile';

export async function generateStructured<T>(opts: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured on the server.');
  }

  const completion = await groq.chat.completions.create({
    model: ANALYSIS_MODEL,
    messages: [
      { role: 'system', content: opts.system + '\n\nOUTPUT FORMAT\nRespond with a SINGLE valid JSON object. Do not include any prose, explanation, or markdown code fences. Output only the raw JSON object.' },
      { role: 'user', content: opts.prompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: opts.maxTokens ?? 32000,
    temperature: 0.2,
  });

  const text = completion.choices[0]?.message?.content?.trim();

  if (!text) {
    throw new Error('The AI model did not return any content.');
  }

  const json = extractJson(text);
  return opts.schema.parse(json);
}

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
