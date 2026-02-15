# Testing the AI Image Generation Pipeline

## Overview

This document describes how to test the image generation pipeline implementation for Issue 8.

## Prerequisites

- Node.js 22+
- Azure Functions Core Tools v4 (install with: `npm i -g azure-functions-core-tools@4`)
- Azure Storage Emulator or Azure Storage Account

## Backend Testing

### 1. Build the API

```bash
cd apps/api
npm run build
```

### 2. Configure Local Settings

Edit `apps/api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "<REPLACE_WITH_STORAGE_CONNECTION_STRING>",
    "AZURE_STORAGE_ACCOUNT_NAME": "firesimdevstor",
    "AZURE_STORAGE_CONTAINER_NAME": "generated-images",
    "WEBSITE_HOSTNAME": "localhost:7071"
  }
}
```

### 3. Start the Azure Functions Runtime

```bash
cd apps/api
func start
```

The API will be available at `http://localhost:7071/api`

### 4. Test Endpoints

#### Health Check

```bash
curl http://localhost:7071/api/health
```

#### Get Geodata

```bash
curl -X POST http://localhost:7071/api/geodata \
  -H "Content-Type: application/json" \
  -d '{
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[150.5, -33.7], [150.6, -33.7], [150.6, -33.8], [150.5, -33.8], [150.5, -33.7]]]
    }
  }'
```

#### Generate Prompts

```bash
curl -X POST http://localhost:7071/api/prompts \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

#### Start Generation

```bash
curl -X POST http://localhost:7071/api/generate \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

Example `test-request.json`:

```json
{
  "perimeter": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [150.5, -33.7],
          [150.6, -33.7],
          [150.6, -33.8],
          [150.5, -33.8],
          [150.5, -33.7]
        ]
      ]
    },
    "properties": {
      "drawn": true,
      "timestamp": "2026-02-14T13:00:00Z"
    }
  },
  "inputs": {
    "fireDangerRating": "high",
    "windSpeed": 35,
    "windDirection": "NW",
    "temperature": 38,
    "humidity": 15,
    "timeOfDay": "afternoon",
    "intensity": "high",
    "fireStage": "established"
  },
  "geoContext": {
    "vegetationType": "Dry Sclerophyll Forest",
    "fuelLoad": "high",
    "elevation": { "min": 300, "max": 900, "mean": 600 },
    "slope": { "min": 10, "max": 35, "mean": 18 },
    "aspect": "NW",
    "dataSource": "Test",
    "confidence": "high"
  },
  "requestedViews": ["aerial", "helicopter_north", "ground_north"]
}
```

#### Check Generation Status

```bash
curl http://localhost:7071/api/generate/{scenarioId}/status
```

#### Get Generation Results

```bash
curl http://localhost:7071/api/generate/{scenarioId}/results
```

## Frontend Testing

### 1. Build and Start the Frontend

```bash
cd apps/web
npm run dev
```

The web app will be available at `http://localhost:5173`

### 2. Test Full Flow

1. **Draw a Fire Perimeter**
   - Open the web app
   - Use the map drawing tools to draw a polygon on the map
   - The perimeter should be saved automatically

2. **Configure Scenario**
   - Adjust the scenario inputs in the sidebar:
     - Fire Danger Rating
     - Weather parameters (wind, temperature, humidity)
     - Time of day
     - Fire intensity and stage
   - Use presets to quickly test different scenarios

3. **Generate Images**
   - Click the "Generate Scenario" button
   - The app should:
     - Transition to "generating" state
     - Show a progress indicator
     - Poll the status endpoint every 2 seconds
     - Update progress text (e.g., "2/5 images")

4. **View Results**
   - Once generation completes:
     - Results panel should open automatically
     - Generated images should be displayed in a grid
     - Each image should show:
       - Viewpoint name
       - Dimensions and model info
       - Download button

## Testing Error Handling

### Content Policy Violation

Currently handled gracefully - the image is skipped and other viewpoints continue.

### Network Errors

Test by stopping the API mid-generation. The frontend should show an error toast.

### Timeout

The image generator has a 60-second timeout per image. If exceeded, it will retry up to 3 times with exponential backoff.

## Testing Edge Cases

1. **No Perimeter Drawn**
   - Generate button should be disabled
   - Tooltip should indicate "Draw a fire perimeter on the map first"

2. **Invalid Inputs**
   - Enter out-of-range values (e.g., temperature > 50°C)
   - Error messages should appear inline
   - Generate button should be disabled

3. **Maximum Viewpoints**
   - Try to request more than 10 viewpoints
   - API should return a 400 error

4. **Partial Failure**
   - If some viewpoints fail to generate, the successful ones should still be returned
   - Error message should indicate partial success (e.g., "3 succeeded, 2 failed")

## Monitoring

During testing, monitor the following:

1. **Console Logs** - Both browser and Azure Functions logs
2. **Network Tab** - Check API requests/responses
3. **Cost Tracking** - Check Azure Functions logs for estimated cost per scenario
4. **Generation Time** - Track how long each image takes

## Expected Performance

- **Geodata Lookup**: < 100ms (cached) or < 500ms (uncached)
- **Prompt Generation**: < 50ms
- **Image Generation**: ~10-30 seconds per image (mock mode)
- **Total Scenario**: ~1-2 minutes for 5 viewpoints

## Notes

- In dev mode, the Stable Diffusion provider generates mock PNG images (1x1 pixel placeholders)
- Blob storage is optional for local testing - images can be returned as data URLs
- The polling interval is 2 seconds with a maximum of 150 polls (5 minutes timeout)
- Cost tracking is logged but not enforced in dev mode
