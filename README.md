# Fire Simulation Inject Tool

AI-powered bushfire simulation inject tool for rural fire service training. Generate realistic, location-specific fire imagery and video clips for training scenarios.

## Overview

This tool enables fire service trainers to quickly create credible bushfire visuals for training exercises by:

- Drawing fire perimeters on real landscapes
- Setting scenario conditions (wind, temperature, humidity, time of day, intensity)
- Generating multi-perspective imagery (aerial, ground, ridge views)
- Producing short video clips for enhanced realism

The system combines real geospatial data (vegetation, terrain, elevation) with AI-powered image generation to ensure outputs are both realistic and aligned with fire service terminology and doctrine.

## Project Context

For complete project context, architecture, and planning, see:

- [Master Plan](docs/master_plan.md) — Single source of truth for project scope and execution
- [Background Research](docs/background.md) — Problem context and research
- [Technical Considerations](docs/tech_considerations.md) — Architecture and technical decisions

## Architecture

This is a monorepo containing:

- **apps/web** — React front-end (Vite + TypeScript) served via Azure Static Web Apps
- **apps/api** — Azure Functions back-end (TypeScript, v4 programming model) deployed as a standalone Functions app and linked to SWA via the Bring Your Own Functions `/api` proxy
- **packages/shared** — Shared TypeScript types and constants

The front-end provides a 3D map interface for drawing fire perimeters and setting scenario parameters. The back-end handles geospatial data lookup, prompt generation, AI model integration, and storage.

For deployment-specific details on the BYOF link between the Static Web App and Functions API, see `docs/current_state/api_byof_integration.md`.

## Prerequisites

- Node.js >= 22.0.0
- npm >= 9.0.0
- Azure Functions Core Tools (for API development)

## Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/richardthorek/fire-sim-images.git
   cd fire-sim-images
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   Create an `.env.local` file in [apps/web](apps/web):

   ```bash
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   # Optional: point the web app at a remote Functions API when not using the SWA BYOF link
   VITE_API_BASE_URL=https://<your-functions-app>.azurewebsites.net/api
   ```

   Get a free Mapbox token from https://account.mapbox.com/ (free tier: 50,000 map loads/month).

4. **Start development servers:**

   ```bash
   npm run dev
   ```

   This starts both the web app (port 5173) and API (port 7071) concurrently.

## Development

The Static Web App deploys the web client only; `/api` calls are forwarded to the linked standalone Azure Functions app (BYOF). Locally, `npm run dev` starts both the Vite dev server and the Functions host on port 7071, so the browser can call `/api` without extra proxy setup. If you need to point at a remote Functions app, set `VITE_API_BASE_URL`.

### Available Scripts

- `npm run dev` — Start both web and API in development mode
- `npm run dev:web` — Start only the web app
- `npm run dev:api` — Start only the API
- `npm run build` — Build all packages
- `npm run typecheck` — Type-check all packages
- `npm run lint` — Lint all TypeScript files
- `npm run format` — Format all files with Prettier
- `npm run format:check` — Check formatting without making changes

### Project Structure

```
/
├── apps/
│   ├── web/                  # React front-end
│   │   ├── src/
│   │   │   ├── components/   # React components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── pages/        # Page components
│   │   │   ├── services/     # API client services
│   │   │   ├── types/        # Web-specific types
│   │   │   ├── utils/        # Utility functions
│   │   │   ├── App.tsx       # Root component
│   │   │   └── main.tsx      # Entry point
│   │   └── public/           # Static assets
│   └── api/                  # Azure Functions back-end
│       ├── src/
│       │   ├── functions/    # HTTP-triggered functions
│       │   ├── services/     # Business logic services
│       │   ├── types/        # API-specific types
│       │   └── utils/        # Utility functions
│       └── host.json         # Azure Functions configuration
├── packages/
│   └── shared/               # Shared types and constants
│       └── src/
│           ├── types.ts      # Domain types
│           ├── constants.ts  # Fire service terminology and defaults
│           └── index.ts      # Package exports
└── docs/                     # Project documentation
```

### Shared Types

The `@fire-sim/shared` package defines core domain types used by both front-end and back-end:

- `FirePerimeter` — GeoJSON polygon for fire boundaries
- `ScenarioInputs` — Wind, temperature, humidity, time, intensity
- `GeoContext` — Vegetation and subtype, fuel load, elevation and slope stats, aspect, nearby features, data source
- `ViewPoint` — Perspective options (aerial, ground, ridge)
- `GenerationRequest` — Complete scenario generation payload
- `GenerationResult` — Generated images and metadata

