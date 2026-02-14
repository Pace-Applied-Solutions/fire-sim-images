# Optimal AI Models for Wildfire Image and Video Generation

Recent advances in generative AI provide several strong options for creating photorealistic wildfire images and short simulated fire videos. The ideal choice depends on desired realism, level of control (e.g., ability to incorporate a drawn fire perimeter or reference image), and integration constraints (such as using Azure cloud services).

## Image Generation Models

### OpenAI DALL-E 3 and GPT-Image (v1.5)

- **Strengths:** Strong prompt understanding and built-in safety filters [2].
- **Limitations:** No direct spatial control for an exact fire outline; relies on descriptive prompting [2].
- **Integration:** Available via OpenAI API and Azure OpenAI in the Microsoft Foundry environment.
- **Licensing and cost:** Usage-based pricing; commercial use generally allowed under content policies.
- **Suitability:** High-quality results with low integration effort, but not ideal for precise fire placement.

### Stable Diffusion (SDXL) with ControlNet or Inpainting

- **Strengths:** Highly customizable; supports masks, depth maps, and image-to-image workflows [2].
- **ControlNet:** Accepts edge maps, depth maps, or segmentation masks to enforce fire placement.
- **Image-to-image:** Can start from a 3D map screenshot and paint in fire and smoke.
- **Fine-tuning:** Allows domain-specific training on bushfire imagery.
- **Integration:** Self-hosted on Azure GPU infrastructure or via managed endpoints.
- **Licensing:** CreativeML Open RAIL; commercial use allowed with restrictions.
- **Suitability:** Best geospatial control and accuracy at the cost of more engineering effort.

### Midjourney (v5/v6)

- **Strengths:** Cinematic visual quality with minimal prompt tuning [2].
- **Limitations:** No public API; Discord-only workflow makes automation difficult.
- **Licensing:** Commercial use allowed for paid accounts.
- **Suitability:** Best for manual asset creation, not automated pipelines.

### Other Notable Options

- **Adobe Firefly 2:** Good photorealism and inpainting tools, but licensing and API constraints may apply.
- **Leonardo.ai:** Custom models and API access; capability varies by model [8].

**Table 1: Image model comparison**

| Image Model                       | Inputs and Control                                                | Output Quality and Resolution                                  | Deployment and Cost                                     | Suitability for Bushfire Simulation                         |
| --------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| OpenAI DALL-E 3 / GPT-Image (API) | Text prompts; image edits via GPT-Image 1.5; no direct mask input | High-quality 1024x1024 images; may simplify complex scenes [2] | Cloud API (OpenAI/Azure), pay-per-use                   | Strong realism and easy integration; weaker spatial control |
| Stable Diffusion (SDXL)           | Text plus img2img and ControlNet (depth, masks, sketches)         | High photorealism at 1024x1024; upscaling supported            | Self-hosted GPU or managed endpoints; no per-image fees | Best control and geographic accuracy; higher complexity     |
| Midjourney v5/v6                  | Text prompts and optional reference images                        | Very high visual quality; up to 1024px plus upscaling [2]      | SaaS via Discord; subscription pricing                  | Excellent for manual creation, not automation               |
| SDXL + ControlNet (variant)       | Multi-input: text, depth, normals, fire mask                      | Highest alignment to terrain and fire geometry                 | Same as SDXL; requires extra checkpoints                | Best spatial alignment; highest compute cost                |

## Video Generation Models

Generating a full minute of continuous, photoreal wildfire video is still frontier-level. Most models produce a few seconds per run [14], so practical pipelines stitch or loop short clips.

### Runway Gen-2

- **Strengths:** High realism with motion brush and camera controls [7].
- **Limitations:** Web app workflow; no public API as of 2025.
- **Suitability:** Excellent quality for semi-manual workflows; limited automation.

### Pika Labs

- **Strengths:** Good at animating fire and smoke from a still image [1].
- **Limitations:** Discord-only workflow, low resolution, short clips.
- **Suitability:** Quick animated overlays for MVP demonstrations.

### Stable Video Diffusion (SVD)

- **Strengths:** Open-source, self-hosted, easy to integrate into Azure pipelines [5].
- **Limitations:** Short clips, limited control, some flicker.
- **Suitability:** Most practical for internal deployment and short looping clips.

**Table 2: Video model comparison**

| Video Model            | Inputs and Control                                                 | Output Quality and Length                     | Integration and Cost                      | Suitability for Bushfire Simulation        |
| ---------------------- | ------------------------------------------------------------------ | --------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| Runway Gen-2           | Text-to-video or image-to-video; motion brush; camera controls [7] | ~4 sec clips, up to ~16 sec extensions; ~720p | Web app; subscription; enterprise options | Best quality, limited automation           |
| Pika Labs              | Image-to-video; motion degree and aspect controls [1]              | ~3 sec clips; ~576p                           | Discord bot; freemium                     | Good for quick animations; manual workflow |
| Stable Video Diffusion | Text-to-video or image-to-video [5]                                | 14-25 frames, ~4 sec at ~6 fps [4]            | Self-hosted on Azure GPU                  | Best for internal pipelines; short clips   |

## Comprehensive Project Description

We envision a web-based Bushfire Simulation Inject tool that lets fire service trainers create realistic visuals for any location on demand. Trainers draw a perimeter on a 3D map, set environmental conditions, and the system produces:

- Photorealistic images of the fire in context (multiple viewpoints).
- A short animated clip showing fire behavior (looped or stitched for longer playback).

**Front-end mapping app**

- Azure Static Web App hosting a React client with embedded API.
- Mapbox GL JS or Azure Maps with 3D terrain and drawing tools.
- Camera controls for north/south/east/west and aerial views.
- Snapshot capture to seed image-to-image pipelines.

**Back-end generation pipeline**

- Azure Functions embedded at `/api` endpoint within Static Web App (Node.js 20, TypeScript).
- Durable Functions for orchestrating long-running generation tasks.
- Geospatial data retrieval for vegetation, terrain, and context.
- Prompt construction with scenario parameters and viewpoint variants.
- Image generation via Azure OpenAI (DALL-E 3) or SDXL with optional ControlNet.
- Video generation via SVD or a third-party service, output to Blob Storage.
- Managed identities for secure authentication to Key Vault and other Azure services.

For the 10-step implementation roadmap, see [docs/master_plan.md](docs/master_plan.md).
