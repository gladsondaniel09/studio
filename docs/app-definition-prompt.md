# Audit Vision — Application & Feature Definition Prompt

Use this as a system/context prompt when asking an AI assistant to reason about, extend, or document this application.

---

You are working on **Audit Vision** ("Xceler CTRM Forensic Log Analyzer"), a Next.js 15 (App Router, Turbopack) web application that helps L3 support engineers investigate customer-reported incidents in the **Xceler CTRM** (Commodity Trading and Risk Management) platform by analyzing raw entity audit logs.

## Core Purpose

An engineer uploads a CSV/JSON export of entity audit logs (or generic tabular data) from Xceler. The app parses, cleans, and timestamps the rows, renders them as an interactive timeline/table, and — optionally — sends the logs to an LLM to produce:
1. A structured **forensic root-cause investigation report**, and/or
2. A **step-by-step business-process replication script** to reproduce the issue inside Xceler.

The domain is narrow and deep: physical commodity trading (purchase/sales trades, vessel planning, BL actualization, inventory build/draw, invoicing/settlement), modeled specifically on **PIL (Pacific InterLink)** and **APICAL** customer workflows.

## Tech Stack

- **Framework:** Next.js 15.3 (App Router), React 18, TypeScript, Tailwind CSS + shadcn/ui (Radix primitives), `next-themes` for dark/light mode.
- **AI/LLM:** Genkit (`@genkit-ai/next`, `genkit`) scaffolding present, but the active inference path is a direct **Groq SDK** call (`llama-3.3-70b-versatile`) in `src/ai/gemini.ts` — the filename is legacy/misleading, it does not call Gemini despite the flows checking `GEMINI_API_KEY`. `@anthropic-ai/sdk` and `src/ai/anthropic.ts` exist as a dependency but are currently **unused/dead code**. `@google/genai` is also a dependency but not wired into the active flows.
- **Data handling:** PapaParse for CSV parsing, `xlsx` for spreadsheet export, `react-data-grid` for the tabular view, a dedicated **Web Worker** (`src/workers/audit-processor.worker.ts`) that parses and normalizes CSVs off the main thread (chunked parsing with progress events, zero-copy `ArrayBuffer` transfer).
- **Persistence:** Firebase — Firestore for session/analysis metadata, Firebase Storage for the raw uploaded file, structured around a `sessions/{sessionId}/analyses/{analysisId}` hierarchy (`src/firebase/sessions.ts`).
- **Validation:** Zod schemas define both the audit event shape and the AI input/output contracts (`src/lib/types.ts`).

## Core Features

