import { z } from 'zod';

export const SampleEventSchema = z.object({
  created_timestamp: z.string().describe('An ISO 8601 timestamp for when the event occurred.'),
  entity_name: z.string().describe('The name of the entity that was affected, e.g., "Trade" or "User Account".'),
  action: z.preprocess(
    (val) => String(val).toLowerCase(),
    z.enum(['create', 'update', 'delete'])
  ).describe('The type of action that occurred.'),
  payload: z.string().optional().describe("A JSON string representing the full data object for 'create' or 'delete' actions."),
  difference_list: z.string().optional().describe("A JSON string of an array of differences for 'update' actions. Each difference should have 'label', 'oldValue', and 'newValue' fields."),
  user: z.object({
    id: z.string().describe("The user's ID."),
    name: z.string().describe("The user's name."),
    email: z.string().describe("The user's email."),
  }).optional().describe('The user who performed the action.'),
});

export type AuditEvent = z.infer<typeof SampleEventSchema>;

const DemoDataOutputSchema = z.object({
  events: z.array(SampleEventSchema),
});
export type DemoDataOutput = z.infer<typeof DemoDataOutputSchema>;


const SortEventsInputSchema = z.object({
  events: z.array(z.any()),
});
export type SortEventsInput = z.infer<typeof SortEventsInputSchema>;


const SortEventsOutputSchema = z.object({
  sorted_ids: z.array(z.number()),
});
export type SortEventsOutput = z.infer<typeof SortEventsOutputSchema>;


export const IncidentAnalysisInputSchema = z.object({
  logs: z.string().describe('A string containing the audit logs to be analyzed.'),
});
export type IncidentAnalysisInput = z.infer<typeof IncidentAnalysisInputSchema>;

export const IncidentAnalysisOutputSchema = z.object({
    severity: z.string().describe("The overall severity of the incident (e.g., 'High', 'Medium', 'Low')."),
    suspected_component: z.string().describe('The application component most likely causing the issue.'),
    error_signature: z.string().describe('A unique, concise signature or hash for the primary error.'),
    time_range: z.object({
        start: z.string().describe('The start timestamp of the incident.'),
        end: z.string().describe('The end timestamp of the incident.'),
    }).describe('The time range of the incident.'),
    impacted_entities: z.array(z.string()).describe('A list of entities (trades, books, jobs, users) impacted by the incident.'),
    probable_causes: z.array(z.string()).describe('A list of probable root causes for the incident.'),
    recommended_steps: z.array(z.string()).describe('A list of actionable steps to mitigate or resolve the incident.'),
    confidence: z.number().min(0).max(1).describe('The confidence level of the analysis, from 0.0 to 1.0.'),
});
export type IncidentAnalysisOutput = z.infer<typeof IncidentAnalysisOutputSchema>;
