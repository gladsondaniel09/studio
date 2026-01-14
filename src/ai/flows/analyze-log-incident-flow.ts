
'use server';

import { ai } from '@/ai/genkit';
import {
  type IncidentAnalysisInput,
  type IncidentAnalysisOutput,
  IncidentAnalysisOutputSchema,
} from '@/lib/types';
import { z } from 'zod';
import { openAI } from 'genkitx-openai';

// Temporary debug helper - logs to server console and returns safe error
function logAndThrowSafe(error: any, context: string) {
  const errorInfo = {
    context,
    message: error?.message || 'Unknown error',
    name: error?.name,
    stack: error?.stack?.split('\n')[0], // Just first line
    timestamp: new Date().toISOString(),
  };

  // This will show in your production server logs
  console.error('[INCIDENT_ANALYSIS_ERROR]', JSON.stringify(errorInfo, null, 2));

  // Throw a safe error for the client
  throw new Error(`Analysis failed at ${context}. Check server logs for details.`);
}

export async function analyzeLogIncident(
  input: IncidentAnalysisInput
): Promise<IncidentAnalysisOutput> {
  try {
    if (!input?.logs?.trim()) {
      throw new Error('Input logs are empty.');
    }

    const logs =
      input.logs.length > 15000
        ? input.logs.slice(0, 15000) + '\n[TRUNCATED]'
        : input.logs;

    const prompt = `You are a senior QA engineer creating a bug report. Analyze these logs and return ONLY a valid JSON object with these exact fields:
- title: A concise title for the identified issue.
- summary: A brief summary of the problem.
- steps_to_replicate: An array of strings describing how to replicate the issue.
- observed_behavior: A string describing the incorrect behavior that was observed.
- potential_cause: A string describing the likely technical cause of the issue.

Return ONLY the JSON object. No markdown, no code blocks, no extra text.

Example:
{"title":"Trade Fails to Update on Price Change","summary":"When a user attempts to update the price of an existing trade, the change is not saved, and the UI reverts to the old price.","steps_to_replicate":["1. Navigate to the 'Trades' screen.","2. Open an existing trade with ID 'T-100045'.","3. Change the 'price' field from 98.25 to 99.1.","4. Click the 'Save' button."],"observed_behavior":"The system shows a success notification, but the trade price remains at 98.25 after the page reloads. The 'difference_list' in the audit log shows the attempted change.","potential_cause":"The backend service for updating trades might have a validation error that is not being surfaced to the UI, or there could be a database transaction rollback."}

Logs to analyze:
${logs}`;

    const response = await ai.generate({
      model: openAI.model('gpt-4o'),
      prompt: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 1200,
      },
      output: {
        format: 'json',
        schema: IncidentAnalysisOutputSchema,
      },
    });
    
    const output = response.output();
    if (!output) {
        throw new Error('No content returned from AI analysis.');
    }
    
    let parsed;
    // When format: 'json' is used, the output can be an object or a string.
    if (typeof output === 'string') {
        try {
            parsed = JSON.parse(output);
        } catch(e) {
            throw new Error(`Failed to parse AI response as JSON. Content: ${output.slice(0, 200)}`);
        }
    } else {
        parsed = output;
    }

    const validationResult = IncidentAnalysisOutputSchema.parse(parsed);
    return validationResult;

  } catch (error) {
    logAndThrowSafe(error, 'analyzeLogIncident');
    // This line will not be reached due to the throw in logAndThrowSafe, but it satisfies TypeScript
    throw error;
  }
}
