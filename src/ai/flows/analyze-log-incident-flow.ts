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

  const prompt = `You are a senior application support engineer for a CTRM/ETRM platform.

Analyze these audit logs and return ONLY a valid JSON object with these exact fields:
- severity: "High" | "Medium" | "Low"
- suspected_component: string
- error_signature: string  
- time_range: {"start": "ISO8601", "end": "ISO8601"}
- impacted_entities: array of strings
- probable_causes: array of strings
- recommended_steps: array of strings
- confidence: number between 0.0 and 1.0

Return ONLY the JSON object. No markdown, no code blocks, no extra text.

Example:
{"severity":"High","suspected_component":"Risk Engine","error_signature":"ERR-001","time_range":{"start":"2025-08-20T12:00:00Z","end":"2025-08-20T12:15:00Z"},"impacted_entities":["Trade#123"],"probable_causes":["Connection timeout"],"recommended_steps":["Restart service"],"confidence":0.8}

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
        model: 'sonar',
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
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error(`Invalid API response structure: ${JSON.stringify(data)}`);
    }

    const content = data.choices[0].message.content;
    if (!content) {
      throw new Error('No content in API response');
    }

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
