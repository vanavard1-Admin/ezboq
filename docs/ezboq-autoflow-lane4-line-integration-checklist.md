# EzBOQ AutoFlow — Lane 4 LINE Integration Checklist

## Scope Delivered
- Added a LINE delivery adapter interface for generated document delivery.
- Added orchestration flow that records async acceptance status and retry placeholders.
- Wired orchestration into `onPdfJobCompleted` worker flow.

## Implementation Checklist

### 1) Adapter / Interface Layer
- [x] `functions/src/services/lineDeliveryAdapter.ts`
  - [x] `LineGeneratedDocDeliveryAdapter` interface
  - [x] `GeneratedDocDeliveryPayload` contract
  - [x] `AdapterAcceptResponse` async-accept response model
  - [x] `getLineRetryPlaceholder(...)` retry strategy placeholder

### 2) Orchestration Layer
- [x] `functions/src/services/generatedDocLineOrchestrator.ts`
  - [x] Tracks `line_delivery_attempt`
  - [x] Updates `line_delivery.asyncStatus`
  - [x] Writes provider acceptance metadata (`acceptedAt`, `providerRequestId`)
  - [x] Stores retry placeholder metadata (`retryAfterMs`, `nextRetryAt`, `reason`)

### 3) Worker Integration
- [x] `functions/src/workers/pdfDelivery.ts`
  - [x] Added concrete adapter `LinePushGeneratedDocAdapter`
  - [x] Kept secure short-link flow via `buildPdfFlexMessageWithShortLink`
  - [x] Replaced direct delivery path in `onPdfJobCompleted` with orchestration call

## Async Status Model (Current)
- `SENDING`
- `ACCEPTED`
- `RETRY_SCHEDULED_PLACEHOLDER`
- `FAILED_NO_RETRY`
- `finalStatus: PENDING_PROVIDER_CALLBACK`

> Note: Final delivery/read receipts are intentionally marked as pending provider callback in lane 4.

## Retry Strategy (Placeholder)
- Max attempts placeholder: 3
- Backoff placeholder: `min(60000, 5000 * attempt)`
- Writes retry plan to Firestore (`line_delivery.retryPlaceholder`) but does not enqueue a new task yet.

## Follow-ups for Next Lane
1. Hook retry placeholder into Cloud Tasks re-enqueue worker.
2. Add provider-aware error classification (429 vs 4xx permanent vs network errors).
3. Add async callback/polling endpoint to move `finalStatus` from pending to delivered/read.
4. Add unit tests for:
   - adapter acceptance mapping
   - orchestrator retry placeholder transitions
   - duplicate trigger idempotency behavior
