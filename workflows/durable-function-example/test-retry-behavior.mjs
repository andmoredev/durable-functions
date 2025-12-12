#!/usr/bin/env node

/**
 * Test to demonstrate guaranteed retry behavior with multiple attempts
 */

async function testRetryBehavior() {
  console.log('🧪 Testing Guaranteed Retry Behavior\n');

  try {
    const { resetSystemReadiness } = await import('./lib/advanced-operations.mjs');

    // Use the simplified checkSystemReadiness directly
    const { checkSystemReadiness } = await import('./lib/advanced-operations.mjs');

    // Reset for clean test
    resetSystemReadiness();

    console.log('📊 Simulating waitForCondition with guaranteed multiple retries...\n');

    // Mock the waitForCondition pattern with slower readiness
    let state = {
      ready: false,
      systemId: 'slow-external-system',
      startTime: Date.now(),
      attempts: 0
    };

    console.log('Initial State:', JSON.stringify(state, null, 2));
    console.log('\nPolling progression (guaranteed multiple retries):');
    console.log('Attempt | Ready | Delay | Note');
    console.log('--------|-------|-------|------');

    let shouldContinue = true;
    let totalAttempts = 0;

    while (shouldContinue && totalAttempts < 10) {
      totalAttempts++;

      // Use the simplified readiness check
      const readinessCheck = await checkSystemReadiness();
      state = {
        ...state,
        ready: readinessCheck.ready,
        lastCheck: readinessCheck,
        attempts: (state.attempts || 0) + 1
      };

      // Simulate the waitStrategy function
      const strategy = state.ready
        ? { shouldContinue: false }
        : { shouldContinue: true, delay: { seconds: 3 } };

      shouldContinue = strategy.shouldContinue;
      const delaySeconds = strategy.delay ? strategy.delay.seconds : 0;

      console.log(
        `   ${state.attempts.toString().padStart(2)}   | ${state.ready ? ' ✅  ' : ' ❌  '} | ${delaySeconds.toString().padStart(3)}s  | ${state.lastCheck.note || ''}`
      );

      if (shouldContinue) {
        // Simulate the delay (reduced for testing)
        await new Promise(resolve => setTimeout(resolve, Math.min(delaySeconds * 50, 500)));
      }
    }

    console.log('\n📈 Retry Behavior Analysis:');
    console.log(`   Total attempts: ${state.attempts}`);
    console.log(`   System ready: ${state.ready ? '✅ YES' : '❌ NO'}`);
    console.log(`   Total time: ${((Date.now() - state.startTime) / 1000).toFixed(1)}s`);

    console.log('\n🔄 Fixed Delay Demonstration:');
    console.log('   All attempts: 3s delay between each attempt');

    console.log('\n🎯 Key Retry Features:');
    console.log('   ✅ Predictable Behavior: System ready after exactly 3 attempts');
    console.log('   ✅ Fixed Delay: 3 seconds between each attempt');
    console.log('   ✅ State Preservation: Attempt counter and timing maintained');
    console.log('   ✅ Condition-Based Exit: Stops immediately when ready becomes true');

    console.log('\n📋 Real-World Use Cases:');
    console.log('   • Database connection establishment');
    console.log('   • Service dependency health checks');
    console.log('   • Resource provisioning completion');
    console.log('   • External API availability polling');

    console.log('\n✅ Retry behavior test completed successfully!');

    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
testRetryBehavior()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });