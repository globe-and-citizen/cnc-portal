# Bruno API Testing - Best Practices Guide

## Bruno Test File Naming Convention

### Overview

Our Bruno test files follow a structured naming convention to clearly differentiate between different types of tests and their purposes. This ensures consistency, maintainability, and easy navigation across our test suite.

### Naming Format

#### 1. **Production API Tests** (Main Functionality)

```text
[Domain] - [Seq] - [Endpoint] - [Action/Feature]
```

**Purpose**: Test the expected behavior of production API endpoints.

**Examples:**

```text
Auth - 01 - Nonce - Get Nonce.bru
Auth - 03 - SIWE - Login with SIWE.bru
Auth - 04 - Token - Validate Token.bru
Auth - 05 - Protected - Test Protected Route.bru

Team - 01 - Team - Create Team.bru
Team - 02 - Members - Add Member.bru
Team - 03 - Team - Get Team Details.bru

Claim - 01 - Claims - Submit Claim.bru
Claim - 02 - Claims - Approve Claim.bru
Claim - 03 - Claims - Get Claims History.bru
```

#### 2. **Dev Helper Tests** (Complex Operations Support)

```text
[Domain] - [Seq] - Dev Helper - [Operation] - [Description]
```

**Purpose**: Call development endpoints to perform complex operations that cannot be executed in Bruno pre-request scripts due to runtime limitations.

**Examples:**

```text
Auth - 02 - Dev Helper - SIWE - Generate SIWE Signature.bru
Auth - 06 - Dev Helper - JWT - Create JWT Token.bru
Auth - 07 - Dev Helper - Transaction - Sign Transaction.bru

Team - 04 - Dev Helper - Data - Generate Team Data.bru
Team - 05 - Dev Helper - Members - Create Mock Members.bru

Claim - 04 - Dev Helper - Signature - Generate Claim Signature.bru
Claim - 05 - Dev Helper - Merkle - Calculate Merkle Proof.bru
```

#### 3. **Edge Case Tests** (Error & Invalid Scenarios)

```text
[Domain] - [Seq] - Edge Case - [Endpoint] - [Error Type]
```

**Purpose**: Test endpoint behavior with unexpected, invalid, or error-inducing requests.

**Examples:**

```text
Auth - 08 - Edge Case - SIWE - Missing Message.bru
Auth - 09 - Edge Case - SIWE - Invalid Signature.bru
Auth - 10 - Edge Case - SIWE - Expired Nonce.bru
Auth - 13 - Edge Case - Token - Invalid Token.bru
Auth - 14 - Edge Case - Token - Missing Token.bru

Team - 06 - Edge Case - Create - Missing Name.bru
Team - 07 - Edge Case - Create - Invalid Owner.bru
Team - 08 - Edge Case - Members - Duplicate Address.bru

Claim - 06 - Edge Case - Submit - Invalid Hours.bru
Claim - 07 - Edge Case - Submit - Missing Team.bru
Claim - 08 - Edge Case - Approve - Unauthorized User.bru
```

### Directory Structure

```
bruno/CNCPortal/
├── Auth/
│   ├── Auth - 01 - Nonce - Get Nonce.bru
│   ├── Auth - 02 - Dev Helper - SIWE - Generate SIWE Signature.bru
│   ├── Auth - 03 - SIWE - Login with SIWE.bru
│   ├── Auth - 04 - Token - Validate Token.bru
│   ├── Auth - 05 - Protected - Test Protected Route.bru
│   └── edge/
│       ├── Auth - 08 - Edge Case - SIWE - Missing Message.bru
│       ├── Auth - 09 - Edge Case - SIWE - Invalid Signature.bru
│       ├── Auth - 10 - Edge Case - SIWE - Expired Nonce.bru
│       ├── Auth - 13 - Edge Case - Token - Invalid Token.bru
│       └── Auth - 14 - Edge Case - Token - Missing Token.bru
├── Team/
│   ├── Team - 01 - Team - Create Team.bru
│   ├── Team - 02 - Members - Add Member.bru
│   ├── Team - 03 - Team - Get Team Details.bru
│   ├── Team - 04 - Dev Helper - Data - Generate Team Data.bru
│   └── edge/
│       ├── Team - 05 - Edge Case - Create - Missing Name.bru
│       ├── Team - 06 - Edge Case - Create - Invalid Owner.bru
│       └── Team - 07 - Edge Case - Members - Duplicate Address.bru
└── Claim/
    ├── Claim - 01 - Claims - Submit Claim.bru
    ├── Claim - 02 - Claims - Approve Claim.bru
    ├── Claim - 03 - Claims - Get Claims History.bru
    ├── Claim - 04 - Dev Helper - Signature - Generate Claim Signature.bru
    └── edge/
        ├── Claim - 05 - Edge Case - Submit - Invalid Hours.bru
        ├── Claim - 06 - Edge Case - Submit - Missing Team.bru
        └── Claim - 07 - Edge Case - Approve - Unauthorized User.bru
```

### Naming Rules and Guidelines

#### Sequence Numbers

- Use 2-digit numbers with leading zeros (01, 02, 03...)
- Production tests start from 01
- Dev Helper tests use next available numbers
- Edge cases continue the sequence or are grouped together
- Edge cases in subfolders can have their own numbering

#### Endpoint Names

- Use clear, short endpoint identifiers
- Match the actual API endpoint when possible
- Examples: `Nonce`, `SIWE`, `Token`, `Protected`, `Team`, `Members`, `Claims`

#### Action/Feature Names

- Use descriptive action verbs
- Keep names concise but clear
- Examples: `Get Nonce`, `Login with SIWE`, `Validate Token`, `Create Team`

#### Error Type Names (Edge Cases)

- Describe the specific error condition
- Be specific about what's wrong
- Examples: `Missing Message`, `Invalid Signature`, `Expired Nonce`, `Unauthorized User`

### Benefits of This Convention

#### ✅ **Clear Test Categories**

- Immediately identify test purpose from filename
- Easy to distinguish between production tests, dev helpers, and edge cases
- Consistent structure across all domains

#### ✅ **Logical Organization**

- Sequential numbering provides execution order
- Endpoint names allow grouping by API functionality
- Edge cases are clearly separated in subfolders

#### ✅ **Maintainable Structure**

- Easy to add new tests in appropriate sequence
- Clear relationship between related tests
- Scalable naming system

#### ✅ **Better Navigation and Discovery**

- Bruno's file listing becomes self-documenting
- Quick identification of test coverage
- Easy to find specific test types

### Meta Tag Consistency

Ensure the `meta.name` inside each file matches the filename:

```bruno
meta {
  name: Auth - 02 - Dev Helper - SIWE - Generate SIWE Signature
  type: http
  seq: 2
}
```

### Running Tests by Category

```bash
# Run all Auth tests (includes edge cases)
npx bru run Auth --env CNCURI

# Run only Auth edge cases
npx bru run Auth/edge --env CNCURI

# Run specific domain tests
npx bru run Team --env CNCURI
npx bru run Claim --env CNCURI

# Run complete test suite
npx bru run . --env CNCURI
```

---

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
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dev endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
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
    error: error.details[0].message,
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
