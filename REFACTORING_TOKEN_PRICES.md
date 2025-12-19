# Token Price Store Refactoring

## Overview

The token price functionality has been refactored from a simple composable with manual caching to a **Pinia store** backed by **TanStack Query Vue** with a **1-hour cache duration**.

## What Changed

### Before

- Manual caching with `pricesCache` variable in composable
- 1-minute cache duration
- Individual component-level state management
- Manual fetch triggers on chain changes

### After

- **TanStack Query Vue** handles all caching automatically
- **1-hour cache duration** (3,600,000ms) - more efficient
- **Centralized Pinia store** for global state management
- **Automatic cache invalidation** when chain changes
- Built-in error handling and retry logic
- **Configurable stale time and garbage collection**

## Files Changed

### New Files

- **`dashboard/app/stores/useTokenPriceStore.ts`** - Main Pinia store with TanStack Query

### Updated Files

- **`dashboard/app/composables/useTokenPrices.ts`** - Now a wrapper for backwards compatibility (marked as deprecated)
- **`dashboard/app/composables/useFeeCollector.ts`** - Now uses `useTokenPriceStore` directly

### Unchanged Files

- **`dashboard/app/components/sections/FeeCollectorView/TokenHoldingsTable.vue`** - Still works via composable wrapper
- **`dashboard/app/components/sections/FeeCollectorView/WithdrawModal.vue`** - Still works via composable wrapper

## Architecture

```
┌─────────────────────────────────────────┐
│  Components & Composables               │
│  (TokenHoldingsTable, WithdrawModal)    │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼─────────┐    ┌─────▼──────────┐
   │   (Deprecated)  │    │  Recommended    │
   │  useTokenPrices │    │ useTokenPrice   │
   │   (Composable)  │    │   Store         │
   └────┬─────────┘    └─────┬──────────┘
        │                     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  TanStack Query Vue  │
        │  (1-hour caching)    │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │   CoinGecko API     │
        │  (Token Prices)     │
        └─────────────────────┘
```

## TanStack Query Features Used

The store leverages TanStack Query Vue for:

1. **Automatic Caching** - Caches prices for 1 hour (`staleTime`)
2. **Garbage Collection** - Removes unused cache after 1 hour (`gcTime`)
3. **Automatic Retry** - Retries failed requests up to 2 times with exponential backoff
4. **Cache Invalidation** - Automatically refetches when chain changes
5. **Loading States** - Built-in `isLoading` computed ref
6. **Error Handling** - Built-in `error` computed ref for error messages

## Configuration Details

```typescript
// TanStack Query Configuration
{
  queryKey: ['tokenPrices', currentChainId],  // Unique key per chain
  queryFn: fetchTokenPrices,                   // API fetch function
  staleTime: CACHE_DURATION,                   // 1 hour - when to refetch
  gcTime: CACHE_DURATION,                      // 1 hour - when to remove from cache
  retry: 2,                                    // Retry failed requests 2 times
  retryDelay: exponentialBackoff               // Increasing delay between retries
}
```

## Migration Path

### For New Code

Use the store directly:

```typescript
import { useTokenPriceStore } from '@/stores/useTokenPriceStore'

export const MyComposable = () => {
  const tokenPriceStore = useTokenPriceStore()
  return {
    getTokenUSD: tokenPriceStore.getTokenUSD,
    prices: tokenPriceStore.prices,
    isLoading: tokenPriceStore.isLoading
  }
}
```

### For Existing Code

The composable still works (backwards compatible):

```typescript
import { useTokenPrices } from '@/composables/useTokenPrices'

const { getTokenUSD, prices, isLoading } = useTokenPrices()
```

## Deprecation Notice

**`useTokenPrices()` composable is deprecated** and will be removed in a future version.

**New code should use `useTokenPriceStore()` directly from Pinia store.**

The composable wrapper remains for backwards compatibility only.

## API Reference

### Store API (`useTokenPriceStore()`)

```typescript
const store = useTokenPriceStore()

// Computed refs (reactive)
store.prices              // TokenPrices object with all token prices
store.isLoading           // boolean - loading state
store.error               // Error | null - error object if fetch failed
store.nativeSymbol        // string - native token symbol

// Methods
store.getCoinGeckoId()                    // Get CoinGecko ID for current chain
store.getTokenPrice(token)                // Get price for specific token
store.getTokenUSD(token, amount)          // Get formatted USD value
store.getTokenUSDValue(token, amount)     // Get raw USD value (number)
store.refetch()                           // Manual refetch
```

## Benefits

1. **Better Performance** - 1-hour caching reduces API calls by ~60x
2. **Centralized State** - Single source of truth for all token prices
3. **Automatic Invalidation** - Chain changes automatically trigger refetch
4. **Resilience** - Built-in retry logic handles network errors
5. **Type Safety** - Full TypeScript support
6. **Easy Testing** - Pinia store is easier to mock and test

## Chain Support

The store handles all configured chains:

- Mainnet (Ethereum)
- Sepolia (Ethereum testnet)
- Polygon
- Polygon Amoy (Polygon testnet)
- Hardhat (Local development)

Cache is maintained per-chain, so switching networks won't cause stale price data.

## Future Improvements

1. **WebSocket Updates** - Real-time price updates instead of polling
2. **Local Storage Persistence** - Persist cache across page refreshes
3. **GraphQL Integration** - Use TheGraph for more reliable price data
4. **Price History** - Track price changes over time
5. **Price Alerts** - Notify users when prices cross thresholds
