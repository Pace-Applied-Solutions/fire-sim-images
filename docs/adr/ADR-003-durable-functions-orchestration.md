# ADR-003: Azure Durable Functions for Orchestration

**Status:** Accepted

**Date:** 2026-02-15

## Context

The Fire Simulation Inject Tool generates scenarios that involve multiple long-running steps:

1. Receive generation request
2. Look up geospatial data (elevation, vegetation, slope)
3. Generate prompts for 6-12 perspectives
4. Call Azure OpenAI for each image (2-5 seconds per image)
5. Store images in Blob Storage
6. Generate video from selected images (optional, 30-60 seconds)
7. Return results to client

This process takes 3-5 minutes and must be resilient to failures. Clients need to poll for status and retrieve results when ready.

Several orchestration approaches were evaluated:

1. **Azure Durable Functions** — Built-in orchestration for Azure Functions
2. **Azure Logic Apps** — Visual workflow designer, enterprise integration
3. **Custom state machine** — Manual implementation with Azure Table Storage
4. **Message queue + workers** — Azure Service Bus or Storage Queue with worker functions

## Decision

We will use **Azure Durable Functions** for generation workflow orchestration.

## Rationale

**Architecture:**
```typescript
// Orchestrator function
async function generateScenarioOrchestrator(context: OrchestrationContext) {
  const input = context.getInput<GenerationRequest>();
  
  // Step 1: Geodata lookup
  const geoContext = await context.callActivity('lookupGeodataActivity', input.perimeter);
  
  // Step 2: Generate prompts
  const prompts = await context.callActivity('generatePromptsActivity', {
    geoContext,
    scenarioInputs: input.scenarioInputs,
  });
  
  // Step 3: Generate images (fan-out/fan-in)
  const imageTasks = prompts.map(prompt =>
    context.callActivity('generateImageActivity', prompt)
  );
  const images = await Promise.all(imageTasks);
  
  // Step 4: Optional video generation
  if (input.generateVideo) {
    const video = await context.callActivity('generateVideoActivity', images);
    return { images, video };
  }
  
  return { images };
}
```

**Advantages:**
- **Built-in state management**: Framework handles checkpointing, replay, failure recovery
- **Automatic retries**: Configurable retry policies for each activity
- **Timeout handling**: Set timeouts per activity and overall workflow
- **Status tracking**: Built-in status endpoint (`/api/generate/{id}/status`)
- **Scalability**: Automatically scales with load, handles concurrent scenarios
- **Developer experience**: TypeScript SDK, local testing with Functions Core Tools
- **Cost-effective**: Only pay for execution time, no idle compute

**Trade-offs:**
- **Complexity**: More complex than simple HTTP functions
- **Learning curve**: Developers must understand orchestration patterns
- **Debugging**: Replays can be confusing (same code runs multiple times)
- **Vendor lock-in**: Durable Functions is Azure-specific

## Consequences

**Positive:**
- **Reliability**: Automatic retries handle transient failures (network issues, API throttling)
- **Visibility**: Real-time status updates as workflow progresses
- **Scalability**: Handles 100+ concurrent scenarios without manual scaling
- **Maintainability**: Clear separation of concerns (orchestrator vs activities)
- **Resilience**: Workflow survives Azure Functions restarts, deployments

**Negative:**
- **Complexity**: More code and configuration than simple functions
- **Testing overhead**: Must mock orchestration context in tests
- **Migration difficulty**: Hard to move to non-Azure platform if needed

**Implementation details:**
- Orchestrator stored in `src/orchestrators/generateScenarioOrchestrator.ts`
- Activities in `src/activities/` directory
- Status stored in Azure Table Storage (managed by Durable Functions)
- HTTP trigger starts orchestration and returns instance ID
- Client polls `/api/generate/{id}/status` for progress
- Results available at `/api/generate/{id}/results` when complete

## Patterns Used

### Fan-Out/Fan-In
Generate multiple images in parallel:
```typescript
const imageTasks = perspectives.map(p => 
  context.callActivity('generateImage', p)
);
const images = await Promise.all(imageTasks);
```

### Human Interaction (Future)
For scenarios requiring manual approval:
```typescript
const approved = await context.waitForExternalEvent('approval');
if (approved) {
  // Continue generation
}
```

### Monitor Pattern (Future)
For fire spread simulation with progressive updates:
```typescript
while (context.currentUtcDateTime < deadline) {
  await context.callActivity('updateFireSpread', state);
  await context.createTimer(context.currentUtcDateTime.addMinutes(30));
}
```

## Alternatives Considered

### Azure Logic Apps
**Rejected because:**
- Visual designer adds friction for code-first team
- More expensive than Functions ($0.001 per action)
- Less flexible for complex logic (prompt generation, validation)
- Harder to version control and test

### Custom State Machine
**Rejected because:**
- Significant development effort (retry logic, checkpointing, status tracking)
- Error-prone (easy to introduce bugs in failure handling)
- More code to maintain and test
- No built-in monitoring or debugging tools

### Message Queue + Workers
**Rejected because:**
- Must manage multiple queues (geodata queue, image queue, video queue)
- More complex deployment (multiple function apps)
- Status tracking requires custom implementation
- Harder to ensure exactly-once processing

## Future Considerations

- **Activity composition**: Extract common activities into a shared library
- **Monitoring**: Add Application Insights tracking for each activity
- **Timeout tuning**: Adjust timeouts based on production metrics
- **Replay optimization**: Minimize side effects in orchestrator for faster replays
- **Human-in-the-loop**: Add approval step for experimental features
- **Long-running workflows**: Fire spread simulation with hourly updates

## References

- Durable Functions docs: https://docs.microsoft.com/en-us/azure/azure-functions/durable/
- Orchestration patterns: https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview
- Master plan: [docs/master_plan.md](../master_plan.md)
