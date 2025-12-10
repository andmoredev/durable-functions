import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function createValidationTask(executionId, imageS3Key, albums, callbackId) {
  const taskId = randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3600000).toISOString();

  await client.send(new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: taskId,
      sk: 'metadata',
      entityType: 'task',
      workflowType: 'durable-functions',
      taskId,
      executionId,
      status: 'pending',
      imageS3Key,
      albums: albums.map(album => ({
        albumIndex: album.albumIndex,
        albumName: album.albumName,
        artist: album.artist,
        year: album.year
      })),
      taskToken: callbackId,
      expiresAt,
      createdAt: now
    }
  }));

  return taskId;
}

export async function completeValidationTask(taskId, validatedData) {
  const now = new Date().toISOString();

  await client.send(new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: taskId,
      sk: 'metadata'
    },
    UpdateExpression: 'SET #status = :status, validatedData = :validatedData, completedAt = :completedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': 'completed',
      ':validatedData': validatedData,
      ':completedAt': now
    }
  }));
}

export async function getValidationTask(taskId) {
  const result = await client.send(new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: taskId,
      sk: 'metadata'
    }
  }));

  return result.Item;
}

export async function timeoutValidationTask(taskId) {
  const now = new Date().toISOString();

  await client.send(new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: taskId,
      sk: 'metadata'
    },
    UpdateExpression: 'SET #status = :status, completedAt = :completedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': 'timeout',
      ':completedAt': now
    }
  }));
}
