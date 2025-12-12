# Durable Function Example - Testing Guide

This guide explains how to test the durable function example that demonstrates all key AWS Lambda Durable Functions operations.

## Overview

The durable function example showcases:
- **Step Operations**: Checkpointed data processing
- **Wait Operations**: Time-based pauses without compute charges
- **Wait for Callback**: Human-in-the-loop with external callbacks
- **Parallel Operations**: Concurrent execution of multiple tasks
- **Map Operations**: Durable iteration over collections
- **Wait for Condition**: Polling with automatic backoff
- **Lambda Invoke**: Function composition and workflow decomposition
- **Child Context**: Isolated execution contexts for complex workflows
- **Final Aggregation**: Comprehensive result compilation

## Test Event

Use the provided `test-event.json` file for testing:

```json
{
  "workflowId": "durable-demo-001",
  "inputData": {
    "items": [
      "Process customer data batch A",
      "Validate inventory records", 
      "Generate monthly reports",
      "Update product catalog",
      "Sync external APIs"
    ]
  },
  "startTime": 1704067200000,
  "metadata": {
    "source": "demo-system",
    "priority": "normal",
    "requestId": "req-12345",
    "userId": "demo-user"
  }
}
```

## WaitForCondition Pattern

The function demonstrates the correct `waitForCondition` pattern with state management:

```javascript
const result = await context.waitForCondition(
  async (state, ctx) => {
    const readinessCheck = await checkSystemReadiness();
    return { 
      ...state, 
      ready: readinessCheck.ready,
      lastCheck: readinessCheck,
      attempts: (state.attempts || 0) + 1
    };
  },
  {
    initialState: { 
      ready: false, 
      systemId: 'external-system-1',
      startTime: Date.now(),
      attempts: 0
    },
    waitStrategy: (state) =>
      state.ready 
        ? { shouldContinue: false }
        : { shouldContinue: true, delay: { seconds: 3 } }
  }
);
```

**Key Features:**
- **Predictable Behavior**: System becomes ready after exactly 3 attempts
- **State Preservation**: State is maintained across polling attempts
- **Fixed Delay**: 3 seconds between each attempt for consistent timing
- **Simple Logic**: Easy to understand and test behavior
- **Rich State**: Tracks attempts, timing, and last check results

## Testing Methods

### 1. Local Testing (Without Docker)

Test the business logic components locally:

```bash
# Test individual components
node -e "
import('./lib/data-processor.mjs').then(({ processData }) => {
  const testData = { items: ['item1', 'item2', 'item3'] };
  const result = processData(testData);
  console.log('Work Items:', result);
});
"

# Test callback helpers
node -e "
import('./lib/callback-helper.mjs').then(({ generateCallbackId, validateCallbackId }) => {
  const id = generateCallbackId('test-exec-123');
  console.log('Callback ID:', id);
  console.log('Valid:', validateCallbackId(id));
});
"
```

### 2. SAM Local Testing (Requires Docker)

Test the complete function locally:

```bash
# Build the function
sam build

# Invoke locally with test event
sam local invoke DurableFunctionExampleFunction --event workflows/durable-function-example/test-event.json

# Start local API for testing
sam local start-api
```

### 3. AWS Cloud Testing

Deploy and test in AWS:

```bash
# Deploy to AWS
sam deploy --guided

# Invoke deployed function
aws lambda invoke \
  --function-name <your-stack-name>-DurableFunctionExampleFunction-<random-id> \
  --payload file://workflows/durable-function-example/test-event.json \
  response.json

# View response
cat response.json
```

## Expected Workflow Execution

### Phase 1: Initial Processing
1. **Step: processInputData**
   - Converts input items into work items with priorities
   - Creates deterministic work item structure
   - Expected: 5 work items with priorities 1-3

### Phase 2: Wait for Callback
2. **Step: generateCallbackId**
   - Creates unique callback identifier
   - Format: `callback-{executionId}-{uuid}`
   
