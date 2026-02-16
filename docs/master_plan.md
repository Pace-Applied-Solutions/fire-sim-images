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
    - Added AzureWebJobsStorage__accountName setting for Flex Consumption validation in CI/CD
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

## 14. Change Control Process

Every change must:

1. Reference this plan and the relevant section.
2. Execute the change.
3. Update this plan with what was achieved or learned.
4. Note any scope changes or new risks.
