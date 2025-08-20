'use server';

import {
  IncidentAnalysisInputSchema,
  IncidentAnalysisOutputSchema,
  type IncidentAnalysisInput,
  type IncidentAnalysisOutput,
} from '@/lib/types';

export async function analyzeLogIncident(
  input: IncidentAnalysisInput
): Promise<IncidentAnalysisOutput> {
  
  // Validate input
  if (!input?.logs?.trim()) {
    throw new Error('logs is required and cannot be empty.');
  }

  // Check API key
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY environment variable is not set');
  }

  // Truncate logs if too long
  const logs = input.logs.length > 15000 
    ? input.logs.slice(0, 15000) + '\n[TRUNCATED]'
    : input.logs;

  const prompt = `You are a senior QA engineer for a CTRM/ETRM platform. Your task is to analyze a stream of audit logs to identify a potential bug or unexpected system behavior.

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
${logs}`;

  try {
    // Direct API call
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro', // Use a powerful model for this task
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1200
      })
    });

    // Check HTTP status
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API returned ${response.status}: ${errorText}`);
    }

    // Parse response
    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error(`Invalid API response structure: ${JSON.stringify(data)}`);
    }

    const message = data.choices[0].message;
    if (!message || !message.content) {
      throw new Error('No content in API response');
    }
    const content = message.content;


    // Clean and parse JSON
    const cleanContent = content.trim()
      .replace(/^```json/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanContent);
    } catch (parseError: any) {
      throw new Error(`Failed to parse JSON response. Content: ${cleanContent.slice(0, 500)}. Parse error: ${parseError.message}`);
    }

    // Validate with Zod
    try {
      const validated = IncidentAnalysisOutputSchema.parse(parsed);
      return validated;
    } catch (zodError: any) {
      const issues = zodError.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Schema validation failed. Issues: ${issues}. Data: ${JSON.stringify(parsed)}`);
    }

  } catch (error: any) {
    // Re-throw the actual error message - NO generic message
    throw error;
  }
}
