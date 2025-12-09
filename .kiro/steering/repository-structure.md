# Repository Structure and Architecture

## Project Overview

This is an **Album Registration System** comparing **AWS Step Functions** vs **Lambda Durable Functions** orchestration patterns. The system processes album images, validates data through human-in-the-loop, and estimates prices using parallel agents.

**Key Technologies:**
- AWS SAM Framework
- Node.js 22.x (ESM modules)
- AWS Lambda Functions
- AWS Step Functions (one implementation)
- Lambda Durable Functions (native AWS orchestration with SDK)
- DynamoDB for data storage
- AWS Bedrock for image recognition
- S3 for image storage

## Directory Structure

```
├── .aws-sam/                    # SAM build artifacts (auto-generated)
├── .kiro/                       # Kiro configuration
│   ├── specs/                   # Feature specifications
│   │   └── lambda-durable-function/  # Durable function spec
│   └── steering/                # Development guidelines
├── workflows/                   # Workflow implementations
│   ├── step-functions/          # Step Functions state machine
│   │   └── definition.asl.json  # ASL state machine definition
│   └── durable-function/        # Lambda Durable Functions
│       ├── index.mjs             # Durable function handler
│       └── lib/                 # Business logic modules
├── functions/                   # Lambda function source code
│   ├── image-processor/         # Extract metadata from image
│   │   ├── index.mjs            # Handler
│   │   └── lib/                 # Business logic
│   ├── price-estimator/         # Estimate album price
│   │   ├── index.mjs            # Handler
│   │   └── lib/                 # Business logic
│   └── triggers/                # S3 event handlers
├── tests/                       # Test files
│   ├── step-functions/          # Step Functions tests
│   ├── durable-functions/       # Durable Functions tests
│   └── shared/                  # Shared test utilities
├── metrics/                     # Metrics collection and analysis
├── node_modules/                # NPM dependencies (auto-generated)
├── package.json                 # Node.js dependencies and scripts
├── template.yaml                # SAM CloudFormation template
└── samconfig.yaml               # SAM deployment configuration
```

## Core Architecture Patterns

### 1. Dual Orchestration Implementation
- **Step Functions**: Native AWS service for workflow orchestration
- **Durable Functions**: Native AWS Lambda Durable Execution with SDK
- **Parallel Execution**: Both triggered by same S3 event
- **Data Isolation**: Separate workflowType attributes for comparison

### 2. Function Organization
- **Durable Function**: Single Lambda with native checkpoint/replay orchestration
- **Step Functions**: Separate Lambda functions orchestrated by state machine
- **Business Logic**: Co-located with handlers in `lib/` folders
- **Trigger Functions**: Route S3 events to both workflows

### 3. Build Configuration
- **ESM modules**: All functions use ES modules (.mjs extension)
- **esbuild**: Bundling for Lambda deployment
- **ARM64 architecture**: Cost-optimized runtime
- **External AWS SDK**: Excluded from bundles

### 4. Data Storage Strategy
- **Single DynamoDB table**: All data in one table
- **Workflow Type Attribute**: `workflowType` field distinguishes patterns
- **Multi-Attribute Keys**: Natural keys without synthetic concatenation
- **Durable State**: Managed automatically by AWS Durable Execution service
- **Album Data**: Processed album information
- **Metrics**: Performance and cost data

## Workflow Categories

### Durable Function Workflow (`workflows/durable-function/`)
- **index.mjs**: Durable function handler using native AWS SDK
- **lib/image-processor.mjs**: Extract metadata from 6-album image
- **lib/album-repository.mjs**: DynamoDB operations for albums
- **lib/price-estimator.mjs**: Price estimation logic
- **lib/bedrock-client.mjs**: Bedrock API wrapper
- Uses `context.step()`, `context.wait()`, `context.parallel()` for orchestration
- Automatic checkpoint/replay managed by AWS

### Step Functions Workflow (`workflows/step-functions/`)
- **definition.asl.json**: ASL state machine definition
- Orchestrates separate Lambda functions
- Uses Map state for parallel price estimation
- Uses Wait state for human-in-the-loop

### Lambda Functions (`functions/`)

#### Image Processing (`functions/image-processor/`)
- **index.mjs**: Handler for Step Functions
- **lib/**: Business logic modules
- Uses AWS Bedrock vision model
- Returns array of 6 album objects

#### Price Estimation (`functions/price-estimator/`)
- **index.mjs**: Handler for Step Functions
- **lib/**: Business logic modules
- Calls external pricing APIs
- Returns price estimate with confidence

#### Triggers (`functions/triggers/`)
- **s3-trigger.mjs**: Handle S3 image upload events
- Start both Step Functions and Durable Functions workflows
- Record start time for metrics

## Key Configuration Files

### template.yaml
- **Dual Workflows**: Both Step Functions and Durable Functions resources
- **Shared Functions**: Image processor and price estimator
- **S3 Bucket**: Image upload bucket with event notifications
- **DynamoDB Table**: Single table for all data
- **IAM Policies**: Least-privilege access

### workflows/step-functions/definition.asl.json
- **State Machine Definition**: ASL for Step Functions workflow
- **Map State**: Parallel price estimation
- **Wait State**: Human-in-the-loop pause
- **Service Integrations**: Direct DynamoDB and Lambda calls

### workflows/durable-function/index.mjs
- **Native Orchestrator**: Uses AWS Durable Execution SDK
- **State Management**: Automatic checkpoint/replay by AWS
- **Parallel Execution**: `context.parallel()` for concurrency
- **Wait States**: `context.wait()` for human-in-the-loop
- **Deterministic Replay**: Code runs from beginning, skipping completed steps

## Development Standards

### Code Organization
- **Self-Contained Workflows**: Each workflow has its own business logic in `lib/`
- **Lean Handlers**: Handlers show workflow structure, logic in modules
- **Pattern-Specific**: Orchestration code separated by pattern
- **Single Responsibility**: Each module has one clear purpose
- **Error Handling**: Consistent patterns across both implementations

### Naming Conventions
- **Files**: kebab-case (e.g., `image-processor.mjs`)
- **Handlers**: Export `handler` function
- **Resources**: PascalCase in CloudFormation
- **Workflow Type**: `workflowType` attribute for data separation

### Dependencies
- **AWS SDK v3**: Modular imports
- **Durable Execution SDK**: `@aws/durable-execution-sdk-js`
- **Minimal Dependencies**: Keep bundle sizes small
- **Co-located Logic**: Business logic with handlers, not shared

## Comparison Infrastructure

### Metrics Collection
- **CloudWatch Metrics**: Custom metrics for both patterns
- **Execution Time**: Track workflow duration
- **Cost Estimation**: Calculate AWS charges
- **Success Rate**: Monitor completion rates

### Data Isolation
- **Workflow Type Attribute**: `workflowType` field distinguishes patterns
- **Shared Table**: Single DynamoDB table with multi-attribute keys
- **Independent Queries**: Filter by workflowType
- **Separate Metrics**: Different CloudWatch namespaces

## Deployment Patterns

### Single Stack Deployment
- **Both Patterns**: Deployed together in one stack
- **Shared Resources**: S3 bucket, DynamoDB table
- **Independent Workflows**: Can run separately
- **Unified Monitoring**: Single CloudWatch dashboard
