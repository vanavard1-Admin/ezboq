# EzBOQ Project Memory Ingestion Plan

Last updated: 2026-04-09

This plan defines how Gemma memory is normalized and ingested into `project_memory_entries` for server-side retrieval.

## Goals

- Replace static `knowledge-base.json` dependency for EzBOQ AI runtime.
- Keep memory lifecycle explicit for `codebase`, `incident`, `test`, and `release` context.
- Preserve a stable backend contract while UI/admin surfaces evolve separately.

## Pipeline

1. Extract
- Source: Gemma runtime exports (`bots/gemma-discord`) and curated internal notes.
- Input format: JSON/NDJSON batch with title/content/tags/category/source metadata.

2. Normalize
- Map each record to schema in [schema.md](./schema.md).
- Enforce:
  - valid `namespace`
  - non-empty `title` and `content`
  - normalized lowercase tags
  - bounded `priority` (1-10)

3. Validate
- Reject records without required fields.
- Reject records larger than operational prompt limits (split into smaller chunks).
- Attach `sourceRef` where available for traceability.

4. Upsert
- Write into Firestore `project_memory_entries`.
- Strategy:
  - deterministic key for stable facts (`namespace + source + sourceRef + title`)
  - set `active=true` for current records
  - set `updatedAt` on every refresh

5. Deactivate stale memory
- Mark superseded entries as `active=false` instead of deleting.
- Keep audit trail for incident forensics and QA replay.

## Suggested cadence

- `codebase`: on merged backend changes touching AI/retrieval path.
- `incident`: within 24h of incident postmortem.
- `test`: after major QA/E2E runs and regression discoveries.
- `release`: per release train and rollback events.

## Ownership

- Backend/VP Engineering: schema evolution and retrieval contract stability.
- QA: test-memory updates and retrieval relevance checks.
- Product/Ops: release notes and operational incident context quality.

## Rollout checklist

1. Populate initial `ezboq-construction` namespace from current Gemma memory exports.
   - Local helper: `scripts/ingest_project_memory.py` (writes `scripts/outputs/project-memory-ingest.json`)
   - Verification helper: `scripts/verify_project_memory_sync.py` (compares GCS payload fingerprints against active Firestore documents)
   - Optional: set `PROJECT_MEMORY_GCS_URI` to upload `project-memory-ingest.json` to GCS (for scheduled refresh).
   - VPS runbook: [vps-upload-runbook.md](./vps-upload-runbook.md)
   - VPS now reads incidents/issues directly from the live Paperclip board using the VPS company id and can include all live issues when `PROJECT_MEMORY_PAPERCLIP_INCLUDE_ALL_ISSUES=true`.
   - Live Paperclip issues that are not incidents are ingested into `project_issue_entries`, not `project_incident_entries`.
   - Scheduled refresh now uses deterministic document IDs and deactivates stale active docs, so repeated syncs remain idempotent.
2. Verify `ezboqAi` responses include retrieval metadata (`provider`, `namespace`, `matched`).
3. Execute QA checklist from `[LMA-153](/LMA/issues/LMA-153)`.
4. Align admin/UI inspection flow from `[LMA-154](/LMA/issues/LMA-154)`.
5. Cut over any remaining static KB usage after QA sign-off.
