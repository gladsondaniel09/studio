import { z } from 'zod';

// This schema is preserved for backward compatibility with known audit log files.
export const SampleEventSchema = z.object({
  created_timestamp: z.string().describe('An ISO 8601 timestamp for when the event occurred.'),
  entity_name: z.string().describe('The name of the entity that was affected, e.g., "Trade" or "User Account".'),
  entity_id: z.string().optional().nullable().describe('The unique identifier for the specific entity instance.'),
  action: z.string().describe('The type of action that occurred (e.g., "create", "update").'),
  payload: z.string().optional().nullable().describe("A JSON string representing the full data object for 'create' or 'delete' actions."),
  difference_list: z.string().optional().nullable().describe("A JSON string of an array of differences for 'update' actions."),
  user: z.object({
    id: z.string().describe("The user's ID."),
    name: z.string().describe("The user's name."),
    email: z.string().describe("The user's email."),
  }).optional().nullable().describe('The user who performed the action.'),
});

export type AuditEvent = z.infer<typeof SampleEventSchema>;


const SortEventsInputSchema = z.object({
  events: z.array(z.any()),
});
export type SortEventsInput = z.infer<typeof SortEventsInputSchema>;


const SortEventsOutputSchema = z.object({
  sorted_ids: z.array(z.number()),
});
export type SortEventsOutput = z.infer<typeof SortEventsOutputSchema>;


// Optional investigation context provided by the engineer before running analysis.
export const InvestigationContextSchema = z.object({
  customer: z.string().optional().describe('Customer or tenant name.'),
  symptom: z.string().optional().describe('The reported symptom or issue description from the customer.'),
  affectedEntityIds: z.string().optional().describe('Comma-separated list of affected Trade IDs, Obligation IDs, etc.'),
  dateRange: z.string().optional().describe('Approximate incident date/time range (e.g. "2026-06-20 14:00 to 15:30").'),
});
export type InvestigationContext = z.infer<typeof InvestigationContextSchema>;


export const IncidentAnalysisInputSchema = z.object({
  logs: z.string().describe('A string containing the audit logs to be analyzed.'),
  context: InvestigationContextSchema.optional().describe('Optional investigation context provided by the engineer.'),
});
export type IncidentAnalysisInput = z.infer<typeof IncidentAnalysisInputSchema>;


export const IncidentAnalysisOutputSchema = z.object({
    title: z.string().describe("A concise title for the identified issue."),
    summary: z.string().describe("A brief summary of the problem."),
    root_cause_confidence: z.enum(['High', 'Medium', 'Low']).describe("Confidence level in the root cause finding."),
    root_cause_evidence: z.string().describe("Specific log entries or patterns that support the root cause finding."),
    lifecycle_breakdown: z.array(z.object({
        timestamp: z.string().describe("Timestamp from log."),
        lifecycle_phase: z.string().describe("The phase of the trade lifecycle (e.g. Planning, Actualization)."),
        entity_name: z.string().describe("The name of the entity involved."),
        action: z.string().describe("The action performed (Create, Update, Delete)."),
        evidence_type: z.enum(['FACT', 'INFERRED', 'MISSING']).describe("FACT=directly in logs, INFERRED=deduced from evidence, MISSING=expected but absent."),
        confidence: z.enum(['High', 'Medium', 'Low']).describe("Confidence level for this event."),
        description: z.string().describe("Forensic detail of what happened."),
        changed_fields: z.string().nullable().optional().describe("A human-readable summary of fields that were updated (field: old -> new), joined into one string."),
        business_impact: z.string().describe("The impact this event has on the trade or accounting flow.")
    })).describe("Detailed chronological breakdown of the trade lifecycle."),
    steps_to_replicate: z.array(z.string()).describe("A list of steps to replicate the issue."),
    observed_behavior: z.string().describe("Description of the incorrect behavior observed."),
    expected_behavior: z.string().describe("Description of the behavior that was expected but didn't happen."),
    potential_cause: z.string().describe("The likely technical cause of the issue."),
    recommended_fix: z.string().describe("Recommended steps to fix the issue."),
    final_trade_state: z.string().describe("The state the trade is left in at the end of the logs."),
    evidence_gaps: z.array(z.object({
        missing_evidence: z.string().describe("What additional evidence is missing."),
        why_needed: z.string().describe("Why this evidence would help the investigation."),
        how_to_collect: z.string().describe("How to collect this evidence in Xceler or from the system."),
    })).describe("List of additional evidence that would increase confidence in the findings."),
});
export type IncidentAnalysisOutput = z.infer<typeof IncidentAnalysisOutputSchema>;

export const ReplicationOutputSchema = z.object({
  replication_script: z.array(z.string()).describe("A step-by-step business process script to reproduce the issue in the CTRM system."),
  context_summary: z.string().describe("Brief context of the business scenario (e.g. Vessel name, Contract types)."),
  expected_vs_actual: z.string().nullable().optional().describe("A comparison of the expected outcome versus the actual observed discrepancy."),
});
export type ReplicationOutput = z.infer<typeof ReplicationOutputSchema>;
