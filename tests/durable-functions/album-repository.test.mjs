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
  UpdateCommand: vi.fn((params) => params)
}));

const { saveExecution, saveAlbum, updateAlbum } = await import('../../workflows/durable-function/lib/album-repository.mjs');

describe('Album Repository - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Property 11: Execution Metadata Completeness - **Feature: album-registration-system, Property 11: Execution Metadata Completeness** - **Validates: Requirements 3.2**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom('running', 'waiting', 'completed', 'failed'),
        async (executionId, imageS3Key, status) => {
          mockDynamoDBSend.mockClear();
          mockDynamoDBSend.mockResolvedValue({});

          await saveExecution(executionId, imageS3Key, status);

          expect(mockDynamoDBSend).toHaveBeenCalledTimes(1);

          const callArgs = mockDynamoDBSend.mock.calls[0][0];
          const item = callArgs.Item;

          expect(item).toHaveProperty('executionId');
          expect(item).toHaveProperty('workflowType');
          expect(item).toHaveProperty('status');
          expect(item).toHaveProperty('createdAt');

          expect(item.executionId).toBe(executionId);
          expect(item.workflowType).toBe('durable-functions');
          expect(item.status).toBe(status);
          expect(item.imageS3Key).toBe(imageS3Key);
          expect(typeof item.createdAt).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12: Album Item Separation - **Feature: album-registration-system, Property 12: Album Item Separation** - **Validates: Requirements 3.3**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.tuple(
          fc.record({
            albumName: fc.string({ minLength: 1, maxLength: 100 }),
            artist: fc.string({ minLength: 1, maxLength: 100 }),
            year: fc.integer({ min: 1900, max: 2100 }),
            yearValidated: fc.boolean()
          }),
          fc.record({
            albumName: fc.string({ minLength: 1, maxLength: 100 }),
            artist: fc.string({ minLength: 1, maxLength: 100 }),
            year: fc.integer({ min: 1900, max: 2100 }),
            yearValidated: fc.boolean()
          }),
          fc.record({
            albumName: fc.string({ minLength: 1, maxLength: 100 }),
            artist: fc.string({ minLength: 1, maxLength: 100 }),
            year: fc.integer({ min: 1900, max: 2100 }),
            yearValidated: fc.boolean()
          }),
          fc.record({
            albumName: fc.string({ minLength: 1, maxLength: 100 }),
            artist: fc.string({ minLength: 1, maxLength: 100 }),
            year: fc.integer({ min: 1900, max: 2100 }),
            yearValidated: fc.boolean()
          }),
          fc.record({
            albumName: fc.string({ minLength: 1, maxLength: 100 }),
            artist: fc.string({ minLength: 1, maxLength: 100 }),
            year: fc.integer({ min: 1900, max: 2100 }),
            yearValidated: fc.boolean()
          }),
          fc.record({
            albumName: fc.string({ minLength: 1, maxLength: 100 }),
            artist: fc.string({ minLength: 1, maxLength: 100 }),
            year: fc.integer({ min: 1900, max: 2100 }),
            yearValidated: fc.boolean()
          })
        ),
        async (executionId, albumTuple) => {
          mockDynamoDBSend.mockClear();
          mockDynamoDBSend.mockResolvedValue({});

          const albums = albumTuple.map((album, index) => ({
            ...album,
            albumIndex: index + 1
          }));

          for (const album of albums) {
            await saveAlbum(executionId, album);
          }

          expect(mockDynamoDBSend).toHaveBeenCalledTimes(6);

          const allCalls = mockDynamoDBSend.mock.calls;
          const sortKeys = allCalls.map(call => call[0].Item.sk);
          const uniqueSortKeys = new Set(sortKeys);

          expect(uniqueSortKeys.size).toBe(6);

          sortKeys.forEach(sk => {
            expect(sk).toMatch(/^album-\d+$/);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Album Key Structure - **Feature: album-registration-system, Property 13: Album Key Structure** - **Validates: Requirements 3.4**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.record({
          albumIndex: fc.integer({ min: 1, max: 6 }),
          albumName: fc.string({ minLength: 1, maxLength: 100 }),
          artist: fc.string({ minLength: 1, maxLength: 100 }),
          year: fc.integer({ min: 1900, max: 2100 }),
          yearValidated: fc.boolean()
        }),
        async (executionId, album) => {
          mockDynamoDBSend.mockClear();
          mockDynamoDBSend.mockResolvedValue({});

          await saveAlbum(executionId, album);

          expect(mockDynamoDBSend).toHaveBeenCalledTimes(1);

          const callArgs = mockDynamoDBSend.mock.calls[0][0];
          const item = callArgs.Item;

          expect(item.pk).toBe(executionId);
          expect(item.sk).toBe(`album-${album.albumIndex}`);

          expect(item.pk).not.toContain('#');
          expect(item.sk).not.toContain('#');
        }
      ),
      { numRuns: 100 }
    );
  });
});
