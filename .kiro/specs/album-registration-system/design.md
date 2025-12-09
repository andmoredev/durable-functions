# Design Document

## Overview

The Album Registration System implements a vinyl album processing workflow using two orchestration patterns: AWS Step Functions and Lambda Durable Functions. The system processes images containing 6 albums, extracts metadata using AI vision, validates data through human interaction, estimates prices in parallel, and stores complete records for comparison analysis.

The design emphasizes fair comparison by implementing identical workflows in both patterns while leveraging each pattern's native capabilities.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        S3 Image Upload                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    EventBridge Rule                          │
└────────┬────────────────────────────────────────────┬───────┘
         │                                             │
         ▼                                             ▼
┌────────────────────┐                    ┌──────────────────────┐
│  Step Functions    │                    │  Durable Function    │
│  State Machine     │                    │  (Single Lambda)     │
└────────────────────┘                    └──────────────────────┘
         │                                             │
         │                                             │
         ▼                                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      DynamoDB Table                          │
│              (workflowType attribute separates data)         │
└─────────────────────────────────────────────────────────────┘
```

### Workflow Comparison

Both patterns implement the same 6-step workflow:

1. **Process Image** → Extract 6 albums using Bedrock vision
2. **Store Initial Data** → Save execution and album records
3. **Wait for Validation** → Pause for human input
4. **Update Validated Data** → Apply corrections
5. **Estimate Prices** → 6 parallel agents
6. **Store Final Results** → Update with prices and status

## Components and Interfaces

### Durable Function Workflow

**Location:** `workflows/durable-function/index.mjs`

```javascript
import { withDurableExecution } from '@aws/durable-execution-sdk-js';
import { processImage } from './lib/image-processor.mjs';
import { saveExecution, saveAlbums, updateAlbums } from './lib/album-repository.mjs';
import { estimatePrice } from './lib/price-estimator.mjs';

