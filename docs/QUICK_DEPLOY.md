# Quick Deploy Guide

## Prerequisites
- AWS CLI configured
- AWS SAM CLI installed
- Node.js 24.x+

## Deploy in 3 Steps

### 1. Build
```bash
sam build
```

### 2. Deploy
```bash
sam deploy --guided
```
Accept defaults or customize:
- Stack name: `durable-functions-example`
- Region: `us-east-1`
- Confirm changes: `Y`
- Allow IAM role creation: `Y`

### 3. Test
```bash
# Get function name from deploy output, then:
aws lambda invoke \
  --function-name <your-stack-name>-DurableFunctionExampleFunction-<id> \
  --payload file://workflows/durable-function-example/test-event.json \
  response.json

cat response.json
```

## What You Get
- Durable function demonstrating all key operations
- Helper function for invoke examples
- Complete workflow with parallel processing, waits, and callbacks
- Comprehensive result aggregation

## Monitor
```bash
aws logs tail /aws/lambda/<function-name> --follow
```

## Cleanup
```bash
sam delete --stack-name durable-functions-example
```

## Need Help?
See the full [README.md](README.md) for detailed documentation.