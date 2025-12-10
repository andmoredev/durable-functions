import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function saveExecution(executionId, imageS3Key, status) {
  const now = new Date().toISOString();

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
      createdAt: now,
      updatedAt: now
    }
  }));
}

export async function saveAlbum(executionId, album) {
  const now = new Date().toISOString();

  await client.send(new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: executionId,
      sk: `album-${album.albumIndex}`,
      entityType: 'album',
      workflowType: 'durable-functions',
      executionId,
      albumIndex: album.albumIndex,
      albumName: album.albumName,
      artist: album.artist,
      year: album.year,
      yearValidated: album.yearValidated || false,
      createdAt: now,
      updatedAt: now
    }
  }));
}

export async function updateAlbum(executionId, albumData) {
  const now = new Date().toISOString();

  const updateExpressionParts = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {
    ':updatedAt': now
  };

  if (albumData.year !== undefined) {
    updateExpressionParts.push('#year = :year');
    expressionAttributeNames['#year'] = 'year';
    expressionAttributeValues[':year'] = albumData.year;
  }

  if (albumData.yearValidated !== undefined) {
    updateExpressionParts.push('yearValidated = :yearValidated');
    expressionAttributeValues[':yearValidated'] = albumData.yearValidated;
  }

  if (albumData.priceEstimate !== undefined) {
    updateExpressionParts.push('priceEstimate = :priceEstimate');
    expressionAttributeValues[':priceEstimate'] = albumData.priceEstimate;
  }

  if (albumData.priceConfidence !== undefined) {
    updateExpressionParts.push('priceConfidence = :priceConfidence');
    expressionAttributeValues[':priceConfidence'] = albumData.priceConfidence;
  }

  if (albumData.priceSource !== undefined) {
    updateExpressionParts.push('priceSource = :priceSource');
    expressionAttributeValues[':priceSource'] = albumData.priceSource;
  }

  updateExpressionParts.push('updatedAt = :updatedAt');

  const updateExpression = 'SET ' + updateExpressionParts.join(', ');

  await client.send(new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: executionId,
      sk: `album-${albumData.albumIndex}`
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    ExpressionAttributeValues: expressionAttributeValues
  }));
}

export async function updateExecutionStatus(executionId, status, errorDetails = null) {
  const now = new Date().toISOString();

  const updateExpressionParts = ['#status = :status', 'updatedAt = :updatedAt'];
  const expressionAttributeNames = {
    '#status': 'status'
  };
  const expressionAttributeValues = {
    ':status': status,
    ':updatedAt': now
  };

  if (errorDetails) {
    updateExpressionParts.push('errorDetails = :errorDetails');
    expressionAttributeValues[':errorDetails'] = errorDetails;
  }

  const updateExpression = 'SET ' + updateExpressionParts.join(', ');

  await client.send(new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: executionId,
      sk: 'metadata'
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }));
}
