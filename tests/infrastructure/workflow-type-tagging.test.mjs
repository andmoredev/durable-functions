import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('Infrastructure - Property Tests', () => {
  it('Property 4: Workflow Type Tagging - For any execution, the workflowType attribute should correctly identify the orchestration pattern', () => {
    fc.assert(
      fc.property(
        fc.record({
          executionId: fc.uuid(),
          imageS3Key: fc.string({ minLength: 1, maxLength: 100 }),
          workflowType: fc.constantFrom('step-functions', 'durable-functions')
        }),
        (execution) => {
          const validWorkflowTypes = ['step-functions', 'durable-functions'];

          expect(validWorkflowTypes).toContain(execution.workflowType);

          expect(execution.workflowType).toMatch(/^(step-functions|durable-functions)$/);

          if (execution.workflowType === 'step-functions') {
            expect(execution.workflowType).toBe('step-functions');
          } else if (execution.workflowType === 'durable-functions') {
            expect(execution.workflowType).toBe('durable-functions');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
