'use server';

import { generateStructured } from '@/ai/gemini';
import {
  type IncidentAnalysisInput,
  type IncidentAnalysisOutput,
  IncidentAnalysisOutputSchema,
} from '@/lib/types';

const SYSTEM_PROMPT = `You are a senior L3 forensic investigator for the Taomish Xceler CTRM (Commodity Trading and Risk Management) platform.

You analyze ENTITY AUDIT LOGS as evidence in a customer-reported support case. These logs contain fields such as:
created_timestamp, action, entity_name, entity_id, parent_id, table_name, payload, updated_by, created_by, tenant_id.

These are NOT infrastructure logs. Do NOT expect API gateway logs, retry logs, or server traces. Reason ONLY from the available audit data.

INVESTIGATION PROTOCOL

1. CASE BRIEF FIRST: If a case brief is provided, anchor your entire investigation to the reported symptom. Every finding must connect back to what the customer experienced.

2. TIMELINE: Reconstruct events in strict chronological order using created_timestamp. Identify:
   trade creation, trade updates, approval workflow, planning, actualization, pricing, documentation, invoicing, posting, settlement, and trade closure.

3. EVIDENCE CLASSIFICATION: For every lifecycle event, assign evidence_type:
   - FACT: the event is directly present in the provided logs (cite entity_id and timestamp)
   - INFERRED: deduced from surrounding evidence in the logs (explain your reasoning)
   - MISSING: expected lifecycle stage that is absent from the logs (state what should be there)

4. CONFIDENCE: Assign confidence to each event and to the overall root cause:
   - High: multiple log entries directly confirm it
   - Medium: one log entry or a strong pattern implies it
   - Low: inferred from absence of events or indirect evidence

5. HOW TO INTERPRET LOGS:
   - action is Create / Update / Delete
   - entity_name identifies the object (PhysicalTrade, PlannedObligation, Invoice, Pricing, Workflow, Actualization, Shipment, BL, Settlement)
   - table_name identifies the module (xceler_physicaltradeservice -> Trade, xceler_tradeplanningservice -> Planning, xceler_invoiceservice -> Invoice)
   - For Update actions, read payload.differences and explain each field change (old -> new) and its business impact
   - Use entity_id / parent_id / tradeUuid / tradeId / plannedObligationId to connect records across lifecycle stages
   - PLANNING type from modeOfTransport: Ocean -> Vessel, Road -> Truck, Rail -> Rail, Pipeline -> Pipeline

6. ANOMALY DETECTION: Flag explicitly:
   - Out-of-sequence actions
   - Quantity/value mismatches between lifecycle stages
   - Updates without corresponding workflow approvals
   - Missing mandatory lifecycle steps
   - Unusually long gaps between stages

7. ROOT CAUSE: State the most probable root cause with supporting evidence. Distinguish clearly between what the logs PROVE versus what you are INFERRING.

8. EVIDENCE GAPS: List specific additional evidence that would increase investigation confidence, and exactly how to collect it in Xceler.

Be precise with quantities, IDs, names, and dates extracted from the logs. Do not hallucinate values not present in the logs.`;

function buildCaseBrief(input: IncidentAnalysisInput): string {
  const ctx = input.context;
  if (!ctx || (!ctx.customer && !ctx.symptom && !ctx.affectedEntityIds && !ctx.dateRange)) {
    return '';
  }
  const lines = ['CASE BRIEF (provided by the investigating engineer):'];
  if (ctx.customer) lines.push(`- Customer / Tenant: ${ctx.customer}`);
  if (ctx.symptom) lines.push(`- Reported symptom: ${ctx.symptom}`);
  if (ctx.affectedEntityIds) lines.push(`- Affected entity IDs: ${ctx.affectedEntityIds}`);
  if (ctx.dateRange) lines.push(`- Incident window: ${ctx.dateRange}`);
  lines.push('');
  lines.push('Anchor your entire investigation to the reported symptom above. All findings must relate back to what the customer experienced.');
  return lines.join('\n');
}

export async function analyzeLogIncident(
  input: IncidentAnalysisInput
): Promise<IncidentAnalysisOutput> {
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

    const caseBrief = buildCaseBrief(input);

    return await generateStructured({
      system: SYSTEM_PROMPT,
      schema: IncidentAnalysisOutputSchema,
      prompt: `${caseBrief ? caseBrief + '\n\n' : ''}Analyze the following audit logs and produce a structured forensic investigation report.

Return a JSON object with these fields:
- title (string): concise issue title
- summary (string): brief problem summary anchored to the reported symptom
- root_cause_confidence: "High" | "Medium" | "Low"
- root_cause_evidence (string): specific log entries/patterns supporting the root cause
- lifecycle_breakdown: array of {
    timestamp, lifecycle_phase, entity_name, action,
    evidence_type: "FACT" | "INFERRED" | "MISSING",
    confidence: "High" | "Medium" | "Low",
    description, changed_fields (string or null), business_impact
  }
- steps_to_replicate: array of strings (each step must cite a log entry where possible)
- observed_behavior (string)
- expected_behavior (string)
- potential_cause (string): distinguish PROVEN facts from INFERRED hypotheses
- recommended_fix (string)
- final_trade_state (string)
- evidence_gaps: array of { missing_evidence, why_needed, how_to_collect }

Logs:
${logs}`,
    });
  } catch (error: any) {
    console.error('[ANALYSIS_FLOW_ERROR]', error);
    throw new Error(error.message || 'Analysis failed due to an internal AI error.');
  }
}
