# Azure Functions Deployment for Static Web Apps

## Overview

This project uses Azure Functions v4 with the Node.js programming model for the API backend, deployed as part of an Azure Static Web App.

## Critical Requirements for Deployment

### 1. App Object Export

**CRITICAL**: Azure Functions v4 programming model requires the `app` object to be exported from the main entry point (`index.js`) for the runtime to discover registered functions during deployment.

```typescript
// apps/api/src/index.ts
import { app } from '@azure/functions';

// ... function imports that register themselves ...

export default app;  // REQUIRED for Azure Functions discovery
```

**Without this export**, deployment will fail with:
```
Deployment Failed :(
Deployment Failure Reason: Failed to deploy the Azure Functions.
```

### 2. Package Configuration

The `apps/api/package.json` must specify:
- `"type": "module"` for ESM support
- `"main": "dist/index.js"` pointing to the compiled entry point

### 3. Function Registration Pattern

Each function file registers itself using the `app` object from `@azure/functions`:

```typescript
// apps/api/src/functions/healthCheck.ts
import functions from '@azure/functions';
const { app } = functions;

export async function healthCheck(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // ... function logic ...
}

// Register the function
app.http('healthCheck', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheck,
});
```

### 4. Deployment Structure

The `.deploy/api` directory prepared during CI must contain:
- `host.json` - Azure Functions configuration
- `package.json` - Runtime dependencies with `"main": "dist/index.js"`
- `dist/` - Compiled JavaScript output including `index.js` with app export
- `node_modules/` - Production dependencies installed
- `shared/` - Built shared package for local file: dependency

## Build Pipeline

The GitHub Actions workflow (`.github/workflows/deploy-swa.yml`) follows this process:

1. **Build Phase**:
   ```bash
   npm run build --workspace=packages/shared
   npm run build --workspace=apps/api
   ```

2. **Package Phase**:
   ```bash
   mkdir -p .deploy/api
   cp apps/api/host.json .deploy/api/
   cp -R apps/api/dist .deploy/api/dist
   cp -R packages/shared .deploy/api/shared
   # Create standalone package.json with file: dependency
   cd .deploy/api && npm install --omit=dev
   ```

3. **Deploy Phase**:
   ```yaml
   - uses: Azure/static-web-apps-deploy@v1
     with:
       api_location: .deploy/api
       skip_api_build: true  # Pre-built artifacts
   ```

## Configuration Files

### `staticwebapp.config.json`

Located in `apps/web/public/staticwebapp.config.json` and deployed with the web app:

```json
{
  "platform": {
    "apiRuntime": "node:20"
  },
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/*.{css,scss,js,png,gif,ico,jpg,svg,json}"]
  }
}
```

This tells Azure Static Web Apps:
- The API uses Node.js 20 runtime
- SPA routing rules for the front-end

### `host.json`

Located in `apps/api/host.json`:

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

## Troubleshooting

### "Failed to deploy the Azure Functions" Error

**Root Cause**: Missing `export default app` in `apps/api/src/index.ts`

**Solution**: Ensure the entry point exports the app object as shown above.

### "Cannot find module '@fire-sim/shared'" Error

**Root Cause**: Shared package not properly bundled with API deployment

**Solution**: Verify the build pipeline copies `packages/shared` to `.deploy/api/shared` and installs with `npm install --omit=dev`

### Functions Not Discovered Locally

**Root Cause**: Azure Functions Core Tools not finding function registrations

**Solution**:
1. Ensure all function files are imported in `index.ts`
2. Verify `host.json` is present
3. Check that `package.json` main field points to correct entry point

## Local Development

To run the API locally:

```bash
# From project root
npm run build --workspace=packages/shared
npm run build --workspace=apps/api

# Start Azure Functions
cd apps/api
func start
```

**Note**: Requires Azure Functions Core Tools v4 installed globally:
```bash
npm install -g azure-functions-core-tools@4
```

## References

- [Azure Functions Node.js v4 Programming Model](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Azure Static Web Apps - API Support](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions)
- [Migrate to v4 Node.js Model](https://learn.microsoft.com/en-us/azure/azure-functions/functions-node-upgrade-v4)
