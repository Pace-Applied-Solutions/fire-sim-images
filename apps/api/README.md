# Azure Functions API

This is the back-end API for the Fire Simulation Inject Tool, built with Azure Functions v4 programming model.

## Prerequisites

To run the API locally, you need to install Azure Functions Core Tools globally:

```bash
npm install -g azure-functions-core-tools@4
```

Alternatively, on macOS using Homebrew:

```bash
brew tap azure/functions
brew install azure-functions-core-tools@4
```

## Running the API

Once Azure Functions Core Tools is installed:

```bash
npm run dev
```

This will start the Functions runtime on `http://localhost:7071`.

## Available Functions

### Health Check

- **URL:** `GET /api/health`
- **Description:** Returns the health status of the API

### Generate Scenario

- **URL:** `POST /api/generateScenario`
- **Description:** Placeholder function for scenario generation
- **Body:** `GenerationRequest` from `@fire-sim/shared`

## Development

The API uses the Azure Functions v4 programming model with TypeScript. Functions are defined in `src/functions/` and automatically registered via `src/index.ts`.

## Configuration

- `host.json` — Azure Functions runtime configuration
- `local.settings.json` — Local environment variables (not committed to git)
