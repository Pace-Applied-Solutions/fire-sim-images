# Azure Functions Deployment (Bring Your Own Functions)

## Overview

The API runs as a standalone Azure Functions app (Node.js 22, v4 programming model) and is linked to Azure Static Web Apps via the "Bring Your Own Functions" (BYOF) integration. The Static Web App hosts only the React front-end and proxies `/api/*` traffic to the linked Functions resource.

## Critical Requirements

1. **App export for discovery** — `apps/api/src/index.ts` must export the `app` object from `@azure/functions` so the runtime can discover registered functions.
2. **BYOF link** — In the Static Web App portal, set the linked API to the Functions app. This creates the `/api` proxy without bundling the API into the SWA artifact. Rollback: unlink the Functions app in SWA, then redeploy the previous integrated build if needed.
3. **Package configuration** — `apps/api/package.json` uses `"type": "module"` and `"main": "dist/index.js"`; keep Node 22 across local dev and CI.
4. **Function registration** — Each function registers with the shared `app` instance; all function files must be imported by `apps/api/src/index.ts`.

## Deployment Structure

The CI workflow assembles `.deploy/api` for deployment:

- `host.json`
- `dist/` — compiled TypeScript output
- `package.json` — stripped to runtime dependencies
- `node_modules/` — production dependencies (no workspace symlinks)
- `node_modules/@fire-sim/shared` — real copy of the built shared package

Deployment uses `Azure/functions-action@v1` targeting the Functions app name.

## Build & Release Pipeline (GitHub Actions)

1. `npm ci` (workspace root)
2. `npm run build --workspace=packages/shared`
3. `npm run build --workspace=apps/api`
4. Assemble `.deploy/api` with runtime dependencies and the copied shared package (no workspaces)
5. Verify module resolution with `node -e "require.resolve('@fire-sim/shared')"`
6. Deploy with `Azure/functions-action@v1` using the `.deploy/api` package

## Static Web Apps Integration

- The Static Web App deploys only the front-end (`apps/web/dist`). No `api_location` is set in the SWA workflow.
- After deployment, link the Functions app under **Static Web App → Settings → APIs**.
- `staticwebapp.config.json` only handles SPA fallback and MIME types; no `apiRuntime` entry is required.
- For environments where SWA is not proxying, set `VITE_API_BASE_URL=https://<functions-app>.azurewebsites.net/api` in the web app.

## Local Development

- Run both services with `npm run dev` (starts Vite + Functions host on port 7071). Azure Functions Core Tools v4 must be installed globally.
- SWA CLI config uses `apiDevserverUrl: "http://localhost:7071"` so `/api/*` requests are forwarded to the local Functions host.
- To run the API only: `npm run dev --workspace=apps/api` (build + `func start`).

## Troubleshooting

- **Functions not discovered**: Ensure `export default app` exists in `apps/api/src/index.ts` and every function file is imported there.
- **/api routes returning 404 via SWA**: Re-link the Functions app in the Static Web App portal; confirm the app uses Node 22 and is running.
- **Module resolution errors**: Verify `.deploy/api/node_modules/@fire-sim/shared` contains the built `dist` output and `package.json`.
- **Local dev errors about missing Core Tools**: Install with `npm i -g azure-functions-core-tools@4`.
