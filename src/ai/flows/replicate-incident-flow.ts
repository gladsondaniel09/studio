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
 * - replicateIncident - Generates a detailed step-by-step reproduction guide using Xceler CTRM domain language and module references.
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
Analyze the following audit logs and generate a formal, high-fidelity business process replication script tailored for the Xceler platform.

Your goal is to describe exactly how a user would reproduce the state described in the logs using Xceler's specific modules, navigation, and professional terminology as defined in the system manual.

Xceler Modules & Terminology to use:
- Business Master: Company, Profit Center, Counterparty, Commodity, Vessel Master, Grade Master.
- Trade Creation: Physical Trade (Beta), Paper Trade (Beta), Deal Slip, Inter-ProfitCenter, Inter-Company, Future Trade, FX Trade.
- Operations Dashboard: Split Obligation, Merge Obligation, Declare Port, Quick Washout, Add Shipping Details.
- Planning & Matching: Back-to-Back (Physical/Paper Planning), Vessel Planning (Bulk), Washout Plan, Doc Bypass (String/Beginning/End).
- Actualization: Trade Actualization, Load/Unload, Split BL, Quality Claims, Quantity Claims, De-actualize.
- Inventory Management: Build Inventory (GRN Actualization), Transfer Stock (Write-On/Off), Draw Inventory (GI/Goods Issue), Blending, Suspense Inventory.
- Finance & Settlement: Settlement (Trade & Cost), Commercial Invoice, Staggered Pricing, Outturn/Final Invoice, Post/Un-post Invoice, e-Invoice Hub.
- Reporting: Report Dashboard, Risk Dashboard, EOD Dashboard.

Specific Actions:
- "Send for Approval" (Confirming Trades/Terms).
- "Amend Trade" / "Unconfirm Trade".
- "Allocate Transport" (Vessel/Road).
- "POST" (Finalizing Invoices to SAP/ERP).
- "Actualize Quantity" (GRN for Build, GI for Draw).

The replication script should follow this strict style:
1. Create a [Contract Type] in [Physical Trade Beta] for [Quantity] [UOM].
2. Confirm the trade and "Send for Approval".
3. Navigate to [Operations Dashboard] and "Split Obligation" into [Details].
4. Go to [Vessel Planning], "Create Plan", and "Allocate Transport" using Vessel [Name].
5. Actualize the Load Quantity in [Trade Actualization] with BL No [Number].
6. Generate a [Invoice Type] in [Settlement (Trade & Cost)] and "POST" the invoice.
...
N. Open the [Report Name] in [Report Dashboard].
N+1. Observe the discrepancy: Expected [Field] to be [Value] but system shows [Value].

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
