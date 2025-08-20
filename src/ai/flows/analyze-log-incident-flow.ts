'use server';
/**
 * @fileOverview An AI flow for analyzing audit logs to extract incident details.
 *
 * - analyzeLogIncident - A function that takes a string of logs and returns a structured incident analysis.
 */

import { ai } from '@/ai/genkit';
import {
  IncidentAnalysisInputSchema,
  IncidentAnalysisOutputSchema,
  type IncidentAnalysisInput,
  type IncidentAnalysisOutput,
} from '@/lib/types';

// -------- Config --------
const MODEL_ID = 'sonar-pro'; // use 'sonar' if logs are small, 'sonar-pro' for more headroom
const MAX_INPUT_CHARS = 16_000; // cap raw logs length; tune per your needs

// -------- Utilities --------
function safeJsonParse(text: string): object {
    // Attempt to find the JSON object within the text using a regular expression.
    // This is more robust against extra text or markdown fences.
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            // The matched text is not valid JSON, fall through to the old method.
        }
    }

    // Fallback to the original cleaning method if regex fails or matched JSON is invalid.
    const cleaned = text
        .trim()
        .replace(/^\uFEFF/, '') // strip BOM if present
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .trim();
        
    try {
        return JSON.parse(cleaned);
    } catch(e) {
        // If all parsing fails, throw an error to be caught by the flow's error handler.
        throw new Error('Failed to parse JSON from model output.');
    }
}

function truncateLogs(raw: string) {
  if (!raw) return raw;
  if (raw.length <= MAX_INPUT_CHARS) return raw;
  return raw.slice(0, MAX_INPUT_CHARS) + '\n[TRUNCATED]';
}

// -------- Public API --------
export async function analyzeLogIncident(
  input: IncidentAnalysisInput
): Promise<IncidentAnalysisOutput> {
  return analyzeLogIncidentFlow(input);
}

// -------- Flow --------
const analyzeLogIncidentFlow = ai.defineFlow(
  {
    name: 'analyzeLogIncidentFlow',
    inputSchema: IncidentAnalysisInputSchema,
    outputSchema: IncidentAnalysisOutputSchema,
  },
  async (input) => {
    if (!input?.logs || input.logs.trim().length === 0) {
      throw new Error('logs is required and cannot be empty.');
    }

    const preparedLogs = truncateLogs(input.logs);
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY is not configured in the environment.');
    }

    try {
      const promptText = `System:
You are a senior application support engineer for a commodity trading and risk management (CTRM/ETRM) platform. Your expertise covers trade capture, pricing, risk management, scheduling, nominations, and financial settlement.
Return ONLY a valid JSON object that conforms to the specified fields. Do not include markdown, code fences, or commentary.

Task:
Analyze the following audit logs. Identify a potential operational incident, determine its root cause, assess its impact, and recommend actionable steps for resolution.

Output fields (must be present):
- severity: "High" | "Medium" | "Low"
- suspected_component: string
- error_signature: string
- time_range: { "start": ISO8601 string, "end": ISO8601 string }
- impacted_entities: string[]
- probable_causes: string[]
- recommended_steps: string[]
- confidence: number between 0.0 and 1.0

Logs to analyze:
${preparedLogs}`;

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_ID,
          messages: [{ role: 'user', content: promptText }],
          temperature: 0.2,
          max_tokens: 1400,
        }),
        cache: 'no-store',
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('Perplexity API Error:', {
          status: response.status,
          body: responseText.slice(0, 500),
        });
        throw new Error(`Perplexity API call failed with status ${response.status}`);
      }

      const parsed = safeJsonParse(responseText);
      const validated = IncidentAnalysisOutputSchema.parse(parsed);
      return validated;

    } catch (err: any) {
      console.error('[analyzeLogIncidentFlow] uncaught error:', {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
      });
      // Re-throw a user-friendly error
      throw new Error('Failed to analyze logs. Please try again with fewer logs or adjust the input.');
    }
  }
);