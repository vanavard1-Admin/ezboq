# Firebase Functions API Reference (EzBOQ)

Last updated: 2026-04-06

## Base URLs

- API function (Express router):
  - `https://asia-southeast1-<project-id>.cloudfunctions.net/api`
- Standalone functions:
  - `https://asia-southeast1-<project-id>.cloudfunctions.net/<functionName>`

## Authentication

### User endpoints (`verifyAuth` middleware)
- Header: `Authorization: Bearer <Firebase ID Token>`
- Common auth errors:
  - `401 { "error": "Missing or invalid Authorization header" }`
  - `401 { "error": "Invalid or expired token" }`

### Internal task endpoint (`processSlipOcrTask`)
- Header: `Authorization: Bearer <OIDC token from Cloud Tasks>`
- OIDC audience must match OCR task handler URL.

## Legacy Name → Current Endpoint Mapping

| Legacy name (requested) | Current endpoint/function | Method | Auth |
|---|---|---|---|
| `generatePDF` | `/api/v1/documents/:id/generate-pdf` | `POST` | Firebase ID token |
| `sendLINE` | `/api/v1/documents/:id/deliver` | `POST` | Firebase ID token |
| `verifySlip` | `/processSlipOcrTask` (internal Cloud Task handler) | `POST` | Cloud Tasks OIDC |
| `lazadaAuth` | `/lazadaAuthorizeUrl` (+ `/lazadaCallback`) | `GET` | None |
| `lazadaProducts` | `/lazadaProductSearch` | `GET` | None |

---

## 1) Generate PDF

- Endpoint: `POST /api/v1/documents/:id/generate-pdf`
- Auth: required (`verifyAuth`)
- Request body:

```json
{
  "businessId": "<business-id>"
}
```

- Success (`200`):

```json
{
  "message": "PDF generation queued",
  "pdfState": "QUEUED",
  "documentId": "<document-id>"
}
```

- Common errors:
  - `400 { "error": "No business specified or active" }`
  - `404 { "error": "Business not found" }`
  - `404 { "error": "Document not found" }`
  - `400 { "error": "...invalid transition...", "status": "..." }`
  - `429 { "error": "Too many requests" }`
  - `500 { "error": "Internal server error" }`

- Notes:
  - Idempotent behavior when PDF is already rendering.
  - Creates a Firestore `pdf_generation_jobs` record.

## 2) Send LINE (deliver PDF)

- Endpoint: `POST /api/v1/documents/:id/deliver`
- Auth: required (`verifyAuth`)
- Request body:

```json
{
  "businessId": "<business-id>"
}
```

- Success (`200`):

```json
{
  "jobId": "line:<documentId>:<lineUserId>",
  "status": "SENT",
  "message": "Document delivered to LINE successfully"
}
```

- Common errors:
  - `400 { "error": "Missing businessId" }`
  - `404 { "error": "Business not found" }`
  - `404 { "error": "Document not found" }`
  - `400 { "error": "PDF not ready for delivery", "code": "PDF_NOT_READY", ... }`
  - `400 { "error": "กรุณาเชื่อมต่อ LINE...", "code": "LINE_NOT_CONNECTED", ... }`
  - `429 { "error": "Too many delivery requests", "code": "RATE_LIMIT_EXCEEDED", "retryAfterSeconds": 60 }`
  - `400 { "error": "LINE_PUSH_FAILED", "code": "LINE_ERROR", ... }`
  - `500 { "error": "Delivery failed", "message": "..." }`

- Notes:
  - `lineUserId` is resolved server-side from user profile (not trusted from client input).
  - Updates `deliveryJobs` and document delivery state.

## 3) Verify Slip (internal OCR task)

- Function URL: `POST /processSlipOcrTask`
- Auth: Cloud Tasks OIDC only
- Request body:

```json
{
  "userId": "<uid>",
  "lineUserId": "<line-user-id>",
  "messageId": "<line-message-id>",
  "purchaseId": "<purchase-id>"
}
```

- Success (`200`):

```json
{
  "success": true,
  "message": "..."
}
```

- Common errors:
  - `401 { "error": "Missing or invalid authorization" }`
  - `401 { "error": "Unauthorized" }`
  - `500 { "error": "..." }`

- Notes:
  - This is an internal async task handler, not a public client endpoint.

## 4) Lazada Auth

### 4.1 Get authorize URL
- Endpoint: `GET /lazadaAuthorizeUrl?redirectUri=<optional>`
- Auth: none
- Success (`200`):

```json
{
  "success": true,
  "url": "https://auth.lazada..."
}
```

- Errors:
  - `405 { "success": false, "error": "Method not allowed" }`
  - `500 { "success": false, "error": "Unable to build authorize URL" }`

### 4.2 OAuth callback
- Endpoint: `GET /lazadaCallback`
- Auth: none
- Behavior: redirects browser to configured success/error URL with query params.

## 5) Lazada Products

- Endpoint: `GET /lazadaProductSearch?keyword=<text>&categoryId=<id>`
- Auth: none
- Success (`200`):

```json
{
  "success": true,
  "source": "cache",
  "data": {
    "keyword": "...",
    "categoryId": "...",
    "affiliateSearchUrl": "https://www.lazada.co.th/catalog/?...",
    "commissionRate": 2,
    "cachedAt": "2026-04-06T09:00:00.000Z"
  }
}
```

- Errors:
  - `400 { "success": false, "error": "keyword or categoryId required" }`
  - `405 { "success": false, "error": "Method not allowed" }`

## Error Response Format

- Most endpoints return a JSON object with `error` string.
- Some endpoints include `code`, `message`, `retryAfterSeconds`, or state metadata.
- Global API unhandled errors may include request ID:

```json
{
  "error": "Internal server error",
  "requestId": "<uuid>"
}
```

## Rate Limiting (current implementation)

Rate limits come from `functions/src/core/planService.ts` via `checkRequestRateLimit`:

- `FREE`: 10 requests/min
- `PRO`: 60 requests/min
- `TEAM`: 60 requests/min

Endpoint-specific notes:
- `generate-pdf`: plan-aware request limit.
- `deliver`: currently enforces request limit using `FREE` profile in code path.
- Lazada endpoints and `processSlipOcrTask`: no explicit per-user rate limiter in handler.

## Postman Collection

- Included file: `docs/api/ezboq-firebase-functions.postman_collection.json`
- Import into Postman and set variables:
  - `project_id`
  - `firebase_id_token`
  - `document_id`
  - `business_id`
  - `redirect_uri`
