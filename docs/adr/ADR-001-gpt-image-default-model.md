# ADR-001: Choice of GPT-Image (DALL-E 3) as Default Model

**Status:** Accepted

**Date:** 2026-02-15

## Context

The Fire Simulation Inject Tool requires AI-powered image generation to create realistic bushfire visuals from text prompts. Several options were evaluated:

1. **Azure OpenAI DALL-E 3** — Microsoft's hosted service, integrated with Azure ecosystem
2. **Stable Diffusion XL (SDXL)** — Open-source model with ControlNet support for spatial control
3. **Midjourney** — High-quality commercial service, API access limited
4. **Stable Image Core (AI Foundry)** — Azure AI Foundry hosted model, newer service

The MVP needs to deliver quickly with reliable results while maintaining integration with the agency's Azure environment.

## Decision

We will use **Azure OpenAI DALL-E 3** as the default image generation model for the MVP.

## Rationale

**Advantages:**
- **Fast integration**: Native Azure OpenAI SDK, managed identities, Key Vault integration
- **Reliability**: Microsoft SLA, proven uptime, automatic scaling
- **Security**: Data stays in tenant, no third-party API calls, Azure compliance
- **Quality**: DALL-E 3 produces high-quality, photorealistic outputs
- **Documentation**: Extensive Azure OpenAI documentation and support
- **Cost predictable**: Clear per-image pricing, usage quotas, cost management tools

**Trade-offs:**
- Less spatial control than SDXL + ControlNet (can't precisely place fire in specific areas)
- Higher per-image cost (~$0.04-0.08 vs ~$0.01 for self-hosted SDXL)
- Limited customization options (can't fine-tune model)
- Dependent on Azure OpenAI regional availability
- 1024x1024 resolution limit (not 4K)

## Consequences

**Positive:**
- Rapid MVP delivery (integration takes days, not weeks)
- Reliable service with Microsoft support
- Simplified infrastructure (no model hosting, GPU management)
- Consistent with agency Azure adoption strategy
- Easy to monitor costs and usage

**Negative:**
- Higher operational costs at scale (mitigated by quota management)
- Limited spatial precision (fire placement approximate, not pixel-perfect)
- Resolution constraints (acceptable for training use case)
- Vendor lock-in to Azure OpenAI (mitigated by modular design)

**Mitigation strategies:**
1. **Modular design**: Abstract image generation behind service interface for future model swaps
2. **Phase 2 planning**: SDXL + ControlNet integration planned for enhanced spatial control
3. **Cost management**: Per-user quotas, lifecycle policies, cost alerts
4. **Quality fallback**: Prompt engineering and reference images for consistency

## Future Considerations

- **Phase 2**: Integrate SDXL + ControlNet for mask-based fire placement and depth-aware generation
- **Phase 3**: Evaluate emerging models (Stable Diffusion 3, future DALL-E versions)
- **Cost optimization**: Self-hosted models if usage scales beyond $1000/month
- **Hybrid approach**: DALL-E for speed, SDXL for precision when needed

## References

- Azure OpenAI Service: https://azure.microsoft.com/en-us/products/ai-services/openai-service
- DALL-E 3 documentation: https://platform.openai.com/docs/guides/images
- Phase 2 roadmap: [docs/roadmap.md](../roadmap.md)
- Technical considerations: [docs/tech_considerations.md](../tech_considerations.md)
