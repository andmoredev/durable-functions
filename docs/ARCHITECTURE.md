# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Lambda Durable Function                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Workflow Execution                       ││
│  │                                                             ││
│  │  1. Process Input Data                                      ││
│  │     ↓                                                       ││
│  │  2. Wait for Callback (1 hour timeout)                      ││
│  │     ↓                                                       ││
│  │  3. Simple Wait (5 seconds)                                 ││
│  │     ↓                                                       ││
│  │  4. Parallel Operations (3 concurrent)                      ││
│  │     ├─ Data Validation                                      ││
│  │     ├─ Data Enrichment                                      ││
│  │     └─ Quality Check                                        ││
│  │     ↓                                                       ││
│  │  5. Map Operations (process each item)                      ││
│  │     ├─ Item 1 → Checkpoint                                  ││
│  │     ├─ Item 2 → Checkpoint                                  ││
│  │     └─ Item N → Checkpoint                                  ││
│  │     ↓                                                       ││
│  │  6. Wait for Condition (poll until ready)                   ││
│  │     ├─ Attempt 1 (3s delay)                                 ││
│  │     ├─ Attempt 2 (3s delay)                                 ││
│  │     └─ Attempt 3 (ready!)                                   ││
│  │     ↓                                                       ││
│  │  7. Invoke Lambda Function                                  ││
│  │     └─ Hello World Function                                 ││
│  │     ↓                                                       ││
│  │  8. Child Context Operations                                ││
│  │     ├─ Process Metadata (isolated)                          ││
│  │     └─ Validate Configuration (isolated)                    ││
│  │     ↓                                                       ││
│  │  9. Final Aggregation                                       ││
│  │     └─ Comprehensive Results                                ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │     Hello World         │
                    │    Lambda Function      │
                    │                         │
                    │  Returns greeting with  │
                    │    execution details    │
                    └─────────────────────────┘
```

## Key Components

### Durable Function Handler
- **File**: `workflows/durable-function-example/index.mjs`
- **Purpose**: Main orchestration logic using durable operations
- **Features**: Automatic checkpointing, deterministic replay, state management

### Business Logic Modules
- **Data Processor**: Input processing and result aggregation
- **Parallel Operations**: Concurrent task definitions
- **Advanced Operations**: Wait conditions, invoke payloads, child context logic

### Helper Function
- **File**: `functions/hello-world/index.mjs`
- **Purpose**: Demonstrates function composition via `context.invoke()`
- **Returns**: Simple greeting with execution metadata

## Durable Operations Flow

```
Input Event
    ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  context.step() │ →  │ Checkpoint Save │ →  │ Business Logic  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
    ↓
┌─────────────────-┐    ┌─────────────────┐
│context.parallel()│ →  │ Concurrent Exec │
└─────────────────-┘    └─────────────────┘
    ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  context.map()  │ →  │ Item Processing │ →  │ Individual CPs  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
    ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│context.waitFor  │ →  │ Polling Logic   │ →  │ Retry w/Backoff │
│   Condition()   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
    ↓
┌─────────────────┐    ┌─────────────────┐
│context.invoke() │ →  │ Function Call   │
└─────────────────┘    └─────────────────┘
    ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│context.runIn    │ →  │ Isolated Exec   │ →  │ Separate Context│
│ChildContext()   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
    ↓
Final Results
```

## State Management

### Automatic Checkpointing
- Each `context.step()` creates a checkpoint
- Progress preserved across retries and failures
- Deterministic replay ensures consistency

### State Preservation
- Execution state maintained in AWS managed storage
- No manual state management required
- Automatic cleanup after retention period

### Error Handling
- Built-in retry mechanisms
- Graceful failure handling
- Comprehensive error reporting

## Resource Requirements

### Memory and Compute
- **Memory**: 1024 MB (configurable)
- **Timeout**: 15 minutes (function) / 1 hour (durable execution)
- **Architecture**: ARM64 for cost optimization

### Storage
- **Execution History**: 7 days retention
- **Checkpoint Data**: Managed by AWS
- **Logs**: CloudWatch Logs (configurable retention)

### Networking
- **VPC**: Not required (public Lambda)
- **Internet**: Required for external API calls (if any)
- **Security Groups**: Not applicable

## Cost Considerations

### Lambda Costs
- **Execution Time**: Charged per millisecond
- **Memory**: 1024 MB allocation
- **Requests**: Per invocation

### Durable Functions Costs
- **Execution Time**: Only active processing time
- **Wait Operations**: No charges during waits
- **Storage**: Checkpoint and state storage

### Optimization Tips
- Use `context.wait()` for long pauses (no compute charges)
- ARM64 architecture reduces costs by ~20%
- Efficient memory allocation (1024 MB optimal for this workload)

## Monitoring and Observability

### CloudWatch Integration
- **Logs**: Automatic log aggregation
- **Metrics**: Execution duration, success rate, error count
- **Tracing**: X-Ray integration available

### Custom Metrics
- Processing time per item
- Success rate calculations
- Operation counts and timing
- Comprehensive result aggregation

### Debugging
- Step-by-step execution logs
- Checkpoint visibility
- State inspection capabilities
- Replay debugging support