3. **Wait: callback operation**
   - Pauses execution for up to 1 hour
   - Waits for external callback with generated ID
   - In testing, this will timeout and continue with default values

### Phase 2.5: Simple Wait
4. **Wait: time-based wait**
   - Demonstrates simple time-based wait operation
   - Waits for 5 seconds without consuming compute resources
   - Shows how to pause execution for a specific duration

### Phase 3: Parallel Operations
5. **Parallel: 3 concurrent tasks**
   - **Task 1**: Data validation (100ms processing time)
   - **Task 2**: Data enrichment (150ms processing time)  
   - **Task 3**: Quality check (80ms processing time)
   - All execute concurrently with individual checkpoints

### Phase 4: Map Operations
6. **Map: Process each work item**
   - Iterates over all 5 work items
   - Each item processed with individual checkpoint
   - Processing time varies by priority (priority × 50ms)
   - Transforms data and adds processing metadata

### Phase 6: Wait for Condition
7. **WaitForCondition: poll until system ready**
   - Uses state management pattern with initialState and waitStrategy
   - Implements exponential backoff (2^n seconds, capped at 10s)
   - Maintains state across polling attempts with attempt counter
   - Demonstrates condition-based waiting with proper state preservation

### Phase 7: Lambda Function Invocation
8. **Invoke: call Hello World function**
   - Invokes another Lambda function and waits for result
   - Demonstrates function composition patterns
   - Uses environment variable for function ARN

### Phase 8: Child Context Operations
9. **RunInChildContext: isolated operations**
   - Executes operations in isolated execution context
   - Processes metadata and validates configuration
   - Demonstrates workflow decomposition and isolation

### Phase 9: Final Aggregation
10. **Step: aggregateResults**
    - Combines all operation results including advanced operations
    - Calculates comprehensive execution metrics
    - Returns complete workflow summary with all operation results

## Expected Response Structure

```json
{
  "workflowId": "durable-demo-001",
  "executionId": "<aws-execution-id>",
  "processedItems": [
    {
      "id": "work-item-1",
      "data": "Process customer data batch A",
      "priority": 1,
      "status": "completed",
      "processed": true,
      "processedAt": 1704067201234,
      "processingTime": 50,
      "index": 0,
      "transformedData": "processed-Process customer data batch A",
      "checkpointId": "checkpoint-work-item-1-0"
    }
    // ... 4 more items
  ],
  "parallelResults": [
    {
      "task": 1,
      "type": "validation",
      "result": "completed",
      "itemsValidated": 5,
      "timestamp": 1704067201100
    },
    {
      "task": 2, 
      "type": "enrichment",
      "result": "completed",
      "itemsEnriched": 5,
      "timestamp": 1704067201150
    },
    {
      "task": 3,
      "type": "quality-check", 
      "result": "completed",
      "qualityScore": 0.95,
      "timestamp": 1704067201080
    }
  ],
  "callbackResult": {
    "timedOut": true,
    "callbackId": "callback-<execution-id>-<uuid>",
    "defaultValue": "timeout-fallback",
    "timeoutSeconds": 3600,
    "timestamp": "2024-01-01T00:00:01.000Z"
  },
  "totalDuration": 1234,
  "totalProcessingTime": 250,
  "avgProcessingTime": 50,
  "checkpointCount": 12,
  "operationCount": {
    "steps": 8,
    "parallel": 3,
    "map": 5,
    "wait": 1
  },
  "itemsProcessed": 5,
  "successfulItems": 5,
  "successRate": 1,
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": "2024-01-01T00:00:01.234Z",
  "completedAt": "2024-01-01T00:00:01.234Z"
}
```

## Testing Scenarios

### Scenario 1: Basic Workflow Test
- **Input**: Standard test event with 5 items
- **Expected**: All operations complete successfully
- **Validation**: Check all 5 items are processed, success rate = 1.0

