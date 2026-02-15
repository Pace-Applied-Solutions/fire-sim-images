# Testing Guide

This guide explains how to run tests in the Bushfire Simulation Inject Tool.

## Test Structure

The project uses **Vitest** for all testing across packages:

```
fire-sim-images/
├── packages/shared/        # 120 tests - Core logic
│   └── src/__tests__/
├── apps/api/               # 72 tests - Backend services
│   └── src/__tests__/
└── apps/web/               # 21 tests - Frontend state
    └── src/__tests__/
```

**Total: 213 tests**

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests by Package

```bash
# Shared package tests
npm test --workspace=packages/shared

# API tests
npm test --workspace=apps/api

# Web tests
npm test --workspace=apps/web
```

### Run Tests in Watch Mode

```bash
# All packages
npm run test:watch

# Specific package
npm test --workspace=packages/shared -- --watch
```

### Run Tests with Coverage

```bash
# All packages
npm run test:coverage

# Specific package
npm run test:coverage --workspace=packages/shared
```

## Test Categories

### 1. Unit Tests ✅ (Current)

**Purpose:** Test individual functions and modules in isolation

**Shared Package (120 tests)**

- Prompt generation logic
- Fire danger calculations
- Intensity-to-visual mapping
- Time-of-day lighting
- Type validation and serialization

**API Package (72 tests)**

- Cost estimation calculations
- Consistency validation logic
- Input validation and fallback behavior

**Web Package (21 tests)**

- State management (Zustand store)
- Scenario state transitions
- UI state toggles

### 2. Integration Tests ⏳ (Planned)

**Purpose:** Test service interactions with mocked external dependencies

**Planned Tests:**

- Geodata pipeline with recorded responses
- Prompt pipeline end-to-end
- Image generation with mocked Azure OpenAI
- Full orchestration workflow

**To Run (when implemented):**

```bash
npm run test:integration
```

### 3. End-to-End Tests ⏳ (Planned)

**Purpose:** Test complete user workflows with real Azure resources

**Standard Test Scenarios:**
| ID | Scenario | Location | Expected Outputs |
|----|----------|----------|------------------|
| E2E-001 | Blue Mountains forest fire | -33.72, 150.31 | 5+ images, eucalypt vegetation |
| E2E-002 | Western Plains grassfire | -32.5, 148.0 | 5+ images, fast ROS |
| E2E-003 | South Coast interface fire | -35.7, 150.2 | 5+ images, interface features |
| E2E-004 | Night operation | -33.8, 150.1 | 5+ images, night lighting |

**To Run (when implemented):**

```bash
npm run test:e2e
```

## Writing Tests

### Test File Naming

- Unit tests: `*.test.ts` or `*.test.tsx`
- Place tests in `__tests__` directory or alongside source files
- Match source file name: `promptGenerator.ts` → `promptGenerator.test.ts`

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Component or Module Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something specific', () => {
    // Arrange
    const input = {
      /* test data */
    };

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Best Practices

1. **One assertion per test** (when possible)
2. **Clear test names** describing what is being tested
3. **Arrange-Act-Assert** pattern
4. **Mock external dependencies** (Azure services, APIs)
5. **Test edge cases** and error conditions

## Continuous Integration

Tests run automatically on every push via GitHub Actions:

```yaml
# .github/workflows/test.yml
- Run type check
- Run linting (non-blocking)
- Run unit tests (all packages)
- Generate coverage reports (informational)
```

**CI Requirements:**

- ✅ All unit tests must pass
- ✅ TypeScript compilation must succeed
- ⚠️ Linting failures are logged but don't block
- ℹ️ Coverage thresholds are informational (non-blocking during MVP)

## Coverage Reports

Coverage reports are generated but **not enforced** during MVP development:

```bash
npm run test:coverage
```

**Target Coverage (Post-MVP):**

- Shared: ≥70% lines
- API: ≥70% lines
- Web: ≥60% lines (UI components harder to test)

**View Reports:**

- Text summary: Terminal output
- HTML report: `<package>/coverage/index.html`
- JSON report: `<package>/coverage/coverage-final.json`

## Test Configuration

### Vitest Config Locations

- `packages/shared/vitest.config.ts`
- `apps/api/vitest.config.ts`
- `apps/web/vitest.config.ts`

### Key Settings

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' for React
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 0, // Non-blocking during MVP
      },
    },
  },
});
```

## Debugging Tests

### Run Single Test File

```bash
npm test -- promptGenerator.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- -t "should generate prompts"
```

### Enable Debug Logging

```bash
DEBUG=vitest:* npm test
```

### VS Code Integration

Install **Vitest extension** for:

- Run tests from editor
- View results inline
- Debug with breakpoints

## Mocking Guidelines

### Mock Azure Services

```typescript
import { vi } from 'vitest';

// Mock blob storage
vi.mock('../services/blobStorage', () => ({
  BlobStorageService: vi.fn().mockImplementation(() => ({
    uploadImage: vi.fn().mockResolvedValue('https://mock-url'),
  })),
}));
```

### Mock External APIs

Use **Mock Service Worker (MSW)** for HTTP mocking:

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/geodata', (req, res, ctx) => {
    return res(ctx.json({ vegetation: 'Dry Sclerophyll Forest' }));
  })
);
```

## Quality Gates

### Unit Test Requirements (MVP)

- ✅ All tests must pass
- ✅ No console errors during tests
- ✅ No test timeouts
- ℹ️ Coverage informational only

### Prompt Quality Tests

See `docs/prompt_quality_standards.md` for:

- Required sections validation
- RFS terminology checks
- Blocked terms validation
- Viewpoint uniqueness

## Troubleshooting

### Tests Failing Locally

1. **Clear node_modules and reinstall**

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Rebuild TypeScript**

   ```bash
   npm run build
   ```

3. **Check Node version**
   ```bash
   node --version  # Should be ≥20.0.0
   ```

### Tests Pass Locally but Fail in CI

- Check for environment-specific issues
- Verify no hardcoded paths or assumptions
- Ensure tests are deterministic (no relying on Date.now(), Math.random())

### Slow Tests

- Use `it.only()` to isolate specific tests
- Profile with `--reporter=verbose`
- Consider mocking expensive operations

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW Documentation](https://mswjs.io/)
- [Prompt Quality Standards](./prompt_quality_standards.md)
- [Quality Gates](./quality_gates.md)

## Getting Help

- Check test output for error messages
- Review existing tests for patterns
- See `docs/quality_gates.md` for acceptance criteria
- Ask in team discussions for guidance

---

**Last Updated:** 2026-02-15  
**Test Count:** 213 passing  
**Coverage:** Informational only (non-blocking during MVP)
