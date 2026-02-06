'use server';

import { ai } from '@/ai/genkit';
import {
  type IncidentAnalysisInput,
  type ReplicationOutput,
  ReplicationOutputSchema,
} from '@/lib/types';

/**
 * @fileOverview A specialized flow to generate high-fidelity business process replication scripts.
 * 
 * - replicateIncident - Generates a detailed step-by-step reproduction guide in CTRM domain language.
 */

export async function replicateIncident(
  input: IncidentAnalysisInput
): Promise<ReplicationOutput> {
  try {
    if (!input?.logs?.trim()) {
      throw new Error('Input logs are empty.');
    }

    const logs =
      input.logs.length > 12000
        ? input.logs.slice(0, 12000) + '\n[TRUNCATED]'
        : input.logs;

    const promptText = `You are a senior Subject Matter Expert in Commodity Trading and Risk Management (CTRM) systems and Quality Assurance.
Analyze the following audit logs and generate a formal, high-fidelity business process replication script.

Your goal is to describe how a user would reproduce this specific state in the system using professional trading and logistics terminology.

Terminology to use:
- Purchase/Sales Contracts
- MT (Metric Tons)
- BL (Bill of Lading) Splits
- Allocation / Actualisation
- POSTing Invoices
- Inventory Blending (Simple/Partial)
- In-Transit movements
- Vessel VOY (Voyage) references
- Cargo Reports

The replication script should follow this style:
1. Create a [Contract Type] for [Quantity] MT.
2. Perform [Action] for [Entity]...
...
N. Check the [Report Name] for the vessel [Vessel Name].
N+1. Observe the discrepancy in [Field Name] (Expected: X MT vs Actual: Y MT).

Logs:
${logs}`;

    const response = await ai.generate({
      model: 'groq/llama-3.3-70b-versatile',
      prompt: promptText,
      config: {
        temperature: 0.2,
      },
      output: {
        format: 'json',
        schema: ReplicationOutputSchema,
      },
    });
    
    const output = response.output;
    if (!output) {
        throw new Error('The AI model did not return any replication content.');
    }
    
    return output;

  } catch (error: any) {
    console.error('[REPLICATION_FLOW_ERROR]', error);
    throw new Error(error.message || 'Replication logic failed.');
  }
}
