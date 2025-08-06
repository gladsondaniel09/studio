
'use server';
/**
 * @fileOverview A flow for intelligently sorting audit log events based on business logic.
 *
 * - sortEvents - A function that reorders a list of audit events according to a defined business flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { SampleEventSchema, SortEventsInput, SortEventsOutput } from '@/lib/types';

const SortEventsInputSchema = z.object({
  events: z.array(SampleEventSchema),
});


const SortEventsOutputSchema = z.object({
  events: z.array(SampleEventSchema),
});

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
