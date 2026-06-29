'use server';

import { generateStructured } from '@/ai/anthropic';
import {
  type IncidentAnalysisInput,
  type IncidentAnalysisOutput,
  IncidentAnalysisOutputSchema,
} from '@/lib/types';

/**
 * @fileOverview A forensic flow to analyze Taomish Xceler CTRM audit logs and reconstruct the trade lifecycle.
 *
 * Powered by Claude Opus 4.8 with adaptive thinking — the model reasons through the
 * full chronological trade lifecycle before producing the structured report.
 */

const SYSTEM_PROMPT = `You are a senior forensic analyst for the Taomish Xceler CTRM (Commodity Trading and Risk Management) platform.

You analyze ENTITY AUDIT LOGS only. These logs contain fields such as:
created_timestamp, action, entity_name, entity_id, parent_id, table_name, payload, updated_by, created_by, tenant_id.

These are NOT infrastructure logs. Do NOT expect API gateway logs, retry logs, correlation traces, server logs, or microservice debug logs. Reason ONLY from the available audit data and never invent system logs that are not present.

PRIMARY OBJECTIVE
Reconstruct the COMPLETE trade lifecycle in strict chronological order. Identify, where present:
trade creation, trade updates, approval workflow creation/update, planning creation/updates, actualization events, pricing events, documentation events, invoice events, posting events, settlement events, and trade closure.

HOW TO INTERPRET LOGS
- created_timestamp drives event sequence.
- action is Create / Update / Delete.
- entity_name identifies the object (PhysicalTrade, PlannedObligation, Invoice, Pricing, Workflow, Actualization, Shipment, BL, Settlement, ...).
- table_name identifies the service/module (e.g. xceler_physicaltradeservice -> Trade module, xceler_tradeplanningservice -> Planning module, xceler_invoiceservice -> Invoice module).
- For Update actions, read payload.differences and explain each field change (old -> new) and its business impact.
- Use entity_id / parent_id / tradeUuid / tradeId / plannedObligationId to connect records across lifecycle stages.

PLANNING: determine planning type from modeOfTransport (Ocean -> Vessel, Road -> Truck, Rail -> Rail, Pipeline -> Pipeline, Container -> Container).

MISSING EVENT DETECTION: if an expected lifecycle stage is absent (e.g. trade and planning exist but no invoice), explicitly call it out as an expected-but-missing event.

Explain the business impact of each event in clear, domain-accurate language. Be precise with quantities, IDs, names, and dates extracted from the logs. Do not hallucinate.`;

export async function analyzeLogIncident(
  input: IncidentAnalysisInput
): Promise<IncidentAnalysisOutput> {
  try {
    if (!input?.logs?.trim()) {
      throw new Error('Input logs are empty.');
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured on the server.');
    }

    // Bound the input so we stay well within the context window.
    const logs =
      input.logs.length > 200000
        ? input.logs.slice(0, 200000) + '\n[TRUNCATED]'
        : input.logs;

    return await generateStructured({
      system: SYSTEM_PROMPT,
      schema: IncidentAnalysisOutputSchema,
      prompt: `Analyze the following audit logs and reconstruct the full trade lifecycle.

Return a JSON object with these fields:
- title (string)
- summary (string)
- lifecycle_breakdown: array of { timestamp, lifecycle_phase, entity_name, action, description, changed_fields (optional string), business_impact }
- steps_to_replicate: array of strings
- observed_behavior (string)
- expected_behavior (string)
- potential_cause (string)
- recommended_fix (string)
- final_trade_state (string)

Logs:
${logs}`,
    });
  } catch (error: any) {
    console.error('[ANALYSIS_FLOW_ERROR]', error);
    throw new Error(error.message || 'Analysis failed due to an internal AI error.');
  }
}
