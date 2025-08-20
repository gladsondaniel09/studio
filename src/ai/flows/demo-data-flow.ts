'use server';
/**
 * @fileOverview A flow for generating sample audit log data for the demo.
 *
 * - generateDemoData - A function that generates a list of sample audit events.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { DemoDataOutput, SampleEventSchema } from '@/lib/types';

const DemoDataOutputSchema = z.object({
  events: z.array(SampleEventSchema),
});

export async function generateDemoData(): Promise<DemoDataOutput> {
  return generateDemoDataFlow();
}

const prompt = ai.definePrompt({
  name: 'generateDemoDataPrompt',
  output: { schema: DemoDataOutputSchema },
  model: 'sonar-pro',
  prompt: `System:
You are an expert at creating realistic synthetic audit log events for a CTRM/ETRM application's audit viewer.
Return ONLY a valid JSON object that matches the required schema. Do not include markdown, code fences, or commentary.

Task:
Generate a diverse list of 15 sample audit log events under the "events" array.

Constraints:
- Include all action types: "create", "update", and "delete" (lowercase only).
- For "create": include "payload" (JSON string of the created object); omit "difference_list".
- For "update": include "difference_list" (JSON string of an array of changes [{label, oldValue, newValue}] with mixed types); omit "payload".
- For "delete": include "payload" (JSON string of the deleted object); omit "difference_list".
- Populate "user" with realistic-looking fake data.
- Make "entity_name" varied (e.g., "Trade", "Counterparty", "Limit", "User").
- "created_timestamp" should be recent and varied (ISO 8601).
- The top-level JSON must match:
  {
    "events": Array<SampleEvent>
  }

Example structure (illustrative only):
{
  "events": [
    {
      "id": "evt_001",
      "entity_name": "Trade",
      "entity_id": "T-100045",
      "action": "update",
      "created_timestamp": "2025-08-20T12:34:56Z",
      "user": {
        "id": "u_8721",
        "name": "Priya Menon",
        "email": "priya.menon@example.com",
        "role": "Risk Analyst"
      },
      "difference_list": "[{\\"label\\":\\"price\\",\\"oldValue\\":98.25,\\"newValue\\":99.1},{\\"label\\":\\"isHedged\\",\\"oldValue\\":false,\\"newValue\\":true}]"
    }
  ]
}
`,
});

const generateDemoDataFlow = ai.defineFlow(
  {
    name: 'generateDemoDataFlow',
    outputSchema: DemoDataOutputSchema,
  },
  async () => {
    try {
      const { output } = await prompt();

      if (!output) {
        throw new Error('Model returned no output.');
      }

      // Some setups return text; others coerce to schema automatically.
      const maybeParsed =
        typeof output === 'string' ? safeJsonParse(output) : output;

      const validated = DemoDataOutputSchema.parse(maybeParsed);
      return validated;
    } catch (err: any) {
      console.error('generateDemoDataFlow error', {
        message: err?.message,
        cause: err?.cause,
        stack: err?.stack,
      });
      throw new Error(
        'Failed to generate demo data. Try again or reduce constraints.'
      );
    }
  }
);

// ---- helpers ----
function safeJsonParse(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\n/, '')
    .replace(/\n```$/, '')
    .trim();
  return JSON.parse(cleaned);
}
