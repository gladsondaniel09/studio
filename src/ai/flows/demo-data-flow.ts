
'use server';
/**
 * @fileOverview A flow for generating sample audit log data for the demo.
 *
 * - generateDemoData - A function that generates a list of sample audit events.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { DemoDataOutput, SampleEventSchema } from '@/lib/types';


const DemoDataOutputSchema = z.object({
  events: z.array(SampleEventSchema),
});

export async function generateDemoData(): Promise<DemoDataOutput> {
  return generateDemoDataFlow();
}

const prompt = ai.definePrompt({
  name: 'generateDemoDataPrompt',
  output: {schema: DemoDataOutputSchema},
  prompt: `You are an expert in generating realistic sample data for an audit log viewer application.

  Generate a diverse list of 15 sample audit log events. Ensure the events cover all action types: 'create', 'update', and 'delete'.
  
  For 'create' actions, the 'payload' should contain the newly created object as a JSON string. 'difference_list' should be omitted.
  For 'update' actions, the 'difference_list' should contain a JSON string of an array of changes, where each change object has a 'label', 'oldValue', and 'newValue'. The 'payload' should be omitted. Make sure to include changes with different data types (strings, numbers, booleans).
  For 'delete' actions, the 'payload' should contain the deleted object as a JSON string. 'difference_list' should be omitted.

  Populate the 'user' object with realistic-looking fake user data.
  Make the 'entity_name' varied, for example 'Trade', 'Counterparty', 'Limit', 'User'.
  The 'created_timestamp' should be recent and varied.
  The 'action' MUST be one of 'create', 'update', or 'delete' in all lowercase.`,
});

const generateDemoDataFlow = ai.defineFlow(
  {
    name: 'generateDemoDataFlow',
    outputSchema: DemoDataOutputSchema,
  },
  async () => {
    const {output} = await prompt();
    return output!;
  }
);
