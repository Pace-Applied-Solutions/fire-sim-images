# Master Plan: Bushfire Simulation Inject Tool

This is the single source of truth for project context, scope, and execution. Every issue and update must reference this plan, execute against it, and then update this plan with what was achieved.

**Source documents**

- Background research: [docs/background.md](docs/background.md)
- Technical considerations: [docs/tech_considerations.md](docs/tech_considerations.md)

## Project Description (Intent, Problem, Architecture)

Fire service trainers need realistic, location-specific visuals to help crews and incident management teams practice decision-making under bushfire conditions. Today, most exercises rely on abstract maps, static photos, or manual composition of visuals, which makes it slow to create injects and hard to ensure the fire depiction matches the real terrain, fuels, and weather. The intent of this project is to close that gap by providing a fast, repeatable way to generate credible bushfire imagery and short clips that are grounded in real landscapes and aligned with fire service terminology and doctrine.

The problem we are solving is twofold: speed and fidelity. Speed means a trainer can sketch a perimeter and quickly produce multiple views that feel like real observations from the fireground. Fidelity means those outputs respect the actual vegetation type, terrain slope, and weather conditions so the visuals do not mislead trainees. The tool is not intended to replace physics-based fire simulators; instead it creates visual injects that complement existing operational planning tools and improve training immersion. By anchoring each scenario to authoritative datasets (vegetation, elevation, imagery) and structuring prompts with fire behavior parameters, the outputs remain credible and consistent with how fire agencies describe and assess fire behavior.

The architecture is a lightweight, modular pipeline hosted in Azure. A React web front-end, hosted on Azure Static Web Apps, provides a 3D map where trainers draw the fire perimeter and set scenario inputs like wind, temperature, humidity, time of day, and qualitative intensity. The back-end API runs as embedded Azure Functions within the Static Web App at the `/api` endpoint. This API enriches the scenario by querying geospatial datasets to derive vegetation type, elevation, slope, and nearby context. A prompt builder converts this structured data into consistent, multi-view descriptions tailored to different perspectives (aerial, ground, ridge). The image generation layer uses Azure OpenAI (DALL-E 3) for rapid integration, with the option to use SDXL with ControlNet for precise spatial alignment when a mask or depth map is needed. Generated images are stored in Azure Blob Storage with access managed via managed identities and returned to the client. For motion, a short image-to-video step (SVD or a third-party service) creates a 4 to 10 second looping clip; longer videos can be produced later by stitching or chaining segments. Security is enforced through Azure Key Vault for secrets management and managed identities for service-to-service authentication.

Key architectural principles include keeping data within the target agency's Azure environment, favoring regional and national datasets for geographic accuracy, and maintaining model modularity so newer AI services can be swapped in as they mature. This allows the system to start small and reliable, then evolve toward higher fidelity and longer-duration outputs without reworking the entire stack. The end result is a practical training tool that can quickly generate credible fireground visuals, improve scenario realism, and support consistent, repeatable training outcomes.

## 1. Vision and Outcomes

**Goal:** Enable fire service trainers to draw a fire perimeter on a real map, set scenario conditions, and generate photorealistic images and short video clips that represent the fire in its real landscape context.

**Primary outcomes**

- Fast scenario creation for training injects (minutes, not hours).
- Visual outputs that reflect location, fuel type, terrain, and weather.
- Multi-perspective imagery (ground, ridge, aerial) for realism.

## 2. Scope and Non-Goals

**In scope (MVP)**

- Web map with 3D terrain and polygon drawing.
- Scenario inputs: wind, temperature, humidity, time of day, intensity.
- Geospatial context lookup (vegetation, slope, elevation).
- Prompt generation and image output (3 to 5 views).
- Short looping video output (4 to 10 seconds).

**Out of scope (initially)**

- Full physics-based wildfire simulation.
- Long-form photoreal video (30 to 60 seconds unique footage).
- AR/VR delivery beyond basic 3D map views.

