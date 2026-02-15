# Quality Gates & Testing Standards

This document defines the quality standards and acceptance criteria for the Bushfire Simulation Inject Tool MVP.

## Overview

Quality gates ensure that the system produces reliable, credible, and consistent outputs suitable for fire service training. These gates are checked through automated tests, manual validation, and trainer feedback.

## Testing Categories

### 1. Unit Tests

**Target:** Core logic verification
**Tools:** Vitest
**Coverage:** Non-blocking (informational only during MVP)

#### Shared Package (120 tests)

- ✅ Prompt generator logic
- ✅ Fire danger calculations
- ✅ Type validation and serialization
- ✅ Vegetation descriptor mapping
- ✅ Intensity-to-visual mapping
- ✅ Time-of-day lighting

#### API Package (72 tests)

- ✅ Cost estimation calculations
- ✅ Consistency validation logic
- ⏳ Image generator retry logic (planned)
- ⏳ Geodata fallback behavior (planned)
- ⏳ Generation orchestrator state management (planned)

#### Web Package (21 tests)

- ✅ State management (Zustand store)
- ✅ Scenario state transitions
- ⏳ Input form validation (planned)
- ⏳ Preset loading (planned)

**Status:** 213 tests passing across all packages

### 2. Integration Tests

**Target:** Service interaction verification
**Tools:** Vitest + Mock Service Worker (MSW)
**Execution:** Manually triggered or scheduled

#### Planned Integration Tests

- ⏳ Geodata pipeline with recorded responses
- ⏳ Prompt pipeline end-to-end
- ⏳ Image generation with mocked Azure OpenAI
- ⏳ Full orchestration with mocked services

**Status:** Not yet implemented (planned for post-MVP)

### 3. End-to-End Tests

**Target:** Full scenario generation workflows
**Tools:** Playwright or Cypress
**Execution:** Manually triggered (requires Azure resources)

#### Standard Test Scenarios

Four scenarios for comprehensive E2E testing:

| ID      | Scenario                   | Location       | Type         | Intensity | Time      | Expected Outputs                               |
| ------- | -------------------------- | -------------- | ------------ | --------- | --------- | ---------------------------------------------- |
| E2E-001 | Blue Mountains forest fire | -33.72, 150.31 | Forest       | Very High | Afternoon | 5+ images, correct vegetation, no safety flags |
| E2E-002 | Western Plains grassfire   | -32.5, 148.0   | Grassland    | Moderate  | Midday    | 5+ images, fast ROS, appropriate flame heights |
| E2E-003 | South Coast interface fire | -35.7, 150.2   | Forest/Urban | High      | Dusk      | 5+ images, interface features, dusk lighting   |
| E2E-004 | Night operation            | -33.8, 150.1   | Forest       | Moderate  | Night     | 5+ images, night lighting, fire glow           |

**Status:** Scenarios defined, implementation pending

## MVP Quality Gates

### Gate 1: Prompt Quality

**Status:** ✅ ACHIEVED
**Criteria:**

- ✅ All required sections present: **100%**
- ✅ No blocked terms: **0 violations**
- ✅ RFS terminology: **≥3 terms per prompt**
- ✅ Viewpoint descriptions differ: **Verified in tests**

**Evidence:**

- 24 prompt generator tests passing
- Automated checks for blocked terms
- Template validation ensures all sections included

### Gate 2: Generation Reliability

**Target:** ≥90% success rate
**Status:** ⏳ PENDING (requires live testing)

**Criteria:**

- ⏳ At least 4 of 5 images succeed per scenario
- ⏳ Average generation time < 2 minutes for 5 images
- ⏳ No content safety failures on standard test scenarios

**Measurement:**

- Track generation metrics in Application Insights
- Monitor success/failure rates
- Measure end-to-end latency

### Gate 3: Visual Consistency

**Target:** ≥70% consistency score
**Status:** ✅ FRAMEWORK READY

**Criteria:**

- ✅ Consistency validator implemented
- ✅ Automated checks for smoke direction, lighting, color palette
- ⏳ Validation against generated images (requires live testing)

**Components:**

- Smoke direction alignment: 30% weight
- Fire size proportionality: 20% weight
- Lighting consistency: 25% weight
- Color palette similarity: 25% weight

### Gate 4: Test Coverage

**Status:** ✅ ACHIEVED (with non-blocking enforcement)
**Criteria:**

- ✅ Test infrastructure in place
- ✅ 213 unit tests across all packages
- ✅ Coverage reporting configured
- ✅ Non-blocking thresholds (as per agent instructions)

**Coverage:**

- Shared: 120 tests
- API: 72 tests
- Web: 21 tests

**Note:** Coverage thresholds are informational only until MVP completion.

### Gate 5: Code Quality

**Status:** ✅ ACHIEVED
**Criteria:**

- ✅ TypeScript strict mode enabled
- ✅ ESLint configuration in place
- ✅ Prettier formatting enforced
- ✅ CI workflow for automated checks

**Tools:**

- TypeScript 5.3+
- ESLint with TypeScript rules
- Prettier
- GitHub Actions

## Trainer Validation Workflow

### Feedback Collection

**Status:** ⏳ PLANNED

