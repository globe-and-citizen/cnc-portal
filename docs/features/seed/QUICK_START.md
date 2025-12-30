# Database Seed - Quick Start Guide

**Status:** ✅ Production Ready  
**Last Updated:** December 30, 2025

---

## Quick Commands

```bash
# Development environment (10 users, 5 teams)
npm run seed:dev

# Test environment (3 users, 2 teams, Hardhat addresses)
npm run seed:test

# Staging environment (50 users, 20 teams)
npm run seed:staging

# Production - seed database only (explicit flag required)
SEED_DATABASE=true NODE_ENV=production npx prisma db seed

# Production - assign admin roles (recommended for production)
SEED_ADMINS=true \
ADMIN_ADDRESSES="0xaddress1,0xaddress2" \
ADMIN_ROLES="ROLE_ADMIN,ROLE_SUPER_ADMIN" \
NODE_ENV=production npx prisma db seed

# Production - both database and admins
SEED_DATABASE=true \
SEED_ADMINS=true \
ADMIN_ADDRESSES="0xaddress1" \
ADMIN_ROLES="ROLE_SUPER_ADMIN" \
NODE_ENV=production npx prisma db seed

# Clear data and reseed (dev/test/staging only)
CLEAR_DATA=true npm run seed:dev

# Full database reset
npm run seed:reset
```

---

## What Gets Seeded?

| Entity | Test | Dev | Staging |
|--------|------|-----|---------|
| Users | 3 | 10 | 50 |
| Teams | 2 | 5 | 20 |
| Wages | 8 | 45 | 200+ |
| Weekly Claims | 13 | 110 | 400+ |
| Claims | 41 | 471 | 2800+ |
| Expenses | 4 | 15 | 100 |
| Contracts | 4 | 10 | 60 |
| Board Actions | 6 | 20 | 100 |
| Notifications | 8 | 50 | 500 |

---

## Configuration Variables

### Standard Seeding

- `NODE_ENV` - Environment (development/test/staging/production)
- `CLEAR_DATA` - Clear database before seeding (default: false, blocked in production)
- `SEED_DATABASE` - Seed all database entities (default: false)
- `SEED_ADMINS` - Seed admin roles to addresses (default: false)

### Admin Provisioning

- `ADMIN_ADDRESSES` - Comma-separated Ethereum addresses (required if SEED_ADMINS=true)
- `ADMIN_ROLES` - Comma-separated role names (required if SEED_ADMINS=true)
  - Valid values: `ROLE_ADMIN`, `ROLE_SUPER_ADMIN`

**Example with multiple admins:**

```bash
SEED_ADMINS=true \
ADMIN_ADDRESSES="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb,0x1234567890123456789012345678901234567890" \
ADMIN_ROLES="ROLE_SUPER_ADMIN,ROLE_ADMIN" \
NODE_ENV=production npx prisma db seed
```

---

## Environment Detection

The seed automatically detects your environment from `NODE_ENV`:

```bash
# Defaults to development if NODE_ENV not set
npm run seed

# Explicitly set environment
NODE_ENV=test npm run seed
NODE_ENV=staging npm run seed
NODE_ENV=production npx prisma db seed
```

**Production Restrictions:**

- ❌ Cannot use `CLEAR_DATA=true` (prevents data loss)
- ⚠️ Must set at least one of: `SEED_DATABASE=true` or `SEED_ADMINS=true`
- ✅ All other operations allowed with explicit flags## Data Characteristics

### Test Environment

- **3 users** with Hardhat local blockchain addresses
- **Deterministic data** for predictable testing
- **Minimal records** for fast execution (~0.1s)
- **Named simply**: "User 1", "Team 1"

### Development Environment

- **10 users** with realistic names (Faker.js)
- **5 teams** with varied memberships
- **Realistic data** for UI/UX development
- **Fast execution** (~0.27s)

### Staging Environment

- **50 users** with realistic profiles
- **Production-like volumes** for performance testing
- **Complex relationships** across all entities
- **Distributed dates** for stats feature testing

---

## Common Use Cases

### 1. Starting Fresh Development

```bash
cd backend
npm run seed:reset
```

This will:

1. Drop and recreate database schema
2. Run migrations
3. Seed with development data

### 2. Adding More Data (Without Clearing)

```bash
npm run seed:dev
```

Uses `skipDuplicates` to avoid errors on existing data.

### 3. Testing with Clean Slate

```bash
CLEAR_DATA=true npm run seed:test
```

Removes all existing data before seeding.

### 4. Preparing Demo Environment

```bash
NODE_ENV=staging npm run seed
```

Creates production-like data volumes.

### 5. Seeding Admin Roles in Production

```bash
SEED_ADMINS=true \
ADMIN_ADDRESSES="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
ADMIN_ROLES="ROLE_SUPER_ADMIN" \
NODE_ENV=production npx prisma db seed
```

Creates user if not found, assigns admin role. Users are auto-created with a default name if they don't exist.

### 6. Combined Production Seeding

```bash
CLEAR_DATA=false \
SEED_DATABASE=true \
SEED_ADMINS=true \
ADMIN_ADDRESSES="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
ADMIN_ROLES="ROLE_SUPER_ADMIN" \
NODE_ENV=production npx prisma db seed
```

Seeds both database entities and admin roles.

---

## Date Distribution

Data is distributed across time periods to support the stats feature:

- **30%** of records in last 7 days
- **40%** of records in last 30 days
- **20%** of records in last 90 days
- **10%** of records older than 90 days

This enables testing of:

- 7-day statistics
- 30-day trends
- 90-day comparisons
- Historical analysis

---

## Troubleshooting

### Error: "Unable to compile TypeScript"

**Solution:** Run `npx prisma generate` to regenerate Prisma client

```bash
cd backend
npx prisma generate
npm run seed:test
```

### Error: "Foreign key constraint failed"

**Solution:** Clear existing data before seeding

```bash
CLEAR_DATA=true npm run seed:dev
```

### Error: "Production seeding blocked"

**Solution:** Production requires explicit flags

```bash
# Seed database only
SEED_DATABASE=true NODE_ENV=production npx prisma db seed

# OR seed admins only (recommended for production)
SEED_ADMINS=true \
ADMIN_ADDRESSES="0xaddress" \
ADMIN_ROLES="ROLE_ADMIN" \
NODE_ENV=production npx prisma db seed
```

### Error: "Invalid Ethereum address"

**Solution:** Ensure addresses are valid and comma-separated (no spaces)

```bash
# ❌ Bad
ADMIN_ADDRESSES="0xabc, 0xdef"

# ✅ Good
ADMIN_ADDRESSES="0xabc,0xdef"
```

### Slow Performance

**Solution:** Use test environment for quick iteration

```bash
npm run seed:test  # Only ~90 records, completes in 0.1s
```

### Duplicate Key Errors

**Solution:** The seed uses `skipDuplicates` by default, but if you need a clean slate:

```bash
npm run seed:reset
```

---

## Verification

After seeding, verify the data:

```bash
# Open Prisma Studio
npx prisma studio

# Or check with psql
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"User\";"
```

Expected counts (development):

- Users: 10
- Teams: 5
- Claims: 471
- Weekly Claims: 110

---

## Integration with Testing

### Unit Tests

```typescript
import { PrismaClient } from '@prisma/client'

beforeAll(async () => {
  // Seed test database
  process.env.NODE_ENV = 'test'
  await import('./prisma/seed')
})
```

### E2E Tests

```bash
# In test setup script
NODE_ENV=test npm run seed
npx playwright test
```

---

## Tips & Best Practices

1. **Use test environment for CI/CD** - Fast and predictable
2. **Clear data in dev regularly** - Prevents data accumulation  
3. **Use Hardhat addresses in test** - Matches local blockchain
4. **Staging for performance testing** - Production-like volumes
5. **Production admin seeding** - Use `SEED_ADMINS=true` for safe provisioning
6. **Never clear production** - `CLEAR_DATA` is permanently blocked
7. **Auto-creates users** - Admin seeder creates users if they don't exist

---

## Admin Seeding Deep Dive

### What Happens When You Seed Admins?

1. Validates each Ethereum address format (0x + 40 hex chars)
2. Validates each role against allowed values (ROLE_ADMIN, ROLE_SUPER_ADMIN)
3. For each address:
   - Checks if user exists
   - **Creates user if not found** with auto-generated name
   - Assigns the specified role
   - Skips if role already assigned (idempotent)
4. Prints audit log with results

### Example: Multi-Admin Setup

```bash
# Create 3 admins with different roles
SEED_ADMINS=true \
ADMIN_ADDRESSES="0xaddr1,0xaddr2,0xaddr3" \
ADMIN_ROLES="ROLE_SUPER_ADMIN,ROLE_ADMIN,ROLE_ADMIN" \
NODE_ENV=production npx prisma db seed
```

**Results:**

- User1 (0xaddr1): ROLE_SUPER_ADMIN + user created
- User2 (0xaddr2): ROLE_ADMIN + user created  
- User3 (0xaddr3): ROLE_ADMIN + user created

### Combining with Database Seeding

```bash
# Seed both test data AND admin roles
SEED_DATABASE=true \
SEED_ADMINS=true \
ADMIN_ADDRESSES="0xaddr1" \
ADMIN_ROLES="ROLE_SUPER_ADMIN" \
NODE_ENV=staging npx prisma db seed
```

---

## Next Steps

- Read [functional-specification.md](./functional-specification.md) for detailed requirements
- Check [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for full feature overview
- View [seed implementation](../../../backend/prisma/seed.ts) for main orchestrator code
- View [admin seeder](../../../backend/prisma/seeders/admin.ts) for admin provisioning code

---

**Questions?** See the main [README.md](./README.md) or check the troubleshooting section above.
