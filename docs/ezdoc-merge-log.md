# EzDoc merge log

## 2026-04-03 00:00+07
- Verified EzDoc module already exists under `apps/web/src/features/documents` and is routed via `App.tsx` (`/docs`, `/docs/new`, `/docs/edit/:id`).
- Applied token-alignment pass to:
  - `apps/web/src/features/documents/DocumentsModulePage.tsx`
  - `apps/web/src/features/documents/DocumentEditor.tsx`

### Token alignment changes
- Replaced legacy color classes (`stone-*`, `white`) with EzBOQ token classes (`foreground`, `muted-foreground`, `card`, `secondary`, `border`, `ring`, `primary`).
- Preserved behavior and business logic; style-only refactor.

### Validation
- `npm --prefix apps/web run typecheck` ✅

### Next
- Run UI smoke test in browser for `/docs`, `/docs/new`, `/docs/edit/:id`.
- Decide whether to keep docs feature local in `apps/web` or extract shared UI blocks into `shared/components`.

## 2026-04-03 01:10+07
- Added direct EzDoc entry in `AppShell` header actions (`#docs`) so users can jump to document module without opening settings/utility links.
- Re-ran checks:
  - `npm --prefix apps/web run typecheck` ✅
  - `npx playwright test tests/e2e/documents.spec.ts -c playwright.config.ts` ✅ (2 passed)

## 2026-04-03 01:22+07
- Mobile top bar polish pass in `AppShell` to remove "AI-generic" feel and fix responsive breakage:
  - Hide stretched `EZBOQ` lettermark on small screens.
  - Tighten spacing and icon button rhythm for mobile header controls.
  - Hide desktop-only profile card on mobile to avoid compression.
  - Keep quick `#docs` action visible with consistent height/touch targets.
- Rebuilt and deployed both environments:
  - Firebase test/staging (`ezdoc-v1-th.web.app`) ✅
  - Vercel production alias (`ezboq.com`) ✅
- Validation:
  - `npm --prefix apps/web run typecheck` ✅
  - `npx playwright test tests/e2e/documents.spec.ts -c playwright.config.ts` ✅

## 2026-04-03 01:30+07
- Team invite hardening:
  - `TeamPanel` now validates subscription status from Firestore.
  - Invite action is locked unless **Team plan is active**.
  - Added clear in-UI message for non-team or inactive subscription.
- Mobile hero identity update:
  - Enabled hero loop-video on mobile (keeps reduced-motion accessibility guard).
- Procurement cleanup pass:
  - Default tab switched to **จัดซื้อ**.
  - Procurement categories sorted by highest material cost first.
  - First category auto-expanded for immediate readability.
  - Added explicit heading `จัดซื้อวัสดุ` to stabilize mobile navigation UX/tests.
  - Removed bottom global Lazada suggestion rail (less noisy; keep per-item links/cards on demand).
- Validation:
  - `npm --prefix apps/web run typecheck` ✅
  - `npx playwright test tests/e2e/mobile-footer.spec.ts` ✅
  - `npx playwright test tests/e2e/documents.spec.ts` ✅
