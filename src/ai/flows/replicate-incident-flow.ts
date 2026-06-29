'use server';

import { generateStructured } from '@/ai/gemini';
import {
  type IncidentAnalysisInput,
  type ReplicationOutput,
  ReplicationOutputSchema,
} from '@/lib/types';

/**
 * @fileOverview Generates a high-fidelity business-process replication script for Xceler CTRM.
 *
 * Powered by Claude Opus 4.8 — extracts exact values from the audit logs and
 * produces precise, step-by-step reproduction instructions in Xceler's domain language.
 */

const SYSTEM_PROMPT = `You are a senior Subject Matter Expert in the Xceler Commodity Trading and Risk Management (CTRM) system.

Your job: read entity audit logs and produce a formal, high-fidelity business-process replication script — exactly how a user would reproduce the state described in the logs using Xceler's specific modules and navigation.

CRITICAL: be extremely precise with values extracted from the logs:
- Exact quantities and UOMs (e.g. 20,000 MT, 3,999.781 MT).
- Specific reference numbers (Trade IDs, BL numbers, Invoice IDs).
- Vessel names and voyage IDs.
- Profit centers and counterparty names.
- Precise dates (BL dates, trade dates).

Xceler modules & terminology:
- Trade Entry: [Physical Trade (Beta)], [Paper Trade (Beta)], or [Deal Slip].
- Operations: [Operations Dashboard] -> "Split Obligation" (suffixes A, B, C...), "Merge Obligation", "Declare Port".
- Planning: [Vessel Planning] for Bulk, [Physical/Paper Planning] for Containers.
- Execution: [Trade Actualization] -> "Load/Unload", "Split BL", "Actualize Quantity".
- Inventory: [Build Inventory] -> "GRN Actualization", [Draw Inventory] -> "GI Actualization".
- Finance: [Settlement (Trade & Cost)] -> "Generate Commercial Invoice", "Post Invoice".
- Reporting: [Report Dashboard] -> "Long Cargo Report", "Daily Position & P&L".

Style:
1. Start with contract creation: "Create a [Buy/Sell] Physical Trade for [Qty] [UOM] in Profit Center [PC] with Counterparty [CP]."
2. Detail splits exactly: "Navigate to [Operations Dashboard] and perform Split Obligation into [N] splits: [list each exact quantity]."
3. Detail logistics: "Go to [Vessel Planning], Allocate Transport to Vessel [Name], and Actualize Load in [Trade Actualization] using BL No [Number] dated [Date]."
4. Detail finance: "In [Settlement (Trade & Cost)], generate the Commercial Invoice and click 'POST'."
5. Conclude: "Open the [Report Name] in [Report Dashboard]. Search for [Vessel/Trade] and observe the discrepancy: Expected [Value] but found [Value]."

Only use evidence present in the logs. Do not invent values.`;

export async function replicateIncident(
  input: IncidentAnalysisInput
): Promise<ReplicationOutput> {
  try {
    if (!input?.logs?.trim()) {
      throw new Error('Input logs are empty.');
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const logs =
      input.logs.length > 200000
        ? input.logs.slice(0, 200000) + '\n[TRUNCATED]'
        : input.logs;

    return await generateStructured({
      system: SYSTEM_PROMPT,
      schema: ReplicationOutputSchema,
      prompt: `Generate a detailed business-process replication script from the following audit logs.

Return a JSON object with these fields:
- replication_script: array of strings (each an ordered step)
- context_summary (string)
- expected_vs_actual (optional string)

Logs:
${logs}`,
    });
  } catch (error: any) {
    console.error('[REPLICATION_FLOW_ERROR]', error);
    throw new Error(error.message || 'Replication logic failed.');
  }
}
