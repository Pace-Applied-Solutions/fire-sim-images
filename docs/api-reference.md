# API Reference

Complete reference for the Fire Simulation Inject Tool API endpoints.

## Base URL

- **Development**: `http://localhost:7071/api`
- **Staging**: `https://firesim-staging-swa.azurestaticapps.net/api`
- **Production**: `https://firesim-prod-swa.azurestaticapps.net/api`

## Authentication

All endpoints except `/health` require authentication via Azure AD bearer token.

**Request header:**

```
Authorization: Bearer <access_token>
```

**Obtaining a token:**
The web application handles token acquisition automatically. For direct API access, use Azure AD authentication flow.

## Endpoints

### Generate Scenario

Starts a new scenario generation request.

**Endpoint:** `POST /api/generate`

**Request Body:**

```json
{
  "perimeter": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [150.5, -33.8],
          [150.51, -33.8],
          [150.51, -33.81],
          [150.5, -33.81],
          [150.5, -33.8]
        ]
      ]
    },
    "properties": {}
  },
  "scenarioInputs": {
    "windSpeed": 45,
    "windDirection": "NW",
    "temperature": 38,
    "humidity": 15,
    "intensity": "high",
    "fireStage": "established",
    "timeOfDay": "afternoon",
    "fireDangerRating": "extreme"
  },
  "perspectives": ["aerial", "helicopter_north", "ground_north"]
}
```

**Request Fields:**

- `perimeter` (required): GeoJSON Feature with Polygon geometry
- `scenarioInputs` (required): Fire and weather parameters
  - `windSpeed`: Number, 0-120 km/h
  - `windDirection`: String, one of N, NE, E, SE, S, SW, W, NW
  - `temperature`: Number, 5-50°C
  - `humidity`: Number, 5-100%
  - `intensity`: String, one of low, moderate, high, veryHigh, extreme
  - `fireStage`: String, one of spot, developing, established, major
  - `timeOfDay`: String, one of dawn, morning, midday, afternoon, dusk, night
  - `fireDangerRating`: String, one of moderate, high, extreme, catastrophic
- `perspectives` (optional): Array of view types to generate (defaults to all)

**Response (202 Accepted):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "message": "Generation request queued successfully"
}
```

**Response Fields:**

- `id`: Unique identifier for this generation request
- `status`: Current status (queued, processing, completed, failed)
- `message`: Human-readable status message

**Error Response (400 Bad Request):**

```json
{
  "error": "Invalid request",
  "message": "Wind speed must be between 0 and 120 km/h",
  "field": "scenarioInputs.windSpeed"
}
```

**Example:**

```bash
curl -X POST https://your-api-url/api/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @scenario.json
```

---

### Get Generation Status

Poll the status of a generation request.

**Endpoint:** `GET /api/generate/{id}/status`

**Path Parameters:**

- `id`: Generation request ID returned from POST /api/generate

**Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "message": "Generating perspective 3 of 6",
  "estimatedCompletion": "2026-02-15T07:35:00Z"
}
```

**Response Fields:**

- `id`: Generation request ID
- `status`: One of queued, processing, completed, failed
- `progress`: Percentage complete (0-100)
- `message`: Current processing step
- `estimatedCompletion`: ISO 8601 timestamp (optional)

**Status Values:**

- `queued`: Request accepted, waiting to start
- `processing`: Generation in progress
- `completed`: All images generated successfully
- `failed`: Generation failed (see error message)

**Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api-url/api/generate/550e8400-e29b-41d4-a716-446655440000/status
```

---

### Get Generation Results

Retrieve completed generation results including image URLs.

**Endpoint:** `GET /api/generate/{id}/results`

**Path Parameters:**

- `id`: Generation request ID

**Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "createdAt": "2026-02-15T07:30:00Z",
  "completedAt": "2026-02-15T07:33:42Z",
  "images": [
    {
      "perspective": "aerial",
      "url": "https://storage.blob.core.windows.net/images/550e8400-aerial.jpg",
      "thumbnailUrl": "https://storage.blob.core.windows.net/images/550e8400-aerial-thumb.jpg",
      "width": 1024,
      "height": 1024,
      "isAnchor": true
    },
    {
      "perspective": "helicopter_north",
      "url": "https://storage.blob.core.windows.net/images/550e8400-heli-n.jpg",
      "thumbnailUrl": "https://storage.blob.core.windows.net/images/550e8400-heli-n-thumb.jpg",
      "width": 1024,
      "height": 1024,
      "isAnchor": false
    }
  ],
  "metadata": {
    "geoContext": {
      "vegetation": "Dry Sclerophyll Forest",
      "elevation": 245,
      "slope": 12,
      "aspect": "NW"
    },
    "seed": 742583,
    "modelVersion": "dall-e-3",
    "promptVersion": "1.0.0"
  }
}
```

**Response Fields:**

- `id`: Generation request ID
- `status`: Generation status
- `createdAt`: Request timestamp
- `completedAt`: Completion timestamp
- `images`: Array of generated images
  - `perspective`: View type
  - `url`: Full-size image URL (signed, 1 hour expiry)
  - `thumbnailUrl`: Thumbnail URL
  - `width`, `height`: Image dimensions
  - `isAnchor`: Whether this was the anchor/reference image
- `metadata`: Generation metadata
  - `geoContext`: Terrain and vegetation data
  - `seed`: Random seed used
  - `modelVersion`: AI model version
  - `promptVersion`: Prompt template version

**Error Response (404 Not Found):**

```json
{
  "error": "Not found",
  "message": "Generation request not found or results not ready"
}
```

**Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api-url/api/generate/550e8400-e29b-41d4-a716-446655440000/results
```

---

### Geospatial Data Lookup

Retrieve vegetation, elevation, and terrain data for a location.

**Endpoint:** `POST /api/geodata`

**Request Body:**

```json
{
  "perimeter": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [150.5, -33.8],
          [150.51, -33.8],
          [150.51, -33.81],
          [150.5, -33.81],
          [150.5, -33.8]
        ]
      ]
    },
    "properties": {}
  }
}
```

**Request Fields:**

- `perimeter`: GeoJSON Feature with Polygon geometry

**Response (200 OK):**

```json
{
  "vegetation": {
    "type": "Dry Sclerophyll Forest",
    "subtype": "Blue Gum - Red Mahogany",
    "fuelLoad": "high",
    "descriptor": "Tall eucalypt forest with moderate understorey"
  },
  "elevation": {
    "mean": 245,
    "min": 210,
    "max": 280,
    "unit": "meters"
  },
  "slope": {
    "mean": 12,
    "max": 25,
    "unit": "degrees"
  },
  "aspect": {
    "predominant": "NW",
    "distribution": {
      "N": 15,
      "NE": 10,
      "E": 5,
      "SE": 5,
      "S": 10,
      "SW": 15,
      "W": 20,
      "NW": 20
    }
  },
  "features": {
    "waterBodies": false,
    "roads": true,
    "structures": false
  },
  "dataSource": "NSW Vegetation Data (2024)",
  "confidence": "high"
}
```

**Response Fields:**

- `vegetation`: Vegetation classification
  - `type`: Primary vegetation type
  - `subtype`: Specific classification
  - `fuelLoad`: Estimated fuel load (low/moderate/high/extreme)
  - `descriptor`: Human-readable description
- `elevation`: Terrain elevation statistics
- `slope`: Terrain slope statistics
- `aspect`: Predominant direction and distribution
- `features`: Presence of notable features
- `dataSource`: Data provider
- `confidence`: Data quality (low/medium/high)

**Example:**

```bash
curl -X POST https://your-api-url/api/geodata \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @perimeter.json
```

---

### Generate Prompts

Generate AI prompts for image generation (for preview/debugging).

**Endpoint:** `POST /api/prompts`

**Request Body:**

```json
{
  "geoContext": {
    "vegetation": {
      "type": "Dry Sclerophyll Forest",
      "subtype": "Blue Gum - Red Mahogany",
      "descriptor": "Tall eucalypt forest with moderate understorey"
    },
    "elevation": { "mean": 245 },
    "slope": { "mean": 12 },
    "aspect": { "predominant": "NW" }
  },
  "scenarioInputs": {
    "windSpeed": 45,
    "windDirection": "NW",
    "temperature": 38,
    "humidity": 15,
    "intensity": "high",
    "fireStage": "established",
    "timeOfDay": "afternoon"
  },
  "perspective": "aerial",
  "seed": 742583
}
```

**Response (200 OK):**

```json
{
  "prompt": "Aerial photograph of an established bushfire in tall eucalypt forest...",
  "negativePrompt": "people, animals, text, watermark, urban, buildings...",
  "metadata": {
    "templateVersion": "1.0.0",
    "perspective": "aerial",
    "intensity": "high",
    "seed": 742583
  }
}
```

**Example:**

```bash
curl -X POST https://your-api-url/api/prompts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @prompt-request.json
```

---

### List Scenarios

Retrieve user's scenario history.

**Endpoint:** `GET /api/scenarios`

**Query Parameters:**

- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `sortBy` (optional): Sort field (createdAt, completedAt, default: createdAt)
- `sortOrder` (optional): Sort order (asc, desc, default: desc)

**Response (200 OK):**

```json
{
  "scenarios": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "createdAt": "2026-02-15T07:30:00Z",
      "status": "completed",
      "location": {
        "centroid": [150.505, -33.805],
        "area": 125.5
      },
      "scenarioInputs": {
        "fireDangerRating": "extreme",
        "timeOfDay": "afternoon"
      },
      "thumbnailUrl": "https://storage.blob.core.windows.net/images/550e8400-aerial-thumb.jpg",
      "imageCount": 6
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

**Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-api-url/api/scenarios?limit=10&sortOrder=desc"
```

---

### Delete Scenario

Delete a scenario and its associated images/videos.

**Endpoint:** `DELETE /api/scenarios/{id}`

**Path Parameters:**

- `id`: Scenario ID

**Response (204 No Content):**
No response body on success.

**Error Response (404 Not Found):**

```json
{
  "error": "Not found",
  "message": "Scenario not found or you don't have permission to delete it"
}
```

**Example:**

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  https://your-api-url/api/scenarios/550e8400-e29b-41d4-a716-446655440000
```

---

### Submit Feedback

Submit feedback on a generated scenario.

**Endpoint:** `POST /api/scenarios/{id}/feedback`

**Path Parameters:**

- `id`: Scenario ID

**Request Body:**

```json
{
  "rating": 4,
  "comments": "Good quality images, but smoke color seemed too dark",
  "perspective": "aerial",
  "categories": ["quality", "realism"]
}
```

**Request Fields:**

- `rating` (required): Number 1-5
- `comments` (optional): Text feedback
- `perspective` (optional): Specific image perspective
- `categories` (optional): Array of feedback categories

**Response (200 OK):**

```json
{
  "message": "Feedback submitted successfully",
  "feedbackId": "fb-123456"
}
```

**Example:**

```bash
curl -X POST https://your-api-url/api/scenarios/550e8400/feedback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": 4, "comments": "Great results!"}'
```

---

### Health Check

Check API health and service dependencies.

**Endpoint:** `GET /api/health`

**No authentication required.**

**Response (200 OK):**

```json
{
  "status": "healthy",
  "timestamp": "2026-02-15T07:30:00Z",
  "version": "0.1.0",
  "checks": {
    "storage": "healthy",
    "keyVault": "healthy",
    "openai": "healthy"
  }
}
```

**Response (503 Service Unavailable):**

```json
{
  "status": "unhealthy",
  "timestamp": "2026-02-15T07:30:00Z",
  "version": "0.1.0",
  "checks": {
    "storage": "healthy",
    "keyVault": "unhealthy",
    "openai": "healthy"
  },
  "errors": ["Unable to connect to Key Vault: Connection timeout"]
}
```

**Example:**

```bash
curl https://your-api-url/api/health
```

---

### Admin: Usage Summary

Retrieve system-wide usage statistics (admin only).

**Endpoint:** `GET /api/admin/usage-summary`

**Requires admin role.**

**Query Parameters:**

- `startDate` (optional): ISO 8601 date (default: 30 days ago)
- `endDate` (optional): ISO 8601 date (default: now)

**Response (200 OK):**

```json
{
  "period": {
    "start": "2026-01-15T00:00:00Z",
    "end": "2026-02-15T00:00:00Z"
  },
  "summary": {
    "totalScenarios": 342,
    "totalImages": 2052,
    "totalVideos": 128,
    "storageUsed": "4.2 GB",
    "estimatedCost": "$425.60"
  },
  "byUser": [
    {
      "userId": "user-123",
      "userName": "trainer@agency.gov.au",
      "scenariosCreated": 45,
      "quotaUsed": "45%",
      "estimatedCost": "$56.25"
    }
  ],
  "topLocations": [
    {
      "location": "Blue Mountains NP",
      "count": 28
    }
  ],
  "errorRate": "2.3%",
  "averageGenerationTime": "3m 42s"
}
```

**Example:**

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://your-api-url/api/admin/usage-summary?startDate=2026-01-01"
```

---

## Error Codes

| Code | Meaning               | Common Causes                                                       |
| ---- | --------------------- | ------------------------------------------------------------------- |
| 400  | Bad Request           | Invalid input parameters, malformed GeoJSON                         |
| 401  | Unauthorized          | Missing or invalid authentication token                             |
| 403  | Forbidden             | Insufficient permissions (e.g., non-admin accessing admin endpoint) |
| 404  | Not Found             | Scenario ID doesn't exist or user doesn't have access               |
| 409  | Conflict              | Resource already exists                                             |
| 429  | Too Many Requests     | Rate limit exceeded, quota exhausted                                |
| 500  | Internal Server Error | Server-side error, check logs                                       |
| 503  | Service Unavailable   | Dependent service down (Azure OpenAI, Storage)                      |

## Rate Limits

- **Per user**: 100 requests per hour (burst: 20 per minute)
- **Generation requests**: 10 concurrent per user
- **Admin endpoints**: 1000 requests per hour

Rate limit headers included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1676457600
```

## Versioning

Current API version: **v1**

The API version is embedded in the base path. Future breaking changes will use a new version number (e.g., `/api/v2`).

Non-breaking changes (new optional fields, new endpoints) are added to the current version.

## Webhooks (Future)

Webhook support for generation completion events is planned for Phase 2.

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { FireSimClient } from '@fire-sim/client';

const client = new FireSimClient({
  apiUrl: 'https://your-api-url/api',
  getToken: async () => {
    // Your Azure AD token acquisition logic
    return await acquireToken();
  },
});

// Start generation
const generation = await client.generateScenario({
  perimeter: myPerimeter,
  scenarioInputs: {
    fireDangerRating: 'extreme',
    windSpeed: 45,
    windDirection: 'NW',
    // ... other inputs
  },
});

// Poll for completion
const result = await generation.waitForCompletion({
  pollingInterval: 5000, // 5 seconds
  timeout: 300000, // 5 minutes
});

console.log(`Generated ${result.images.length} images`);
```

### Python

```python
from firesim_client import FireSimClient

client = FireSimClient(
    api_url="https://your-api-url/api",
    get_token=lambda: acquire_token()  # Your token acquisition
)

# Start generation
generation = client.generate_scenario(
    perimeter=my_perimeter,
    scenario_inputs={
        "fireDangerRating": "extreme",
        "windSpeed": 45,
        "windDirection": "NW",
        # ... other inputs
    }
)

# Wait for completion
result = generation.wait_for_completion(
    polling_interval=5,  # seconds
    timeout=300  # seconds
)

print(f"Generated {len(result.images)} images")
```

### cURL

```bash
#!/bin/bash

# Get token (simplified - use proper Azure AD flow in production)
TOKEN=$(az account get-access-token --resource https://your-api-url --query accessToken -o tsv)

# Start generation
RESPONSE=$(curl -s -X POST https://your-api-url/api/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @scenario.json)

ID=$(echo $RESPONSE | jq -r '.id')
echo "Generation started: $ID"

# Poll for completion
while true; do
  STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://your-api-url/api/generate/$ID/status" | jq -r '.status')

  echo "Status: $STATUS"

  if [ "$STATUS" = "completed" ]; then
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Generation failed"
    exit 1
  fi

  sleep 5
done

# Get results
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://your-api-url/api/generate/$ID/results" | jq '.'
```

---

For additional help, see the [Trainer Guide](trainer-guide.md) or [Admin Guide](admin-guide.md).
