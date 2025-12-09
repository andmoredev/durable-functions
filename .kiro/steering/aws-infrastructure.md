# AWS Infrastructure Documentation

## Infrastructure Overview

This system compares **AWS Step Functions** vs **Lambda Durable Functions** for orchestrating an album registration workflow. Both patterns process the same workflow but use different orchestration mechanisms.

## Core AWS Services

### AWS Lambda
- **Runtime**: Node.js 22.x
- **Architecture**: ARM64 (cost-optimized)
- **Memory**: 1024 MB (default)
- **Timeout**: 15 minutes (Lambda function timeout)
- **Durable Execution Timeout**: 24 hours (for durable functions)
- **Tracing**: AWS X-Ray enabled

### Lambda Durable Functions
- **SDK**: @aws/durable-execution-sdk-js
- **Checkpoint/Replay**: Automatic state management
- **Execution Timeout**: Up to 1 year (configured to 24 hours)
- **Retention Period**: 14 days for execution history
- **Wait States**: Suspend without compute charges
- **Built-in Retries**: Automatic retry with exponential backoff

### AWS Step Functions
- **State Machine**: ASL (Amazon States Language) definition
- **Service Integrations**: Direct DynamoDB and Lambda calls
- **Map State**: Parallel processing of 6 albums
- **Wait State**: Human-in-the-loop pause
- **Built-in Retry**: Native error handling

### Amazon DynamoDB
- **Table**: Single table for all data
- **Billing**: Pay-per-request (on-demand)
- **Keys**: Composite primary key (pk, sk)
- **GSI**: GSI1 for alternative access patterns
- **Tenant Prefixes**: `sf#` and `ldf#` for data isolation

### Amazon S3
- **Bucket**: Image upload bucket
- **Events**: EventBridge integration for object creation
- **Lifecycle**: Optional cleanup policies
- **Versioning**: Enabled for audit trail

### AWS Bedrock
- **Model**: Vision model for image recognition
- **Usage**: Extract album metadata from images
- **Integration**: Called from Lambda functions

### Amazon CloudWatch
- **Metrics**: Custom metrics for both patterns
- **Logs**: Function execution logs
- **Dashboards**: Comparison visualizations
- **Alarms**: Optional alerting

## Workflow Architecture Comparison

### Step Functions Architecture
```
S3 Upload Event
    ↓
EventBridge
    ↓
Start Step Functions Execution
    ↓
┌─────────────────────────────────────┐
│ Step Functions State Machine        │
│                                     │
│ 1. Process Image (Lambda)           │
│    ↓                                │
│ 2. Store Initial Data (DynamoDB)    │
│    ↓                                │
│ 3. Wait for Human Validation        │
│    ↓                                │
│ 4. Update with Validated Data       │
│    ↓                                │
│ 5. Map State (Parallel)             │
│    ├─ Estimate Price Album 1        │
│    ├─ Estimate Price Album 2        │
│    ├─ Estimate Price Album 3        │
│    ├─ Estimate Price Album 4        │
│    ├─ Estimate Price Album 5        │
│    └─ Estimate Price Album 6        │
│    ↓                                │
│ 6. Store Final Results              │
└─────────────────────────────────────┘
```

### Durable Functions Architecture
```
S3 Upload Event
    ↓
EventBridge
    ↓
Invoke Durable Function
    ↓
┌─────────────────────────────────────┐
│ Durable Function (Single Lambda)    │
│                                     │
│ context.step('processImage')        │
│    ↓                                │
│ Loop: Store 6 albums to DynamoDB    │
│    ↓                                │
│ context.wait() - Human validation   │
│    ↓                                │
│ Loop: Update validated albums       │
│    ↓                                │
│ context.parallel() - 6 price agents │
│    ├─ context.step('price1')        │
│    ├─ context.step('price2')        │
│    ├─ context.step('price3')        │
│    ├─ context.step('price4')        │
│    ├─ context.step('price5')        │
│    └─ context.step('price6')        │
│    ↓                                │
│ Loop: Store final prices            │
│    ↓                                │
│ Return results                      │
└─────────────────────────────────────┘
```

## Key Differences

### State Management
- **Step Functions**: State passed between Lambda invocations via Step Functions service
- **Durable Functions**: State managed automatically via checkpoint/replay mechanism

### Parallelization
- **Step Functions**: Map state with native parallel execution
- **Durable Functions**: `context.parallel()` with array of steps

