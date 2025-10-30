# Bruno API Testing - Best Practices Guide

## Handling Complex Script Operations

### Problem Statement

Bruno's runtime environment has limitations when it comes to executing complex operations in pre-request or post-response scripts. Specifically:

- **No HTTP requests available**: `fetch()`, `axios`, or similar HTTP libraries are not available in Bruno scripts
- **Limited Node.js APIs**: Many Node.js modules and APIs are restricted
- **Runtime constraints**: Complex cryptographic operations, external library calls, or heavy computations may fail

### Recommended Solution: Dev Endpoint Pattern

When you need to perform complex operations (like cryptographic signing, external API calls, or data transformations), instead of trying to implement them directly in Bruno scripts, create a dedicated development endpoint and use a two-step approach.

## Implementation Pattern

### Step 1: Create a Development Endpoint

Create a dedicated endpoint in your backend that handles the complex operation:

```typescript
// Example: devController.ts
export const performComplexOperation = async (req: Request, res: Response) => {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ message: 'Not found' });
    }

    const { inputData, parameters } = req.body;
    
    // Perform complex operation (crypto, external APIs, etc.)
    const result = await complexCryptographicOperation(inputData, parameters);
    
    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dev endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

### Step 2: Create Sequential Bruno Requests

Instead of one complex request, create a sequence of simple requests:

#### Request 1: Prepare Operation

```bruno
meta {
  name: Step 1 - Prepare Complex Operation
  type: http
  seq: 1
}

post {
  url: {{host}}/dev/complex-operation
  body: json
  auth: none
}

script:pre-request {
  // Simple parameter preparation
  const inputData = bru.getEnvVar("inputData");
  const parameters = bru.getEnvVar("parameters");
  
  console.log("Preparing complex operation...");
  bru.setVar("inputData", inputData);
  bru.setVar("parameters", parameters);
}

body:json {
  {
    "inputData": "{{inputData}}",
    "parameters": "{{parameters}}"
  }
}

vars:post-response {
  operationResult: res.body.result
  operationTimestamp: res.body.timestamp
}

tests {
  test("should return success", function() {
    expect(res.body.success).to.equal(true);
  });
  
  test("should return operation result", function() {
    expect(res.body.result).to.be.a('string');
  });
  
  test("store result for next request", function() {
    bru.setVar("complexResult", res.body.result);
    console.log("Complex operation completed, result stored");
  });
}
```

#### Request 2: Use Operation Result

```bruno
meta {
  name: Step 2 - Use Operation Result
  type: http
  seq: 2
}

post {
  url: {{host}}/api/actual-endpoint
  body: json
  auth: none
}

script:pre-request {
  // Verify the complex operation was completed
  const complexResult = bru.getVar("complexResult");
  
  if (!complexResult) {
    throw new Error("Complex operation must be completed first. Please run 'Step 1' before this request.");
  }
  
  console.log("Using result from complex operation");
}

body:json {
  {
    "processedData": "{{complexResult}}",
    "timestamp": "{{operationTimestamp}}"
  }
}

tests {
  test("should return 200 status", function() {
    expect(res.getStatus()).to.equal(200);
  });
}
```

## Real-World Example: SIWE Authentication

Our SIWE (Sign-In with Ethereum) authentication flow demonstrates this pattern perfectly:

### The Problem

SIWE requires:

1. Creating a specific message format
2. Cryptographic signing with a private key
3. Complex validation logic

Attempting this directly in Bruno scripts would fail due to:

- No access to cryptographic libraries
- No fetch() for intermediate requests
- Limited error handling capabilities

### The Solution

We implemented a three-step process:

#### Step 1: Get Nonce

```bruno
# Auth - 1 - Get Nonce.bru
get {
  url: {{host}}/user/nonce/{{testAddress}}
}

vars:post-response {
  nonce: res.body.nonce
}
```

#### Step 2: Generate SIWE Signature (via Dev Endpoint)

```bruno
# Auth - 2 - Generate SIWE Signature.bru
post {
  url: {{host}}/dev/generate-siwe-signature
  body: json
}

