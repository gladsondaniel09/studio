'use server';

import { ai } from '@/ai/genkit';
import {
  type IncidentAnalysisInput,
  type IncidentAnalysisOutput,
  IncidentAnalysisOutputSchema,
} from '@/lib/types';

/**
 * @fileOverview A forensic flow to analyze Taomish Xceler CTRM audit logs and reconstruct the trade lifecycle.
 * 
 * - analyzeLogIncident - Reconstructs the complete trade lifecycle in chronological order using forensic analysis.
 */

export async function analyzeLogIncident(
  input: IncidentAnalysisInput
): Promise<IncidentAnalysisOutput> {
  try {
    if (!input?.logs?.trim()) {
      throw new Error('Input logs are empty.');
    }

    // Limit log size to prevent token limit issues
    const logs =
      input.logs.length > 20000
        ? input.logs.slice(0, 20000) + '\n[TRUNCATED]'
        : input.logs;

    const promptText = `
You are a senior forensic analyst for Taomish Xceler CTRM platform.

You are analyzing ENTITY AUDIT LOGS.

These logs typically contain:

- created_timestamp
- action
- entity_name
- entity_id
- parent_id
- table_name
- payload
- updated_by
- created_by
- tenant_id

IMPORTANT:
These are NOT infrastructure logs.

Do NOT expect:
- API gateway logs
- retry logs
- correlation traces
- server logs
- microservice debug logs

Focus ONLY on available audit data.

==================================================
PRIMARY OBJECTIVE
==================================================

Reconstruct the COMPLETE trade lifecycle in chronological order.

Identify:

1. Trade creation
2. Trade updates
3. Approval workflow creation/update
4. Planning creation
5. Planning updates
6. Actualization events
7. Pricing events
8. Documentation events
9. Invoice events
10. Posting events
11. Settlement events
12. Trade closure events

==================================================
HOW TO INTERPRET LOGS
==================================================

Use:

created_timestamp → event sequence

action:
- Create
- Update
- Delete

entity_name:
Examples:
- PhysicalTrade
- PlannedObligation
- Invoice
- Pricing
- Workflow
- Actualization
- Shipment
- BL
- Settlement

table_name:
Use this to identify service/module

Examples:
xceler_physicaltradeservice → Trade module
xceler_tradeplanningservice → Planning module
xceler_invoiceservice → Invoice module

==================================================
TRADE CREATION ANALYSIS
==================================================

If entity_name = PhysicalTrade

Extract:

- tradeId
- quantity
- commodity
- tradeType
- priceType
- tradePrice
- incoterm
- counterparty
- delivery schedule
- modeOfTransport
- tradeApprovalStatus
- tradeTransactionType

Identify initial trade creation details.

==================================================
TRADE UPDATE ANALYSIS
==================================================

If action = Update:

Read payload.differences

For every difference:

Extract:

- field changed
- old value
- new value

Example:

delivery date changed
quantity changed
pricing changed
status changed

Clearly explain business impact.

==================================================
PLANNING ANALYSIS
==================================================

If entity_name = PlannedObligation

Identify:

- planned obligation creation
- planning updates
- planning cancellations

Determine planning type using:

modeOfTransport:
- Ocean → Vessel Planning
- Road → Truck Planning
- Rail → Rail Planning
- Pipeline → Pipeline Planning
- Container → Container Planning

Extract:

- planned quantity
- shipment month
- balance quantity
- planned obligation status

==================================================
ACTUALIZATION ANALYSIS
==================================================

Identify:

- BL creation
- actual quantity updates
- shipment completion
- discharge completion

Extract:

- BL number
- BL date
- actual quantity

==================================================
PRICING ANALYSIS
==================================================

Identify:

- price fixation
- provisional pricing
- final pricing
- pricing updates

==================================================
INVOICE ANALYSIS
==================================================

Identify:

- invoice creation
- invoice regeneration
- invoice posting
- duplicate invoices

==================================================
SETTLEMENT / POSTING ANALYSIS
==================================================

Identify:

- settlement creation
- posting completion
- financial closure

==================================================
MISSING EVENT DETECTION
==================================================

If expected lifecycle stages are missing:

Example:

Trade created
→ Planning created
→ BUT no invoice found

Output:

EXPECTED EVENT MISSING: Invoice creation not found

==================================================
PARENT CHILD RELATIONSHIP ANALYSIS
==================================================

Use:

entity_id
parent_id
tradeUuid
tradeId
plannedObligationId

to connect records across lifecycle stages.

==================================================
FINAL OUTPUT FORMAT
==================================================

Return JSON:

title

summary

lifecycle_breakdown:
[
 {
   timestamp,
   lifecycle_phase,
   entity_name,
   action,
   description,
   changed_fields,
   business_impact
 }
]

steps_to_replicate

observed_behavior

expected_behavior

potential_cause

recommended_fix

final_trade_state

==================================================
CRITICAL RULE
==================================================

Do NOT hallucinate missing system logs.

Only use actual audit log evidence.

Logs:
${logs}`;

    const response = await ai.generate({
      model: 'groq/llama-3.3-70b-versatile',
      prompt: promptText,
      config: {
        temperature: 0.1, // High precision
      },
      output: {
        format: 'json',
        schema: IncidentAnalysisOutputSchema,
      },
    });
    
    const output = response.output;
    if (!output) {
        throw new Error('The AI model did not return any content.');
    }
    
    return output;

  } catch (error: any) {
    console.error('[ANALYSIS_FLOW_ERROR]', error);
    throw new Error(error.message || 'Analysis failed due to an internal AI error.');
  }
}