### Wait/Pause
- **Step Functions**: Wait state with task token for callbacks
- **Durable Functions**: `context.wait()` suspends execution without charges

### Loops
- **Step Functions**: Requires state machine loop constructs or Map state
- **Durable Functions**: Native JavaScript loops with `context.step()` inside

### Cost Model
- **Step Functions**: Charged per state transition
- **Durable Functions**: Charged for Lambda execution time (no charge during waits)

## Resource Relationships

### Dual Trigger Pattern
```
S3 Image Upload
    ↓
EventBridge Rule
    ├─→ Start Step Functions Execution (sf# prefix)
    └─→ Invoke Durable Function (ldf# prefix)
```

### Data Flow
```
Both Workflows
    ↓
DynamoDB (Single Table)
    ├─ sf#execution#... (Step Functions data)
    └─ ldf#execution#... (Durable Functions data)
```

## Environment Configuration

### Global Environment Variables
- `TABLE_NAME`: DynamoDB table name
- `BUCKET_NAME`: S3 bucket for images
- `BEDROCK_MODEL_ID`: Vision model identifier
- `AWS_REGION`: Deployment region

### Durable Function Configuration
- `ExecutionTimeout`: 86400 seconds (24 hours)
- `RetentionPeriodInDays`: 14 days
- Configured SAM template

### Step Functions Configuration
- `StateMachineArn`: ARN of state machine
- `TaskTokenTable`: Optional table for task tokens

## IAM Security Model

### Durable Function Permissions
- `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:UpdateItem`, `dynamodb:Query`
- `bedrock:InvokeModel`
- `s3:GetObject`
- `lambda:InvokeFunction` (for invoking other functions)
- `states:SendTaskSuccess`, `states:SendTaskFailure` (if integrating with Step Functions)

### Step Functions Permissions
- `lambda:InvokeFunction` (for all Lambda functions)
- `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:UpdateItem`
- `states:SendTaskSuccess`, `states:SendTaskFailure`

### Shared Function Permissions
- `bedrock:InvokeModel` (image processor)
- `dynamodb:PutItem` (price estimator)
- `s3:GetObject` (read images)

## Deployment Configuration

### SAM Template Structure
```yaml
Resources:
  # Shared Resources
  AlbumTable:
    Type: AWS::DynamoDB::Table
  
  ImageBucket:
    Type: AWS::S3::Bucket
  
  # Step Functions Implementation
  AlbumWorkflowStateMachine:
    Type: AWS::Serverless::StateMachine
  
  # Durable Functions Implementation
  DurableFunctionOrchestrator:
    Type: AWS::Serverless::Function
    Properties:
      DurableConfig:
        ExecutionTimeout: 86400
        RetentionPeriodInDays: 14
  
  # Shared Functions
  ImageProcessorFunction:
    Type: AWS::Serverless::Function
  
  PriceEstimatorFunction:
    Type: AWS::Serverless::Function
```

### Stack Outputs
- `StateMachineArn`: Step Functions state machine ARN
- `DurableFunctionArn`: Durable function ARN
- `TableName`: DynamoDB table name
- `BucketName`: S3 bucket name

## Monitoring and Observability

### CloudWatch Metrics

#### Step Functions Metrics
- `ExecutionTime`: Total execution duration
- `ExecutionsStarted`: Number of executions
- `ExecutionsSucceeded`: Successful completions
- `ExecutionsFailed`: Failed executions
- `ExecutionsTimedOut`: Timeout occurrences

#### Durable Functions Metrics
- Custom metrics via `context.logger`
- Lambda invocation metrics
- Execution duration (custom)
- Checkpoint count (custom)
- Replay count (custom)

### Cost Tracking
- **Step Functions**: State transitions × $0.000025
- **Durable Functions**: Lambda execution time × pricing
- **DynamoDB**: Read/write units
- **S3**: Storage and requests
- **Bedrock**: Model invocations

## Scalability Design

### Step Functions Scaling
- Automatic scaling up to account limits
- 1,000,000 open executions per account
- Parallel execution within Map state

### Durable Functions Scaling
- Lambda concurrency limits apply
- Checkpoint/replay enables long-running workflows
- Parallel execution via `context.parallel()`

## Disaster Recovery

### Step Functions
- Execution history retained for 90 days
- Can restart failed executions
- State machine definition in SAM template

### Durable Functions
- Execution history retained per configuration (14 days default)
- Automatic replay on failure
- Checkpoint data in managed storage
