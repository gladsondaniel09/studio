'use server';

import { ai } from '@/ai/genkit';
import {
  type IncidentAnalysisInput,
  type ReplicationOutput,
  ReplicationOutputSchema,
} from '@/lib/types';

/**
 * @fileOverview A specialized flow to generate high-fidelity business process replication scripts for Xceler.
 * 
 * - replicateIncident - Generates a detailed step-by-step reproduction guide using Xceler CTRM domain language, 
 *   precise data extraction (quantities, IDs, names), and specific module navigation.
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

    const promptText = `You are a senior Subject Matter Expert in the Xceler Commodity Trading and Risk Management (CTRM) system.
Analyze the following audit logs and generate a formal, high-fidelity business process replication script.

CRITICAL REQUIREMENT: You MUST be extremely detailed with values. Extract and include:
- Exact Quantities and UOMs (e.g., 20,000 MT, 3,999.781 MT).
- Specific Reference Numbers (Trade IDs, BL Numbers, Invoice IDs).
- Vessel Names and Voyage IDs.
- Profit Centers and Counterparty Names.
- Precise Dates (BL Dates, Trade Dates).

Your goal is to describe exactly how a user would reproduce the state described in the logs using Xceler's specific modules and navigation as described in the system manual.

Xceler Modules & Terminology Mapping:
- Trade Entry: [Physical Trade (Beta)], [Paper Trade (Beta)], or [Deal Slip].
- Operations: [Operations Dashboard] -> "Split Obligation" (use suffixes A, B, C...), "Merge Obligation", "Declare Port".
- Planning: [Vessel Planning] for Bulk or [Physical/Paper Planning] for Containers.
- Execution: [Trade Actualization] -> "Load/Unload", "Split BL", "Actualize Quantity".
- Inventory: [Build Inventory] -> "GRN Actualization", [Draw Inventory] -> "GI Actualization".
- Finance: [Settlement (Trade & Cost)] -> "Generate Commercial Invoice", "Post Invoice".
- Reporting: [Report Dashboard] -> "Long Cargo Report", "Daily Position & P&L".

Strict Style Guidelines:
1. Start with contract creation: "Create a [Buy/Sell] Physical Trade for [Qty] [UOM] in Profit Center [PC] with Counterparty [CP]."
2. Detail splits exactly: "Navigate to [Operations Dashboard] and perform Split Obligation into [N] splits: [List each exact quantity]."
3. Detail logistics: "Go to [Vessel Planning], Allocate Transport to Vessel [Name], and Actualize Load in [Trade Actualization] using BL No [Number] dated [Date]."
4. Detail finance: "In [Settlement (Trade & Cost)], generate the Commercial Invoice and click 'POST'."
5. Conclusion: "Open the [Report Name] in [Report Dashboard]. Search for [Vessel/Trade] and observe the discrepancy: Expected [Value] but found [Value]."

Logs:
${logs}`;

    const response = await ai.generate({
      model: 'groq/llama-3.3-70b-versatile',
      prompt: promptText,
      config: {
        temperature: 0.1, // Minimal temperature for precise data extraction
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
