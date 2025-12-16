# Feature Flags System

**Version:** 1.0.0  
**Date:** December 16, 2025  
**Status:** In Development  
**Part of:** [Backoffice Feature Management](./README.md)

---

## Table of Contents

- [Overview](#overview)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Backend Implementation](#backend-implementation)
- [Frontend Usage](#frontend-usage)
- [Migration Guide](#migration-guide)

---

## Overview

The Feature Flags system enables dynamic feature toggling at runtime without code deployments. Features can be controlled globally or overridden per team for granular access control.

**Key Benefits:**

- �� Enable/disable features without deployment
- 🔐 Granular team-level control  
- 🧪 Beta testing with specific teams
- 🚀 Gradual feature rollouts
- ⚡ Instant feature activation/deactivation

---

## Database Schema

### GlobalSetting Model

```prisma
model GlobalSetting {
  id                    Int                    @id @default(autoincrement())
  functionName          String                 @unique
  status                String
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt
  teamFunctionOverrides TeamFunctionOverride[]
}
```

### TeamFunctionOverride Model

```prisma
model TeamFunctionOverride {
  id            Int           @id @default(autoincrement())
  teamId        Int
  team          Team          @relation(fields: [teamId], references: [id])
  functionName  String
  globalSetting GlobalSetting @relation(fields: [functionName], references: [functionName])
  status        String
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@unique([teamId, functionName])
  @@index([teamId])
}
```

### Feature Status Values

```typescript
type FeatureStatus = 'enabled' | 'disabled' | 'beta' | 'deprecated' | 'maintenance'
```

---

## API Endpoints

### Admin Endpoints

#### List All Features

```http
GET /api/admin/features
Authorization: Bearer <admin_token>
```

#### Get Feature

```http
GET /api/admin/features/:functionName
```

#### Create Feature

```http
POST /api/admin/features
Content-Type: application/json

{
  "functionName": "NEW_FEATURE",
  "status": "disabled"
}
```

#### Update Feature

```http
PUT /api/admin/features/:functionName
Content-Type: application/json

{
  "status": "enabled"
}
```

#### Delete Feature

```http
DELETE /api/admin/features/:functionName
```

### Team Override Endpoints

#### Create Team Override

```http
POST /api/admin/features/:functionName/teams/:teamId
Content-Type: application/json

{
  "status": "enabled"
}
```

#### Update Team Override

```http
PUT /api/admin/features/:functionName/teams/:teamId
Content-Type: application/json
{
  "status": "beta"
}
```

#### Delete Team Override

```http
DELETE /api/admin/features/:functionName/teams/:teamId
```

### Public Endpoint

#### Check Feature

```http
GET /api/features/check/:functionName?teamId=5
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "enabled": true,
  "reason": "team_override"
}
```

---

## Backend Implementation

### Utility Functions

```typescript
// backend/src/utils/featureFlags.ts
export async function isFeatureEnabledForTeam(
  functionName: string,
  teamId: number
): Promise<boolean> {
  const override = await prisma.teamFunctionOverride.findUnique({
    where: { unique_team_function: { teamId, functionName } }
  })

  if (override) {
    return ['enabled', 'beta'].includes(override.status)
  }

  return isFeatureEnabledGlobally(functionName)
}
```

---

## Frontend Usage

```typescript
import { useFeatureFlag } from '@/composables/useFeatureFlag'

const { isEnabled } = useFeatureFlag('NEW_DASHBOARD')
```

```vue
<template>
  <DashboardV2 v-if="isEnabled" />
  <DashboardV1 v-else />
</template>
```

---

## Migration Guide

### 1. Update Database Schema

Add the feature flag models to `backend/prisma/schema.prisma`:

```bash
cd backend
npx prisma format
npx prisma migrate dev --name add_feature_flags
npx prisma generate
```

### 2. Seed Initial Features

Create `backend/prisma/seeds/featureFlags.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedFeatureFlags() {
  const features = [
    {
      functionName: 'NEW_DASHBOARD',
      status: 'beta',
      isGloballyRestricted: true
    },
    {
      functionName: 'CLAIM_SUBMISSION',
      status: 'enabled',
      isGloballyRestricted: false
    }
  ]

  for (const feature of features) {
    await prisma.globalSetting.upsert({
      where: { functionName: feature.functionName },
      update: feature,
      create: feature
    })
  }

  console.log('✅ Feature flags seeded')
}
```

### 3. Run Migrations

```bash
cd backend
npm run prisma:migrate
npm run prisma:seed
```

### 4. Create Backend Utils

Implement `backend/src/utils/featureFlags.ts` with the utility functions shown above.

### 5. Create Controllers

Implement `backend/src/controllers/featureFlagController.ts` with CRUD operations.

### 6. Add Routes

Create `backend/src/routes/featureFlagRoutes.ts`:

```typescript
import express from 'express'
import * as controller from '../controllers/featureFlagController'
import { authenticateAdmin } from '../middleware/auth'

const router = express.Router()

// Admin routes
router.get('/admin/features', authenticateAdmin, controller.getAllFeatures)
router.post('/admin/features', authenticateAdmin, controller.createFeature)
router.get('/admin/features/:functionName', authenticateAdmin, controller.getFeature)
router.put('/admin/features/:functionName', authenticateAdmin, controller.updateFeature)
router.delete('/admin/features/:functionName', authenticateAdmin, controller.deleteFeature)

// Public route
router.get('/features/check/:functionName', controller.checkFeatureAccess)

export default router
```

### 7. Frontend Integration

Create the composable as shown in the Frontend Usage section.

---

## Testing

### Backend Tests

```typescript
describe('Feature Flags', () => {
  it('should check global feature', async () => {
    const enabled = await isFeatureEnabledGlobally('NEW_DASHBOARD')
    expect(enabled).toBe(false) // Globally restricted
  })

  it('should respect team override', async () => {
    // Create override
    await prisma.teamFunctionOverride.create({
      data: {
        teamId: 5,
        functionName: 'NEW_DASHBOARD',
        status: 'enabled'
      }
    })

    const enabled = await isFeatureEnabledForTeam('NEW_DASHBOARD', 5)
    expect(enabled).toBe(true)
  })
})
```

### Frontend Tests

```typescript
import { mount } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

describe('useFeatureFlag', () => {
  it('should check feature flag', async () => {
    const queryClient = new QueryClient()
    
    const TestComponent = {
      setup() {
        const { isEnabled } = useFeatureFlag('NEW_DASHBOARD')
        return { isEnabled }
      },
      template: '<div>{{ isEnabled }}</div>'
    }

    const wrapper = mount(TestComponent, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient }]]
      }
    })

    await flushPromises()
    expect(wrapper.vm.isEnabled).toBe(true)
  })
})
```

---

## Common Feature Names

Use SCREAMING_SNAKE_CASE for feature names:

```typescript
// Dashboard & UI
NEW_DASHBOARD
STATS_DASHBOARD
ADVANCED_ANALYTICS
EXPERIMENTAL_UI

// Team Features
TEAM_CREATION
TEAM_DELETION
TEAM_SETTINGS
TEAM_TRANSFER

// Claim Features
CLAIM_SUBMISSION
WEEKLY_CLAIMS
CLAIM_APPROVAL
CLAIM_BULK_EDIT

// Wage Features
WAGE_MANAGEMENT
CASH_REMUNERATION
WAGE_HISTORY

// Admin Features
ADMIN_PANEL
USER_MANAGEMENT
AUDIT_LOGS
FEATURE_FLAGS_UI

// Beta/Experimental
BETA_FEATURE_X
EXPERIMENTAL_CHARTS
NEW_NOTIFICATION_SYSTEM
```

---

## Best Practices

### Naming Conventions

✅ **Good:**

- `NEW_DASHBOARD` - Clear, descriptive
- `CLAIM_BULK_EDIT` - Specific action
- `BETA_ANALYTICS_V2` - Version indicated

❌ **Bad:**

- `feature1` - Not descriptive
- `newFeature` - Use SCREAMING_SNAKE_CASE
- `dashboard` - Too generic

### Feature Lifecycle

1. **Creation**: Start with `disabled` status, `isGloballyRestricted: true`
2. **Beta Testing**: Change to `beta`, enable for specific teams
3. **Rollout**: Change to `enabled`, set `isGloballyRestricted: false`
4. **Deprecation**: Change to `deprecated`, gradually disable
5. **Removal**: Delete flag and remove code references

### Security

- ✅ Always authenticate admin endpoints
- ✅ Validate team ownership for overrides
- ✅ Cache feature checks (5 minutes)
- ✅ Log all admin actions
- ✅ Rate limit admin endpoints
- ❌ Never expose admin endpoints publicly
- ❌ Never cache sensitive feature checks client-side

---

## Troubleshooting

### Feature not working after enabling

1. Check cache expiration (5 min default)
2. Verify `isGloballyRestricted` is `false` for global access
3. Check team override if using team-specific features
4. Clear browser cache / hard refresh

### Team override not working

1. Verify team ID is correct
2. Check unique constraint on `[teamId, functionName]`
3. Ensure override status is `enabled` or `beta`
4. Check if global setting exists

### Performance issues

1. Increase cache time for stable features
2. Batch feature checks where possible
3. Use server-side caching (Redis)
4. Preload common features on app init

---

## Related Documentation

- [Backoffice Overview](./README.md) - Main backoffice documentation
- [API Documentation](../../api/README.md) - General API reference
- [Security Standards](../../platform/security.md) - Security guidelines

---

**Last Updated:** December 16, 2025  
**Document Owner:** Platform Team
