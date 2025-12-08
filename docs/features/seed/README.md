# Database Seeding Feature Documentation

This folder contains comprehensive documentation for the CNC Portal Database Seeding feature.

## 📚 Documentation Index

### 1. [Functional Specification](./functional-specification.md)

**Audience:** Product managers, developers, QA teams  
**Purpose:** Complete business and technical requirements

**Contents:**

- Executive summary and scope
- Business requirements (7 functional requirements)
- Seeding strategies and approaches
- Data volume specifications
- Environment-specific configurations
- Referential integrity management
- Idempotent operations design
- Date distribution for testing
- Validation and testing strategy
- Future enhancements roadmap

**When to use:** Understanding the seeding feature's purpose, requirements, and design decisions.

---

### 2. [Seed Implementation Guide](./seed-implementation-guide.md)

**Audience:** Backend developers, database administrators  
**Purpose:** Technical guide for implementing and maintaining database seeds

**Contents:**

- Complete seed.ts implementation example
- Environment-based seeding strategies
- Modular seed function organization
- Helper functions library
- Seeding order and dependencies
- Realistic data generation with Faker.js
- Wage chain relationship handling
- Date consistency for stats testing
- Idempotent seeding patterns
- Testing strategies
- Troubleshooting guide
- Best practices and anti-patterns

**When to use:** Implementing seeds, adding new entities, debugging seed issues, maintaining seed data.

---

## 🚀 Quick Start

### Run Seeding

```bash
# Development environment (default)
cd backend
npm run seed

# Test environment (minimal data)
NODE_ENV=test npm run seed

# Staging environment (production-like volumes)
NODE_ENV=staging npm run seed

# Reset and reseed
npm run seed:reset
```

### Verify Seeding

```bash
# Check database tables
npx prisma studio

# Run backend tests (uses test seeds)
npm test

# Check seed logs
npm run seed 2>&1 | tee seed.log
```

### For Backend Developers

1. Read the [Functional Specification](./functional-specification.md) sections 1-3, 5
2. Review [Seed Implementation Guide](./seed-implementation-guide.md) sections 1-4
3. Check `/backend/prisma/seed.ts` for implementation
4. Run seeds: `cd backend && npm run seed`

### For QA/Testing Teams

1. Read [Functional Specification](./functional-specification.md) section 2 (Requirements)
2. Review test environment seed data in section 5.2
3. Run test seeds: `NODE_ENV=test npm run seed`
4. Verify data: `npx prisma studio`

### For Database Administrators

1. Read [Seed Implementation Guide](./seed-implementation-guide.md) sections 1-2
2. Review data volumes in [Functional Specification](./functional-specification.md) section 5
3. Check seeding order in section 3.1
4. Monitor seed performance

---

## 📊 Feature Overview

The Database Seeding feature provides automated, environment-aware test data generation for the CNC Portal platform through:

- **Environment-Based Seeding:**
  - Development: Rich, realistic datasets
  - Test: Minimal, predictable data
  - Staging: Production-like volumes
  - Production: Safety checks (no seeding)

- **Key Entities Seeded:**
  - Users (with Ethereum addresses)
  - Teams (with ownership)
  - MemberTeamsData (team memberships)
  - Wages (with chain relationships)
  - WeeklyClaims (with status variations)
  - Claims (linked to wages)
  - Expenses (various statuses)
  - TeamContracts (smart contract deployments)
  - BoardOfDirectorActions (governance actions)
  - Notifications (read/unread states)

- **Key Features:**
  - Referential integrity preservation
  - Idempotent operations (safe to re-run)
  - Realistic data generation with Faker.js
  - Date distribution for stats testing
  - Modular seed organization
  - Comprehensive validation
  - Detailed logging

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         package.json Scripts                │
│  - npm run seed                             │
│  - npm run seed:reset                       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         prisma/seed.ts                      │
│  - Environment detection                    │
│  - Seed orchestration                       │
│  - Transaction management                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Modular Seed Functions              │
│  - seedUsers()                              │
│  - seedTeams()                              │
│  - seedWages()                              │
│  - seedClaims()                             │
│  - etc.                                     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Helper Functions                    │
│  - generateNonce()                          │
│  - randomDate()                             │
│  - randomStatus()                           │
│  - createWageChain()                        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         PostgreSQL Database                 │
│  - 10 Tables seeded                         │
│  - Referential integrity maintained         │
└─────────────────────────────────────────────┘
```

---

## 📦 Data Volumes by Environment

| Entity | Development | Test | Staging |
|--------|-------------|------|---------|
| Users | 10 | 3 | 50 |
| Teams | 5 | 2 | 20 |
| MemberTeamsData | 15 | 4 | 100 |
| Wages | 30 | 6 | 150 |
| WeeklyClaims | 20 | 5 | 100 |
| Claims | 100 | 10 | 500 |
| Expenses | 15 | 5 | 75 |
| TeamContracts | 10 | 4 | 40 |
| BoardOfDirectorActions | 20 | 6 | 100 |
| Notifications | 50 | 10 | 250 |

---

## 🔗 Related Files

### Implementation

- `/backend/prisma/seed.ts` - Main seed file (to be implemented)
- `/backend/prisma/schema.prisma` - Database schema
- `/backend/package.json` - Seed scripts configuration

### Helper Modules (Recommended Structure)

- `/backend/prisma/seeds/users.seed.ts` - User seeding
- `/backend/prisma/seeds/teams.seed.ts` - Team seeding
- `/backend/prisma/seeds/wages.seed.ts` - Wage seeding
- `/backend/prisma/seeds/claims.seed.ts` - Claims seeding
- `/backend/prisma/seeds/helpers.ts` - Utility functions

### Configuration

- `/backend/.env` - Database connection string
- `/backend/.env.test` - Test environment config
- `/backend/.env.staging` - Staging environment config

---

## 🎯 Seeding Order (Critical)

Seeds must be executed in this order to maintain referential integrity:

1. **Users** (no dependencies)
2. **Teams** (depends on Users for owner)
3. **MemberTeamsData** (depends on Users + Teams)
4. **TeamContracts** (depends on Teams)
5. **Wages** (depends on Users + Teams)
6. **WeeklyClaims** (depends on Users + Teams + Wages)
7. **Claims** (depends on Wages + WeeklyClaims)
8. **Expenses** (depends on Users + Teams)
9. **BoardOfDirectorActions** (depends on Users + Teams)
10. **Notifications** (depends on Users)

---

## 🧪 Testing

### Run Seeds

```bash
# Development seeds
npm run seed

