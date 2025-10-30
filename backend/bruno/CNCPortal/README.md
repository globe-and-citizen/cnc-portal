# Bruno API Tests

End-to-end API tests for the CNC Portal backend using [Bruno](https://www.usebruno.com/).

## Prerequisites

- Backend server must be running on `http://localhost:3000`
- Node.js and npm installed

## Quick Start

```bash
# Start the backend server (in one terminal)
npm start

# Run all Bruno tests (in another terminal)
npm run test:bruno
```

## Available Scripts

```bash
npm run test:bruno:setup   # Generate fresh auth credentials
npm run test:bruno         # Run all Bruno tests
npm run test:bruno:auth    # Run auth tests only
```

## Test Structure

```
bruno/CNC Portal/
├── Auth/                          # Authentication tests
│   ├── Auth - Get Nonce.bru
│   ├── Auth - Login with SIWE.bru
│   ├── Auth - Validate Token.bru
│   ├── Auth - Invalid Token.bru
│   └── Auth - Missing Token.bru
├── environments/
│   ├── CNC URI.bru               # Generated (gitignored)
│   └── CNC URI.template.bru      # Template (committed)
├── collection.bru                # Collection config
└── bruno.json                    # Bruno config
```

## How It Works

1. **Setup Script** (`scripts/updateBrunoAuth.ts`):
   - Fetches a fresh nonce from the API
   - Creates and signs a SIWE (Sign-In With Ethereum) message
   - Updates the Bruno environment file with credentials

2. **Test Execution**:
   - Tests run in sequence (controlled by `seq` in meta)
   - Auth tests must run first to generate access tokens
   - Subsequent tests use the generated tokens

3. **Environment Variables**:
   - `host` - API base URL
   - `testAddress` - Test wallet address (Hardhat default account)
   - `nonce` - Fresh nonce from API
   - `siweMessage` - Signed SIWE message
   - `siweSignature` - Signature for authentication
   - `accessToken` - JWT token (set after successful login)

## Test Account

Uses Hardhat's default test account:

- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

## CI/CD Integration

For CI/CD pipelines:

```yaml
- name: Run Bruno Tests
  run: |
    npm start &  # Start server in background
    sleep 5      # Wait for server to start
    npm run test:bruno
```

## Troubleshooting

**Tests fail with 401 errors:**

- Make sure the backend server is running
- Run `npm run test:bruno:setup` to regenerate credentials

**Server not running error:**

- Start the backend: `npm start`
- Check if port 3000 is available

**Nonce expired:**

- Bruno credentials expire after some time
- Re-run the setup script or use `npm run test:bruno` (auto-regenerates)

## Adding New Tests

1. Create a new `.bru` file in the appropriate folder
2. Set the `seq` number to control execution order
3. Use environment variables: `{{host}}`, `{{accessToken}}`, etc.
4. Add test assertions using Bruno's test syntax

Example:

```javascript
tests {
  test("should return 200 status", function() {
    expect(res.getStatus()).to.equal(200);
  });
}
```

## Best Practices

For complex operations that cannot be performed directly in Bruno scripts (cryptographic operations, external API calls, etc.), see our [Best Practices Guide](./BEST_PRACTICES.md) which demonstrates the "Dev Endpoint Pattern" used in our SIWE authentication flow.
