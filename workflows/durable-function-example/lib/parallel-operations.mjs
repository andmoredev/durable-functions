/**
 * Parallel operations module for durable function example
 * Contains business logic for concurrent workflow operations
 */

/**
 * Simulate data validation work stream
 */
export async function performDataValidation(workItemsCount) {
  // Simulate work stream 1 - data validation
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    task: 1,
    type: 'validation',
    result: 'completed',
    itemsValidated: workItemsCount,
    timestamp: Date.now()
  };
}

/**
 * Simulate data enrichment work stream
 */
export async function performDataEnrichment(workItemsCount) {
  // Simulate work stream 2 - data enrichment
  await new Promise(resolve => setTimeout(resolve, 150));

  return {
    task: 2,
    type: 'enrichment',
    result: 'completed',
    itemsEnriched: workItemsCount,
    timestamp: Date.now()
  };
}

/**
 * Simulate quality check work stream
 */
export async function performQualityCheck() {
  // Simulate work stream 3 - quality check
  await new Promise(resolve => setTimeout(resolve, 80));

  return {
    task: 3,
    type: 'quality-check',
    result: 'completed',
    qualityScore: 0.95,
    timestamp: Date.now()
  };
}