## 3. Principles and Constraints

- Use authoritative regional and national datasets where possible.
- Prioritize geographic accuracy over artistic style.
- Keep data within the target agency's Azure environment.
- Design for modular model swaps and future upgrades.
- Outputs must be safe, credible, and consistent with fire service training doctrine.

## 4. Technical Guidance and Best Practices

**Product quality**

- Design for clarity and speed: trainers should complete a full scenario flow in minutes.
- Use clear system states (idle, loading, generating, ready, failed) with actionable errors.
- Provide consistent results across views via shared seeds, reference images, or stable prompt templates.

**Front-end experience**

- Ensure responsive layout for large displays and laptops used in training rooms.
- Prioritize map performance: limit heavy layers, debounce draw events, and cache tiles.
- Use intentional typography, color, and motion to deliver a modern, confident interface.
- Include guided UI affordances (tooltips, short helper text, and sensible defaults).

**Back-end reliability**

- Use durable or async workflows for long-running generation tasks.
- Implement retries with backoff for model calls and external data lookups.
- Enforce timeouts, cancellation, and cost guardrails per request.

**Data and model integrity**

- Version prompts and templates to keep outputs traceable and reproducible.
- Log model inputs and outputs for evaluation and QA.
- Validate geospatial lookups and provide fallbacks when data is missing.

**Security and compliance**

- Keep all data in the target agency's Azure environment.
- Store secrets in Key Vault and apply least-privilege identities.
- Apply content safety checks for AI outputs and review policies.

**Testing and observability**

- Add end-to-end scenario tests (map draw -> image/video output).
- Monitor generation latency, error rates, and cost per scenario.
- Use structured logging to support incident triage.

## 5. Users and Roles

- **Trainer:** Creates scenarios and views outputs.
- **Admin:** Manages access, configuration, and usage controls.

## 6. System Architecture (High-Level)

**Front-end**

- Azure Static Web App hosting React application.
- Mapbox GL JS or Azure Maps with 3D terrain.
- Map token via environment variable `VITE_MAPBOX_TOKEN`.
- Polygon draw tool and scenario parameter UI.
- Viewpoint selection and map screenshot capture.

**Back-end API**

- Azure Functions embedded in Static Web App at `/api` endpoint (Node.js 20, TypeScript).
- Durable Functions for long-running generation tasks.
- Geodata lookup for vegetation, slope, elevation.
- Prompt builder for multi-view outputs.
- Image generation via Azure OpenAI (DALL-E 3) or SDXL (ControlNet optional).
- Video generation via SVD or external service.

**Storage and Security**

- Azure Blob Storage for generated images, videos, and scenario data.
- Azure Key Vault for API keys and secrets.
- Managed identities for secure service-to-service authentication.

## 7. Data Sources and Inputs

**Required datasets**

- Vegetation and fuel maps (SVTM, Bush Fire Prone Land).
- DEM or elevation tiles (regional elevation/depth services).
- Base imagery (state/territory spatial services, Sentinel-2, etc.).

**Scenario inputs**

- Wind speed and direction, temperature, humidity, time of day.
- Fire size, stage, and qualitative intensity (trainer-defined).

## 8. Model Strategy

**Image generation**

- Default: GPT-Image for fast integration and quality.
- Advanced: SDXL + ControlNet for spatial precision.

**Video generation**

- Default: SVD for internal pipelines and looping clips.
- Optional: Runway or Pika for higher-quality manual workflows.

## 9. Delivery Phases and Milestones

**Phase 0: Project setup**

- Azure environment provisioned.
- Repo baseline docs and structure in place.
- API access confirmed.

**Phase 1: Map and inputs**

- 3D map and draw tool working.
- Scenario inputs captured and serialized.

**Phase 2: Geodata context**

- Vegetation and terrain summary returned per polygon.
- Performance baseline established.

**Phase 3: Prompt and image output**

