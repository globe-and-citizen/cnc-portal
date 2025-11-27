# Dashboard Authentication Flow - Sign-In with Ethereum (SIWE)

This document describes the authentication flow implemented in the CNC Portal Admin Dashboard using Sign-In with Ethereum (SIWE).

For detailed documentation, see [Dashboard Authentication Flow](../dashboard/docs/authentication-flow.md).

## Quick Overview

The admin dashboard uses SIWE (Sign-In with Ethereum) to authenticate users. This method allows users to prove ownership of their Ethereum wallet without exposing their private keys.

## Authentication Flow

1. **Connect Wallet** - User connects their Ethereum wallet (MetaMask, etc.)
2. **Get Nonce** - Dashboard fetches a unique nonce from the backend
3. **Create SIWE Message** - Dashboard constructs a SIWE message with the nonce
4. **Sign Message** - User signs the message with their wallet
5. **Verify & Get JWT** - Backend verifies the signature and returns a JWT token
6. **Store Token** - Dashboard stores the token for authenticated requests

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/nonce/{address}` | GET | Get nonce for user |
| `/api/auth/siwe` | POST | Authenticate with SIWE message and signature |
| `/api/auth/token` | GET | Validate JWT token |

## Environment Configuration

```env
NUXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

## Key Files

- `dashboard/app/composables/useSiwe.ts` - SIWE authentication logic
- `dashboard/app/stores/useAuthStore.ts` - Authentication state management
- `dashboard/app/middleware/auth.global.ts` - Route protection middleware
- `dashboard/app/pages/login.vue` - Login page UI
