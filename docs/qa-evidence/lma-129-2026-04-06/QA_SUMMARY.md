# LMA-129 QA Summary (2026-04-06)

## Scope
- E2E Production Testing — All Critical Flows
- Requested: auth (email/Google/LINE), payment (QR/slip/OCR), document creation/PDF, LINE Bot, shop module

## Automated Results (Local/CI-style)
- Root suite: `npx playwright test -c playwright.config.ts`
  - Result: 8 passed, 0 failed
- Portal suite: `npm run test:e2e --workspace=apps/portal`
  - Initial run failed (24/24) due missing `PLAYWRIGHT_TEST_BASE_URL` env in helper fallback
  - Rerun with `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3401`
  - Result: 24 passed, 0 failed

## Production Smoke Evidence
- `https://ezboq.com/` => HTTP 200
- `https://doc.ezboq.com/` => HTTP 200 (same landing content)
- `https://doc.ezboq.com/login` => HTTP 404
- `https://doc.ezboq.com/dashboard/documents` => HTTP 404
- `https://ezboq.com/shop` => HTTP 404

Evidence files:
- `01-ezboq-home.png`
- `02-doc-login.png`
- `03-shop-page.png`
- `04-doc-dashboard-gate.png`
- `summary.json`

## Blockers
1. Production app routes required for auth/documents/shop are returning 404, so critical-flow production validation cannot execute.
2. No production QA credentials/secrets or test account context was provided for payment + LINE Bot end-to-end validation.

## Requested Unblock
- Restore/verify production routing for:
  - `/login`
  - `/dashboard/documents`
  - `/shop`
- Provide QA test account and required sandbox credentials/access for:
  - Email/Google/LINE auth verification
  - Payment slip OCR workflow
  - LINE Bot webhook/richmenu/push verification
