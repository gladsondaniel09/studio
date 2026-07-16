'use server';

import { generateStructured } from '@/ai/groq';
import {
  type IncidentAnalysisInput,
  type ReplicationOutput,
  ReplicationOutputSchema,
} from '@/lib/types';
import { APICAL_KB } from '@/ai/knowledge/apical_kb';
import { PIL_KB } from '@/ai/knowledge/pil_kb';

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

## REPLICATION STYLE RULES
- Start by identifying the PIL scenario: "This replication follows PIL Scenario SC [X] — [Name]."
- Every step must reference the exact Xceler navigation path from the Navigation Reference above.
- Every step must cite exact values extracted from the logs: quantities (with UOM), BL numbers, vessel names, trade IDs, obligation IDs, dates.
- If a value is not in the logs, write [NOT IN LOGS — engineer must verify].
- Number each step and assign a role tag: [Purchase] / [Sales] / [Finance] / [Documentation] / [Admin].
- Call out mandatory prerequisites at each stage (e.g. "Prerequisite: Sales obligation must be split before this step").
- Conclude with the observation: "Expected: [X] | Actual: [Y] | Discrepancy: [Z]" using values from the logs.`;

function buildCaseBrief(input: IncidentAnalysisInput): string {
  const ctx = input.context;
  if (!ctx || (!ctx.customer && !ctx.ticketId && !ctx.symptom && !ctx.affectedEntityIds && !ctx.dateRange)) {
    return '';
  }
  const lines = ['CASE BRIEF:'];
  if (ctx.customer) lines.push(`- Customer / Tenant: ${ctx.customer}`);
  if (ctx.ticketId) lines.push(`- Ticket ID: ${ctx.ticketId}`);
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

    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured on the server.');
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
    const msg = error?.status === 429 || raw.includes('rate_limit') || raw.includes('quota')
      ? 'Groq API rate limit or quota exceeded. Please check your Groq Console usage/limits and try again.'
      : raw || 'Replication logic failed.';
    return { error: msg };
  }
}
