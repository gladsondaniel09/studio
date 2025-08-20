
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
const TEMPERATURE = 0.2;
const MAX_TOKENS = 1400; // adjust as needed
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_INPUT_CHARS = 16_000; // cap raw logs length; tune per your needs
const ENABLE_RETRY = true;

// -------- Utilities --------
function createTimeoutSignal(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

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

function formatZodIssues(issues: any[]) {
  try {
    return issues.map((i) => ({
      path: Array.isArray(i.path) ? i.path.join('.') : i.path,
      message: i.message,
      code: i.code,
    }));
  } catch {
    return issues;
  }
}

// -------- Public API --------
export async function analyzeLogIncident(
  input: IncidentAnalysisInput
): Promise<IncidentAnalysisOutput> {
  return analyzeLogIncidentFlow(input);
}

// -------- Prompt --------
const prompt = ai.definePrompt({
  name: 'analyzeLogIncidentPrompt',
  input: { schema: IncidentAnalysisInputSchema },
  output: { schema: IncidentAnalysisOutputSchema },
  model: MODEL_ID,
  prompt: `System:
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

Example (structure only; adjust values to the logs):
{
  "severity": "High",
  "suspected_component": "Risk Engine",
  "error_signature": "ERR-RISK-VAL-001",
  "time_range": { "start": "2025-08-20T12:00:00Z", "end": "2025-08-20T12:15:00Z" },
  "impacted_entities": ["Trade#12345", "User:jsmith"],
  "probable_causes": ["Null pointer in valuation path"],
  "recommended_steps": ["Restart risk service", "Purge cache", "Re-run EOD valuation"],
  "confidence": 0.82
}

Logs to analyze:
{{{logs}}}
`,
});

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

    const preparedInput = {
      ...input,
      logs: truncateLogs(input.logs),
    };

    let attempt = 0;
    let lastErr: any;
    
    while (attempt < (ENABLE_RETRY ? 2 : 1)) {
      attempt++;
      let raw = '';

      try {
        const { signal, cancel } = createTimeoutSignal(REQUEST_TIMEOUT_MS);
        
        const invoke = (prompt as any).withConfig
          ? (prompt as any).withConfig({
              model: MODEL_ID,
              options: { temperature: TEMPERATURE, max_tokens: MAX_TOKENS, signal },
            })
          : prompt;

        const { output } = await invoke(preparedInput);

        cancel();
        
        if (!output) throw new Error('Model returned no output.');

        raw = typeof output === 'string' ? output : JSON.stringify(output);
        const maybeParsed = typeof output === 'string' ? safeJsonParse(output) : output;

        const validated = IncidentAnalysisOutputSchema.parse(maybeParsed);
        return validated;
      } catch (err: any) {
        lastErr = err;
        // Print everything we need ONCE
        console.error('[analyze] failure details:', {
            message: err?.message,
            name: err?.name,
            zodIssues: err?.issues
            ? err.issues.map((i: any) => ({ path: i.path, message: i.message }))
            : undefined,
            rawPreview: raw ? raw.slice(0, 1200) : undefined,
        });

        const retriable =
          err?.name === 'AbortError' ||
          /timeout|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(err?.message || '') ||
          err?.message?.includes('Failed to parse JSON');

        if (!(ENABLE_RETRY && attempt < 2 && retriable)) {
             break;
        }
      }
    }

    // Final throw with friendly message
    throw new Error(
      'Failed to analyze logs. Please try again with fewer logs or adjust the input.'
    );
  }
);
