'use server';
/**
 * @fileOverview A flow for intelligently sorting audit log events based on business logic.
 *
 * - sortEvents - A function that reorders a list of audit events according to a defined business flow.
 * - SortEventsInput - The input type for the sortEvents function.
 * - SortEventsOutput - The return type for the sortEvents function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SampleEventSchema = z.object({
  created_timestamp: z.string().describe('An ISO 8601 timestamp for when the event occurred.'),
  entity_name: z.string().describe('The name of the entity that was affected, e.g., "Trade" or "User Account".'),
  action: z.enum(['create', 'update', 'delete']).describe('The type of action that occurred.'),
  payload: z.string().optional().describe("A JSON string representing the full data object for 'create' or 'delete' actions."),
  difference_list: z.string().optional().describe("A JSON string of an array of differences for 'update' actions. Each difference should have 'label', 'oldValue', and 'newValue' fields."),
  user: z.object({
    id: z.string().describe("The user's ID."),
    name: z.string().describe("The user's name."),
    email: z.string().describe("The user's email."),
  }).optional().describe('The user who performed the action.'),
});

const SortEventsInputSchema = z.object({
  events: z.array(SampleEventSchema),
});
export type SortEventsInput = z.infer<typeof SortEventsInputSchema>;


const SortEventsOutputSchema = z.object({
  events: z.array(SampleEventSchema),
});
export type SortEventsOutput = z.infer<typeof SortEventsOutputSchema>;

export async function sortEvents(input: SortEventsInput): Promise<SortEventsOutput> {
  return sortEventsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sortEventsPrompt',
  input: {schema: z.object({ jsonString: z.string() })},
  output: {schema: SortEventsOutputSchema},
  prompt: `You are an expert in business process analysis. Your task is to reorder a list of audit log events to reflect the logical business flow, rather than the raw timestamp order. Due to system latencies, events may be logged out of their true sequence.

The correct logical business flow is as follows:
1.  Trade Creation – A trade is created, often in a "Draft" status.
2.  Trade Confirmation – The trade is confirmed.
3.  Transport Creation – Transport is created in advance for allocation.
4.  Planning – This includes vessel planning and back-to-back planning.
5.  Inventory Build (Optional) – Inventory may be built and split.
6.  Trade Actualisation – A shipping document number is entered, and B/L level splitting can occur.
7.  Settlement – An invoice is generated.
8.  Invoice Screen – The final invoice is moved to the invoice screen.

Analyze the provided list of events. Pay close attention to the 'entity_name', 'action', and the details within the 'payload' and 'difference_list' to understand the relationships between events. Reorder the entire list of events to match the logical sequence described above. Return the full list of events in the correct logical order.

Events to sort:
{{{jsonString}}}
`,
});

const sortEventsFlow = ai.defineFlow(
  {
    name: 'sortEventsFlow',
    inputSchema: SortEventsInputSchema,
    outputSchema: SortEventsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt({ jsonString: JSON.stringify(input.events) });
    return output!;
  }
);
