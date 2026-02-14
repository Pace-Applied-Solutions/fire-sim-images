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
- Seed issues: [docs/suggested_issues.md](docs/suggested_issues.md)

## Guardrails

- Prefer NSW and Australian authoritative datasets.
- Prioritize geographic accuracy over artistic style.
- Keep outputs safe, credible, and aligned with RFS terminology.
- Maintain modularity so models and services can be swapped later.

## Technical Guidance (Best Practices)

- Design for fast, end-to-end scenario generation with clear UI states.
- Keep the interface modern, intentional, and high quality with strong typography, color, and motion choices.
- Favor reliability: async workflows, retries with backoff, and explicit timeouts.
- Log model inputs/outputs and version prompts for reproducibility.
- Enforce security: Key Vault for secrets, least-privilege identities, and in-tenant data flows.
- Monitor latency, cost per scenario, and error rates from the start.
- Provide sensible defaults and guardrails so trainers can generate credible outputs quickly.
