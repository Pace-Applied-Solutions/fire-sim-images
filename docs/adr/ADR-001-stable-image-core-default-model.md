# ADR-001: Choice of Stable Image Core via Azure AI Foundry as Default Model

**Status:** Accepted

**Date:** 2026-02-15

## Context

The Fire Simulation Inject Tool requires AI-powered image generation to create realistic bushfire visuals from text prompts. Several options were evaluated:

1. **Azure OpenAI DALL-E 3** — Microsoft's hosted service, integrated with Azure ecosystem (not available in required region)
2. **Stable Diffusion XL (SDXL)** — Open-source model with ControlNet support for spatial control
3. **Stable Image Core (AI Foundry)** — Azure AI Foundry hosted model from Stability AI
4. **Flux** — Newer open-source model with high quality and speed
5. **Midjourney** — High-quality commercial service, API access limited

The MVP needs to deliver quickly with reliable results while maintaining integration with the agency's Azure environment. Azure OpenAI DALL-E 3 is not available in all required Azure regions.

## Decision

We will use **Stable Image Core via Azure AI Foundry** as the default image generation model for the MVP, with **Flux** as a fallback option when configured.

## Rationale

**Advantages:**

- **Azure integration**: Runs on Azure AI Foundry (AIServices) with managed identities and Key Vault support
- **Model quality**: Stable Image Core from Stability AI provides high-quality, photorealistic outputs
- **Regional availability**: Available in more Azure regions than Azure OpenAI DALL-E 3
- **Cost predictable**: Clear per-image pricing, usage quotas, cost management tools
- **Flexibility**: Built-in support for multiple providers (Stable Image Core, Flux) with automatic failover
- **Security**: Data stays in tenant, no third-party API calls, Azure compliance
- **Open-source friendly**: Uses Stability AI's models with open licensing

**Trade-offs:**

- Newer service than Azure OpenAI (less mature ecosystem)
- Slightly more complex setup than DALL-E (requires AI Foundry project)
- Less spatial control than SDXL + ControlNet (can't precisely place fire in specific areas)
- Resolution limits (1024x1024 standard)

## Consequences

**Positive:**

- Rapid MVP delivery with Azure-native solution
- Regional flexibility (not limited to Azure OpenAI availability)
- Multi-provider architecture allows swapping models easily
- Cost-effective with predictable pricing
- Simplified infrastructure (managed service, no GPU management)
- Consistent with agency Azure adoption strategy

**Negative:**

- Limited spatial precision (fire placement approximate, not pixel-perfect)
- Resolution constraints (acceptable for training use case)
- Newer service may have less community support
- Requires AI Foundry project setup

**Mitigation strategies:**

1. **Modular design**: Abstract image generation behind provider interface for future model swaps
2. **Flux fallback**: System automatically uses Flux if configured and Foundry unavailable
3. **Phase 2 planning**: SDXL + ControlNet integration planned for enhanced spatial control
4. **Cost management**: Per-user quotas, lifecycle policies, cost alerts

**Implementation Details:**

Provider architecture:

```typescript
interface ImageGenerationProvider {
  generateImage(prompt: string, options: ImageGenOptions): Promise<ImageGenResult>;
}

// Primary: Stable Image Core via AI Foundry
class StableDiffusionProvider implements ImageGenerationProvider {}

// Fallback: Flux (if configured)
class FluxImageProvider implements ImageGenerationProvider {}
```

Configuration (via Key Vault or environment variables):

- `FOUNDRY_PROJECT_PATH`: Azure AI Foundry project path
- `FOUNDRY_PROJECT_REGION`: Project region (eastus)
- `FOUNDRY_IMAGE_MODEL`: Model name (stable-image-core)
- `FLUX_ENDPOINT`: Flux API endpoint (optional fallback)
- `FLUX_API_KEY`: Flux API key (optional fallback)

Automatic failover:

1. Try Stable Image Core via AI Foundry
2. If Foundry unavailable and Flux configured, use Flux
3. If both unavailable, return error with clear message

## Future Considerations

- **Phase 2**: Integrate SDXL + ControlNet for mask-based fire placement and depth-aware generation
- **Phase 3**: Evaluate emerging models (Stable Diffusion 3, Flux Pro, future versions)
- **Azure OpenAI**: Switch to DALL-E if it becomes available in required regions
- **Cost optimization**: Self-hosted models if usage scales beyond budget
- **Hybrid approach**: Stable Image Core for speed, SDXL for precision when needed

## References

- Azure AI Foundry: https://azure.microsoft.com/en-us/products/ai-studio
- Stability AI: https://stability.ai/
- Stable Image Core: https://platform.stability.ai/docs/api-reference
- Flux: https://github.com/black-forest-labs/flux
- Phase 2 roadmap: [docs/roadmap.md](../roadmap.md)
- Technical considerations: [docs/tech_considerations.md](../tech_considerations.md)
