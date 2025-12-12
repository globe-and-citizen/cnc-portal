# Serverless Wake-up Feature

**Version:** 1.0.0  
**Date:** December 11, 2025  
**Status:** Implemented  
**Branch:** feature/perf-prod

---

## Overview

Addresses cold start delays in Railway's serverless architecture by proactively waking backend services and database connections before user interactions.

**Problem:**

- Database sleeps → Migration failures during deployment
- Backend sleeps → 1-3s delays on first requests  
- Poor UX on critical actions (login, data loading)

**Solution:**
Multi-layered wake-up system ensures services are ready before users need them.

---

## Quick Start

### Backend Setup

**Railway Start Command:**

```bash
npm run db:wake && npm run prisma:generate && npm run prisma:migrate
```

**Health Check:**

```bash
curl https://your-backend.railway.app/api/health
```

### Frontend Setup

**App.vue automatically wakes backend on mount:**

```vue
<script setup>
import { useBackendWake } from '@/composables/useBackendWake'

// Wakes backend when app mounts/reloads
useBackendWake()
</script>
```

**Optional: Use in specific components:**

```vue
<script setup>
import { useBackendWake } from '@/composables/useBackendWake'

// Wakes backend when this component mounts
// (Shares cache with App.vue - won't duplicate requests)
useBackendWake()
</script>
```

---

## Architecture

### Components

1. **Database Wake Script** (`backend/scripts/wake-db.ts`)
   - Retry logic: 10 attempts, 3s intervals
   - Runs before migrations in CI/CD
   - Uses Prisma singleton pattern

2. **Health Endpoint** (`GET /api/health`)
   - Lightweight, no authentication required
   - No database queries (security)
   - < 50ms response when warm

3. **Frontend Wake Composable** (Both App & Dashboard)
   - **App**: `app/src/composables/useBackendWake.ts`
   - **Dashboard**: `dashboard/app/composables/useBackendWake.ts`
   - Uses TanStack Query for caching and retry logic
   - Wakes backend only on app mount/reload
   - 3-minute cache prevents redundant calls
   - Non-blocking with 5s timeout
   - No automatic polling or refetching

4. **App-Level Integration**
   - **App**: `app/src/App.vue` - Global wake on mount
   - **Dashboard**: `dashboard/app/app.vue` - Global wake on mount
   - Runs once per page load
   - Runs in background

### Data Flow

```md
User Opens App
     │
     ├─> App.vue: wakeBackend() [background]
     │         └─> GET /api/health → Backend wakes
     │
     ├─> Navigate to /login
     │         └─> Router: wakeBackend() [if needed]
     │
     └─> User clicks login → Backend already warm ✓
```

---

## Implementation Details

### Files Modified

**Backend:**

- `backend/scripts/wake-db.ts` - Database wake script
- `backend/src/controllers/healthController.ts` - Health controller
- `backend/src/routes/healthRoutes.ts` - Health routes
- `backend/src/config/serverConfig.ts` - Route registration
- `backend/package.json` - Added `db:wake` script
- `backend/tsconfig.json` - Include scripts directory

**Frontend:**

- `app/src/services/BackendWakeService.ts` - Wake service
- `app/src/composables/useBackendWake.ts` - Vue composable
- `app/src/App.vue` - Global wake on mount
- `app/src/router/index.ts` - Navigation guard

### Key Design Decisions

**TanStack Query Integration**

The wake-up system uses TanStack Query for:

- **Automatic caching**: Prevents redundant wake calls (3 min cache)
- **Retry logic**: 2 retries with 1s delay between attempts
- **Error handling**: Silent failures with debug logging
- **Memory management**: Automatic garbage collection (5 min)
- **No polling**: Manual wake on mount only, no auto-refetch

Benefits over plain fetch:

- Built-in request deduplication
- User reloads within 3 min → Uses cache, no HTTP call
- Better performance with shared state
- Consistent with existing app patterns

**Cache Strategy:**

- Fresh for 3 minutes (Railway keeps services warm ~5 min)
- User reloads page → Checks cache first
- Cache hit → Skip wake call (backend likely still warm)
- Cache miss → Wake backend, cache for next 3 min

**Why No Database Query in Health Check?**

The `/api/health` endpoint intentionally avoids database queries to prevent:

- Information disclosure (schema, table names)
- SQL injection attack surface
- Connection pool exhaustion

Database wake-up happens through:

- Deployment: `db:wake` script before migrations
- Runtime: First authenticated API request
- Railway: Automatic service dependency waking

**Non-Blocking Strategy**

All wake calls run in background without blocking page render:

```typescript
wakeBackend() // No await - optimization, not requirement
```

**Route Selection**

✅ **Include:** login, teams, dashboard (backend required)  
❌ **Exclude:** landing pages, static content (no backend)

---

## Best Practices

1. **Keep health lightweight** - No database, no complex logic
2. **Use composable** - Don't duplicate wake logic in components
3. **Silent failures** - It's optimization, not critical path
4. **Strategic routes** - Only wake when backend needed
5. **Monitor metrics** - Track cold starts in Railway dashboard

---

## Related Documentation

- [Platform Deployment](../../platform/deployment.md) - Full deployment guide
- [Platform Security](../../platform/security.md) - Security standards
- [Platform Performance](../../platform/performance.md) - Performance targets
- [Railway Docs](https://docs.railway.app/reference/deployment#serverless) - Serverless configuration

---

## Changelog

### v1.0.0 (December 11, 2025)

- ✅ Backend health endpoint
- ✅ Database wake script with retry
- ✅ Frontend wake service
- ✅ Vue composable
- ✅ Router navigation guard
- ✅ App-level integration

---

**Last Updated:** December 11, 2025  
**Document Owner:** Platform Team
