'use server';

import { ai } from '@/ai/genkit';
import {
  type IncidentAnalysisInput,
  type IncidentAnalysisOutput,
  IncidentAnalysisOutputSchema,
} from '@/lib/types';

/**
 * @fileOverview A forensic flow to analyze audit logs line-by-line and generate a replication script.
 * 
 * - analyzeLogIncident - Reconstructs the exact sequence of events using difference_list and payload data.
 */

export async function analyzeLogIncident(
  input: IncidentAnalysisInput
): Promise<IncidentAnalysisOutput> {
  try {
    if (!input?.logs?.trim()) {
      throw new Error('Input logs are empty.');
    }

    // Limit log size to prevent token limit issues
    const logs =
      input.logs.length > 15000
        ? input.logs.slice(0, 15000) + '\n[TRUNCATED]'
        : input.logs;

    const promptText = `You are a forensic Xceler CTRM systems analyst. Your task is to provide a granular, chronological breakdown of the trade lifecycle from these audit logs.

CRITICAL ANALYSIS GUIDELINES:
1. Examine EVERY log entry's 'differences' (from difference_list) and 'payload'.
2. For the 'lifecycle_breakdown' field, you MUST identify:
   - WHAT record/event was created or updated.
   - WHAT fields/data were modified (extract exact technical values: MT quantities, Trade IDs, BL Numbers, Vessel Names).
   - PLANNING actions: Specify if it is a "Vessel Plan" or another type (Container, Road, etc.).
   - ACTUALIZATION: Capture BL Dates, quantities, and status changes.
   - PRICING: Identify Price Fixation vs. Allocation events.
   - INVOICING: Note creation, regeneration, and POSTING events.
   - WORKFLOW: Note any status changes (Draft -> Confirmed, etc.).

3. For each step in the 'lifecycle_breakdown', mention:
   - Exactly what happened.
   - The timestamp from the log.
   - The impact on the trade status or accounting flow.

4. Generate forensic 'steps_to_replicate' for a non-production environment.

JSON Output Schema:
- title: Concise issue title.
- summary: Brief business scenario summary.
- lifecycle_breakdown: Array of { timestamp, event_name, module, description, impact }.
- steps_to_replicate: Array of replication steps.
- observed_behavior: Description of the discrepancy.
- potential_cause: Root technical cause.

Logs to analyze:
${logs}`;

    const response = await ai.generate({
      model: 'groq/llama-3.3-70b-versatile',
      prompt: promptText,
      config: {
        temperature: 0.1, // High precision
      },
      output: {
        format: 'json',
        schema: IncidentAnalysisOutputSchema,
      },
    });
    
    const output = response.output;
    if (!output) {
        throw new Error('The AI model did not return any content.');
    }
    
    return output;

  } catch (error: any) {
    console.error('[ANALYSIS_FLOW_ERROR]', error);
    throw new Error(error.message || 'Analysis failed due to an internal AI error.');
  }
}
