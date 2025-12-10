import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

const mockDynamoDBSend = vi.fn();

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({}))
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: mockDynamoDBSend
    }))
  },
  PutCommand: vi.fn((params) => params),
  UpdateCommand: vi.fn((params) => params),
  GetCommand: vi.fn((params) => params)
}));

const { createValidationTask, completeValidationTask, getValidationTask, timeoutValidationTask } = await import('../../workflows/durable-function/lib/validation-task-manager.mjs');

describe('Validation Task Manager - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Property 18: Validation Data Round-Trip - **Feature: album-registration-system, Property 18: Validation Data Round-Trip** - **Validates: Requirements 4.4**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(
          fc.record({
            albumIndex: fc.integer({ min: 1, max: 6 }),
            albumName: fc.string({ minLength: 1, maxLength: 100 }),
            artist: fc.string({ minLength: 1, maxLength: 100 }),
            year: fc.integer({ min: 1900, max: 2100 })
          }),
          { minLength: 1, maxLength: 6 }
        ),
        fc.array(
          fc.record({
            albumIndex: fc.integer({ min: 1, max: 6 }),
            year: fc.integer({ min: 1900, max: 2100 })
          }),
          { minLength: 1, maxLength: 6 }
        ),
        async (executionId, imageS3Key, albums, validatedAlbums) => {
          mockDynamoDBSend.mockClear();
          mockDynamoDBSend.mockResolvedValue({});

          const callbackId = `validation-${executionId}`;
          const taskId = await createValidationTask(executionId, imageS3Key, albums, callbackId);

          expect(mockDynamoDBSend).toHaveBeenCalledTimes(1);

          const createCallArgs = mockDynamoDBSend.mock.calls[0][0];
          const createdTask = createCallArgs.Item;

          expect(createdTask.taskId).toBe(taskId);
          expect(createdTask.executionId).toBe(executionId);
          expect(createdTask.status).toBe('pending');
          expect(createdTask.albums).toHaveLength(albums.length);

          mockDynamoDBSend.mockClear();
          mockDynamoDBSend.mockResolvedValue({});

          await completeValidationTask(taskId, { albums: validatedAlbums });

          expect(mockDynamoDBSend).toHaveBeenCalledTimes(1);

          const updateCallArgs = mockDynamoDBSend.mock.calls[0][0];

          expect(updateCallArgs.Key.pk).toBe(taskId);
          expect(updateCallArgs.ExpressionAttributeValues[':status']).toBe('completed');
          expect(updateCallArgs.ExpressionAttributeValues[':validatedData']).toEqual({ albums: validatedAlbums });

          mockDynamoDBSend.mockClear();
          mockDynamoDBSend.mockResolvedValue({
            Item: {
              taskId,
              executionId,
              status: 'completed',
              validatedData: { albums: validatedAlbums }
            }
          });

          const retrievedTask = await getValidationTask(taskId);

          expect(retrievedTask.validatedData.albums).toEqual(validatedAlbums);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 19: Validation Timeout Handling - **Feature: album-registration-system, Property 19: Validation Timeout Handling** - **Validates: Requirements 4.5**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(
          fc.record({
            albumIndex: fc.integer({ min: 1, max: 6 }),
            albumName: fc.string({ minLength: 1, maxLength: 100 }),
            artist: fc.string({ minLength: 1, maxLength: 100 }),
            year: fc.integer({ min: 1900, max: 2100 })
          }),
          { minLength: 1, maxLength: 6 }
        ),
        async (executionId, imageS3Key, albums) => {
          mockDynamoDBSend.mockClear();
          mockDynamoDBSend.mockResolvedValue({});

          const callbackId = `validation-${executionId}`;
          const taskId = await createValidationTask(executionId, imageS3Key, albums, callbackId);

          expect(mockDynamoDBSend).toHaveBeenCalledTimes(1);

          const createCallArgs = mockDynamoDBSend.mock.calls[0][0];
          const createdTask = createCallArgs.Item;

          expect(createdTask.status).toBe('pending');
          expect(createdTask.expiresAt).toBeDefined();

          const expiresAt = new Date(createdTask.expiresAt);
          const createdAt = new Date(createdTask.createdAt);
          const timeDiff = expiresAt - createdAt;

          expect(timeDiff).toBeGreaterThanOrEqual(3600000 - 1000);
          expect(timeDiff).toBeLessThanOrEqual(3600000 + 1000);

          mockDynamoDBSend.mockClear();
          mockDynamoDBSend.mockResolvedValue({});

          await timeoutValidationTask(taskId);

          expect(mockDynamoDBSend).toHaveBeenCalledTimes(1);

          const timeoutCallArgs = mockDynamoDBSend.mock.calls[0][0];

          expect(timeoutCallArgs.Key.pk).toBe(taskId);
          expect(timeoutCallArgs.ExpressionAttributeValues[':status']).toBe('timeout');
          expect(timeoutCallArgs.ExpressionAttributeValues[':completedAt']).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
