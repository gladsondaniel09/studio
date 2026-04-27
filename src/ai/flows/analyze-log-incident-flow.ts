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

    const promptText = `You are a forensic Xceler CTRM systems analyst. Your task is to reconstruct the exact sequence of events from these audit logs to create a replication script for a non-production environment.

CRITICAL INSTRUCTIONS:
1. Examine EVERY log entry's 'differences' (from difference_list) and 'payload'.
2. Identify the specific Xceler modules used (e.g., [Physical Trade (Beta)], [Operations Dashboard], [Vessel Planning], [Trade Actualization], [Settlement (Trade & Cost)]).
3. Extract exact technical values: quantities (including decimals like 3,999.781 MT), Trade IDs, BL Numbers, Vessel Names, and Profit Centers.
4. Your 'steps_to_replicate' must be a chronological, line-by-line reconstruction of the user actions required to mirror these logs exactly.

Fields required in the JSON output:
- title: A concise, descriptive title for the identified issue.
- summary: A brief summary of the business scenario (e.g., "5-way BL split and partial blending for Vessel X").
- steps_to_replicate: A forensic list of actions (e.g., "Create Purchase for 20k MT", "Split into 5 specific quantities...", "POST invoice...").
- observed_behavior: What the discrepancy was (e.g., "Expected balance 90.311 MT but found 203.828 MT").
- potential_cause: The likely technical reason for the failure found in the log differences.

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
