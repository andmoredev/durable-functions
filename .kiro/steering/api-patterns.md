# API Patterns and Standards

## API Design Philosophy

This system is primarily workflow-driven with minimal API surface. The main interaction is uploading images to S3, which triggers both orchestration patterns. Optional APIs support human-in-the-loop validation and metrics retrieval.

## Trigger Pattern

### S3 Upload Trigger
```
POST /upload (or direct S3 upload)
  ↓
S3 PutObject Event
  ↓
EventBridge Rule
  ├─→ Start Step Functions Execution
  └─→ Invoke Durable Function
```

### Upload Response
```json
{
  "imageKey": "uploads/albums-2025-01-15-abc123.jpg",
  "stepFunctionsExecutionId": "sf-exec-123",
  "durableFunctionsExecutionId": "ldf-exec-456",
  "uploadedAt": "2025-01-15T10:30:00Z"
}
```

## Human-in-the-Loop API

### List Pending Validation Tasks
```http
GET /tasks?status=pending&limit=10
```

Response:
```json
{
  "tasks": [
    {
      "taskId": "task-abc123",
      "executionId": "exec-123",
      "workflowType": "step-functions",
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
      "createdAt": "2025-01-15T10:30:00Z",
      "expiresAt": "2025-01-15T11:30:00Z"
    }
  ],
  "nextCursor": "cursor-xyz"
}
```

### Get Specific Task
```http
GET /tasks/{taskId}
```

Response:
```json
{
  "taskId": "task-abc123",
  "executionId": "exec-123",
  "workflowType": "step-functions",
  "status": "pending",
  "imageS3Key": "uploads/albums-2025-01-15.jpg",
  "imageUrl": "https://presigned-url...",
  "albums": [
    {
      "albumIndex": 1,
      "albumName": "The Dark Side of the Moon",
      "artist": "Pink Floyd",
      "year": 1973
    }
  ],
  "createdAt": "2025-01-15T10:30:00Z",
  "expiresAt": "2025-01-15T11:30:00Z"
}
```

### Complete Validation Task
```http
POST /tasks/{taskId}/complete
Content-Type: application/json

{
  "validatedAlbums": [
    {
      "albumIndex": 1,
      "year": 1974
    },
    {
      "albumIndex": 2,
      "year": 1969
    }
  ]
}
```

Response:
```json
{
  "taskId": "task-abc123",
  "status": "completed",
  "completedAt": "2025-01-15T10:35:00Z",
  "message": "Validation submitted successfully"
}
```

## Metrics and Comparison API

### Get Execution Metrics
```http
GET /metrics/executions/{executionId}?type=step-functions|durable-functions
```

Response:
```json
{
  "executionId": "exec-123",
  "workflowType": "step-functions",
  "status": "completed",
  "startTime": "2025-01-15T10:30:00Z",
  "endTime": "2025-01-15T10:35:00Z",
  "durationMs": 300000,
  "estimatedCost": 0.0025,
  "albumsProcessed": 6
}
```

### Compare Patterns
```http
GET /metrics/compare?date=2025-01-15
```

Response:
```json
{
  "date": "2025-01-15",
  "stepFunctions": {
    "executionCount": 25,
    "avgDurationMs": 280000,
    "avgCost": 0.0023,
    "successRate": 0.96
  },
  "durableFunctions": {
    "executionCount": 25,
    "avgDurationMs": 290000,
    "avgCost": 0.0019,
    "successRate": 0.96
  }
}
```

## Status Codes

- **200 OK**: Successful retrieval
- **201 Created**: Successful upload/creation
- **202 Accepted**: Workflow started
- **400 Bad Request**: Invalid input
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Unexpected error

## Error Response Format

```json
{
  "error": "ValidationError",
  "message": "Invalid album data provided"
}
```
