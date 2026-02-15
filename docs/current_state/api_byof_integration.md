# API Integration (Bring Your Own Functions)

## Overview

The API now runs as a dedicated Azure Functions app (Node.js 22) and is linked to Azure Static Web Apps through the BYOF `/api` proxy. The Static Web App deploys only the front-end; `/api/*` calls are forwarded to the Functions hostname.

## Integration Points

- **SWA Linking:** In the Static Web App portal, set **API mode** to "Link to an existing Azure Functions app" and choose the deployed Functions resource.
- **CI workflows:** `deploy-swa.yml` publishes the front-end only; `deploy-api.yml` builds and deploys the Functions app with a real copy of `@fire-sim/shared`.
- **Environment variables:** Use `VITE_API_BASE_URL` when the web app must call the Functions app directly (e.g., preview slots without SWA linking). Default remains `/api` when proxied.
- **Identity:** The Functions app uses managed identity for Key Vault and storage; SWA identity is only for the front-end.

## Known Issues & Risks

- SWA BYOF links can be removed when recreating the Static Web App; after recreations, re-link the Functions resource or `/api` will 404.
- Local development requires Azure Functions Core Tools v4; without it, `npm run dev:api` will fail to start.
- If `@fire-sim/shared` is not built before deploying the API, the Functions package will miss shared types/constants; always run the shared build first (handled in CI).

## Rollback Plan

1. Unlink the Functions app in the Static Web App portal to stop proxying `/api`.
2. Redeploy the previous Functions build (or disable SWA BYOF) if an incident is traced to the new API release.
3. Restore the SWA link once the Functions app is healthy.
