'use server';

import {
  IncidentAnalysisInputSchema,
  IncidentAnalysisOutputSchema,
  type IncidentAnalysisInput,
  type IncidentAnalysisOutput,
} from '@/lib/types';

// Temporary debug helper - logs to server console and returns safe error
function logAndThrowSafe(error: any, context: string) {
  const errorInfo = {
    context,
    message: error?.message || 'Unknown error',
    name: error?.name,
    stack: error?.stack?.split('\n')[0], // Just first line
    timestamp: new Date().toISOString()
  };
  
  // This will show in your production server logs
  console.error('[INCIDENT_ANALYSIS_ERROR]', JSON.stringify(errorInfo));
  
  // Throw a safe error for the client
  throw new Error(`Analysis failed at ${context}. Check server logs for details.`);
}

export async function analyzeLogIncident(
  input: IncidentAnalysisInput
): Promise<IncidentAnalysisOutput> {
  
  try {
    // Step 1: Input validation
    if (!input?.logs?.trim()) {
      logAndThrowSafe(new Error('Empty logs'), 'input_validation');
    }

    // Step 2: Environment check
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      logAndThrowSafe(new Error('API key missing'), 'env_check');
    }

    // Step 3: Prepare request
    const logs = input.logs.length > 15000 
      ? input.logs.slice(0, 15000) + '\n[TRUNCATED]'
      : input.logs;

    const requestBody = {
      model: 'sonar',
      messages: [{
        role: 'user',
        content: `You are a senior QA engineer for a CTRM/ETRM platform. Your task is to analyze a stream of audit logs to identify a potential bug or unexpected system behavior.

From the logs, you must deduce:
1.  A concise title for the issue.
2.  A brief summary of the problem.
3.  A numbered list of steps required to replicate the issue, based on the actions in the logs.
4.  A description of the observed (incorrect) behavior.
5.  A likely technical cause (e.g., "floating point precision issue," "off-by-one error," "race condition").

You must return ONLY a valid JSON object that strictly follows this schema:
- title: string
- summary: string
- steps_to_replicate: string[]
- observed_behavior: string
- potential_cause: string

Example of a PERFECT response format:
{
  "title": "Pricing Mismatch in Staggered Pricing Report",
  "summary": "When a trade's quantity is split and allocated across multiple price lines, the staggered pricing report incorrectly shows one line as 'Partially Priced' even when the full contract quantity has been allocated.",
  "steps_to_replicate": [
    "Create a trade with a quantity of 200 MT and confirm it.",
    "Perform an obligation split with a quantity of 193.31 MT.",
    "Fix the price for the entire 200 MT.",
    "Manually allocate 193.31 MT to the first price line.",
    "Allocate the remaining 6.69 MT to the second price line."
  ],
  "observed_behavior": "The staggered pricing report displays the second price line as 'Partially Priced', despite the total allocated quantity matching the full contract amount.",
  "potential_cause": "A potential floating-point precision issue when comparing the allocated quantity (6.68999... MT) to the required quantity (6.69 MT)."
}

Return ONLY the JSON object. No markdown, no code blocks, no extra text.

Logs to analyze:
${logs}`
      }],
      temperature: 0.2,
      max_tokens: 1200
    };

    // Step 4: API call
    let response: Response | undefined;
    try {
      response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
    } catch (fetchError) {
      logAndThrowSafe(fetchError, 'api_fetch');
    }

    // Step 5: Response check
    if (!response!.ok) {
      try {
        const errorText = await response!.text();
        logAndThrowSafe(new Error(`API ${response!.status}: ${errorText}`), 'api_response');
      } catch {
        logAndThrowSafe(new Error(`API ${response!.status}: Unable to read error`), 'api_response');
      }
    }

    // Step 6: JSON parsing
    let data;
    try {
      data = await response!.json();
    } catch (jsonError) {
      logAndThrowSafe(jsonError, 'response_json_parse');
    }

    // Step 7: Extract content
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      logAndThrowSafe(new Error(`No content in response: ${JSON.stringify(data)}`), 'content_extraction');
    }

    // Step 8: Clean and parse content
    let parsed;
    try {
      const cleanContent = content!.trim()
        .replace(/^```json/i, '')
        .replace(/```$/i, '')
        .trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      logAndThrowSafe(new Error(`Parse failed. Content: ${content!.slice(0, 200)}`), 'content_parse');
    }

    // Step 9: Schema validation
    try {
      return IncidentAnalysisOutputSchema.parse(parsed);
    } catch (zodError: any) {
      const issues = zodError.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ') || 'Unknown validation error';
      logAndThrowSafe(new Error(`Schema validation: ${issues}`), 'schema_validation');
    }

  } catch (error) {
    // If it's already our safe error, re-throw
    if (error instanceof Error && error.message.includes('Check server logs')) {
      throw error;
    }
    // Otherwise, log and make safe
    logAndThrowSafe(error, 'unexpected');
  }
  
  // This line should not be reachable if all paths throw an error on failure.
  // Adding it to satisfy TypeScript's return type requirement.
  throw new Error('Reached end of function without returning a value. This should not happen.');
}
