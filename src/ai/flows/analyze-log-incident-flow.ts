
'use server';
/**
 * @fileOverview An AI flow for analyzing audit logs to extract incident details.
 * 
 * - analyzeLogIncident - A function that takes a string of logs and returns a structured incident analysis.
 */

import { ai } from '@/ai/genkit';
import { IncidentAnalysisInputSchema, IncidentAnalysisOutputSchema, type IncidentAnalysisInput, type IncidentAnalysisOutput } from '@/lib/types';


export async function analyzeLogIncident(input: IncidentAnalysisInput): Promise<IncidentAnalysisOutput> {
  return analyzeLogIncidentFlow(input);
}

const prompt = ai.definePrompt({
    name: 'analyzeLogIncidentPrompt',
    input: { schema: IncidentAnalysisInputSchema },
    output: { schema: IncidentAnalysisOutputSchema },
    prompt: `You are a senior application support engineer for a commodity trading and risk management (CTRM/ETRM) platform. Your expertise covers trade capture, pricing, risk management, scheduling, nominations, and financial settlement.

Analyze the following audit logs provided by the user. Your task is to identify a potential operational incident, determine its root cause, assess its impact, and recommend actionable steps for resolution.

Based on the logs, return a valid JSON object with the following fields:
- severity: The overall severity of the incident (e.g., 'High', 'Medium', 'Low').
- suspected_component: The application component most likely causing the issue.
- error_signature: A unique, concise signature or hash for the primary error.
- time_range: An object with 'start' and 'end' ISO timestamps for the incident.
- impacted_entities: An array of strings listing the entities (e.g., trades, users, entities by name) impacted by the incident.
- probable_causes: An array of strings describing the probable root causes.
- recommended_steps: An array of strings listing actionable steps to mitigate or resolve the incident.
- confidence: Your confidence in this analysis, as a number from 0.0 to 1.0.

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
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to get a valid analysis from the AI model.');
    }
    return output;
  }
);
