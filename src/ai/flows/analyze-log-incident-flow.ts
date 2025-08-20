'use server';

import {
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
        content: `Analyze these logs and return ONLY valid JSON with fields: severity, suspected_component, error_signature, time_range (start/end ISO), impacted_entities, probable_causes, recommended_steps, confidence (0-1). No markdown.\n\nLogs: ${logs}`
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
      const { IncidentAnalysisOutputSchema } = await import('@/lib/types');
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
