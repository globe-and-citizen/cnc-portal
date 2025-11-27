# Authentication Flow - Sign-In with Ethereum (SIWE)

This document describes the authentication flow implemented in the CNC Portal Admin Dashboard using Sign-In with Ethereum (SIWE).

## Overview

The admin dashboard uses SIWE (Sign-In with Ethereum) to authenticate users. This method allows users to prove ownership of their Ethereum wallet without exposing their private keys, and it provides a secure, decentralized authentication mechanism.

## Prerequisites

- MetaMask or any Ethereum-compatible wallet browser extension
- Backend server running with SIWE authentication endpoints

## Authentication Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │     │    Backend      │     │    Wallet       │
│   (Frontend)    │     │    (API)        │     │  (MetaMask)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. User clicks       │                       │
         │     "Connect Wallet"  │                       │
         │───────────────────────┼──────────────────────>│
         │                       │                       │
         │  2. Wallet connection │                       │
         │     request           │                       │
         │<──────────────────────┼───────────────────────│
         │                       │                       │
         │  3. User approves     │                       │
         │     connection        │                       │
         │<──────────────────────┼───────────────────────│
         │                       │                       │
         │  4. Request nonce     │                       │
         │     GET /api/user/nonce/{address}             │
         │──────────────────────>│                       │
         │                       │                       │
         │  5. Return nonce      │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  6. Build SIWE message│                       │
         │     with nonce        │                       │
         │                       │                       │
         │  7. Request signature │                       │
         │───────────────────────┼──────────────────────>│
         │                       │                       │
         │  8. User signs message│                       │
         │<──────────────────────┼───────────────────────│
         │                       │                       │
         │  9. Send message + signature                  │
         │     POST /api/auth/siwe                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  10. Verify signature │                       │
         │      Generate JWT     │                       │
         │                       │                       │
         │  11. Return JWT token │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  12. Store token      │                       │
         │      Redirect to      │                       │
         │      dashboard        │                       │
         │                       │                       │
```

## Step-by-Step Process

### 1. Wallet Connection

The user clicks "Connect Wallet" button on the login page. The dashboard uses wagmi to handle wallet connections with the injected connector (MetaMask).

```typescript
const { connect, connectors } = useConnect()
const injectedConnector = connectors.value.find(c => c.id === 'injected')
await connect({ connector: injectedConnector })
```

### 2. Nonce Retrieval

After wallet connection, the dashboard requests a nonce from the backend. The nonce is a unique random string that prevents replay attacks.

**Endpoint:** `GET /api/user/nonce/{address}`

**Response:**
```json
{
  "success": true,
  "nonce": "A8fK2jH9mN3pQ5rT"
}
```

### 3. SIWE Message Construction

The dashboard constructs a SIWE message following the EIP-4361 specification:

```typescript
const siweMessage = new SiweMessage({
  address: userAddress,
  statement: 'Sign in to CNC Portal Admin Dashboard with Ethereum.',
  nonce: nonce,
  chainId: chainId,
  uri: window.location.origin,
  domain: window.location.host,
  version: '1'
})
const messageToSign = siweMessage.prepareMessage()
```

**Example Message:**
```
localhost:3001 wants you to sign in with your Ethereum account:
0x1234567890123456789012345678901234567890

Sign in to CNC Portal Admin Dashboard with Ethereum.

URI: http://localhost:3001
Version: 1
Chain ID: 1
Nonce: A8fK2jH9mN3pQ5rT
Issued At: 2024-01-15T10:30:00.000Z
```

### 4. Message Signing

The user is prompted to sign the message with their wallet. This proves they own the address without sharing their private key.

```typescript
const signature = await signMessageAsync({ message: messageToSign })
```

### 5. Backend Verification

The signed message and signature are sent to the backend for verification.

**Endpoint:** `POST /api/auth/siwe`

**Request Body:**
```json
{
  "message": "localhost:3001 wants you to sign in...",
  "signature": "0x1234...abcd"
}
```

**Response (Success):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 6. Token Storage

Upon successful authentication, the JWT token is stored in localStorage:

```typescript
authStore.setAuth(token, address)
// Stored as:
// - dashboard-auth-token: JWT token
// - dashboard-auth-address: User's Ethereum address
```

## Token Validation

To validate an existing token, the dashboard can call:

**Endpoint:** `GET /api/auth/token`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (Valid):** `200 OK`
**Response (Invalid):** `401 Unauthorized`

## Logout Process

When logging out:

1. Clear authentication data from localStorage
2. Disconnect wallet
3. Redirect to login page

```typescript
const signOut = () => {
  authStore.clearAuth()
  disconnect()
}
```

## Security Considerations

1. **Nonce-based Protection:** Each authentication attempt requires a fresh nonce from the backend, preventing replay attacks.

2. **Message Signing:** Only the wallet owner can produce a valid signature for the SIWE message.

3. **JWT Expiration:** Tokens expire after 24 hours, requiring re-authentication.

4. **No Private Keys:** The user's private key never leaves their wallet; only signatures are transmitted.

5. **Domain Binding:** The SIWE message includes the domain, preventing phishing attacks.

## Environment Configuration

The dashboard requires the following environment variable:

```env
NUXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

## Files Reference

- `app/composables/useSiwe.ts` - SIWE authentication logic
- `app/stores/useAuthStore.ts` - Authentication state management
- `app/middleware/auth.global.ts` - Route protection middleware
- `app/pages/login.vue` - Login page UI
- `app/plugins/wagmi.client.ts` - Wagmi/Web3 configuration

## Backend Integration

The dashboard integrates with the existing backend SIWE endpoints:

- `GET /api/user/nonce/{address}` - Get nonce for user
- `POST /api/auth/siwe` - Authenticate with SIWE message and signature
- `GET /api/auth/token` - Validate JWT token

No backend modifications are required as the SIWE authentication flow is already implemented.
