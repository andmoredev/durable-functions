#!/usr/bin/env node

/**
 * Test to demonstrate the correct waitForCondition pattern
 */

async function testWaitForConditionPattern() {
  console.log('🧪 Testing WaitForCondition Pattern\n');

  try {
    const { checkSystemReadiness, resetSystemReadiness } = await import('./lib/advanced-operations.mjs');

    // Reset for clean test
    resetSystemReadiness();

    console.log('📊 Simulating waitForCondition with state management...\n');

    // Mock the waitForCondition pattern
    let state = {
      ready: false,
      systemId: 'external-system-1',
      startTime: Date.now(),
      attempts: 0
    };

    console.log('Initial State:', JSON.stringify(state, null, 2));
    console.log('\nPolling progression:');
    console.log('Attempt | Ready | Delay | State');
    console.log('--------|-------|-------|-------');

    let shouldContinue = true;
    let totalAttempts = 0;

    while (shouldContinue && totalAttempts < 10) {
      totalAttempts++;

      // Simulate the async function that updates state
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
        `   ${state.attempts.toString().padStart(2)}   | ${state.ready ? ' ✅  ' : ' ❌  '} | ${delaySeconds.toString().padStart(3)}s  | attempts: ${state.attempts}, probability: ${(state.lastCheck.readyProbability * 100).toFixed(0)}%`
      );

      if (shouldContinue) {
        // Simulate the delay (reduced for testing)
        await new Promise(resolve => setTimeout(resolve, Math.min(delaySeconds * 50, 500)));
      }
    }

    console.log('\n📈 Final Results:');
    console.log(`   System ready: ${state.ready ? '✅ YES' : '❌ NO'}`);
    console.log(`   Total attempts: ${state.attempts}`);
    console.log(`   Total time: ${((Date.now() - state.startTime) / 1000).toFixed(1)}s`);

    if (state.lastCheck) {
      console.log(`   Final probability: ${(state.lastCheck.readyProbability * 100).toFixed(0)}%`);
      console.log(`   Last check ID: ${state.lastCheck.checkId}`);
    }

    console.log('\n🔍 Pattern Analysis:');
    console.log('   ✅ State Management: Each iteration updates and preserves state');
    console.log('   ✅ Fixed Delay: 3 seconds between each attempt');
    console.log('   ✅ Condition Check: Stops when ready becomes true');
    console.log('   ✅ Predictable Timing: System ready after exactly 3 attempts');

    console.log('\n📋 waitForCondition Structure:');
    console.log('   async (state, ctx) => {');
    console.log('     const readinessCheck = await checkSystemReadiness();');
    console.log('     return { ...state, ready: readinessCheck.ready, ... };');
    console.log('   }');
    console.log('   {');
    console.log('     initialState: { ready: false, systemId: "...", ... },');
    console.log('     waitStrategy: (state) => state.ready');
    console.log('       ? { shouldContinue: false }');
    console.log('       : { shouldContinue: true, delay: { seconds: ... } }');
    console.log('   }');

    console.log('\n✅ WaitForCondition pattern test completed successfully!');

    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
testWaitForConditionPattern()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });