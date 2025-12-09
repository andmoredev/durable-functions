# Simplicity Principles

## Core Principle

**Compare patterns fairly without over-engineering. Keep both implementations simple and focused.**

This project compares two orchestration approaches. The goal is clear comparison, not building a production system. Avoid unnecessary abstraction that obscures the differences between patterns.

## Decision Framework

Before adding any code, ask:
1. **Does this help compare the patterns?**
2. **Is this needed in both implementations?**
3. **Does this add unnecessary complexity?**
4. **Will this make the comparison harder to understand?**

If any answer suggests complexity without comparison value, don't add it.

## Preferred Approaches

### Keep Workflows Identical
Both patterns should implement the exact same workflow:
1. Process image → extract 6 albums
2. Store initial data
3. Wait for human validation
4. Update validated data
5. Estimate prices in parallel (6 agents)
6. Store final results

### Use Native Constructs

**Durable Functions**:
```javascript
// Good: Use SDK primitives directly
const albums = await context.step('processImage', async () => {
  return await processImage(imageKey);
});

// Sequential processing with loop
for (let i = 0; i < albums.length; i++) {
  await context.step(`saveAlbum-${i}`, async () => {
    await saveToDatabase(albums[i]);
  });
}

// Parallel processing with context.map()
const prices = await context.map(albums, async (album, i) => {
  return await context.step(`estimatePrice-${i}`, async () => 
    await estimatePrice(album)
  );
});

// Alternative: context.parallel() with array of steps
const prices = await context.parallel(
  albums.map((album, i) =>
    context.step(`estimatePrice-${i}`, async () => 
      await estimatePrice(album)
    )
  )
);
```

**Step Functions**:
```json
{
  "Type": "Map",
  "ItemsPath": "$.albums",
  "Iterator": {
    "StartAt": "EstimatePrice",
    "States": {
      "EstimatePrice": {
        "Type": "Task",
        "Resource": "arn:aws:lambda:...:function:PriceEstimator",
        "End": true
      }
    }
  }
}
```

### Don't Abstract the Comparison Away

**Bad**: Generic orchestrator interface
```javascript
// Don't do this - hides the differences!
class WorkflowOrchestrator {
  async execute(workflow) {
    // Generic execution logic
  }
}
```

**Good**: Separate, clear implementations
```javascript
// Step Functions: workflows/step-functions/definition.asl.json
// Durable Functions: workflows/durable-function/index.mjs
```

## What NOT to Build

### Don't Build These
- **Generic workflow engine** - Use Step Functions and Durable Functions directly
- **Abstract orchestrator interface** - Keep implementations separate
- **Complex state management** - Let each pattern handle state its way
- **Unified API layer** - Simple trigger and metrics APIs only
- **Custom retry logic** - Use built-in retry mechanisms
- **Workflow DSL** - Use ASL for Step Functions, JavaScript for Durable Functions

## Durable Functions Specific

### Keep Steps Simple
```javascript
// Good: Clear, focused step
await context.step('saveAlbum', async () => {
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: album
  }));
});

// Bad: Too much in one step
await context.step('processEverything', async () => {
  const albums = await processImage();
  await saveAllAlbums(albums);
  const prices = await estimateAllPrices(albums);
  await saveAllPrices(prices);
  return { albums, prices };
});
```

### Use Deterministic Code
```javascript
// Good: Deterministic
await context.step('generateId', async () => {
  return crypto.randomUUID(); // OK inside step
});

// Bad: Non-deterministic
const id = crypto.randomUUID(); // Different on replay!
await context.step('save', async () => {
  await save({ id, data });
});
```

### Leverage Native Constructs

**Sequential Processing:**
```javascript
// Good: Simple JavaScript loop with steps
for (const album of albums) {
  await context.step(`save-${album.index}`, async () => {
    await saveAlbum(album);
  });
}
```

**Parallel Processing:**
```javascript
// Good: Use context.map() for parallel iteration
const prices = await context.map(albums, async (album, i) => {
  return await context.step(`estimatePrice-${i}`, async () => 
    await estimatePrice(album)
  );
});

// Also good: Use context.parallel() with array
const prices = await context.parallel(
  albums.map((album, i) =>
    context.step(`estimatePrice-${i}`, async () => 
      await estimatePrice(album)
    )
  )
);

// Bad: Trying to be clever - loses checkpoints!
await context.step('saveAll', async () => {
  await Promise.all(albums.map(saveAlbum)); // No individual checkpoints!
});
```

## Step Functions Specific

### Use Service Integrations
```json
{
  "Type": "Task",
  "Resource": "arn:aws:states:::dynamodb:putItem",
  "Parameters": {
    "TableName": "AlbumTable",
    "Item": {
      "pk": {"S.$": "$.executionId"},
      "sk": {"S": "metadata"}
    }
  }
}
```

Don't invoke Lambda just to call DynamoDB.

### Keep State Small
```json
{
  "executionId": "exec-123",
  "albumCount": 6,
  "validationComplete": false
}
```

Don't pass large objects through state.

## Testing Approach

### Test What Matters
- **Do test**: Workflow correctness, equivalence, performance, cost
- **Don't test**: Implementation details, internal state management

### Keep Tests Comparable
```javascript
// Good: Same test for both patterns
describe('Workflow Equivalence', () => {
  it('should process 6 albums', async () => {
    const sfResult = await runStepFunctions(testImage);
    const dfResult = await runDurableFunctions(testImage);
    
    expect(sfResult.albums).toHaveLength(6);
    expect(dfResult.albums).toHaveLength(6);
  });
});
```

## Metrics Collection

### Track Meaningful Metrics
```javascript
// Good: Comparison-relevant metrics
{
  executionTime: 45000,
  estimatedCost: 0.0023,
  successRate: 0.96,
  albumsProcessed: 6
}

// Bad: Implementation details
{
  checkpointCount: 15,
  replayCount: 2,
  stateTransitions: 23
}
```

## Documentation Standards

### Explain the Differences
```javascript
// Good: Highlights pattern difference
// Step Functions: Uses Map state for parallel execution
// Durable Functions: Uses context.parallel() with array of steps

// Bad: Generic description
// Processes albums in parallel
```

## Success Metrics

### Good Comparison Characteristics
- **Clear differences**: Easy to see how patterns differ
- **Fair comparison**: Same workflow, same data, same metrics
- **Actionable insights**: Results inform technology decisions
- **Simple code**: Easy to understand and maintain

### Warning Signs
- **Can't tell patterns apart**: Too much abstraction
- **Different workflows**: Unfair comparison
- **Complex test setup**: Over-engineered
- **Unclear results**: Metrics don't help decision-making
