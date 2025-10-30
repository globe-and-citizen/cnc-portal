# Dev Controller Documentation

The Dev Controller provides development-only endpoints for generating SIWE (Sign-In with Ethereum) messages and signatures. These endpoints are only available when `NODE_ENV=development`.

## Endpoints

### Health Check

**GET** `/api/dev/health`

Returns the status of the dev controller.

**Response:**

```json
{
  "success": true,
  "message": "Dev controller is available",
  "environment": "development",
  "timestamp": "2025-10-30T07:03:21.510Z"
}
```

### Generate SIWE Signature

**POST** `/api/dev/generate-siwe-signature`

Generates a SIWE message and signature for testing purposes.

**Request Body:**

```json
{
  "messageParams": {
    "nonce": "32891756",
    "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "domain": "localhost",
    "chainId": 1337,
    "statement": "Optional statement",
    "uri": "http://localhost:3000"
  },
  "privateKey": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
}
```

**Required Fields:**

- `messageParams.nonce`: Random nonce string
- `messageParams.address`: Ethereum address (must match the private key)
- `messageParams.domain`: Domain name (e.g., "localhost")
- `messageParams.chainId`: Blockchain chain ID (e.g., 1337 for local)
- `privateKey`: Private key in hex format starting with "0x"

**Optional Fields:**

- `messageParams.statement`: Custom statement (defaults to MetaMask ToS)
- `messageParams.uri`: Custom URI (defaults to `http://{domain}`)

**Success Response:**

```json
{
  "success": true,
  "message": "localhost wants you to sign in with your Ethereum account:\n0x70997970C51812dc3A010C7d01b50e0d17dc79C8\n\nTest SIWE message for development\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1337\nNonce: 32891756\nIssued At: 2025-10-30T07:03:21.510Z",
  "signature": "0xae0e1f83aeb8de48c7ab9681eb3000f0c007400bde2ca1466d0fc38000e62c9c063280b44471e5ef386424e93b82bbfed0af0a9791bd6fe9dcdedd66f83a00161b",
  "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "nonce": "32891756",
  "issuedAt": "2025-10-30T07:03:21.510Z",
  "timestamp": "2025-10-30T07:03:21.510Z"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "timestamp": "2025-10-30T07:03:21.510Z"
}
```

## Usage Examples

### cURL Examples

**Health Check:**

```bash
curl -X GET http://localhost:3000/api/dev/health
```

**Generate SIWE Signature:**

```bash
curl -X POST http://localhost:3000/api/dev/generate-siwe-signature \
  -H "Content-Type: application/json" \
  -d '{
    "messageParams": {
      "nonce": "32891756",
      "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "domain": "localhost",
      "chainId": 1337,
      "statement": "Test SIWE message for development",
      "uri": "http://localhost:3000"
    },
    "privateKey": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  }'
```

### JavaScript Example

```javascript
const generateTestSignature = async () => {
  const response = await fetch('http://localhost:3000/api/dev/generate-siwe-signature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messageParams: {
        nonce: Math.floor(Math.random() * 1000000).toString(),
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        domain: 'localhost',
        chainId: 1337,
        statement: 'Test authentication',
        uri: 'http://localhost:3000'
      },
      privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
    })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('Generated SIWE message:', result.message);
    console.log('Signature:', result.signature);
    
    // Use the message and signature for testing authentication
    return {
      message: result.message,
      signature: result.signature
    };
  } else {
    console.error('Error generating signature:', result.error);
    throw new Error(result.error);
  }
};
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Development Only**: These endpoints are only available when `NODE_ENV=development`
2. **Never Use in Production**: The dev controller will return 403 errors in production
3. **Private Keys**: Never commit real private keys to version control
4. **Test Data Only**: Use only test accounts and test private keys
5. **Local Testing**: These endpoints should only be used for local development and testing

## Common Test Private Keys (Hardhat Default Accounts)

These are well-known test private keys from Hardhat's default accounts. **Never use these in production!**

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

## Integration with Bruno/API Testing

You can use this endpoint in your Bruno API tests to generate valid SIWE signatures for authentication testing:

1. First, generate a signature using the dev endpoint
2. Use the returned message and signature to test the `/api/auth/siwe` endpoint
3. Verify the authentication flow works correctly

This eliminates the need for manual signature generation during API testing.
