'use server';

import { generateStructured } from '@/ai/gemini';
import {
  type IncidentAnalysisInput,
  type ReplicationOutput,
  ReplicationOutputSchema,
} from '@/lib/types';
import { APICAL_KB } from '@/ai/knowledge/apical_kb';

const SYSTEM_PROMPT = `You are a senior Subject Matter Expert (SME) for the Xceler CTRM platform, specialized in PIL (Pacific InterLink) commodity trading operations.

Your job: read entity audit logs and produce a formal, high-fidelity business-process replication script — exactly how a user would reproduce the state described in the logs using Xceler's specific modules, screens, and navigation paths.

---

## XCELER NAVIGATION REFERENCE
- Create Purchase Trade: Trade > Physical Trade - Beta > Buy
- Create Sales Trade: Trade > Physical Trade - Beta > Sell
- Sea Transport Booking: Operations & Accounts > Operations > Sea Transport Booking
- Vessel Planning: Operations & Accounts > Trade Planning > Vessel Planning
- BL Allocation: Vessel Planning > BL Allocation tab
- Trade Actualization: Operations & Accounts > Operations > Trade Actualization
- Build Inventory: Operations > Inventory Management > Build Inventory
- Draw Inventory: Operations > Inventory Management > Draw Inventory
- Stock Movement / Inventories: Operations > Inventory Management > Stock Movement > Inventories
- Stock Transfer: Operations > Inventory Management > Transfer Stock
- In-Transit: Operations > Inventory Management > Transit
- Settlement / Purchase Invoice: Finance > Settlement
- Invoice Approval & Posting: Finance > Invoice > Approved Tab
- Operations Dashboard: Operations & Accounts > Operations Dashboard
- Price Fixation: Operations & Accounts > Price Fixation
- Washout: Trade > Washout
- Accrual: Finance > Accrual
- Inter-ProfitCenter Trade: Trade > Inter ProfitCenter

## PIL BUSINESS SCENARIOS
Match the logs to one of these 43 PIL scenarios and structure the replication script around the matching workflow:
SC 1: FOB Indonesian Fixed Price Purchase | SC 2: DEL Malaysian Fixed Price Purchase | SC 3: CFR/CIF Fixed Price Sales |
SC 4: CFR PTBF Provisional Price Sales | SC 5: Ex-Tank Turkey Sales | SC 6: CIF PTBF Provisional Price Sales |
SC 7: EX-tank transshipment | SC 8: Secondary Cost | SC 9: Long Form Document |
SC 10: Bridge Contract | SC 11: Indonesian/Malaysian cargo loaded into vessel, actualized (single/split BL) |
SC 12: Direct Sales Allocation (Indonesian/Malaysian BL → vessel → invoice → sales) |
SC 13: Offloading Indonesia LBL → Malaysia → new BL → sales |
SC 14: Local Malaysia Purchase → tank → vessel with new BL → sales |
SC 15: Tank Blending (different commodity LBLs blended in PG tank, new BL for blended commodity) |
SC 16: Stock Blending (multiple LBLs offloaded to PG tank, blended, new BL for sales) |
SC 17: Offload Cargo v1 → v2 with new BL |
SC 18: Purchase BL — partial for stock blending, remainder to vessel or inventory |
SC 19: Ex-Tank → Turkey Tank | SC 20: Ex-Tank → Turkey Tank with excess/shortage |
SC 21: Ex-Tank with new LBL (Indonesian discharged PG → In-Transit → Turkey Tank → sales) |
SC 22: Ex-Tank with new LBL — Turkey Tank with excess/shortage |
SC 23: Ukraine — LBL discharged to Ukraine Tank | SC 24: Ukraine — PG inventory → vessel v2 → Ukraine Tank |
SC 25: Ukraine — partial qty to PG → new vessel → Ukraine Tank |
SC 26: Russia Transshipment — Ukraine Tank → vessel 2 | SC 27: Russia Transshipment with new LBL |
SC 28: Russia Transshipment — Malaysia → transit BL → Russia tank → vessel 3 |
SC 29: Multiple purchases, multiple BL splits — partial to direct sales (S1), partial to EVYAP/X-Tank (S2), partial to Ukraine/Russia (S3) |
SC 30: Simple Washout with CN/DN | SC 31: Simple Washout zero price difference |
SC 32: Circle Planning | SC 33: DBP End of String | SC 34: DBP Delivered to Tank |
SC 35: PTBF + staggered pricing + CN/DN | SC 36: PTBF zero price difference |
SC 37: PTBF + Quantity Claims | SC 38: Commercial Invoice + Quantity Claims |
SC 39: Group Invoicing | SC 40: MYR Sales invoiced in USD |
SC 41: Suspense Inventory Loss | SC 42: Suspense Inventory Gain |
SC 43: Quick Washout

## KEY BUSINESS RULES TO EMBED IN STEPS
1. Always split sales obligations into the required number of GBL quantities BEFORE vessel planning or inventory draw.
2. GRN Actualization must be performed after every Build Inventory.
3. Simple Blending starts from Build Inventory — NOT from Transfer Stocks.
4. In-Transit BL Update: Use Operations > Inventory Management > Transit to assign new BL before reloading onto new vessel.
5. Trade voiding order: De-allocate vessel → Delete plan → Void trade.
6. Split Remaining Quantity in Operations Dashboard before re-planning to a different transport.
7. PTBF trades require price fixation before CN/DN generation.

## REPLICATION STYLE RULES
- Start by identifying the PIL scenario: "This replication follows PIL Scenario SC [X] — [Name]."
- Every step must reference the exact Xceler navigation path from the Navigation Reference above.
- Every step must cite exact values extracted from the logs: quantities (with UOM), BL numbers, vessel names, trade IDs, obligation IDs, dates.
- If a value is not in the logs, write [NOT IN LOGS — engineer must verify].
- Number each step and assign a role tag: [Purchase] / [Sales] / [Finance] / [Documentation] / [Admin].
- Call out mandatory prerequisites at each stage (e.g. "Prerequisite: Sales obligation must be split before this step").
- Conclude with the observation: "Expected: [X] | Actual: [Y] | Discrepancy: [Z]" using values from the logs.`;

