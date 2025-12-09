# Implementation Plan

- [x] 1. Create SAM project structure
  - [x] 1.1 Create template.yaml with durable function configuration
    - Define AWS::Serverless::Function with DurableConfig (ExecutionTimeout: 10, RetentionPeriodInDays: 1)
    - Add IAM policies for lambda:CheckpointDurableExecutions and lambda:GetDurableExecutionState
    - Configure AutoPublishAlias for qualified ARN invocations
    - Set runtime to nodejs22.x and handler to index.handler
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Create src/package.json with dependencies
    - Add @aws/durable-execution-sdk-js as dependency
    - Configure ES modules with "type": "module"
    - _Requirements: 2.1_

- [x] 2. Implement durable function handler
  - [x] 2.1 Create src/index.mjs with durable execution handler
    - Import durableExecution and durableStep from SDK
    - Create step functions for demonstration (e.g., validateInput, processData)
    - Wrap main handler with durableExecution()
    - Orchestrate steps using context.step()
    - Return execution result with status and completed steps
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Checkpoint - Verify build works
  - Run `sam build` to verify template and code are valid
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 4. Add template validation tests
  - [ ]* 4.1 Create test file for SAM template validation
    - Parse template.yaml and verify DurableConfig section exists
    - Verify ExecutionTimeout and RetentionPeriodInDays are configured
    - Verify IAM policies include checkpoint permissions
    - Verify AutoPublishAlias is configured
    - _Requirements: 1.2, 1.4_
