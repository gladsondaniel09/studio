'use server';

/**
 * @fileOverview This file contains the Genkit flow for summarizing Firebase Studio audit data and providing actionable insights.
 *
 * - auditSummary - A function that takes a Firebase Studio audit link and returns a summary of actionable insights.
 * - AuditSummaryInput - The input type for the auditSummary function (the audit link).
 * - AuditSummaryOutput - The return type for the auditSummary function (the summary of insights).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AuditSummaryInputSchema = z.object({
  auditLink: z.string().describe('The link to the Firebase Studio audit.'),
});
export type AuditSummaryInput = z.infer<typeof AuditSummaryInputSchema>;

const AuditSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of actionable insights from the audit data.'),
});
export type AuditSummaryOutput = z.infer<typeof AuditSummaryOutputSchema>;

export async function auditSummary(input: AuditSummaryInput): Promise<AuditSummaryOutput> {
  return auditSummaryFlow(input);
}

const auditSummaryPrompt = ai.definePrompt({
  name: 'auditSummaryPrompt',
  input: {schema: AuditSummaryInputSchema},
  output: {schema: AuditSummaryOutputSchema},
  prompt: `You are an AI expert in Firebase Studio audits.
  Your task is to analyze the data from a Firebase Studio audit provided via a link and summarize the key areas for improvement.
  Provide actionable insights and recommendations in a concise format.

  Audit Link: {{{auditLink}}}
  `,
});

const auditSummaryFlow = ai.defineFlow(
  {
    name: 'auditSummaryFlow',
    inputSchema: AuditSummaryInputSchema,
    outputSchema: AuditSummaryOutputSchema,
  },
  async input => {
    const {output} = await auditSummaryPrompt(input);
    return output!;
  }
);
