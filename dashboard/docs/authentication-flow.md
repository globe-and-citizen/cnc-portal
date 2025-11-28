# Authentication Flow - Sign-In with Ethereum (SIWE)

This document describes the authentication flow implemented in the CNC Portal Admin Dashboard using Sign-In with Ethereum (SIWE).

> **📚 Full Documentation:** For comprehensive authentication documentation covering the entire CNC Portal platform (Backend, App, and Dashboard), see the [Authentication Documentation](/docs/auth/README.md).

## Overview

The admin dashboard uses SIWE (Sign-In with Ethereum) to authenticate users. This method allows users to prove ownership of their Ethereum wallet without exposing their private keys, and it provides a secure, decentralized authentication mechanism.

## Prerequisites

- MetaMask or any Ethereum-compatible wallet browser extension
- Backend server running with SIWE authentication endpoints

## Quick Reference

### Authentication Flow

1. **Connect Wallet** - User connects their Ethereum wallet (MetaMask, etc.)
2. **Get Nonce** - Dashboard fetches a unique nonce from the backend
3. **Create SIWE Message** - Dashboard constructs a SIWE message with the nonce
4. **Sign Message** - User signs the message with their wallet
5. **Verify & Get JWT** - Backend verifies the signature and returns a JWT token
6. **Store Token** - Dashboard stores the token for authenticated requests

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/nonce/{address}` | GET | Get nonce for user |
| `/api/auth/siwe` | POST | Authenticate with SIWE message and signature |
| `/api/auth/token` | GET | Validate JWT token |

### Key Files

| File | Description |
|------|-------------|
| `app/composables/useSiwe.ts` | SIWE authentication logic |
| `app/stores/useAuthStore.ts` | Authentication state management |
| `app/middleware/auth.global.ts` | Route protection middleware |
| `app/pages/login.vue` | Login page UI |
| `app/plugins/wagmi.client.ts` | Wagmi/Web3 configuration |

### Environment Configuration

```env
NUXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

## Detailed Documentation

For in-depth implementation details, see:
- [Full Authentication Documentation](/docs/auth/README.md)
- [Dashboard-specific Authentication](/docs/auth/dashboard-authentication.md)