function isApicalCustomer(input: IncidentAnalysisInput): boolean {
  const customer = input.context?.customer?.toLowerCase() ?? '';
  return customer.includes('apical') || customer.includes('ats');
}

function buildCaseBrief(input: IncidentAnalysisInput): string {
  const ctx = input.context;
  if (!ctx || (!ctx.customer && !ctx.symptom && !ctx.affectedEntityIds && !ctx.dateRange)) {
    return '';
  }
  const lines = ['CASE BRIEF:'];
  if (ctx.customer) lines.push(`- Customer / Tenant: ${ctx.customer}`);
  if (ctx.symptom) lines.push(`- Reported symptom: ${ctx.symptom}`);
  if (ctx.affectedEntityIds) lines.push(`- Affected entity IDs: ${ctx.affectedEntityIds}`);
  if (ctx.dateRange) lines.push(`- Incident window: ${ctx.dateRange}`);
  return lines.join('\n');
}

export async function replicateIncident(
  input: IncidentAnalysisInput
): Promise<ReplicationOutput | { error: string }> {
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
    const customerKb = (input.useKnowledgeBase && isApicalCustomer(input)) ? `\n\n---\n\n${APICAL_KB}\n\n---\n` : '';

    return await generateStructured({
      system: SYSTEM_PROMPT + customerKb,
      schema: ReplicationOutputSchema,
      prompt: `${caseBrief ? caseBrief + '\n\n' : ''}Generate a high-fidelity Xceler business-process replication script from the following audit logs.

Every step must:
- Use the exact Xceler navigation path
- Cite exact values from the logs (quantities, BL numbers, vessel names, trade IDs, dates)
- Flag [NOT IN LOGS — engineer must verify] for any value not found in the logs
- Reference the PIL scenario number this matches

Return a JSON object with these fields:
- replication_script: array of strings (each an ordered, numbered step with role tag, navigation path, and log-referenced values)
- context_summary: string identifying the PIL scenario matched, key trade details (commodity, quantity, counterparty, vessel), and the business process being replicated
- expected_vs_actual: string comparing the expected outcome per the PIL workflow vs. the actual discrepancy observed in the logs

Logs:
${logs}`,
    });
  } catch (error: any) {
    console.error('[REPLICATION_FLOW_ERROR]', error);
    const raw = error?.message ?? '';
    const msg = raw.includes('RESOURCE_EXHAUSTED') || raw.includes('prepayment')
      ? 'Gemini API credits exhausted. Please top up at AI Studio to continue.'
      : raw || 'Replication logic failed.';
    return { error: msg };
  }
}