body:json {
  {
    "messageParams": {
      "nonce": "{{nonce}}",
      "address": "{{testAddress}}",
      "domain": "{{domain}}",
      "chainId": {{chainId}}
    },
    "privateKey": "{{privateKey}}"
  }
}

vars:post-response {
  siweMessage: res.body.message
  siweSignature: res.body.signature
}
```

#### Step 3: Login with Generated Signature

```bruno
# Auth - 3 - Login with SIWE.bru
post {
  url: {{host}}/auth/siwe
  body: json
}

body:json {
  {
    "message": "{{siweMessage}}",
    "signature": "{{siweSignature}}"
  }
}
```

## Benefits of This Approach

### ✅ Advantages

- **Reliability**: No runtime environment limitations
- **Debugging**: Easier to debug complex operations in your main codebase
- **Reusability**: Dev endpoints can be used by multiple tests
- **Maintainability**: Complex logic stays in your main codebase, not scattered in test scripts
- **Security**: Dev endpoints can be restricted to development environment only

### ⚠️ Considerations

- **Development Only**: Ensure dev endpoints are only available in development
- **Sequence Management**: Requests must run in correct order
- **Error Handling**: Handle failures gracefully in each step
- **Data Persistence**: Use Bruno variables to pass data between requests

## Security Best Practices

### Environment Protection

```typescript
// Always check environment
if (process.env.NODE_ENV !== 'development') {
  return res.status(404).json({ message: 'Not found' });
}
```

### Middleware Protection

```typescript
const devModeOnly = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' });
  }
  next();
};

// Apply to all dev routes
router.use('/dev', devModeOnly);
```

### Request Validation

```typescript
// Validate all inputs in dev endpoints
const { error, value } = schema.validate(req.body);
if (error) {
  return res.status(400).json({
    success: false,
    error: error.details[0].message
  });
}
```

## Common Use Cases

This pattern is particularly useful for:

- **Cryptographic Operations**: Signing, hashing, encryption
- **External API Calls**: Third-party service integration
- **Complex Data Transformations**: Heavy processing, formatting
- **Multi-step Authentication**: OAuth flows, SIWE, etc.
- **Database Seeding**: Setting up test data
- **File Operations**: File uploads, processing, validation

## Troubleshooting

### Common Issues

1. **Variables Not Persisting Between Requests**
   - Ensure correct sequence numbers (`seq: 1`, `seq: 2`, etc.)
   - Use `bru.setVar()` in post-response scripts or tests
   - Verify variable names match exactly

2. **Dev Endpoint Not Found**
   - Check environment variables
   - Ensure server is running in development mode
   - Verify route registration

3. **Timing Issues**
   - Add appropriate delays if needed
   - Check async operation completion
   - Verify response data before proceeding

### Debugging Tips

```bruno
script:pre-request {
  console.log("Current variables:");
  console.log("- complexResult:", bru.getVar("complexResult"));
  console.log("- timestamp:", bru.getVar("timestamp"));
}
```

## When NOT to Use This Pattern

This pattern is overkill for:

- Simple value transformations
- Basic string manipulation
- Simple conditional logic
- Standard HTTP authentication (Basic, Bearer)

Use this pattern when you encounter:

- "fetch is not defined" errors
- "module not found" errors
- Complex cryptographic requirements
- Need for external API calls within tests

## Conclusion

When Bruno's runtime limitations prevent you from implementing complex operations directly in scripts, the dev endpoint pattern provides a reliable, maintainable alternative. This approach keeps your test logic simple while leveraging the full power of your backend infrastructure for complex operations.

**Remember: Keep it simple in Bruno, handle complexity in your backend.**

## Quick Reference

### ❌ Avoid in Bruno Scripts

```javascript
// These will fail in Bruno
const response = await fetch('...');
const crypto = require('crypto');
const axios = require('axios');
```

### ✅ Use Instead

```bruno
# Create dev endpoint + sequential requests
meta {
  name: Step 1 - Prepare Data
  seq: 1
}

post {
  url: {{host}}/dev/prepare-data
}
```

This approach has been successfully implemented in our SIWE authentication flow and provides a robust foundation for complex testing scenarios.
