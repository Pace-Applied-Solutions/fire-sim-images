🧩 Issue #1: Project Setup & Requirements

Objective:
Establish the foundational infrastructure, access, and scope for the bushfire simulation inject tool.

Main Steps:

Define user roles (e.g. trainer, admin).
Set up Azure Static Web App, Azure Functions, and Blob Storage.
Request access to Azure OpenAI (if using DALL·E 3 or GPT-Image).
Identify and document NSW geospatial data sources (vegetation, elevation).
Create initial GitHub repo structure and add background.md.
Considerations:

Ensure Azure region selection supports required services (e.g. GPU-backed Functions or Container Apps).
Consider future integration with Azure AD for authentication.
Success Criteria:

Azure environment provisioned and accessible.
GitHub repo initialised with background.md and master-plan.md.
All required API keys and service access confirmed.

🗺️ Issue #2: Front-End Mapping Interface

Objective:
Develop the interactive 3D map interface for drawing fire perimeters and setting scenario parameters.

Main Steps:

Integrate Mapbox GL JS (or Azure Maps) with 3D terrain and contour overlays.
Implement polygon drawing tool for fire perimeter.
Add UI controls for weather, fire behaviour, and time of day.
Capture and serialise user inputs for backend submission.
Considerations:

Ensure map camera controls can simulate viewpoints (e.g. north, aerial).
Consider capturing map screenshots for use as reference images.
Success Criteria:

Users can draw a fire perimeter and set parameters.
Map renders 3D terrain and contours.
Inputs are correctly packaged for backend API.

🌿 Issue #3: Geospatial Data Integration

Objective:
Extract vegetation and elevation data for the drawn fire perimeter.

Main Steps:

Load or query NSW vegetation dataset (e.g. SEED, BioNet).
Access DEM or contour data for elevation/slope analysis.
Compute dominant vegetation type and terrain characteristics.
Return structured geospatial context to backend.
Considerations:

Evaluate caching or pre-processing options for performance.
Consider fallback if external APIs are unavailable.
Success Criteria:

Given a polygon, backend returns vegetation type and terrain summary.
Data is accurate and performant for typical fire sizes.

🧠 Issue #4: Prompt Generation Logic

Objective:
Translate user inputs and geospatial context into structured prompts for AI models.

Main Steps:

Define prompt templates for different perspectives (e.g. aerial, ground-level).
Incorporate vegetation, terrain, weather, and fire behaviour into prompt.
Optionally use GPT-4 to assist with natural language generation.
Considerations:

Ensure prompts avoid blocked or ambiguous terms (e.g. “explosion”, “violence”).
Plan for localisation (UK English, RFS terminology).
Success Criteria:

Prompts are generated dynamically and produce consistent, realistic outputs.
Prompt structure is modular and testable.

🖼️ Issue #5: AI Image Generation

Objective:
Generate photorealistic fire images using AI models.

Main Steps:

Integrate with Azure OpenAI (DALL·E 3 / GPT-Image) or deploy Stable Diffusion SDXL.
Send prompt and receive image(s).
Store images in Azure Blob Storage.
Return image URLs to frontend.
Considerations:

Evaluate ControlNet or inpainting for spatial control (e.g. fire perimeter masks).
Consider GPU requirements and cost for inference.
Success Criteria:

Images are generated and stored successfully.
Output quality meets training realism expectations.

🔄 Issue #6: Multi-Perspective Rendering

Objective:
Generate multiple views of the same fire scenario (e.g. N/S/E/W, aerial).

Main Steps:

Vary prompts or camera parameters to simulate different perspectives.
Optionally use Mapbox camera to generate reference images.
Ensure visual consistency across perspectives.
Considerations:

Explore using consistent seeds or base images to maintain scene coherence.
Consider future support for user-defined camera positions.
Success Criteria:

At least 4–5 distinct, coherent images are generated per scenario.
Images reflect correct terrain and fire placement.

🎞️ Issue #7: Video Generation Pipeline

Objective:
Generate short animated clips of the fire scenario using image-to-video models.

Main Steps:

Choose model: Runway Gen-2, Pika Labs, or Stable Video Diffusion.
Feed generated image(s) into video model.
Store resulting video in Blob Storage.
Return video URL to frontend.
Considerations:

Runway/Pika may require semi-manual steps or future API access.
Plan for upscaling (e.g. Topaz Video AI, CapCut).
Consider looping or chaining short clips for longer sequences.
Success Criteria:

A 4–10 second video is generated and viewable in the frontend.
Fire and smoke motion is realistic and matches scenario.

🧪 Issue #8: Testing & Iteration

Objective:
Validate the tool’s outputs with trainers and refine for realism and usability.

Main Steps:

Create test scenarios (e.g. grassfire, forest fire, interface fire).
Collect feedback from RFS trainers or SMEs.
Refine prompts, model parameters, and UI based on feedback.
Considerations:

Track generation time and success/failure rates.
Consider adding a feedback form in the UI.
Success Criteria:

Outputs are rated as realistic and useful by trainers.
Prompt and model adjustments improve consistency and quality.

🔐 Issue #9: Infrastructure & Security

Objective:
Secure and scale the Azure deployment for production use.

Main Steps:

Implement Azure AD authentication for Static Web App.
Store secrets in Azure Key Vault.
Enable logging and monitoring (e.g. Application Insights).
Set usage limits or quotas to control cost.
Considerations:

Plan for GPU scaling (e.g. Azure Container Apps, AKS).
Ensure compliance with Azure OpenAI Responsible AI policies.
Success Criteria:

Only authorised users can access the tool.
Logs and metrics are available for usage and error tracking.

🚀 Issue #10: Future Enhancements & Roadmap

Objective:
Define and prioritise next-phase features for the simulation tool.

Main Steps:

Add fire spread simulation (e.g. Spark model or rate-of-spread logic).
Enable longer video generation or sequencing.
Add user controls for camera angles, fire intensity, etc.
Explore new AI models (e.g. Runway Gen-3, OpenAI Sora).
Considerations:

Maintain modularity for easy model swapping.
Consider export formats (e.g. PDF inject packs, PowerPoint slides).
Success Criteria:

Roadmap is documented and prioritised.
At least one enhancement is prototyped or scoped.