# Test seeds
NODE_ENV=test npm run seed

# Reset and reseed
npm run seed:reset
```

### Verify Data

```bash
# Open Prisma Studio
npx prisma studio

# Query specific tables
npx prisma db seed -- --verify

# Check counts
npm run seed:verify
```

### Integration Tests

```bash
# Tests use test environment seeds
npm test

# Run specific test suites
npm test -- --grep "statsController"
```

---

## 🚦 Status

**Current Version:** 1.0.0  
**Status:** 📝 Documented (Implementation Pending)  
**Branch:** feature/perf-stats

**Planned:**

- [ ] Implement base seed.ts file
- [ ] Create modular seed functions
- [ ] Add helper functions library
- [ ] Configure package.json scripts
- [ ] Add seed validation
- [ ] Create seed:reset script
- [ ] Test all environments
- [ ] Document edge cases

---

## 💡 Key Concepts

### Idempotent Seeding

Seeds can be run multiple times safely:

```typescript
// Using upsert for key records
await prisma.user.upsert({
  where: { address: '0x123...' },
  update: {},
  create: { address: '0x123...', name: 'Alice', nonce: '...' }
});
```

### Referential Integrity

Foreign keys are respected by seeding in dependency order:

```typescript
// First create users
const users = await seedUsers();

// Then create teams (needs owner from users)
const teams = await seedTeams(users);

// Then create wages (needs users and teams)
await seedWages(users, teams);
```

### Date Distribution

Claims and activities are distributed across time periods for stats testing:

```typescript
// Create claims spanning last 90 days
const dates = [
  lastWeek,    // For 7-day stats
  lastMonth,   // For 30-day stats
  last90Days,  // For 90-day stats
];
```

### Wage Chains

Wages are linked to represent raise/change history:

```typescript
// wage1 (old) -> wage2 (current)
await prisma.wage.update({
  where: { id: wage1.id },
  data: { nextWageId: wage2.id }
});
```

---

## 🔧 Troubleshooting

### Common Issues

**Problem:** Foreign key constraint violations

**Solution:** Check seeding order, ensure parent records exist first

```text
---
```

**Problem:** Duplicate key errors

**Solution:** Use `skipDuplicates: true` or `upsert` operations

```text
---
```

**Problem:** Inconsistent test results

**Solution:** Use fixed data in test environment, avoid randomness

```text
---
```

**Problem:** Slow seeding performance

**Solution:** Use `createMany` for bulk inserts, optimize transaction boundaries

---

## 📚 Best Practices

1. **Always seed in dependency order** - Respect foreign keys
2. **Use transactions** - Ensure atomicity of seed operations
3. **Make seeds idempotent** - Safe to run multiple times
4. **Validate input data** - Check Ethereum addresses, dates, etc.
5. **Log progress** - Show what's being seeded
6. **Use realistic data** - Helps catch bugs in development
7. **Keep test data minimal** - Faster test execution
8. **Document seed data** - Comment special cases and edge cases
9. **Version control seeds** - Track changes with git
10. **Test regularly** - Run seeds in CI/CD pipeline

---

## 🎓 Learning Resources

- [Prisma Seeding Documentation](https://www.prisma.io/docs/guides/database/seed-database)
- [Faker.js Documentation](https://fakerjs.dev/guide/)
- [Database Testing Best Practices](https://martinfowler.com/articles/database-testing.html)

---

## 📝 Contributing

When adding new entities to seed:

1. Add entity to seed order documentation
2. Create modular seed function
3. Update data volume tables
4. Add validation checks
5. Test in all environments
6. Update this documentation
