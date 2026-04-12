# AI Runtime Unification (Gemma)

## Goal
Unify all AI calls behind a single server-side gateway in `functions/`, with
project memory as the primary source of truth. Frontend and LINE clients must
never call model providers directly.

## Phase 1 (Current)
- Primary entrypoint: `functions/src/services/ezboqAiGateway.ts`
- Wrapper contract for future consumers: `functions/src/services/gemmaGateway.ts`
- Project memory retrieval: `functions/src/services/projectMemoryService.ts`
- Public callable still: `functions/src/callable/ezboqAi.ts`

## Contract (Gateway)
Request shape lives in `functions/src/services/gemmaGateway.ts`.
This allows `ezboqAi`, `Jarvis`, and future HTTP APIs to share a common adapter.

## Next Steps
1. Route `Jarvis` (LINE/voice) through `gemmaGateway`.
2. Replace static knowledge JSON with Gemma-backed memory for all channels.
3. Add loaders for code index, incidents, and test observations.
4. Add internal admin UI surfaces for diagnostics and memory inspection.

## Memory Collections (Phase 1)
- `project_memory_entries` (primary knowledge)
- `project_code_index_entries` (code index summaries)
- `project_incident_entries` (incident history)
- `project_issue_entries` (live board / implementation work items)
- `project_test_observation_entries` (E2E/test observations)

## Phase 2 Ingestion
Admin-only HTTP endpoint: `projectMemoryIngest`
Accepts a batch of entries and upserts into the collections above.
Scheduled refresh: `projectMemoryRefreshScheduled` (reads `project-memory/latest.json` from GCS).
Admin query endpoint: `projectMemoryAdmin` (for memory inspection UI).
