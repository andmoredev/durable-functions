import { withDurableExecution } from '@aws/durable-execution-sdk-js';
import { processData, processWorkItem, aggregateWorkflowResults } from './lib/data-processor.mjs';
import { performDataValidation, performDataEnrichment, performQualityCheck } from './lib/parallel-operations.mjs';
import {
  checkSystemReadiness,
  createInvokePayload,
  processMetadataInChild,
  validateConfigurationInChild
} from './lib/advanced-operations.mjs';

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

  // Step 3: Simple wait operation - demonstrate time-based wait
  await context.wait({ seconds: 5 }); // Wait for 5 seconds

  // Step 4: Parallel operations - process multiple work streams concurrently
  const parallelResults = await context.parallel([
    async (ctx) => ctx.step('parallelTask1', async () => {
      return await performDataValidation(workItems.length);
    }),
    async (ctx) => ctx.step('parallelTask2', async () => {
      return await performDataEnrichment(workItems.length);
    }),
    async (ctx) => ctx.step('parallelTask3', async () => {
      return await performQualityCheck();
    })
  ]);
  // Step 5: Map operation - iterate over collection with checkpoints
  const mapResults = await context.map(workItems, async (ctx, item, index) => {
    return await ctx.step(`processItem-${index}`, async () => {
      const { processedItem, processingTime } = processWorkItem(item, index);

      // Simulate processing time based on priority
      await new Promise(resolve => setTimeout(resolve, processingTime));

      return processedItem;
    });
  });

  // Step 6: Wait for condition - poll until external system is ready
  const conditionResult = await context.waitForCondition(
    async (state, ctx) => {
      const readinessCheck = await checkSystemReadiness();
      return {
        ...state,
        ready: readinessCheck.ready
      };
    },
    {
      initialState: {
        ready: false,
      },
      waitStrategy: (state) =>
        state.ready
          ? { shouldContinue: false }
          : { shouldContinue: true, delay: { seconds: 3 } }
    }
  );

  // Step 7: Invoke another Lambda function
  const invokePayload = createInvokePayload(workItems.length, context.executionId);
  const invokeResult = await context.invoke(
    'invoke-hello-world',
    process.env.HELLO_WORLD_FUNCTION_ARN,
    invokePayload
  );

  // Step 8: Run operations in child context for isolation
  const childContextResult = await context.runInChildContext('isolated-operations', async (childCtx) => {
    // These operations run in isolation with their own checkpoint log
    const metadata = await childCtx.step('processMetadata', async () => {
      return await processMetadataInChild(context.executionId, workItems.length);
    });

    const validation = await childCtx.step('validateConfiguration', async () => {
      return await validateConfigurationInChild();
    });

    return {
      metadata,
      validation,
      childExecutionId: childCtx.executionId,
      completedAt: Date.now()
    };
  });

  // Step 9: Final aggregation step
  const finalResult = await context.step('aggregateResults', async () => {
    const baseResult = aggregateWorkflowResults(context, event, mapResults, parallelResults, callbackResult);

    // Add results from advanced operations
    return {
      ...baseResult,
      advancedOperations: {
        conditionResult,
        invokeResult,
        childContextResult
      },
      operationCount: {
        ...baseResult.operationCount,
        waitForCondition: 1,
        invoke: 1,
        childContext: 1
      }
    };
  });

  return finalResult;
});