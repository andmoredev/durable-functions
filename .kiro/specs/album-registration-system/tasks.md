# Implementation Plan

- [x] 1. Set up project infrastructure and shared resources
  - Create SAM template with DynamoDB table, S3 bucket, and IAM roles
  - Configure table with multi-attribute GSI keys for flexible querying
  - Set up S3 bucket with EventBridge notifications
  - Configure environment variables for all functions
  - _Requirements: 1.1, 3.1, 3.5_

- [x] 1.1 Write property test for infrastructure setup
  - **Property 4: Workflow Type Tagging**
  - **Validates: Requirements 1.4**

- [x] 2. Implement Durable Function workflow handler
  - Create lean handler in `workflows/durable-function/index.mjs`
  - Import business logic modules from `lib/` folder
  - Implement 6-step workflow using `context.step()`, `context.wait()`, and `context.map()`
  - Ensure deterministic code (no side effects outside steps)
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2.1 Write property test for deterministic replay
  - **Property 27: Deterministic Replay**
  - **Validates: Requirements 7.5**

- [x] 3. Implement image processing business logic
  - Create `workflows/durable-function/lib/image-processor.mjs`
  - Implement Bedrock vision model integration
  - Parse response to extract 6 albums with metadata
  - Assign indices 1-6 to albums
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.1 Write property test for exact album count
  - **Property 6: Exact Album Count**
  - **Validates: Requirements 2.2**

- [x] 3.2 Write property test for album data completeness
  - **Property 7: Album Data Completeness**
  - **Validates: Requirements 2.3**

- [x] 3.3 Write property test for album index uniqueness
  - **Property 8: Album Index Uniqueness**
  - **Validates: Requirements 2.4**

- [x] 4. Implement album repository business logic
  - Create `workflows/durable-function/lib/album-repository.mjs`
  - Implement `saveExecution()` for execution metadata
  - Implement `saveAlbums()` for album records
  - Implement `updateAlbums()` for validated data and prices
  - Use natural keys without synthetic concatenation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.1 Write property test for execution metadata completeness
  - **Property 11: Execution Metadata Completeness**
  - **Validates: Requirements 3.2**

- [x] 4.2 Write property test for album item separation
  - **Property 12: Album Item Separation**
  - **Validates: Requirements 3.3**

- [x] 4.3 Write property test for album key structure
  - **Property 13: Album Key Structure**
  - **Validates: Requirements 3.4**

- [x] 5. Implement price estimator business logic
  - Create `workflows/durable-function/lib/price-estimator.mjs`
  - Implement price calculation logic
  - Return price estimate and confidence score
  - Handle estimation errors gracefully
  - _Requirements: 5.2, 5.3_

- [x] 5.1 Write property test for price estimate completeness
  - **Property 22: Price Estimate Completeness**
  - **Validates: Requirements 5.3**

- [x] 6. Implement validation task management
  - Create validation task creation logic
  - Implement callback handling for workflow resumption
  - Add timeout handling (1 hour default)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6.1 Write property test for validation data round-trip
  - **Property 18: Validation Data Round-Trip**
  - **Validates: Requirements 4.4**

- [x] 6.2 Write property test for validation timeout handling
  - **Property 19: Validation Timeout Handling**
  - **Validates: Requirements 4.5**

- [x] 7. Implement error handling and retry logic
  - Add try-catch blocks in step callbacks
  - Configure retry policies for Durable Function steps
  - Implement error logging with execution context
  - Update execution status on failures
  - _Requirements: 2.5, 10.1, 10.2_

- [x] 7.1 Write property test for error logging
  - **Property 31: Error Logging**
  - **Validates: Requirements 10.1**

- [x] 7.2 Write property test for failure status update
  - **Property 32: Failure Status Update**
  - **Validates: Requirements 10.2**

- [x] 8. Checkpoint - Ensure all Durable Function tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Step Functions state machine
  - Create ASL definition in `workflows/step-functions/definition.asl.json`
  - Define all 6 workflow states
  - Configure Map state for parallel price estimation
  - Configure Wait state with task token for validation
  - Add retry and catch configurations
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9.1 Write property test for error retry mechanism
  - **Property 28: Error Retry Mechanism**
  - **Validates: Requirements 8.5**

- [ ] 10. Implement Step Functions Lambda functions
  - Create `functions/image-processor/index.mjs` with lean handler
  - Create `functions/image-processor/lib/` with business logic
  - Create `functions/price-estimator/index.mjs` with lean handler
  - Create `functions/price-estimator/lib/` with business logic
  - Reuse business logic patterns from Durable Function implementation
  - _Requirements: 2.1, 2.2, 2.3, 5.2, 5.3_

- [ ] 11. Implement S3 trigger function
  - Create `functions/triggers/s3-trigger.mjs`
  - Trigger both Step Functions and Durable Functions workflows
  - Assign unique execution IDs
  - Validate S3 key format
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 11.1 Write property test for dual workflow trigger
  - **Property 1: Dual Workflow Trigger**
  - **Validates: Requirements 1.1**

- [ ] 11.2 Write property test for unique execution IDs
  - **Property 2: Unique Execution IDs**
  - **Validates: Requirements 1.2**

- [ ] 11.3 Write property test for S3 key validation
  - **Property 3: S3 Key Validation**
  - **Validates: Requirements 1.3**

- [ ] 12. Implement data isolation and comparison utilities
  - Ensure workflowType attribute in all data operations
  - Implement query functions that filter by workflow type
  - Create comparison utilities for analyzing results
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 12.1 Write property test for workflow type filtering
  - **Property 29: Workflow Type Filtering**
  - **Validates: Requirements 9.2**

- [ ] 12.2 Write property test for workflow equivalence
  - **Property 30: Workflow Equivalence**
  - **Validates: Requirements 9.3**

- [ ] 13. Implement monitoring and metrics
  - Add CloudWatch metrics emission
  - Configure custom metrics for both patterns
  - Set up execution tracking
  - _Requirements: 10.5_

- [ ] 13.1 Write property test for metrics emission
  - **Property 33: Metrics Emission**
  - **Validates: Requirements 10.5**

- [ ] 14. Checkpoint - Ensure all Step Functions tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Integration testing
  - Test complete Durable Function workflow end-to-end
  - Test complete Step Functions workflow end-to-end
  - Verify both patterns produce equivalent results
  - Test human-in-the-loop validation flow
  - _Requirements: 9.3_

- [ ] 16. Comparison testing and analysis
  - Run identical inputs through both patterns
  - Compare execution times using native metrics
  - Compare final data structures
  - Verify data isolation
  - _Requirements: 9.3_

- [ ] 17. Final checkpoint - All tests passing
  - Ensure all tests pass, ask the user if questions arise.
