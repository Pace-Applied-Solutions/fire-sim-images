# ADR-005: Prompt Template Versioning Strategy

**Status:** Accepted

**Date:** 2026-02-15

## Context

The Fire Simulation Inject Tool generates AI prompts that combine:

- Geographic context (vegetation type, elevation, terrain)
- Fire behavior parameters (intensity, stage, wind, weather)
- Perspective descriptions (aerial, helicopter, ground views)
- Fire service terminology (head fire, crown fire, spotting, pyrocumulus)
- Safety constraints (no people, no text, no misleading elements)

These prompts are critical to output quality. Changes to prompts can significantly affect:

- Visual consistency across scenarios
- Realism and accuracy
- Ability to reproduce previous results
- Training effectiveness

We need a strategy for:

1. Versioning prompt templates
2. Tracking which version generated each image
3. Evolving prompts without breaking existing scenarios
4. Comparing results across prompt versions
5. Rolling back if a prompt change degrades quality

## Decision

We will implement **explicit prompt template versioning** with the following strategy:

- **Semantic versioning** for prompt templates (major.minor.patch)
- **Version metadata** stored with every generated image
- **Multiple concurrent versions** supported for A/B testing
- **Immutable templates** once deployed to production
- **Version pinning** in scenarios for reproducibility

## Rationale

**Version format:**

```
v{major}.{minor}.{patch}

v1.0.0 — Initial MVP prompts
v1.1.0 — Added time-of-day lighting descriptions
v1.1.1 — Fixed typo in "established fire" terminology
v2.0.0 — Complete prompt restructure with new template system
```

**Versioning rules:**

- **Major**: Breaking changes to prompt structure or complete rewrites
- **Minor**: New features (new perspectives, new intensity levels, new terms)
- **Patch**: Bug fixes, typos, minor wording improvements

**Template structure:**

```typescript
export const PROMPT_TEMPLATES = {
  'v1.0.0': {
    aerial: (context) => `...`,
    ground: (context) => `...`,
    // ... other perspectives
  },
  'v1.1.0': {
    aerial: (context) => `...`,
    ground: (context) => `...`,
    // ... improved versions
  },
};

export const DEFAULT_PROMPT_VERSION = 'v1.1.0';
```

**Metadata tracking:**

```typescript
interface GenerationResult {
  images: Array<{
    url: string;
    perspective: string;
    promptVersion: string; // "v1.1.0"
    prompt: string; // Full prompt used
    modelVersion: string; // "dall-e-3"
    seed: number;
  }>;
}
```

**Advantages:**

- **Reproducibility**: Know exactly which prompt version generated each image
- **A/B testing**: Compare v1.0.0 vs v1.1.0 outputs side-by-side
- **Rollback safety**: Revert to previous version if new prompts degrade quality
- **Evolution tracking**: Understand how outputs improve over time
- **Debugging**: Identify which prompt version caused issues
- **Documentation**: Changelog explains what changed in each version

**Trade-offs:**

- Code complexity (must maintain multiple template versions)
- Storage overhead (store prompt version with every image)
- Migration overhead (must explicitly bump version, can't hot-fix prompts)

## Consequences

**Positive:**

- **Confidence**: Can evolve prompts without fear of breaking existing scenarios
- **Comparison**: Trainers can regenerate with different prompt versions to compare
- **Audit trail**: Complete record of what changed and why
- **Quality control**: A/B test prompt changes before rolling out to all users
- **Reproducibility**: Can regenerate exact same output years later

**Negative:**

- **Template proliferation**: Must keep old versions around forever (or migrate data)
- **Testing burden**: Must test new versions across all perspectives and intensities
- **Default version management**: Must decide when to update default version
- **Storage overhead**: ~50 bytes per image for version metadata

**Implementation details:**

1. **Template storage:**

   ```
   packages/shared/src/prompts/
   ├── v1.0.0/
   │   ├── aerial.ts
   │   ├── ground.ts
   │   └── index.ts
   ├── v1.1.0/
   │   ├── aerial.ts
   │   ├── ground.ts
   │   └── index.ts
   └── index.ts  # Exports all versions
   ```

2. **Version selection:**

   ```typescript
   // Use default version
   const prompt = generatePrompt(context, 'aerial');

   // Use specific version
   const prompt = generatePrompt(context, 'aerial', { version: 'v1.0.0' });
   ```

3. **Changelog maintenance:**

   ```markdown
   # Prompt Template Changelog

   ## v1.1.0 (2026-02-20)

   - Added time-of-day lighting descriptions
   - Improved smoke color descriptors
   - Added Australian vegetation terminology

   ## v1.0.0 (2026-02-15)

   - Initial prompt templates
   - 6 intensity levels
   - 12 perspective types
   ```

4. **Migration strategy:**
   - Old scenarios keep their prompt version forever
   - New scenarios use current default version
   - Admin can set default version via configuration
   - UI can offer "Regenerate with latest prompts" option

## Prompt Evolution Workflow

**Adding a new feature (minor version):**

1. Create new directory: `prompts/v1.2.0/`
2. Copy templates from `v1.1.0/`
3. Make changes to templates
4. Update `DEFAULT_PROMPT_VERSION` in code
5. Test thoroughly across all perspectives
6. Deploy with feature flag (optional)
7. Monitor quality for 1 week
8. If successful, remove feature flag

**Fixing a bug (patch version):**

1. Create new directory: `prompts/v1.1.1/`
2. Copy templates from `v1.1.0/`
3. Fix the bug
4. Update `DEFAULT_PROMPT_VERSION`
5. Deploy immediately (bug fixes are low-risk)

**Major rewrite (major version):**

1. Create new directory: `prompts/v2.0.0/`
2. Rewrite from scratch
3. Extensive testing with multiple scenarios
4. A/B test with select users
5. Gradual rollout (20% → 50% → 100%)
6. Update default version after 2 weeks of validation

## Alternatives Considered

### Git-based versioning

**Rejected because:**

- Requires git SHA lookup at runtime
- Can't have multiple versions in production simultaneously
- Harder to understand than semantic versioning
- No clear rollback mechanism

### Database-stored prompts

**Rejected because:**

- Adds database dependency
- Prompts are code, belong in version control
- Harder to review changes (no PR diff)
- Risk of prod database edit breaking all generations

### No versioning (hot-fix prompts)

**Rejected because:**

- No reproducibility (can't regenerate old scenarios)
- No rollback (can't undo bad changes)
- No A/B testing (can't compare versions)
- Risky evolution (one bad change breaks all generations)

### Prompt hashing

**Rejected because:**

- Hash doesn't convey meaning (what changed?)
- No semantic versioning benefits
- Harder to debug (hash doesn't explain version)
- Still need version management, just obscured

## Future Considerations

- **Prompt library**: Curated collection of proven prompt variations
- **User-generated prompts**: Allow trainers to customize prompts (advanced feature)
- **AI-generated prompts**: Use GPT-4 to generate prompt variations
- **Localization**: Multiple language versions of prompts
- **A/B testing framework**: Automated quality comparison across versions
- **Deprecation policy**: Archive versions older than 2 years (after data migration)

## References

- Semantic Versioning: https://semver.org/
- Prompt engineering best practices: https://platform.openai.com/docs/guides/prompt-engineering
- Master plan: [docs/master_plan.md](../master_plan.md)
- Prompt quality standards: [docs/prompt_quality_standards.md](../prompt_quality_standards.md)
