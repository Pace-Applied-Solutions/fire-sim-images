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
- **apps/api** — Azure Functions back-end (TypeScript, v4 programming model)
- **packages/shared** — Shared TypeScript types and constants

The front-end provides a 3D map interface for drawing fire perimeters and setting scenario parameters. The back-end handles geospatial data lookup, prompt generation, AI model integration, and storage.

## Prerequisites

- Node.js >= 20.0.0
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

   Create a `.env` file in the root directory:

   ```bash
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   ```

   Get a free Mapbox token from https://account.mapbox.com/ (free tier: 50,000 map loads/month).

4. **Start development servers:**

   ```bash
   npm run dev
   ```

   This starts both the web app (port 5173) and API (port 7071) concurrently.

## Development

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

## Next Steps

This is Phase 0 (Project Setup) of the master plan. Next phases include:

1. **Phase 1:** Map interface and scenario inputs
2. **Phase 2:** Geospatial data integration
3. **Phase 3:** Prompt generation and image output
4. **Phase 4:** Video generation
5. **Phase 5:** Validation and hardening

See [docs/master_plan.md](docs/master_plan.md) for the full roadmap.

## Contributing

All work must reference and update the master plan. Before making changes:

1. Read the master plan to understand context and scope
2. Reference the relevant section in your work
3. Update the master plan progress section after completing work

## License

This project is for fire service training purposes.
