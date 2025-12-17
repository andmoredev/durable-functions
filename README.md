# AWS Lambda Durable Functions Example

A comprehensive example demonstrating **AWS Lambda Durable Functions** orchestration patterns, showcasing all key durable operations including parallel execution, wait conditions, callbacks, and child contexts.

## 📋 Table of Contents

- [What This Does](#-what-this-does)
- [Blog Post](#-blog-post)
- [Quick Start](#-quick-start)
- [Local Testing](#-local-testing)
- [Repository Structure](#-repository-structure)
- [Configuration](#-configuration)
- [Workflow Steps](#-workflow-steps)
- [Key Features](#-key-features-demonstrated)
- [Expected Results](#-expected-results)
- [Monitoring](#-monitoring)
- [Customization](#-customization)
- [Cleanup](#-cleanup)
- [Additional Resources](#-additional-resources)

## 🎯 What This Does

This repository contains a complete durable function implementation that demonstrates:

- **Step Operations**: Checkpointed business logic execution
- **Wait Operations**: Time-based pauses without compute charges
- **Wait for Callback**: Human-in-the-loop with external system integration
- **Parallel Operations**: Concurrent execution of multiple tasks
- **Map Operations**: Durable iteration over collections with individual checkpoints
- **Wait for Condition**: Polling with automatic retry and backoff
- **Lambda Invoke**: Function composition and workflow decomposition
- **Child Context**: Isolated execution contexts for complex workflows

The example processes a batch of work items through a complete workflow that includes data processing, parallel operations, external system polling, and comprehensive result aggregation.

## 📖 Blog Post

For detailed explanation and background, read the accompanying blog post: **[Blog post link will be provided]**

---

## ⚡ TL;DR - Quick Deploy

**Just want to deploy quickly?** See [QUICK_DEPLOY.md](docs/QUICK_DEPLOY.md) for a 3-step deployment guide.

**Want to understand the architecture?** See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system diagrams.

## 🚀 Quick Start

### Prerequisites

- **AWS CLI** configured with appropriate permissions
- **AWS SAM CLI** installed ([Installation Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
- **Node.js 24.x** or later

### Deploy to AWS

1. **Clone and navigate to the repository**:
   ```bash
   git clone <repository-url>
   cd durable-functions
   ```

2. **Build the application**:
   ```bash
   sam build
   ```

3. **Deploy to AWS**:
   ```bash
   sam deploy --guided
   ```
   
   Follow the prompts:
   - Stack name: `durable-functions-example` (or your preferred name)
   - AWS Region: `us-east-1` (or your preferred region)
   - Confirm changes before deploy: `Y`
   - Allow SAM to create IAM roles: `Y`

4. **Note the outputs** after deployment:
   - `DurableFunctionExampleFunctionArn`: ARN of the main durable function
   - `HelloWorldFunctionArn`: ARN of the helper function

### Test the Deployment

1. **Invoke the durable function**:
   ```bash
   aws lambda invoke \
     --function-name <your-stack-name>-DurableFunctionExampleFunction-<random-id> \
     --payload file://workflows/durable-function-example/test-event.json \
     response.json
   ```

2. **View the response**:
   ```bash
   cat response.json
   ```

3. **Monitor execution in CloudWatch Logs**:
   ```bash
   aws logs tail /aws/lambda/<function-name> --follow
   ```

## 🧪 Local Testing

### Test Individual Components

```bash
# Test data processing logic
node workflows/durable-function-example/test-advanced.mjs

# Test wait condition pattern
node workflows/durable-function-example/test-wait-condition.mjs

# Test retry behavior
node workflows/durable-function-example/test-retry-behavior.mjs

# Test aggregation function
node workflows/durable-function-example/test-aggregation.mjs
```

## 📁 Repository Structure

```
├── workflows/
│   └── durable-function-example/          # Main durable function
│       ├── index.mjs                      # Durable function handler
│       ├── lib/                           # Business logic modules
│       │   ├── data-processor.mjs         # Data processing and aggregation
│       │   ├── parallel-operations.mjs    # Parallel task definitions
│       │   └── advanced-operations.mjs    # Advanced durable operations
│       ├── test-*.mjs                     # Individual component tests
│       ├── test-event.json               # Sample test event
│       └── README.md                      # Detailed testing guide
├── functions/
│   └── hello-world/                       # Helper function for invoke example
│       └── index.mjs                      # Simple greeting function
├── template.yaml                          # SAM CloudFormation template
├── samconfig.yaml                         # SAM deployment configuration
└── package.json                           # Node.js dependencies
```

## 🔧 Configuration

### Environment Variables

The durable function uses these environment variables:

- `HELLO_WORLD_FUNCTION_ARN`: ARN of the Hello World function (auto-configured)

### Durable Function Settings

- **Execution Timeout**: 1 hour (3600 seconds)
- **Retention Period**: 7 days
- **Memory**: 1024 MB
- **Architecture**: ARM64 (cost-optimized)

## 📊 Workflow Steps

The durable function executes these steps in sequence:

1. **Process Input Data**: Convert input items into work items
2. **Wait for Callback**: Pause for external system (with 1-hour timeout)
3. **Simple Wait**: Demonstrate time-based wait (5 seconds)
4. **Parallel Operations**: Execute 3 concurrent tasks
5. **Map Operations**: Process each work item with individual checkpoints
6. **Wait for Condition**: Poll external system until ready (3 attempts, 3-second delays)
7. **Invoke Lambda**: Call Hello World function for composition example
8. **Child Context**: Execute isolated operations in separate context
9. **Final Aggregation**: Combine all results with comprehensive metrics

## 🎛️ Key Features Demonstrated

### Durable Operations Coverage

- ✅ **`context.step()`** - Business logic with automatic checkpoints
- ✅ **`context.wait()`** - Time-based pauses without compute charges
- ✅ **`context.waitForCallback()`** - External system integration
- ✅ **`context.parallel()`** - Concurrent execution of multiple operations
- ✅ **`context.map()`** - Array processing with individual checkpoints
- ✅ **`context.waitForCondition()`** - Polling with automatic retry
- ✅ **`context.invoke()`** - Lambda function composition
- ✅ **`context.runInChildContext()`** - Isolated execution contexts

### Reliability Features

- **Automatic Checkpointing**: Progress saved at each step
- **Deterministic Replay**: Consistent behavior on retries
- **Error Handling**: Graceful handling of failures
- **State Management**: Comprehensive state tracking
- **Timeout Handling**: Configurable timeouts for all operations

## 📈 Expected Results

### Sample Response Structure

```json
{
  "workflowId": "durable-demo-001",
  "executionId": "<aws-execution-id>",
  "processedItems": [
    {
      "id": "work-item-1",
      "status": "completed",
      "processed": true,
      "processingTime": 50,
      "transformedData": "processed-Process customer data batch A"
    }
    // ... more items
  ],
  "parallelResults": [
    {
      "task": 1,
      "type": "validation",
      "result": "completed",
      "itemsValidated": 5
    }
    // ... more parallel results
  ],
  "advancedOperations": {
    "conditionResult": {
      "ready": true,
      "attempts": 3,
      "lastCheck": {
        "ready": true,
        "attempt": 3,
        "note": "System ready after 3 attempts"
      }
    },
    "invokeResult": {
      "statusCode": 200,
      "greeting": "Hello, DurableExecution-<execution-id>!"
    },
    "childContextResult": {
      "metadata": {
        "version": "1.0.0",
        "processingNode": "child-context",
        "isolated": true
      },
      "validation": {
        "valid": true,
        "configVersion": "2.1.0"
      }
    }
  },
  "operationCount": {
    "steps": 8,
    "parallel": 3,
    "map": 5,
    "wait": 1,
    "waitForCondition": 1,
    "invoke": 1,
    "childContext": 1
  },
  "itemsProcessed": 5,
  "successRate": 1.0,
  "totalDuration": 1234,
  "completedAt": "2024-01-01T00:00:01.234Z"
}
```

## 🔍 Monitoring

### CloudWatch Logs

Monitor execution progress with these key log messages:

- `"Executing step: processInputData"` - Initial processing
- `"Waiting for callback: callback-..."` - Callback operation started
- `"Executing 3 parallel operations"` - Parallel execution
- `"Processing 5 items with map operation"` - Map operation
- `"Polling system readiness..."` - Wait for condition
- `"Invoking Hello World function"` - Lambda invoke
- `"Executing in child context"` - Child context operations
- `"Executing step: aggregateResults"` - Final aggregation

### Performance Metrics

Expected performance for different input sizes:

| Items | Duration | Checkpoints | Memory Usage |
|-------|----------|-------------|--------------|
| 1     | ~200ms   | 7           | ~100MB       |
| 5     | ~400ms   | 12          | ~120MB       |
| 10    | ~700ms   | 17          | ~150MB       |
| 20    | ~1.2s    | 27          | ~200MB       |

*Note: Durations exclude wait time for callbacks and conditions*

## 🛠️ Customization

### Modify Wait Conditions

Edit `workflows/durable-function-example/lib/advanced-operations.mjs`:

```javascript
export async function checkSystemReadiness() {
  // Customize your readiness logic here
  // Current: ready after 3 attempts
}
```

### Adjust Timeouts

Edit `workflows/durable-function-example/index.mjs`:

```javascript
// Callback timeout
{ timeout: { minutes: 60 } }

// Wait condition delay
{ shouldContinue: true, delay: { seconds: 3 } }
```

### Add Custom Operations

Add new parallel operations in `workflows/durable-function-example/lib/parallel-operations.mjs`:

```javascript
export function createParallelOperations(itemCount) {
  return [
    // Add your custom parallel operations here
  ];
}
```

## 🧹 Cleanup

To remove all AWS resources:

```bash
sam delete --stack-name durable-functions-example
```

## 📚 Additional Resources

- [AWS Lambda Durable Functions Documentation](https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html)
- [AWS SAM Developer Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/)
- [Durable Functions SDK Reference](https://www.npmjs.com/package/@aws/durable-execution-sdk-js)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.