export const handler = withDurableExecution(async (event, context) => {
  const { imageS3Key } = event;
  
  // Step 1: Process image
  const albums = await context.step('processImage', async () => 
    processImage(imageS3Key)
  );
  
  // Step 2: Store initial data
  await context.step('saveExecution', async () =>
    saveExecution(context.executionId, imageS3Key, 'running')
  );
  
  await context.map(albums, async (album, i) =>
    context.step(`saveAlbum-${i}`, async () =>
      saveAlbums(context.executionId, album)
    )
  );
  
  // Step 3: Wait for validation
  const validatedData = await context.wait({
    callback: { id: `validation-${context.executionId}` }
  });
  
  // Step 4: Update validated data
  await context.map(validatedData.albums, async (album, i) =>
    context.step(`updateAlbum-${i}`, async () =>
      updateAlbums(context.executionId, album)
    )
  );
  
  // Step 5: Estimate prices in parallel
  const prices = await context.map(albums, async (album, i) =>
    context.step(`estimatePrice-${i}`, async () =>
      estimatePrice(album)
    )
  );
  
  // Step 6: Store final results
  await context.map(prices, async (price, i) =>
    context.step(`saveFinalAlbum-${i}`, async () =>
      updateAlbums(context.executionId, { ...albums[i], ...price })
    )
  );
  
  await context.step('completeExecution', async () =>
    saveExecution(context.executionId, imageS3Key, 'completed')
  );
  
  return { executionId: context.executionId, albumCount: albums.length };
});
```

### Step Functions State Machine

**Location:** `workflows/step-functions/definition.asl.json`

```json
{
  "Comment": "Album Registration Workflow",
  "StartAt": "ProcessImage",
  "States": {
    "ProcessImage": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:ImageProcessor",
      "Next": "SaveInitialData"
    },
    "SaveInitialData": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "SaveExecution",
          "States": {
            "SaveExecution": {
              "Type": "Task",
              "Resource": "arn:aws:states:::dynamodb:putItem",
              "End": true
            }
          }
        },
        {
          "StartAt": "SaveAlbums",
          "States": {
            "SaveAlbums": {
              "Type": "Map",
              "ItemsPath": "$.albums",
              "Iterator": {
                "StartAt": "SaveAlbum",
                "States": {
                  "SaveAlbum": {
                    "Type": "Task",
                    "Resource": "arn:aws:states:::dynamodb:putItem",
                    "End": true
                  }
                }
              },
              "End": true
            }
          }
        }
      ],
      "Next": "WaitForValidation"
    },
    "WaitForValidation": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
      "Next": "UpdateValidatedData"
    },
    "UpdateValidatedData": {
      "Type": "Map",
      "ItemsPath": "$.validatedAlbums",
      "Iterator": {
        "StartAt": "UpdateAlbum",
        "States": {
          "UpdateAlbum": {
            "Type": "Task",
            "Resource": "arn:aws:states:::dynamodb:updateItem",
            "End": true
          }
        }
      },
      "Next": "EstimatePrices"
    },
    "EstimatePrices": {
      "Type": "Map",
      "ItemsPath": "$.albums",
      "MaxConcurrency": 6,
      "Iterator": {
        "StartAt": "EstimatePrice",
        "States": {
          "EstimatePrice": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:PriceEstimator",
            "End": true
          }
        }
      },
      "Next": "StoreFinalResults"
    },
    "StoreFinalResults": {
      "Type": "Map",
      "ItemsPath": "$.prices",
      "Iterator": {
        "StartAt": "SaveFinalAlbum",
        "States": {
          "SaveFinalAlbum": {
            "Type": "Task",
            "Resource": "arn:aws:states:::dynamodb:updateItem",
            "End": true
          }
        }
      },
      "Next": "CompleteExecution"
    },
    "CompleteExecution": {
      "Type": "Task",
      "Resource": "arn:aws:states:::dynamodb:updateItem",
      "End": true
    }
  }
}
```

### Business Logic Modules

#### Image Processor
**Location:** `workflows/durable-function/lib/image-processor.mjs`

```javascript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export async function processImage(imageS3Key) {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
  
  const prompt = `Analyze this image of 6 vinyl albums. Extract:
  - Album name
  - Artist
  - Year
  Return as JSON array with 6 objects.`;
  
  const response = await client.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 's3', s3_location: { uri: `s3://${process.env.BUCKET_NAME}/${imageS3Key}` } } },
          { type: 'text', text: prompt }
        ]
      }]
    })
  }));
  
  const result = JSON.parse(new TextDecoder().decode(response.body));
  const albums = JSON.parse(result.content[0].text);
  
  return albums.map((album, index) => ({
    albumIndex: index + 1,
    albumName: album.albumName,
    artist: album.artist,
    year: album.year,
    yearValidated: false
  }));
}
```

#### Album Repository
**Location:** `workflows/durable-function/lib/album-repository.mjs`

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function saveExecution(executionId, imageS3Key, status) {
  await client.send(new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: executionId,
      sk: 'metadata',
      entityType: 'execution',
      workflowType: 'durable-functions',
      executionId,
      imageS3Key,
      status,
      createdAt: new Date().toISOString()
    }
  }));
}

export async function saveAlbums(executionId, album) {
  await client.send(new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: executionId,
      sk: `album-${album.albumIndex}`,
      entityType: 'album',
      workflowType: 'durable-functions',
      executionId,
      ...album,
      createdAt: new Date().toISOString()
    }
  }));
}

export async function updateAlbums(executionId, album) {
  await client.send(new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: executionId,
      sk: `album-${album.albumIndex}`
    },
    UpdateExpression: 'SET #year = :year, yearValidated = :validated, priceEstimate = :price, priceConfidence = :confidence, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#year': 'year'
    },
    ExpressionAttributeValues: {
      ':year': album.year,
      ':validated': album.yearValidated || true,
      ':price': album.priceEstimate,
      ':confidence': album.priceConfidence,
      ':updatedAt': new Date().toISOString()
    }
  }));
}
```

#### Price Estimator
**Location:** `workflows/durable-function/lib/price-estimator.mjs`

```javascript
export async function estimatePrice(album) {
  // Simulate external pricing API call
  const basePrice = 15 + Math.random() * 50;
  const yearFactor = album.year < 1980 ? 1.5 : 1.0;
  const price = Math.round(basePrice * yearFactor * 100) / 100;
  
  return {
    priceEstimate: price,
    priceConfidence: 0.7 + Math.random() * 0.3,
    priceSource: 'discogs-api'
  };
}
```

## Data Models

### Execution Entity

```javascript
{
  pk: "exec-123",                    // Partition key
  sk: "metadata",                    // Sort key
  entityType: "execution",
  workflowType: "durable-functions", // or "step-functions"
  executionId: "exec-123",
  imageS3Key: "uploads/albums.jpg",
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z"
}
```

### Album Entity

```javascript
{
  pk: "exec-123",                    // Partition key
  sk: "album-1",                     // Sort key
  entityType: "album",
  workflowType: "durable-functions",
  executionId: "exec-123",
  albumIndex: 1,
  albumName: "The Dark Side of the Moon",
  artist: "Pink Floyd",
  year: 1973,
  yearValidated: true,
  yearOriginal: 1973,
  priceEstimate: 45.00,
  priceConfidence: 0.85,
  priceSource: "discogs-api",
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:35:00Z"
}
```

### Validation Task Entity

