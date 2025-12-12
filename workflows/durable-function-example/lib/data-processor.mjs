/**
 * Data processor module for durable function example
 * Handles processing input data and generating work items
 */

export function processData(inputData) {
  if (!inputData?.items) {
    throw new Error('Invalid input data: items array is required');
  }

  // Generate work items from input data
  const workItems = inputData.items.map((item, index) => ({
    id: `work-item-${index + 1}`,
    data: item,
    priority: (index % 3) + 1, // Deterministic priority 1-3 based on index
    status: 'pending'
  }));

  return workItems;
}

export function aggregateResults(results) {
  const completedItems = results.filter(r => r.processed);
  const failedItems = results.filter(r => !r.processed);

  return {
    totalItems: results.length,
    completedItems: completedItems.length,
    failedItems: failedItems.length,
    successRate: results.length > 0 ? completedItems.length / results.length : 0,
    summary: failedItems.length === 0
      ? 'All items processed successfully'
      : `${completedItems.length} items completed, ${failedItems.length} failed`
  };
}

export function generateWorkItems(inputData) {
  // Alternative function name for clarity
  return processData(inputData);
}

export function validateWorkItem(workItem) {
  const requiredFields = ['id', 'data', 'priority', 'status'];
  const missingFields = requiredFields.filter(field => !(field in workItem));

  if (missingFields.length > 0) {
    throw new Error(`Work item missing required fields: ${missingFields.join(', ')}`);
  }

  if (typeof workItem.priority !== 'number' || workItem.priority < 1 || workItem.priority > 3) {
    throw new Error('Work item priority must be a number between 1 and 3');
  }

  const validStatuses = ['pending', 'processing', 'completed', 'failed'];
  if (!validStatuses.includes(workItem.status)) {
    throw new Error(`Work item status must be one of: ${validStatuses.join(', ')}`);
  }

  return true;
}
/**
 * Process a single work item with simulated processing time
 */
export function processWorkItem(item, index) {
  // Simulate processing time based on priority
  const processingTime = item.priority * 50;

  // Transform the work item
  const processedItem = {
    ...item,
    status: 'completed',
    processed: true,
    processedAt: Date.now(),
    processingTime,
    index,
    transformedData: `processed-${item.data}`,
    checkpointId: `checkpoint-${item.id}-${index}`
  };

  return { processedItem, processingTime };
}

/**
 * Aggregate final results from all workflow operations
 */
export function aggregateWorkflowResults(context, event, mapResults, parallelResults, callbackResult) {
  const endTime = Date.now();
  const startTime = event.startTime || endTime;

  // Ensure mapResults is an array
  const mapResultsArray = Array.isArray(mapResults) ? mapResults : [];
  const parallelResultsArray = Array.isArray(parallelResults) ? parallelResults : [];

  // Calculate comprehensive metrics
  const totalProcessingTime = mapResultsArray.reduce((sum, item) => sum + (item.processingTime || 0), 0);
  const avgProcessingTime = mapResultsArray.length > 0 ? totalProcessingTime / mapResultsArray.length : 0;

  return {
    // Workflow identification
    workflowId: context.executionId,
    executionId: context.executionId,

    // Operation results
    processedItems: mapResultsArray,
    parallelResults: parallelResultsArray,
    callbackResult,

    // Execution metrics
    totalDuration: endTime - startTime,
    totalProcessingTime,
    avgProcessingTime,

    // Checkpoint and operation counts
    checkpointCount: mapResultsArray.length + parallelResultsArray.length + 4, // processInputData, waitForCallback, aggregateResults + map/parallel
    operationCount: {
      steps: mapResultsArray.length + parallelResultsArray.length + 3,
      parallel: parallelResultsArray.length,
      map: mapResultsArray.length,
      wait: 1
    },

    // Success metrics
    itemsProcessed: mapResultsArray.length,
    successfulItems: mapResultsArray.filter(item => item.processed).length,
    successRate: mapResultsArray.length > 0 ? mapResultsArray.filter(item => item.processed).length / mapResultsArray.length : 0,

    // Timestamps
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    completedAt: new Date().toISOString()
  };
}