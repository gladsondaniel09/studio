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
