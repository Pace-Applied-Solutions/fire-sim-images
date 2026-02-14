# Master Plan: NSW RFS Bushfire Simulation Inject Tool

This is the single source of truth for project context, scope, and execution. Every issue and update must reference this plan, execute against it, and then update this plan with what was achieved.

**Source documents**

- Background research: [docs/background.md](docs/background.md)
- Technical considerations: [docs/tech_considerations.md](docs/tech_considerations.md)
- Seed issues: [docs/suggested_issues.md](docs/suggested_issues.md)

## Project Description (Intent, Problem, Architecture)

NSW RFS trainers need realistic, location-specific visuals to help crews and incident management teams practice decision-making under bushfire conditions. Today, most exercises rely on abstract maps, static photos, or manual composition of visuals, which makes it slow to create injects and hard to ensure the fire depiction matches the real terrain, fuels, and weather. The intent of this project is to close that gap by providing a fast, repeatable way to generate credible bushfire imagery and short clips that are grounded in real NSW landscapes and aligned with RFS terminology and doctrine.

The problem we are solving is twofold: speed and fidelity. Speed means a trainer can sketch a perimeter and quickly produce multiple views that feel like real observations from the fireground. Fidelity means those outputs respect the actual vegetation type, terrain slope, and weather conditions so the visuals do not mislead trainees. The tool is not intended to replace physics-based fire simulators; instead it creates visual injects that complement existing operational planning tools and improve training immersion. By anchoring each scenario to authoritative datasets (vegetation, elevation, imagery) and structuring prompts with fire behavior parameters, the outputs remain credible and consistent with how NSW RFS describes and assesses fire behavior.

The architecture is a lightweight, modular pipeline hosted in Azure. A React web front-end, hosted on Azure Static Web Apps, provides a 3D map where trainers draw the fire perimeter and set scenario inputs like wind, temperature, humidity, time of day, and qualitative intensity. The back-end API runs as embedded Azure Functions within the Static Web App at the `/api` endpoint. This API enriches the scenario by querying geospatial datasets to derive vegetation type, elevation, slope, and nearby context. A prompt builder converts this structured data into consistent, multi-view descriptions tailored to different perspectives (aerial, ground, ridge). The image generation layer uses Azure OpenAI (DALL-E 3) for rapid integration, with the option to use SDXL with ControlNet for precise spatial alignment when a mask or depth map is needed. Generated images are stored in Azure Blob Storage with access managed via managed identities and returned to the client. For motion, a short image-to-video step (SVD or a third-party service) creates a 4 to 10 second looping clip; longer videos can be produced later by stitching or chaining segments. Security is enforced through Azure Key Vault for secrets management and managed identities for service-to-service authentication.

Key architectural principles include keeping data within the NSW RFS Azure environment, favoring NSW and national datasets for geographic accuracy, and maintaining model modularity so newer AI services can be swapped in as they mature. This allows the system to start small and reliable, then evolve toward higher fidelity and longer-duration outputs without reworking the entire stack. The end result is a practical training tool that can quickly generate credible fireground visuals, improve scenario realism, and support consistent, repeatable training outcomes.

## 1. Vision and Outcomes

**Goal:** Enable NSW RFS trainers to draw a fire perimeter on a real map, set scenario conditions, and generate photorealistic images and short video clips that represent the fire in its real landscape context.

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

- Use authoritative NSW and national datasets where possible.
- Prioritize geographic accuracy over artistic style.
- Keep data within the NSW RFS Azure environment.
- Design for modular model swaps and future upgrades.
- Outputs must be safe, credible, and consistent with RFS training doctrine.

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

- Keep all data in the NSW RFS Azure environment.
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
- DEM or elevation tiles (NSW Elevation and Depth service).
- Base imagery (NSW Spatial Services, Sentinel-2, etc.).

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

These align with [docs/suggested_issues.md](docs/suggested_issues.md) and serve as the master work list.

1. Project setup and requirements.
2. Front-end mapping interface.
3. Geospatial data integration.
4. Prompt generation logic.
5. AI image generation.
6. Multi-perspective rendering.
7. Video generation pipeline.
8. Testing and iteration.
9. Infrastructure and security.
10. Future enhancements and roadmap.

## 11. Deliverables

- Deployed front-end with map drawing and scenario inputs.
- Azure Functions API for generation.
- Geodata integration module and prompt builder.
- Image and video generation pipeline.
- Storage and retrieval via Blob Storage.
- Admin-ready security and monitoring.
- Living documentation and issue templates.

## 12. Quality and Safety Guardrails

- Prompts use RFS terminology and avoid unsafe or ambiguous language.
- Output validation includes manual review and optional automated checks.
- No depiction of people or animals in fire scenes unless explicitly required.

## 13. Progress Tracking (Living Section)

Update this section after each issue or change.

- **Current focus:** Phase 0 - Infrastructure setup (Issue 9)
- **Completed milestones:**
  - Added one-page project description and technical guidance to the master plan
  - **Phase 0 complete:** Project scaffolding and repository structure (Issue 1)
    - Monorepo structure with npm workspaces
    - Shared types package (@fire-sim/shared) with core domain types
    - React web app (apps/web) with Vite + TypeScript
    - Azure Functions API (apps/api) with v4 programming model
    - Development tooling (ESLint, Prettier, TypeScript strict mode)
    - Updated README with comprehensive setup instructions
  - **Infrastructure as Code:** Bicep templates for Azure deployment (Issue 9)
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
- **Open risks:**
  - Azure Functions Core Tools must be installed separately by developers (not available via npm in sandboxed environments)
  - Azure OpenAI availability varies by region; may need fallback to East US 2
- **Next milestone:** Phase 1 - Map interface and scenario inputs

## 14. Change Control Process

Every change must:

1. Reference this plan and the relevant section.
2. Execute the change.
3. Update this plan with what was achieved or learned.
4. Note any scope changes or new risks.
