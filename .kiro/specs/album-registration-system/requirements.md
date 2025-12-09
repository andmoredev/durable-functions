# Requirements Document

## Introduction

The Album Registration System is a comparison project that implements the same workflow using two different orchestration patterns: AWS Step Functions and Lambda Durable Functions. The system processes images of vinyl album collections, extracts metadata using AI vision, validates data through human-in-the-loop, and estimates prices using parallel agents.

## Glossary

- **Album Registration System**: The complete application comparing orchestration patterns
- **Durable Function**: AWS Lambda function using the Durable Execution SDK for workflow orchestration
- **Step Functions**: AWS native state machine service for workflow orchestration
- **Workflow**: The complete process from image upload to final album data storage
- **Album**: A vinyl record with metadata (name, artist, year) and price estimate
- **Human-in-the-Loop**: A workflow pause requiring human validation before proceeding
- **Parallel Agents**: Multiple concurrent executions estimating prices for different albums
- **Vision Model**: AWS Bedrock AI model for extracting album metadata from images
- **Execution**: A single run of a workflow processing one image

## Requirements

### Requirement 1: Image Upload and Trigger

**User Story:** As a user, I want to upload an image of 6 albums to S3, so that both orchestration patterns process it simultaneously for comparison.

#### Acceptance Criteria

1. WHEN a user uploads an image to the S3 bucket THEN the system SHALL trigger both Step Functions and Durable Functions workflows
2. WHEN both workflows are triggered THEN the system SHALL assign unique execution IDs to each workflow
3. WHEN an image is uploaded THEN the system SHALL validate the S3 key format is correct
4. WHEN workflows are triggered THEN the system SHALL tag each execution with its workflow type
5. WHEN workflows start THEN the system SHALL rely on native execution tracking for start timestamps

### Requirement 2: Image Processing with AI Vision

**User Story:** As a system, I want to extract album metadata from uploaded images using AI vision, so that I can identify the 6 albums in the collection.

#### Acceptance Criteria

1. WHEN the workflow processes an image THEN the system SHALL invoke AWS Bedrock vision model with the image
2. WHEN the vision model responds THEN the system SHALL extract exactly 6 album records
3. WHEN extracting album data THEN the system SHALL capture album name, artist, and year for each album
4. WHEN album data is extracted THEN the system SHALL assign an index (1-6) to each album
5. WHEN vision processing fails THEN the system SHALL retry up to 3 times with exponential backoff

### Requirement 3: Initial Data Storage

**User Story:** As a system, I want to store extracted album data in DynamoDB, so that I can track the workflow progress and maintain album records.

#### Acceptance Criteria

1. WHEN albums are extracted THEN the system SHALL store execution metadata in DynamoDB
2. WHEN storing execution metadata THEN the system SHALL include execution ID, workflow type, status, and start time
3. WHEN albums are extracted THEN the system SHALL store each album as a separate DynamoDB item
4. WHEN storing albums THEN the system SHALL use the execution ID as partition key and album index in sort key
5. WHEN storing data THEN the system SHALL include the workflow type attribute for pattern separation

### Requirement 4: Human-in-the-Loop Validation

**User Story:** As a user, I want to validate and correct album years, so that the final data is accurate before price estimation.

#### Acceptance Criteria

1. WHEN initial data is stored THEN the system SHALL create a validation task with pending status
2. WHEN a validation task is created THEN the system SHALL pause the workflow without incurring compute charges
3. WHEN a user submits validated data THEN the system SHALL resume the workflow with the corrected information
4. WHEN validation is submitted THEN the system SHALL update album records with validated years
5. WHEN validation times out after 1 hour THEN the system SHALL proceed with original data

### Requirement 5: Parallel Price Estimation

**User Story:** As a system, I want to estimate prices for all 6 albums concurrently, so that the workflow completes quickly.

#### Acceptance Criteria

1. WHEN validation completes THEN the system SHALL launch 6 parallel price estimation agents
2. WHEN estimating prices THEN the system SHALL process each album independently
3. WHEN a price is estimated THEN the system SHALL return price amount and confidence score
4. WHEN all estimates complete THEN the system SHALL collect all 6 results before proceeding
5. WHEN a price estimation fails THEN the system SHALL retry that specific album without affecting others

### Requirement 6: Final Data Storage and Metrics

**User Story:** As a system, I want to store final album data with prices and record workflow metrics, so that I can compare orchestration patterns.

#### Acceptance Criteria

1. WHEN price estimates are collected THEN the system SHALL update each album record with price and confidence
2. WHEN the workflow completes THEN the system SHALL update execution metadata with completion status
3. WHEN analyzing performance THEN the system SHALL retrieve execution duration from native workflow metrics
4. WHEN analyzing cost THEN the system SHALL calculate estimated cost based on native execution data
5. WHEN comparing patterns THEN the system SHALL use native execution timestamps from both orchestration systems

### Requirement 7: Durable Functions Implementation

**User Story:** As a developer, I want to implement the workflow using Lambda Durable Functions, so that I can leverage native checkpoint/replay orchestration.

#### Acceptance Criteria

1. WHEN implementing the workflow THEN the system SHALL use the Durable Execution SDK
2. WHEN orchestrating steps THEN the system SHALL use context.step() for each business logic operation
3. WHEN waiting for validation THEN the system SHALL use context.wait() with callback
4. WHEN processing albums in parallel THEN the system SHALL use context.map() or context.parallel()
5. WHEN the workflow replays THEN the system SHALL skip completed steps using stored results

### Requirement 8: Step Functions Implementation

**User Story:** As a developer, I want to implement the workflow using AWS Step Functions, so that I can leverage native state machine orchestration.

#### Acceptance Criteria

1. WHEN implementing the workflow THEN the system SHALL define the workflow in ASL (Amazon States Language)
2. WHEN orchestrating steps THEN the system SHALL invoke separate Lambda functions for each operation
3. WHEN waiting for validation THEN the system SHALL use Wait state with task token
4. WHEN processing albums in parallel THEN the system SHALL use Map state
5. WHEN errors occur THEN the system SHALL use built-in retry and catch mechanisms

### Requirement 9: Data Isolation and Comparison

**User Story:** As a developer, I want to isolate data between orchestration patterns, so that I can fairly compare their performance and cost.

#### Acceptance Criteria

1. WHEN storing data THEN the system SHALL include workflowType attribute in all records
2. WHEN querying data THEN the system SHALL filter by workflow type to separate patterns
3. WHEN both workflows process the same image THEN the system SHALL produce equivalent results
4. WHEN comparing patterns THEN the system SHALL track execution time for each workflow
5. WHEN comparing patterns THEN the system SHALL calculate estimated cost for each workflow

### Requirement 10: Error Handling and Observability

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can debug issues and monitor workflow health.

#### Acceptance Criteria

1. WHEN errors occur THEN the system SHALL log error details with execution context
2. WHEN workflows fail THEN the system SHALL update execution status to failed
3. WHEN using Durable Functions THEN the system SHALL use context.logger for correlated logs
4. WHEN using Step Functions THEN the system SHALL use CloudWatch Logs for execution history
5. WHEN workflows complete THEN the system SHALL emit custom CloudWatch metrics for monitoring
