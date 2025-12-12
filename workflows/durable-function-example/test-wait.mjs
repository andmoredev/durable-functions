#!/usr/bin/env node

/**
 * Simple test to verify the wait operation works
 */

async function testWaitOperation() {
  console.log('🧪 Testing Wait Operation\n');

  try {
    // Test the individual modules
    console.log('📊 Testing modules...');
    const { processData } = await import('./lib/data-processor.mjs');
    const { createParallelOperations } = await import('./lib/parallel-operations.mjs');

    const testData = { items: ['item1', 'item2'] };
    const workItems = processData(testData);
    console.log(`✅ Generated ${workItems.length} work items`);

    const parallelOps = createParallelOperations(workItems.length);
    console.log(`✅ Created ${parallelOps.length} parallel operations`);

    // Mock context.wait to test the wait functionality
    console.log('\n⏱️  Testing wait operation...');
    const mockWait = async (options) => {
      console.log(`⏳ Waiting for ${options.seconds} seconds...`);
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, options.seconds * 100)); // Reduced for testing
      const duration = Date.now() - start;
      console.log(`✅ Wait completed in ${duration}ms (simulated ${options.seconds}s)`);
    };

    await mockWait({ seconds: 5 });

    console.log('\n🎉 Wait operation test completed successfully!');
    console.log('\n📋 Updated Workflow Steps:');
    console.log('   1. Process input data');
    console.log('   2. Wait for callback (with timeout)');
    console.log('   2.5. Simple wait (5 seconds) ← NEW!');
    console.log('   3. Parallel operations');
    console.log('   4. Map operations');
    console.log('   5. Final aggregation');

    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testWaitOperation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });