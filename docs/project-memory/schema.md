# EzBOQ Project Memory Schema

Last updated: 2026-04-09

This document defines the canonical Firestore schema for Gemma-backed memory retrieval used by `ezboqAi`.

## Collections

- `project_memory_entries`
- `project_code_index_entries`
- `project_incident_entries`
- `project_issue_entries`
- `project_test_observation_entries`

## Required fields

- `namespace` (`string`)
  - Logical partition for retrieval.
  - Default for EzBOQ runtime: `ezboq-construction`.
- `active` (`boolean`)
  - Retrieval filter flag.
- `title` (`string`)
  - Human-readable memory title.
- `content` (`string`)
  - Retrieved context body used directly in AI prompts.
- `category` (`string`)
  - One of: `codebase`, `incident`, `project_issue`, `test`, `release`, `pricing`, `ops`, `general`.

## Recommended fields

- `summary` (`string`)
  - Short synopsis for ops/admin UI.
- `tags` (`string[]`)
  - Keywords used in lexical retrieval ranking.
- `priority` (`number`, `1-10`)
  - Retrieval weight multiplier (`5` default).
- `source` (`string`)
  - Upstream source marker (for example `gemma-discord`, `postmortem`, `qa-run`).
- `sourceRef` (`string`)
  - URL, issue link, commit SHA, or doc pointer.
- `updatedAt` (`Timestamp`)
  - Last semantic update timestamp.
- `createdAt` (`Timestamp`)
  - Initial ingest timestamp.
- `metadata` (`map`)
  - Non-indexed JSON bag for provider-specific detail.

## Example document

```json
{
  "namespace": "ezboq-construction",
  "active": true,
  "title": "Slip OCR queue retry policy",
  "content": "paymentWatchdog retries OCR timeout jobs every 15m up to 3 attempts before REVIEW_REQUIRED.",
  "category": "incident",
  "tags": ["ocr", "payment", "retry", "watchdog"],
  "priority": 8,
  "source": "postmortem",
  "sourceRef": "/LMA/issues/LMA-149",
  "updatedAt": "2026-04-09T00:00:00.000Z",
  "createdAt": "2026-04-09T00:00:00.000Z",
  "metadata": {
    "owner": "backend",
    "severity": "high"
  }
}
```

## Retrieval contract notes

- Runtime reads only `active=true`.
- Runtime ranks matches on `title`, `category`, `tags`, `content`, then boosts by `priority`.
- Runtime should keep frontend model-agnostic: UI calls backend API only.
- `project_issue_entries` is separate from `project_incident_entries` so live board/planning work does not pollute incident recall.