1. **File Upload & Parsing** — Upload a CSV/JSON export; parsing happens in a Web Worker so the UI stays responsive on large files; shows live progress (`PROGRESS`/`COMPLETE`/`ERROR` messages). Handles both audit-log format (`created_timestamp`, `action`, `entity_name`, ...) and generic tabular data.
2. **Data Normalization** — Detects and parses embedded JSON (`payload`, `difference_list`), extracts a business timestamp (preferring `payload.updatedTimestamp` over `created_timestamp`), derives a display user from create/update payloads, and drops corrupt/blank fragment rows.
3. **Timeline View** — Chronological, filterable, searchable visualization of audit events (`src/components/audit-timeline.tsx`, the main ~1600-line orchestrator component) with expandable row details and raw JSON inspection (`src/components/raw-json-viewer.tsx`).
4. **Table View** — Spreadsheet-style grid view of the same data (`react-data-grid`) with sortable/toggleable columns, as an alternate to the timeline.
5. **Filtering & Search** — Multi-select filters for Action and Entity type, full-text search across rows, ascending/descending sort by timestamp.
6. **Flow Chart / Mermaid Visualization** — Entity relationship / lifecycle flow diagrams (`flow-chart.tsx`, `mermaid-flowchart.tsx`, `mermaid-renderer.tsx`) driven by selected entities in the timeline.
7. **AI Forensic Analysis** ("Analyze") — Sends (truncated to 8,000 chars) logs plus optional investigation context (customer, symptom, affected entity IDs, date range) to the LLM. Returns a structured report: title, summary, root-cause confidence + evidence, a chronological lifecycle breakdown (each event tagged FACT/INFERRED/MISSING with confidence), replication steps, observed vs. expected behavior, potential cause, recommended fix, final trade state, and evidence gaps with exact Xceler navigation paths to collect them.
8. **AI Replication Script** ("Replicate") — Produces a formal, numbered business-process script (role-tagged: Purchase/Sales/Finance/Documentation/Admin) to reproduce the incident state in Xceler, citing exact navigation paths and log values, flagging `[NOT IN LOGS — engineer must verify]` where data is missing, and closing with an Expected vs. Actual vs. Discrepancy statement.
9. **Investigation Context Form** — Optional pre-analysis dialog to capture customer/tenant, reported symptom, affected entity IDs, and incident date range, which anchors and improves the AI's output.
10. **Knowledge Base Selector (None / PIL / APICAL)** — Lets the engineer inject a customer-specific knowledge base (`src/ai/knowledge/pil_kb.ts`, `apical_kb.ts`) into the system prompt to bias domain reasoning toward that customer's known scenarios/workflows.
11. **PIL Scenario Matching** — The AI is instructed to match findings against a catalog of ~43 named PIL business scenarios (SC 1–43) and explicitly name/justify the match.
12. **Session History** — Uploaded files and their AI analyses are persisted to Firebase (Storage + Firestore) per session, browsable via a sidebar (`src/components/sessions-sidebar.tsx`), re-downloadable, and deletable (cascades to delete stored file + analysis sub-documents).
13. **Export** — Export processed/filtered data back out (e.g., to CSV/XLSX via the `xlsx` library).
14. **Onboarding Walkthrough** — First-run guided tour for both the upload screen and the timeline screen (`src/components/walkthrough.tsx`).
15. **Theming** — Light/dark mode toggle (`theme-toggle.tsx`, `theme-provider.tsx`) using the brand palette (vibrant purple primary `#A78BFA`, light lavender background, electric blue accent), Space Grotesk headline / Inter body fonts per `docs/blueprint.md`.
16. **Firebase Auth/Error Plumbing** — Non-blocking login and Firestore update helpers, plus a `FirebaseErrorListener` that surfaces permission/config errors without crashing the app.

## Domain Knowledge Baked Into the AI Prompts

The AI system prompts (`src/ai/flows/analyze-log-incident-flow.ts`, `replicate-incident-flow.ts`) encode substantial Xceler CTRM domain knowledge directly as prompt text:
- Trade lifecycle terms: Purchase/Sales Trade, BL/LBL/GBL, Vessel Planning, Trade Actualization, Build/Draw Inventory, GRN Actualization, In-Transit, Simple Blending, Suspense Inventory, Washout, Circle Planning, DBP, PTBF, CN/DN, IDT, Plan ID, Incoterms (FOB/CFR/CIF/DEL/Ex-Tank), Realized PnL.
- Exact in-app navigation paths for each business action (e.g., "Build Inventory: Operations > Inventory Management > Build Inventory").
- An anomaly-detection checklist (BL quantity mismatches, missing GRN Actualization, unsplit sales obligations, approval bypass, PTBF invoiced without pricing, orphaned inventory draws, incorrect voiding order, etc.).
- Evidence classification rules (FACT/INFERRED/MISSING) and confidence levels (High/Medium/Low) that must be applied per-event and to the overall root cause.

## Architectural Notes Worth Knowing

- `generateStructured()` in `src/ai/gemini.ts` is the single choke point for LLM calls: it forces JSON-object output from Groq, strips markdown fences defensively, and validates the result against the Zod output schema before returning it.
- Logs are hard-truncated to 8,000 characters before being sent to the model, and output is capped around 3,000 tokens — a deliberate tradeoff to stay under Groq's rate limits (see commit `6fcf748`).
- The `_rowId` field is injected during parsing specifically to give `react-data-grid` a stable key, since raw audit rows may lack or share an `id`/timestamp.
- Session creation reserves a Firestore doc ID synchronously so the UI can reference `currentSessionId` immediately, while the actual Storage upload + Firestore write happen asynchronously in the background.

## When Extending This App

- New AI-facing features should go through `generateStructured()` and define a Zod schema in `src/lib/types.ts`, mirroring the existing `IncidentAnalysisOutputSchema` / `ReplicationOutputSchema` pattern.
- New customer knowledge bases should follow the `PIL_KB` / `APICAL_KB` pattern in `src/ai/knowledge/` and be wired into the `kbSelection` enum (`'none' | 'pil' | 'apical'`).
- Keep in mind `src/ai/gemini.ts` is Groq-backed despite its name — don't assume it calls Google's Gemini API.
