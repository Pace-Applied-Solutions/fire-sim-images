# Copilot Instructions

Purpose: Keep all work aligned to the master plan and the project vision.

## Always Do

- Read the master plan before making changes: [docs/master_plan.md](docs/master_plan.md).
- Use the master plan as the source of truth for scope, phases, and decisions.
- After completing any change, update the master plan progress section with what was achieved.
- When starting an issue, confirm which master plan section(s) it maps to.

## Context Sources

- Background research: [docs/background.md](docs/background.md)
- Technical considerations: [docs/tech_considerations.md](docs/tech_considerations.md)
- Infrastructure documentation: [infra/README.md](infra/README.md)

## Architecture

- **Static Web App** hosts the React front-end and embedded Azure Functions API at `/api`
- **Azure Blob Storage** stores generated images, videos, and scenario data
- **Azure Key Vault** manages API keys and secrets
- **Azure OpenAI** provides image generation via DALL-E 3
- **Managed identities** handle service-to-service authentication
- All resources deployed via Bicep templates in `infra/`

## Guardrails

- Prefer authoritative regional and national datasets.
- Prioritize geographic accuracy over artistic style.
- Keep outputs safe, credible, and aligned with fire service terminology.
- Maintain modularity so models and services can be swapped later.
- All data stays within the target agency's Azure environment.

## Technical Guidance (Best Practices)

- Design for fast, end-to-end scenario generation with clear UI states.
- Keep the interface modern, intentional, and high quality with strong typography, color, and motion choices.
- Favor reliability: async workflows, retries with backoff, and explicit timeouts.
- Log model inputs/outputs and version prompts for reproducibility.
- Enforce security: Key Vault for secrets, least-privilege identities, and in-tenant data flows.
- Monitor latency, cost per scenario, and error rates from the start.
- Provide sensible defaults and guardrails so trainers can generate credible outputs quickly.
- Use managed identities over connection strings for Azure service authentication.
