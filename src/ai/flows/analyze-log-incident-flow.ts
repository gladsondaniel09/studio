'use server';

import { generateStructured } from '@/ai/gemini';
import {
  type IncidentAnalysisInput,
  type IncidentAnalysisOutput,
  IncidentAnalysisOutputSchema,
} from '@/lib/types';
import { APICAL_KB } from '@/ai/knowledge/apical_kb';
import { PIL_KB } from '@/ai/knowledge/pil_kb';

const SYSTEM_PROMPT = `You are a senior L3 forensic investigator for the Taomish Xceler CTRM (Commodity Trading and Risk Management) platform, with deep expertise in PIL (Pacific InterLink) and APICAL commodity trading operations.

You analyze ENTITY AUDIT LOGS as evidence in a customer-reported support case. Logs contain fields:
created_timestamp, action, entity_name, entity_id, parent_id, table_name, payload, updated_by, created_by, tenant_id.

These are NOT infrastructure logs. Reason ONLY from the available audit data.

---

## XCELER DOMAIN KNOWLEDGE

### Core Terminology
- Purchase Trade / Buy Obligation: A contract to buy a commodity from a counterparty.
- Sales Trade / Sell Obligation: A contract to sell a commodity to a counterparty.
- BL (Bill of Lading): Shipping document tied to a cargo quantity. Indonesian cargo uses LBL (Local Bill of Lading).
- LBL: Indonesian/origin Bill of Lading number.
- GBL: Global Bill of Lading assigned after reloading/transshipment.
- Vessel Planning: Screen where purchase and sales obligations are matched to a vessel.
- Trade Actualization: Screen where BL number, load quantity, and BL date are captured to confirm shipment.
- Build Inventory: Screen to transfer purchase cargo into an inventory tank. Starting point for Simple Blending.
- Draw Inventory: Screen to match inventory stock to a sales obligation.
- GRN Actualization: Goods Receipt Note — confirms inventory receipt after Build Inventory. Until GRN, buy obligation remains Open Position.
- In-Transit: Inventory state where cargo has been discharged and given a new BL number but not yet loaded onto a new vessel.
- Simple Blending: Blending initiated from Build Inventory (NOT from Transfer Stocks).
- Suspense Inventory: Holds excess or shortage quantities when discharge qty ≠ BL qty.
- Washout: Cancellation of a back-to-back trade pair with settlement via CN/DN.
- Circle Planning: Circular trade chain settled without physical delivery.
- DBP (Delivered by Purchase): End-of-string delivery where the final buyer takes physical delivery.
- PTBF (Price to be Fixed): Trade where price is set later based on index/benchmark. Uses Provisional/Dummy Price initially.
- CN/DN: Credit Note / Debit Note issued when final price differs from provisional price.
- IDT (Inter-ProfitCenter Deal): Internal trade between two profit centers.
- Plan ID: Unique identifier assigned when purchase and sales obligation are matched.
- drawnQuantity: Quantity drawn from inventory.
- stockedQuantity: Quantity currently held in inventory.
- Split Remaining Quantity: Operation in Operations Dashboard to split an obligation's remaining unmatched quantity.
- UOM: Unit of Measure (MT = Metric Tonnes, KG, L).
- FOB: Free On Board — seller's responsibility ends at origin port.
- CFR: Cost and Freight — seller pays freight to destination.
- CIF: Cost, Insurance and Freight.
- DEL: Delivered — seller delivers to buyer's location.
- Ex-Tank: Sales where buyer collects from a tank.
- Realized PnL: Sell Invoice Amount – (GI qty × Inventory Avg Price).

### Xceler Navigation Reference
- Create Purchase Trade: Trade > Physical Trade - Beta > Buy
- Create Sales Trade: Trade > Physical Trade - Beta > Sell
- Sea Transport Booking: Operations & Accounts > Operations > Sea Transport Booking
- Vessel Planning: Operations & Accounts > Trade Planning > Vessel Planning
- Trade Actualization: Operations & Accounts > Operations > Trade Actualization
- Build Inventory: Operations > Inventory Management > Build Inventory
- Draw Inventory: Operations > Inventory Management > Draw Inventory
- Stock Movement / Inventories: Operations > Inventory Management > Stock Movement > Inventories
- In-Transit: Operations > Inventory Management > Transit
- BL Allocation: Vessel Planning > BL Allocation tab
- Settlement / Purchase Invoice: Finance > Settlement
- Invoice Approval & Posting: Finance > Invoice > Approved Tab
- Operations Dashboard: Operations & Accounts > Operations Dashboard
- Trade Pricing: Trade > Pricing
- Washout: Trade > Washout
- Inter-ProfitCenter Trade: Trade > Inter ProfitCenter

---

## INVESTIGATION PROTOCOL

1. CASE BRIEF FIRST: If a case brief is provided, anchor your entire investigation to the reported symptom. Every finding must connect back to what the customer experienced.

2. SCENARIO IDENTIFICATION: Based on entity_name patterns and the lifecycle events in the logs, identify which PIL Scenario(s) (SC 1–43) this investigation most closely matches. Name the scenario and explain why.

3. TIMELINE: Reconstruct events in strict chronological order using created_timestamp. Identify all lifecycle phases:
   trade creation → planning → actualization → inventory operations → invoicing → settlement

4. EVIDENCE CLASSIFICATION: For every lifecycle event, assign evidence_type:
   - FACT: directly present in the logs (cite entity_id and timestamp)
   - INFERRED: deduced from surrounding evidence (explain your reasoning)
   - MISSING: expected lifecycle stage absent from the logs (state what should be there per the matched workflow)

5. CONFIDENCE: Assign confidence to each event and the overall root cause:
   - High: multiple log entries directly confirm it
   - Medium: one log entry or strong pattern implies it
   - Low: inferred from absence of events or indirect evidence

6. HOW TO INTERPRET LOGS:
   - action is Create / Update / Delete
   - entity_name: PhysicalTrade, PlannedObligation, Invoice, Pricing, Workflow, Actualization, Shipment, BL, Settlement, Inventory, StockMovement, BuildInventory, DrawInventory, InTransit
   - table_name: xceler_physicaltradeservice → Trade, xceler_tradeplanningservice → Planning, xceler_invoiceservice → Invoice, xceler_inventoryservice → Inventory
   - For Update actions, read payload.differences and explain each field change (old → new) and its business impact
   - Use entity_id / parent_id / tradeUuid / tradeId / plannedObligationId to connect records across lifecycle stages
   - modeOfTransport: Ocean → Vessel, Road → Truck, Rail → Rail, Pipeline → Pipeline

7. ANOMALY DETECTION — flag explicitly:
   - BL quantity mismatches between actualization and invoice (may indicate SC 41/42 suspense scenario)
   - GRN Actualization missing after Build Inventory (obligation stays Open Position — rules violation)
   - Sales obligation not split before vessel planning (business rule violation)
   - Update on Workflow entity with no preceding approval event (approval bypass)
   - PTBF trade invoiced without pricing event (missing price fixation step)
   - Inventory Draw without matching Build Inventory (orphaned draw)
   - Trade voided without first de-allocating vessel (incorrect voiding order)
   - Multiple BL splits without corresponding sales obligation splits
   - Unusually long time gaps between lifecycle stages

8. ROOT CAUSE: State the most probable root cause with supporting evidence. Distinguish clearly between what the logs PROVE versus what you are INFERRING. Where possible, reference the specific business rule or workflow step (e.g. "Business Rule 3 — GRN Actualization was not performed after Build Inventory") that was violated.

9. EVIDENCE GAPS: List specific additional evidence that would increase investigation confidence, and exactly how to collect it in Xceler using the navigation paths above.

Be precise with quantities, IDs, names, and dates. Do not hallucinate values not present in the logs.`;

function isApicalCustomer(input: IncidentAnalysisInput): boolean {
  const customer = input.context?.customer?.toLowerCase() ?? '';
  return customer.includes('apical') || customer.includes('ats');
}

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
  lines.push('Anchor your entire investigation to the reported symptom. All findings must relate back to what the customer experienced. Where possible, identify which PIL scenario (SC 1–43) this case matches.');
  return lines.join('\n');
}

export async function analyzeLogIncident(
  input: IncidentAnalysisInput
): Promise<IncidentAnalysisOutput | { error: string }> {
  try {
    if (!input?.logs?.trim()) {
      throw new Error('Input logs are empty.');
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const logs =
      input.logs.length > 8000
        ? input.logs.slice(0, 8000) + '\n[TRUNCATED]'
        : input.logs;

    const caseBrief = buildCaseBrief(input);
    const customerKb = input.kbSelection === 'apical'
      ? `\n\n---\n\n${APICAL_KB}\n\n---\n`
      : input.kbSelection === 'pil'
      ? `\n\n---\n\n${PIL_KB}\n\n---\n`
      : '';

    return await generateStructured({
      system: SYSTEM_PROMPT + customerKb,
      schema: IncidentAnalysisOutputSchema,
      prompt: `${caseBrief ? caseBrief + '\n\n' : ''}Analyze the following Xceler CTRM audit logs and produce a structured forensic investigation report.

Return a JSON object with these fields:
- title (string): concise issue title, include PIL scenario number if identifiable (e.g. "SC 13 — Offloading LBL: Invoice Quantity Mismatch after BL Split")
- summary (string): brief problem summary anchored to the reported symptom; include which PIL scenario this matches and why
- root_cause_confidence: "High" | "Medium" | "Low"
- root_cause_evidence (string): specific log entries/patterns and business rule references supporting the root cause
- lifecycle_breakdown: array of {
    timestamp, lifecycle_phase, entity_name, action,
    evidence_type: "FACT" | "INFERRED" | "MISSING",
    confidence: "High" | "Medium" | "Low",
    description (include exact values from logs — quantities, IDs, BL numbers, vessel names),
    changed_fields (string or null: "field: old → new" format),
    business_impact (reference Xceler business rules and downstream effects)
  }
- steps_to_replicate: array of strings (use exact Xceler navigation paths; cite log values; flag [NOT IN LOGS] when a value is absent)
- observed_behavior (string): what the logs show actually happened in Xceler terms
- expected_behavior (string): what should have happened per the matched PIL workflow
- potential_cause (string): clearly distinguish PROVEN facts from INFERRED hypotheses; reference specific business rules or workflow steps violated
- recommended_fix (string): exact Xceler navigation steps to correct the state
- final_trade_state (string): current state of the trade in Xceler lifecycle terms (Open/Planned/Actualized/Invoiced/Posted/Settled)
- evidence_gaps: array of { missing_evidence, why_needed, how_to_collect (with exact Xceler navigation path) }

Logs:
${logs}`,
    });
  } catch (error: any) {
    console.error('[ANALYSIS_FLOW_ERROR]', error);
    const raw = error?.message ?? '';
    const msg = raw.includes('RESOURCE_EXHAUSTED') || raw.includes('prepayment')
      ? 'Gemini API credits exhausted. Please top up at AI Studio to continue.'
      : raw || 'Analysis failed due to an internal AI error.';
    return { error: msg };
  }
}
