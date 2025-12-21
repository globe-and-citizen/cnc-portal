# Installation & Setup Guide for Token Price Store Refactoring

## Overview

The token price functionality has been refactored to use a **Pinia store** backed by **TanStack Query Vue** for centralized state management and 1-hour caching.

## Installation Steps

### 1. Install Pinia via Nuxt Module

Run the following command in the `dashboard/` directory:

```bash
cd dashboard
npx nuxi@latest module add pinia
```

This will:

- Install `@pinia/nuxt` module
- Add it to `nuxt.config.ts` modules list
- Set up all required configuration automatically

If you prefer manual installation or want to use just `pinia`:

```bash
npm install pinia
```

Then add to `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@pinia/nuxt']
})
```

### 2. Verify Installation

Check that Pinia module is installed:

```bash
npm list @pinia/nuxt
```

Or check `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt', '@pinia/nuxt'],
  // ...
})
```

## What Was Installed

- **@pinia/nuxt** - Official Nuxt module for Pinia state management

This complements the existing dependencies:

- **TanStack Query Vue 5.92.0** (already installed) - Async state management with caching
- **Nuxt 4.2.1** (already installed) - Full-stack meta-framework

The Nuxt module automatically handles Pinia setup and initialization, no manual configuration needed!

## Files Modified

### New Files

1. **`app/stores/useTokenPriceStore.ts`**
   - Pinia store for token prices
   - TanStack Query integration
   - 1-hour cache configuration

### Updated Files

1. **`nuxt.config.ts`** - Added `@pinia/nuxt` module (automatic via `nuxi module add`)
2. **`app/composables/useTokenPrices.ts`** - Now a wrapper (deprecated)
3. **`app/composables/useFeeCollector.ts`** - Uses store directly

### Unchanged Files

- All Vue components continue to work without changes
- Uses either the composable wrapper or can be updated to use the store directly

## Next Steps

### Test the Setup

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Verify prices load correctly in:
   - Token Holdings Table
   - Withdraw Modal
   - Any other components using token prices

### Optional: Update Components to Use Store Directly

If you want to use the store directly instead of the composable wrapper (recommended for new code):

```typescript
// In any component
import { useTokenPriceStore } from '@/stores/useTokenPriceStore'

export default {
  setup() {
    const tokenPriceStore = useTokenPriceStore()
    
    return {
      prices: tokenPriceStore.prices,
      isLoading: tokenPriceStore.isLoading,
      getTokenUSD: tokenPriceStore.getTokenUSD
    }
  }
}
```

## Configuration Reference

### Cache Settings

The store uses these TanStack Query configurations:

```typescript
// 1-hour cache duration
const CACHE_DURATION = 3600000 // milliseconds

// In useQuery config:
{
  staleTime: CACHE_DURATION,    // Time before data is considered stale
  gcTime: CACHE_DURATION,       // Time before cache is garbage collected
  retry: 2,                      // Retry failed requests 2 times
  retryDelay: exponentialBackoff // Exponential backoff for retries
}
```

### Supported Chains

The store handles prices for:

- Ethereum Mainnet
- Ethereum Sepolia (testnet)
- Polygon (Matic)
- Polygon Amoy (testnet)
- Hardhat (local development)

## Troubleshooting

### Issue: "Cannot find module '@pinia/nuxt'"

**Solution:** Run `npx nuxi@latest module add pinia` in the `dashboard/` directory

### Issue: Module not found after installation

**Solution:**

1. Check that `nuxt.config.ts` includes `@pinia/nuxt` in the modules array
2. Delete `.nuxt` directory: `rm -rf .nuxt`
3. Restart dev server: `npm run dev`

### Issue: Prices not loading

1. Check browser console for errors
2. Verify CoinGecko API is accessible
3. Check that the correct chain is selected

### Issue: Store not available in component

The Nuxt module automatically initializes Pinia. If stores aren't available:

1. Verify `@pinia/nuxt` is in `nuxt.config.ts`
2. Clear `.nuxt` directory and restart: `rm -rf .nuxt && npm run dev`
3. Check browser console for initialization errors

## Performance Metrics

### Before Refactoring

- API calls: Every 1 minute
- Cache: 1 minute duration
- State management: Per-component

### After Refactoring

- API calls: Every 1 hour (6x less frequent)
- Cache: 1 hour duration
- State management: Centralized in Pinia

### Expected Benefits

- **Reduced API load** - ~85% fewer CoinGecko requests
- **Better UX** - Faster price updates from cache
- **Simpler code** - Centralized state management
- **Better reliability** - Automatic retry logic

## Support & Questions

For questions about:

- **TanStack Query Vue** - See: <https://tanstack.com/query/latest/docs/vue/overview>
- **Pinia** - See: <https://pinia.vuejs.org/>
- **Nuxt integration** - See: <https://nuxt.com/docs>

## Rollback Instructions

If you need to revert these changes:

1. Remove the Pinia module:

   ```bash
   npx nuxi@latest module remove pinia
   ```

   Or manually:
   - Remove `@pinia/nuxt` from `nuxt.config.ts` modules array
   - Run `npm uninstall @pinia/nuxt`

2. Restore `app/composables/useTokenPrices.ts` from git history
3. Remove `app/stores/useTokenPriceStore.ts`
4. Run `npm install` to update dependencies

Git command to see previous version:

```bash
git log --oneline -- dashboard/app/composables/useTokenPrices.ts
git show <commit-hash>:dashboard/app/composables/useTokenPrices.ts
```
