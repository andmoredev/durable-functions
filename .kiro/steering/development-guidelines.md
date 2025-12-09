# Development Guidelines

## Core Philosophy

**Keep it simple. Compare patterns fairly without over-engineering.**

This project compares two orchestration approaches. Write clear, comparable code that highlights the differences between Step Functions and Durable Functions without unnecessary abstraction.

## Durable Functions Specific Guidelines

### Understanding Checkpoint/Replay

**Critical Concept**: Durable functions use checkpoint/replay. Your code runs from the beginning on each resume, but completed steps are skipped using stored results.

**Implications**:
- Code must be deterministic during replay
- Avoid side effects outside of `context.step()`
- Don't use `Math.random()`, `Date.now()`, or external state outside steps
- All business logic goes inside `context.step()` callbacks

### Durable Operations

#### Steps
```javascript
// Good: Business logic in step
const result = await context.step('processData', async () => {
  const data = await fetchFromAPI();
  return processData(data);
});

// Bad: Side effects outside step
const timestamp = Date.now(); // Non-deterministic during replay!
const result = await context.step('processData', async () => {
  return { timestamp, data: 'value' };
});
```

#### Waits
```javascript
// Wait for duration (no compute charges)
await context.wait({ seconds: 3600 }); // 1 hour

// Wait for callback (human-in-the-loop)
await context.wait({ 
  callback: { 
    id: 'validation-task-123' 
  } 
});
```

#### Parallel Execution
```javascript
// Process multiple items in parallel
const results = await context.parallel(
  albums.map((album, index) => 
    context.step(`estimatePrice-${index}`, async () => {
      return await estimatePrice(album);
    })
  )
);
```

#### Loops
```javascript
// Native JavaScript loops work with steps
for (let i = 0; i < albums.length; i++) {
  await context.step(`saveAlbum-${i}`, async () => {
    await saveToDatabase(albums[i]);
  });
}
```

### Determinism Rules

**Always Deterministic**:
- Same inputs → same outputs
- No random numbers outside steps
- No timestamps outside steps
- No external state reads outside steps

**Safe Patterns**:
```javascript
// Good: Deterministic
const result = await context.step('process', async () => {
  const timestamp = Date.now(); // OK inside step
  return { timestamp, data: 'value' };
});

// Good: Using step results
const data = await context.step('fetch', async () => fetchData());
const processed = await context.step('process', async () => {
  return processData(data); // Using previous step result
});
```

**Unsafe Patterns**:
```javascript
// Bad: Non-deterministic
const id = Math.random(); // Different on replay!
await context.step('save', async () => {
  await save({ id, data: 'value' });
});

// Bad: External state
let counter = 0; // Lost on replay!
await context.step('increment', async () => {
  counter++; // Won't work as expected
});
```

## Step Functions Specific Guidelines

### State Machine Design

**Keep State Machines Simple**:
- Use ASL (Amazon States Language) directly
- Leverage service integrations for DynamoDB
- Use Map state for parallel processing
- Use Wait state with task tokens for callbacks

### State Passing
```json
{
  "albums": [...],
  "executionId": "exec-123",
  "validationComplete": false
}
```

State flows between Lambda functions via Step Functions. Keep state objects small and focused.

## Code Standards

### File Structure and Naming
- **Durable Functions**: `workflows/durable-function/index.mjs`
- **Step Functions**: `workflows/step-functions/definition.asl.json`
- **Shared Functions**: `functions/{name}/index.mjs`
- **Business Logic**: `functions/{name}/lib/{module}.mjs`
- **Tests**: `tests/{pattern}/{test-name}.test.mjs`

### JavaScript/Node.js Standards
- **ES Modules**: Use ESM syntax exclusively
- **Node.js version**: Target Node.js 22.x
- **Async/await**: Required for durable functions
- **Error handling**: Try/catch with proper propagation

### Handler Organization Philosophy

**Keep handlers lean to make workflows visible at a glance.**

Handlers should read like a table of contents - showing the workflow steps clearly without implementation details. Extract all business logic into separate modules.

### Durable Function Handler Pattern
```javascript
// workflows/durable-function/index.mjs
import { withDurableExecution } from '@aws/durable-execution-sdk-js';
import { processImage } from './lib/image-processor.mjs';
import { saveAlbums } from './lib/album-repository.mjs';
import { estimatePrice } from './lib/price-estimator.mjs';

export const handler = withDurableExecution(async (event, context) => {
  // Workflow is clear and readable - business logic is in separate files
  
  const albums = await context.step('processImage', async () => 
    processImage(event.imageS3Key)
  );
  
  await context.step('saveAlbums', async () => 
    saveAlbums(context.executionId, albums)
  );
  
  await context.wait({ 
    callback: { id: `validation-${context.executionId}` } 
  });
  
  const prices = await context.parallel(
    albums.map((album, i) =>
      context.step(`estimatePrice-${i}`, async () => 
        estimatePrice(album)
      )
    )
  );
  
  return { executionId: context.executionId, albums, prices };
});
```

### Standard Lambda Handler Pattern
```javascript
import { processImage } from './lib/image-processor.mjs';
import { validateInput } from './lib/validators.mjs';

export const handler = async (event) => {
  try {
    // Handler is thin - just orchestration
    const input = validateInput(event);
    const result = await processImage(input.imageS3Key);
    
    return { 
      statusCode: 200, 
      body: JSON.stringify(result) 
    };
  } catch (error) {
    console.error('Error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
```

### Business Logic Organization

**Co-locate business logic with handlers in `lib/` folders:**

```
workflows/
└── durable-function/
    ├── index.mjs                  # Lean handler - workflow orchestration
    └── lib/
        ├── image-processor.mjs    # Image processing logic
        ├── album-repository.mjs   # DynamoDB operations for albums
        ├── price-estimator.mjs    # Price estimation logic
        ├── bedrock-client.mjs     # Bedrock API wrapper
        └── validators.mjs         # Input validation

functions/
├── image-processor/
│   ├── index.mjs                  # Lean handler
│   └── lib/
│       ├── bedrock-client.mjs     # Bedrock API calls
│       └── image-parser.mjs       # Parse vision model response
└── price-estimator/
    ├── index.mjs                  # Lean handler
    └── lib/
        ├── pricing-api.mjs        # External API calls
        └── confidence.mjs         # Confidence scoring
```

**Benefits:**
- Handlers show workflow structure clearly
- Business logic is testable in isolation
- Each function/workflow is self-contained
- Complexity is contained in focused modules
- No confusion about what's "shared" vs function-specific

## Comparison Best Practices

### Keep Workflows Identical
Both implementations should:
1. Process image to extract 6 albums
2. Store initial data
3. Wait for human validation
4. Update with validated data
5. Estimate prices in parallel (6 agents)
6. Store final results

### Separate Business Logic from Handlers

**Bad: Business logic in handler**
```javascript
// workflows/durable-function/index.mjs
export const handler = withDurableExecution(async (event, context) => {
  const albums = await context.step('processImage', async () => {
    // 50 lines of Bedrock API calls, parsing, validation...
    const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      body: JSON.stringify({
        // Complex prompt construction...
      })
    }));
    // More parsing logic...
  });
  // Workflow is buried in implementation details
});
```

**Good: Clean handler with extracted logic**
```javascript
// workflows/durable-function/index.mjs
import { processImage } from './lib/image-processor.mjs';

export const handler = withDurableExecution(async (event, context) => {
  const albums = await context.step('processImage', async () => 
    processImage(event.imageS3Key)
  );
  // Workflow is clear and readable
});

// workflows/durable-function/lib/image-processor.mjs
export async function processImage(imageS3Key) {
  // All implementation details here
  const bedrockClient = createBedrockClient();
  const response = await callVisionModel(bedrockClient, imageS3Key);
  return parseAlbums(response);
}
```

