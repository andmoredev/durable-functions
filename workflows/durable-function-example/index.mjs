import { withDurableExecution } from '@aws/durable-execution-sdk-js';
import { processData, processWorkItem, aggregateWorkflowResults } from './lib/data-processor.mjs';

export const handler = withDurableExecution(async (event, context) => {
  // Durable function example demonstrating all key durable operations

  // Step 1: Initial step operation - process input data
  const workItems = await context.step('processInputData', async () => {
    return processData(event.inputData);
  });

  // Step 2: Wait for callback operation - pause for external event
  // Wait for external callback with timeout handling
  const callbackResult = await context.waitForCallback(
    "wait-for-external-callback",
    async (callbackId, ctx) => {
      // Submit callback ID to external system (simulated)
      ctx.logger.info(`Callback ID ${callbackId} submitted to external system`);
      // In real implementation, this would call an external API
      // await submitToExternalAPI(callbackId);
    },
    { timeout: { minutes: 60 } } // 1 hour timeout
  );

  // Step 3: Parallel operations - process multiple work streams concurrently
  const parallelResults = await context.parallel([
    async (ctx) => ctx.step('parallelTask1', async () => {
      return await performDataValidation(workItemsCount);
    }),
    async (ctx) => ctx.step('parallelTask2', async () => {
      return await performDataEnrichment(workItemsCount);
    }),
    async (ctx) => ctx.step('parallelTask3', async () => {
      return await performQualityCheck();
    })
  ]);

  // Step 4: Map operation - iterate over collection with checkpoints
  const mapResults = await context.map(workItems, async (ctx, item, index) => {
    return await ctx.step(`processItem-${index}`, async () => {
      const { processedItem, processingTime } = processWorkItem(item, index);

      // Simulate processing time based on priority
      await new Promise(resolve => setTimeout(resolve, processingTime));

      return processedItem;
    });
  });

  // Step 5: Final aggregation step
  const finalResult = await context.step('aggregateResults', async () => {
    return aggregateWorkflowResults(context, event, mapResults, parallelResults, callbackResult);
  });

  return finalResult;
});