/**
 * Advanced durable operations module
 * Contains examples of waitForCondition, invoke, and runInChildContext
 */

// Global state to track attempts
let checkAttempts = 0;

/**
 * Simulate checking if external system is ready
 * System becomes ready after exactly 3 attempts
 */
export async function checkSystemReadiness() {
  checkAttempts++;

  // Simulate some async work (like network call)
  await new Promise(resolve => setTimeout(resolve, 50));

  // System becomes ready on the 3rd attempt
  const isReady = checkAttempts >= 3;

  return {
    ready: isReady,
    timestamp: Date.now(),
    status: isReady ? 'ready' : 'not-ready',
    checkId: `check-${checkAttempts}`,
    attempt: checkAttempts,
    note: isReady ? 'System ready after 3 attempts' : `Attempt ${checkAttempts} of 3`
  };
}

/**
 * Reset the system readiness state (useful for testing)
 */
export function resetSystemReadiness() {
  checkAttempts = 0;
}

/**
 * Create invoke payload for hello world function
 */
export function createInvokePayload(workItemsCount, executionId) {
  return {
    name: `DurableExecution-${executionId}`,
    message: 'Greetings from durable function',
    workItemsProcessed: workItemsCount,
    timestamp: new Date().toISOString()
  };
}

/**
 * Child context operation - process metadata
 */
export async function processMetadataInChild(executionId, workItemsCount) {
  // Simulate metadata processing that should be isolated
  await new Promise(resolve => setTimeout(resolve, 50));

  return {
    executionId,
    workItemsCount,
    processedAt: Date.now(),
    metadata: {
      version: '1.0.0',
      processingNode: 'child-context',
      isolated: true
    }
  };
}

/**
 * Child context operation - validate configuration
 */
export async function validateConfigurationInChild() {
  // Simulate configuration validation
  await new Promise(resolve => setTimeout(resolve, 30));

  return {
    valid: true,
    configVersion: '2.1.0',
    validatedAt: Date.now(),
    checks: ['schema', 'permissions', 'resources']
  };
}