```javascript
{
  pk: "task-abc123",                 // Partition key
  sk: "metadata",                    // Sort key
  entityType: "task",
  workflowType: "durable-functions",
  taskId: "task-abc123",
  executionId: "exec-123",
  status: "pending",                 // pending|completed|timeout
  albums: [
    {
      albumIndex: 1,
      albumName: "The Dark Side of the Moon",
      artist: "Pink Floyd",
      year: 1973
    }
  ],
  taskToken: "callback-id-or-task-token",
  expiresAt: "2025-01-15T11:30:00Z",
  createdAt: "2025-01-15T10:30:00Z"
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Dual Workflow Trigger
*For any* S3 image upload event, both Step Functions and Durable Functions workflows should be triggered
**Validates: Requirements 1.1**

### Property 2: Unique Execution IDs
*For any* set of workflow invocations, all execution IDs should be unique across both patterns
**Validates: Requirements 1.2**

### Property 3: S3 Key Validation
*For any* S3 key input, invalid formats should be rejected and valid formats should be accepted
**Validates: Requirements 1.3**

### Property 4: Workflow Type Tagging
*For any* execution, the workflowType attribute should correctly identify the orchestration pattern
**Validates: Requirements 1.4**

### Property 5: Vision Model Invocation
*For any* image processing step, the Bedrock vision model should be invoked with correct parameters
**Validates: Requirements 2.1**

### Property 6: Exact Album Count
*For any* vision model response, exactly 6 album records should be extracted
**Validates: Requirements 2.2**

### Property 7: Album Data Completeness
*For any* extracted album, albumName, artist, and year fields should all be present
**Validates: Requirements 2.3**

### Property 8: Album Index Uniqueness
*For any* set of extracted albums, indices should be unique and range from 1 to 6
**Validates: Requirements 2.4**

### Property 9: Vision Processing Retry
*For any* vision processing failure, the system should retry up to 3 times with exponential backoff
**Validates: Requirements 2.5**

### Property 10: Execution Metadata Storage
*For any* album extraction, execution metadata should be stored in DynamoDB
**Validates: Requirements 3.1**

### Property 11: Execution Metadata Completeness
*For any* stored execution record, executionId, workflowType, status, and createdAt fields should be present
**Validates: Requirements 3.2**

### Property 12: Album Item Separation
*For any* execution with 6 albums, exactly 6 separate DynamoDB items should be created
**Validates: Requirements 3.3**

### Property 13: Album Key Structure
*For any* stored album, the partition key should be the execution ID and sort key should contain the album index
**Validates: Requirements 3.4**

### Property 14: Workflow Type Attribute
*For any* stored item, the workflowType attribute should be present and correct
**Validates: Requirements 3.5**

### Property 15: Validation Task Creation
*For any* execution after initial data storage, a validation task with pending status should be created
**Validates: Requirements 4.1**

### Property 16: Workflow Pause
*For any* validation task creation, the workflow should pause without active compute
**Validates: Requirements 4.2**

### Property 17: Workflow Resumption
*For any* validation submission, the workflow should resume with the corrected data
**Validates: Requirements 4.3**

### Property 18: Validation Data Round-Trip
*For any* validated album data, the submitted corrections should be reflected in stored records
**Validates: Requirements 4.4**

### Property 19: Validation Timeout Handling
*For any* validation task that times out, the workflow should proceed with original data
**Validates: Requirements 4.5**

### Property 20: Parallel Price Estimation Count
*For any* completed validation, exactly 6 parallel price estimation agents should be launched
**Validates: Requirements 5.1**

### Property 21: Price Estimation Independence
*For any* price estimation failure, other estimations should continue unaffected
**Validates: Requirements 5.2**

### Property 22: Price Estimate Completeness
*For any* price estimate, both priceEstimate and priceConfidence fields should be present
**Validates: Requirements 5.3**

### Property 23: Price Estimation Synchronization
*For any* price estimation phase, the workflow should wait for all 6 results before proceeding
**Validates: Requirements 5.4**

### Property 24: Isolated Price Retry
*For any* failed price estimation, only that specific album should be retried without affecting others
**Validates: Requirements 5.5**

### Property 25: Album Price Update
*For any* completed price estimation, all album records should be updated with price and confidence
**Validates: Requirements 6.1**

### Property 26: Execution Completion Tracking
*For any* completed workflow, execution metadata should be updated with completion status
**Validates: Requirements 6.2**

### Property 27: Deterministic Replay
*For any* Durable Function execution that replays, the final result should be identical to the original execution
**Validates: Requirements 7.5**

### Property 28: Error Retry Mechanism
*For any* Step Functions error, the built-in retry mechanism should trigger according to configuration
**Validates: Requirements 8.5**

### Property 29: Workflow Type Filtering
*For any* data query, filtering by workflowType should correctly separate Step Functions and Durable Functions data
**Validates: Requirements 9.2**

### Property 30: Workflow Equivalence
*For any* image processed by both workflows, the extracted albums and estimated prices should be equivalent
**Validates: Requirements 9.3**

### Property 31: Error Logging
*For any* error occurrence, logs should include error details and execution context
**Validates: Requirements 10.1**

### Property 32: Failure Status Update
*For any* failed workflow, the execution status should be updated to "failed"
**Validates: Requirements 10.2**

### Property 33: Metrics Emission
*For any* completed workflow, custom CloudWatch metrics should be emitted
**Validates: Requirements 10.5**

## Error Handling

### Durable Functions Error Handling

```javascript
// Automatic retry with exponential backoff
await context.step('processImage', async () => {
  try {
    return await processImage(imageS3Key);
  } catch (error) {
    context.logger.error('Image processing failed', { error: error.message });
    throw error; // SDK handles retry automatically
  }
});

