import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';

/**
 * Shared Anthropic client for forensic audit-log analysis.
 * Reads ANTHROPIC_API_KEY from the environment (set it in apphosting.yaml /
 * Vercel project env vars). Claude Opus 4.8 is our most capable model for the
 * multi-step reasoning these CTRM forensic flows require.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const ANALYSIS_MODEL = 'claude-opus-4-8';

/**
 * Calls Claude with adaptive thinking, asks for a single JSON object, then
 * validates it against the supplied Zod schema.
 *
 * This deliberately avoids the SDK's `messages.parse()` / `helpers/zod`
 * structured-output helpers — those are not available in all SDK versions and
 * broke the production build. `messages.create()` + manual validation works on
 * any recent SDK release.
 */
export async function generateStructured<T>(opts: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    thinking: { type: 'adaptive' },
    system: `${opts.system}

OUTPUT FORMAT
Respond with a SINGLE valid JSON object that conforms exactly to the schema described in the user message. Do not include any prose, explanation, or markdown code fences before or after the JSON. Output only the raw JSON object.`,
    messages: [{ role: 'user', content: opts.prompt }],
  });

  // Concatenate all text blocks (thinking blocks are a separate type and skipped).
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  if (!text) {
    throw new Error('The AI model did not return any text content.');
  }

  const json = extractJson(text);
  return opts.schema.parse(json);
}

/** Pulls the first balanced JSON object out of a model response. */
function extractJson(text: string): unknown {
  // Strip ```json ... ``` fences if the model added them anyway.
  let candidate = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // If there's still surrounding prose, grab from the first { to the last }.
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