#### Feedback Metrics

For each generated image, trainers rate:

1. **Realism** (1-5 stars)
   - Does it look like a real photograph?
   - Are the fire characteristics believable?

2. **Accuracy** (1-5 stars)
   - Does it match the specified location and conditions?
   - Are the vegetation and terrain correct?

3. **Usefulness** (1-5 stars)
   - Would you use this in training?
   - Does it provide value for scenario-based learning?

4. **Comments** (free text)
   - What works well?
   - What could be improved?

#### Target Satisfaction

**Minimum:** Average ≥3.5/5 across all dimensions
**Goal:** Average ≥4.0/5

#### Implementation Plan

- ⏳ Add feedback UI to image cards in results panel
- ⏳ Create `POST /api/scenarios/{id}/feedback` endpoint
- ⏳ Store feedback alongside scenario metadata in Blob Storage
- ⏳ Build feedback dashboard for admin review

### Feedback Storage Format

```json
{
  "scenarioId": "uuid",
  "imageUrl": "blob-url",
  "trainerId": "user-id",
  "timestamp": "ISO-8601",
  "ratings": {
    "realism": 4,
    "accuracy": 5,
    "usefulness": 4
  },
  "comments": "Excellent depiction of crown fire behavior...",
  "metadata": {
    "viewpoint": "aerial",
    "intensity": "veryHigh",
    "timeOfDay": "afternoon"
  }
}
```

## Performance Benchmarks

### Generation Performance

| Metric                  | Target       | Status                |
| ----------------------- | ------------ | --------------------- |
| Single image generation | < 15 seconds | ⏳ Pending            |
| 5-image scenario        | < 2 minutes  | ⏳ Pending            |
| Geodata lookup          | < 3 seconds  | ⏳ Pending            |
| Prompt generation       | < 1 second   | ✅ Fast (synchronous) |

### Cost Benchmarks

| Configuration                | Target Cost   | Estimated Cost |
| ---------------------------- | ------------- | -------------- |
| 5 images (Stable Image Core) | < $0.50       | ~$0.17         |
| 5 images (DALL-E 3 Standard) | < $0.50       | ~$0.20         |
| 5 images + 2 videos          | < $1.50       | ~$1.17         |
| Storage (10 MB)              | < $0.01/month | ~$0.0002/month |

**Status:** Cost estimator implemented and tested

## Continuous Improvement

### Monitoring Strategy

1. **Application Insights**
   - Track generation latency
   - Monitor error rates
   - Log prompt quality scores

2. **Usage Metrics**
   - Scenarios created per week
   - Most common parameter combinations
   - Popular viewpoint selections

3. **Feedback Analysis**
   - Track trainer satisfaction trends
   - Identify common issues
   - Refine prompts based on low-rated outputs

### Iteration Cycle

1. Collect data (1-2 weeks)
2. Analyze feedback and metrics
3. Identify improvement opportunities
4. Update prompts/models
5. A/B test changes
6. Deploy improvements

## Quality Assurance Checklist

### Pre-Release

- [x] All unit tests passing
- [x] TypeScript compilation clean
- [x] Linting rules enforced
- [x] CI pipeline configured
- [ ] Integration tests passing
- [ ] E2E smoke test successful
- [ ] Cost estimates validated
- [ ] Security review complete

### Post-Release (First Week)

- [ ] Monitor generation success rate
- [ ] Track average generation time
- [ ] Collect initial trainer feedback
- [ ] Review logs for errors
- [ ] Validate cost projections

### Post-Release (First Month)

- [ ] Analyze 100+ generated scenarios
- [ ] Review trainer satisfaction scores
- [ ] Assess prompt quality metrics
- [ ] Plan first iteration improvements

## Escalation Criteria

### Critical Issues (Immediate Action)

- Content safety failures
- Generation success rate < 50%
- Security vulnerabilities
- Cost overruns > 200% of estimates

### High Priority (Review within 24 hours)

- Generation success rate < 80%
- Average satisfaction < 3.0
- Consistent prompt quality issues
- Performance degradation > 50%

### Medium Priority (Review weekly)

- Generation success rate < 90%
- Average satisfaction < 3.5
- Cost overruns 50-200%
- Minor quality inconsistencies

## Success Metrics Summary

### Technical Success

- ✅ 213 unit tests passing
- ✅ Prompt quality gates defined
- ✅ Consistency validation framework
- ⏳ E2E test scenarios defined
- ⏳ Integration test framework (planned)

### User Success (Pending Live Testing)

- ⏳ ≥90% generation success rate
- ⏳ < 2 minute average generation time
- ⏳ ≥3.5/5 trainer satisfaction
- ⏳ ≥70% visual consistency score

### Business Success

- ✅ Cost estimation framework
- ⏳ Cost per scenario < $0.50 (to be validated)
- ⏳ Scenarios created per week (to be measured)

## Appendices

### A. Test Execution Guide

See `README.md` in the repository root for instructions on running tests.

### B. Feedback Collection Guide

(To be created when feedback UI is implemented)

### C. Monitoring Dashboard

(To be created when Application Insights integration is complete)

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-15  
**Status:** MVP Quality Gates Defined, Partially Implemented
