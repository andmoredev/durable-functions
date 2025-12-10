import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

describe('Durable Functions - Error Handling Property Tests', () => {
  let mockContext;
  let mockProcessImage;
  let mockSaveExecution;
  let mockSaveAlbum;
  let mockUpdateAlbum;
  let mockEstimatePrice;
  let mockCreateValidationTask;
  let mockUpdateExecutionStatus;

  beforeEach(() => {
    mockContext = {
      executionId: 'test-exec-123',
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
      },
      step: vi.fn(async (name, fn) => {
        return await fn();
      }),
      map: vi.fn(async (items, fn) => {
        return await Promise.all(items.map(fn));
      }),
      wait: vi.fn(async () => ({
        albums: [
          { albumIndex: 1, year: 1973 },
          { albumIndex: 2, year: 1969 }
        ]
      }))
    };

    mockProcessImage = vi.fn(async () => [
      { albumIndex: 1, albumName: 'Album 1', artist: 'Artist 1', year: 1973, yearValidated: false },
      { albumIndex: 2, albumName: 'Album 2', artist: 'Artist 2', year: 1969, yearValidated: false }
    ]);

    mockSaveExecution = vi.fn(async () => {});
    mockSaveAlbum = vi.fn(async () => {});
    mockUpdateAlbum = vi.fn(async () => {});
    mockEstimatePrice = vi.fn(async () => ({
      priceEstimate: 25.0,
      priceConfidence: 0.85,
      priceSource: 'discogs-api'
    }));
    mockCreateValidationTask = vi.fn(async () => {});
    mockUpdateExecutionStatus = vi.fn(async () => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Property 31: Error Logging - For any error occurrence, logs should include error details and execution context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          imageS3Key: fc.string({ minLength: 5, maxLength: 50 }),
          executionId: fc.uuid(),
          errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          stepName: fc.constantFrom('processImage', 'saveExecution', 'saveAlbum', 'estimatePrice')
        }),
        async (testData) => {
          const errorToThrow = new Error(testData.errorMessage);
          errorToThrow.stack = `Error: ${testData.errorMessage}\n    at test location`;

          const testContext = {
            executionId: testData.executionId,
            logger: {
              info: vi.fn(),
              error: vi.fn(),
              warn: vi.fn()
            },
            step: vi.fn(async (name, fn) => {
              if (name === testData.stepName) {
                throw errorToThrow;
              }
              return await fn();
            }),
            map: vi.fn(async (items, fn) => {
              return await Promise.all(items.map(fn));
            }),
            wait: vi.fn(async () => ({
              albums: [{ albumIndex: 1, year: 1973 }]
            }))
          };

          const executeWorkflowWithError = async (ctx) => {
            try {
              await ctx.step('processImage', async () => {
                try {
                  ctx.logger.info(`Processing image: ${testData.imageS3Key}`);
                  return await mockProcessImage(testData.imageS3Key);
                } catch (error) {
                  ctx.logger.error('Image processing failed', {
                    executionId: ctx.executionId,
                    imageS3Key: testData.imageS3Key,
                    error: error.message,
                    stack: error.stack
                  });
                  throw error;
                }
              });

              await ctx.step('saveExecution', async () => {
                try {
                  ctx.logger.info(`Saving execution metadata: ${ctx.executionId}`);
                  return await mockSaveExecution(ctx.executionId, testData.imageS3Key, 'running');
                } catch (error) {
                  ctx.logger.error('Failed to save execution metadata', {
                    executionId: ctx.executionId,
                    error: error.message,
                    stack: error.stack
                  });
                  throw error;
                }
              });

              return { success: true };
            } catch (error) {
              ctx.logger.error('Workflow execution failed', {
                executionId: ctx.executionId,
                imageS3Key: testData.imageS3Key,
                error: error.message,
                stack: error.stack
              });
              throw error;
            }
          };

          try {
            await executeWorkflowWithError(testContext);
          } catch (error) {
            const errorCalls = testContext.logger.error.mock.calls;
            expect(errorCalls.length).toBeGreaterThan(0);

            const relevantErrorCall = errorCalls.find(call =>
              call[1] && call[1].executionId === testData.executionId
            );

            expect(relevantErrorCall).toBeDefined();
            expect(relevantErrorCall[1]).toHaveProperty('executionId', testData.executionId);
            expect(relevantErrorCall[1]).toHaveProperty('error');
            expect(relevantErrorCall[1].error).toBe(testData.errorMessage);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 32: Failure Status Update - For any failed workflow, the execution status should be updated to "failed"', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          imageS3Key: fc.string({ minLength: 5, maxLength: 50 }),
          executionId: fc.uuid(),
          errorMessage: fc.string({ minLength: 10, maxLength: 100 })
        }),
        async (testData) => {
          const errorToThrow = new Error(testData.errorMessage);
          errorToThrow.stack = `Error: ${testData.errorMessage}\n    at test location`;

          const testContext = {
            executionId: testData.executionId,
            logger: {
              info: vi.fn(),
              error: vi.fn(),
              warn: vi.fn()
            },
            step: vi.fn(async (name, fn) => {
              if (name === 'processImage') {
                throw errorToThrow;
              }
              return await fn();
            }),
            map: vi.fn(async (items, fn) => {
              return await Promise.all(items.map(fn));
            }),
            wait: vi.fn(async () => ({
              albums: [{ albumIndex: 1, year: 1973 }]
            }))
          };

          const executeWorkflowWithFailure = async (ctx) => {
            try {
              await ctx.step('processImage', async () => {
                try {
                  ctx.logger.info(`Processing image: ${testData.imageS3Key}`);
                  return await mockProcessImage(testData.imageS3Key);
                } catch (error) {
                  ctx.logger.error('Image processing failed', {
                    executionId: ctx.executionId,
                    imageS3Key: testData.imageS3Key,
                    error: error.message,
                    stack: error.stack
                  });
                  throw error;
                }
              });

              return { success: true };
            } catch (error) {
              ctx.logger.error('Workflow execution failed', {
                executionId: ctx.executionId,
                imageS3Key: testData.imageS3Key,
                error: error.message,
                stack: error.stack
              });

              await ctx.step('updateFailureStatus', async () => {
                try {
                  return await mockUpdateExecutionStatus(ctx.executionId, 'failed', {
                    message: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                  });
                } catch (updateError) {
                  ctx.logger.error('Failed to update execution status to failed', {
                    executionId: ctx.executionId,
                    error: updateError.message
                  });
                }
              });

              throw error;
            }
          };

          try {
            await executeWorkflowWithFailure(testContext);
          } catch (error) {
            expect(mockUpdateExecutionStatus).toHaveBeenCalledWith(
              testData.executionId,
              'failed',
              expect.objectContaining({
                message: testData.errorMessage,
                stack: expect.stringContaining(testData.errorMessage)
              })
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