Import shared types in any workspace:

```typescript
import { ScenarioInputs, ViewPoint, VIEWPOINTS } from '@fire-sim/shared';
```

## Testing

Run tests across all packages:

```bash
npm run test          # Run all tests
npm run test:unit     # Unit tests only
npm run test:coverage # With coverage report
```

For more details, see [docs/TESTING.md](docs/TESTING.md).

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

- **CI Pipeline** (`.github/workflows/ci.yml`): Runs on every push/PR
  - Installs dependencies
  - Formats check with Prettier
  - Lints with ESLint
  - Type-checks with TypeScript
  - Runs unit tests
  - Generates coverage reports

- **Deploy Web** (`.github/workflows/deploy-web.yml`): Deploys front-end to Azure Static Web Apps on merge to main
- **Deploy API** (`.github/workflows/deploy-api.yml`): Deploys Azure Functions API on merge to main
- **Deploy Infrastructure** (`.github/workflows/deploy-infra.yml`): Manual deployment of Azure resources

### Environment Configuration

The application requires the following environment variables:

#### Development (Local)

Create `.env.local` in `apps/web/`:

```bash
VITE_MAPBOX_TOKEN=pk.eyJ...
VITE_API_BASE_URL=http://localhost:7071/api
VITE_APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=...
```

#### GitHub Secrets (for CI/CD)

Configure these secrets in **GitHub repository Settings → Secrets and variables → Actions**:

| Secret Name                          | Description                      | Required For                   |
| ------------------------------------ | -------------------------------- | ------------------------------ |
| `AZURE_CREDENTIALS`                  | Service principal JSON           | Infrastructure, API deployment |
| `AZURE_RESOURCE_GROUP`               | Resource group name              | Infrastructure deployment      |
| `AZURE_SUBSCRIPTION_ID`              | Azure subscription ID            | Infrastructure deployment      |
| `VITE_MAPBOX_TOKEN`                  | Mapbox API token                 | Web deployment                 |
| `VITE_API_BASE_URL`                  | API base URL                     | Web deployment                 |
| `VITE_APPINSIGHTS_CONNECTION_STRING` | Application Insights connection  | Web deployment                 |
| `AZURE_STATIC_WEB_APPS_API_TOKEN`    | Static Web Apps deployment token | Web deployment                 |
| `AZURE_FUNCTION_APP_NAME`            | Function app name                | API deployment                 |
| `AZURE_FUNCTION_APP_URL`             | Function app URL                 | API smoke tests                |

#### GitHub Environments

Set up environments for staging and production:

1. Go to **Settings → Environments**
2. Create `staging` and `production` environments
3. For `production`, enable **Required reviewers** for manual approval
4. Add environment-specific secrets (same names as above, different values)

For complete deployment setup, see [docs/admin-guide.md](docs/admin-guide.md).

## Documentation

- **[Trainer Guide](docs/trainer-guide.md)** — End-user guide for creating scenarios
- **[Admin Guide](docs/admin-guide.md)** — System administration and troubleshooting
- **[API Reference](docs/api-reference.md)** — Complete API endpoint documentation
- **[Master Plan](docs/master_plan.md)** — Project architecture and roadmap
- **[Background Research](docs/background.md)** — Problem context and research
- **[Technical Considerations](docs/tech_considerations.md)** — Technical decisions
- **[Roadmap](docs/roadmap.md)** — Future enhancements (Phase 2-5)
- **[Architecture Decision Records](docs/adr/)** — Key architectural decisions

## Next Steps

**MVP Complete!** The system is ready for trainer validation. Next phases:

1. **Phase 2:** Enhanced spatial control (SDXL + ControlNet, depth maps, inpainting)
2. **Phase 3:** Fire spread simulation (progressive injects, time-stepped scenarios)
3. **Phase 4:** Longer and higher-quality video (30-60 second clips, 1080p+)
4. **Phase 5:** Advanced features (custom camera positions, AR overlay, integrations)

See [docs/roadmap.md](docs/roadmap.md) for the complete future roadmap.

## Contributing

All work must reference and update the master plan. Before making changes:

1. Read the master plan to understand context and scope
2. Reference the relevant section in your work
3. Update the master plan progress section after completing work

## License

This project is for fire service training purposes.
