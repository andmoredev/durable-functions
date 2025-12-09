# Data Models and Schema Patterns

## Database Design Philosophy

**Keep data models simple with tenant-like prefixes for pattern separation.**

This system uses **single-table design** in DynamoDB with `sf#` and `ldf#` prefixes to separate Step Functions and Lambda Durable Functions data. This allows direct comparison while keeping data isolated.

## Table Structure

### Primary Keys
- **Partition Key (pk)**: Natural entity identifier (no synthetic concatenation)
- **Sort Key (sk)**: Entity subtype or relationship identifier

### Global Secondary Indexes with Multi-Attribute Keys

DynamoDB now supports **up to 8 attributes** in GSI keys (4 for partition, 4 for sort). This eliminates the need for synthetic concatenated keys.

#### GSI1: Query by Workflow Type and Status
- **Partition Key** (multi-attribute): `[workflowType, entityType]`
- **Sort Key** (multi-attribute): `[status, createdAt]`
- **Use Cases**: List all running executions, query tasks by status, filter by date range

#### GSI2: Query by Execution Context
- **Partition Key** (multi-attribute): `[workflowType, executionId]`
- **Sort Key** (multi-attribute): `[entityType, sortValue]`
- **Use Cases**: Get all albums for an execution, query execution-specific data

### Benefits of Multi-Attribute Keys
- **No synthetic keys**: Use natural attributes instead of concatenating strings like `"sf#execution#123"`
- **Flexible querying**: Query by workflowType, then narrow by entityType, status, or timestamp
- **Better data distribution**: Multi-attribute partition keys improve uniqueness
- **No backfilling**: Add new indexes using existing attributes without data migration
- **Left-to-right querying**: Specify conditions on sort key attributes from left to right

### Common Attributes
- **entityType**: "execution", "album", "task", "metrics"
- **workflowType**: "step-functions" or "durable-functions"
- **createdAt**: ISO 8601 timestamp
- **updatedAt**: ISO 8601 timestamp

## Entity Models

### Workflow Execution Entity

