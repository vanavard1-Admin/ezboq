# EzBOQ Monorepo

EzBOQ is split across a few independently deployed surfaces:

- `apps/web`: main EzBOQ app for `https://ezboq.com`
- `apps/portal`: static portal/content site for `https://doc.ezboq.com`
- `functions`: Firebase Functions, API endpoints, LIFF flows, PDF redirects
- `shared`: shared utilities and hooks used by the workspace apps
- `bots/*`: VPS-hosted bots and support automations

## Local development

Install dependencies once:

```bash
npm install
```

Useful commands:

```bash
npm run dev
npm run typecheck
npm run build:web
npm run build:portal
npm run build:functions
```

## Deployment topology

- Production web (`ezboq.com`): VPS + `nginx`
- Portal/content (`doc.ezboq.com`): Firebase Hosting target `portal`
- Preview web: Firebase Hosting target `web`
- Backend/API: Firebase Functions

Production web deploy now goes through:

```bash
npm run deploy:prod:web
```

That command builds `apps/web` locally and syncs the result to the VPS web root with `rsync --delete`, so stale assets do not pile up across releases.

See [docs/DEPLOYMENT_POLICY.md](/Users/l168/Documents/ใบเสนอราคา/docs/DEPLOYMENT_POLICY.md) for the current source-of-truth deployment map.
  
