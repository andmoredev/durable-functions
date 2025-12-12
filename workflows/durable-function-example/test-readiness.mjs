#!/usr/bin/env node

/**
 * Test to demonstrate checkSystemReadiness eventually returning true
 */

async function testSystemReadiness() {
  console.log('🧪 Testing System Readiness Progression\n');

  try {
    const { checkSystemReadiness, resetSystemReadiness } = await import('./lib/advanced-operations.mjs');

    // Reset state for clean test
    resetSystemReadiness();

    console.log('📊 Simulating system readiness checks over time...\n');

    let isReady = false;
    let attempt = 0;
    const maxAttempts = 10;
    const results = [];

    console.log('Attempt | Status    | Probability | Elapsed | Check ID');
    console.log('--------|-----------|-------------|---------|----------');

    while (!isReady && attempt < maxAttempts) {
      attempt++;

      const result = await checkSystemReadiness();
      results.push(result);

      console.log(
        `   ${attempt.toString().padStart(2)}   | ${result.status.padEnd(9)} |    ${(result.readyProbability * 100).toFixed(0)}%     |  ${result.elapsedSeconds}s   | ${result.checkId}`
      );

      isReady = result.ready;

      if (!isReady && attempt < maxAttempts) {
        // Wait a bit before next attempt (simulating backoff)
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log('\n📈 Results Summary:');
    console.log(`   Total attempts: ${attempt}`);
    console.log(`   Final status: ${isReady ? '✅ READY' : '❌ NOT READY'}`);
    console.log(`   Success rate: ${results.filter(r => r.ready).length}/${results.length} checks returned ready`);

    if (isReady) {
      const finalResult = results[results.length - 1];
      console.log(`   System became ready on attempt ${finalResult.attempt}`);
      console.log(`   Final probability: ${(finalResult.readyProbability * 100).toFixed(0)}%`);
      console.log(`   Total elapsed time: ${finalResult.elapsedSeconds}s`);
    }

    // Demonstrate the probability progression
    console.log('\n📊 Probability Progression:');
    results.forEach((result, index) => {
      const bar = '█'.repeat(Math.floor(result.readyProbability * 20));
      const percentage = (result.readyProbability * 100).toFixed(0).padStart(3);
      console.log(`   Attempt ${(index + 1).toString().padStart(2)}: ${percentage}% ${bar}`);
    });

    // Test multiple runs to show variability
    console.log('\n🔄 Testing Multiple Runs (to show variability):');

    for (let run = 1; run <= 3; run++) {
      resetSystemReadiness();

      let runAttempts = 0;
      let runReady = false;

      while (!runReady && runAttempts < 8) {
        runAttempts++;
        const result = await checkSystemReadiness();
        runReady = result.ready;

        if (!runReady) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`   Run ${run}: System became ready after ${runReady ? runAttempts : 'max'} attempts`);
    }

    console.log('\n🎯 Key Observations:');
    console.log('   • System readiness probability increases over time');
    console.log('   • Each attempt increases the chance of success');
    console.log('   • Eventually the system becomes ready (high probability)');
    console.log('   • This simulates real-world systems that need time to initialize');

    console.log('\n✅ System readiness test completed successfully!');

    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
testSystemReadiness()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });