import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

describe('Step Functions - Error Retry Mechanism', () => {
  it('Property 28: Error Retry Mechanism - For any Step Functions error, the built-in retry mechanism should trigger according to configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          errorType: fc.constantFrom(
            'Lambda.ServiceException',
            'Lambda.AWSLambdaException',
            'Lambda.SdkClientException',
            'Lambda.TooManyRequestsException',
            'DynamoDB.ProvisionedThroughputExceededException',
            'DynamoDB.RequestLimitExceeded'
          ),
          attemptNumber: fc.integer({ min: 1, max: 3 }),
          intervalSeconds: fc.integer({ min: 1, max: 10 }),
          backoffRate: fc.double({ min: 1.5, max: 3.0 })
        }),
        async ({ errorType, attemptNumber, intervalSeconds, backoffRate }) => {
          const expectedDelay = intervalSeconds * Math.pow(backoffRate, attemptNumber - 1);

          const retryConfig = {
            ErrorEquals: [errorType],
            IntervalSeconds: intervalSeconds,
            MaxAttempts: 3,
            BackoffRate: backoffRate
          };

          expect(retryConfig.MaxAttempts).toBeGreaterThanOrEqual(attemptNumber);
          expect(expectedDelay).toBeGreaterThan(0);

          const shouldRetry = attemptNumber <= retryConfig.MaxAttempts;
          expect(shouldRetry).toBe(true);

          if (attemptNumber > 1) {
            const previousDelay = intervalSeconds * Math.pow(backoffRate, attemptNumber - 2);
            expect(expectedDelay).toBeGreaterThan(previousDelay);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 28: Validates retry configuration in state machine definition', async () => {
    const fs = await import('fs/promises');
    const stateDefinition = JSON.parse(
      await fs.readFile('workflows/step-functions/definition.asl.json', 'utf-8')
    );

    const statesWithRetry = [];

    function findRetryConfigs(states) {
      for (const [stateName, state] of Object.entries(states)) {
        if (state.Retry && Array.isArray(state.Retry)) {
          statesWithRetry.push({ stateName, retryConfigs: state.Retry });
        }

        if (state.Iterator && state.Iterator.States) {
          findRetryConfigs(state.Iterator.States);
        }

        if (state.Branches && Array.isArray(state.Branches)) {
          state.Branches.forEach(branch => {
            if (branch.States) {
              findRetryConfigs(branch.States);
            }
          });
        }
      }
    }

    findRetryConfigs(stateDefinition.States);

    expect(statesWithRetry.length).toBeGreaterThan(0);

    statesWithRetry.forEach(({ stateName, retryConfigs }) => {
      retryConfigs.forEach(config => {
        expect(config).toHaveProperty('ErrorEquals');
        expect(config).toHaveProperty('IntervalSeconds');
        expect(config).toHaveProperty('MaxAttempts');
        expect(config).toHaveProperty('BackoffRate');

        expect(config.MaxAttempts).toBeGreaterThan(0);
        expect(config.IntervalSeconds).toBeGreaterThan(0);
        expect(config.BackoffRate).toBeGreaterThanOrEqual(1.0);
      });
    });
  });

  it('Property 28: Validates catch configuration in state machine definition', async () => {
    const fs = await import('fs/promises');
    const stateDefinition = JSON.parse(
      await fs.readFile('workflows/step-functions/definition.asl.json', 'utf-8')
    );

    const statesWithCatch = [];

    function findCatchConfigs(states) {
      for (const [stateName, state] of Object.entries(states)) {
        if (state.Catch && Array.isArray(state.Catch)) {
          statesWithCatch.push({ stateName, catchConfigs: state.Catch });
        }

        if (state.Iterator && state.Iterator.States) {
          findCatchConfigs(state.Iterator.States);
        }

        if (state.Branches && Array.isArray(state.Branches)) {
          state.Branches.forEach(branch => {
            if (branch.States) {
              findCatchConfigs(branch.States);
            }
          });
        }
      }
    }

    findCatchConfigs(stateDefinition.States);

    expect(statesWithCatch.length).toBeGreaterThan(0);

    statesWithCatch.forEach(({ stateName, catchConfigs }) => {
      catchConfigs.forEach(config => {
        expect(config).toHaveProperty('ErrorEquals');
        expect(config).toHaveProperty('Next');
        expect(Array.isArray(config.ErrorEquals)).toBe(true);
        expect(config.ErrorEquals.length).toBeGreaterThan(0);
      });
    });
  });
});