### Use Workflow Type Consistently
- **Step Functions**: `workflowType: "step-functions"`
- **Durable Functions**: `workflowType: "durable-functions"`

```javascript
// workflows/durable-function/lib/album-repository.mjs
export async function saveAlbum(executionId, album) {
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: executionId,
      sk: `album-${album.index}`,
      entityType: 'album',
      workflowType: 'durable-functions',
      executionId,
      ...album
    }
  }));
}

// Usage in durable function handler
await saveAlbum(context.executionId, album);
```

Each workflow/function has its own business logic modules that know their workflow type.

### Metrics Collection
Track the same metrics for both patterns:
- Execution start time
- Execution end time
- Duration in milliseconds
- Number of albums processed
- Success/failure status
- Estimated cost

## Testing Standards

### Test Business Logic, Not Handlers

**Handlers are thin orchestration - test the business logic modules instead.**

```javascript
// Good: Test business logic directly
import { processImage } from '../workflows/durable-function/lib/image-processor.mjs';

describe('Durable Function - Image Processor', () => {
  it('should extract 6 albums from image', async () => {
    const albums = await processImage('test-image.jpg');
    expect(albums).toHaveLength(6);
    expect(albums[0]).toHaveProperty('albumName');
  });
});

// Good: Test repository operations
import { saveAlbum } from '../workflows/durable-function/lib/album-repository.mjs';

describe('Durable Function - Album Repository', () => {
  it('should save album with correct structure', async () => {
    await saveAlbum('exec-123', mockAlbum);
    // Verify DynamoDB structure with workflowType: 'durable-functions'
  });
});
```

### Durable Functions Testing
- Test business logic modules in isolation
- Mock `context.step()` only for workflow integration tests
- Test replay behavior at the handler level
- Test determinism by verifying no side effects outside steps

### Step Functions Testing
- Test Lambda function business logic independently
- Test state machine with mock events
- Validate state transitions
- Test error handling in business logic modules

### Comparison Testing
- Run same input through both patterns
- Compare results for consistency
- Measure performance differences
- Calculate cost differences

## Error Handling

### Durable Functions Error Handling
```javascript
await context.step('riskyOperation', async () => {
  try {
    return await externalAPI.call();
  } catch (error) {
    // Handle or rethrow
    throw new Error(`API call failed: ${error.message}`);
  }
});
```

Built-in retry happens automatically. Configure retry policy in step options if needed.

### Step Functions Error Handling
Define retry and catch in state machine:
```json
{
  "Retry": [{
    "ErrorEquals": ["States.ALL"],
    "IntervalSeconds": 2,
    "MaxAttempts": 3,
    "BackoffRate": 2.0
  }],
  "Catch": [{
    "ErrorEquals": ["States.ALL"],
    "Next": "HandleError"
  }]
}
```

## Logging Standards

### Durable Functions Logging
```javascript
context.logger.info('Processing album', { albumIndex: 1 });
context.logger.error('Failed to process', { error: err.message });
```

Use `context.logger` for automatic correlation with execution ID.

### Standard Lambda Logging
```javascript
console.log(JSON.stringify({
  level: 'INFO',
  message: 'Processing album',
  albumIndex: 1
}));
```

## Performance Optimization

### Durable Functions
- Minimize work outside steps
- Use `context.parallel()` for concurrent operations
- Use `context.wait()` for long pauses (no charges)
- Keep step callbacks focused and fast

### Step Functions
- Use service integrations to avoid Lambda invocations
- Batch DynamoDB operations where possible
- Use Map state for parallel processing
- Optimize Lambda function memory allocation

## General Build Rules
- **No SAM Validate**: Use `sam build` instead
- **No comments**: Code should be self-documenting
- **Consistent Formatting**: Use same style for both patterns