### Scenario 2: Empty Input Test
- **Input**: `{ "inputData": { "items": [] } }`
- **Expected**: Workflow completes with 0 items processed
- **Validation**: No map operations, empty processedItems array

### Scenario 3: Single Item Test
- **Input**: `{ "inputData": { "items": ["single-item"] } }`
- **Expected**: Workflow processes 1 item
- **Validation**: 1 item in processedItems, map operations = 1

### Scenario 4: Large Batch Test
- **Input**: 20+ items in the array
- **Expected**: All items processed with appropriate scaling
- **Validation**: Processing time scales with item count

## Callback Testing

To test the callback functionality in a real deployment:

### 1. Trigger the Function
```bash
aws lambda invoke \
  --function-name <function-name> \
  --payload file://test-event.json \
  response.json
```

### 2. Extract Callback ID
The function will pause at the wait operation. Check CloudWatch logs for the callback ID:
```
Waiting for callback: callback-<execution-id>-<uuid>
```

### 3. Send Callback (Optional)
```bash
# Resume execution with callback data
aws lambda invoke \
  --function-name <function-name> \
  --payload '{
    "callbackId": "callback-<execution-id>-<uuid>",
    "success": true,
    "data": { "approved": true, "message": "Manual approval completed" }
  }' \
  callback-response.json
```

### 4. Wait for Completion
If no callback is sent, the function will timeout after 1 hour and continue with default values.

## Monitoring and Debugging

### CloudWatch Logs
Monitor execution progress:
```bash
aws logs tail /aws/lambda/<function-name> --follow
```

### Key Log Messages to Look For:
- `"Executing step: processInputData"` - Initial processing
- `"Executing step: generateCallbackId"` - Callback ID generation
- `"Waiting for callback: callback-..."` - Wait operation started
- `"Executing 3 parallel operations"` - Parallel execution
- `"Processing 5 items with map operation"` - Map operation
- `"Executing step: aggregateResults"` - Final aggregation

### Performance Metrics
- **Total Duration**: Should be ~1-2 seconds for 5 items (excluding wait time)
- **Processing Time**: Varies by item priority (1×50ms, 2×50ms, 3×50ms per item)
- **Checkpoint Count**: Should equal steps + parallel + map operations
- **Success Rate**: Should be 1.0 for valid inputs

## Troubleshooting

### Common Issues

1. **"Unexpected payload" Error**
   - Ensure the function is deployed with DurableConfig
   - Verify the event structure matches expected format

2. **Import Errors**
   - Check that all lib modules are properly bundled
   - Verify ES module syntax is correct

3. **Timeout Issues**
   - Increase Lambda timeout if processing large batches
   - Check DurableConfig ExecutionTimeout setting

4. **Callback Not Working**
   - Verify callback ID format is correct
   - Check that callback payload structure matches expected format

### Debug Mode
Add debug logging by setting environment variable:
```bash
export DEBUG=true
```

## Performance Benchmarks

Expected performance for different input sizes:

| Items | Duration | Checkpoints | Memory Usage |
|-------|----------|-------------|--------------|
| 1     | ~200ms   | 7           | ~100MB       |
| 5     | ~400ms   | 12          | ~120MB       |
| 10    | ~700ms   | 17          | ~150MB       |
| 20    | ~1.2s    | 27          | ~200MB       |

*Note: Durations exclude wait time for callbacks*

## Integration with Other Systems

### Triggering from S3
```yaml
Events:
  S3Upload:
    Type: S3
    Properties:
      Bucket: !Ref MyBucket
      Events: s3:ObjectCreated:*
```

### Triggering from EventBridge
```yaml
Events:
  ScheduledExecution:
    Type: Schedule
    Properties:
      Schedule: rate(1 hour)
```

### API Gateway Integration
```yaml
Events:
  ApiTrigger:
    Type: Api
    Properties:
      Path: /process
      Method: post
```

This testing guide provides comprehensive coverage for validating the durable function's behavior across all implemented operations and scenarios.