import { withDurableExecution } from '@aws/durable-execution-sdk-js';
import { processImage } from './lib/image-processor.mjs';
import { saveExecution, saveAlbum, updateAlbum, updateExecutionStatus } from './lib/album-repository.mjs';
import { estimatePrice } from './lib/price-estimator.mjs';
import { createValidationTask } from './lib/validation-task-manager.mjs';

export const handler = withDurableExecution(async (event, context) => {
  const imageS3Key = event.detail?.object?.key || event.imageS3Key;

  try {
    const albums = await context.step('processImage', async () => {
      try {
        context.logger.info(`Processing image: ${imageS3Key}`);
        return await processImage(imageS3Key);
      } catch (error) {
        context.logger.error('Image processing failed', {
          executionId: context.executionId,
          imageS3Key,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    });

    await context.step('saveExecution', async () => {
      try {
        context.logger.info(`Saving execution metadata: ${context.executionId}`);
        return await saveExecution(context.executionId, imageS3Key, 'running');
      } catch (error) {
        context.logger.error('Failed to save execution metadata', {
          executionId: context.executionId,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    });

    await context.map(albums, async (album, i) =>
      context.step(`saveAlbum-${i}`, async () => {
        try {
          context.logger.info(`Saving album ${album.albumIndex}`);
          return await saveAlbum(context.executionId, album);
        } catch (error) {
          context.logger.error('Failed to save album', {
            executionId: context.executionId,
            albumIndex: album.albumIndex,
            error: error.message,
            stack: error.stack
          });
          throw error;
        }
      })
    );

    const callbackId = `validation-${context.executionId}`;

    await context.step('createValidationTask', async () => {
      try {
        context.logger.info(`Creating validation task for execution ${context.executionId}`);
        return await createValidationTask(context.executionId, imageS3Key, albums, callbackId);
      } catch (error) {
        context.logger.error('Failed to create validation task', {
          executionId: context.executionId,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    });

    const validatedData = await context.wait({
      callback: { id: callbackId },
      timeout: { seconds: 3600 }
    });

    if (validatedData && validatedData.albums) {
      await context.map(validatedData.albums, async (validatedAlbum, i) =>
        context.step(`updateValidatedAlbum-${i}`, async () => {
          try {
            context.logger.info(`Updating validated album ${validatedAlbum.albumIndex}`);
            return await updateAlbum(context.executionId, {
              albumIndex: validatedAlbum.albumIndex,
              year: validatedAlbum.year,
              yearValidated: true
            });
          } catch (error) {
            context.logger.error('Failed to update validated album', {
              executionId: context.executionId,
              albumIndex: validatedAlbum.albumIndex,
              error: error.message,
              stack: error.stack
            });
            throw error;
          }
        })
      );
    }

    const prices = await context.map(albums, async (album, i) =>
      context.step(`estimatePrice-${i}`, async () => {
        try {
          context.logger.info(`Estimating price for album ${album.albumIndex}`);
          return await estimatePrice(album);
        } catch (error) {
          context.logger.error('Failed to estimate price', {
            executionId: context.executionId,
            albumIndex: album.albumIndex,
            error: error.message,
            stack: error.stack
          });
          throw error;
        }
      })
    );

    await context.map(prices, async (price, i) =>
      context.step(`saveFinalAlbum-${i}`, async () => {
        try {
          context.logger.info(`Saving final album ${i + 1} with price`);
          return await updateAlbum(context.executionId, {
            albumIndex: i + 1,
            ...price
          });
        } catch (error) {
          context.logger.error('Failed to save final album', {
            executionId: context.executionId,
            albumIndex: i + 1,
            error: error.message,
            stack: error.stack
          });
          throw error;
        }
      })
    );

    await context.step('completeExecution', async () => {
      try {
        context.logger.info(`Completing execution: ${context.executionId}`);
        return await saveExecution(context.executionId, imageS3Key, 'completed');
      } catch (error) {
        context.logger.error('Failed to complete execution', {
          executionId: context.executionId,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    });

    return {
      executionId: context.executionId,
      albumCount: albums.length,
      status: 'completed'
    };
  } catch (error) {
    context.logger.error('Workflow execution failed', {
      executionId: context.executionId,
      imageS3Key,
      error: error.message,
      stack: error.stack
    });

    await context.step('updateFailureStatus', async () => {
      try {
        return await updateExecutionStatus(context.executionId, 'failed', {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      } catch (updateError) {
        context.logger.error('Failed to update execution status to failed', {
          executionId: context.executionId,
          error: updateError.message
        });
      }
    });

    throw error;
  }
});
