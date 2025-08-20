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

export async function analyzeLogIncident(
  input: IncidentAnalysisInput
): Promise<IncidentAnalysisOutput> {
  return analyzeLogIncidentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeLogIncidentPrompt',
  input: { schema: IncidentAnalysisInputSchema },
  output: { schema: IncidentAnalysisOutputSchema },
  model: 'sonar-pro',
  // Keep the “system” guidance up front and make the model return only JSON.
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

const analyzeLogIncidentFlow = ai.defineFlow(
  {
    name: 'analyzeLogIncidentFlow',
    inputSchema: IncidentAnalysisInputSchema,
    outputSchema: IncidentAnalysisOutputSchema,
  },
  async (input) => {
    // Guard: require logs
    if (!input?.logs || input.logs.trim().length === 0) {
      throw new Error('logs is required and cannot be empty.');
    }

    try {
      const { output } = await prompt(input);

      if (!output) {
        throw new Error('Model returned no output.');
      }

      // Some Genkit setups return text; others already coerce to the declared schema.
      // Safely handle both cases.
      const maybeParsed =
        typeof output === 'string' ? safeJsonParse(output) : output;

      // Validate against your declared output schema (throws if invalid).
      const validated = IncidentAnalysisOutputSchema.parse(maybeParsed);

      return validated;
    } catch (err: any) {
      // Improve debuggability without leaking secrets.
      console.error('analyzeLogIncidentFlow error', {
        message: err?.message,
        cause: err?.cause,
        stack: err?.stack,
      });
      throw new Error(
        'Failed to analyze logs. Please try again with fewer logs or adjust the input.'
      );
    }
  }
);

// ---- helpers ----
function safeJsonParse(text: string) {
  // Strip common accidental wrappers like code fences if any slip through.
  const cleaned = text
    .trim()
    .replace(/^```json\n/, '')
    .replace(/\n```$/, '')
    .trim();
  return JSON.parse(cleaned);
}