- Prompt builder for multi-view images.
- Images generated and stored in Blob Storage.

**Phase 4: Video output**

- Short clip generated from image.
- Playback in UI and storage in Blob.

**Phase 5: Validation and hardening**

- SME feedback cycle.
- Quality thresholds established.
- Security and monitoring in place.

## 10. Issue Map (Authoritative Work Breakdown)

These are the 15 implementation issues seeded in GitHub. Each will be assigned to the coding agent in sequence.

| # | Issue Title | Phase | GitHub |
|---|---|---|---|
| 1 | Project Scaffolding & Repository Structure | Phase 0 | [#1](https://github.com/richardthorek/fire-sim-images/issues/1) |
| 2 | Azure Infrastructure as Code (Bicep) | Phase 0 | [#2](https://github.com/richardthorek/fire-sim-images/issues/2) |
| 3 | Front-End Shell, Design System & Navigation | Phase 1 | [#3](https://github.com/richardthorek/fire-sim-images/issues/3) |
| 4 | 3D Map Integration & Fire Perimeter Drawing | Phase 1 | [#4](https://github.com/richardthorek/fire-sim-images/issues/4) |
| 5 | Scenario Input Panel & Parameter Controls | Phase 1 | [#6](https://github.com/richardthorek/fire-sim-images/issues/6) |
| 6 | Geospatial Data Integration (Azure Functions) | Phase 2 | [#7](https://github.com/richardthorek/fire-sim-images/issues/7) |
| 7 | Prompt Generation Engine | Phase 3 | [#8](https://github.com/richardthorek/fire-sim-images/issues/8) |
| 8 | AI Image Generation Pipeline | Phase 3 | [#9](https://github.com/richardthorek/fire-sim-images/issues/9) |
| 9 | Multi-Perspective Rendering & Consistency | Phase 3 | [#10](https://github.com/richardthorek/fire-sim-images/issues/10) |
| 10 | Results Gallery & Scenario History | Phase 3 | [#11](https://github.com/richardthorek/fire-sim-images/issues/11) |
| 11 | Video Generation Pipeline | Phase 4 | [#12](https://github.com/richardthorek/fire-sim-images/issues/12) |
| 12 | Authentication, Authorization & Content Safety | Phase 5 | [#13](https://github.com/richardthorek/fire-sim-images/issues/13) |
| 13 | Observability, Monitoring & Structured Logging | Phase 5 | [#14](https://github.com/richardthorek/fire-sim-images/issues/14) |
| 14 | End-to-End Testing & Trainer Validation | Phase 5 | [#15](https://github.com/richardthorek/fire-sim-images/issues/15) |
| 15 | CI/CD Pipeline, Documentation & Future Roadmap | Phase 5 | [#16](https://github.com/richardthorek/fire-sim-images/issues/16) |

## 11. Deliverables

- Deployed front-end with map drawing and scenario inputs.
- Azure Functions API for generation.
- Geodata integration module and prompt builder.
- Image and video generation pipeline.
- Storage and retrieval via Blob Storage.
- Admin-ready security and monitoring.
- Living documentation and issue templates.

## 12. Quality and Safety Guardrails

- Prompts use fire service terminology and avoid unsafe or ambiguous language.
- Output validation includes manual review and optional automated checks.
- No depiction of people or animals in fire scenes unless explicitly required.

## 13. Progress Tracking (Living Section)

Update this section after each issue or change.

- **Current focus:** Phase 2 - Geospatial data integration (Issue 6)
- **Completed milestones:**
  - Master plan created as single source of truth.
  - Background research and technical considerations documented.
  - Copilot instructions file created.
  - 15 comprehensive GitHub issues designed and seeded.
  - Mapbox token environment variable recorded as `VITE_MAPBOX_TOKEN` (local + GitHub secrets).
  - Local web environment file created with `VITE_MAPBOX_TOKEN` for Mapbox access.
  - **Phase 0 complete:** Project scaffolding and repository structure (Issue 1)
    - Monorepo structure with npm workspaces
    - Shared types package (@fire-sim/shared) with core domain types
    - React web app (apps/web) with Vite + TypeScript
    - Azure Functions API (apps/api) with v4 programming model
    - Development tooling (ESLint, Prettier, TypeScript strict mode)
    - Updated README with comprehensive setup instructions
  - **Infrastructure as Code:** Bicep templates for Azure deployment (Issue 2)
    - Complete Bicep template structure under `infra/`
    - Main orchestrator (`main.bicep`) and modular resource templates
    - Static Web App with embedded Azure Functions API at `/api`
    - Azure Blob Storage with three containers and lifecycle management
    - Azure Key Vault with managed identity access
    - Azure OpenAI with DALL-E 3 model deployment
    - Dev and prod parameter files
    - Deployment script (`deploy.sh`) and GitHub Actions workflow
    - Comprehensive infrastructure documentation
    - Updated master plan to reflect Static Web App architecture with embedded API
  - **Issue 3 complete:** Front-End Shell, Design System & Navigation
    - Comprehensive design token system with dark theme optimized for training rooms
    - Responsive layout with Header, Sidebar, MainArea, and ResultsPanel components
    - React Router setup with routes for Scenario (/), Gallery, and Settings pages
    - Zustand-based state management for UI and scenario states
    - Toast notification system with auto-dismiss and multiple severity types
    - Reusable UI components (Spinner, ErrorMessage, Toast)
    - Demo controls for testing state changes and notifications
    - Application runs on localhost:5173 with full responsiveness
  - **Issue 4 complete:** 3D Map Integration & Fire Perimeter Drawing
    - Mapbox GL JS v3 integration with 3D terrain enabled
    - Region-centered map (150.5°E, 33.8°S) with satellite streets style
    - 3D terrain with 1.5x exaggeration and sky atmosphere layer
    - MapboxDraw polygon tool with fire-themed styling (red going edge, black inactive edge)
    - Viewpoint presets: North, South, East, West, Aerial with smooth fly-to animations
    - Map screenshot capture function using canvas.toDataURL()
    - Perimeter metadata calculation: area (hectares), centroid coordinates, bounding box
    - FirePerimeter GeoJSON Feature type with proper geometry structure
    - Updated appStore with perimeter state management and setState alias
    - Mapbox token configuration via VITE_MAPBOX_TOKEN environment variable
    - Updated README with setup instructions for Mapbox token
    - All components integrated into ScenarioPage replacing placeholder
  - **Phase 1 complete:** Issue 5 - Scenario Input Panel & Parameter Controls
    - Updated ScenarioInputs type with fireStage field and veryHigh intensity option
    - Wind direction changed from degrees to cardinal directions (N, NE, E, SE, S, SW, W, NW)
    - Comprehensive ScenarioInputPanel component with collapsible sections
    - Weather controls: wind speed slider (0-120 km/h), wind direction dropdown, temperature slider with heat gradient (5-50°C), humidity slider (5-100%)
    - Fire controls: segmented control for intensity (Low, Moderate, High, Very High, Extreme), dropdown for fire stage (Spot fire, Developing, Established, Major)
    - Timing control: dropdown for time of day (Dawn, Morning, Midday, Afternoon, Dusk, Night)
    - Input validation with inline error messages for out-of-range values
    - Four preset scenarios: Grass fire — moderate, Forest fire — severe, Night operation, Extreme day
    - Summary card displaying human-readable scenario description
    - Generate button with disabled state when perimeter missing or validation errors present
    - Scenario inputs persisted to Zustand app store alongside fire perimeter
    - ScenarioInputPanel integrated into ScenarioPage, replacing DemoControls
    - All controls keyboard-accessible with proper focus states
    - CSS styled with design tokens from Issue 3
  - Dependency alignment: downgraded ESLint to a version compatible with @typescript-eslint and reinstalled npm dependencies across root, api, and web
  - Genericized agency-specific references across docs and UI copy for broader fire service use
  - Fixed Azure Functions entrypoint imports to resolve local start module resolution
  - Updated root dev script to run web + API concurrently
  - Added map error overlay to surface missing token or load failures
  - Clarified Mapbox env setup for the web app in README
  - Fixed Mapbox map init under React StrictMode by resetting refs on cleanup
  - Built shared package before API dev start to fix module resolution
  - Updated Azure Functions imports for CommonJS compatibility
  - Switched shared type imports to type-only to avoid runtime export errors
  - Updated geodata function imports for CommonJS + type-only usage
  - Replaced draw toolbar with emoji-based map controls
  - Moved map guidance banner to top with arrow callout and crosshair cursor in draw mode
  - Tightened map guidance layout and simplified copy
  - Switched fire danger rating to compact dropdown with badge
  - Simplified rating dropdown to use colored select only
  - Tied fire intensity to fire danger rating and removed manual override
  - Removed duplicate current rating display in fire danger section
  - Removed fire intensity UI from the sidebar
  - Aligned catastrophic rating with internal intensity mapping
  - **Issue 6 progress:** Added `/api/geodata` Azure Function returning cached GeoContext lookups (vegetation, elevation, slope, aspect, features) using NSW profile heuristics with low-confidence fallback and vegetation descriptor mapping in shared constants
  - **Fire Danger Controls (AFDRS-based):** Enhanced sidebar with Australian Fire Danger Rating System controls
    - Replaced outdated McArthur FFDI/GFDI calculations with modern AFDRS approach
    - Rewrote fire danger documentation (`docs/current_state/fire_danger_calculations.md`) to focus on AFDRS rating levels and vegetation-specific fire behaviour
    - Simplified `fireDangerCalculations.ts` to map AFDRS ratings to known fire behaviour characteristics per vegetation type
    - Added fire behaviour data tables: flame height, rate of spread, spotting distance, intensity descriptors
    - Vegetation types covered: Dry Sclerophyll Forest, Grassland, Heath/Scrubland
    - Simplified ScenarioInputs type: removed fireDangerIndex, droughtFactor, inputMode fields
    - Streamlined ScenarioInputPanel: single AFDRS rating selector (Moderate → Catastrophic) with weather as context
    - Each rating loads typical weather profile (temperature, humidity, wind speed) that can be fine-tuned individually
    - Removed complex three-mode input system and bidirectional FDI sync logic
    - Updated all four presets to use simplified AFDRS-based structure
    - Real-time weather validation warnings for implausible parameter combinations
    - Styled fire danger controls with AFDRS standard colors (blue to dark red gradient)
    - System now provides trainers with vegetation-specific fire behaviour for each rating level rather than calculating risk indices
  - **UI Density Improvements:** Left sidebar controls revamped for professional, information-dense interface
    - Removed all collapsible sections - all controls always visible without internal scrolling
    - Reduced vertical spacing and padding throughout (container gap 50% reduction, section padding 25% reduction)
    - Optimized control sizes: smaller fonts (12-13px labels, 11px buttons), tighter padding, slimmer sliders
    - Streamlined visual elements: tighter borders, simplified section headers, compact summary card
    - Maintained clear visual hierarchy, proper grouping, full keyboard accessibility
    - Layout optimized for laptop/wide tablet screens (1024px+) for expert/professional users
- **Open risks:**
  - Azure Functions Core Tools must be installed separately by developers (not available via npm in sandboxed environments)
  - Azure OpenAI availability varies by region; may need fallback to East US 2
  - Mapbox free tier limits: 50,000 map loads/month (sufficient for development and early use)
- **Next milestone:** Phase 2 - Geospatial data integration (Issue 6)

## 14. Change Control Process

Every change must:

1. Reference this plan and the relevant section.
2. Execute the change.
3. Update this plan with what was achieved or learned.
4. Note any scope changes or new risks.
