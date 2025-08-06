
'use server';
/**
 * @fileOverview A flow for intelligently sorting audit log events based on business logic.
 *
 * - sortEvents - A function that reorders a list of audit events according to a defined business flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { SortEventsInput, SortEventsOutput } from '@/lib/types';

// The input to the flow will be the full event list
const SortEventsInputSchema = z.object({
  events: z.array(z.any()), // Keep it flexible for now
});


const SimplifiedEventSchema = z.object({
  id: z.number(),
  entity_name: z.string(),
  action: z.string(),
});

// The input to the prompt will be the simplified list
const PromptInputSchema = z.object({
  events: z.array(SimplifiedEventSchema),
});


// The output from the AI should be the sorted IDs
const SortEventsOutputSchema = z.object({
  sorted_ids: z.array(z.number()).describe('An array of the event IDs in their new logical order.'),
});
export { type SortEventsOutput };


export async function sortEvents(input: SortEventsInput): Promise<SortEventsOutput> {
  return sortEventsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sortEventsPrompt',
  input: {schema: PromptInputSchema},
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

You will be given a list of events, each with a unique 'id'. Analyze the provided list of events. Pay close attention to the 'entity_name' and 'action' to understand the relationships between events. 

Your task is to return a single array named 'sorted_ids' which contains the original 'id's of the events in the correct logical order. Do not return the full event objects, only the ordered array of their IDs.

Events to sort:
{{{jsonStringify events}}}
`,
});

const sortEventsFlow = ai.defineFlow(
  {
    name: 'sortEventsFlow',
    inputSchema: SortEventsInputSchema,
    outputSchema: SortEventsOutputSchema,
  },
  async (input) => {
    // Create the simplified list to send to the AI
    const simplifiedEvents = input.events.map((event, index) => ({
        id: index, // Use the original index as the unique ID
        entity_name: event.entity_name,
        action: event.action
    }));

    const {output} = await prompt({ events: simplifiedEvents });
    return output!;
  }
);
