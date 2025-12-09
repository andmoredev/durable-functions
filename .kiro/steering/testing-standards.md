# Testing Standards and Practices

## Testing Philosophy

Testing in this comparison project focuses on **validating both orchestration patterns**, **ensuring workflow equivalence**, and **measuring performance differences**. Tests should be fair, comprehensive, and highlight the strengths and weaknesses of each approach.

## Testing Structure

### Test Organization
```
tests/
├── durable-functions/       # Durable Functions specific tests
│   ├── unit/               # Unit tests for steps
│   ├── integration/        # Full workflow tests
│   └── replay/             # Replay behavior tests
├── step-functions/         # Step Functions specific tests
│   ├── unit/               # Lambda function tests
│   ├── integration/        # State machine tests
│   └── state-machine/      # ASL validation tests
├── shared/                 # Tests for shared functions
│   ├── image-processor/    # Image processing tests
│   └── price-estimator/    # Price estimation tests
├── comparison/             # Cross-pattern comparison tests
│   ├── equivalence/        # Verify same results
│   ├── performance/        # Performance benchmarks
│   └── cost/               # Cost analysis tests
├── fixtures/               # Test data
└── helpers/                # Test utilities
```

## Durable Functions Testing

### Unit Testing Steps

#### Testing Individual Steps
```javascript
import { handler } from '../workflows/durable-function/index.mjs';

describe('Durable Function Steps', () => {
  it('should process image in step', async () => {
    const mockContext = {
      step: jest.fn(async (name, fn) => await fn()),
      executionId: 'test-exec-123'
    };

    const event = {
      imageS3Key: 'test-image.jpg'
    };

    // Mock the step execution
    mockContext.step.mockImplementation(async (name, fn) => {
      if (name === 'processImage') {
        return [
          { albumName: 'Album 1', artist: 'Artist 1', year: 2020 },
          { albumName: 'Album 2', artist: 'Artist 2', year: 2021 }
        ];
      }
      return await fn();
    });

    // Test would verify step behavior
  });
});
```

### Testing Replay Behavior

#### Determinism Tests
```javascript
describe('Durable Function Determinism', () => {
  it('should produce same results on replay', async () => {
    const event = { imageS3Key: 'test.jpg' };
    
    // First execution
    const result1 = await handler(event, mockContext);
    
    // Simulate replay with same inputs
    const result2 = await handler(event, mockContext);
    
    expect(result1).toEqual(result2);
  });

  it('should not use non-deterministic operations outside steps', () => {
    // Code analysis test to ensure no Date.now(), Math.random() outside steps
    const sourceCode = fs.readFileSync('./workflows/durable-function/index.mjs', 'utf8');
    
    // Check for non-deterministic patterns outside context.step()
    const hasDateNow = sourceCode.match(/Date\.now\(\)/);
    const hasMathRandom = sourceCode.match(/Math\.random\(\)/);
    
    // These should only appear inside step callbacks
    expect(hasDateNow).toBeNull();
    expect(hasMathRandom).toBeNull();
  });
});
```

### Testing Parallel Execution
```javascript
describe('Parallel Price Estimation', () => {
  it('should execute 6 price estimations in parallel', async () => {
    const mockContext = {
      parallel: jest.fn(async (steps) => {
        return await Promise.all(steps);
      }),
      step: jest.fn(async (name, fn) => await fn())
    };

    const albums = Array(6).fill(null).map((_, i) => ({
      albumName: `Album ${i}`,
      artist: `Artist ${i}`,
      year: 2020 + i
    }));

    // Execute parallel steps
    const results = await mockContext.parallel(
      albums.map((album, i) =>
        mockContext.step(`estimatePrice-${i}`, async () => ({
          price: 10 + i,
          confidence: 0.8
        }))
      )
    );

    expect(results).toHaveLength(6);
    expect(mockContext.step).toHaveBeenCalledTimes(6);
  });
});
```

### Testing Wait States
```javascript
describe('Human-in-the-Loop Wait', () => {
  it('should wait for validation callback', async () => {
    const mockContext = {
      wait: jest.fn(async () => {
        // Simulate wait completion
        return { validated: true };
      }),
      step: jest.fn(async (name, fn) => await fn())
    };

    await mockContext.wait({ 
      callback: { id: 'validation-123' } 
    });

    expect(mockContext.wait).toHaveBeenCalledWith({
      callback: { id: 'validation-123' }
    });
  });
});
```

## Step Functions Testing

### State Machine Validation
```javascript
import { readFileSync } from 'fs';

describe('Step Functions State Machine', () => {
  let stateMachine;

  beforeAll(() => {
    const asl = readFileSync('./workflows/step-functions/definition.asl.json', 'utf8');
    stateMachine = JSON.parse(asl);
  });

  it('should have valid ASL structure', () => {
    expect(stateMachine).toHaveProperty('StartAt');
    expect(stateMachine).toHaveProperty('States');
  });

  it('should include parallel processing for price estimation', () => {
    const mapState = Object.values(stateMachine.States).find(
      state => state.Type === 'Map'
    );
    expect(mapState).toBeDefined();
  });

  it('should include wait state for human validation', () => {
    const waitState = Object.values(stateMachine.States).find(
      state => state.Type === 'Task' && state.Resource === 'arn:aws:states:::lambda:invoke.waitForTaskToken'
    );
    expect(waitState).toBeDefined();
  });
});
```

### Lambda Function Testing
```javascript
import { handler } from '../functions/image-processor/index.mjs';

describe('Image Processor Function', () => {
  it('should extract 6 albums from image', async () => {
    const event = {
      imageS3Key: 'test-image.jpg'
    };

    const result = await handler(event);

    expect(result.albums).toHaveLength(6);
    expect(result.albums[0]).toHaveProperty('albumName');
    expect(result.albums[0]).toHaveProperty('artist');
    expect(result.albums[0]).toHaveProperty('year');
  });
});
```

## Shared Function Testing

### Image Processor Tests
```javascript
describe('Image Processor (Shared)', () => {
  beforeEach(() => {
    // Mock Bedrock API
    mockBedrockClient.on(InvokeModelCommand).resolves({
      body: JSON.stringify({
        albums: [
          { name: 'Album 1', artist: 'Artist 1', year: 2020 }
        ]
      })
    });
  });

  it('should call Bedrock vision model', async () => {
    await processImage('test.jpg');
    
    expect(mockBedrockClient.calls()).toHaveLength(1);
  });

  it('should handle Bedrock errors gracefully', async () => {
    mockBedrockClient.on(InvokeModelCommand).rejects(new Error('API Error'));
    
    await expect(processImage('test.jpg')).rejects.toThrow('API Error');
  });
});
```

### Price Estimator Tests
```javascript
describe('Price Estimator (Shared)', () => {
  it('should estimate price for album', async () => {
    const album = {
      albumName: 'The Dark Side of the Moon',
      artist: 'Pink Floyd',
      year: 1973
    };

    const result = await estimatePrice(album);

    expect(result).toHaveProperty('price');
    expect(result).toHaveProperty('confidence');
    expect(result.price).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
```

## Comparison Testing

### Equivalence Tests
```javascript
describe('Workflow Equivalence', () => {
  it('should produce same results from both patterns', async () => {
    const testImage = 'test-albums.jpg';

    // Run Step Functions workflow
    const sfResult = await runStepFunctionsWorkflow(testImage);

    // Run Durable Functions workflow
    const dfResult = await runDurableFunctionsWorkflow(testImage);

    // Compare results
    expect(sfResult.albums).toHaveLength(6);
    expect(dfResult.albums).toHaveLength(6);

    // Albums should match (order may vary)
    sfResult.albums.forEach((sfAlbum, i) => {
      const dfAlbum = dfResult.albums[i];
      expect(dfAlbum.albumName).toBe(sfAlbum.albumName);
      expect(dfAlbum.artist).toBe(sfAlbum.artist);
      expect(dfAlbum.year).toBe(sfAlbum.year);
    });
  });
});
```

### Performance Tests
```javascript
describe('Performance Comparison', () => {
  it('should measure execution time for both patterns', async () => {
    const testImage = 'test-albums.jpg';

    // Measure Step Functions
    const sfStart = Date.now();
    await runStepFunctionsWorkflow(testImage);
    const sfDuration = Date.now() - sfStart;

    // Measure Durable Functions
    const dfStart = Date.now();
    await runDurableFunctionsWorkflow(testImage);
    const dfDuration = Date.now() - dfStart;

    // Record metrics
    console.log({
      stepFunctions: { duration: sfDuration },
      durableFunctions: { duration: dfDuration },
      difference: Math.abs(sfDuration - dfDuration)
    });

    // Both should complete in reasonable time
    expect(sfDuration).toBeLessThan(60000); // 60 seconds
    expect(dfDuration).toBeLessThan(60000);
  });

  it('should measure parallel execution efficiency', async () => {
    // Test how well each pattern handles 6 parallel price estimations
    const albums = Array(6).fill(null).map((_, i) => ({
      albumName: `Album ${i}`,
      artist: `Artist ${i}`,
      year: 2020
    }));

    // Both patterns should complete parallel work in similar time
    // (not 6x sequential time)
  });
});
```

### Cost Analysis Tests
```javascript
describe('Cost Comparison', () => {
  it('should estimate costs for Step Functions', async () => {
    const execution = await runStepFunctionsWorkflow('test.jpg');
    
    const cost = calculateStepFunctionsCost({
      stateTransitions: execution.stateTransitions,
      lambdaInvocations: execution.lambdaInvocations,
      lambdaDuration: execution.lambdaDuration
    });

    expect(cost).toHaveProperty('stateTransitionCost');
    expect(cost).toHaveProperty('lambdaCost');
    expect(cost).toHaveProperty('total');
  });

  it('should estimate costs for Durable Functions', async () => {
    const execution = await runDurableFunctionsWorkflow('test.jpg');
    
    const cost = calculateDurableFunctionsCost({
      lambdaDuration: execution.duration,
      memorySize: 1024,
      checkpointCount: execution.checkpointCount
    });

    expect(cost).toHaveProperty('lambdaCost');
    expect(cost).toHaveProperty('storageCost');
    expect(cost).toHaveProperty('total');
  });
});
```

## Integration Testing

### End-to-End Tests
```javascript
describe('End-to-End Workflow', () => {
  it('should complete full workflow with Step Functions', async () => {
    // Upload image to S3
    await uploadTestImage('test-albums.jpg');

    // Wait for workflow completion
    const result = await waitForStepFunctionsCompletion('exec-123');

    // Verify results in DynamoDB
    const albums = await getAlbumsFromDB('sf#', 'exec-123');
    expect(albums).toHaveLength(6);
    albums.forEach(album => {
      expect(album).toHaveProperty('priceEstimate');
      expect(album.yearValidated).toBe(true);
    });
  });

  it('should complete full workflow with Durable Functions', async () => {
    // Upload image to S3
    await uploadTestImage('test-albums.jpg');

    // Wait for workflow completion
    const result = await waitForDurableFunctionsCompletion('exec-456');

    // Verify results in DynamoDB
    const albums = await getAlbumsFromDB('ldf#', 'exec-456');
    expect(albums).toHaveLength(6);
    albums.forEach(album => {
      expect(album).toHaveProperty('priceEstimate');
      expect(album.yearValidated).toBe(true);
    });
  });
});
```

## Test Data Management

### Fixtures
```javascript
// tests/fixtures/albums.js
export const testAlbums = [
  {
    albumName: 'The Dark Side of the Moon',
    artist: 'Pink Floyd',
    year: 1973,
    expectedPrice: 45.00
  },
  {
    albumName: 'Abbey Road',
    artist: 'The Beatles',
    year: 1969,
    expectedPrice: 35.00
  }
  // ... 4 more albums
];

export const testImage = {
  s3Key: 'test-images/six-albums.jpg',
  expectedAlbumCount: 6
};
```

## Test Environment Setup

### Environment Configuration
```json
{
  "TABLE_NAME": "test-album-table",
  "BUCKET_NAME": "test-album-images",
  "BEDROCK_MODEL_ID": "anthropic.claude-3-sonnet-20240229-v1:0",
  "AWS_REGION": "us-east-1"
}
```

## Continuous Integration

### Test Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:durable": "jest tests/durable-functions",
    "test:step": "jest tests/step-functions",
    "test:shared": "jest tests/shared",
    "test:comparison": "jest tests/comparison",
    "test:coverage": "jest --coverage"
  }
}
```

## Test Coverage Standards

### Coverage Targets
- **Durable Functions**: 80% line coverage
- **Step Functions**: 80% line coverage (Lambda functions)
- **Shared Functions**: 90% line coverage
- **Comparison Tests**: 100% of comparison scenarios

### Coverage Configuration
```javascript
// jest.config.js
export default {
  collectCoverageFrom: [
    'workflows/**/*.mjs',
    'functions/**/*.mjs',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```
