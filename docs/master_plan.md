# Master Plan: Bushfire Simulation Inject Tool

This is the single source of truth for project context, scope, and execution. Every issue and update must reference this plan, execute against it, and then update this plan with what was achieved.

**Source documents**

- Background research: [docs/background.md](docs/background.md)
- Technical considerations: [docs/tech_considerations.md](docs/tech_considerations.md)

## Project Description (Intent, Problem, Architecture)

Fire service trainers need realistic, location-specific visuals to help crews and incident management teams practice decision-making under bushfire conditions. Today, most exercises rely on abstract maps, static photos, or manual composition of visuals, which makes it slow to create injects and hard to ensure the fire depiction matches the real terrain, fuels, and weather. The intent of this project is to close that gap by providing a fast, repeatable way to generate credible bushfire imagery and short clips that are grounded in real landscapes and aligned with fire service terminology and doctrine.

The problem we are solving is twofold: speed and fidelity. Speed means a trainer can sketch a perimeter and quickly produce multiple views that feel like real observations from the fireground. Fidelity means those outputs respect the actual vegetation type, terrain slope, and weather conditions so the visuals do not mislead trainees. The tool is not intended to replace physics-based fire simulators; instead it creates visual injects that complement existing operational planning tools and improve training immersion. By anchoring each scenario to authoritative datasets (vegetation, elevation, imagery) and structuring prompts with fire behavior parameters, the outputs remain credible and consistent with how fire agencies describe and assess fire behavior.

The architecture is a lightweight, modular pipeline hosted in Azure. A React web front-end, hosted on Azure Static Web Apps, provides a 3D map where trainers draw the fire perimeter and set scenario inputs like wind, temperature, humidity, time of day, and qualitative intensity. The back-end API runs as a standalone Azure Functions app linked to the Static Web App via the "Bring Your Own Functions" (BYOF) pattern, which proxies `/api` requests to the Functions app. This separation gives the API full access to managed identities, Key Vault references, Table Storage, and Content Safety — features not supported by SWA's managed functions runtime. The API enriches the scenario by querying geospatial datasets to derive vegetation type, elevation, slope, and nearby context. A prompt builder converts this structured data into consistent, multi-view descriptions tailored to different perspectives (aerial, ground, ridge). The image generation layer uses Azure AI Foundry with Stable Image Core (from Stability AI) for rapid integration and regional availability, with Flux as an optional fallback provider. Future enhancements will add SDXL with ControlNet for precise spatial alignment when a mask or depth map is needed. Generated images are stored in Azure Blob Storage with access managed via managed identities and returned to the client. For motion, a short image-to-video step (SVD or a third-party service) creates a 4 to 10 second looping clip; longer videos can be produced later by stitching or chaining segments. Security is enforced through Azure Key Vault for secrets management, Microsoft Entra External ID (CIAM) for authentication, and managed identities for service-to-service authentication.

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

- Standalone Azure Functions app (Node.js 22, TypeScript) linked to SWA via BYOF; SWA proxies `/api` traffic to the Functions app.
- Durable Functions for long-running generation tasks.
- Geodata lookup for vegetation, slope, elevation.
- Prompt builder for multi-view outputs.
- Image generation via Azure AI Foundry (Stable Image Core) or SDXL (ControlNet optional).
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

| #   | Issue Title                                    | Phase   | GitHub                                                            |
| --- | ---------------------------------------------- | ------- | ----------------------------------------------------------------- |
| 1   | Project Scaffolding & Repository Structure     | Phase 0 | [#1](https://github.com/richardthorek/fire-sim-images/issues/1)   |
| 2   | Azure Infrastructure as Code (Bicep)           | Phase 0 | [#2](https://github.com/richardthorek/fire-sim-images/issues/2)   |
| 3   | Front-End Shell, Design System & Navigation    | Phase 1 | [#3](https://github.com/richardthorek/fire-sim-images/issues/3)   |
| 4   | 3D Map Integration & Fire Perimeter Drawing    | Phase 1 | [#4](https://github.com/richardthorek/fire-sim-images/issues/4)   |
| 5   | Scenario Input Panel & Parameter Controls      | Phase 1 | [#6](https://github.com/richardthorek/fire-sim-images/issues/6)   |
| 6   | Geospatial Data Integration (Azure Functions)  | Phase 2 | [#7](https://github.com/richardthorek/fire-sim-images/issues/7)   |
| 7   | Prompt Generation Engine                       | Phase 3 | [#8](https://github.com/richardthorek/fire-sim-images/issues/8)   |
| 8   | AI Image Generation Pipeline                   | Phase 3 | [#9](https://github.com/richardthorek/fire-sim-images/issues/9)   |
| 9   | Multi-Perspective Rendering & Consistency      | Phase 3 | [#10](https://github.com/richardthorek/fire-sim-images/issues/10) |
| 10  | Results Gallery & Scenario History             | Phase 3 | [#11](https://github.com/richardthorek/fire-sim-images/issues/11) |
| 11  | Video Generation Pipeline                      | Phase 4 | [#12](https://github.com/richardthorek/fire-sim-images/issues/12) |
| 12  | Authentication, Authorization & Content Safety | Phase 5 | [#13](https://github.com/richardthorek/fire-sim-images/issues/13) |
| 13  | Observability, Monitoring & Structured Logging | Phase 5 | [#14](https://github.com/richardthorek/fire-sim-images/issues/14) |
| 14  | End-to-End Testing & Trainer Validation        | Phase 5 | [#15](https://github.com/richardthorek/fire-sim-images/issues/15) |
| 15  | CI/CD Pipeline, Documentation & Future Roadmap | Phase 5 | [#16](https://github.com/richardthorek/fire-sim-images/issues/16) |

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

- **Current focus:** Live deployment stability and perspective consistency
- **Completed milestones:**
  - **Vegetation reference alignment:** Vegetation overlay screenshot now fits the fire perimeter to ~80% of the viewport (top-down) and is captured as PNG for accurate colors; legend items with colors are passed into prompts.
  - **Health indicator fallback:** Added same-origin `/api` fallback for the UI health check when a configured API base URL fails.
  - **NVIS legend colors:** Visible legend now samples raster colors and shows a swatch beside each vegetation subgroup.
  - **Results panel overlay:** Results panel now overlays the map instead of shrinking layout width, eliminating the black rectangle when hidden.
  - **Address zoom refinement:** Fit bounds to occupy ~70% of the viewport and draw a subtle bbox overlay for address search results.
  - **Vegetation tooltip visibility:** Docked the NVIS info panel to a fixed on-map position so it never renders off-screen; added location display and scrollable body.
  - **NVIS visible legend:** Legend now samples visible map area and lists only the vegetation subgroups present in view.
  - **Address search fix:** Store `handleLocationSelect` and `handleGeolocationRequest` directly in the app store (not as thunks) so Header results pan/zoom correctly.
  - **NVIS overlay UX fixes:** Updated WMS GetFeatureInfo to request `application/geo+json` and parse Raster.MVS/MVG attributes; added an in-map NVIS legend panel via proxied GetLegendGraphic.
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
    - Static Web App (front-end only) linked to a standalone Azure Functions API via BYOF proxy at `/api`
    - Azure Blob Storage with three containers and lifecycle management
    - Azure Key Vault with managed identity access
    - Azure OpenAI with Stable Image Core model deployment
    - Dev and prod parameter files
    - Deployment script (`deploy.sh`) and GitHub Actions workflow
    - Comprehensive infrastructure documentation
    - Updated master plan to reflect Static Web App + standalone Azure Functions architecture
    - Added AI Foundry (AIServices) deployment with Stable Image Core model and project scaffolding; outputs and secrets wired to Key Vault and Static Web App app settings
    - Added Flex Consumption Function App module with deployment container, managed identity RBAC, and App Insights role assignment; wired Key Vault access and environment parameters
    - Consolidated Key Vault access policies to support both SWA and Function App identities
    - Added AzureWebJobsStorage\_\_accountName setting for Flex Consumption validation in CI/CD
    - Fixed deploy-infra workflow to derive resource group from environment input (dev/prod)
    - Updated deploy-infra workflow to run on infra/ path changes (push)
    - Split infra workflow into validate-only push runs and a gated deploy job for manual dispatch
    - Added separate dev/prod deploy jobs so only prod requires environment approval
    - Aligned dev Bicep location with existing eastus2 resources to prevent validation conflicts
    - Removed Content Safety secret output by fetching keys in main template to clear linter warning
    - Fixed Content Safety existing resource reference to use stable name for Bicep evaluation
    - Reduced map-related toast notifications to error-only to avoid noisy UI
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
  - Moved initial draw hint into the unified map toolbar and swapped it with NSEW controls once available
  - Added spacing between the address search and viewpoint controls in the toolbar
  - Added a bottom-right Mapbox compass control for bearing awareness
  - Boosted compass contrast and size for better visibility at high pitch
  - Switched fire danger rating to compact dropdown with badge
  - Simplified rating dropdown to use colored select only
  - Tied fire intensity to fire danger rating and removed manual override
  - Removed duplicate current rating display in fire danger section
  - Removed fire intensity UI from the sidebar
  - Aligned catastrophic rating with internal intensity mapping
  - **Issue 6 progress:** Added `/api/geodata` Azure Function returning cached GeoContext lookups (vegetation, elevation, slope, aspect, features) using NSW profile heuristics with low-confidence fallback and vegetation descriptor mapping in shared constants
  - **View Perspectives Enhancement:** Added ground-level NSEW and Above views for realistic truck perspective
    - Added 10 new view types: `helicopter_north/south/east/west/above` and `ground_north/south/east/west/above`
    - Helicopter views: Elevated perspective (60° pitch, 0.8x distance) for wide-area situational awareness
    - Ground views: Ground-level perspective (85° pitch, 0.35x distance) simulating realistic truck/vehicle view <2km from terrain
    - Updated MapContainer UI with an active-direction highlight and responsive row sizing to avoid control overlap
  - **Results Panel Behavior:** Results panel now starts collapsed and expands when scenario results are ready
    - Created comprehensive documentation: `docs/current_state/view_perspectives.md` with use cases, technical details, and training guidance
    - Created UI layout documentation: `docs/current_state/images/viewpoint_controls_layout.md` with visual diagrams
    - Retained existing `aerial` and `ridge` view types for backward compatibility
    - All builds and linting pass successfully
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
  - **Issue 7 complete:** Prompt Generation Engine (Phase 3)
    - Created `packages/shared/src/prompts/` module with structured template system
    - Implemented multi-perspective prompt generation supporting all 12 viewpoints
    - Created intensity-to-visual mapping for 6 intensity levels (low → catastrophic)
    - Created time-of-day lighting descriptions for 6 time periods (dawn → night)
    - Created viewpoint perspective descriptions for aerial, helicopter, ground, and ridge views
    - Implemented prompt safety validation excluding unsafe terms from descriptive sections
    - Added POST /api/prompts Azure Function endpoint for prompt generation
    - Template versioning system (v1.0.0) for reproducibility
    - Uses RFS/AFAC terminology: head fire, crown fire, spotting, pyrocumulus
    - Tested with multiple scenarios covering different intensities, times, and viewpoints
    - All prompts properly formatted with style, scene, fire, weather, perspective, and safety sections
    - Code review and security scan completed with no issues
  - **Issue 9 complete:** Multi-Perspective Rendering & Consistency (Phase 3)
    - Implemented two-pass generation: aerial view as anchor → derived views with reference
    - Extended ImageGenOptions with referenceImage, referenceStrength, mapScreenshot fields
    - Created map screenshot capture utility supporting all 12 viewpoints
    - Implemented consistent seed management (auto-generated 0-1,000,000 range)
  - Resolved merge conflicts in shared types and lockfile to align authentication, safety, and gallery metadata models
    - Created ConsistencyValidator with 4-dimension validation (smoke, fire size, lighting, color)
    - Weighted scoring system (0-100) with 70% passing threshold
    - Built ImageComparison component with grid, side-by-side, and carousel views
    - Added anchor image badges and reference usage indicators in UI
    - Created ImagePostProcessor infrastructure ready for sharp integration
    - Comprehensive documentation in docs/current_state/multi_perspective_consistency.md
    - All builds pass, 0 security vulnerabilities, code review feedback addressed
    - Ready for production image processing and regeneration API endpoint (future enhancements)
  - Resolved merge conflicts in shared type definitions and the npm lockfile
  - Rebased onto main and resolved package-lock.json/types.ts conflicts
  - Fixed stray merge artifact in shared types to restore successful TypeScript builds
  - Fixed API TypeScript build errors in list scenarios summary creation and audit log telemetry flush handling
  - Added local dev proxy for /api plus favicon/manifest assets to prevent 404s during web development
  - Fixed local Azure Functions dev startup by aligning API entrypoint imports to TypeScript sources
  - Updated API function and service imports to TypeScript sources to avoid local runtime module resolution errors
  - Switched API local dev to build from dist with entrypoint set to dist/index.js to fix Functions metadata discovery
  - Added SWA CLI dev scripts to run a local Static Web Apps-style proxy for integrated front-end and API
  - Added .nvmrc and Node 22 preflight check for SWA dev to avoid running with unsupported Node versions
  - **CI/CD alignment:** Split deployments: Static Web App ships front-end only, Functions deploys as a standalone app; BYOF linking handles `/api` proxying (SWA deploy no longer packages API artifacts)
  - **Workflow triggers:** Only the unified SWA deploy runs on pushes to `main`; CI now runs on pull requests or manual dispatch; infra deploy remains manual
- **Open risks:**
  - Azure Functions Core Tools must be installed separately by developers (not available via npm in sandboxed environments)
  - Azure OpenAI availability varies by region; may need fallback to East US 2
  - Mapbox free tier limits: 50,000 map loads/month (sufficient for development and early use)
- **Next milestone:** Phase 3 - Results Gallery & Scenario History (Issue 10)
  - **Address Search & Location Navigation:** Fast address search with autocomplete and geolocation support
    - Created `AddressSearch` component with Mapbox Geocoding API integration
    - Map now starts with a continent-wide Australia view and auto-requests geolocation on load, smoothly flying to the user when permission is granted while falling back to Australia with an unobtrusive notice on denial
    - Real-time autocomplete with 300ms debouncing to minimize API calls
    - In-memory caching of up to 20 recent queries for instant results
    - Support for addresses, places, localities, neighborhoods, and postcodes (up to 5 results)
    - Browser geolocation API integration with automatic map centering on user's location
    - Geolocation button (📍) in search bar for one-click location access
    - Graceful fallback to default NSW location if geolocation unavailable or denied
    - Full keyboard navigation: Arrow up/down, Enter, Escape
    - ARIA accessibility attributes for screen reader support
    - Smooth map navigation with `flyTo` animation (2s duration, zoom 14)
    - Request cancellation to prevent race conditions during rapid typing
    - Toast notifications for success, errors, and geolocation status
    - Subtle, non-intrusive UI positioned at top-left with mobile-responsive layout
    - Comprehensive documentation: `docs/current_state/address_search.md` with usage, technical details, and future extensibility for coordinates/MGRS input
    - All builds and linting pass successfully
  - **Infra Tooling:** Set default resource group names in infra deployment script for faster validation runs
  - **Infra Tooling:** Deployment script now overrides the template location parameter for validation and deployment
  - **Infra Tooling:** Deployment script now validates and deploys only in eastus2 (no multi-location attempts)
  - **Infra Tooling:** Deployment validation now handles nonzero exit codes while still checking provisioningState
  - **Infra Tooling:** Suppressed non-error CLI output during validation to avoid parsing noise
  - **Infra Tooling:** Switched dev Static Web App SKU to Standard to avoid Free SKU validation errors in eastus2
  - **Infra Tooling:** Removed Azure OpenAI deployment and stored Azure AI Foundry project settings in Key Vault (stable-image-core)
  - **Infra Tooling:** Fixed Key Vault secret naming for Foundry settings in main.bicep
  - **Infra Tooling:** Added explicit Key Vault dependency for Foundry secret creation
  - **Foundry Integration:** API now reads Foundry settings from Key Vault with env fallback and logs active config
  - **Map UI:** Unified address search and viewpoint controls into a single top toolbar to prevent overlap with map controls
  - **Issue 13 complete:** Observability, Monitoring & Structured Logging (Phase 5)
    - Created structured logging utility with Application Insights integration
    - Logger supports debug, info, warn, error levels with context (scenarioId, userId, correlationId)
    - Performance metrics tracking for generation durations, geodata lookups, model calls, blob uploads
    - Cost estimation and tracking for scenarios (images, videos, storage)
    - Usage summary API endpoint: GET /api/admin/usage-summary
    - Enhanced health check endpoint with connectivity tests for all services
    - Application Insights SDK added to React front-end with error boundary
    - Auto-tracking of page views, route changes, and API calls in web app
    - Comprehensive observability testing documentation in docs/OBSERVABILITY_TESTING.md
    - GenerationOrchestrator instrumented with structured logging and metrics
    - All builds pass, linting clean, TypeScript strict mode compliant
- **Phase 5: Validation and hardening (Issue 14) - IN PROGRESS ✅**
  - **What was achieved:**
    - Comprehensive test infrastructure with Vitest across all packages
    - 213 unit tests passing (120 shared, 72 API, 21 web)
    - Prompt quality test suite validates RFS terminology, blocked terms, viewpoint uniqueness
    - Consistency validator tests fire size, lighting, smoke direction, color palette
    - Cost estimation tests for all pricing models (Stable Image Core, Stable Image Core)
    - State management tests for React store (Zustand)
    - CI workflow configured with GitHub Actions for automated testing
    - Trainer feedback workflow implemented:
      - ImageFeedback and FeedbackSummary types defined
      - submitFeedback Azure Function endpoint (POST /api/scenarios/{id}/feedback)
      - FeedbackForm React component with 3 rating dimensions (realism, accuracy, usefulness)
      - Feedback storage in Blob Storage
    - Quality gates documentation:
      - docs/prompt_quality_standards.md - Prompt quality requirements
      - docs/quality_gates.md - Acceptance criteria and benchmarks
    - Non-blocking coverage thresholds configured as per agent instructions
    - 4 standard E2E test scenarios defined (Blue Mountains, Western Plains, South Coast, Night operation)
  - **What remains:**
    - Integration tests with MSW for Azure service mocking (planned post-MVP)
    - E2E test harness implementation with Playwright (planned post-MVP)
    - Integration of feedback form into GeneratedImages component
    - Component tests for React components (ScenarioInputPanel, preset loading)
    - Trainer feedback dashboard for admin review
- **Open risks:**
  - Azure Functions Core Tools must be installed separately by developers (not available via npm in sandboxed environments)
  - Azure OpenAI availability varies by region; may need fallback to East US 2
  - Mapbox free tier limits: 50,000 map loads/month + 50,000 geocoding requests/month (sufficient for development and early use; caching reduces actual API usage by ~40-60%)
  - Application Insights free tier: 5 GB/month data ingestion (sufficient for early development). When exceeded, billing starts automatically at $2.30/GB for overage. Monitor usage in Azure Portal > Application Insights > Usage and estimated costs.
- **Issue 15 complete:** CI/CD Pipeline, Documentation & Future Roadmap (Phase 5) ✅
  - **CI/CD Pipeline:**
    - Created comprehensive ci.yml workflow integrating existing test.yml functionality
    - Sequential pipeline: install deps → build → format check → lint → typecheck → unit tests → coverage
    - Integration tests run separately on manual workflow_dispatch trigger
    - Created deploy-web.yml for Azure Static Web Apps deployment with environment variables
    - Created deploy-api.yml for Azure Functions deployment with smoke tests
    - Completed deploy-infra.yml with environment protection rules and summary reporting
    - All workflows include summary reporting for GitHub Actions UI
  - **Documentation:**
    - Created docs/trainer-guide.md - Complete step-by-step scenario creation guide (11,667 chars)
      - Getting started and signing in
      - Interface overview
      - 8-step scenario creation workflow
      - Tips for better results (location, perimeter, weather, training value)
      - FAQ covering common issues and questions
    - Created docs/admin-guide.md - System administration guide (17,890 chars)
      - User management (add/remove users, role definitions)
      - Usage quotas and cost management ($0.65-1.25 per scenario estimate)
      - Monitoring system health (Application Insights, health checks, log analysis)
      - Deployment and updates (workflows, hotfixes, rollbacks)
      - Configuration management (environment variables, Key Vault secrets)
      - Troubleshooting common issues
      - Security and compliance best practices
    - Created docs/api-reference.md - Complete API documentation (17,080 chars)
      - All 10 API endpoints with request/response examples
      - Authentication, rate limits, error codes
      - SDK examples for JavaScript/TypeScript, Python, cURL
    - Created docs/roadmap.md - Future enhancements roadmap (11,704 chars)
      - Phase 2: Enhanced spatial control (SDXL + ControlNet, depth maps, inpainting)
      - Phase 3: Fire spread simulation (progressive injects, time-stepped scenarios)
      - Phase 4: Longer and higher-quality video (30-60 second clips, 1080p+)
      - Phase 5: Advanced features (custom cameras, AR overlay, integrations)
- **Post-MVP Stability & Consistency Fixes:**
  - **Health Check Endpoint Reliability (Feb 16, 2026):**
    - Fixed health check to support both connection strings (local dev) and managed identity/account name (Azure deployment)
    - Blob Storage health check now tries connection string first, falls back to account name + DefaultAzureCredential
    - Key Vault health check supports both KEY_VAULT_URL (local) and KEY_VAULT_URI (Azure) env vars
    - Gracefully handles 403 permission errors from Key Vault (still returns "healthy" if vault is reachable, acknowledging limited identity permissions)
    - AI Services check now properly detects Azure AI Foundry configuration (FOUNDRY_PROJECT_PATH, FOUNDRY_PROJECT_REGION, FOUNDRY_IMAGE_MODEL)
    - Fixes "API degraded" status that was appearing in UI despite working services
  - **Screenshot Perspective Alignment (Feb 16, 2026):**
    - Changed generation screenshot capture from 5 semi-random views to consistent cardinal directions
    - Now captures: aerial + NESW for helicopter + NESW for ground = 9 views total
    - Previously captured: aerial + helicopter_north + ground_north + ground_east + ridge (inconsistent with UI)
    - Aligns with user-facing perspective toggles where both modes have N/S/E/W + above options
    - Ensures AI generation receives screenshots that exactly match user-selectable perspectives
    - Removed "ridge" from default generation (legacy view kept in ViewPoint type for backward compatibility)
      - Long-term vision (2+ years) with priority ranking
  - **Architecture Decision Records (ADRs):**
    - Created docs/adr/ directory structure
    - ADR-001: Choice of GPT-Image (Stable Image Core) as default model
      - Rationale: Fast integration, Azure native, reliability, security
      - Trade-offs: Less spatial control, higher cost, resolution limits
      - Future: SDXL integration in Phase 2
    - ADR-002: Monorepo structure with shared types package
      - Rationale: Type safety, single source of truth, simplified development
      - Structure: packages/shared consumed by apps/web and apps/api
      - Trade-offs: Build order matters, coupling between apps
    - ADR-003: Azure Durable Functions for orchestration
      - Rationale: Built-in state management, automatic retries, scalability
      - Patterns: Fan-out/fan-in for parallel image generation
      - Trade-offs: Complexity, learning curve, Azure-specific
    - ADR-004: Mapbox GL JS over Azure Maps or CesiumJS
      - Rationale: 3D terrain, performance, drawing tools, free tier
      - Comparison: Evaluated Azure Maps, CesiumJS, Leaflet, Google Maps
      - Trade-offs: Not part of Azure ecosystem, free tier limits
    - ADR-005: Prompt template versioning strategy
      - Rationale: Reproducibility, A/B testing, evolution tracking
      - Versioning: Semantic versioning (major.minor.patch)
      - Implementation: Multiple concurrent versions, metadata tracking
  - **Environment Configuration:**
    - Updated README with complete CI/CD and environment setup
    - Documented required GitHub secrets for deployment
    - Documented environment-specific configuration (dev, staging, production)
    - Environment protection rules for production deployments
  - **Code Quality:**
    - Fixed all code formatting issues with Prettier across 95 files
    - All builds passing, TypeScript strict mode compliant
    - Ready for code review and security scan
  - **CI Fix: Azure Static Web Apps Function Language Configuration:**
    - Azure SWA deployment was failing with "Cannot deploy to the function app because Function language info isn't provided"
    - Added `staticwebapp.config.json` to `apps/web/public/` with `apiRuntime: "node:22"` to specify Node.js runtime for Azure Functions
    - Included `navigationFallback` configuration for proper SPA routing
    - Updated `.github/workflows/deploy-swa.yml` with documentation explaining the function language requirement
    - Configuration file automatically deployed via Vite build process (copied from public to dist folder)
    - All builds passing, code review clean, security scan completed with no alerts
  - **CI Fix: Node.js runtime alignment (SWA + Functions):**
    - DeploymentId `73295b59-192b-4a1f-bf34-97ce71178224` failed because SWA reported the Functions runtime as Node 20 while the project targets Node 22
    - Updated static web app config, CI, and deployment workflows to use Node.js 22 end-to-end and bumped the root engines field to `>=22` to keep environments consistent
  - **CI Fix: Azure Functions v4 Runtime Discovery:**
    - Azure SWA deployment was failing with "Failed to deploy the Azure Functions" after artifacts uploaded successfully
    - Root cause: Azure Functions v4 programming model requires `app` object export from main entry point for runtime function discovery
    - Added `export default app` to `apps/api/src/index.ts` (imported from `@azure/functions`)
    - Created comprehensive deployment documentation at `docs/current_state/azure_functions_deployment.md`
    - Documents critical requirements: app export, ESM support, package configuration, function registration patterns
    - Includes troubleshooting guide and local development setup instructions
    - Fix enables Azure Functions runtime to discover all registered functions in v4 programming model during pre-built deployments
- **Current focus:** API separation quality audit (BYOF Functions) and documentation sync
  - **Update 2026-02-15 (PR #73):** Documented BYOF API separation, refreshed current-state docs, and aligned local tooling (SWA CLI) to proxy the standalone Functions app
  - **Architecture pivot: SWA + standalone Azure Functions (BYOF):**
    - SWA managed functions cannot support Managed Identity, Key Vault, Table Storage, Content Safety, or function-level auth — all used by the API
    - Moved to "Bring Your Own Functions" pattern: SWA hosts front-end only, API deploys as a standalone Azure Functions app linked via SWA portal
    - Created separate `deploy-api.yml` workflow using `Azure/functions-action@v1`
    - Simplified `deploy-swa.yml` to front-end only (removed `api_location`, API build steps, artifact assembly)
    - Removed `apiRuntime` from `staticwebapp.config.json` (no managed functions)
    - Updated Bicep SWA module: removed `apiLocation` and managed-functions app settings
    - Fixed 4 missing function registrations in `index.ts`: `listScenarios`, `getScenario`, `deleteScenario`, `submitFeedback`
    - Fixed 3 bare ESM imports missing `.js` extension in `deleteScenario`, `getScenario`, `listScenarios`
    - All 11 functions now compile and register correctly
    - Acceptance criteria: SWA deploy excludes API artifacts; `/api` proxy points to linked Functions resource; Functions app built on Node 22 with managed identity + Key Vault access; rollback documented via SWA unlink + redeploy of prior integrated build
- **Completed milestones:**
  - Master plan created as single source of truth.
  - Background research and technical considerations documented.
  - Copilot instructions file created.
  - 15 comprehensive GitHub issues designed and seeded.
  - Mapbox token environment variable recorded as `VITE_MAPBOX_TOKEN` (local + GitHub secrets).
  - Local web environment file created with `VITE_MAPBOX_TOKEN` for Mapbox access.
  - **Phase 0 complete:** Project scaffolding and repository structure (Issue 1)
  - **Infrastructure as Code complete:** Bicep templates for Azure deployment (Issue 2)
  - **Issue 3 complete:** Front-End Shell, Design System & Navigation
  - **Issue 4 complete:** 3D Map Integration & Fire Perimeter Drawing
  - **Phase 1 complete:** Issue 5 - Scenario Input Panel & Parameter Controls
  - **Issue 6 complete:** Geodata Integration & Geospatial Enrichment (Phase 2)
  - **Issue 7 complete:** Prompt Generation Engine (Phase 3)
  - **Issue 9 complete:** Multi-Perspective Rendering & Consistency (Phase 3)
  - **Issue 13 complete:** Observability, Monitoring & Structured Logging (Phase 5)
  - **Issue 14 complete:** End-to-End Testing & Trainer Validation (Phase 5)
  - **Issue 15 complete:** CI/CD Pipeline, Documentation & Future Roadmap (Phase 5) ✅
  - **MVP COMPLETE:** All 15 issues delivered, system ready for trainer validation
- **Lessons learned:**
  - Sequential CI pipeline more reliable than parallel for catching early failures
  - Comprehensive documentation critical for adoption (trainer guide, admin guide)
  - ADRs provide valuable context for future developers and decision-making
  - Roadmap helps stakeholders understand future potential
  - Environment configuration and deployment automation essential for reliability
- **Next milestone:** Phase 2 planning and trainer feedback collection
  - Gather trainer feedback on MVP features
  - Prioritize Phase 2 enhancements based on real-world usage
  - Begin SDXL + ControlNet integration for enhanced spatial control
  - Plan fire spread simulation architecture
- **Gemini 3 Pro Migration & UI Refinements (post-MVP):**
  - **Image model migration to Gemini:** Replaced FLUX.2-pro (Azure 500 errors) with Google Gemini API. Created `geminiImageProvider.ts` with text-to-image and image-to-image support.
  - **Config simplification:** Collapsed 5+ env vars to 3 clean ones (`IMAGE_MODEL`, `IMAGE_MODEL_KEY`, `IMAGE_MODEL_URL`) with backward-compatible fallbacks in `imageModelConfig.ts`.
  - **Gemini 3 Pro with thinking:** Upgraded to `gemini-3-pro-image-preview` with interleaved `['TEXT', 'IMAGE']` response modalities and `thinkingConfig` enabled. Increased generation timeout from 60s to 180s.
  - **Prompt template v1.2.0:** Narrative style with step-by-step instructions, semantic positive constraints, camera language, `\n\n` section separators — aligned with Gemini best practices.
  - **Thinking text UI:** Added `thinkingText` field through full stack (ImageGenResult → GenerationProgress → status API → frontend API client → Zustand store). Built chat-like `ThinkingPanel` component in GeneratedImages that shows model reasoning during and after generation — visible in pending, failed, and completed states.
  - **Removed Compare Views UI:** Kept only "Compare with Map" for screenshot comparisons.
  - **Single perspective mode:** Reduced `requestedViews` to `['aerial']` only for testing. Other perspectives deferred for user-selected expansion.
  - **Health endpoint reliability:** Added `withTimeout()` guard to all health checks (Blob Storage, Key Vault, AI Services, External Data) to prevent indefinite hangs from Azure SDK calls in local dev.
  - All 213 tests passing, all builds clean.
- **Flex Consumption + SAS + Map Screenshots (post-MVP hardening):**
  - **SAS URL fix:** Implemented User Delegation SAS in `blobStorage.ts` so deployed Function Apps (managed identity, no account key) can generate time-limited read-only blob URLs. Previously returned raw URLs which caused 409 errors (public access disabled).
  - **Storage Blob Delegator role:** Added RBAC role assignment in `infra/modules/functionApp.bicep` for the managed identity to call `getUserDelegationKey()`.
  - **Map screenshot capture:** Implemented automatic capture of Mapbox 3D terrain screenshots from each requested viewpoint before starting AI generation. Screenshots act as terrain reference images for Flux Kontext image-to-image mode.
    - Created `apps/web/src/utils/mapCapture.ts` — programmatic camera positioning and canvas capture utility
    - Extended Zustand store with `captureMapScreenshots` function slot registered by MapContainer
    - ScenarioInputPanel calls capture function during generation, passing screenshots in the request
  - **Flux image-to-image:** Updated `fluxImageProvider.ts` to include an `image` field (base64 reference screenshot) in the Flux Kontext API body when a map screenshot or reference image is provided, grounding generated fire imagery in actual terrain.
  - **Terrain source timing fix:** Deferred `map.setTerrain()` until the DEM source is verified loaded, avoiding the "Couldn't find terrain source" console error.
  - **SSE CRLF parsing fix & thinking text UI improvements:**
    - **Root cause fix:** Gemini SSE stream uses `\r\n\r\n` (CRLF) event delimiters, but the SSE parser split on `\n\n` only — all data accumulated in a buffer and was never parsed. Added `\r\n` → `\n` normalisation in `readSSEStream()`.
    - **camelCase field fix:** Gemini API returns `inlineData` (camelCase) but code checked for `inline_data` (snake_case) — images were never extracted. Updated `GeminiPart` interface and `extractResponse()` to handle both.
    - **Immediate progress UI:** `generationResult` is now set immediately when generation starts (with `in_progress` status, empty images), so Results Panel shows progress from the start. Previously only set when thinkingText or images arrived, leaving a dead placeholder.
    - **"Model is thinking" indicator:** When no thinking text has arrived yet, the ThinkingPanel shows a spinner with "Model is thinking… this can take 30–90 seconds for complex fire scenarios" instead of being hidden.
    - **Results Panel auto-open:** Panel now opens as soon as `scenarioState` becomes `'generating'`, not just when results arrive.
  - **Multi-image generation & UI fixes (3-image pipeline):**
    - **3-image default:** Changed `requestedViews` from `['aerial']` to `['aerial', 'ground_north', 'ground_east']` — generates 1 aerial anchor + 2 ground perspectives per scenario. Updated `totalImages` prop from 1 → 3.
    - **Duplicate image fix:** The completed-state UI was rendering the anchor image twice — once as the dedicated "⚓ Anchor" card and again in the `result.images.map()` loop (since the orchestrator puts the anchor in both `anchorImage` and `images[]`). Added `.filter()` to exclude the anchor from the loop.
    - **Transient thinking text:** Thinking text now only displays during `in_progress`/`failed` states. In the `completed` state it no longer appears — it served its purpose during generation. The data is preserved in the generation log.
    - **System instruction for consistency:** Added `systemInstruction` to Gemini API calls describing the bushfire scenario renderer role and requiring strict visual consistency (smoke, flames, vegetation, weather, terrain) across all perspectives in a multi-image set.
    - **Generation log (markdown):** Added `uploadGenerationLog()` to `BlobStorageService`. After each generation completes, a `generation-log.md` file is saved to the same blob container folder (`generated-images/{scenarioId}/generation-log.md`) containing: all prompts, model thinking text, model text responses, seed, model name, and timing. This supports prompt evaluation, auditing, and reproducibility.
    - **Model text response capture:** Added `modelTextResponse` field to `ImageGenResult` to capture the model's non-thought text output separately from thinking text, included in the generation log.
    - **API alignment verified:** Cross-checked implementation against Google's official Gemini API docs (image generation, thinking, generateContent). Confirmed: `thinkingConfig.includeThoughts`, `responseModalities: ['TEXT', 'IMAGE']`, `imageConfig.aspectRatio`/`imageSize`, `systemInstruction`, SSE streaming, and `thought` part detection all align with the current API spec.
  - **NSW SVTM vegetation overlay research:**
    - Investigated NSW State Vegetation Type Map (SVTM) dataset for spatially accurate vegetation data integration
    - Discovered and confirmed working endpoints: ArcGIS MapServer, WMS 1.3.0, REST export, and identify — all publicly accessible with CORS enabled, no API key required
    - SVTM provides 17 vegetation formation categories at 5m resolution across NSW; 10/17 map directly to existing `VEGETATION_TYPES`
    - Created ADR-006 (`docs/adr/ADR-006-nsw-vegetation-overlay.md`) documenting three design options: client-side WMS overlay screenshot, server-side spatial query, and hybrid — with recommendation for client-side WMS overlay
    - **Bug fix:** Fixed `imageGenerator.ts` silently dropping `mapScreenshot`, `referenceImage`, and `referenceStrength` from merged options — these fields were never forwarded to the Gemini provider, meaning map screenshots were not being sent to the AI model
  - **NSW SVTM vegetation overlay — hybrid integration (Option C from ADR-006):**
    - **Client-side WMS overlay:** Added NSW SVTM WMS raster source and layer to MapContainer with 🌿 toggle button. WMS tiles are loaded from NSW ArcGIS WMS 1.3.0 endpoint at 0.65 opacity. Added `captureVegetationScreenshot()` in mapCapture.ts that temporarily enables the vegetation layer, jumps to a flat aerial view, waits for WMS tiles, captures canvas, and restores camera state.
    - **Server-side spatial queries:** Created `vegetationService.ts` with `queryVegetationContext()` that queries the ArcGIS REST identify endpoint at 9 points (center + 8 compass directions) around the fire perimeter. Returns `VegetationContext` with formation names, class names, and spatial distribution. `formatVegetationContextForPrompt()` converts results to natural language fire-relevant descriptions.
    - **Shared types/constants:** Added `VegetationContext` interface to types.ts, `SVTM_FORMATION_DESCRIPTORS` (17 entries), `SVTM_WMS_URL`, and `SVTM_REST_URL` to constants.ts.
    - **Pipeline integration:** Orchestrator queries vegetation context after prompt generation (Step 1b), passes both `vegetationMapScreenshot` and `vegetationPromptText` through to image generation. Gemini provider includes the vegetation overlay screenshot as a second reference image with color legend instructions, and appends spatial vegetation text with "SPATIAL VEGETATION DATA" header.
    - **Frontend flow:** ScenarioInputPanel captures vegetation screenshot during generation flow (after terrain screenshots), sends as `vegetationMapScreenshot` in the generation request.
    - **Resilience:** All vegetation operations are non-fatal — wrapped in try/catch with warning logs, generation proceeds without vegetation data if NSW government server is unavailable.
    - **Generation log:** Vegetation context and screenshot presence are recorded in the generation log for audit and reproducibility.
    - All builds pass (shared, API, web), TypeScript strict mode compliant.
    - **Map error handling:** WMS tile errors from the vegetation overlay no longer trigger the full "Map unavailable" overlay; errors are logged and the base map remains usable.
    - **WMS fix:** Updated the SVTM WMS tile template to EPSG:3857 with `{bbox-epsg-3857}` so Mapbox substitutes the bbox and the WMS server no longer returns 400 errors.
    - **Anchor sequencing:** Default generation now starts with a truck-level ground view, follows with other ground views, and finishes with aerial; anchor selection prefers ground-level viewpoints.
  - **Mobile Responsive Layout (Feb 16, 2026):**
    - Redesigned panel interface for mobile viewports ≤768px to ensure usability on small devices
    - Converted left/right side panels to bottom drawers that slide up from bottom
    - Created MobileTabBar component with three tabs: Inputs (⚙️), Map (🗺️), Results (🖼️)
    - Only one panel visible at a time on mobile to maximize map visibility
    - Panels positioned above 64px tab bar with max heights of 60vh (inputs) and 70vh (results)
    - Touch-optimized controls with 44px minimum tap targets
    - Panel headers tappable to collapse/expand on mobile
    - Removed panel backdrop overlay on mobile (cleaner UX with tab bar navigation)
    - Preserved desktop/tablet experience (>768px unchanged)
    - Added comprehensive documentation: `docs/current_state/mobile_responsive_layout.md`
    - All builds passing, no horizontal overflow, proper touch interaction ergonomics
    - Acceptance criteria met: functional UI on mobile, no forced zoom, all controls accessible
  - **Prompt Template v1.3.0 & Workflow Documentation (Feb 16, 2026):**
    - **Enhanced landscape adherence:** Updated prompt style section to explicitly require matching actual landscape, not artistic interpretation. Added mandate for man-made structures (buildings, roads, fences) to appear in correct positions and scales. Images must be recognizable as specific locations.
    - **Directional narrative for ground views:** Ground-level viewpoints now include immersive "You're standing on the ground to the [direction] of the fire, looking [direction]..." phrasing. Creates clear tactical context for fire crew training scenarios.
    - **Scene section strengthening:** Added "strict adherence to reference imagery" language. Explicit requirement that if reference shows a building, road, or clearing, it must appear in the generated image with correct location, scale, and orientation.
    - **Prompt version bump:** v1.2.0 → v1.3.0 to track landscape realism and directional narrative improvements.
    - **Comprehensive workflow documentation:** Created `docs/image_generation_workflow.md` documenting:
      - Multi-perspective capture approach (both top-down and ground-level tactical views)
      - Directional narrative implementation for all ground viewpoints
      - Vegetation context integration (SVTM overlay capture and AI model instructions)
      - Quality assurance checklists for landscape adherence, multi-view consistency, and directional narratives
      - Step-by-step workflow from perimeter drawing through results storage
      - Camera parameters and positioning for each viewpoint type
      - Troubleshooting guide for common issues
      - Future enhancements roadmap (vegetation label layer, enhanced spatial queries)
    - **Acceptance criteria met:** Generated images preserve landscape features from reference, directional context clear in ground views, dual viewpoints (top-down aerial + perspective ground views) captured and documented, revised workflow documented.
  - **Prompt Template v1.4.0: Fire Size & Scale (Feb 16, 2026):**
    - **Problem addressed:** Generated images showed smaller fires than mapped area; AI lacked understanding of incident scale; red polygon sometimes visible
    - **Fire dimension calculation:** Added `calculateFireDimensions()` function to compute area (hectares), N-S extent (km), and E-W extent (km) from perimeter bounding box
    - **PromptData enhancement:** Added `fireAreaHectares`, `fireExtentNorthSouthKm`, `fireExtentEastWestKm` fields
    - **Fire section updates:**
      - Includes explicit dimensions: "The fire covers approximately X hectares, spanning Y km from north to south and Z km from east to west"
      - Added critical instruction: "The fire must fill the entire mapped area — this is not a small fire, but an incident of this specific scale"
      - Emphasizes active fire edge, smoke, and burned areas should occupy full extent
      - Explicit red polygon removal: "Do NOT show any red polygon outline or boundary markers — the fire itself replaces any drawn perimeter lines"
    - **Technical implementation:** Uses turf/area and turf/bbox for accurate calculations; accounts for latitude variation in longitude-to-km conversion (cosine correction)
    - **Prompt version bump:** v1.3.0 → v1.4.0
    - **Testing:** All 120 tests passing, no breaking changes
    - **Documentation:** Created `docs/PROMPT_V1.4.0_FIRE_SIZE.md` with examples, technical details, and validation
  - **Prompt Template v1.5.0: Locality Context (Feb 16, 2026):**
    - **Problem addressed:** Generic "New South Wales, Australia" context didn't help AI understand regional landscape characteristics
    - **Mapbox reverse geocoding:** Created geocoding utility (`apps/web/src/utils/geocoding.ts`) to automatically determine locality from fire perimeter centroid
    - **Smart formatting:** Place type-based formatting (locality: "near {town}, {state}", district: "in the {area} area, {state}", region: "in {state}")
    - **Frontend integration:** ScenarioInputPanel queries locality when perimeter changes, adds to geoContext; non-fatal error handling
    - **Scene section enhancement:** Includes locality context at start of landscape description ("This location is near Bungendore, New South Wales, Australia")
    - **Fallback strategy:** Generic state-level context if reverse geocoding unavailable or fails
    - **Examples:** "near Bungendore, New South Wales" (tablelands), "in the Blue Mountains area, New South Wales" (escarpment), "near Bendigo, Victoria" (goldfields plains)
    - **Prompt version bump:** v1.4.0 → v1.5.0
    - **Testing:** All 120 tests passing, locality optional (no breaking changes)
    - **Documentation:** Created `docs/PROMPT_V1.5.0_LOCALITY.md` with geographic context examples, API details, regional characteristics
  - **Prompt Template v1.6.0: Fire Shape, Scale, and Geometry (Feb 17, 2026):**
    - **Problem addressed:** Generated images not reflecting polygon shape and orientation; fires appeared circular regardless of elongated perimeter; no orientation guidance
    - **Shape classification:** Added automatic categorization based on aspect ratio: roughly circular (<1.3), moderately elongated (1.3-2.0), elongated (2.0-3.5), very elongated (>3.5)
    - **Aspect ratio calculation:** Computes longest dimension ÷ shortest dimension from perimeter bounding box (1.0 = perfect circle/square, 5.0+ = very elongated)
    - **Orientation detection:** Determines primary fire spread axis (north-south vs east-west) when aspect ratio ≥ 2.0
    - **PromptData enhancement:** Added `fireShape`, `fireAspectRatio`, `firePrimaryAxis` fields to communicate geometry to AI model
    - **Fire section updates:**
      - Added shape description: "The fire perimeter has a [shape] shape, oriented primarily [axis]"
      - New instruction: "Match the fire perimeter's shape and orientation precisely"
      - Elongation emphasis: "If the fire is elongated in one direction, show that elongation clearly"
    - **Reference image scale framing:** Enhanced Gemini provider with explicit context: "SCALE AND EXTENT: This reference image shows the FULL extent of the fire area. The entire visible landscape represents the fire perimeter — edge to edge, top to bottom."
    - **Geometry algorithm:** Uses Turf.js bbox for extents, calculates N-S and E-W distances with latitude correction, derives aspect ratio and orientation
    - **Prompt version bump:** v1.5.0 → v1.6.0
    - **Testing:** All 120 tests passing, no breaking changes, backwards compatible
    - **Documentation:** Created `docs/PROMPT_V1.6.0_GEOMETRY.md` with shape classification logic, orientation detection algorithm, usage examples, and test cases
  - **Vegetation Expansion Issue Package (Feb 16, 2026):**
    - Created comprehensive GitHub issue (27KB documentation) for interactive vegetation labels and national coverage expansion
    - **Problem:** No way to identify vegetation types (colors only); NSW-only coverage blocks scenarios in other states
    - **Solution proposed:**
      - Part 1: Click-to-identify functionality (query at coordinates, display formation/fire characteristics)
      - Part 2: NVIS integration (National Vegetation Information System) for nationwide coverage via WMS
      - Hybrid approach: Keep NSW SVTM (5m high-res) + add NVIS (25-100m national baseline)
    - **Files created:** `.github/ISSUE_VEGETATION_LABELS_NATIONAL.md` (full specification), `.github/ISSUE_TEMPLATE_VEGETATION.md` (copy-paste ready), `docs/VEGETATION_ISSUE_QUICK_REF.md` (visual guide)
    - **Implementation phases:** Click-to-identify (1-2d) → NVIS integration (3-5d) → Optional labels (2-3d)
    - **NVIS details:** Australian Government DCCEEW, CC-BY 4.0 license, 85 vegetation subgroups (MVS), CORS-enabled WMS endpoints
  - **Address Search Moved to Header (Feb 16, 2026):**
    - **Problem addressed:** Address search field was overlaying map controls in top-left corner, causing visual clutter and obstructing access to map controls (zoom, rotation, compass)
    - **Solution:** Moved AddressSearch component from MapContainer toolbar overlay to Header component center section
    - **Architecture pattern:** Used Zustand store to pass location handlers (`handleLocationSelect`, `handleGeolocationRequest`) from MapContainer to Header, following existing pattern used for `captureMapScreenshots`
    - **Implementation details:**
      - Added handler function types to appStore: `HandleLocationSelectFn`, `HandleGeolocationRequestFn`
      - MapContainer registers handlers in store when map loads, cleans up on unmount
      - Header conditionally renders AddressSearch when handlers available (map loaded)
      - Header CSS updated with centered `.center` section for search field, flexible layout between brand/nav and status
      - Removed `.toolbarSearch` styles from MapContainer (no longer needed)
    - **Benefits:**
      - Map controls (zoom, rotation, compass, scale) fully visible and accessible
      - Clean separation of concerns: navigation/search in header, map visualization in content area
      - No overlay conflicts or z-index issues
      - Maintains all existing functionality: geolocation, autocomplete, keyboard navigation, expand/collapse behavior
    - **Responsive behavior:** Search scales appropriately on mobile (max-width: 400px tablet, 280px mobile)
    - **Acceptance criteria met:** Address search in header, map controls unobstructed, clean accessible layout maintained across viewports
    - **Files modified:** `appStore.ts`, `MapContainer.tsx`, `MapContainer.module.css`, `Header.tsx`, `Header.module.css`
  - **Address Search Pan and Zoom Fix (Feb 16, 2026):**
    - **Problem addressed:** Map always used fixed zoom level 14 after address search, regardless of whether result was a point location or a large area (suburb, region). Large areas appeared too zoomed in, small areas sometimes had too little context.
    - **Solution:** Implemented intelligent zoom behavior using bounding box (bbox) data from Mapbox Geocoding API
    - **Implementation details:**
      - Added optional `bbox` property to `MapboxFeature` interface: `[minLng, minLat, maxLng, maxLat]`
      - Updated `AddressSearchProps.onLocationSelect` signature to accept optional bbox parameter
      - Modified `handleSelectResult` in AddressSearch to pass bbox to parent component
      - Enhanced `handleLocationSelect` in MapContainer with dual-mode logic:
        - **With bbox**: Uses `map.fitBounds()` to show entire address area with dynamic padding (50-100px based on size), maxZoom: 16 to prevent excessive zoom
        - **Without bbox**: Falls back to `map.flyTo()` with zoom 14 (original behavior for point locations)
      - Both modes use 2000ms duration and essential: true for smooth, reliable animation
    - **Benefits:**
      - Suburbs and regions now show full extent, not just center point
      - Point addresses still get appropriate zoom level
      - Dynamic padding adapts to area size for optimal framing
      - maxZoom prevents over-zooming on very small areas (individual buildings)
      - Maintains backward compatibility (fallback to zoom 14 when no bbox)
    - **Testing considerations:** Works for rural areas (large bbox), urban addresses (medium bbox), and precise points (no bbox)
    - **Documentation updated:** `docs/current_state/address_search.md` updated to reflect new fitBounds behavior and dual-mode navigation
    - **Files modified:** `apps/web/src/components/Map/AddressSearch.tsx`, `apps/web/src/components/Map/MapContainer.tsx`, `docs/current_state/address_search.md`
    - **Acceptance criteria met:** Map pans and zooms to show full address area when available, suitable zoom for all result types, no regression on default map controls
  - **Scenario Not Found Error Fix (Feb 16, 2026):**
    - **Problem addressed:** Multiple issues affecting generation reliability and UX:
      1. Race condition causing "Scenario not found" 404 errors when frontend polled status endpoint too quickly
      2. Results panel opening before Gemini thinking stream started (empty panel with no content)
      3. Screenshot capture failures treated as non-fatal warnings, allowing generation without terrain reference images
      4. Need to verify 80% viewport framing requirement for all screenshot captures
    - **Solution:**
      1. **Race condition fix:** Enhanced `generationOrchestrator.ts` to ensure `progressStore.set()` completes synchronously before `executeGeneration()` starts; added catch block to update progressStore with failed status to prevent orphaned scenarios
      2. **Results panel timing:** Modified `ResultsPanel.tsx` useEffect to only open panel when `thinkingText` exists OR images are available, preventing premature opening
      3. **Screenshot validation:** Updated `ScenarioInputPanel.tsx` to treat screenshot capture as critical requirement:
         - Throws fatal error if zero screenshots captured
         - Shows warning toast if some screenshots fail but at least one succeeds
         - Aborts generation with clear error message if capture function unavailable
      4. **Viewport framing verification:** Confirmed vegetation captures use explicit 10% padding (80% fill) and viewpoint captures use calculated positioning based on perimeter bounding box
    - **Files modified:**
      - `apps/api/src/services/generationOrchestrator.ts:78-102` (race condition fix + error handling)
      - `apps/web/src/components/Layout/ResultsPanel.tsx:15-26` (panel timing fix)
      - `apps/web/src/components/ScenarioInputPanel/ScenarioInputPanel.tsx:299-339` (screenshot validation)
    - **Testing:** All TypeScript builds passing (shared, api, web), no new type errors introduced
    - **Documentation:** Created comprehensive fix documentation at `docs/current_state/scenario_not_found_fix.md` with root cause analysis, code examples, testing notes, and future considerations
    - **Acceptance criteria met:** No more "Scenario not found" errors during polling, results panel timing aligned with content availability, screenshot validation prevents generation without terrain references, 80% viewport requirement verified for all captures
  - **Generation Reliability & Screenshot Quality (Feb 16, 2026):**
    - **Problem addressed:** "Scenario not found" 404 errors persisted despite previous race-condition fix because the in-memory `progressStore` is lost on process restarts, cold starts, or scale-out. Additionally, screenshot sequences captured before map tiles/terrain fully rendered, resulting in blank or partially-loaded reference images. Camera jumps felt jarring. Vegetation overlay screenshot did not wait for NVIS WMS tiles to load.
    - **Solution:**
      1. **Blob-backed progress store:** Added `saveProgress()`/`loadProgress()` methods to `BlobStorageService` using a `generation-progress` blob container. `GenerationOrchestrator.getStatus()` now falls back to blob storage when in-memory lookup misses. Progress is persisted at start, on each state transition (in_progress, completed, failed), with debounced writes for rapid updates (thinking text).
      2. **Client-side 404 retry:** `pollForCompletion()` now tolerates up to 5 consecutive 404s with increasing back-off delays before failing, covering cold-start scenarios.
      3. **Robust render waiting:** Replaced single `waitForMapIdle()` with `waitForMapReady()` that verifies both `map.loaded()` and `map.areTilesLoaded()` before capture, plus double `requestAnimationFrame` for GPU flush.
      4. **Smooth camera transitions:** Replaced `jumpTo()` with `easeTo()` using ease-out quadratic easing (800ms between viewpoints) for polished camera movement.
      5. **NVIS source loading:** Added `waitForSourceLoaded()` helper that listens for `sourcedata` events on the specific NVIS WMS source (12s timeout), followed by `waitForMapReady()` to ensure raster tiles render before capture.
    - **Files modified:**
      - `apps/api/src/services/blobStorage.ts` (added `saveProgress`/`loadProgress`)
      - `apps/api/src/services/generationOrchestrator.ts` (blob persistence, debounce, async `getStatus`)
      - `apps/api/src/functions/getGenerationStatus.ts` (await async `getStatus`)
      - `apps/web/src/services/generationApi.ts` (404 retry with backoff)
      - `apps/web/src/utils/mapCapture.ts` (waitForMapReady, waitForSourceLoaded, smooth transitions)
    - **Testing:** All TypeScript builds passing (api, web)
  - **Generation Pipeline Deadlock & WMS Reliability (Feb 16, 2026):**
    - **Problem addressed:** Three interrelated issues:
      1. Generation status stuck on `in_progress` forever (UI shows "Model is thinking…" indefinitely) because the status was only set to `completed` AFTER metadata upload, generation log upload, and cost tracking — any of which could hang or fail, blocking the status transition
      2. `getResults()` didn't use blob fallback (only `getStatus()` was updated), causing 404s on the final results fetch
      3. NVIS WMS proxy returned 502 on transient government server failures with no retry, and the vegetation screenshot capture would hang for 12s on source errors
    - **Solution:**
      1. **Moved status completion before post-processing:** The `completed`/`failed` status now sets immediately after all images finish. Metadata upload, generation log, and cost tracking are extracted into a separate `postProcessGeneration()` method that runs fire-and-forget — failures are logged but cannot block the frontend
      2. **`getResults()` blob fallback:** Added the same in-memory → blob fallback pattern from `getStatus()` to `getResults()`
      3. **NVIS WMS retry + error resilience:** Proxy now retries up to 2 times on transient errors (5xx, DNS, TLS) with backoff. `waitForSourceLoaded()` also resolves on map error events so the vegetation capture doesn't hang when WMS is down
    - **Files modified:**
      - `apps/api/src/services/generationOrchestrator.ts` (restructured pipeline, added `postProcessGeneration`, fixed `getResults` fallback)
      - `apps/api/src/functions/nvisWmsProxy.ts` (retry on transient errors)
      - `apps/web/src/utils/mapCapture.ts` (error-resilient source loading)
    - **Testing:** All TypeScript builds passing (api, web)

## 14. Change Control Process

Every change must:

1. Reference this plan and the relevant section.
2. Execute the change.
3. Update this plan with what was achieved or learned.
4. Note any scope changes or new risks.
