'use server';

/**
 * @fileOverview An AI agent that parses Firebase Studio audit data and organizes key metrics.
 *
 * - organizeMetrics - A function that organizes the extracted key metrics from the Firebase Studio audit data.
 * - OrganizeMetricsInput - The input type for the organizeMetrics function.
 * - OrganizeMetricsOutput - The return type for the organizeMetrics function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OrganizeMetricsInputSchema = z.object({
  auditData: z
    .string()
    .describe('The Firebase Studio audit data to be organized.'),
});
export type OrganizeMetricsInput = z.infer<typeof OrganizeMetricsInputSchema>;

const OrganizeMetricsOutputSchema = z.object({
  structuredData: z
    .string()
    .describe('The structured audit data with key performance indicators.'),
});
export type OrganizeMetricsOutput = z.infer<typeof OrganizeMetricsOutputSchema>;

export async function organizeMetrics(input: OrganizeMetricsInput): Promise<OrganizeMetricsOutput> {
  return organizeMetricsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'organizeMetricsPrompt',
  input: {schema: OrganizeMetricsInputSchema},
  output: {schema: OrganizeMetricsOutputSchema},
  prompt: `You are an AI expert in parsing Firebase Studio audit data and organizing key metrics into structured data.

  Parse the following Firebase Studio audit data and organize the extracted key metrics into a structured format that is easily viewable and understandable.
  The structured data should include key performance indicators (KPIs) and any other relevant information.

  Audit Data: {{{auditData}}}

  Return the structured data as a string.
  `,
});

const organizeMetricsFlow = ai.defineFlow(
  {
    name: 'organizeMetricsFlow',
    inputSchema: OrganizeMetricsInputSchema,
    outputSchema: OrganizeMetricsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
