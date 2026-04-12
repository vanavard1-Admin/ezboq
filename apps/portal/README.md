# EzBOQ Portal

Static Next.js portal/content app for `doc.ezboq.com`.

## Commands

```bash
npm run dev --workspace=apps/portal
npm run typecheck --workspace=apps/portal
npm run build --workspace=apps/portal
```

## Notes

- This app is exported as static files into `apps/portal/out`.
- Production content is hosted on Firebase Hosting target `portal`.
- Fonts are intentionally local/system-based so the build does not depend on Google Fonts being reachable.

## Build output

After a successful build:

```bash
npm run build --workspace=apps/portal
```

This generates static output under `apps/portal/out` and then creates `index.html` route aliases for clean hosting paths.
