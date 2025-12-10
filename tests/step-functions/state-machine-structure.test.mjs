import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('Step Functions State Machine Structure', () => {
  let stateMachine;

  beforeAll(() => {
    const aslContent = readFileSync('workflows/step-functions/definition.asl.json', 'utf-8');
    stateMachine = JSON.parse(aslContent);
  });

  it('should have valid ASL structure', () => {
    expect(stateMachine).toHaveProperty('Comment');
    expect(stateMachine).toHaveProperty('StartAt');
    expect(stateMachine).toHaveProperty('States');
    expect(stateMachine.StartAt).toBe('ProcessImage');
  });

  it('should have all 6 workflow states defined', () => {
    const requiredStates = [
      'ProcessImage',
      'SaveInitialData',
      'WaitForValidation',
      'UpdateValidatedData',
      'EstimatePrices',
      'StoreFinalResults'
    ];

    requiredStates.forEach(state => {
      expect(stateMachine.States).toHaveProperty(state);
    });
  });

  it('should have Map state for parallel price estimation', () => {
    const estimatePricesState = stateMachine.States.EstimatePrices;
    expect(estimatePricesState.Type).toBe('Map');
    expect(estimatePricesState).toHaveProperty('MaxConcurrency');
    expect(estimatePricesState.MaxConcurrency).toBe(6);
  });

  it('should have Wait state with task token for validation', () => {
    const waitState = stateMachine.States.WaitForValidation;
    expect(waitState.Type).toBe('Task');
    expect(waitState.Resource).toBe('arn:aws:states:::lambda:invoke.waitForTaskToken');
    expect(waitState).toHaveProperty('TimeoutSeconds');
    expect(waitState.TimeoutSeconds).toBe(3600);
  });

  it('should have retry configurations', () => {
    const processImageState = stateMachine.States.ProcessImage;
    expect(processImageState).toHaveProperty('Retry');
    expect(Array.isArray(processImageState.Retry)).toBe(true);
    expect(processImageState.Retry.length).toBeGreaterThan(0);

    const retryConfig = processImageState.Retry[0];
    expect(retryConfig).toHaveProperty('ErrorEquals');
    expect(retryConfig).toHaveProperty('IntervalSeconds');
    expect(retryConfig).toHaveProperty('MaxAttempts');
    expect(retryConfig).toHaveProperty('BackoffRate');
  });

  it('should have catch configurations', () => {
    const processImageState = stateMachine.States.ProcessImage;
    expect(processImageState).toHaveProperty('Catch');
    expect(Array.isArray(processImageState.Catch)).toBe(true);
    expect(processImageState.Catch.length).toBeGreaterThan(0);

    const catchConfig = processImageState.Catch[0];
    expect(catchConfig).toHaveProperty('ErrorEquals');
    expect(catchConfig).toHaveProperty('Next');
    expect(catchConfig.Next).toBe('HandleError');
  });

  it('should have error handling state', () => {
    expect(stateMachine.States).toHaveProperty('HandleError');
    expect(stateMachine.States).toHaveProperty('FailExecution');

    const handleErrorState = stateMachine.States.HandleError;
    expect(handleErrorState.Type).toBe('Task');
    expect(handleErrorState.Next).toBe('FailExecution');

    const failState = stateMachine.States.FailExecution;
    expect(failState.Type).toBe('Fail');
  });

  it('should use DynamoDB service integrations', () => {
    const saveExecutionState = stateMachine.States.SaveInitialData.Branches[0].States.SaveExecution;
    expect(saveExecutionState.Resource).toBe('arn:aws:states:::dynamodb:putItem');
  });

  it('should have parallel branches for saving initial data', () => {
    const saveInitialDataState = stateMachine.States.SaveInitialData;
    expect(saveInitialDataState.Type).toBe('Parallel');
    expect(saveInitialDataState).toHaveProperty('Branches');
    expect(saveInitialDataState.Branches.length).toBe(2);
  });

  it('should have Map state for saving albums', () => {
    const saveAlbumsState = stateMachine.States.SaveInitialData.Branches[1].States.SaveAlbums;
    expect(saveAlbumsState.Type).toBe('Map');
    expect(saveAlbumsState).toHaveProperty('MaxConcurrency');
    expect(saveAlbumsState.MaxConcurrency).toBe(6);
  });
});