// Graceful degradation for validation timeout
const validatedData = await context.wait({
  callback: { id: `validation-${context.executionId}` },
  timeout: { seconds: 3600 }
});

if (!validatedData) {
  // Timeout occurred, proceed with original data
  context.logger.warn('Validation timeout, using original data');
}
```

### Step Functions Error Handling

```json
{
  "ProcessImage": {
    "Type": "Task",
    "Resource": "arn:aws:lambda:...:function:ImageProcessor",
    "Retry": [
      {
        "ErrorEquals": ["States.ALL"],
        "IntervalSeconds": 2,
        "MaxAttempts": 3,
        "BackoffRate": 2.0
      }
    ],
    "Catch": [
      {
        "ErrorEquals": ["States.ALL"],
        "ResultPath": "$.error",
        "Next": "HandleError"
      }
    ]
  }
}
```

## Testing Strategy

### Unit Testing

Unit tests focus on business logic modules in isolation:

- **Image Processor**: Test Bedrock API calls and response parsing
- **Album Repository**: Test DynamoDB operations and key generation
- **Price Estimator**: Test price calculation logic

### Property-Based Testing

Property-based tests verify universal properties across many inputs using **fast-check** for JavaScript:

- Configure each property test to run minimum 100 iterations
- Tag each test with format: `**Feature: album-registration-system, Property {number}: {property_text}**`
- Each correctness property should have ONE corresponding property-based test
- Focus on core workflow logic and data transformations

Example property test:

```javascript
import fc from 'fast-check';

describe('Album Registration - Property Tests', () => {
  it('Property 6: Exact Album Count', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          albumName: fc.string(),
          artist: fc.string(),
          year: fc.integer({ min: 1900, max: 2100 })
        }), { minLength: 1, maxLength: 10 }),
        async (mockResponse) => {
          // **Feature: album-registration-system, Property 6: Exact Album Count**
          const albums = await processImage('test-image.jpg');
          expect(albums).toHaveLength(6);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

Integration tests verify end-to-end workflow execution:

- Test complete workflow from S3 upload to final storage
- Verify both orchestration patterns produce equivalent results
- Test human-in-the-loop validation flow
- Test parallel price estimation coordination

### Comparison Testing

Comparison tests ensure fair evaluation:

- Run identical inputs through both patterns
- Compare execution times using native metrics
- Compare final data structures for equivalence
- Verify data isolation between patterns

## Performance Considerations

### Durable Functions Optimization

- Keep step callbacks focused and fast
- Use `context.map()` for parallel operations
- Use `context.wait()` for long pauses (no compute charges)
- Minimize work outside of steps to ensure deterministic replay

### Step Functions Optimization

- Use service integrations for DynamoDB operations
- Leverage Map state for parallel processing
- Keep state objects small and focused
- Use appropriate retry and timeout configurations

## Security Considerations

- **IAM Policies**: Least-privilege access for all functions
- **Data Encryption**: DynamoDB encryption at rest
- **S3 Security**: Bucket policies restricting access
- **Secrets Management**: Use AWS Secrets Manager for API keys
- **Input Validation**: Validate all user inputs and S3 keys

## Deployment Strategy

- **Single Stack**: Deploy both patterns in one CloudFormation stack
- **Shared Resources**: S3 bucket and DynamoDB table shared between patterns
- **Independent Workflows**: Each pattern can be tested independently
- **Gradual Rollout**: Test with small image sets before full deployment

## Monitoring and Observability

### CloudWatch Metrics

- **Execution Count**: Track workflow invocations per pattern
- **Success Rate**: Monitor completion vs failure rates
- **Duration**: Track execution time for comparison
- **Cost Estimates**: Calculate and track estimated costs

### CloudWatch Logs

- **Durable Functions**: Use `context.logger` for correlated logs
- **Step Functions**: Leverage execution history and CloudWatch Logs
- **Error Tracking**: Centralized error logging with context

### Dashboards

Create comparison dashboards showing:
- Side-by-side execution metrics
- Cost comparison over time
- Success rate trends
- Performance percentiles
