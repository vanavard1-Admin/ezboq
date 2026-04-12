# Deployment Policy

## Production

- Primary production web app: `ezboq.com`
- Deployment target: VPS (`root@194.233.88.67`) behind `nginx`
- Command: `npm run deploy:prod:web`
- Current nginx root on VPS: `/root/projects/ezboq/apps/web/build`
- Deployment strategy: build `apps/web` locally, then sync to the VPS web root with `rsync --delete`

## Preview / Internal Review

- Web preview: `ezdoc-v1-th.web.app`
- Deployment target: Firebase Hosting target `web`
- Command: `npm run deploy:preview:web`

## Portal Preview

- Portal static preview: Firebase Hosting target `portal`
- Command: `npm run deploy:preview:portal`

## Functions / Rules

- Firebase Functions and security rules stay on Firebase.
- Command: `npm run deploy:functions`

## Legacy / Secondary Targets

- `deploy:prod:web:vercel` remains available only as a secondary/manual path while legacy Vercel setup still exists.
- Vercel is not the production source of truth for `ezboq.com`.

## Release Rule

Use the VPS deployment flow as the production source of truth for `ezboq.com`.
Firebase Hosting remains the preview channel and infrastructure host for the portal/functions ecosystem.
