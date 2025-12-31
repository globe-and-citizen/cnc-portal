# Role-Based Access Control (RBAC)

**Status:** ✅ Implemented | **Version:** 1.0.0

---

## 🎯 Roles

| Role | Level | Permissions |
|------|-------|-------------|
| `ROLE_USER` | 1 (default) | Basic platform access |
| `ROLE_ADMIN` | 2 | Admin dashboard, reports |
| `ROLE_SUPER_ADMIN` | 3 | Full system access |

**Hierarchy:** SUPER_ADMIN → ADMIN → USER (each inherits from lower level)

---

## 🏗️ Architecture

**Database:**

```prisma
model User {
  address String    @id @unique
  roles   String[]  @default(["ROLE_USER"])
}
```

**Request Flow:** JWT → `authorizeUser` → `requireAdmin` → Handler

---

## 💻 Backend

### Protect Routes

```typescript
import { authorizeUser } from '../middleware/authMiddleware'
import { requireAdmin } from '../middleware/roleMiddleware'

router.get('/admin/stats', authorizeUser, requireAdmin, controller)
```

### Check Roles

```typescript
import { hasRole, isAdmin, isSuperAdmin } from '../utils/roleUtils'

if (hasRole(req.roles, UserRole.ROLE_ADMIN)) { /* ... */ }
if (isAdmin(req.roles)) { /* ... */ }
```

### Multiple Roles

```typescript
import { requireAnyRole } from '../middleware/roleMiddleware'

router.post('/sensitive', authorizeUser, requireAnyRole([ROLE_ADMIN, ROLE_SUPER_ADMIN]), controller)
```

---

## 🎨 Frontend

### Check Roles in Component

```typescript
import { useRoleStore } from '~/stores/useRoleStore'

const roleStore = useRoleStore()

if (roleStore.isAdmin) { /* show admin UI */ }
if (roleStore.isSuperAdmin) { /* show super admin UI */ }
```

### Conditional Rendering

```vue
<template>
  <AdminPanel v-if="roleStore.isAdmin" />
  <UserPanel v-else />
</template>

<script setup>
const roleStore = useRoleStore()
</script>
```

### Role Store Methods

```typescript
roleStore.isAdmin                      // boolean
roleStore.isSuperAdmin                 // boolean
roleStore.hasRole(role)                // boolean
roleStore.hasAnyRole([roles])          // boolean
roleStore.highestRole                  // string
```

---

## 📂 Files

**Backend:**

- `backend/src/types/roles.ts` - Role definitions
- `backend/src/utils/roleUtils.ts` - Checking functions
- `backend/src/middleware/roleMiddleware.ts` - Route protection
- `backend/src/middleware/authMiddleware.ts` - JWT extraction (UPDATED)
- `backend/src/controllers/authController.ts` - JWT creation (UPDATED)
- `backend/prisma/schema.prisma` - User model (UPDATED)

**Frontend:**

- `dashboard/app/stores/useRoleStore.ts` - Role composable
- `dashboard/app/stores/useAuthStore.ts` - Auth with roles (UPDATED)
- `dashboard/app/pages/access-denied.vue` - Access denied page
- `dashboard/app/layouts/default.vue` - Dashboard protection (UPDATED)

---

## 🔒 Security

✅ Backend always enforces access control  
✅ Roles in signed JWT tokens  
✅ Frontend checks for UX only  
✅ Use HTTPS in production  
✅ Tokens expire after 24 hours  

❌ Don't rely on frontend checks for security  
❌ Don't allow users to set own roles  
❌ Don't skip `authorizeUser` middleware  

---

## ⚡ Quick Setup

### 1. Migrate Database

```bash
cd backend
npx prisma migrate dev --name add_user_roles
```

### 2. Assign Admin Roles

```sql
UPDATE "User" SET roles = ARRAY['ROLE_ADMIN', 'ROLE_USER']
WHERE address = '0x...';
```

### 3. Protect Routes

Add `authorizeUser, requireAdmin` to sensitive endpoints

### 4. Test

- Non-admin user → GET /admin/stats → 403 Forbidden
- Admin user → GET /admin/stats → 200 OK

---

## 📊 Permissions Matrix

| | User | Admin | Super Admin |
|---|:---:|:---:|:---:|
| Access Platform | ✅ | ✅ | ✅ |
| View Dashboard | ❌ | ✅ | ✅ |
| View All Users | ❌ | ✅ | ✅ |
| Assign Roles | ❌ | ❌ | ✅ |
| System Config | ❌ | ❌ | ✅ |

---

## 🐛 Troubleshooting

**User can't access admin endpoint:**

1. Check database: `SELECT roles FROM "User" WHERE address = '0x...';`
2. Decode JWT at jwt.io - verify `roles` field
3. Check middleware order: `authorizeUser` before `requireAdmin`

**Frontend not showing admin panel:**

1. Clear localStorage: `localStorage.clear()`
2. Refresh and re-login
3. Check console for errors

**JWT missing roles:**

1. Verify authController includes roles in token
2. Check authMiddleware extracts roles from JWT
3. Check database has roles for user
