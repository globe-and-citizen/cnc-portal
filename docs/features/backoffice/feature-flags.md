# Feature Flags System

**Version:** 1.0.0  
**Date:** December 16, 2025  
**Status:** In Development

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

**Last Updated:** December 16, 2025
