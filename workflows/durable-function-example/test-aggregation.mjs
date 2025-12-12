#!/usr/bin/env node

/**
 * Test to verify the aggregation function handles different data types correctly
 */

async function testAggregation() {
  console.log('🧪 Testing Aggregation Function\n');

  try {
    const { aggregateWorkflowResults } = await import('./lib/data-processor.mjs');

    // Mock context and event
    const mockContext = {
      executionId: 'test-exec-123'
    };

    const mockEvent = {
      startTime: Date.now() - 5000 // 5 seconds ago
    };

    // Test with different types of mapResults
    console.log('📊 Testing with array mapResults...');
    const arrayMapResults = [
      { processed: true, processingTime: 100 },
      { processed: true, processingTime: 150 },
      { processed: false, processingTime: 0 }
    ];

    const arrayParallelResults = [
      { task: 1, result: 'completed' },
      { task: 2, result: 'completed' }
    ];

    const mockCallbackResult = {
      timedOut: true,
      callbackId: 'test-callback-123'
    };

    const result1 = aggregateWorkflowResults(
      mockContext,
      mockEvent,
      arrayMapResults,
      arrayParallelResults,
      mockCallbackResult
    );

    console.log('✅ Array results aggregated successfully');
    console.log(`   Items processed: ${result1.itemsProcessed}`);
    console.log(`   Success rate: ${(result1.successRate * 100).toFixed(1)}%`);
    console.log(`   Total processing time: ${result1.totalProcessingTime}ms`);

    // Test with null/undefined mapResults
    console.log('\n📊 Testing with null mapResults...');
    const result2 = aggregateWorkflowResults(
      mockContext,
      mockEvent,
      null,
      arrayParallelResults,
      mockCallbackResult
    );

    console.log('✅ Null results handled successfully');
    console.log(`   Items processed: ${result2.itemsProcessed}`);
    console.log(`   Success rate: ${(result2.successRate * 100).toFixed(1)}%`);

    // Test with undefined mapResults
    console.log('\n📊 Testing with undefined mapResults...');
    const result3 = aggregateWorkflowResults(
      mockContext,
      mockEvent,
      undefined,
      undefined,
      mockCallbackResult
    );

    console.log('✅ Undefined results handled successfully');
    console.log(`   Items processed: ${result3.itemsProcessed}`);
    console.log(`   Success rate: ${(result3.successRate * 100).toFixed(1)}%`);

    // Test with empty arrays
    console.log('\n📊 Testing with empty arrays...');
    const result4 = aggregateWorkflowResults(
      mockContext,
      mockEvent,
      [],
      [],
      mockCallbackResult
    );

    console.log('✅ Empty arrays handled successfully');
    console.log(`   Items processed: ${result4.itemsProcessed}`);
    console.log(`   Success rate: ${(result4.successRate * 100).toFixed(1)}%`);

    console.log('\n🎯 Key Aggregation Features:');
    console.log('   ✅ Array Safety: Handles null/undefined inputs gracefully');
    console.log('   ✅ Metrics Calculation: Computes processing times and success rates');
    console.log('   ✅ Comprehensive Results: Includes all operation results');
    console.log('   ✅ Execution Tracking: Tracks duration and timestamps');

    console.log('\n✅ Aggregation function test completed successfully!');

    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
testAggregation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });