
'use server';

import { ai } from '@/ai/genkit';
import {
  type IncidentAnalysisInput,
  type IncidentAnalysisOutput,
  IncidentAnalysisOutputSchema,
} from '@/lib/types';

/**
 * @fileOverview A flow to analyze audit logs and generate a bug report using Groq (Llama 3.3).
 * 
 * - analyzeLogIncident - The main function to trigger AI analysis.
 */

export async function analyzeLogIncident(
  input: IncidentAnalysisInput
): Promise<IncidentAnalysisOutput> {
  try {
    if (!input?.logs?.trim()) {
      throw new Error('Input logs are empty.');
    }

    // Limit log size to prevent token limit issues or payload size errors
    const logs =
      input.logs.length > 12000
        ? input.logs.slice(0, 12000) + '\n[TRUNCATED]'
        : input.logs;

    const promptText = `You are a senior QA engineer creating a detailed bug report. Analyze these logs and return a valid JSON object.

Fields required:
- title: A concise, descriptive title for the issue.
- summary: A brief summary of what happened.
- steps_to_replicate: A list of steps to reproduce the issue.
- observed_behavior: What actually happened according to the logs.
- potential_cause: The likely technical reason for the failure.

Logs to analyze:
${logs}`;

    const response = await ai.generate({
      // Using Llama 3.3 70B on Groq for high performance and low cost
      model: 'groq/llama-3.3-70b-versatile',
      prompt: promptText,
      config: {
        temperature: 0.1,
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
    // Return a descriptive error to the UI
    throw new Error(error.message || 'Analysis failed due to an internal AI error.');
  }
}
