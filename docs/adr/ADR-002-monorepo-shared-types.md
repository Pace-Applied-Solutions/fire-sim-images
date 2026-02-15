# ADR-002: Monorepo Structure with Shared Types Package

**Status:** Accepted

**Date:** 2026-02-15

## Context

The Fire Simulation Inject Tool consists of multiple TypeScript applications that need to share common domain types, constants, and utility functions:

- **apps/web** — React front-end (Vite + TypeScript)
- **apps/api** — Azure Functions back-end (Node.js + TypeScript)

Both applications work with the same domain concepts (fire perimeters, scenario inputs, generation results) and need consistent type definitions to prevent drift and runtime errors.

Several approaches were evaluated:

1. **Monorepo with shared package** — npm workspaces, one shared types package
2. **Separate repositories** — Independent repos, types duplicated or published separately
3. **Single repository** — Everything in one app, shared via relative imports
4. **Published shared package** — Shared types published to npm or private registry

## Decision

We will use a **monorepo with npm workspaces** and a dedicated `packages/shared` package containing shared types and constants.

## Rationale

**Structure:**

```
/
├── apps/
│   ├── web/          # React front-end
│   └── api/          # Azure Functions API
└── packages/
    └── shared/       # @fire-sim/shared package
        └── src/
            ├── types.ts       # Domain types
            ├── constants.ts   # Fire service terminology
            └── prompts/       # Prompt templates
```

**Advantages:**

- **Type safety**: Shared types ensure front-end and API use identical interfaces
- **Single source of truth**: Domain types defined once, used everywhere
- **Atomic changes**: Update types in one place, both apps see changes immediately
- **Simplified development**: `npm install` at root installs all dependencies
- **Build optimization**: Shared package built once, consumed by both apps
- **Refactoring confidence**: TypeScript catches breaking changes across apps

**Trade-offs:**

- Slightly more complex build process (must build shared package first)
- Coupling between front-end and API (can't deploy independently without care)
- Requires npm workspaces knowledge for developers

## Consequences

**Positive:**

- **Developer experience**: Simple setup, single `npm install`, consistent commands
- **Type consistency**: `FirePerimeter`, `ScenarioInputs`, etc. identical across codebase
- **Reduced bugs**: Type mismatches caught at compile time, not runtime
- **Faster iterations**: Change type definition once, both apps update
- **Clear dependencies**: Explicit dependency graph via `package.json` workspace references

**Negative:**

- **Build order matters**: Must build `packages/shared` before `apps/api` or `apps/web`
- **Versioning complexity**: Can't version shared types separately (mitigated by monorepo)
- **Initial learning curve**: Developers must understand workspace structure

**Implementation details:**

- Shared package imported as `@fire-sim/shared` in both apps
- Root `package.json` uses `"workspaces": ["apps/*", "packages/*"]`
- Shared package built to `dist/` with TypeScript declaration files
- CI pipeline builds shared package first, then apps
- Type-only imports used where possible to avoid runtime dependencies

## Alternatives Considered

### Separate Repositories

**Rejected because:**

- Type drift between repos (front-end and API diverge)
- Overhead of publishing and versioning shared package
- Slower development (must publish before testing changes)
- Complex CI/CD (coordinate deploys across repos)

### Single Application

**Rejected because:**

- Azure Static Web Apps architecture requires separate web and API builds
- Front-end and API have different runtime environments (browser vs Node.js)
- Harder to scale (can't optimize API and web builds independently)

### Published Shared Package

**Rejected because:**

- Overkill for single-team project
- Slows development (publish → install → test cycle)
- Versioning overhead (semver, deprecation, migration)
- Not needed until multiple teams or external consumers

## Future Considerations

- **Workspace tooling**: Consider Nx or Turborepo for build caching and task orchestration
- **Package splitting**: If shared package grows large, split into `@fire-sim/types`, `@fire-sim/prompts`, etc.
- **External consumers**: If other agencies want to integrate, publish shared package to npm
- **Versioning strategy**: Move to independent versioning if apps need separate release cycles

## References

- npm workspaces: https://docs.npmjs.com/cli/v7/using-npm/workspaces
- TypeScript project references: https://www.typescriptlang.org/docs/handbook/project-references.html
- Master plan architecture: [docs/master_plan.md](../master_plan.md)