#### Step Functions Execution
```json
{
  "pk": "exec-123",
  "sk": "metadata",
  "entityType": "execution",
  "workflowType": "step-functions",
  "executionId": "exec-123",
  "imageS3Key": "uploads/albums-2025-01-15.jpg",
  "status": "running",
  "startTime": "2025-01-15T10:30:00Z",
  "endTime": null,
  "durationMs": null,
  "estimatedCost": null,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

#### Durable Functions Execution
```json
{
  "pk": "exec-456",
  "sk": "metadata",
  "entityType": "execution",
  "workflowType": "durable-functions",
  "executionId": "exec-456",
  "imageS3Key": "uploads/albums-2025-01-15.jpg",
  "status": "running",
  "currentStep": "image-processing",
  "startTime": "2025-01-15T10:30:00Z",
  "endTime": null,
  "durationMs": null,
  "estimatedCost": null,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

#### Access Patterns with Multi-Attribute Keys
- **Get execution by ID**: `pk = {executionId}` AND `sk = metadata`
- **List all executions by workflow type**: GSI1 query with partition key `[workflowType, "execution"]`
- **List running executions**: GSI1 query with partition key `[workflowType, "execution"]` AND sort key begins with `["running"]`
- **List executions by date range**: GSI1 query with partition key `[workflowType, "execution"]` AND sort key range on `[status, createdAt]`
- **Query specific workflow execution**: GSI2 query with partition key `[workflowType, executionId]`

### Album Entity

#### Album Record (Step Functions)
```json
{
  "pk": "exec-123",
  "sk": "album-1",
  "entityType": "album",
  "workflowType": "step-functions",
  "executionId": "exec-123",
  "albumIndex": 1,
  "albumName": "The Dark Side of the Moon",
  "artist": "Pink Floyd",
  "year": 1973,
  "yearValidated": true,
  "yearOriginal": 1973,
  "priceEstimate": 45.00,
  "priceConfidence": 0.85,
  "priceSource": "discogs-api",
  "imageRegion": {
    "x": 0,
    "y": 0,
    "width": 200,
    "height": 200
  },
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

#### Album Record (Durable Functions)
```json
{
  "pk": "exec-456",
  "sk": "album-1",
  "entityType": "album",
  "workflowType": "durable-functions",
  "executionId": "exec-456",
  "albumIndex": 1,
  "albumName": "The Dark Side of the Moon",
  "artist": "Pink Floyd",
  "year": 1973,
  "yearValidated": true,
  "yearOriginal": 1973,
  "priceEstimate": 45.00,
  "priceConfidence": 0.85,
  "priceSource": "discogs-api",
  "imageRegion": {
    "x": 0,
    "y": 0,
    "width": 200,
    "height": 200
  },
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

#### Access Patterns with Multi-Attribute Keys
- **Get specific album**: `pk = {executionId}` AND `sk = album-{index}`
- **List all albums for execution**: `pk = {executionId}` AND `sk` begins with `album-`
- **Query albums by workflow type**: GSI2 query with partition key `[workflowType, executionId]` AND sort key begins with `["album"]`
- **Query specific album by workflow**: GSI2 query with partition key `[workflowType, executionId]` AND sort key `["album", albumIndex]`

### Human Validation Task Entity

#### Validation Task
```json
{
  "pk": "task-abc123",
  "sk": "metadata",
  "entityType": "task",
  "workflowType": "step-functions",
  "taskId": "task-abc123",
  "executionId": "exec-123",
  "status": "pending",
  "imageS3Key": "uploads/albums-2025-01-15.jpg",
  "albums": [
    {
      "albumIndex": 1,
      "albumName": "The Dark Side of the Moon",
      "artist": "Pink Floyd",
      "year": 1973
    },
    {
      "albumIndex": 2,
      "albumName": "Abbey Road",
      "artist": "The Beatles",
      "year": 1969
    }
  ],
  "validatedData": null,
  "taskToken": "step-functions-task-token-or-callback-id",
  "expiresAt": "2025-01-15T11:30:00Z",
  "createdAt": "2025-01-15T10:30:00Z",
  "completedAt": null
}
```

#### Access Patterns with Multi-Attribute Keys
- **Get task by ID**: `pk = {taskId}` AND `sk = metadata`
- **List pending tasks**: GSI1 query with partition key `["any", "task"]` AND sort key begins with `["pending"]`
- **List tasks by workflow and status**: GSI1 query with partition key `[workflowType, "task"]` AND sort key begins with `[status]`
- **List tasks by date range**: GSI1 query with sort key range on `[status, createdAt]`
- **Find tasks by execution**: GSI2 query with partition key `[workflowType, executionId]` AND sort key begins with `["task"]`

### Metrics Entity

#### Workflow Metrics
```json
{
  "pk": "2025-01-15",
  "sk": "metrics-step-functions",
  "entityType": "metrics",
  "workflowType": "step-functions",
  "date": "2025-01-15",
  "period": "daily",
  "executionCount": 25,
  "successCount": 23,
  "failureCount": 2,
  "avgDurationMs": 45000,
  "totalCost": 0.15,
  "avgCostPerExecution": 0.006,
  "createdAt": "2025-01-15T23:59:59Z"
}
```

#### Access Patterns with Multi-Attribute Keys
- **Get daily metrics for workflow**: `pk = {date}` AND `sk = metrics-{workflowType}`
- **Compare patterns**: Query `pk = {date}` AND `sk` begins with `metrics-` to get both workflow metrics
- **List metrics by workflow type**: GSI1 query with partition key `[workflowType, "metrics"]`
- **Query metrics by date range**: GSI1 query with partition key `[workflowType, "metrics"]` AND sort key range on `["daily", createdAt]`

## Data Validation Patterns

### Zod Schemas

#### Album Schema
```javascript
import { z } from 'zod';

export const AlbumSchema = z.object({
  albumName: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  year: z.number().int().min(1900).max(2100),
  yearValidated: z.boolean().default(false),
  priceEstimate: z.number().positive().optional(),
  priceConfidence: z.number().min(0).max(1).optional()
});
```

#### Execution Schema
```javascript
export const ExecutionSchema = z.object({
  executionId: z.string().uuid(),
  workflowType: z.enum(['step-functions', 'durable-functions']),
  imageS3Key: z.string().min(1),
  status: z.enum(['running', 'waiting', 'completed', 'failed'])
});
```

## Key Generation Patterns

### Execution ID
```javascript
import { randomUUID } from 'crypto';

export const generateExecutionId = () => randomUUID();
```

### Primary Key Helpers
```javascript
export const createExecutionKey = (executionId) => ({
  pk: executionId,
  sk: 'metadata'
});

export const createAlbumKey = (executionId, albumIndex) => ({
  pk: executionId,
  sk: `album-${albumIndex}`
});

export const createTaskKey = (taskId) => ({
  pk: taskId,
  sk: 'metadata'
});

export const createMetricsKey = (date, workflowType) => ({
  pk: date,
  sk: `metrics-${workflowType}`
});
```

### Multi-Attribute GSI Key Helpers
```javascript
// GSI1: Query by workflow type, entity type, status, and date
export const createGSI1Key = (workflowType, entityType, status, createdAt) => ({
  GSI1PK: [workflowType, entityType],
  GSI1SK: [status, createdAt]
});

// GSI2: Query by workflow type, execution ID, entity type, and sort value
export const createGSI2Key = (workflowType, executionId, entityType, sortValue = 0) => ({
  GSI2PK: [workflowType, executionId],
  GSI2SK: [entityType, sortValue]
});
```

## Query Patterns

### Get Execution with Albums (Using Natural Keys)
```javascript
const getExecutionWithAlbums = async (executionId) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: {
      ':pk': executionId
    }
  };

  const result = await docClient.send(new QueryCommand(params));
  
  const metadata = result.Items.find(i => i.sk === 'metadata');
  const albums = result.Items.filter(i => i.sk.startsWith('album-'));
  
  return { ...metadata, albums };
};
```

### Query Running Executions (Using Multi-Attribute Keys)
```javascript
const getRunningExecutions = async (workflowType) => {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': [workflowType, 'execution'],
      ':sk': ['running']
    }
  };

  const result = await docClient.send(new QueryCommand(params));
  return result.Items;
};
```

### Query Albums by Execution (Using Multi-Attribute Keys)
```javascript
const getAlbumsByExecution = async (workflowType, executionId) => {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': [workflowType, executionId],
      ':sk': ['album']
    }
  };

  const result = await docClient.send(new QueryCommand(params));
  return result.Items;
};
```

### Compare Metrics Across Patterns
```javascript
const compareMetrics = async (date) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: {
      ':pk': date,
      ':sk': 'metrics-'
    }
  };

  const result = await docClient.send(new QueryCommand(params));
  
  const sfMetrics = result.Items.find(i => i.workflowType === 'step-functions');
  const ldfMetrics = result.Items.find(i => i.workflowType === 'durable-functions');

  return {
    stepFunctions: sfMetrics,
    durableFunctions: ldfMetrics
  };
};
```
