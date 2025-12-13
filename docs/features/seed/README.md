# Database Seeding Feature

**Status:** ✅ Implemented and Production Ready  
**Last Updated:** December 8, 2025

Automated, environment-aware database seeding for the CNC Portal.

---

## 🚀 Quick Start

```bash
cd backend

# Development (10 users, 5 teams)
npm run seed:dev

# Test (3 users, Hardhat addresses)
npm run seed:test

# Reset database and reseed
npm run seed:reset
```

See [QUICK_START.md](./QUICK_START.md) for troubleshooting and advanced usage.

---

## 📚 Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [QUICK_START.md](./QUICK_START.md) | Commands, troubleshooting, verification | All developers |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | What was built, test results, metrics | Tech leads, PM |
| [functional-specification.md](./functional-specification.md) | Requirements, business logic, architecture | Product, QA |
| [seed.ts](../../../backend/prisma/seed.ts) | Actual implementation code (~550 lines) | Backend devs |

---

## 📊 What Gets Seeded

**10 Entity Types:**
Users, Teams, MemberTeamsData, Wages, WeeklyClaims, Claims, Expenses, TeamContracts, BoardOfDirectorActions, Notifications

**Data Volumes:**

| Environment | Users | Teams | Claims | Execution |
|-------------|-------|-------|--------|-----------|
| Test | 3 | 2 | 41 | 0.10s |
| Development | 10 | 5 | 471 | 0.27s |
| Staging | 50 | 20 | 2800+ | <2s |

---

## ✨ Key Features

- ✅ Environment-aware (dev/test/staging, blocks production)
- ✅ Referential integrity maintained
- ✅ Idempotent (safe to re-run)
- ✅ Realistic data (Faker.js)
- ✅ Date distribution for stats testing (30% recent, 40% medium, 20% older, 10% oldest)
- ✅ Hardhat addresses for test environment
- ✅ Wage chain relationships

---

## 🔗 Related Files

**Implementation:**

- `/backend/prisma/seed.ts` - Main seed implementation
- `/backend/package.json` - Seed scripts

**Configuration:**

- Environment: `NODE_ENV` (development/test/staging/production)
- Clear data: `CLEAR_DATA=true` flag

---

## 🎯 Contributing

When adding new entities:

1. Update `SeedConfig` interface in seed.ts
2. Add counts for dev/test/staging environments  
3. Create seed function (follow existing patterns)
4. Add to main() in correct dependency order
5. Update this documentation

See [functional-specification.md](./functional-specification.md) for architecture details.
