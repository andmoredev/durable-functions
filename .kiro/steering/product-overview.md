# Product Overview: Album Registration System - Orchestration Pattern Comparison

## Product Vision

**Automate vinyl album registration through image recognition and parallel price estimation, while comparing Step Functions vs Lambda Durable Functions orchestration patterns.**

This system processes images of six albums at a time, extracts metadata (album name, artist, year), enriches data through human-in-the-loop validation, and estimates prices using parallel agent processing. The same workflow is implemented in both AWS Step Functions and Lambda Durable Functions to provide a practical comparison of performance, cost, and testing approaches.

## Product Mission

To provide a hands-on comparison of workflow orchestration patterns in a real-world scenario, demonstrating the trade-offs between AWS Step Functions and Lambda Durable Functions while building a useful album registration system.

## Core Comparison Goals

### What We're Comparing
1. **Performance**: Execution time for identical workflows
2. **Cost**: AWS charges for each orchestration approach
3. **Testing**: Ease of writing and maintaining tests
4. **Development Experience**: Code complexity and maintainability
5. **Observability**: Monitoring and debugging capabilities

### Dual Implementation Strategy
- **Step Functions**: Native AWS orchestration service
- **Lambda Durable Functions**: Custom orchestration in Lambda
- **Tenant Separation**: Data prefixed differently (sf# vs ldf#) to keep results isolated
- **Parallel Execution**: Both workflows triggered by same S3 image upload
- **Metrics Collection**: CloudWatch metrics for cost and performance analysis

## Target Users

### Primary User
- **Developers**: Evaluating orchestration patterns for serverless workflows
- **Architects**: Making technology decisions for workflow orchestration
- **Vinyl Collectors**: Secondary benefit - actual album registration system

## Core Workflow

### Image Upload Trigger
1. User uploads image of 6 albums to S3
2. S3 event triggers both workflows simultaneously
3. Each workflow processes independently with separate data stores

### Workflow Steps (Identical in Both Implementations)

#### Step 1: Image Processing
- Extract metadata for all 6 albums from single image
- Use AI vision model (AWS Bedrock) to identify:
  - Album name
  - Artist
  - Year (initial estimate)
- Store initial data with workflow-specific prefix

#### Step 2: Human-in-the-Loop Enrichment
- Present extracted data to user for validation
- Focus on year correction (can expand later)
- Wait for human input before proceeding
- Update records with validated data

#### Step 3: Parallel Price Estimation
- Launch 6 parallel agents (one per album)
- Each agent estimates album price independently
- Agents can call external pricing APIs
- Collect all results when complete

#### Step 4: Final Storage
- Store complete album records with prices
- Record workflow metrics (duration, cost estimates)
- Mark workflow as complete

## Key Features

### Image Processing
- **Batch Recognition**: Process 6 albums per image
- **AI Vision**: AWS Bedrock for album identification
- **Metadata Extraction**: Album name, artist, year
- **Error Handling**: Graceful handling of unclear images

### Human-in-the-Loop
- **Validation Interface**: Simple UI for data correction
- **Workflow Pause**: Wait for human input
- **Resume Capability**: Continue after validation
- **Timeout Handling**: Proceed with original data if no response

### Parallel Price Estimation
- **6 Concurrent Agents**: One per album
- **Independent Execution**: No dependencies between agents
- **External API Calls**: Pricing service integration
- **Result Aggregation**: Collect all estimates

### Metrics & Comparison
- **Execution Time**: Track total workflow duration
- **Cost Tracking**: Estimate AWS charges per workflow
- **Success Rate**: Monitor completion rates
- **Error Analysis**: Compare error handling approaches

## Technical Architecture

### Dual Orchestration Patterns

#### Step Functions Implementation
- **State Machine**: ASL (Amazon States Language) definition
- **Map State**: Parallel processing of 6 albums
- **Wait State**: Human-in-the-loop pause
- **Service Integrations**: Direct DynamoDB and Lambda calls
- **Built-in Retry**: Native error handling

#### Lambda Durable Functions Implementation
- **Native SDK Orchestration**: Built-in checkpoint/replay mechanism
- **Automatic State Management**: SDK handles state persistence transparently
- **Native Parallelization**: `context.parallel()` for concurrent execution
- **Built-in Wait**: `context.wait()` suspends without compute charges
- **Automatic Retry**: Built-in retry with exponential backoff
- **Deterministic Replay**: Code runs from beginning, skipping completed steps

### Data Isolation Strategy
- **Step Functions Data**: Prefixed with `sf#`
- **Durable Functions Data**: Prefixed with `ldf#`
- **Shared Table**: Single DynamoDB table with tenant-like separation
- **Independent Metrics**: Separate CloudWatch namespaces

### AWS Services Used
- **S3**: Image storage and event trigger
- **Lambda**: Function execution for both patterns
- **Step Functions**: Native orchestration (one implementation)
- **Lambda Durable Execution**: Managed checkpoint/replay service (other implementation)
- **DynamoDB**: Album data storage (both patterns)
- **Bedrock**: AI vision for image processing
- **CloudWatch**: Metrics and logging
- **EventBridge**: Event routing for triggers

## Success Metrics

### Performance Comparison
- **Cold Start Impact**: First execution vs warm executions
- **Total Duration**: End-to-end workflow time
- **Parallel Efficiency**: Time savings from concurrent agents
- **Latency Breakdown**: Time per workflow step

### Cost Comparison
- **Lambda Costs**: Execution time and memory
- **Step Functions Costs**: State transitions
- **DynamoDB Costs**: Read/write operations
- **Total Cost Per Workflow**: Complete comparison

### Testing Comparison
- **Test Coverage**: Achievable coverage for each pattern
- **Test Complexity**: Lines of test code required
- **Mock Requirements**: External dependencies to mock
- **Integration Testing**: Ease of end-to-end testing

### Development Experience
- **Code Complexity**: Lines of code and maintainability
- **Debugging Ease**: Troubleshooting failed workflows
- **Observability**: Visibility into workflow execution
- **Error Handling**: Complexity of retry logic

## Roadmap

### Phase 1: Core Comparison (Current)
- Implement both orchestration patterns
- Basic image processing with Bedrock
- Human-in-the-loop for year validation
- Parallel price estimation agents
- Metrics collection infrastructure

### Phase 2: Enhanced Testing
- Comprehensive test suites for both patterns
- Performance benchmarking automation
- Cost tracking dashboard
- Comparison report generation

### Phase 3: Extended Comparison
- Add more complex workflow scenarios
- Test error handling and retries
- Evaluate long-running workflows
- Compare scaling characteristics
