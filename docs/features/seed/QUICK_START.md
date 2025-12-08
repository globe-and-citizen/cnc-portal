# Database Seed - Quick Start Guide

**Status:** ✅ Production Ready  
**Last Updated:** December 8, 2025

---

## Quick Commands

```bash
# Development environment (10 users, 5 teams)
npm run seed:dev

# Test environment (3 users, 2 teams, Hardhat addresses)
npm run seed:test

# Staging environment (50 users, 20 teams)
npm run seed:staging

# Clear data and reseed
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

## Environment Detection

The seed automatically detects your environment from `NODE_ENV`:

```bash
# Defaults to development if NODE_ENV not set
npm run seed

# Explicitly set environment
NODE_ENV=test npm run seed
NODE_ENV=staging npm run seed
```

**Production is blocked** - Seeds will not run if `NODE_ENV=production`

---

## Data Characteristics

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
5. **Never seed production** - Built-in safeguard blocks this

---

## Next Steps

- Read [functional-specification.md](./functional-specification.md) for detailed requirements
- Check [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for full feature overview
- View [seed implementation](../../../backend/prisma/seed.ts) for actual code (~550 lines)

---

**Questions?** See the main [README.md](./README.md) or check the troubleshooting section above.
